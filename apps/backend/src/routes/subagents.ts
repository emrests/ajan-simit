import { Router } from 'express'
import {
  getSubagents,
  getSubagent,
  createSubagent,
  updateSubagent,
  deleteSubagent,
  previewSubagentMd,
  syncSubagentToProject,
  agentToSubagent,
} from '../agents/subagentManager'
import { db } from '../db/database'

export const subagentsRouter = Router()

// GET /api/subagents — Tüm subagent'ları listele
subagentsRouter.get('/subagents', (_req, res) => {
  try {
    res.json(getSubagents())
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/subagents/:id — Subagent detayı
subagentsRouter.get('/subagents/:id', (req, res) => {
  const sub = getSubagent(req.params.id)
  if (!sub) return res.status(404).json({ error: 'Subagent not found' }) as any
  res.json(sub)
})

// POST /api/subagents — Yeni subagent oluştur
subagentsRouter.post('/subagents', (req, res) => {
  const { name, description, prompt, model, maxTurns, allowedTools, disallowedTools, scope } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' }) as any

  try {
    const sub = createSubagent({ name, description, prompt, model, maxTurns, allowedTools, disallowedTools, scope })
    res.status(201).json(sub)
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

// PUT /api/subagents/:id — Subagent güncelle
subagentsRouter.put('/subagents/:id', (req, res) => {
  try {
    const sub = updateSubagent(req.params.id, req.body)
    res.json(sub)
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

// DELETE /api/subagents/:id — Subagent sil
subagentsRouter.delete('/subagents/:id', (req, res) => {
  try {
    deleteSubagent(req.params.id)
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/subagents/:id/preview — .md dosya önizleme
subagentsRouter.get('/subagents/:id/preview', (req, res) => {
  try {
    const md = previewSubagentMd(req.params.id)
    res.json({ content: md })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/subagents/:id/sync — Subagent dosyasını proje workDir'ine yaz
subagentsRouter.post('/subagents/:id/sync', (req, res) => {
  const { workDir } = req.body
  if (!workDir) return res.status(400).json({ error: 'workDir is required' }) as any

  try {
    const filePath = syncSubagentToProject(req.params.id, workDir)
    res.json({ success: true, filePath })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/agents/:agentId/to-subagent — Ajan profilini subagent'a dönüştür
subagentsRouter.post('/agents/:agentId/to-subagent', (req, res) => {
  try {
    const sub = agentToSubagent(req.params.agentId)
    res.status(201).json(sub)
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})
