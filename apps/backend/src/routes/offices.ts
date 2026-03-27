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
    workDir: office.work_dir ?? '',
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
      trainingProfileId: a.training_profile_id || undefined,
      isPm: !!a.is_pm,
      workDir: a.work_dir || '',
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
  const { name, description, theme, workDir } = req.body
  const existing = db.prepare('SELECT id FROM offices WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Office not found' })

  db.prepare(
    'UPDATE offices SET name = COALESCE(?, name), description = COALESCE(?, description), theme = COALESCE(?, theme), work_dir = COALESCE(?, work_dir) WHERE id = ?'
  ).run(name, description, theme, workDir !== undefined ? workDir : null, req.params.id)

  res.json(getOfficeWithRelations(req.params.id))
})

// DELETE /api/offices/:id
officesRouter.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM offices WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Office not found' })
  res.json({ success: true })
})

// ─── Export / Import ───

// GET /api/offices/:id/export — Ofisi tüm ilişkili verileriyle JSON olarak dışa aktar
officesRouter.get('/:id/export', (req, res) => {
  const office = db.prepare('SELECT * FROM offices WHERE id = ?').get(req.params.id) as any
  if (!office) return res.status(404).json({ error: 'Office not found' })

  const agents = db.prepare('SELECT * FROM agents WHERE office_id = ?').all(req.params.id) as any[]
  const projects = db.prepare('SELECT * FROM projects WHERE office_id = ?').all(req.params.id) as any[]

  // Ajan verilerini zenginleştir
  const exportAgents = agents.map(a => {
    // Skills
    const skillRows = db.prepare(`
      SELECT s.* FROM skills s
      JOIN agent_skills ask ON ask.skill_id = s.id
      WHERE ask.agent_id = ?
    `).all(a.id) as any[]

    // MCP Servers
    const mcpRows = db.prepare(`
      SELECT m.* FROM mcp_servers m
      JOIN agent_mcp_servers ams ON ams.mcp_server_id = m.id
      WHERE ams.agent_id = ?
    `).all(a.id) as any[]

    // Training profile
    let trainingProfile = null
    if (a.training_profile_id) {
      const tp = db.prepare('SELECT * FROM training_profiles WHERE id = ?').get(a.training_profile_id) as any
      if (tp) {
        trainingProfile = {
          _ref: tp.id,
          name: tp.name,
          description: tp.description || '',
          content: tp.content || '',
          mode: tp.mode || 'technology',
          source: tp.source || '',
          userPrompt: tp.user_prompt || '',
        }
      }
    }

    // Subagent
    let subagent = null
    if (a.subagent_id) {
      const sa = db.prepare('SELECT * FROM subagents WHERE id = ?').get(a.subagent_id) as any
      if (sa) {
        subagent = {
          name: sa.name,
          description: sa.description || '',
          prompt: sa.prompt || '',
          model: sa.model || '',
          maxTurns: sa.max_turns ?? 0,
          allowedTools: parseJsonField<string[]>(sa.allowed_tools, []),
          disallowedTools: parseJsonField<string[]>(sa.disallowed_tools, []),
          scope: sa.scope || 'project',
        }
      }
    }

    return {
      _ref: a.id,
      name: a.name,
      role: a.role,
      animal: a.animal || 'cat',
      systemPrompt: a.system_prompt || '',
      model: a.model || '',
      maxTurns: a.max_turns ?? 0,
      effortLevel: a.effort_level || '',
      allowedTools: parseJsonField<string[]>(a.allowed_tools, []),
      disallowedTools: parseJsonField<string[]>(a.disallowed_tools, []),
      environmentVars: parseJsonField<Record<string, string>>(a.environment_vars, {}),
      appendSystemPrompt: a.append_system_prompt || '',
      systemPromptFile: a.system_prompt_file || '',
      outputSchema: a.output_schema || '',
      deskPosition: { x: a.desk_x ?? 0, y: a.desk_y ?? 0 },
      skills: skillRows.map(s => ({
        name: s.name,
        description: s.description || '',
        content: s.content || '',
        source: s.source || 'manual',
        category: s.category || 'general',
      })),
      mcpServers: mcpRows.map(m => ({
        name: m.name,
        description: m.description || '',
        transport: m.transport || 'stdio',
        command: m.command || '',
        url: m.url || '',
        args: parseJsonField<string[]>(m.args, []),
        env: parseJsonField<Record<string, string>>(m.env, {}),
        scope: m.scope || 'user',
        enabled: m.enabled ?? 1,
      })),
      trainingProfile,
      subagent,
    }
  })

  // Proje verilerini topla
  const exportProjects = projects.map(p => {
    const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY sort_order ASC, created_at ASC').all(p.id) as any[]
    const hooks = db.prepare('SELECT * FROM hooks WHERE project_id = ?').all(p.id) as any[]

    return {
      _ref: p.id,
      name: p.name,
      description: p.description || '',
      workDir: p.work_dir || '',
      approvalPolicy: p.approval_policy || 'auto',
      errorPolicy: p.error_policy || 'stop',
      workflowMode: p.workflow_mode || 'free',
      pmAgentRef: p.pm_agent_id || null,
      contextMode: p.context_mode || 'full',
      claudeMd: p.claude_md || '',
      extraInstructions: p.extra_instructions || '',
      isolationMode: p.isolation_mode || 'shared',
      tasks: tasks.map(t => ({
        _ref: t.id,
        description: t.description,
        assignedAgentRef: t.assigned_agent_id || null,
        dependsOnTaskRef: t.depends_on_task_id || null,
        maxTurns: t.max_turns ?? 0,
        effortLevel: t.effort_level || '',
        outputSchema: t.output_schema || '',
        sortOrder: t.sort_order ?? 0,
      })),
      hooks: hooks.map(h => ({
        event: h.event,
        matcher: h.matcher || '',
        type: h.type || 'command',
        command: h.command || '',
        url: h.url || '',
        prompt: h.prompt || '',
        enabled: h.enabled ?? 1,
      })),
    }
  })

  res.json({
    _type: 'smith-office',
    _version: 1,
    exportedAt: new Date().toISOString(),
    office: {
      name: office.name,
      description: office.description || '',
      theme: office.theme || 'light',
      workDir: office.work_dir || '',
    },
    agents: exportAgents,
    projects: exportProjects,
  })
})

// POST /api/offices/import — JSON'dan ofis + ajanlar + ilişkili verileri içe aktar
officesRouter.post('/import', (req, res) => {
  const data = req.body
  if (!data || data._type !== 'smith-office') {
    return res.status(400).json({ error: 'Geçersiz format. _type: "smith-office" bekleniyor.' }) as any
  }

  try {
    const now = new Date().toISOString()
    const agentIdMap = new Map<string, string>()
    const taskIdMap = new Map<string, string>()
    const projectIdMap = new Map<string, string>()

    const tx = db.transaction(() => {
      // 1. Ofis oluştur
      const officeId = uuid()
      const o = data.office || {}
      db.prepare('INSERT INTO offices (id, name, description, theme, work_dir, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(officeId, o.name || 'Imported Office', o.description || '', o.theme || 'light', o.workDir || '', now)

      // 2. Ajanları oluştur
      for (const agent of (data.agents || [])) {
        const newAgentId = uuid()
        if (agent._ref) agentIdMap.set(agent._ref, newAgentId)

        // Training profile — her ajan için kopyala
        let trainingProfileId: string | null = null
        if (agent.trainingProfile) {
          const tp = agent.trainingProfile
          trainingProfileId = uuid()
          db.prepare(`
            INSERT INTO training_profiles (id, name, description, content, mode, source, user_prompt, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'done', ?)
          `).run(trainingProfileId, tp.name, tp.description || '', tp.content || '', tp.mode || 'technology', tp.source || '', tp.userPrompt || '', now)
        }

        // Subagent — name'e göre dedup
        let subagentId: string | null = null
        if (agent.subagent) {
          const sa = agent.subagent
          const existing = db.prepare('SELECT id FROM subagents WHERE name = ?').get(sa.name) as any
          if (existing) {
            subagentId = existing.id
          } else {
            subagentId = uuid()
            db.prepare(`
              INSERT INTO subagents (id, name, description, prompt, model, max_turns, allowed_tools, disallowed_tools, scope, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(subagentId, sa.name, sa.description || '', sa.prompt || '', sa.model || '', sa.maxTurns ?? 0,
              JSON.stringify(sa.allowedTools || []), JSON.stringify(sa.disallowedTools || []), sa.scope || 'project', now)
          }
        }

        db.prepare(`
          INSERT INTO agents (id, office_id, name, role, animal, system_prompt, model, max_turns, effort_level,
            allowed_tools, disallowed_tools, environment_vars, append_system_prompt, system_prompt_file,
            output_schema, subagent_id, training_profile_id, desk_x, desk_y, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'idle', ?)
        `).run(
          newAgentId, officeId,
          agent.name || 'Agent', agent.role || 'Genel', agent.animal || 'cat',
          agent.systemPrompt || '', agent.model || '', agent.maxTurns ?? 0, agent.effortLevel || '',
          JSON.stringify(agent.allowedTools || []), JSON.stringify(agent.disallowedTools || []),
          JSON.stringify(agent.environmentVars || {}),
          agent.appendSystemPrompt || '', agent.systemPromptFile || '', agent.outputSchema || '',
          subagentId, trainingProfileId,
          agent.deskPosition?.x ?? 0, agent.deskPosition?.y ?? 0, now
        )

        // Skills — name'e göre dedup, junction kur
        for (const skill of (agent.skills || [])) {
          let skillRow = db.prepare('SELECT id FROM skills WHERE name = ?').get(skill.name) as any
          if (!skillRow) {
            const skillId = uuid()
            db.prepare('INSERT INTO skills (id, name, description, content, source, category, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
              .run(skillId, skill.name, skill.description || '', skill.content || '', skill.source || 'manual', skill.category || 'general', now)
            skillRow = { id: skillId }
          }
          db.prepare('INSERT OR IGNORE INTO agent_skills (agent_id, skill_id) VALUES (?, ?)').run(newAgentId, skillRow.id)
        }

        // MCP Servers — name'e göre dedup, junction kur
        for (const mcp of (agent.mcpServers || [])) {
          let mcpRow = db.prepare('SELECT id FROM mcp_servers WHERE name = ?').get(mcp.name) as any
          if (!mcpRow) {
            const mcpId = uuid()
            db.prepare(`
              INSERT INTO mcp_servers (id, name, description, transport, command, url, args, env, scope, enabled, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(mcpId, mcp.name, mcp.description || '', mcp.transport || 'stdio', mcp.command || '', mcp.url || '',
              JSON.stringify(mcp.args || []), JSON.stringify(mcp.env || {}), mcp.scope || 'user', mcp.enabled ?? 1, now)
            mcpRow = { id: mcpId }
          }
          db.prepare('INSERT OR IGNORE INTO agent_mcp_servers (agent_id, mcp_server_id) VALUES (?, ?)').run(newAgentId, mcpRow.id)
        }
      }

      // 3. Projeleri oluştur
      for (const project of (data.projects || [])) {
        const newProjectId = uuid()
        if (project._ref) projectIdMap.set(project._ref, newProjectId)

        const pmAgentId = project.pmAgentRef ? (agentIdMap.get(project.pmAgentRef) || null) : null

        db.prepare(`
          INSERT INTO projects (id, office_id, name, description, status, progress, work_dir,
            approval_policy, error_policy, workflow_mode, pm_agent_id, context_mode,
            claude_md, extra_instructions, isolation_mode, created_at)
          VALUES (?, ?, ?, ?, 'planning', 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          newProjectId, officeId,
          project.name || 'Project', project.description || '', project.workDir || '',
          project.approvalPolicy || 'auto', project.errorPolicy || 'stop', project.workflowMode || 'free',
          pmAgentId, project.contextMode || 'full',
          project.claudeMd || '', project.extraInstructions || '', project.isolationMode || 'shared', now
        )

        // Görevler — iki geçiş: önce oluştur, sonra dependsOnTaskId remap
        for (const task of (project.tasks || [])) {
          const newTaskId = uuid()
          if (task._ref) taskIdMap.set(task._ref, newTaskId)

          const assignedAgentId = task.assignedAgentRef ? (agentIdMap.get(task.assignedAgentRef) || null) : null

          db.prepare(`
            INSERT INTO tasks (id, project_id, assigned_agent_id, description, status, depends_on_task_id,
              max_turns, effort_level, output_schema, sort_order, created_at)
            VALUES (?, ?, ?, ?, 'todo', NULL, ?, ?, ?, ?, ?)
          `).run(
            newTaskId, newProjectId, assignedAgentId,
            task.description || '', task.maxTurns ?? 0, task.effortLevel || '',
            task.outputSchema || '', task.sortOrder ?? 0, now
          )
        }

        // dependsOnTaskId remap (ikinci geçiş)
        for (const task of (project.tasks || [])) {
          if (task.dependsOnTaskRef && taskIdMap.has(task.dependsOnTaskRef)) {
            const newTaskId = taskIdMap.get(task._ref)
            const newDepId = taskIdMap.get(task.dependsOnTaskRef)
            if (newTaskId && newDepId) {
              db.prepare('UPDATE tasks SET depends_on_task_id = ? WHERE id = ?').run(newDepId, newTaskId)
            }
          }
        }

        // Hooks
        for (const hook of (project.hooks || [])) {
          db.prepare(`
            INSERT INTO hooks (id, project_id, event, matcher, type, command, url, prompt, enabled, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(uuid(), newProjectId, hook.event, hook.matcher || '', hook.type || 'command',
            hook.command || '', hook.url || '', hook.prompt || '', hook.enabled ?? 1, now)
        }
      }

      return officeId
    })

    const officeId = tx()
    const result = getOfficeWithRelations(officeId)
    res.status(201).json(result)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})
