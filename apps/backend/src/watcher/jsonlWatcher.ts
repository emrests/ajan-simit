import fs from 'fs'
import path from 'path'
import chokidar from 'chokidar'
import { db } from '../db/database'
import { broadcast } from '../ws/server'
import { v4 as uuid } from 'uuid'

// Tool adı → ajan durumu eşleştirmesi
const TOOL_STATUS: Record<string, string> = {
  Bash: 'typing',
  Write: 'typing',
  Edit: 'typing',
  NotebookEdit: 'typing',
  Read: 'reading',
  Glob: 'reading',
  Grep: 'reading',
  WebFetch: 'reading',
  WebSearch: 'reading',
  Task: 'thinking',
  ExitPlanMode: 'thinking',
  TodoWrite: 'thinking',
}

interface WatchedAgent {
  agentId: string
  officeId: string
  filePath: string
  filePos: number         // son okunan byte konumu
  idleTimer: ReturnType<typeof setTimeout> | null
}

const watchedAgents = new Map<string, WatchedAgent>() // agentId → info
let watcher: chokidar.FSWatcher | null = null

// Yeni satırları parse et, durumu güncelle
function processNewLines(agent: WatchedAgent, newContent: string) {
  const lines = newContent.split('\n').filter(l => l.trim())

  for (const line of lines) {
    let entry: any
    try { entry = JSON.parse(line) } catch { continue }

    const type = entry.type
    const msg = entry.message

    if (type === 'assistant' && msg?.content) {
      let newStatus = 'thinking'
      let currentTask: string | null = null

      for (const block of (Array.isArray(msg.content) ? msg.content : [])) {
        if (block.type === 'tool_use') {
          const toolStatus = TOOL_STATUS[block.name] ?? 'typing'
          newStatus = toolStatus

          // Görev açıklaması oluştur
          if (block.name === 'Bash' && block.input?.command) {
            currentTask = `$ ${String(block.input.command).slice(0, 60)}`
          } else if (block.name === 'Write' && block.input?.file_path) {
            currentTask = `Yazıyor: ${path.basename(block.input.file_path)}`
          } else if (block.name === 'Edit' && block.input?.file_path) {
            currentTask = `Düzenliyor: ${path.basename(block.input.file_path)}`
          } else if (block.name === 'Read' && block.input?.file_path) {
            currentTask = `Okuyor: ${path.basename(block.input.file_path)}`
          } else if ((block.name === 'WebFetch' || block.name === 'WebSearch') && block.input?.url) {
            currentTask = `🌐 ${String(block.input.url).slice(0, 50)}`
          } else if (block.name === 'Task' && block.input?.prompt) {
            currentTask = `Alt görev: ${String(block.input.prompt).slice(0, 50)}`
          } else {
            currentTask = `${block.name}...`
          }
          break
        } else if (block.type === 'text' && block.text) {
          currentTask = String(block.text).slice(0, 80)
        }
      }

      updateAgentStatus(agent, newStatus, currentTask)
    }

    // Tool result → waiting kısa süreliğine
    if (type === 'user' && Array.isArray(msg?.content)) {
      const hasToolResult = msg.content.some((b: any) => b.type === 'tool_result')
      if (hasToolResult) {
        updateAgentStatus(agent, 'waiting', 'Sonuç işleniyor...')
      }
    }
  }
}

function updateAgentStatus(agent: WatchedAgent, status: string, currentTask: string | null) {
  // DB güncelle
  db.prepare('UPDATE agents SET status = ?, current_task = ? WHERE id = ?')
    .run(status, currentTask, agent.agentId)

  // WS broadcast
  broadcast(agent.officeId, {
    type: 'agent:status',
    agentId: agent.agentId,
    status,
    currentTask,
  })

  // Mevcut idle timer'ı iptal et
  if (agent.idleTimer) {
    clearTimeout(agent.idleTimer)
    agent.idleTimer = null
  }

  // thinking/typing/reading → 8 saniye sonra idle'a dön
  if (status !== 'idle' && status !== 'celebrating') {
    agent.idleTimer = setTimeout(() => {
      setAgentIdle(agent)
    }, 8000)
  }
}

function setAgentIdle(agent: WatchedAgent) {
  db.prepare('UPDATE agents SET status = ?, current_task = NULL WHERE id = ?')
    .run('idle', agent.agentId)

  broadcast(agent.officeId, {
    type: 'agent:status',
    agentId: agent.agentId,
    status: 'idle',
    currentTask: null,
  })

  agent.idleTimer = null
}

// Dosya değişince yeni satırları oku
function handleFileChange(filePath: string) {
  const agent = [...watchedAgents.values()].find(a => a.filePath === filePath)
  if (!agent) return

  try {
    const stat = fs.statSync(filePath)
    if (stat.size <= agent.filePos) return

    const fd = fs.openSync(filePath, 'r')
    const buf = Buffer.alloc(stat.size - agent.filePos)
    fs.readSync(fd, buf, 0, buf.length, agent.filePos)
    fs.closeSync(fd)

    agent.filePos = stat.size
    processNewLines(agent, buf.toString('utf8'))
  } catch (e) {
    console.error('[JSONL Watcher] Okuma hatası:', e)
  }
}

// Ajan için izleme başlat
export function watchAgent(agentId: string, officeId: string, filePath: string) {
  // Zaten izleniyorsa güncelle
  if (watchedAgents.has(agentId)) {
    unwatchAgent(agentId)
  }

  let filePos = 0
  try {
    filePos = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0
  } catch {}

  const info: WatchedAgent = { agentId, officeId, filePath, filePos, idleTimer: null }
  watchedAgents.set(agentId, info)

  // chokidar'a yeni path ekle
  if (watcher) {
    watcher.add(filePath)
  }

  console.log(`[Watcher] Agent ${agentId} izleniyor: ${filePath}`)
}

// Ajan izlemeyi durdur
export function unwatchAgent(agentId: string) {
  const agent = watchedAgents.get(agentId)
  if (!agent) return

  if (agent.idleTimer) clearTimeout(agent.idleTimer)

  if (watcher) {
    // Başka ajan aynı dosyayı izlemiyorsa kaldır
    const others = [...watchedAgents.values()].filter(a => a.agentId !== agentId && a.filePath === agent.filePath)
    if (others.length === 0) watcher.unwatch(agent.filePath)
  }

  watchedAgents.delete(agentId)
  console.log(`[Watcher] Agent ${agentId} izleme durduruldu`)
}

// Tüm watchers'ı başlat (sunucu başlangıcında)
export function initWatcher() {
  watcher = chokidar.watch([], {
    persistent: true,
    usePolling: false,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
    ignoreInitial: true,
  })

  watcher.on('change', handleFileChange)
  watcher.on('add', handleFileChange)
  watcher.on('error', (err) => console.error('[Watcher] Hata:', err))

  // DB'deki kayıtlı watch_path'leri yükle
  const agents = db.prepare('SELECT id, office_id, watch_path FROM agents WHERE watch_path IS NOT NULL').all() as any[]
  for (const agent of agents) {
    if (agent.watch_path) {
      watchAgent(agent.id, agent.office_id, agent.watch_path)
    }
  }

  console.log(`[Watcher] Başlatıldı — ${agents.length} ajan izleniyor`)
}

// Tüm watcher'ları kapat
export function closeWatcher() {
  if (watcher) {
    watcher.close()
    watcher = null
  }
  for (const agent of watchedAgents.values()) {
    if (agent.idleTimer) clearTimeout(agent.idleTimer)
  }
  watchedAgents.clear()
}

// Konuşma mesajını kaydet ve broadcast et
export function saveAndBroadcastMessage(
  officeId: string,
  fromAgentId: string,
  fromAgentName: string,
  content: string,
  msgType: string = 'assistant'
) {
  const id = uuid()
  const timestamp = new Date().toISOString()

  db.prepare(`
    INSERT INTO messages (id, office_id, from_agent_id, from_agent_name, content, type, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, officeId, fromAgentId, fromAgentName, content, msgType, timestamp)

  broadcast(officeId, {
    type: 'agent:message',
    message: {
      id, officeId, fromAgentId, fromAgentName,
      toAgentId: null, content, type: msgType, timestamp,
    },
  })
}
