import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { db } from '../db/database'

export const hooksRouter = Router()

function rowToHook(r: any) {
  return {
    id: r.id,
    projectId: r.project_id,
    event: r.event,
    matcher: r.matcher || '',
    type: r.type,
    command: r.command || '',
    url: r.url || '',
    prompt: r.prompt || '',
    enabled: r.enabled === 1,
    createdAt: r.created_at,
  }
}

function rowToHookLog(r: any) {
  return {
    id: r.id,
    hookId: r.hook_id,
    event: r.event,
    success: r.success === 1,
    output: r.output || '',
    executedAt: r.executed_at,
  }
}

// GET /api/projects/:id/hooks — Proje hook'larını listele
hooksRouter.get('/projects/:id/hooks', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM hooks WHERE project_id = ? ORDER BY created_at ASC'
  ).all(req.params.id) as any[]
  res.json(rows.map(rowToHook))
})

// POST /api/projects/:id/hooks — Yeni hook oluştur
hooksRouter.post('/projects/:id/hooks', (req, res) => {
  const { event, matcher, type, command, url, prompt, enabled } = req.body
  if (!event || !type) {
    return res.status(400).json({ error: 'event and type are required' })
  }

  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id)
  if (!project) return res.status(404).json({ error: 'Project not found' }) as any

  const id = uuid()
  const createdAt = new Date().toISOString()
  db.prepare(
    'INSERT INTO hooks (id, project_id, event, matcher, type, command, url, prompt, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.params.id, event, matcher ?? '', type, command ?? '', url ?? '', prompt ?? '', enabled !== false ? 1 : 0, createdAt)

  res.status(201).json(rowToHook(db.prepare('SELECT * FROM hooks WHERE id = ?').get(id)))
})

// PUT /api/hooks/:id — Hook güncelle
hooksRouter.put('/hooks/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM hooks WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Hook not found' }) as any

  const { event, matcher, type, command, url, prompt, enabled } = req.body
  db.prepare(
    `UPDATE hooks SET
      event = COALESCE(?, event),
      matcher = COALESCE(?, matcher),
      type = COALESCE(?, type),
      command = COALESCE(?, command),
      url = COALESCE(?, url),
      prompt = COALESCE(?, prompt),
      enabled = COALESCE(?, enabled)
    WHERE id = ?`
  ).run(
    event ?? null, matcher ?? null, type ?? null,
    command ?? null, url ?? null, prompt ?? null,
    enabled != null ? (enabled ? 1 : 0) : null,
    req.params.id
  )

  res.json(rowToHook(db.prepare('SELECT * FROM hooks WHERE id = ?').get(req.params.id)))
})

// DELETE /api/hooks/:id — Hook sil
hooksRouter.delete('/hooks/:id', (req, res) => {
  const result = db.prepare('DELETE FROM hooks WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Hook not found' }) as any
  res.json({ success: true })
})

// PATCH /api/hooks/:id/toggle — Hook aktif/pasif toggle
hooksRouter.patch('/hooks/:id/toggle', (req, res) => {
  const existing = db.prepare('SELECT * FROM hooks WHERE id = ?').get(req.params.id) as any
  if (!existing) return res.status(404).json({ error: 'Hook not found' }) as any

  const newEnabled = existing.enabled === 1 ? 0 : 1
  db.prepare('UPDATE hooks SET enabled = ? WHERE id = ?').run(newEnabled, req.params.id)
  res.json(rowToHook(db.prepare('SELECT * FROM hooks WHERE id = ?').get(req.params.id)))
})

// GET /api/hooks/:id/logs — Hook çalışma logları
hooksRouter.get('/hooks/:id/logs', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM hook_logs WHERE hook_id = ? ORDER BY executed_at DESC LIMIT 20'
  ).all(req.params.id) as any[]
  res.json(rows.map(rowToHookLog))
})
