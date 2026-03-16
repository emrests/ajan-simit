import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { db } from '../db/database'

export const officesRouter = Router()

function parseJsonField<T>(val: any, fallback: T): T {
  if (!val || val === '') return fallback
  try { return JSON.parse(val) } catch { return fallback }
}

function getOfficeWithRelations(id: string) {
  const office = db.prepare('SELECT * FROM offices WHERE id = ?').get(id) as any
  if (!office) return null

  const agents = db.prepare('SELECT * FROM agents WHERE office_id = ?').all(id) as any[]
  const projects = db.prepare('SELECT * FROM projects WHERE office_id = ?').all(id) as any[]

  for (const project of projects) {
    project.tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(project.id)
  }

  return {
    id: office.id,
    name: office.name,
    description: office.description,
    theme: office.theme,
    createdAt: office.created_at,
    agents: agents.map(a => ({
      id: a.id,
      officeId: a.office_id,
      name: a.name,
      role: a.role,
      animal: a.animal,
      systemPrompt: a.system_prompt,
      model: a.model ?? '',
      maxTurns: a.max_turns ?? 0,
      effortLevel: a.effort_level || undefined,
      allowedTools: parseJsonField<string[]>(a.allowed_tools, []),
      disallowedTools: parseJsonField<string[]>(a.disallowed_tools, []),
      environmentVars: parseJsonField<Record<string, string>>(a.environment_vars, {}),
      appendSystemPrompt: a.append_system_prompt || '',
      systemPromptFile: a.system_prompt_file || '',
      outputSchema: a.output_schema || '',
      subagentId: a.subagent_id || undefined,
      deskPosition: { x: a.desk_x, y: a.desk_y },
      status: a.status,
      currentTask: a.current_task,
      sessionId: a.session_id,
      watchPath: a.watch_path ?? undefined,
      sessionPid: a.session_pid ?? undefined,
      createdAt: a.created_at,
    })),
    projects: projects.map(p => ({
      id: p.id,
      officeId: p.office_id,
      name: p.name,
      description: p.description,
      status: p.status,
      progress: p.progress,
      workDir: p.work_dir ?? '',
      createdAt: p.created_at,
      tasks: p.tasks.map((t: any) => ({
        id: t.id,
        projectId: t.project_id,
        assignedAgentId: t.assigned_agent_id,
        description: t.description,
        status: t.status,
        createdAt: t.created_at,
      })),
    })),
  }
}

// GET /api/offices
officesRouter.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM offices ORDER BY created_at DESC').all() as any[]
  const offices = rows.map(o => getOfficeWithRelations(o.id))
  res.json(offices)
})

// GET /api/offices/:id
officesRouter.get('/:id', (req, res) => {
  const office = getOfficeWithRelations(req.params.id)
  if (!office) return res.status(404).json({ error: 'Office not found' })
  res.json(office)
})

// POST /api/offices
officesRouter.post('/', (req, res) => {
  const { name, description = '', theme = 'light' } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })

  const id = uuid()
  const createdAt = new Date().toISOString()
  db.prepare(
    'INSERT INTO offices (id, name, description, theme, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name, description, theme, createdAt)

  res.status(201).json(getOfficeWithRelations(id))
})

// PUT /api/offices/:id
officesRouter.put('/:id', (req, res) => {
  const { name, description, theme } = req.body
  const existing = db.prepare('SELECT id FROM offices WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Office not found' })

  db.prepare(
    'UPDATE offices SET name = COALESCE(?, name), description = COALESCE(?, description), theme = COALESCE(?, theme) WHERE id = ?'
  ).run(name, description, theme, req.params.id)

  res.json(getOfficeWithRelations(req.params.id))
})

// DELETE /api/offices/:id
officesRouter.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM offices WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Office not found' })
  res.json({ success: true })
})
