import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { spawnSync } from 'child_process'
import { db } from '../db/database'
import { startSession, buildContextForProject } from '../agents/processManager'

export const projectsRouter = Router()

function rowToProject(p: any, withTasks = true) {
  const project: any = {
    id: p.id,
    officeId: p.office_id,
    name: p.name,
    description: p.description,
    status: p.status,
    progress: p.progress,
    workDir: p.work_dir ?? '',
    approvalPolicy: p.approval_policy ?? 'auto',
    errorPolicy: p.error_policy ?? 'stop',
    workflowMode: p.workflow_mode ?? 'free',
    pmAgentId: p.pm_agent_id ?? undefined,
    contextMode: p.context_mode ?? 'full',
    claudeMd: p.claude_md ?? undefined,
    extraInstructions: p.extra_instructions ?? '',
    isolationMode: p.isolation_mode ?? 'shared',
    createdAt: p.created_at,
    tasks: [],
  }

  if (withTasks) {
    const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY sort_order ASC, created_at ASC').all(p.id) as any[]
    project.tasks = tasks.map(t => ({
      id: t.id,
      projectId: t.project_id,
      assignedAgentId: t.assigned_agent_id ?? undefined,
      description: t.description,
      status: t.status,
      dependsOnTaskId: t.depends_on_task_id ?? undefined,
      maxTurns: t.max_turns ?? 0,
      effortLevel: t.effort_level || undefined,
      outputSchema: t.output_schema || undefined,
      sortOrder: t.sort_order ?? 0,
      createdAt: t.created_at,
    }))
  }

  return project
}

function recalcProgress(projectId: string) {
  const tasks = db.prepare('SELECT status FROM tasks WHERE project_id = ?').all(projectId) as any[]
  if (tasks.length === 0) return 0
  const done = tasks.filter(t => t.status === 'done').length
  return Math.round((done / tasks.length) * 100)
}

// GET /api/offices/:officeId/projects
projectsRouter.get('/offices/:officeId/projects', (req, res) => {
  const rows = db.prepare('SELECT * FROM projects WHERE office_id = ? ORDER BY created_at DESC').all(req.params.officeId) as any[]
  res.json(rows.map(p => rowToProject(p)))
})

// POST /api/offices/:officeId/projects
projectsRouter.post('/offices/:officeId/projects', (req, res) => {
  const { name, description = '', workDir = '' } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })

  const officeExists = db.prepare('SELECT id FROM offices WHERE id = ?').get(req.params.officeId)
  if (!officeExists) return res.status(404).json({ error: 'Office not found' })

  const id = uuid()
  const createdAt = new Date().toISOString()
  db.prepare(
    'INSERT INTO projects (id, office_id, name, description, status, progress, work_dir, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.params.officeId, name, description, 'planning', 0, workDir, createdAt)

  res.status(201).json(rowToProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(id)))
})

// PUT /api/projects/:id
projectsRouter.put('/projects/:id', (req, res) => {
  const { name, description, status, workDir, approvalPolicy, errorPolicy, workflowMode, pmAgentId, contextMode, claudeMd, extraInstructions, isolationMode } = req.body
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Project not found' })

  db.prepare(
    `UPDATE projects SET
      name = COALESCE(?, name), description = COALESCE(?, description),
      status = COALESCE(?, status), work_dir = COALESCE(?, work_dir),
      approval_policy = COALESCE(?, approval_policy), error_policy = COALESCE(?, error_policy),
      workflow_mode = COALESCE(?, workflow_mode), pm_agent_id = COALESCE(?, pm_agent_id),
      context_mode = COALESCE(?, context_mode), claude_md = COALESCE(?, claude_md),
      extra_instructions = COALESCE(?, extra_instructions),
      isolation_mode = COALESCE(?, isolation_mode)
    WHERE id = ?`
  ).run(
    name ?? null, description ?? null, status ?? null, workDir ?? null,
    approvalPolicy ?? null, errorPolicy ?? null, workflowMode ?? null, pmAgentId ?? null,
    contextMode ?? null, claudeMd ?? null, extraInstructions ?? null, isolationMode ?? null,
    req.params.id
  )

  res.json(rowToProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id)))
})

// DELETE /api/projects/:id
projectsRouter.delete('/projects/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Project not found' })

  // Cascade: tasks FK ON DELETE CASCADE ile otomatik silinir
  const result = db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Project not found' })
  res.json({ success: true })
})

// POST /api/projects/:id/tasks
projectsRouter.post('/projects/:id/tasks', (req, res) => {
  const { description, assignedAgentId, dependsOnTaskId, maxTurns, effortLevel, outputSchema } = req.body
  if (!description) return res.status(400).json({ error: 'description is required' })

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any
  if (!project) return res.status(404).json({ error: 'Project not found' })

  const id = uuid()
  const createdAt = new Date().toISOString()
  const maxOrderRow = db.prepare('SELECT MAX(sort_order) as m FROM tasks WHERE project_id = ?').get(req.params.id) as any
  const sortOrder = (maxOrderRow?.m ?? -1) + 1

  db.prepare(
    'INSERT INTO tasks (id, project_id, assigned_agent_id, description, status, depends_on_task_id, max_turns, effort_level, output_schema, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.params.id, assignedAgentId ?? null, description, 'todo', dependsOnTaskId ?? null, maxTurns ?? 0, effortLevel ?? '', outputSchema ?? '', sortOrder, createdAt)

  res.status(201).json({
    id, projectId: req.params.id,
    assignedAgentId: assignedAgentId ?? undefined,
    description, status: 'todo',
    dependsOnTaskId: dependsOnTaskId ?? undefined,
    maxTurns: maxTurns ?? 0,
    effortLevel: effortLevel || undefined,
    outputSchema: outputSchema || undefined,
    sortOrder,
    createdAt,
  })
})

// PUT /api/tasks/:id
projectsRouter.put('/tasks/:id', (req, res) => {
  const { status, assignedAgentId, description, dependsOnTaskId, maxTurns, effortLevel, outputSchema } = req.body
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as any
  if (!task) return res.status(404).json({ error: 'Task not found' })

  db.prepare(
    `UPDATE tasks SET
      status = COALESCE(?, status),
      assigned_agent_id = COALESCE(?, assigned_agent_id),
      description = COALESCE(?, description),
      depends_on_task_id = COALESCE(?, depends_on_task_id),
      max_turns = COALESCE(?, max_turns),
      effort_level = COALESCE(?, effort_level),
      output_schema = COALESCE(?, output_schema)
    WHERE id = ?`
  ).run(status, assignedAgentId, description, dependsOnTaskId, maxTurns ?? null, effortLevel ?? null, outputSchema ?? null, req.params.id)

  const progress = recalcProgress(task.project_id)
  db.prepare('UPDATE projects SET progress = ? WHERE id = ?').run(progress, task.project_id)

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as any
  res.json({
    id: updated.id, projectId: updated.project_id,
    assignedAgentId: updated.assigned_agent_id ?? undefined,
    description: updated.description, status: updated.status,
    dependsOnTaskId: updated.depends_on_task_id ?? undefined,
    maxTurns: updated.max_turns ?? 0,
    effortLevel: updated.effort_level || undefined,
    outputSchema: updated.output_schema || undefined,
    sortOrder: updated.sort_order ?? 0,
    createdAt: updated.created_at,
  })
})

// DELETE /api/tasks/:id
projectsRouter.delete('/tasks/:id', (req, res) => {
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Task not found' })
  res.json({ success: true })
})

// PATCH /api/projects/:id/tasks/reorder — Görev sıralamasını değiştir
projectsRouter.patch('/projects/:id/tasks/reorder', (req, res) => {
  const { taskIds } = req.body as { taskIds: string[] }
  if (!Array.isArray(taskIds)) return res.status(400).json({ error: 'taskIds array required' })

  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })

  const update = db.prepare('UPDATE tasks SET sort_order = ? WHERE id = ? AND project_id = ?')
  const tx = db.transaction(() => {
    taskIds.forEach((id, index) => update.run(index, id, req.params.id))
  })
  tx()
  res.json({ success: true })
})

// POST /api/tasks/:id/run — Tek görevi başlat
projectsRouter.post('/tasks/:id/run', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as any
  if (!task) return res.status(404).json({ error: 'Task not found' }) as any
  if (!task.assigned_agent_id) return res.status(400).json({ error: 'Göreve ajan atanmamış' }) as any

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(task.project_id) as any
  if (!project?.work_dir) return res.status(400).json({ error: 'Proje klasörü tanımlı değil' }) as any

  // Faz 9 — contextMode'a göre bağlam oluştur
  const contextText = buildContextForProject(task.project_id, project.context_mode ?? 'full')
  const prompt = contextText
    ? `Proje: ${project.name}\nKlasör: ${project.work_dir}\n\nTamamlananlar:\n${contextText}\n\nSenin görevin:\n${task.description}`
    : `Proje: ${project.name}\nKlasör: ${project.work_dir}\n\nGörev:\n${task.description}`

  try {
    const result = startSession(task.assigned_agent_id, project.work_dir, prompt, task.id)
    db.prepare("UPDATE tasks SET status = 'in_progress' WHERE id = ?").run(task.id)
    res.json({ success: true, ...result })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/projects/:id/run — Tüm atanmış görevleri başlat
projectsRouter.post('/projects/:id/run', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any
  if (!project) return res.status(404).json({ error: 'Proje bulunamadı' }) as any
  if (!project.work_dir) return res.status(400).json({ error: 'Proje klasörü tanımlı değil' }) as any

  // Bekleyen ve ajana atanmış görevler (todo + takılı kalmış in_progress dahil)
  const pendingTasks = db.prepare(
    "SELECT * FROM tasks WHERE project_id = ? AND assigned_agent_id IS NOT NULL AND status != 'done' ORDER BY sort_order ASC, created_at ASC"
  ).all(req.params.id) as any[]

  if (pendingTasks.length === 0) {
    return res.json({ started: 0, message: 'Başlatılacak atanmış görev bulunamadı' })
  }

  // Faz 9 — contextMode'a göre bağlam oluştur
  const contextText = buildContextForProject(req.params.id, project.context_mode ?? 'full')

  const results: any[] = []
  const startedAgents = new Set<string>()

  for (const task of pendingTasks) {
    if (task.depends_on_task_id) {
      const dep = db.prepare('SELECT status FROM tasks WHERE id = ?').get(task.depends_on_task_id) as any
      if (!dep || dep.status !== 'done') continue
    }

    if (startedAgents.has(task.assigned_agent_id)) continue

    const prompt = contextText
      ? `Proje: ${project.name}\nKlasör: ${project.work_dir}\n\nTamamlananlar:\n${contextText}\n\nSenin görevin:\n${task.description}`
      : `Proje: ${project.name}\nKlasör: ${project.work_dir}\n\nGörev:\n${task.description}`

    try {
      const result = startSession(task.assigned_agent_id, project.work_dir, prompt, task.id)
      db.prepare("UPDATE tasks SET status = 'in_progress' WHERE id = ?").run(task.id)
      startedAgents.add(task.assigned_agent_id)
      results.push({ taskId: task.id, agentId: task.assigned_agent_id, success: true, ...result })
    } catch (e: any) {
      results.push({ taskId: task.id, agentId: task.assigned_agent_id, success: false, error: e.message })
    }
  }

  // Proje durumunu 'active' yap
  db.prepare("UPDATE projects SET status = 'active' WHERE id = ?").run(req.params.id)

  res.json({ started: results.filter(r => r.success).length, total: results.length, results })
})

// POST /api/projects/:id/plan — PM ajanı: Claude ile otomatik görev planı oluştur
projectsRouter.post('/projects/:id/plan', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any
  if (!project) return res.status(404).json({ error: 'Proje bulunamadı' }) as any

  const agents = db.prepare('SELECT id, name, role FROM agents WHERE office_id = ?')
    .all(project.office_id) as any[]

  if (agents.length === 0) return res.status(400).json({ error: 'Ofiste ajan bulunamadı' }) as any

  const agentList = agents.map(a => `- ${a.name} (Rol: ${a.role})`).join('\n')
  const { extraContext = '' } = req.body

  const planningPrompt = `Sen deneyimli bir proje yöneticisisin. Aşağıdaki proje için görev dağılımı yap.

Proje Adı: ${project.name}
Açıklama: ${project.description || '(açıklama yok)'}
Klasör: ${project.work_dir || '(belirtilmemiş)'}
${extraContext ? `Ek Bağlam: ${extraContext}` : ''}

Ekipteki Ajanlar:
${agentList}

GÖREVIN: Projeyi mantıklı görevlere böl ve her görevi uygun ajana ata. Bağımlılıkları belirt (hangi görev hangisi bitmeden başlamamalı).

Her göreve karmaşıklığına göre model önerisi, max tur limiti ve efor seviyesi belirle:
- Basit görevler (tek dosya, küçük değişiklik) → "claude-haiku-4-5-20251001", maxTurns: 5, effortLevel: "low"
- Orta görevler (birkaç dosya, entegrasyon) → "claude-sonnet-4-6", maxTurns: 15, effortLevel: "medium"
- Karmaşık görevler (mimari, çok dosyalı, araştırma) → "claude-opus-4-6", maxTurns: 30, effortLevel: "high"

SADECE aşağıdaki JSON formatında yanıt ver, başka hiçbir şey yazma:
{
  "tasks": [
    {
      "description": "Görev açıklaması",
      "agentName": "Ajan adı buraya",
      "dependsOnIndex": null,
      "suggestedModel": "claude-sonnet-4-6",
      "maxTurns": 15,
      "effortLevel": "medium"
    }
  ]
}

dependsOnIndex: bu görevin bağımlı olduğu görevin tasks dizisindeki indeksi (0 tabanlı), yoksa null.`

  try {
    // Prompt'u argüman yerine stdin üzerinden geçir.
    // Windows'ta shell=true ile -p "..." kullanmak { } " gibi karakterleri bozar.
    const result = spawnSync('claude', ['--print', '--output-format', 'json'], {
      input: planningPrompt,   // stdin'e yaz
      timeout: 60000,
      encoding: 'utf8',
      shell: true,
    })

    if (result.status !== 0) {
      const errMsg = result.stderr?.toString() || 'Claude çalıştırılamadı'
      return res.status(500).json({ error: errMsg }) as any
    }

    // Claude CLI bazen --output-format json ile sarılı döner, bazen düz metin
    let responseText: string
    try {
      const output = JSON.parse(result.stdout)
      responseText = output.result ?? output.content ?? result.stdout
    } catch {
      responseText = result.stdout ?? ''
    }

    // JSON bloğunu çıkar
    const jsonMatch = responseText.match(/```json\s*([\s\S]+?)\s*```/) ||
                      responseText.match(/(\{[\s\S]+\})/)
    if (!jsonMatch) return res.status(500).json({ error: 'Claude geçerli JSON döndürmedi', raw: responseText.slice(0, 500) }) as any

    const plan = JSON.parse(jsonMatch[1])
    const tasks: any[] = plan.tasks ?? []

    // Ajan adına göre ID bul
    const agentByName = (name: string) =>
      agents.find(a => a.name.toLowerCase() === name.toLowerCase())

    const createdTasks: any[] = []
    for (const t of tasks) {
      const assignedAgent = agentByName(t.agentName)
      const dependsOnTaskId = (t.dependsOnIndex != null && createdTasks[t.dependsOnIndex])
        ? createdTasks[t.dependsOnIndex].id
        : null

      const id = uuid()
      const createdAt = new Date().toISOString()
      const taskMaxTurns = t.maxTurns ?? 0
      const taskEffort = t.effortLevel ?? ''
      db.prepare(
        'INSERT INTO tasks (id, project_id, assigned_agent_id, description, status, depends_on_task_id, max_turns, effort_level, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(id, project.id, assignedAgent?.id ?? null, t.description, 'todo', dependsOnTaskId, taskMaxTurns, taskEffort, createdAt)

      createdTasks.push({
        id, projectId: project.id,
        assignedAgentId: assignedAgent?.id ?? undefined,
        description: t.description,
        status: 'todo',
        dependsOnTaskId: dependsOnTaskId ?? undefined,
        maxTurns: taskMaxTurns,
        effortLevel: taskEffort || undefined,
        suggestedModel: t.suggestedModel ?? undefined,
        createdAt,
      })
    }

    res.json({ created: createdTasks.length, tasks: createdTasks })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ============================================================
// Faz 7 — Onay İstekleri (Approval Requests)
// ============================================================

// GET /api/projects/:id/approvals — Proje onay isteklerini listele
projectsRouter.get('/projects/:id/approvals', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM approval_requests WHERE project_id = ? ORDER BY created_at DESC'
  ).all(req.params.id) as any[]

  res.json(rows.map((r: any) => ({
    id: r.id,
    projectId: r.project_id,
    taskId: r.task_id ?? undefined,
    fromAgentId: r.from_agent_id,
    fromAgentName: r.from_agent_name,
    description: r.description,
    status: r.status,
    respondedBy: r.responded_by ?? undefined,
    responseNote: r.response_note ?? undefined,
    createdAt: r.created_at,
    respondedAt: r.responded_at ?? undefined,
  })))
})

// POST /api/approvals/:id/respond — Onay isteğini yanıtla (approve/reject)
projectsRouter.post('/approvals/:id/respond', (req, res) => {
  const { status, responseNote, respondedBy } = req.body
  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be approved or rejected' })
  }

  const approval = db.prepare('SELECT * FROM approval_requests WHERE id = ?').get(req.params.id) as any
  if (!approval) return res.status(404).json({ error: 'Approval request not found' }) as any
  if (approval.status !== 'pending') return res.status(400).json({ error: 'Zaten yanıtlanmış' }) as any

  const respondedAt = new Date().toISOString()
  db.prepare(
    'UPDATE approval_requests SET status = ?, responded_by = ?, response_note = ?, responded_at = ? WHERE id = ?'
  ).run(status, respondedBy ?? 'user', responseNote ?? null, respondedAt, req.params.id)

  // Ajanı bilgilendir
  const { broadcast } = require('../ws/server')
  const { saveAndBroadcastMessage } = require('../watcher/jsonlWatcher')
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(approval.from_agent_id) as any
  const project = db.prepare('SELECT office_id FROM projects WHERE id = ?').get(approval.project_id) as any

  if (agent && project) {
    const emoji = status === 'approved' ? '✅' : '❌'
    saveAndBroadcastMessage(
      project.office_id,
      approval.from_agent_id,
      'Sistem',
      `${emoji} Onay yanıtı: ${approval.description.slice(0, 60)} → ${status === 'approved' ? 'ONAYLANDI' : 'REDDEDİLDİ'}${responseNote ? ': ' + responseNote : ''}`,
      'approval-response'
    )

    // Onaylanan ajanın waiting durumundan çıkmasını sağla
    if (status === 'approved') {
      db.prepare('UPDATE agents SET status = ? WHERE id = ? AND status = ?').run('thinking', approval.from_agent_id, 'waiting')
      broadcast(project.office_id, {
        type: 'agent:status',
        agentId: approval.from_agent_id,
        status: 'thinking',
      })
    }

    broadcast(project.office_id, {
      type: 'approval:response',
      approval: {
        id: req.params.id,
        projectId: approval.project_id,
        fromAgentId: approval.from_agent_id,
        fromAgentName: approval.from_agent_name,
        description: approval.description,
        status,
        respondedBy: respondedBy ?? 'user',
        responseNote: responseNote ?? undefined,
        createdAt: approval.created_at,
        respondedAt,
      },
    })
  }

  res.json({ success: true })
})

// POST /api/projects/:id/approvals — Onay isteği oluştur (ajan veya sistem tarafından)
projectsRouter.post('/projects/:id/approvals', (req, res) => {
  const { fromAgentId, description, taskId } = req.body
  if (!fromAgentId || !description) {
    return res.status(400).json({ error: 'fromAgentId and description are required' })
  }

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any
  if (!project) return res.status(404).json({ error: 'Project not found' }) as any

  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(fromAgentId) as any
  if (!agent) return res.status(404).json({ error: 'Agent not found' }) as any

  const { broadcast } = require('../ws/server')
  const { saveAndBroadcastMessage } = require('../watcher/jsonlWatcher')

  // Onay politikasını kontrol et
  if (project.approval_policy === 'auto') {
    saveAndBroadcastMessage(
      project.office_id, fromAgentId, 'Sistem',
      `⚡ Otomatik onaylandı: ${description.slice(0, 80)}`,
      'approval-response'
    )
    return res.json({ success: true, autoApproved: true })
  }

  const id = uuid()
  const createdAt = new Date().toISOString()
  db.prepare(
    'INSERT INTO approval_requests (id, project_id, task_id, from_agent_id, from_agent_name, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.params.id, taskId ?? null, fromAgentId, agent.name, description, 'pending', createdAt)

  // Ajanı waiting durumuna geçir
  db.prepare('UPDATE agents SET status = ?, current_task = ? WHERE id = ?')
    .run('waiting', `⏳ Onay bekliyor: ${description.slice(0, 60)}`, fromAgentId)
  broadcast(project.office_id, {
    type: 'agent:status',
    agentId: fromAgentId,
    status: 'waiting',
    currentTask: `⏳ Onay bekliyor: ${description.slice(0, 60)}`,
  })

  const approvalData = {
    id, projectId: req.params.id, taskId: taskId ?? undefined,
    fromAgentId, fromAgentName: agent.name, description,
    status: 'pending' as const, createdAt,
  }

  saveAndBroadcastMessage(
    project.office_id, fromAgentId, agent.name,
    `🔔 Onay isteği: ${description.slice(0, 80)}`,
    'approval-request'
  )

  broadcast(project.office_id, { type: 'approval:request', approval: approvalData })

  // PM'e sor politikasıysa — PM ajanına Claude ile değerlendirt
  if (project.approval_policy === 'ask-pm' && project.pm_agent_id) {
    const { pmEvaluateApproval } = require('../agents/processManager')
    pmEvaluateApproval(project.office_id, project, project.pm_agent_id, approvalData)
  }

  res.status(201).json(approvalData)
})
