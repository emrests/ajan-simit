import { Router } from 'express'
import { db } from '../db/database'
import {
  createWorktree,
  deleteWorktree,
  mergeWorktree,
  getProjectWorktrees,
  refreshWorktreeStatus,
  isGitRepo,
} from '../agents/worktreeManager'

export const worktreesRouter = Router()

// GET /api/projects/:projectId/worktrees — Projenin worktree'lerini listele
worktreesRouter.get('/projects/:projectId/worktrees', (req, res) => {
  try {
    const worktrees = getProjectWorktrees(req.params.projectId)
    res.json(worktrees)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/projects/:projectId/worktrees — Yeni worktree oluştur
worktreesRouter.post('/projects/:projectId/worktrees', (req, res) => {
  const { agentId, taskId } = req.body
  if (!agentId) return res.status(400).json({ error: 'agentId is required' }) as any

  try {
    const result = createWorktree(req.params.projectId, agentId, taskId)
    res.status(201).json(result)
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

// POST /api/worktrees/:id/merge — Worktree'yi ana branch'e merge et
worktreesRouter.post('/worktrees/:id/merge', (req, res) => {
  try {
    const result = mergeWorktree(req.params.id)
    res.json(result)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/worktrees/:id/refresh — Worktree durumunu yenile
worktreesRouter.post('/worktrees/:id/refresh', (req, res) => {
  try {
    refreshWorktreeStatus(req.params.id)
    const wt = db.prepare('SELECT * FROM worktrees WHERE id = ?').get(req.params.id) as any
    if (!wt) return res.status(404).json({ error: 'Worktree not found' }) as any
    res.json({
      id: wt.id,
      projectId: wt.project_id,
      agentId: wt.agent_id,
      agentName: wt.agent_name,
      branch: wt.branch,
      worktreePath: wt.worktree_path,
      status: wt.status,
      changedFiles: wt.changed_files,
      aheadBy: wt.ahead_by,
      lastActivity: wt.last_activity,
      mergedAt: wt.merged_at,
      createdAt: wt.created_at,
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/worktrees/:id — Worktree'yi sil
worktreesRouter.delete('/worktrees/:id', (req, res) => {
  try {
    const result = deleteWorktree(req.params.id)
    res.json(result)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/projects/:projectId/git-status — Projenin git repo durumunu kontrol et
worktreesRouter.get('/projects/:projectId/git-status', (req, res) => {
  const project = db.prepare('SELECT work_dir FROM projects WHERE id = ?').get(req.params.projectId) as any
  if (!project) return res.status(404).json({ error: 'Project not found' }) as any
  if (!project.work_dir) return res.json({ isGitRepo: false, message: 'workDir not set' })

  res.json({
    isGitRepo: isGitRepo(project.work_dir),
    workDir: project.work_dir,
  })
})
