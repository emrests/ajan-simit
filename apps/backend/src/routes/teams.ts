import { Router } from 'express'
import {
  createTeam,
  addTeammate,
  removeTeammate,
  startTeam,
  stopTeam,
  getProjectTeams,
  getTeam,
  deleteTeam,
} from '../agents/teamManager'

export const teamsRouter = Router()

// GET /api/projects/:projectId/teams — Proje takımlarını listele
teamsRouter.get('/projects/:projectId/teams', (req, res) => {
  try {
    const teams = getProjectTeams(req.params.projectId)
    res.json(teams)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/projects/:projectId/teams — Yeni takım oluştur
teamsRouter.post('/projects/:projectId/teams', (req, res) => {
  const { name, leadAgentId, maxTeammates } = req.body
  if (!name || !leadAgentId) return res.status(400).json({ error: 'name and leadAgentId are required' }) as any

  try {
    const team = createTeam(req.params.projectId, name, leadAgentId, maxTeammates)
    res.status(201).json(team)
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

// GET /api/teams/:id — Takım detayı
teamsRouter.get('/teams/:id', (req, res) => {
  const team = getTeam(req.params.id)
  if (!team) return res.status(404).json({ error: 'Team not found' }) as any
  res.json(team)
})

// DELETE /api/teams/:id — Takım sil
teamsRouter.delete('/teams/:id', (req, res) => {
  try {
    deleteTeam(req.params.id)
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/teams/:id/start — Takımı başlat
teamsRouter.post('/teams/:id/start', (req, res) => {
  try {
    const team = startTeam(req.params.id)
    res.json(team)
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

// POST /api/teams/:id/stop — Takımı durdur
teamsRouter.post('/teams/:id/stop', (req, res) => {
  try {
    stopTeam(req.params.id)
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/teams/:id/teammates — Takıma üye ekle
teamsRouter.post('/teams/:id/teammates', (req, res) => {
  const { agentId } = req.body
  if (!agentId) return res.status(400).json({ error: 'agentId is required' }) as any

  try {
    const teammate = addTeammate(req.params.id, agentId)
    res.status(201).json(teammate)
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

// DELETE /api/teams/:id/teammates/:agentId — Takımdan üye çıkar
teamsRouter.delete('/teams/:id/teammates/:agentId', (req, res) => {
  try {
    removeTeammate(req.params.id, req.params.agentId)
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})
