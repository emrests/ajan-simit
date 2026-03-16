import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { db } from '../db/database'
import { broadcast } from '../ws/server'

export const agentsRouter = Router()

function parseJsonField<T>(val: any, fallback: T): T {
  if (!val || val === '') return fallback
  try { return JSON.parse(val) } catch { return fallback }
}

function rowToAgent(a: any) {
  return {
    id: a.id,
    officeId: a.office_id,
    name: a.name,
    role: a.role,
    animal: a.animal,
    systemPrompt: a.system_prompt,
    model: a.model ?? '',
    maxTurns: a.max_turns ?? 0,
    // Faz 11
    effortLevel: a.effort_level || undefined,
    allowedTools: parseJsonField<string[]>(a.allowed_tools, []),
    disallowedTools: parseJsonField<string[]>(a.disallowed_tools, []),
    environmentVars: parseJsonField<Record<string, string>>(a.environment_vars, {}),
    appendSystemPrompt: a.append_system_prompt || '',
    systemPromptFile: a.system_prompt_file || '',
    outputSchema: a.output_schema || '',
    subagentId: a.subagent_id || undefined,
    trainingProfileId: a.training_profile_id || undefined,
    deskPosition: { x: a.desk_x, y: a.desk_y },
    status: a.status,
    currentTask: a.current_task,
    sessionId: a.session_id,
    watchPath: a.watch_path ?? undefined,
    sessionPid: a.session_pid ?? undefined,
    createdAt: a.created_at,
  }
}

// GET /api/offices/:officeId/agents
agentsRouter.get('/offices/:officeId/agents', (req, res) => {
  const agents = db
    .prepare('SELECT * FROM agents WHERE office_id = ? ORDER BY created_at ASC')
    .all(req.params.officeId) as any[]
  res.json(agents.map(rowToAgent))
})

// POST /api/offices/:officeId/agents
agentsRouter.post('/offices/:officeId/agents', (req, res) => {
  const { officeId } = req.params
  const {
    name,
    role = 'Genel',
    animal = 'cat',
    systemPrompt = '',
    model = '',
    maxTurns = 0,
    deskPosition = { x: 0, y: 0 },
    // Faz 11
    effortLevel = '',
    allowedTools = [],
    disallowedTools = [],
    environmentVars = {},
    appendSystemPrompt = '',
    systemPromptFile = '',
    outputSchema = '',
    subagentId = '',
  } = req.body

  if (!name) return res.status(400).json({ error: 'name is required' }) as any

  const officeExists = db.prepare('SELECT id FROM offices WHERE id = ?').get(officeId)
  if (!officeExists) return res.status(404).json({ error: 'Office not found' }) as any

  const id = uuid()
  const createdAt = new Date().toISOString()

  db.prepare(`
    INSERT INTO agents (id, office_id, name, role, animal, system_prompt, model, max_turns,
      effort_level, allowed_tools, disallowed_tools, environment_vars, append_system_prompt, system_prompt_file, output_schema, subagent_id,
      desk_x, desk_y, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'idle', ?)
  `).run(
    id, officeId, name, role, animal, systemPrompt, model, maxTurns,
    effortLevel,
    JSON.stringify(allowedTools),
    JSON.stringify(disallowedTools),
    JSON.stringify(environmentVars),
    appendSystemPrompt,
    systemPromptFile,
    outputSchema,
    subagentId,
    deskPosition.x, deskPosition.y, createdAt
  )

  const agent = rowToAgent(db.prepare('SELECT * FROM agents WHERE id = ?').get(id))
  res.status(201).json(agent)
})

// PUT /api/agents/:id
agentsRouter.put('/agents/:id', (req, res) => {
  const {
    name, role, animal, systemPrompt, model, maxTurns, deskPosition, status, currentTask,
    // Faz 11
    effortLevel, allowedTools, disallowedTools, environmentVars, appendSystemPrompt, systemPromptFile, outputSchema,
    subagentId,
  } = req.body
  const existing = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id) as any
  if (!existing) return res.status(404).json({ error: 'Agent not found' }) as any

  db.prepare(`
    UPDATE agents SET
      name = COALESCE(?, name),
      role = COALESCE(?, role),
      animal = COALESCE(?, animal),
      system_prompt = COALESCE(?, system_prompt),
      model = COALESCE(?, model),
      max_turns = COALESCE(?, max_turns),
      effort_level = COALESCE(?, effort_level),
      allowed_tools = COALESCE(?, allowed_tools),
      disallowed_tools = COALESCE(?, disallowed_tools),
      environment_vars = COALESCE(?, environment_vars),
      append_system_prompt = COALESCE(?, append_system_prompt),
      system_prompt_file = COALESCE(?, system_prompt_file),
      output_schema = COALESCE(?, output_schema),
      subagent_id = COALESCE(?, subagent_id),
      desk_x = COALESCE(?, desk_x),
      desk_y = COALESCE(?, desk_y),
      status = COALESCE(?, status),
      current_task = ?
    WHERE id = ?
  `).run(
    name ?? null, role ?? null, animal ?? null, systemPrompt ?? null,
    model ?? null, maxTurns !== undefined ? maxTurns : null,
    effortLevel ?? null,
    allowedTools !== undefined ? JSON.stringify(allowedTools) : null,
    disallowedTools !== undefined ? JSON.stringify(disallowedTools) : null,
    environmentVars !== undefined ? JSON.stringify(environmentVars) : null,
    appendSystemPrompt ?? null,
    systemPromptFile ?? null,
    outputSchema ?? null,
    subagentId !== undefined ? subagentId : null,
    deskPosition?.x ?? null, deskPosition?.y ?? null,
    status ?? null, currentTask !== undefined ? currentTask : existing.current_task,
    req.params.id
  )

  const agent = rowToAgent(db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id))

  // WebSocket broadcast
  broadcast(existing.office_id, {
    type: 'agent:status',
    agentId: agent.id,
    status: agent.status,
    currentTask: agent.currentTask,
  })

  res.json(agent)
})

// DELETE /api/agents/:id
agentsRouter.delete('/agents/:id', (req, res) => {
  const result = db.prepare('DELETE FROM agents WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Agent not found' }) as any
  res.json({ success: true })
})
