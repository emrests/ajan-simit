import { spawn, spawnSync, ChildProcess } from 'child_process'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { db } from '../db/database'
import { broadcast } from '../ws/server'
import { watchAgent, unwatchAgent, saveAndBroadcastMessage } from '../watcher/jsonlWatcher'
import { executeHooks, buildHooksConfig } from './hookRunner'
import { createWorktree, isWorktreeMode, getAgentWorktreePath, refreshWorktreeStatus } from './worktreeManager'
import { syncSubagentToProject } from './subagentManager'

interface ActiveSession {
  agentId: string
  officeId: string
  process: ChildProcess
  jsonlPath: string
  startedAt: string
  taskId?: string  // Bağlı proje görevi
  // Faz 9 — Token izleme
  inputTokens: number
  outputTokens: number
  sessionLogId?: string
  // Faz 11 — Structured output
  lastResultText: string
  outputSchema?: string  // Bu session için geçerli schema
  // Faz 17 — Maliyet + tool izleme
  toolsUsed: string[]
  maxBudgetUsd?: number
  budgetExceeded?: boolean
}

const activeSessions = new Map<string, ActiveSession>() // agentId → session

// workDir → Claude JSONL dizin yolu kodlaması
// Claude CLI, D:\4-Sample-Tutorial\TicTacToe → D--4-Sample-Tutorial-TicTacToe şeklinde kodlar
function encodeWorkDir(workDir: string): string {
  return workDir.trim().replace(/[/\\]/g, '-').replace(/:/g, '-')
}

// Claude projects dizinini bul — büyük/küçük harf farklılıklarını handle et
function findClaudeProjectDir(workDir: string): string {
  const encoded = encodeWorkDir(workDir)
  const projectsBase = path.join(os.homedir(), '.claude', 'projects')
  const exactDir = path.join(projectsBase, encoded)

  // Önce tam eşleşme dene
  if (fs.existsSync(exactDir)) return exactDir

  // Büyük/küçük harf farklılığı: D vs d
  try {
    const dirs = fs.readdirSync(projectsBase)
    const match = dirs.find(d => d.toLowerCase() === encoded.toLowerCase())
    if (match) return path.join(projectsBase, match)
  } catch {}

  return exactDir // Fallback — henüz oluşmamış olabilir
}

// Claude JSONL dosya yolunu tahmin et
function getClaudeJsonlPath(workDir: string): string {
  // Claude JSONL'leri ~/.claude/projects/<encoded-path>/*.jsonl formatında saklar
  const claudeDir = findClaudeProjectDir(workDir)

  try {
    if (fs.existsSync(claudeDir)) {
      const files = fs.readdirSync(claudeDir)
        .filter(f => f.endsWith('.jsonl'))
        .map(f => ({ name: f, mtime: fs.statSync(path.join(claudeDir, f)).mtime }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())

      if (files.length > 0) {
        return path.join(claudeDir, files[0].name)
      }
    }
  } catch {}

  return ''
}

// En yeni JSONL dosyasını bul (asenkron — event loop'u bloke etmez)
function findLatestJsonlAsync(workDir: string, afterMs: number, callback: (path: string) => void) {
  const claudeDir = findClaudeProjectDir(workDir)
  let attempts = 0
  const maxAttempts = 10 // 10 × 500ms = 5 saniye

  const check = () => {
    attempts++
    try {
      if (fs.existsSync(claudeDir)) {
        const files = fs.readdirSync(claudeDir)
          .filter(f => f.endsWith('.jsonl'))
          .map(f => {
            const fullPath = path.join(claudeDir, f)
            return { fullPath, mtime: fs.statSync(fullPath).mtime.getTime() }
          })
          .filter(f => f.mtime > afterMs)
          .sort((a, b) => b.mtime - a.mtime)

        if (files.length > 0) {
          callback(files[0].fullPath)
          return
        }
      }
    } catch {}

    if (attempts < maxAttempts) {
      setTimeout(check, 500)
    } else {
      callback('')
    }
  }

  check()
}

// Faz 7 — PM ajanı Claude ile aktif değerlendirme ve koordinasyon
function pmEvaluateAndCoordinate(
  officeId: string,
  project: any,
  pmAgent: any,
  completedTask: any,
  completedAgent: any,
  pendingDeps: any[]
) {
  // PM durumunu güncelle
  db.prepare('UPDATE agents SET status = ?, current_task = ? WHERE id = ?')
    .run('thinking', '🧠 Değerlendirme yapıyor...', pmAgent.id)
  broadcast(officeId, {
    type: 'agent:status',
    agentId: pmAgent.id,
    status: 'thinking',
    currentTask: '🧠 Değerlendirme yapıyor...',
  })

  // Tamamlanmış görevleri topla
  const doneTasks = db.prepare(
    'SELECT t.description, a.name FROM tasks t LEFT JOIN agents a ON t.assigned_agent_id = a.id WHERE t.project_id = ? AND t.status = ?'
  ).all(project.id, 'done') as any[]
  const doneList = doneTasks.map((t: any) => `✓ [${t.name ?? '?'}] ${t.description}`).join('\n')

  // Sonraki görevleri hazırla
  const nextList = pendingDeps.map((d: any) =>
    `→ [${d.agent_name ?? 'Atanmamış'}] ${d.description}`
  ).join('\n')

  const evaluationPrompt = `Sen bir proje yöneticisi (PM) ajansın.

Proje: ${project.name}
Klasör: ${project.work_dir}

Şimdi tamamlanan görev:
- Ajan: ${completedAgent?.name ?? 'Bilinmiyor'}
- Görev: ${completedTask.description}

Tamamlanmış tüm görevler:
${doneList}

Sıradaki görevler (bağımlılıkları çözüldü, başlatılacak):
${nextList}

Görevin:
1. Tamamlanan görevin çıktısını kısaca değerlendir (klasördeki dosyalara bakabilirsin)
2. Sıradaki her ajan için kısa ve net bir talimat/bağlam ver (ne yapması gerektiği, nelere dikkat etmesi gerektiği)
3. Olası sorunları veya riskleri belirt

Yanıtını aşağıdaki JSON formatında ver:
{
  "evaluation": "Tamamlanan görevin kısa değerlendirmesi",
  "nextSteps": [{"agent": "Ajan adı", "instruction": "Ne yapmalı"}],
  "risks": ["Risk 1", "Risk 2"]
}

JSON dışında başka bir şey yazma.`

  // Asenkron olarak Claude'u çağır (event loop'u bloke etmemek için spawn kullan)
  const cliArgs = ['--print', '--dangerously-skip-permissions', '--output-format', 'text', '--max-turns', '10']
  if (pmAgent.model) cliArgs.push('--model', pmAgent.model)

  const pmProc = spawn('claude', cliArgs, {
    cwd: project.work_dir?.trim() || process.cwd(),
    shell: true,
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  pmProc.stdin?.write(evaluationPrompt)
  pmProc.stdin?.end()

  let pmOutput = ''
  pmProc.stdout?.on('data', (chunk: Buffer) => {
    pmOutput += chunk.toString()
  })

  pmProc.on('close', (code) => {
    const evaluation = pmOutput.trim()

    if (code === 0 && evaluation.length > 10) {
      // PM JSON çıktısını parse etmeyi dene
      let evalData: any = null
      try {
        const jsonMatch = evaluation.match(/```json\s*([\s\S]+?)\s*```/) || evaluation.match(/(\{[\s\S]+\})/)
        if (jsonMatch) evalData = JSON.parse(jsonMatch[1])
      } catch {}

      const displayText = evalData
        ? `🧠 PM Değerlendirmesi:\n📋 ${evalData.evaluation ?? ''}\n${(evalData.nextSteps ?? []).map((s: any) => `→ [${s.agent}] ${s.instruction}`).join('\n')}${(evalData.risks ?? []).length > 0 ? '\n⚠️ ' + evalData.risks.join(', ') : ''}`
        : `🧠 PM Değerlendirmesi:\n${evaluation.slice(0, 800)}`

      // PM değerlendirmesini konuşma paneline gönder
      saveAndBroadcastMessage(
        officeId,
        pmAgent.id,
        pmAgent.name,
        displayText,
        'agent-to-agent'
      )

      // Her sonraki ajana PM talimatını dahil et
      for (const dep of pendingDeps) {
        if (dep.assigned_agent_id) {
          const agentInstruction = evalData?.nextSteps?.find((s: any) =>
            s.agent?.toLowerCase() === dep.agent_name?.toLowerCase()
          )?.instruction ?? evaluation.slice(0, 400)

          saveAndBroadcastMessage(
            officeId,
            dep.assigned_agent_id,
            pmAgent.name,
            `📌 PM Talimatı (${dep.description.slice(0, 40)}...):\n${agentInstruction}`,
            'agent-to-agent'
          )
        }
      }
    } else {
      saveAndBroadcastMessage(
        officeId,
        pmAgent.id,
        'Sistem',
        `⛓ Sonraki görevler tetikleniyor (PM değerlendirmesi atlandı):\n${nextList}`,
        'system'
      )
    }

    // PM durumunu idle'a döndür
    db.prepare('UPDATE agents SET status = ?, current_task = NULL WHERE id = ?').run('idle', pmAgent.id)
    broadcast(officeId, { type: 'agent:status', agentId: pmAgent.id, status: 'idle', currentTask: null })
  })

  pmProc.on('error', () => {
    saveAndBroadcastMessage(
      officeId, pmAgent.id, 'Sistem',
      `⛓ Sonraki görevler tetikleniyor:\n${nextList}`,
      'system'
    )
  })
}

// Faz 7 — PM ajanı hata delegasyonu: başarısız görevi ilgili ajana yeniden atar
function pmHandleError(officeId: string, project: any, pmAgent: any, failedTask: any, failedAgent: any, errorDetail: string) {
  db.prepare('UPDATE agents SET status = ?, current_task = ? WHERE id = ?')
    .run('thinking', '🔍 Hata analizi...', pmAgent.id)
  broadcast(officeId, {
    type: 'agent:status',
    agentId: pmAgent.id,
    status: 'thinking',
    currentTask: '🔍 Hata analizi...',
  })

  const errorPrompt = `Sen bir proje yöneticisi (PM) ajansın.

Proje: ${project.name}
Klasör: ${project.work_dir}

Bir görev başarısız oldu:
- Ajan: ${failedAgent?.name ?? 'Bilinmiyor'}
- Görev: ${failedTask.description}
- Hata: ${errorDetail}

Görevin:
1. Hatanın kök nedenini analiz et (klasördeki dosyalara bakabilirsin)
2. Hangi ajan bu hatayı düzeltmeli?
3. Düzeltme için kısa ve net talimat ver

Yanıtını Türkçe ver, kısa ve öz tut.`

  const cliArgs = ['--print', '--dangerously-skip-permissions', '--output-format', 'text', '--max-turns', '10']
  if (pmAgent.model) cliArgs.push('--model', pmAgent.model)

  const pmProc = spawn('claude', cliArgs, {
    cwd: project.work_dir?.trim() || process.cwd(),
    shell: true,
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  pmProc.stdin?.write(errorPrompt)
  pmProc.stdin?.end()

  let pmOutput = ''
  pmProc.stdout?.on('data', (chunk: Buffer) => {
    pmOutput += chunk.toString()
  })

  pmProc.on('close', (code) => {
    const analysis = pmOutput.trim()

    if (code === 0 && analysis.length > 10) {
      saveAndBroadcastMessage(
        officeId,
        pmAgent.id,
        pmAgent.name,
        `🔍 PM Hata Analizi:\n${analysis.slice(0, 800)}`,
        'agent-to-agent'
      )

      // Başarısız görevi tekrar in_progress'e çek ve ilgili ajana yeniden başlat
      if (failedTask.assigned_agent_id && project.work_dir) {
        // Tamamlananları bağlam olarak topla
        const doneTasks = db.prepare(
          'SELECT t.description, a.name FROM tasks t LEFT JOIN agents a ON t.assigned_agent_id = a.id WHERE t.project_id = ? AND t.status = ?'
        ).all(project.id, 'done') as any[]
        const contextLines = doneTasks.map((t: any) => `✓ ${t.name ? `[${t.name}] ` : ''}${t.description}`)

        const retryPrompt = contextLines.length > 0
          ? `Proje: ${project.name}\nKlasör: ${project.work_dir}\n\nTamamlananlar:\n${contextLines.join('\n')}\n\nÖnceki hata:\n${errorDetail.slice(0, 300)}\n\nPM Talimatı:\n${analysis.slice(0, 400)}\n\nSenin görevin:\n${failedTask.description}`
          : `Proje: ${project.name}\nKlasör: ${project.work_dir}\n\nÖnceki hata:\n${errorDetail.slice(0, 300)}\n\nPM Talimatı:\n${analysis.slice(0, 400)}\n\nGörev:\n${failedTask.description}`

        try {
          db.prepare("UPDATE tasks SET status = 'in_progress' WHERE id = ?").run(failedTask.id)
          startSession(failedTask.assigned_agent_id, project.work_dir, retryPrompt, failedTask.id)

          saveAndBroadcastMessage(
            officeId,
            failedTask.assigned_agent_id,
            pmAgent.name,
            `🔄 PM yeniden atadı: "${failedTask.description.slice(0, 60)}" — Hata düzeltmesi`,
            'agent-to-agent'
          )
        } catch (e: any) {
          console.error('[PM Error Delegation]', e.message)
        }
      }
    }

    db.prepare('UPDATE agents SET status = ?, current_task = NULL WHERE id = ?').run('idle', pmAgent.id)
    broadcast(officeId, { type: 'agent:status', agentId: pmAgent.id, status: 'idle', currentTask: null })
  })

  pmProc.on('error', () => {
    db.prepare('UPDATE agents SET status = ?, current_task = NULL WHERE id = ?').run('idle', pmAgent.id)
    broadcast(officeId, { type: 'agent:status', agentId: pmAgent.id, status: 'idle', currentTask: null })
  })
}

// Faz 7 — PM ajanı onay isteğini Claude ile değerlendirir
export function pmEvaluateApproval(officeId: string, project: any, pmAgentId: string, approval: any) {
  const pmAgent = db.prepare('SELECT * FROM agents WHERE id = ?').get(pmAgentId) as any
  if (!pmAgent) return

  db.prepare('UPDATE agents SET status = ?, current_task = ? WHERE id = ?')
    .run('thinking', '🔍 Onay değerlendirmesi...', pmAgent.id)
  broadcast(officeId, {
    type: 'agent:status',
    agentId: pmAgent.id,
    status: 'thinking',
    currentTask: '🔍 Onay değerlendirmesi...',
  })

  const approvalPrompt = `Sen bir proje yöneticisi (PM) ajansın.

Proje: ${project.name}
Klasör: ${project.work_dir}

Bir ajan onay istiyor:
- Ajan: ${approval.fromAgentName}
- İstek: ${approval.description}

Bu isteği değerlendir:
1. Bu işlem güvenli mi? Yapılmalı mı?
2. Kararın: ONAYLA veya REDDET
3. Kısa gerekçe

Yanıtının İLK satırında sadece "ONAYLA" veya "REDDET" yaz. Sonra gerekçeni açıkla. Türkçe yanıt ver.`

  const cliArgs = ['--print', '--dangerously-skip-permissions', '--output-format', 'text', '--max-turns', '5']
  if (pmAgent.model) cliArgs.push('--model', pmAgent.model)

  const pmProc = spawn('claude', cliArgs, {
    cwd: project.work_dir?.trim() || process.cwd(),
    shell: true,
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  pmProc.stdin?.write(approvalPrompt)
  pmProc.stdin?.end()

  let pmOutput = ''
  pmProc.stdout?.on('data', (chunk: Buffer) => { pmOutput += chunk.toString() })

  pmProc.on('close', (code) => {
    const response = pmOutput.trim()
    const firstLine = response.split('\n')[0]?.trim().toUpperCase() ?? ''
    const isApproved = firstLine.includes('ONAYLA')
    const status = isApproved ? 'approved' : 'rejected'

    if (code === 0 && response.length > 3) {
      // Onay yanıtını kaydet
      const respondedAt = new Date().toISOString()
      db.prepare(
        'UPDATE approval_requests SET status = ?, responded_by = ?, response_note = ?, responded_at = ? WHERE id = ?'
      ).run(status, pmAgent.id, response.slice(0, 500), respondedAt, approval.id)

      // PM değerlendirmesini göster
      saveAndBroadcastMessage(
        officeId, pmAgent.id, pmAgent.name,
        `🔍 PM Onay Değerlendirmesi:\n${response.slice(0, 500)}`,
        'agent-to-agent'
      )

      // Onayland/Reddedildi bildirimini gönder
      const emoji = isApproved ? '✅' : '❌'
      saveAndBroadcastMessage(
        officeId, approval.fromAgentId, 'Sistem',
        `${emoji} Onay yanıtı: ${approval.description.slice(0, 60)} → ${isApproved ? 'ONAYLANDI' : 'REDDEDİLDİ'}: ${response.slice(0, 200)}`,
        'approval-response'
      )

      // Onaylandıysa ajanı waiting'den çıkar
      if (isApproved) {
        db.prepare('UPDATE agents SET status = ? WHERE id = ? AND status = ?')
          .run('thinking', approval.fromAgentId, 'waiting')
        broadcast(officeId, {
          type: 'agent:status',
          agentId: approval.fromAgentId,
          status: 'thinking',
        })
      }

      broadcast(officeId, {
        type: 'approval:response',
        approval: { ...approval, status, respondedBy: pmAgent.id, responseNote: response.slice(0, 500), respondedAt },
      })
    }

    db.prepare('UPDATE agents SET status = ?, current_task = NULL WHERE id = ?').run('idle', pmAgent.id)
    broadcast(officeId, { type: 'agent:status', agentId: pmAgent.id, status: 'idle', currentTask: null })
  })

  pmProc.on('error', () => {
    db.prepare('UPDATE agents SET status = ?, current_task = NULL WHERE id = ?').run('idle', pmAgent.id)
    broadcast(officeId, { type: 'agent:status', agentId: pmAgent.id, status: 'idle', currentTask: null })
  })
}

// Faz 7 — PM proje ilerleme izleme ve yeniden planlama
function pmCheckProjectProgress(officeId: string, project: any, pmAgent: any) {
  const allTasks = db.prepare('SELECT t.*, a.name as agent_name FROM tasks t LEFT JOIN agents a ON t.assigned_agent_id = a.id WHERE t.project_id = ?').all(project.id) as any[]
  const done = allTasks.filter((t: any) => t.status === 'done')
  const failed = allTasks.filter((t: any) => t.status === 'in_progress') // takılmış olabilir
  const todo = allTasks.filter((t: any) => t.status === 'todo')

  // Tüm görevler bittiyse — son değerlendirme yap
  if (done.length === allTasks.length) {
    const summaryPrompt = `Sen bir proje yöneticisi (PM) ajansın.

Proje: ${project.name}
Klasör: ${project.work_dir}

Proje tamamlandı! Tüm görevler:
${done.map((t: any) => `✓ [${t.agent_name ?? '?'}] ${t.description}`).join('\n')}

Görevin:
1. Projeyi kısaca değerlendir
2. Eksik veya iyileştirilebilecek noktaları belirt
3. Projenin çalıştırılması için gerekli adımları listele

Yanıtını Türkçe ver, kısa tut.`

    const cliArgs = ['--print', '--dangerously-skip-permissions', '--output-format', 'text', '--max-turns', '10']
    if (pmAgent.model) cliArgs.push('--model', pmAgent.model)

    const pmProc = spawn('claude', cliArgs, {
      cwd: project.work_dir?.trim() || process.cwd(),
      shell: true,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    pmProc.stdin?.write(summaryPrompt)
    pmProc.stdin?.end()

    let out = ''
    pmProc.stdout?.on('data', (chunk: Buffer) => { out += chunk.toString() })
    pmProc.on('close', (code) => {
      if (code === 0 && out.trim().length > 10) {
        saveAndBroadcastMessage(
          officeId, pmAgent.id, pmAgent.name,
          `📊 PM Proje Değerlendirmesi:\n${out.trim().slice(0, 1000)}`,
          'agent-to-agent'
        )
      }
    })
  }
}

// Görevi tamamla ve bağımlı görevleri tetikle
function onTaskCompleted(taskId: string, officeId: string) {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as any
  if (!task) return

  // Görevi done yap + ilerlemeyi güncelle
  db.prepare("UPDATE tasks SET status = 'done' WHERE id = ?").run(taskId)
  const allTasks = db.prepare('SELECT status FROM tasks WHERE project_id = ?').all(task.project_id) as any[]
  const done = allTasks.filter(t => t.status === 'done').length + 1 // +1 çünkü UPDATE henüz commit oldu
  const progress = Math.round((done / allTasks.length) * 100)
  db.prepare('UPDATE projects SET progress = ? WHERE id = ?').run(progress, task.project_id)

  // Proje tüm görevler bittiyse done yap
  if (done === allTasks.length) {
    db.prepare("UPDATE projects SET status = 'done' WHERE id = ?").run(task.project_id)

    // PM varsa son değerlendirme yaptır
    const projForReview = db.prepare('SELECT * FROM projects WHERE id = ?').get(task.project_id) as any
    if (projForReview?.pm_agent_id && projForReview.workflow_mode === 'coordinated') {
      const pmAg = db.prepare('SELECT * FROM agents WHERE id = ?').get(projForReview.pm_agent_id) as any
      if (pmAg) {
        pmCheckProjectProgress(officeId, projForReview, pmAg)
      }
    }

    // Proje tamamlanma özeti gönder
    broadcastProjectComplete(officeId, task.project_id)
  }

  // Faz 7 — PM Koordinasyonu: PM ajanına bilgi ver ve değerlendirme yaptır
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(task.project_id) as any
  if (project?.pm_agent_id && project.workflow_mode === 'coordinated') {
    const completedAgent = db.prepare('SELECT name FROM agents WHERE id = ?').get(task.assigned_agent_id) as any
    const pmAgent = db.prepare('SELECT * FROM agents WHERE id = ?').get(project.pm_agent_id) as any

    if (pmAgent) {
      // PM'e bildirim gönder
      saveAndBroadcastMessage(
        officeId,
        project.pm_agent_id,
        completedAgent?.name ?? 'Ajan',
        `📋 Görev tamamlandı: "${task.description.slice(0, 80)}" — İlerleme: %${progress}`,
        'agent-to-agent'
      )

      // PM'e sonraki adımı koordine ettir (eğer bağımlı görevler varsa)
      const pendingDeps = db.prepare(
        "SELECT t.*, a.name as agent_name FROM tasks t LEFT JOIN agents a ON t.assigned_agent_id = a.id WHERE t.depends_on_task_id = ? AND t.status IN ('todo', 'in_progress')"
      ).all(taskId) as any[]

      if (pendingDeps.length > 0 && project.work_dir) {
        // PM ajanı Claude ile aktif değerlendirme yapar
        pmEvaluateAndCoordinate(officeId, project, pmAgent, task, completedAgent, pendingDeps)
      }
    }
  }

  // Bu göreve bağımlı (depends_on_task_id = taskId) görevleri bul.
  // in_progress dahil — önceki başarısız çalıştırmalar takılı bırakmış olabilir.
  const dependents = db.prepare(
    "SELECT * FROM tasks WHERE depends_on_task_id = ? AND status IN ('todo', 'in_progress') AND assigned_agent_id IS NOT NULL"
  ).all(taskId) as any[]

  for (const dep of dependents) {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(dep.project_id) as any
    if (!project?.work_dir) continue

    // Faz 9 — contextMode'a göre bağlam oluştur
    const contextText = buildContextForProject(dep.project_id, project.context_mode ?? 'full')

    const prompt = contextText
      ? `Proje: ${project.name}\nKlasör: ${project.work_dir}\n\nTamamlananlar:\n${contextText}\n\nSenin görevin:\n${dep.description}`
      : `Proje: ${project.name}\nKlasör: ${project.work_dir}\n\nGörev:\n${dep.description}`

    const assignedAgent = db.prepare('SELECT name FROM agents WHERE id = ?').get(dep.assigned_agent_id) as any

    try {
      startSession(dep.assigned_agent_id, project.work_dir, prompt, dep.id)
      db.prepare("UPDATE tasks SET status = 'in_progress' WHERE id = ?").run(dep.id)

      // ConversationPanel'e handoff bildirimi
      saveAndBroadcastMessage(
        officeId,
        dep.assigned_agent_id,
        assignedAgent?.name ?? 'Sistem',
        `⛓ Bağımlı görev otomatik başlatıldı: "${dep.description.slice(0, 60)}"`,
        'system'
      )
    } catch (e: any) {
      console.error(`[AutoTrigger] Bağımlı görev başlatılamadı: ${dep.id}`, e.message)
    }
  }

  // Aynı ajandaki sıradaki pending görevi otomatik başlat (dependency olmasa bile)
  if (task.assigned_agent_id && !activeSessions.has(task.assigned_agent_id)) {
    const nextTask = db.prepare(
      "SELECT * FROM tasks WHERE project_id = ? AND assigned_agent_id = ? AND status = 'todo' ORDER BY sort_order ASC, created_at ASC LIMIT 1"
    ).get(task.project_id, task.assigned_agent_id) as any

    if (nextTask) {
      // Bağımlılık kontrolü
      if (nextTask.depends_on_task_id) {
        const dep = db.prepare('SELECT status FROM tasks WHERE id = ?').get(nextTask.depends_on_task_id) as any
        if (dep && dep.status !== 'done') {
          // Bağımlılık henüz bitmemiş, başlatma
        } else if (dep?.status === 'done' || !dep) {
          autoStartTask(nextTask, officeId)
        }
      } else {
        autoStartTask(nextTask, officeId)
      }
    }
  }

  // Tüm DB değişiklikleri bittikten sonra frontend'e güncel proje bilgisini gönder
  broadcastProjectUpdate(officeId, task.project_id)
}

function autoStartTask(nextTask: any, officeId: string) {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(nextTask.project_id) as any
  if (!project?.work_dir) return

  const contextText = buildContextForProject(nextTask.project_id, project.context_mode ?? 'full')
  const prompt = contextText
    ? `Proje: ${project.name}\nKlasör: ${project.work_dir}\n\nTamamlananlar:\n${contextText}\n\nSenin görevin:\n${nextTask.description}`
    : `Proje: ${project.name}\nKlasör: ${project.work_dir}\n\nGörev:\n${nextTask.description}`

  const assignedAgent = db.prepare('SELECT name FROM agents WHERE id = ?').get(nextTask.assigned_agent_id) as any

  try {
    startSession(nextTask.assigned_agent_id, project.work_dir, prompt, nextTask.id)
    db.prepare("UPDATE tasks SET status = 'in_progress' WHERE id = ?").run(nextTask.id)

    saveAndBroadcastMessage(
      officeId,
      nextTask.assigned_agent_id,
      assignedAgent?.name ?? 'Sistem',
      `▶ Sıradaki görev otomatik başlatıldı: "${nextTask.description.slice(0, 60)}"`,
      'system'
    )

    broadcastProjectUpdate(officeId, nextTask.project_id)
  } catch (e: any) {
    console.error(`[AutoNext] Sıradaki görev başlatılamadı: ${nextTask.id}`, e.message)
  }
}

// Proje güncellemesini WebSocket üzerinden frontend'e bildir
function broadcastProjectUpdate(officeId: string, projectId: string) {
  const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any
  if (!p) return
  const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY sort_order ASC, created_at ASC').all(projectId) as any[]
  broadcast(officeId, {
    type: 'project:update',
    project: {
      id: p.id,
      officeId: p.office_id,
      name: p.name,
      description: p.description,
      status: p.status,
      progress: p.progress,
      workDir: p.work_dir ?? '',
      approvalPolicy: p.approval_policy ?? 'auto',
      errorPolicy: p.error_policy ?? 'stop',
      workflowMode: p.workflow_mode ?? 'free',
      pmAgentId: p.pm_agent_id ?? undefined,
      contextMode: p.context_mode ?? 'full',
      claudeMd: p.claude_md ?? undefined,
      extraInstructions: p.extra_instructions ?? '',
      isolationMode: p.isolation_mode ?? 'shared',
      createdAt: p.created_at,
      tasks: tasks.map(t => ({
        id: t.id,
        projectId: t.project_id,
        assignedAgentId: t.assigned_agent_id ?? undefined,
        description: t.description,
        status: t.status,
        dependsOnTaskId: t.depends_on_task_id ?? undefined,
        maxTurns: t.max_turns ?? 0,
        effortLevel: t.effort_level || undefined,
        outputSchema: t.output_schema || undefined,
        sortOrder: t.sort_order ?? 0,
        createdAt: t.created_at,
      })),
    },
  })
}

// Proje tamamlandığında özet bilgiyle frontend'e bildir
function broadcastProjectComplete(officeId: string, projectId: string) {
  const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any
  if (!p) return

  const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(projectId) as any[]

  // Katılımcı ajanlar ve görev sayıları
  const agentTaskMap = new Map<string, { name: string; animal: string; count: number }>()
  for (const t of tasks) {
    if (!t.assigned_agent_id) continue
    if (!agentTaskMap.has(t.assigned_agent_id)) {
      const ag = db.prepare('SELECT name, animal FROM agents WHERE id = ?').get(t.assigned_agent_id) as any
      agentTaskMap.set(t.assigned_agent_id, { name: ag?.name ?? '?', animal: ag?.animal ?? 'cat', count: 0 })
    }
    agentTaskMap.get(t.assigned_agent_id)!.count++
  }

  // Session loglarından toplam token ve maliyet
  const tokenStats = db.prepare(
    'SELECT COALESCE(SUM(total_tokens), 0) as totalTokens, COALESCE(SUM(cost_usd), 0) as totalCost FROM session_logs WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)'
  ).get(projectId) as any

  // Süre hesapla: ilk session başlangıcından şu ana
  const firstSession = db.prepare(
    'SELECT MIN(started_at) as firstStart FROM session_logs WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)'
  ).get(projectId) as any

  const now = new Date()
  const startedAt = firstSession?.firstStart ?? p.created_at
  const durationSec = Math.round((now.getTime() - new Date(startedAt).getTime()) / 1000)

  const agents = Array.from(agentTaskMap.values()).map(a => ({
    name: a.name,
    animal: a.animal as any,
    taskCount: a.count,
  }))

  broadcast(officeId, {
    type: 'project:complete',
    summary: {
      projectId: p.id,
      projectName: p.name,
      description: p.description,
      workDir: p.work_dir ?? '',
      totalTasks: tasks.length,
      agentCount: agentTaskMap.size,
      agents,
      totalTokens: tokenStats?.totalTokens ?? 0,
      totalCost: tokenStats?.totalCost ?? 0,
      durationSec,
      startedAt,
      completedAt: now.toISOString(),
    },
  })
}

// Faz 9 — Kompakt bağlam oluşturma: contextMode'a göre tamamlanan görev listesi
export function buildContextForProject(projectId: string, contextMode: string): string {
  const doneTasks = db.prepare(
    'SELECT t.description, a.name FROM tasks t LEFT JOIN agents a ON t.assigned_agent_id = a.id WHERE t.project_id = ? AND t.status = ?'
  ).all(projectId, 'done') as any[]

  if (doneTasks.length === 0) return ''

  if (contextMode === 'minimal') {
    const allTasks = db.prepare('SELECT COUNT(*) as cnt FROM tasks WHERE project_id = ?').get(projectId) as any
    return `İlerleme: ${doneTasks.length}/${allTasks.cnt} görev tamamlandı.`
  }

  if (contextMode === 'compact') {
    // Son 3 görev + özet
    const recent = doneTasks.slice(-3)
    const recentLines = recent.map((t: any) => `✓ ${t.name ? `[${t.name}] ` : ''}${t.description}`)
    const prefix = doneTasks.length > 3 ? `(${doneTasks.length - 3} önceki görev tamamlandı)\n` : ''
    return `${prefix}${recentLines.join('\n')}`
  }

  // full (varsayılan)
  return doneTasks.map((t: any) => `✓ ${t.name ? `[${t.name}] ` : ''}${t.description}`).join('\n')
}

// Prompt'tan sadece görev açıklamasını çıkar
function extractTaskDescription(prompt: string): string {
  // "Senin görevin:\n..." veya "Görev:\n..." satırından sonrasını al
  const match = prompt.match(/(?:Senin görevin|Görev):\n([\s\S]+)/)
  if (match) return match[1].trim().slice(0, 120)
  // Fallback: prompt'un son satırlarını kullan
  const lines = prompt.trim().split('\n').filter(l => l.trim())
  return lines[lines.length - 1]?.slice(0, 120) ?? prompt.slice(0, 120)
}

export function startSession(agentId: string, workDir: string, task: string, taskId?: string) {
  workDir = workDir?.trim() || process.cwd()
  // Mevcut oturum varsa durdur
  if (activeSessions.has(agentId)) {
    stopSession(agentId)
  }

  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId) as any
  if (!agent) throw new Error('Agent not found')

  // Faz 14 — Worktree izolasyonu: proje worktree modundaysa izole dizin kullan
  let effectiveWorkDir = workDir
  if (taskId) {
    const taskProjWT = db.prepare('SELECT project_id FROM tasks WHERE id = ?').get(taskId) as any
    if (taskProjWT && isWorktreeMode(taskProjWT.project_id)) {
      // Mevcut worktree var mı kontrol et
      const existingPath = getAgentWorktreePath(taskProjWT.project_id, agentId)
      if (existingPath) {
        effectiveWorkDir = existingPath
      } else {
        // Yeni worktree oluştur
        try {
          const wt = createWorktree(taskProjWT.project_id, agentId, taskId)
          effectiveWorkDir = wt.worktreePath
          saveAndBroadcastMessage(
            agent.office_id, agentId, agent.name,
            `🌳 Worktree oluşturuldu: ${wt.branch}`, 'system'
          )
        } catch (e: any) {
          console.error(`[Worktree] Oluşturulamadı: ${e.message}`)
          // Fallback: shared mode devam et
        }
      }
    }
  }

  const startTime = Date.now()
  const displayTask = extractTaskDescription(task)

  // Faz 11 — system-prompt-file: dosyadan system prompt yükleme
  let fileSystemPrompt = ''
  if (agent.system_prompt_file) {
    try {
      const promptFilePath = path.isAbsolute(agent.system_prompt_file)
        ? agent.system_prompt_file
        : path.join(workDir, agent.system_prompt_file)
      if (fs.existsSync(promptFilePath)) {
        fileSystemPrompt = fs.readFileSync(promptFilePath, 'utf8').trim()
      }
    } catch {}
  }

  // Faz 11 — Proje bazında ek talimatlar (tüm ajanlar için ortak)
  let projectExtraInstructions = ''
  if (taskId) {
    const taskProj = db.prepare(
      'SELECT p.extra_instructions FROM projects p JOIN tasks t ON p.id = t.project_id WHERE t.id = ?'
    ).get(taskId) as any
    if (taskProj?.extra_instructions) {
      projectExtraInstructions = taskProj.extra_instructions.trim()
    }
  }

  // Ajanın skill'lerini topla
  const agentSkills = db.prepare(`
    SELECT s.name, s.content FROM skills s
    JOIN agent_skills ags ON s.id = ags.skill_id
    WHERE ags.agent_id = ?
    ORDER BY s.name ASC
  `).all(agentId) as any[]

  const skillsBlock = agentSkills.length > 0
    ? agentSkills.map((s: any) => `[Skill: ${s.name}]\n${s.content}`).join('\n\n---\n\n')
    : ''

  // System prompt + skills + task birleştir
  const systemPrompt = agent.system_prompt?.trim()
  const promptParts: string[] = []
  if (systemPrompt) promptParts.push(`[Sistem Talimatı]: ${systemPrompt}`)
  if (fileSystemPrompt) promptParts.push(`[Dosya Talimatı]: ${fileSystemPrompt}`)
  if (projectExtraInstructions) promptParts.push(`[Proje Talimatları]: ${projectExtraInstructions}`)
  // Ajanın eğitim profilini topla
  const trainingProfile = db.prepare(`
    SELECT tp.name, tp.content FROM training_profiles tp
    JOIN agents a ON a.training_profile_id = tp.id
    WHERE a.id = ? AND tp.status = 'done' AND tp.content != ''
  `).get(agentId) as any

  if (trainingProfile?.content) {
    promptParts.push(`[Eğitim/Training: ${trainingProfile.name}]\n${trainingProfile.content}`)
  }

  if (skillsBlock) promptParts.push(`[Yetenekler/Skills]:\n${skillsBlock}`)

  // Faz 11 — Yapılandırılmış çıktı şeması (görev > ajan)
  let effectiveOutputSchema = agent.output_schema || ''
  if (taskId) {
    const taskSchemaRow = db.prepare('SELECT output_schema FROM tasks WHERE id = ?').get(taskId) as any
    if (taskSchemaRow?.output_schema) effectiveOutputSchema = taskSchemaRow.output_schema
  }
  if (effectiveOutputSchema) {
    promptParts.push(`[Çıktı Formatı]: Yanıtını aşağıdaki JSON Schema'ya uygun olarak JSON formatında ver:\n${effectiveOutputSchema}`)
  }

  let fullPrompt = promptParts.length > 0
    ? `${promptParts.join('\n\n---\n\n')}\n\n---\n\n${task}`
    : task

  // Faz 11 — Prompt şablonları: {{variable}} interpolasyonu
  // Proje bilgilerini topla
  let projectInfo: any = null
  if (taskId) {
    const taskProjRow = db.prepare(
      'SELECT p.* FROM projects p JOIN tasks t ON p.id = t.project_id WHERE t.id = ?'
    ).get(taskId) as any
    if (taskProjRow) projectInfo = taskProjRow
  }
  const templateVars: Record<string, string> = {
    'agent.name': agent.name ?? '',
    'agent.role': agent.role ?? '',
    'agent.animal': agent.animal ?? '',
    'agent.model': agent.model ?? '',
    'project.name': projectInfo?.name ?? '',
    'project.description': projectInfo?.description ?? '',
    'project.workDir': projectInfo?.work_dir ?? workDir,
    'project.status': projectInfo?.status ?? '',
    'date': new Date().toISOString().split('T')[0],
    'timestamp': new Date().toISOString(),
  }
  fullPrompt = fullPrompt.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key) => {
    return templateVars[key] ?? match
  })

  // Faz 9 — CLAUDE.md yönetimi: proje workDir'ine yaz (varsa)
  if (taskId) {
    const taskRow = db.prepare('SELECT project_id FROM tasks WHERE id = ?').get(taskId) as any
    if (taskRow) {
      const proj = db.prepare('SELECT claude_md, work_dir FROM projects WHERE id = ?').get(taskRow.project_id) as any
      if (proj?.claude_md && proj.work_dir) {
        try {
          const claudeMdPath = path.join(proj.work_dir, 'CLAUDE.md')
          fs.writeFileSync(claudeMdPath, proj.claude_md, 'utf8')
        } catch {}
      }
    }
  }

  // Faz 9 — Max turns: görev > ajan > varsayılan (15)
  const DEFAULT_MAX_TURNS = 15
  let effectiveMaxTurns = 0
  if (taskId) {
    const taskRow = db.prepare('SELECT max_turns FROM tasks WHERE id = ?').get(taskId) as any
    if (taskRow?.max_turns > 0) effectiveMaxTurns = taskRow.max_turns
  }
  if (effectiveMaxTurns === 0 && agent.max_turns > 0) {
    effectiveMaxTurns = agent.max_turns
  }
  if (effectiveMaxTurns === 0) {
    effectiveMaxTurns = DEFAULT_MAX_TURNS
  }

  // Claude CLI'yı başlat
  // Task'ı -p argümanı yerine stdin üzerinden gönder.
  // Windows shell'de -p "..." özel karakterleri ({, }, ", \n) bozar.
  const cliArgs = ['--print', '--verbose', '--dangerously-skip-permissions', '--output-format', 'stream-json']
  if (agent.model) cliArgs.push('--model', agent.model)
  if (effectiveMaxTurns > 0) cliArgs.push('--max-turns', String(effectiveMaxTurns))

  // Faz 11 — Granüler izin yönetimi
  const allowedTools: string[] = agent.allowed_tools ? (typeof agent.allowed_tools === 'string' ? (() => { try { return JSON.parse(agent.allowed_tools) } catch { return [] } })() : agent.allowed_tools) : []
  const disallowedTools: string[] = agent.disallowed_tools ? (typeof agent.disallowed_tools === 'string' ? (() => { try { return JSON.parse(agent.disallowed_tools) } catch { return [] } })() : agent.disallowed_tools) : []
  if (allowedTools.length > 0) cliArgs.push('--allowedTools', allowedTools.join(','))
  if (disallowedTools.length > 0) cliArgs.push('--disallowedTools', disallowedTools.join(','))

  // Faz 11 — Ek sistem prompt
  if (agent.append_system_prompt) {
    cliArgs.push('--append-system-prompt', agent.append_system_prompt)
  }

  // Faz 11 — Environment variables (effort level + custom vars)
  const agentEnv: Record<string, string> = { ...process.env } as any

  // Efor seviyesi: görev > ajan > varsayılan (low)
  const DEFAULT_EFFORT_LEVEL = 'low'
  let effectiveEffort = ''
  if (taskId) {
    const taskRow2 = db.prepare('SELECT effort_level FROM tasks WHERE id = ?').get(taskId) as any
    if (taskRow2?.effort_level) effectiveEffort = taskRow2.effort_level
  }
  if (!effectiveEffort && agent.effort_level) effectiveEffort = agent.effort_level
  if (!effectiveEffort) effectiveEffort = DEFAULT_EFFORT_LEVEL
  agentEnv.CLAUDE_CODE_EFFORT_LEVEL = effectiveEffort
  if (agent.environment_vars) {
    const envVars = typeof agent.environment_vars === 'string'
      ? (() => { try { return JSON.parse(agent.environment_vars) } catch { return {} } })()
      : agent.environment_vars
    Object.assign(agentEnv, envVars)
  }

  // Faz 12 — Hook konfigürasyonunu CLI settings olarak enjekte et
  let hookProjectId: string | undefined
  if (taskId) {
    const taskProjRow2 = db.prepare('SELECT project_id FROM tasks WHERE id = ?').get(taskId) as any
    if (taskProjRow2) hookProjectId = taskProjRow2.project_id
  }
  if (hookProjectId) {
    const hooksConfig = buildHooksConfig(hookProjectId)
    if (hooksConfig) {
      // Claude CLI'ya --hooks flag ile hook konfigürasyonu geçir (JSON string)
      // NOT: Claude Code settings.json hooks formatı
      try {
        const hooksJson = JSON.stringify({ hooks: hooksConfig })
        agentEnv.CLAUDE_CODE_HOOKS_CONFIG = hooksJson
      } catch {}
    }
  }

  // Faz 13 — MCP Server konfigürasyonunu CLI'ya enjekte et
  const agentMcpRows = db.prepare(
    `SELECT s.* FROM mcp_servers s
     INNER JOIN agent_mcp_servers ams ON ams.mcp_server_id = s.id
     WHERE ams.agent_id = ? AND s.enabled = 1`
  ).all(agentId) as any[]

  if (agentMcpRows.length > 0) {
    // Claude Code mcpServers formatı: { "mcpServers": { "name": { "command": "...", "args": [...], "env": {...} } } }
    const mcpServers: Record<string, any> = {}
    for (const row of agentMcpRows) {
      const serverArgs = (() => { try { return JSON.parse(row.args || '[]') } catch { return [] } })()
      const serverEnv = (() => { try { return JSON.parse(row.env || '{}') } catch { return {} } })()

      if (row.transport === 'stdio') {
        // stdio: komut + args formatı
        const parts = (row.command || '').split(/\s+/)
        const cmd = parts[0] || ''
        const cmdArgs = [...parts.slice(1), ...serverArgs]
        mcpServers[row.name] = {
          command: cmd,
          args: cmdArgs,
          ...(Object.keys(serverEnv).length > 0 ? { env: serverEnv } : {}),
        }
      } else if (row.transport === 'sse' || row.transport === 'http') {
        // SSE/HTTP: URL tabanlı
        mcpServers[row.name] = {
          url: row.url || '',
          ...(Object.keys(serverEnv).length > 0 ? { env: serverEnv } : {}),
        }
      }
    }

    if (Object.keys(mcpServers).length > 0) {
      // Geçici MCP config dosyası oluştur
      const mcpConfigPath = path.join(os.tmpdir(), `smith-mcp-${agentId}-${Date.now()}.json`)
      try {
        fs.writeFileSync(mcpConfigPath, JSON.stringify({ mcpServers }, null, 2))
        cliArgs.push('--mcp-config', mcpConfigPath)
      } catch (e: any) {
        console.error(`[MCP] Config yazılamadı: ${e.message}`)
      }
    }
  }

  // Faz 16 — Subagent profili: dosyayı workDir'e sync et ve --agent flag'i ekle
  if (agent.subagent_id) {
    const subRow = db.prepare('SELECT name FROM subagents WHERE id = ?').get(agent.subagent_id) as any
    if (subRow) {
      try {
        syncSubagentToProject(agent.subagent_id, effectiveWorkDir)
        cliArgs.push('--agent', subRow.name)
      } catch (e: any) {
        console.error(`[Subagent] Sync hatası: ${e.message}`)
      }
    }
  }

  const proc = spawn('claude', cliArgs, {
    cwd: effectiveWorkDir,
    shell: true,
    env: agentEnv,
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  // Spawn hatası yakala
  proc.on('error', (err) => {
    console.error(`[Process ${agentId}] spawn hatası:`, err.message)
    activeSessions.delete(agentId)
    db.prepare('UPDATE agents SET status = ?, current_task = NULL, session_pid = NULL, current_task_id = NULL WHERE id = ?')
      .run('idle', agentId)
    broadcast(agent.office_id, { type: 'agent:status', agentId, status: 'idle', currentTask: null })
    saveAndBroadcastMessage(agent.office_id, agentId, agent.name, `❌ Claude başlatılamadı: ${err.message}`, 'system')
  })

  // Task prompt'unu stdin üzerinden ilet
  try {
    proc.stdin?.write(fullPrompt)
    proc.stdin?.end()
  } catch (e: any) {
    console.error(`[Process ${agentId}] stdin yazma hatası:`, e.message)
  }

  // Faz 9 — Session log oluştur
  const sessionLogId = `sl_${Date.now()}_${agentId.slice(0, 8)}`
  const sessionStartedAt = new Date().toISOString()
  db.prepare(
    'INSERT INTO session_logs (id, agent_id, task_id, model, started_at) VALUES (?, ?, ?, ?, ?)'
  ).run(sessionLogId, agentId, taskId ?? null, agent.model || 'default', sessionStartedAt)

  // Faz 17 — max-budget-usd: görev/proje bazında bütçe limiti
  let maxBudgetUsd: number | undefined
  if (taskId) {
    const budgetProj = db.prepare(
      'SELECT p.* FROM projects p JOIN tasks t ON p.id = t.project_id WHERE t.id = ?'
    ).get(taskId) as any
    // Proje work_dir bazında budget env var kontrolü
    if (agentEnv.SMITH_MAX_BUDGET_USD) {
      maxBudgetUsd = parseFloat(agentEnv.SMITH_MAX_BUDGET_USD) || undefined
    }
  }

  const session: ActiveSession = {
    agentId,
    officeId: agent.office_id,
    process: proc,
    jsonlPath: '',
    startedAt: sessionStartedAt,
    taskId,
    inputTokens: 0,
    outputTokens: 0,
    sessionLogId,
    lastResultText: '',
    outputSchema: effectiveOutputSchema || undefined,
    toolsUsed: [],
    maxBudgetUsd,
  }
  activeSessions.set(agentId, session)

  // PID + task_id'yi DB'ye kaydet — sadece görev açıklamasını göster
  db.prepare('UPDATE agents SET session_pid = ?, status = ?, current_task = ?, current_task_id = ? WHERE id = ?')
    .run(proc.pid ?? null, 'thinking', displayTask, taskId ?? null, agentId)

  broadcast(agent.office_id, {
    type: 'agent:status',
    agentId,
    status: 'thinking',
    currentTask: displayTask,
  })

  saveAndBroadcastMessage(
    agent.office_id,
    agentId,
    agent.name,
    `🚀 Görev başladı: ${displayTask}`,
    'system'
  )

  // Faz 12 — SessionStart hook'u tetikle
  if (hookProjectId) {
    executeHooks('SessionStart', {
      officeId: agent.office_id,
      projectId: hookProjectId,
      agentId,
      taskId,
      workDir,
    }).catch(() => {})
  }

  // stdout'u izle — JSON stream mesajları
  let lastOutputTime = Date.now()
  let buffer = ''
  proc.stdout?.on('data', (chunk: Buffer) => {
    lastOutputTime = Date.now()
    buffer += chunk.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const data = JSON.parse(line)
        handleClaudeOutput(session, data)
      } catch {}
    }
  })

  let stderrBuf = ''
  proc.stderr?.on('data', (chunk: Buffer) => {
    lastOutputTime = Date.now()
    stderrBuf += chunk.toString()
    console.error(`[Process ${agentId}] stderr:`, chunk.toString().slice(0, 200))
  })

  // Takılı kalma kontrolü — 60s uyar, 300s (5 dk) sonra otomatik kill
  const STUCK_WARN_MS = 60000
  const STUCK_KILL_MS = 300000
  const stuckCheck = setInterval(() => {
    if (!activeSessions.has(agentId)) {
      clearInterval(stuckCheck)
      return
    }
    const elapsed = Date.now() - lastOutputTime
    if (elapsed > STUCK_KILL_MS) {
      clearInterval(stuckCheck)
      saveAndBroadcastMessage(
        agent.office_id, agentId, agent.name,
        `❌ ${Math.round(elapsed / 1000)}s boyunca yanıt yok — oturum zaman aşımına uğradı, sonlandırılıyor`,
        'system'
      )
      try { proc.kill('SIGTERM') } catch {}
      setTimeout(() => { try { proc.kill('SIGKILL') } catch {} }, 5000)
    } else if (elapsed > STUCK_WARN_MS) {
      saveAndBroadcastMessage(
        agent.office_id, agentId, agent.name,
        `⏳ ${Math.round(elapsed / 1000)}s boyunca yanıt yok — Claude düşünüyor veya takılmış olabilir`,
        'system'
      )
    }
  }, 30000)

  proc.on('close', (code) => {
    clearInterval(stuckCheck)

    // Faz 9 — Token logunu finalize et + Faz 11 — Structured output doğrulama
    if (session.sessionLogId) {
      const totalTokens = session.inputTokens + session.outputTokens
      let resultJson = ''
      let schemaValid = -1 // -1 = N/A (schema yok)

      // Structured output: son yanıttan JSON çıkarmayı dene
      if (session.lastResultText && session.outputSchema) {
        try {
          // JSON bloğunu bul (```json ... ``` veya düz JSON)
          const jsonMatch = session.lastResultText.match(/```json\s*([\s\S]+?)\s*```/) ||
                           session.lastResultText.match(/(\{[\s\S]+\})/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[1])
            resultJson = JSON.stringify(parsed)
            // Basit tip doğrulama (JSON Schema deep validation yerine temel kontrol)
            try {
              const schema = JSON.parse(session.outputSchema)
              if (schema.type === 'object' && schema.properties) {
                const requiredKeys = schema.required ?? Object.keys(schema.properties)
                const hasAll = requiredKeys.every((k: string) => k in parsed)
                schemaValid = hasAll ? 1 : 0
              } else {
                schemaValid = 1 // Schema var ama basit — geçerli say
              }
            } catch {
              schemaValid = 1 // Schema parse hatası — geçerli say
            }
          } else {
            schemaValid = 0 // JSON bulunamadı
          }
        } catch {
          schemaValid = 0 // Parse hatası
        }

        // Doğrulama sonucunu bildir
        if (schemaValid === 1) {
          saveAndBroadcastMessage(
            agent.office_id, agentId, agent.name,
            `✅ Yapılandırılmış çıktı: JSON şemasına uygun`,
            'system'
          )
        } else if (schemaValid === 0) {
          saveAndBroadcastMessage(
            agent.office_id, agentId, agent.name,
            `⚠️ Yapılandırılmış çıktı: JSON şemasına uymuyor`,
            'system'
          )
        }
      }

      // Faz 17 — Maliyet + süre + tool bilgisi hesapla
      const costUsd = calculateSessionCost(session)
      const endedAt = new Date().toISOString()
      const durationSec = Math.round((new Date(endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000)
      const toolsUsedJson = JSON.stringify(session.toolsUsed)

      db.prepare(
        'UPDATE session_logs SET input_tokens = ?, output_tokens = ?, total_tokens = ?, result_json = ?, schema_valid = ?, cost_usd = ?, duration_sec = ?, tools_used = ?, ended_at = ? WHERE id = ?'
      ).run(session.inputTokens, session.outputTokens, totalTokens, resultJson, schemaValid, costUsd, durationSec, toolsUsedJson, endedAt, session.sessionLogId)

      // Token bilgisini WS ile bildir
      broadcast(agent.office_id, {
        type: 'session:tokens',
        agentId,
        inputTokens: session.inputTokens,
        outputTokens: session.outputTokens,
        totalTokens,
      })
    }

    const completedTaskId = session.taskId
    activeSessions.delete(agentId)
    unwatchAgent(agentId)

    const finalStatus = code === 0 ? 'celebrating' : 'idle'
    db.prepare('UPDATE agents SET status = ?, current_task = NULL, session_pid = NULL, current_task_id = NULL WHERE id = ?')
      .run(finalStatus, agentId)

    broadcast(agent.office_id, {
      type: 'agent:status',
      agentId,
      status: finalStatus,
      currentTask: null,
    })

    if (code === 0) {
      saveAndBroadcastMessage(
        agent.office_id,
        agentId,
        agent.name,
        '✅ Görev tamamlandı!',
        'system'
      )

      // Proje göreviyle bağlıysa → tamamla + bağımlı görevleri tetikle
      if (completedTaskId) {
        try {
          onTaskCompleted(completedTaskId, agent.office_id)
        } catch (e: any) {
          console.error('[AutoTrigger] Hata:', e.message)
        }
      }

      // 3 saniye sonra idle'a dön
      setTimeout(() => {
        db.prepare('UPDATE agents SET status = ? WHERE id = ?').run('idle', agentId)
        broadcast(agent.office_id, {
          type: 'agent:status',
          agentId,
          status: 'idle',
          currentTask: null,
        })
      }, 3000)
    } else {
      const errDetail = stderrBuf.trim().slice(0, 400)
      saveAndBroadcastMessage(
        agent.office_id,
        agentId,
        agent.name,
        `❌ Görev sonlandı (kod: ${code})${errDetail ? '\n' + errDetail : ''}`,
        'system'
      )

      // Faz 7 — Hata politikasına göre aksiyon al
      if (completedTaskId) {
        const failedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(completedTaskId) as any
        if (failedTask) {
          const proj = db.prepare('SELECT * FROM projects WHERE id = ?').get(failedTask.project_id) as any

          if (proj?.pm_agent_id && proj.error_policy === 'notify-pm') {
            // PM aktif hata analizi + delegasyon
            const pmAg = db.prepare('SELECT * FROM agents WHERE id = ?').get(proj.pm_agent_id) as any
            if (pmAg) {
              pmHandleError(agent.office_id, proj, pmAg, failedTask, agent, errDetail)
            }
          } else if (proj?.error_policy === 'auto-retry') {
            // Otomatik yeniden dene (1 kez)
            const retryCount = (failedTask.retry_count ?? 0) + 1
            if (retryCount <= 1 && failedTask.assigned_agent_id && proj.work_dir) {
              saveAndBroadcastMessage(
                agent.office_id, agentId, agent.name,
                `🔄 Otomatik yeniden deneme (#${retryCount})...`,
                'system'
              )
              setTimeout(() => {
                try {
                  db.prepare("UPDATE tasks SET status = 'in_progress' WHERE id = ?").run(failedTask.id)

                  const doneTasks = db.prepare(
                    'SELECT t.description, a.name FROM tasks t LEFT JOIN agents a ON t.assigned_agent_id = a.id WHERE t.project_id = ? AND t.status = ?'
                  ).all(proj.id, 'done') as any[]
                  const contextLines = doneTasks.map((t: any) => `✓ ${t.name ? `[${t.name}] ` : ''}${t.description}`)

                  const retryPrompt = `Proje: ${proj.name}\nKlasör: ${proj.work_dir}\n\n${contextLines.length > 0 ? `Tamamlananlar:\n${contextLines.join('\n')}\n\n` : ''}Önceki çalıştırma başarısız oldu. Hata:\n${errDetail.slice(0, 300)}\n\nSenin görevin (tekrar dene):\n${failedTask.description}`

                  startSession(failedTask.assigned_agent_id, proj.work_dir, retryPrompt, failedTask.id)
                } catch (e: any) {
                  console.error('[AutoRetry]', e.message)
                }
              }, 3000)
            }
          }
        }
      }
    }

    // Faz 12 — SessionStop + TaskCompleted/TaskFailed hook'larını tetikle
    if (hookProjectId) {
      executeHooks('SessionStop', {
        officeId: agent.office_id,
        projectId: hookProjectId,
        agentId,
        taskId: completedTaskId,
        workDir,
      }).catch(() => {})

      if (completedTaskId) {
        const hookEvent = code === 0 ? 'TaskCompleted' : 'TaskFailed'
        executeHooks(hookEvent as any, {
          officeId: agent.office_id,
          projectId: hookProjectId,
          agentId,
          taskId: completedTaskId,
          workDir,
        }).catch(() => {})
      }
    }

    // Faz 14 — Worktree durumunu güncelle (session bittikten sonra)
    if (taskId) {
      const taskProjWT2 = db.prepare('SELECT project_id FROM tasks WHERE id = ?').get(taskId) as any
      if (taskProjWT2) {
        const wtRow = db.prepare(
          "SELECT id FROM worktrees WHERE project_id = ? AND agent_id = ? AND status = 'active'"
        ).get(taskProjWT2.project_id, agentId) as any
        if (wtRow) {
          try { refreshWorktreeStatus(wtRow.id) } catch {}
        }
      }
    }

    console.log(`[Process] Agent ${agentId} sona erdi, kod: ${code}`)
  })

  // JSONL dosyasını bul ve izle (asenkron — event loop'u bloke etmez)
  setTimeout(() => {
    findLatestJsonlAsync(effectiveWorkDir, startTime - 2000, (jsonlPath) => {
      if (jsonlPath) {
        session.jsonlPath = jsonlPath
        db.prepare('UPDATE agents SET watch_path = ? WHERE id = ?').run(jsonlPath, agentId)
        watchAgent(agentId, agent.office_id, jsonlPath)
        console.log(`[Process] JSONL bulundu: ${jsonlPath}`)
      } else {
        const expectedDir = findClaudeProjectDir(workDir)
        console.warn(`[Process] JSONL bulunamadı — workDir: ${workDir} → dizin: ${expectedDir} (mevcut: ${fs.existsSync(expectedDir)})`)
        // --print modunda JSONL oluşmayabilir, stdout stream-json zaten izleniyor
      }
    })
  }, 1000)

  console.log(`[Process] Agent ${agentId} başlatıldı, PID: ${proc.pid}`)
  return { pid: proc.pid, startedAt: session.startedAt }
}

export function stopSession(agentId: string) {
  const session = activeSessions.get(agentId)
  if (!session) return false

  try {
    session.process.kill('SIGTERM')
    // Windows'ta SIGTERM çalışmayabilir
    setTimeout(() => {
      try { session.process.kill('SIGKILL') } catch {}
    }, 2000)
  } catch {}

  activeSessions.delete(agentId)
  unwatchAgent(agentId)

  db.prepare('UPDATE agents SET status = ?, current_task = NULL, session_pid = NULL WHERE id = ?')
    .run('idle', agentId)

  const agent = db.prepare('SELECT office_id, name FROM agents WHERE id = ?').get(agentId) as any
  if (agent) {
    broadcast(agent.office_id, {
      type: 'agent:status',
      agentId,
      status: 'idle',
      currentTask: null,
    })
    saveAndBroadcastMessage(agent.office_id, agentId, agent.name, '⏹ Oturum durduruldu.', 'system')
  }

  console.log(`[Process] Agent ${agentId} durduruldu`)
  return true
}

export function getSessionStatus(agentId: string) {
  const session = activeSessions.get(agentId)
  if (!session) return { active: false }
  return {
    active: true,
    pid: session.process.pid,
    startedAt: session.startedAt,
    jsonlPath: session.jsonlPath,
  }
}

export function getAllSessions() {
  return [...activeSessions.entries()].map(([agentId, s]) => ({
    agentId,
    officeId: s.officeId,
    pid: s.process.pid,
    startedAt: s.startedAt,
    jsonlPath: s.jsonlPath,
  }))
}

// Tool adı → ajan durumu eşlemesi
const TOOL_STATUS: Record<string, string> = {
  Bash: 'typing', Write: 'typing', Edit: 'typing', NotebookEdit: 'typing',
  Read: 'reading', Glob: 'reading', Grep: 'reading',
  WebFetch: 'reading', WebSearch: 'reading',
  Task: 'thinking', TodoWrite: 'thinking',
}

const TOOL_ICONS: Record<string, string> = {
  Bash: '💻', Write: '✍️', Edit: '✏️', Read: '📖',
  Glob: '🔍', Grep: '🔎', WebFetch: '🌐', WebSearch: '🔎',
  Task: '🤖', TodoWrite: '📝', NotebookEdit: '📓',
}

// Claude output (stream-json format) işle
function handleClaudeOutput(session: ActiveSession, data: any) {
  // assistant mesajları (düz metin yanıtlar)
  if (data.type === 'assistant' || data.type === 'text') {
    const text = data.text ?? data.content ?? ''
    if (text && text.trim().length > 10) {
      const shortText = text.trim().slice(0, 120)
      // Konuşma balonunu güncelle
      db.prepare('UPDATE agents SET current_task = ? WHERE id = ?').run(shortText, session.agentId)
      broadcast(session.officeId, {
        type: 'agent:status',
        agentId: session.agentId,
        status: 'thinking' as any,
        currentTask: shortText,
      })
      saveAndBroadcastMessage(
        session.officeId,
        session.agentId,
        '',
        text.trim().slice(0, 500),
        'chat'
      )
    }
  }

  // content_block_start — tool_use bloğu başlangıcı
  if (data.type === 'content_block_start' && data.content_block?.type === 'tool_use') {
    const toolName = data.content_block.name ?? 'tool'
    const icon = TOOL_ICONS[toolName] ?? '🔧'
    const newStatus = TOOL_STATUS[toolName] ?? 'thinking'
    const toolDesc = `${icon} ${toolName} kullanıyor...`

    // Faz 17 — Tool kullanım izleme
    if (!session.toolsUsed.includes(toolName)) {
      session.toolsUsed.push(toolName)
    }

    // Ajan durumunu + konuşma balonunu güncelle
    db.prepare('UPDATE agents SET status = ?, current_task = ? WHERE id = ?').run(newStatus, toolDesc, session.agentId)
    broadcast(session.officeId, {
      type: 'agent:status',
      agentId: session.agentId,
      status: newStatus as any,
      currentTask: toolDesc,
    })

    saveAndBroadcastMessage(
      session.officeId,
      session.agentId,
      '',
      toolDesc,
      'system'
    )

    // Faz 12 — PreToolUse hook tetikle
    if (session.taskId) {
      const taskRow = db.prepare('SELECT project_id FROM tasks WHERE id = ?').get(session.taskId) as any
      if (taskRow) {
        executeHooks('PreToolUse', {
          officeId: session.officeId,
          projectId: taskRow.project_id,
          agentId: session.agentId,
          taskId: session.taskId,
          toolName,
        }).catch(() => {})
      }
    }
  }

  // content_block_delta — tool input veya text delta
  if (data.type === 'content_block_delta') {
    // Tool input JSON delta — göstermek için çok verbose, atlıyoruz
    // Ama text delta varsa gösterelim
    if (data.delta?.type === 'text_delta' && data.delta?.text) {
      const text = data.delta.text.trim()
      if (text.length > 20) {
        saveAndBroadcastMessage(
          session.officeId,
          session.agentId,
          '',
          text.slice(0, 500),
          'chat'
        )
      }
    }
  }

  // content_block_stop — tool bitti
  if (data.type === 'content_block_stop') {
    // Tool tamamlandı, thinking'e dön
    db.prepare('UPDATE agents SET status = ? WHERE id = ?').run('thinking', session.agentId)
    broadcast(session.officeId, {
      type: 'agent:status',
      agentId: session.agentId,
      status: 'thinking' as any,
    })

    // Faz 12 — PostToolUse hook tetikle
    if (session.taskId) {
      const taskRow = db.prepare('SELECT project_id FROM tasks WHERE id = ?').get(session.taskId) as any
      if (taskRow) {
        executeHooks('PostToolUse', {
          officeId: session.officeId,
          projectId: taskRow.project_id,
          agentId: session.agentId,
          taskId: session.taskId,
        }).catch(() => {})
      }
    }
  }

  // result — tool sonucu veya son yanıt
  if (data.type === 'result') {
    const text = data.result ?? data.content ?? ''
    if (text && typeof text === 'string' && text.trim().length > 10) {
      session.lastResultText = text.trim()
      saveAndBroadcastMessage(
        session.officeId,
        session.agentId,
        '',
        `📋 Sonuç: ${text.trim().slice(0, 300)}`,
        'result'
      )
    }
  }

  // Faz 9 — Token kullanım bilgisini topla
  // Claude stream-json: message_start.message.usage, message_delta.usage, result.usage
  const usage = data.usage ?? data.message?.usage ?? data.delta?.usage
  if (usage) {
    if (usage.input_tokens) session.inputTokens += usage.input_tokens
    if (usage.output_tokens) session.outputTokens += usage.output_tokens

    // Faz 17 — Bütçe kontrolü: maliyet limiti aşıldıysa oturumu durdur
    if (session.maxBudgetUsd && !session.budgetExceeded) {
      const currentCost = calculateSessionCost(session)
      if (currentCost > session.maxBudgetUsd) {
        session.budgetExceeded = true
        saveAndBroadcastMessage(
          session.officeId, session.agentId, '',
          `⚠️ Bütçe limiti aşıldı ($${currentCost.toFixed(4)} / $${session.maxBudgetUsd}). Oturum durduruluyor.`,
          'system'
        )
        // Oturumu durdur
        try { session.process.kill('SIGTERM') } catch {}
      }
    }
  }
}

/** Oturum maliyetini hesapla */
function calculateSessionCost(session: ActiveSession): number {
  const agent = db.prepare('SELECT model FROM agents WHERE id = ?').get(session.agentId) as any
  const model = agent?.model || 'default'
  // Basit fiyat tablosu (types paketinden import edemeyiz)
  const PRICING: Record<string, { i: number; o: number }> = {
    'claude-opus-4-6': { i: 15, o: 75 },
    'claude-sonnet-4-6': { i: 3, o: 15 },
    'claude-haiku-4-5-20251001': { i: 0.8, o: 4 },
    'default': { i: 3, o: 15 },
  }
  const p = PRICING[model] ?? PRICING['default']
  return (session.inputTokens * p.i + session.outputTokens * p.o) / 1_000_000
}
