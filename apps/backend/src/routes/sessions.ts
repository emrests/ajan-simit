import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { db } from '../db/database'
import { broadcast } from '../ws/server'
import { watchAgent, unwatchAgent } from '../watcher/jsonlWatcher'
import { startSession, stopSession, getSessionStatus, getAllSessions } from '../agents/processManager'

export const sessionsRouter = Router()

// POST /api/agents/:id/session/start — Claude oturumu başlat
sessionsRouter.post('/agents/:id/session/start', (req, res) => {
  const { id } = req.params
  const { workDir, task } = req.body

  if (!workDir || !task) {
    return res.status(400).json({ error: 'workDir ve task gerekli' }) as any
  }

  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as any
  if (!agent) return res.status(404).json({ error: 'Agent bulunamadı' }) as any

  try {
    const result = startSession(id, workDir, task)
    res.json({ success: true, ...result })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/agents/:id/session/stop — Oturumu durdur
sessionsRouter.post('/agents/:id/session/stop', (req, res) => {
  const stopped = stopSession(req.params.id)
  res.json({ success: stopped })
})

// GET /api/agents/:id/session/status — Oturum durumu
sessionsRouter.get('/agents/:id/session/status', (req, res) => {
  const status = getSessionStatus(req.params.id)
  res.json(status)
})

// GET /api/sessions — Tüm aktif oturumlar
sessionsRouter.get('/sessions', (_req, res) => {
  res.json(getAllSessions())
})

// POST /api/agents/:id/watch — Manuel JSONL dosyası bağla
sessionsRouter.post('/agents/:id/watch', (req, res) => {
  const { id } = req.params
  const { watchPath } = req.body

  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as any
  if (!agent) return res.status(404).json({ error: 'Agent bulunamadı' }) as any

  if (!watchPath) {
    // İzlemeyi kaldır
    unwatchAgent(id)
    db.prepare('UPDATE agents SET watch_path = NULL WHERE id = ?').run(id)
    return res.json({ success: true, watching: false })
  }

  db.prepare('UPDATE agents SET watch_path = ? WHERE id = ?').run(watchPath, id)
  watchAgent(id, agent.office_id, watchPath)

  res.json({ success: true, watching: true, watchPath })
})

// GET /api/claude/jsonl-files — ~/.claude/projects altındaki son JSONL dosyalarını listele
sessionsRouter.get('/claude/jsonl-files', (_req, res) => {
  const claudeDir = path.join(os.homedir(), '.claude', 'projects')
  const result: { path: string; project: string; mtime: string; size: number }[] = []

  try {
    if (!fs.existsSync(claudeDir)) {
      return res.json({ files: [], claudeDir })
    }

    const projectDirs = fs.readdirSync(claudeDir)
    for (const projDir of projectDirs) {
      const fullProjDir = path.join(claudeDir, projDir)
      try {
        const stat = fs.statSync(fullProjDir)
        if (!stat.isDirectory()) continue

        const jsonlFiles = fs.readdirSync(fullProjDir)
          .filter(f => f.endsWith('.jsonl'))
          .map(f => {
            const fp = path.join(fullProjDir, f)
            const fstat = fs.statSync(fp)
            return { path: fp, project: projDir, mtime: fstat.mtime.toISOString(), size: fstat.size }
          })
          .filter(f => f.size > 0)

        result.push(...jsonlFiles)
      } catch {}
    }

    // En yeniden eskiye sırala, max 20 sonuç
    result.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime())
    res.json({ files: result.slice(0, 20), claudeDir })
  } catch (e: any) {
    res.json({ files: [], claudeDir, error: e.message })
  }
})

// GET /api/agents/:id/transcript — JSONL dosyasından konuşma transcriptini oku
sessionsRouter.get('/agents/:id/transcript', (req, res) => {
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id) as any
  if (!agent) return res.status(404).json({ error: 'Agent bulunamadı' }) as any

  const jsonlPath = agent.watch_path
  if (!jsonlPath || !fs.existsSync(jsonlPath)) {
    return res.json({ entries: [], path: jsonlPath ?? null }) as any
  }

  try {
    const content = fs.readFileSync(jsonlPath, 'utf-8')
    const lines = content.split('\n').filter(l => l.trim())
    const entries: any[] = []

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line)
        const type = parsed.type

        if (type === 'assistant' && parsed.message?.content) {
          for (const block of parsed.message.content) {
            if (block.type === 'text' && block.text?.trim()) {
              entries.push({ type: 'assistant', text: block.text.trim() })
            } else if (block.type === 'tool_use') {
              entries.push({ type: 'tool_use', tool: block.name, input: block.input })
            }
          }
        } else if (type === 'user' && parsed.message?.content) {
          for (const block of parsed.message.content) {
            if (block.type === 'tool_result') {
              const content = Array.isArray(block.content)
                ? block.content.map((c: any) => c.text ?? '').join('\n')
                : String(block.content ?? '')
              if (content.trim()) {
                entries.push({ type: 'tool_result', toolUseId: block.tool_use_id, content: content.slice(0, 1000) })
              }
            }
          }
        } else if (type === 'system' && parsed.subtype === 'init') {
          entries.push({ type: 'system_init', cwd: parsed.cwd, tools: parsed.tools })
        }
      } catch {}
    }

    res.json({ entries, path: jsonlPath, lineCount: lines.length })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── Faz 9 — Token Logları ───

// GET /api/token-stats/:officeId — Ofis genelinde token tüketim özeti
sessionsRouter.get('/token-stats/:officeId', (req, res) => {
  const { officeId } = req.params

  // Ajan bazında toplam
  const agentStats = db.prepare(`
    SELECT sl.agent_id, a.name as agent_name, a.animal,
      SUM(sl.input_tokens) as total_input, SUM(sl.output_tokens) as total_output,
      SUM(sl.total_tokens) as total_tokens, COUNT(*) as session_count
    FROM session_logs sl
    JOIN agents a ON sl.agent_id = a.id
    WHERE a.office_id = ?
    GROUP BY sl.agent_id
    ORDER BY total_tokens DESC
  `).all(officeId) as any[]

  // Ofis toplamı
  const officeTotal = db.prepare(`
    SELECT SUM(sl.total_tokens) as total_tokens, SUM(sl.input_tokens) as input_tokens,
      SUM(sl.output_tokens) as output_tokens, COUNT(*) as session_count
    FROM session_logs sl
    JOIN agents a ON sl.agent_id = a.id
    WHERE a.office_id = ?
  `).get(officeId) as any

  res.json({
    agents: agentStats.map((s: any) => ({
      agentId: s.agent_id,
      agentName: s.agent_name,
      animal: s.animal,
      inputTokens: s.total_input ?? 0,
      outputTokens: s.total_output ?? 0,
      totalTokens: s.total_tokens ?? 0,
      sessionCount: s.session_count ?? 0,
    })),
    total: {
      inputTokens: officeTotal?.input_tokens ?? 0,
      outputTokens: officeTotal?.output_tokens ?? 0,
      totalTokens: officeTotal?.total_tokens ?? 0,
      sessionCount: officeTotal?.session_count ?? 0,
    },
  })
})

// GET /api/agents/:id/token-logs — Ajan bazında session logları
sessionsRouter.get('/agents/:id/token-logs', (req, res) => {
  const logs = db.prepare(`
    SELECT * FROM session_logs WHERE agent_id = ? ORDER BY started_at DESC LIMIT 50
  `).all(req.params.id) as any[]

  res.json(logs.map((l: any) => ({
    id: l.id,
    agentId: l.agent_id,
    taskId: l.task_id ?? undefined,
    inputTokens: l.input_tokens,
    outputTokens: l.output_tokens,
    totalTokens: l.total_tokens,
    model: l.model,
    resultJson: l.result_json || undefined,
    schemaValid: l.schema_valid ?? -1,
    startedAt: l.started_at,
    endedAt: l.ended_at ?? undefined,
  })))
})

// ─── Faz 17 — Gelişmiş Dashboard API ───

// Fiyat tablosu (backend'de types import edemediğimiz için)
const MODEL_PRICING: Record<string, { i: number; o: number }> = {
  'claude-opus-4-6': { i: 15, o: 75 },
  'claude-sonnet-4-6': { i: 3, o: 15 },
  'claude-haiku-4-5-20251001': { i: 0.8, o: 4 },
  'default': { i: 3, o: 15 },
}

function calcCost(input: number, output: number, model: string): number {
  const p = MODEL_PRICING[model] ?? MODEL_PRICING['default']
  return (input * p.i + output * p.o) / 1_000_000
}

// GET /api/dashboard/:officeId — Kapsamlı dashboard istatistikleri
sessionsRouter.get('/dashboard/:officeId', (req, res) => {
  const { officeId } = req.params

  // Ajan bazında toplam (maliyet dahil)
  const agentRows = db.prepare(`
    SELECT sl.agent_id, a.name as agent_name, a.animal,
      SUM(sl.input_tokens) as total_input, SUM(sl.output_tokens) as total_output,
      SUM(sl.total_tokens) as total_tokens, SUM(sl.cost_usd) as total_cost,
      COUNT(*) as session_count, sl.model
    FROM session_logs sl
    JOIN agents a ON sl.agent_id = a.id
    WHERE a.office_id = ?
    GROUP BY sl.agent_id
    ORDER BY total_tokens DESC
  `).all(officeId) as any[]

  // Ajan bazında tamamlanan görev sayısı
  const taskCounts = db.prepare(`
    SELECT a.id as agent_id, COUNT(t.id) as done_count
    FROM agents a
    LEFT JOIN tasks t ON t.assigned_agent_id = a.id AND t.status = 'done'
    WHERE a.office_id = ?
    GROUP BY a.id
  `).all(officeId) as any[]
  const taskMap = new Map(taskCounts.map((r: any) => [r.agent_id, r.done_count ?? 0]))

  const agents = agentRows.map((r: any) => {
    const totalTokens = r.total_tokens ?? 0
    const costUsd = r.total_cost ?? calcCost(r.total_input ?? 0, r.total_output ?? 0, r.model ?? 'default')
    const tasksDone = taskMap.get(r.agent_id) ?? 0
    const sessionCount = r.session_count ?? 0
    return {
      agentId: r.agent_id,
      agentName: r.agent_name,
      animal: r.animal,
      inputTokens: r.total_input ?? 0,
      outputTokens: r.total_output ?? 0,
      totalTokens,
      costUsd: Math.round(costUsd * 10000) / 10000,
      sessionCount,
      avgTokensPerSession: sessionCount > 0 ? Math.round(totalTokens / sessionCount) : 0,
      tasksDone,
      efficiency: totalTokens > 0 ? Math.round((tasksDone / (totalTokens / 1000)) * 1000) / 1000 : 0,
    }
  })

  // Ofis toplamı
  const officeTotal = db.prepare(`
    SELECT SUM(sl.total_tokens) as total_tokens, SUM(sl.input_tokens) as input_tokens,
      SUM(sl.output_tokens) as output_tokens, SUM(sl.cost_usd) as cost_usd, COUNT(*) as session_count
    FROM session_logs sl
    JOIN agents a ON sl.agent_id = a.id
    WHERE a.office_id = ?
  `).get(officeId) as any

  // Tool kullanım istatistikleri
  const toolRows = db.prepare(`
    SELECT sl.tools_used FROM session_logs sl
    JOIN agents a ON sl.agent_id = a.id
    WHERE a.office_id = ? AND sl.tools_used IS NOT NULL AND sl.tools_used != '[]'
  `).all(officeId) as any[]

  const toolCounts: Record<string, number> = {}
  let totalToolUse = 0
  for (const row of toolRows) {
    try {
      const tools = JSON.parse(row.tools_used || '[]')
      for (const t of tools) {
        toolCounts[t] = (toolCounts[t] || 0) + 1
        totalToolUse++
      }
    } catch {}
  }
  const toolUsage = Object.entries(toolCounts)
    .map(([toolName, count]) => ({
      toolName,
      count,
      percentage: totalToolUse > 0 ? Math.round((count / totalToolUse) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  // Günlük kullanım (son 30 gün)
  const dailyRows = db.prepare(`
    SELECT DATE(sl.started_at) as day,
      SUM(sl.total_tokens) as tokens, SUM(sl.cost_usd) as cost, COUNT(*) as sessions
    FROM session_logs sl
    JOIN agents a ON sl.agent_id = a.id
    WHERE a.office_id = ? AND sl.started_at >= DATE('now', '-30 days')
    GROUP BY day ORDER BY day ASC
  `).all(officeId) as any[]

  const dailyUsage = dailyRows.map((r: any) => ({
    date: r.day,
    tokens: r.tokens ?? 0,
    cost: Math.round((r.cost ?? 0) * 10000) / 10000,
    sessions: r.sessions ?? 0,
  }))

  res.json({
    agents,
    total: {
      inputTokens: officeTotal?.input_tokens ?? 0,
      outputTokens: officeTotal?.output_tokens ?? 0,
      totalTokens: officeTotal?.total_tokens ?? 0,
      costUsd: Math.round((officeTotal?.cost_usd ?? 0) * 10000) / 10000,
      sessionCount: officeTotal?.session_count ?? 0,
    },
    toolUsage,
    dailyUsage,
  })
})

// GET /api/agents/:id/session-logs — Gelişmiş ajan session logları (maliyet + tool + süre dahil)
sessionsRouter.get('/agents/:id/session-logs', (req, res) => {
  const logs = db.prepare(`
    SELECT * FROM session_logs WHERE agent_id = ? ORDER BY started_at DESC LIMIT 100
  `).all(req.params.id) as any[]

  res.json(logs.map((l: any) => ({
    id: l.id,
    agentId: l.agent_id,
    taskId: l.task_id ?? undefined,
    inputTokens: l.input_tokens,
    outputTokens: l.output_tokens,
    totalTokens: l.total_tokens,
    model: l.model,
    costUsd: l.cost_usd ?? calcCost(l.input_tokens ?? 0, l.output_tokens ?? 0, l.model ?? 'default'),
    durationSec: l.duration_sec ?? 0,
    toolsUsed: (() => { try { return JSON.parse(l.tools_used || '[]') } catch { return [] } })(),
    resultJson: l.result_json || undefined,
    schemaValid: l.schema_valid ?? -1,
    startedAt: l.started_at,
    endedAt: l.ended_at ?? undefined,
  })))
})

// GET /api/dashboard/:officeId/export — CSV/JSON metrik dışa aktarma
sessionsRouter.get('/dashboard/:officeId/export', (req, res) => {
  const { officeId } = req.params
  const format = req.query.format as string || 'json'

  const rows = db.prepare(`
    SELECT sl.*, a.name as agent_name, a.animal
    FROM session_logs sl
    JOIN agents a ON sl.agent_id = a.id
    WHERE a.office_id = ?
    ORDER BY sl.started_at DESC
  `).all(officeId) as any[]

  const data = rows.map((l: any) => ({
    id: l.id,
    agentName: l.agent_name,
    animal: l.animal,
    inputTokens: l.input_tokens,
    outputTokens: l.output_tokens,
    totalTokens: l.total_tokens,
    model: l.model,
    costUsd: l.cost_usd ?? 0,
    durationSec: l.duration_sec ?? 0,
    toolsUsed: l.tools_used ?? '[]',
    startedAt: l.started_at,
    endedAt: l.ended_at ?? '',
  }))

  if (format === 'csv') {
    const headers = 'id,agentName,animal,inputTokens,outputTokens,totalTokens,model,costUsd,durationSec,toolsUsed,startedAt,endedAt'
    const csvRows = data.map((r: any) =>
      `${r.id},${r.agentName},${r.animal},${r.inputTokens},${r.outputTokens},${r.totalTokens},${r.model},${r.costUsd},${r.durationSec},"${r.toolsUsed}",${r.startedAt},${r.endedAt}`
    )
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="smith-metrics-${officeId}.csv"`)
    res.send([headers, ...csvRows].join('\n'))
  } else {
    res.json(data)
  }
})

// POST /api/agents/:id/status — Ajan durumunu manuel güncelle (test / hook entegrasyonu)
sessionsRouter.post('/agents/:id/status', (req, res) => {
  const { id } = req.params
  const { status, currentTask } = req.body

  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as any
  if (!agent) return res.status(404).json({ error: 'Agent bulunamadı' }) as any

  const validStatuses = ['idle', 'thinking', 'typing', 'reading', 'waiting', 'celebrating']
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Geçersiz status' }) as any
  }

  db.prepare('UPDATE agents SET status = COALESCE(?, status), current_task = ? WHERE id = ?')
    .run(status ?? null, currentTask !== undefined ? currentTask : agent.current_task, id)

  const updated = db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as any

  broadcast(agent.office_id, {
    type: 'agent:status',
    agentId: id,
    status: updated.status,
    currentTask: updated.current_task,
  })

  res.json({ success: true })
})
