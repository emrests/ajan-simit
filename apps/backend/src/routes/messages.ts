import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { db } from '../db/database'
import { broadcast } from '../ws/server'

export const messagesRouter = Router()

// GET /api/offices/:officeId/messages?limit=50
messagesRouter.get('/offices/:officeId/messages', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50
  const rows = db.prepare(
    'SELECT * FROM messages WHERE office_id = ? ORDER BY timestamp DESC LIMIT ?'
  ).all(req.params.officeId, limit) as any[]

  res.json(rows.reverse().map(m => ({
    id: m.id,
    fromAgentId: m.from_agent_id,
    fromAgentName: m.from_agent_name,
    toAgentId: m.to_agent_id,
    content: m.content,
    type: m.type,
    timestamp: m.timestamp,
  })))
})

// POST /api/offices/:officeId/messages
messagesRouter.post('/offices/:officeId/messages', (req, res) => {
  const { fromAgentId, fromAgentName, toAgentId, content, type = 'chat' } = req.body
  if (!fromAgentId || !fromAgentName || !content) {
    return res.status(400).json({ error: 'fromAgentId, fromAgentName, content are required' })
  }

  const id = uuid()
  const timestamp = new Date().toISOString()

  db.prepare(`
    INSERT INTO messages (id, office_id, from_agent_id, from_agent_name, to_agent_id, content, type, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.params.officeId, fromAgentId, fromAgentName, toAgentId ?? null, content, type, timestamp)

  const message = { id, fromAgentId, fromAgentName, toAgentId, content, type, timestamp }

  broadcast(req.params.officeId, { type: 'agent:message', message })

  res.status(201).json(message)
})
