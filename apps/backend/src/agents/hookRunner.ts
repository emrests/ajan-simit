import { spawn } from 'child_process'
import { v4 as uuid } from 'uuid'
import { db } from '../db/database'
import { broadcast } from '../ws/server'
// HookEvent tipi @smith/types'tan geliyor ama rootDir kısıtlaması nedeniyle string kullanıyoruz
type HookEvent = string

interface HookContext {
  officeId: string
  projectId: string
  agentId?: string
  taskId?: string
  toolName?: string        // PreToolUse/PostToolUse için tool adı
  toolInput?: string       // PreToolUse/PostToolUse için tool input (kısa)
  workDir?: string
}

/**
 * Proje hook'larını belirli bir event için çalıştır.
 * Async çalışır — caller'ı bloke etmez.
 * PreToolUse hook'ları block yapabilir (exit code != 0 → engelle).
 */
export async function executeHooks(event: HookEvent, ctx: HookContext): Promise<boolean> {
  const hooks = db.prepare(
    'SELECT * FROM hooks WHERE project_id = ? AND event = ? AND enabled = 1'
  ).all(ctx.projectId, event) as any[]

  if (hooks.length === 0) return true // Hook yok, devam et

  let allPassed = true

  for (const hook of hooks) {
    // Matcher kontrolü: tool adı pattern eşleşmesi
    if (hook.matcher && ctx.toolName) {
      if (!matchTool(hook.matcher, ctx.toolName, ctx.toolInput)) continue
    } else if (hook.matcher && !ctx.toolName) {
      // Matcher var ama tool bilgisi yok → atla (tool-specific hook, tool event değil)
      continue
    }

    const success = await runSingleHook(hook, ctx)
    if (!success) allPassed = false

    // PreToolUse'da başarısız hook → engelleme sinyali
    if (event === 'PreToolUse' && !success) {
      return false
    }
  }

  return allPassed
}

/**
 * Claude CLI settings.json formatında hook konfigürasyonu oluştur.
 * processManager bu fonksiyonu kullanarak hook'ları CLI'ya enjekte eder.
 */
export function buildHooksConfig(projectId: string): any {
  const hooks = db.prepare(
    'SELECT * FROM hooks WHERE project_id = ? AND enabled = 1'
  ).all(projectId) as any[]

  if (hooks.length === 0) return null

  // Claude Code hooks formatı: { hooks: { PreToolUse: [...], PostToolUse: [...], ... } }
  const config: Record<string, any[]> = {}

  for (const hook of hooks) {
    if (hook.type !== 'command') continue // CLI hooks sadece command tipini destekler

    const eventKey = hook.event as string
    if (!config[eventKey]) config[eventKey] = []

    const hookEntry: any = {
      type: 'command',
      command: hook.command,
    }

    // Matcher varsa ekle
    if (hook.matcher) {
      hookEntry.matcher = hook.matcher
    }

    config[eventKey].push(hookEntry)
  }

  return Object.keys(config).length > 0 ? config : null
}

/**
 * Proje hook'larını getir (aktif olanlar)
 */
export function getActiveHooks(projectId: string): any[] {
  return db.prepare(
    'SELECT * FROM hooks WHERE project_id = ? AND enabled = 1'
  ).all(projectId) as any[]
}

// ---- Internal ----

function matchTool(matcher: string, toolName: string, toolInput?: string): boolean {
  // Basit pattern eşleşme:
  // "Bash" → tam eşleşme
  // "Bash(git push*)" → tool adı + input prefix eşleşme
  // "mcp__github__*" → wildcard eşleşme
  // "Read(.env*)" → tool adı + input pattern

  const funcMatch = matcher.match(/^(\w+)\((.+)\)$/)
  if (funcMatch) {
    const [, matchTool, inputPattern] = funcMatch
    if (matchTool !== toolName) return false
    if (!toolInput) return false
    // Basit wildcard: * sonunda
    const pattern = inputPattern.replace(/\*/g, '')
    return toolInput.includes(pattern)
  }

  // Wildcard pattern: mcp__github__*
  if (matcher.includes('*')) {
    const prefix = matcher.replace(/\*/g, '')
    return toolName.startsWith(prefix)
  }

  // Tam eşleşme
  return toolName === matcher
}

async function runSingleHook(hook: any, ctx: HookContext): Promise<boolean> {
  return new Promise((resolve) => {
    const logId = `hl_${Date.now()}_${hook.id.slice(0, 8)}`
    const executedAt = new Date().toISOString()

    if (hook.type === 'command') {
      // Shell komutu çalıştır
      const proc = spawn(hook.command, {
        cwd: ctx.workDir || process.cwd(),
        shell: true,
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30000, // 30 saniye timeout
      } as any)

      let output = ''
      proc.stdout?.on('data', (chunk: Buffer) => { output += chunk.toString() })
      proc.stderr?.on('data', (chunk: Buffer) => { output += chunk.toString() })

      proc.on('close', (code) => {
        const success = code === 0
        saveHookLog(logId, hook.id, hook.event, success, output.slice(0, 2000), executedAt)
        broadcastHookResult(ctx.officeId, hook.id, hook.event, success, output.slice(0, 200))
        resolve(success)
      })

      proc.on('error', (err) => {
        saveHookLog(logId, hook.id, hook.event, false, `Error: ${err.message}`, executedAt)
        broadcastHookResult(ctx.officeId, hook.id, hook.event, false, err.message)
        resolve(false)
      })
    } else if (hook.type === 'http') {
      // HTTP POST webhook
      fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: hook.event,
          projectId: ctx.projectId,
          agentId: ctx.agentId,
          taskId: ctx.taskId,
          toolName: ctx.toolName,
          timestamp: executedAt,
        }),
        signal: AbortSignal.timeout(10000),
      })
        .then(async (res) => {
          const body = await res.text().catch(() => '')
          const success = res.ok
          saveHookLog(logId, hook.id, hook.event, success, `${res.status}: ${body.slice(0, 500)}`, executedAt)
          broadcastHookResult(ctx.officeId, hook.id, hook.event, success, `HTTP ${res.status}`)
          resolve(success)
        })
        .catch((err) => {
          saveHookLog(logId, hook.id, hook.event, false, `Fetch error: ${err.message}`, executedAt)
          broadcastHookResult(ctx.officeId, hook.id, hook.event, false, err.message)
          resolve(false)
        })
    } else if (hook.type === 'prompt') {
      // LLM değerlendirme — sonraki fazda genişletilebilir
      // Şimdilik basit loglama
      saveHookLog(logId, hook.id, hook.event, true, 'Prompt hook (placeholder)', executedAt)
      broadcastHookResult(ctx.officeId, hook.id, hook.event, true, 'Prompt hook')
      resolve(true)
    } else {
      resolve(true)
    }
  })
}

function saveHookLog(id: string, hookId: string, event: string, success: boolean, output: string, executedAt: string) {
  try {
    db.prepare(
      'INSERT INTO hook_logs (id, hook_id, event, success, output, executed_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, hookId, event, success ? 1 : 0, output, executedAt)
  } catch (e: any) {
    console.error('[HookLog]', e.message)
  }
}

function broadcastHookResult(officeId: string, hookId: string, event: HookEvent, success: boolean, output?: string) {
  try {
    broadcast(officeId, {
      type: 'hook:executed',
      hookId,
      event,
      success,
      output: output?.slice(0, 200),
    })
  } catch {}
}
