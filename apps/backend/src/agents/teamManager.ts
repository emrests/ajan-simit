import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { v4 as uuid } from 'uuid'
import { db } from '../db/database'
import { broadcast } from '../ws/server'
import { saveAndBroadcastMessage } from '../watcher/jsonlWatcher'
import { buildHooksConfig } from './hookRunner'
import { syncSubagentToProject } from './subagentManager'

// Aktif takım session'ları
interface ActiveTeamSession {
  teamId: string
  projectId: string
  officeId: string
  leadProcess: ChildProcess
  startedAt: string
}

const activeTeamSessions = new Map<string, ActiveTeamSession>() // teamId → session

interface TeammateRow {
  id: string
  team_id: string
  agent_id: string
  agent_name: string
  animal: string
  role: string
  status: string
  current_task: string | null
  added_at: string
}

interface TeamRow {
  id: string
  project_id: string
  name: string
  lead_agent_id: string
  lead_agent_name: string
  status: string
  max_teammates: number
  created_at: string
  started_at: string | null
  completed_at: string | null
}

function rowToTeammate(r: TeammateRow) {
  return {
    id: r.id,
    teamId: r.team_id,
    agentId: r.agent_id,
    agentName: r.agent_name,
    animal: r.animal,
    role: r.role,
    status: r.status,
    currentTask: r.current_task ?? undefined,
    addedAt: r.added_at,
  }
}

function rowToTeam(r: TeamRow) {
  const teammates = (db.prepare('SELECT * FROM teammates WHERE team_id = ? ORDER BY added_at ASC').all(r.id) as TeammateRow[])
    .map(rowToTeammate)

  return {
    id: r.id,
    projectId: r.project_id,
    name: r.name,
    leadAgentId: r.lead_agent_id,
    leadAgentName: r.lead_agent_name,
    status: r.status,
    maxTeammates: r.max_teammates,
    teammates,
    createdAt: r.created_at,
    startedAt: r.started_at ?? undefined,
    completedAt: r.completed_at ?? undefined,
  }
}

/** Takım oluştur */
export function createTeam(
  projectId: string,
  name: string,
  leadAgentId: string,
  maxTeammates = 5,
) {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any
  if (!project) throw new Error('Project not found')

  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(leadAgentId) as any
  if (!agent) throw new Error('Lead agent not found')

  const id = uuid()
  const now = new Date().toISOString()

  db.prepare(
    `INSERT INTO teams (id, project_id, name, lead_agent_id, lead_agent_name, status, max_teammates, created_at)
     VALUES (?, ?, ?, ?, ?, 'idle', ?, ?)`
  ).run(id, projectId, name, leadAgentId, agent.name, Math.min(maxTeammates, 16), now)

  const team = rowToTeam(db.prepare('SELECT * FROM teams WHERE id = ?').get(id) as TeamRow)
  broadcast(project.office_id, { type: 'team:update' as any, projectId, team })

  return team
}

/** Takıma üye ekle */
export function addTeammate(teamId: string, agentId: string) {
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId) as TeamRow | undefined
  if (!team) throw new Error('Team not found')

  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId) as any
  if (!agent) throw new Error('Agent not found')

  // Lead zaten takımda, tekrar eklemeye gerek yok
  if (agentId === team.lead_agent_id) throw new Error('Lead agent is already in the team')

  // Mevcut teammate kontrolü
  const existing = db.prepare('SELECT id FROM teammates WHERE team_id = ? AND agent_id = ?').get(teamId, agentId) as any
  if (existing) throw new Error('Agent is already a teammate')

  // Max teammate kontrolü
  const count = (db.prepare('SELECT COUNT(*) as cnt FROM teammates WHERE team_id = ?').get(teamId) as any).cnt
  if (count >= team.max_teammates) throw new Error(`Maximum ${team.max_teammates} teammates allowed`)

  const id = uuid()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO teammates (id, team_id, agent_id, agent_name, animal, role, status, added_at)
     VALUES (?, ?, ?, ?, ?, ?, 'idle', ?)`
  ).run(id, teamId, agentId, agent.name, agent.animal, agent.role, now)

  const tm = rowToTeammate(db.prepare('SELECT * FROM teammates WHERE id = ?').get(id) as TeammateRow)
  const project = db.prepare('SELECT office_id FROM projects WHERE id = ?').get(team.project_id) as any
  if (project) {
    broadcast(project.office_id, { type: 'team:teammate' as any, teamId, teammate: tm })
  }

  return tm
}

/** Takımdan üye çıkar */
export function removeTeammate(teamId: string, agentId: string) {
  db.prepare('DELETE FROM teammates WHERE team_id = ? AND agent_id = ?').run(teamId, agentId)
}

/** Takımı başlat — lead agent claude CLI ile takım koordinasyonu yapar */
export function startTeam(teamId: string) {
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId) as TeamRow | undefined
  if (!team) throw new Error('Team not found')
  if (team.status === 'running') throw new Error('Team is already running')

  // Mevcut session varsa durdur
  if (activeTeamSessions.has(teamId)) {
    stopTeam(teamId)
  }

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(team.project_id) as any
  if (!project) throw new Error('Project not found')
  if (!project.work_dir) throw new Error('Project workDir not set')

  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(team.lead_agent_id) as any
  if (!agent) throw new Error('Lead agent not found')

  const teammates = db.prepare('SELECT * FROM teammates WHERE team_id = ?').all(teamId) as TeammateRow[]

  // Takım görevlerini topla
  const tasks = db.prepare(
    "SELECT * FROM tasks WHERE project_id = ? AND status != 'done' ORDER BY created_at ASC"
  ).all(team.project_id) as any[]

  // Her teammate'in detaylı bilgisini topla (ajanın DB satırından)
  const teammateDetails = teammates.map(tm => {
    const tmAgent = db.prepare('SELECT * FROM agents WHERE id = ?').get(tm.agent_id) as any
    const tmSkills = db.prepare(`
      SELECT s.name FROM skills s JOIN agent_skills ags ON s.id = ags.skill_id WHERE ags.agent_id = ?
    `).all(tm.agent_id) as any[]
    const skillNames = tmSkills.map((s: any) => s.name).join(', ')
    return `- ${tm.agent_name} (${tm.role})${tmAgent?.model ? ` [Model: ${tmAgent.model}]` : ''}${skillNames ? ` [Yetenekler: ${skillNames}]` : ''}`
  }).join('\n')

  const taskList = tasks.map((t: any, i: number) => {
    const assigned = t.assigned_agent_id
      ? teammates.find(tm => tm.agent_id === t.assigned_agent_id)?.agent_name ?? 'atanmamış'
      : 'atanmamış'
    const depInfo = t.depends_on_task_id ? ` (bağımlılık: görev ${tasks.findIndex((x: any) => x.id === t.depends_on_task_id) + 1 || '?'})` : ''
    return `${i + 1}. [${t.status}] ${t.description} (ajan: ${assigned})${depInfo}`
  }).join('\n')

  // Lead agent'ın skill'lerini topla
  const agentSkills = db.prepare(`
    SELECT s.name, s.content FROM skills s
    JOIN agent_skills ags ON s.id = ags.skill_id
    WHERE ags.agent_id = ?
    ORDER BY s.name ASC
  `).all(team.lead_agent_id) as any[]

  const skillsBlock = agentSkills.length > 0
    ? agentSkills.map((s: any) => `[Skill: ${s.name}]\n${s.content}`).join('\n\n---\n\n')
    : ''

  // Prompt parçalarını birleştir (processManager ile uyumlu)
  const promptParts: string[] = []

  // Lead agent'ın kendi sistem prompt'u
  const systemPrompt = agent.system_prompt?.trim()
  if (systemPrompt) promptParts.push(`[Sistem Talimatı]: ${systemPrompt}`)

  // Proje ek talimatları
  if (project.extra_instructions?.trim()) {
    promptParts.push(`[Proje Talimatları]: ${project.extra_instructions.trim()}`)
  }

  // Skills
  if (skillsBlock) promptParts.push(`[Yetenekler/Skills]:\n${skillsBlock}`)

  // Takım koordinasyon prompt'u
  promptParts.push(`[Takım Koordinasyonu]:
Sen bir takım liderisin. CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS aktif — alt ajanları doğrudan yönetebilirsin.

Proje: ${project.name}
Açıklama: ${project.description || 'Yok'}

Takım Üyeleri:
${teammateDetails || '- Henüz üye yok'}

Görevler:
${taskList || 'Henüz görev yok'}

Görevleri takım üyelerine görev bağımlılıklarına göre sırayla dağıt.
Bağımlılığı olan görevleri, bağımlı oldukları görev tamamlanmadan başlatma.
Her görev tamamlandığında sonraki görevi ata.
Takım üyelerinin uzmanlık alanlarına göre görev ata.
Tüm görevler bittiğinde proje durumunu özetle.`)

  const teamPrompt = promptParts.join('\n\n---\n\n')

  // CLAUDE.md yönetimi: proje workDir'ine yaz (varsa)
  if (project.claude_md && project.work_dir) {
    try {
      const claudeMdPath = path.join(project.work_dir, 'CLAUDE.md')
      fs.writeFileSync(claudeMdPath, project.claude_md, 'utf8')
    } catch {}
  }

  // CLI args — processManager ile tam uyumlu
  const cliArgs = ['--print', '--verbose', '--dangerously-skip-permissions', '--output-format', 'stream-json']
  if (agent.model) cliArgs.push('--model', agent.model)
  if (agent.max_turns > 0) cliArgs.push('--max-turns', String(agent.max_turns))

  // Granüler izin yönetimi
  const allowedTools: string[] = agent.allowed_tools ? (typeof agent.allowed_tools === 'string' ? (() => { try { return JSON.parse(agent.allowed_tools) } catch { return [] } })() : agent.allowed_tools) : []
  const disallowedTools: string[] = agent.disallowed_tools ? (typeof agent.disallowed_tools === 'string' ? (() => { try { return JSON.parse(agent.disallowed_tools) } catch { return [] } })() : agent.disallowed_tools) : []
  if (allowedTools.length > 0) cliArgs.push('--allowedTools', allowedTools.join(','))
  if (disallowedTools.length > 0) cliArgs.push('--disallowedTools', disallowedTools.join(','))

  // Ek sistem prompt
  if (agent.append_system_prompt) {
    cliArgs.push('--append-system-prompt', agent.append_system_prompt)
  }

  // Agent Teams env flag
  const agentEnv: Record<string, string> = { ...process.env } as any
  agentEnv.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = '1'

  // Efor seviyesi
  if (agent.effort_level) {
    agentEnv.CLAUDE_CODE_EFFORT_LEVEL = agent.effort_level
  }

  // Custom env vars
  if (agent.environment_vars) {
    try {
      const envVars = typeof agent.environment_vars === 'string'
        ? JSON.parse(agent.environment_vars) : agent.environment_vars
      Object.assign(agentEnv, envVars)
    } catch {}
  }

  // Hooks
  const hooksConfig = buildHooksConfig(team.project_id)
  if (hooksConfig) {
    try {
      agentEnv.CLAUDE_CODE_HOOKS_CONFIG = JSON.stringify({ hooks: hooksConfig })
    } catch {}
  }

  // MCP config
  const agentMcpRows = db.prepare(
    `SELECT s.* FROM mcp_servers s
     INNER JOIN agent_mcp_servers ams ON ams.mcp_server_id = s.id
     WHERE ams.agent_id = ? AND s.enabled = 1`
  ).all(team.lead_agent_id) as any[]

  if (agentMcpRows.length > 0) {
    const mcpServers: Record<string, any> = {}
    for (const row of agentMcpRows) {
      const serverArgs = (() => { try { return JSON.parse(row.args || '[]') } catch { return [] } })()
      const serverEnv = (() => { try { return JSON.parse(row.env || '{}') } catch { return {} } })()
      if (row.transport === 'stdio') {
        const parts = (row.command || '').split(/\s+/)
        mcpServers[row.name] = {
          command: parts[0] || '',
          args: [...parts.slice(1), ...serverArgs],
          ...(Object.keys(serverEnv).length > 0 ? { env: serverEnv } : {}),
        }
      } else {
        mcpServers[row.name] = {
          url: row.url || '',
          ...(Object.keys(serverEnv).length > 0 ? { env: serverEnv } : {}),
        }
      }
    }
    if (Object.keys(mcpServers).length > 0) {
      const mcpConfigPath = path.join(os.tmpdir(), `smith-team-mcp-${teamId}-${Date.now()}.json`)
      try {
        fs.writeFileSync(mcpConfigPath, JSON.stringify({ mcpServers }, null, 2))
        cliArgs.push('--mcp-config', mcpConfigPath)
      } catch {}
    }
  }

  // Subagent profili: dosyayı workDir'e sync et ve --agent flag'i ekle
  if (agent.subagent_id) {
    const subRow = db.prepare('SELECT name FROM subagents WHERE id = ?').get(agent.subagent_id) as any
    if (subRow) {
      try {
        syncSubagentToProject(agent.subagent_id, project.work_dir)
        cliArgs.push('--agent', subRow.name)
      } catch (e: any) {
        console.error(`[Team ${teamId}] Subagent sync hatası: ${e.message}`)
      }
    }
  }

  // Spawn lead agent
  const proc = spawn('claude', cliArgs, {
    cwd: project.work_dir,
    shell: true,
    env: agentEnv,
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  proc.on('error', (err) => {
    console.error(`[Team ${teamId}] spawn error:`, err.message)
    activeTeamSessions.delete(teamId)
    db.prepare("UPDATE teams SET status = 'error' WHERE id = ?").run(teamId)
    const updatedTeam = rowToTeam(db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId) as TeamRow)
    broadcast(project.office_id, { type: 'team:update' as any, projectId: team.project_id, team: updatedTeam })
  })

  // stdin'den team prompt gönder
  try {
    proc.stdin?.write(teamPrompt)
    proc.stdin?.end()
  } catch {}

  // stdout stream-json parsing
  let buffer = ''
  proc.stdout?.on('data', (chunk: Buffer) => {
    buffer += chunk.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const event = JSON.parse(line)

        // Teammate status updates (tool calls that mention agents)
        if (event.type === 'assistant' && event.message?.content) {
          const content = Array.isArray(event.message.content)
            ? event.message.content.map((c: any) => c.text || '').join('')
            : event.message.content
          if (content) {
            saveAndBroadcastMessage(
              project.office_id,
              team.lead_agent_id,
              agent.name,
              content.slice(0, 500),
              'chat'
            )
          }
        }

        // Status güncellemeleri
        if (event.type === 'agent_status') {
          // Claude teams ajanlardan gelen durum bilgisi
          const agentName = event.agent_name || ''
          const status = event.status || ''
          const tm = teammates.find(t => t.agent_name === agentName)
          if (tm) {
            const newStatus = status === 'working' ? 'working' : status === 'done' ? 'done' : status === 'error' ? 'error' : 'idle'
            db.prepare('UPDATE teammates SET status = ?, current_task = ? WHERE id = ?')
              .run(newStatus, event.task || null, tm.id)
            const updatedTm = rowToTeammate(db.prepare('SELECT * FROM teammates WHERE id = ?').get(tm.id) as TeammateRow)
            broadcast(project.office_id, { type: 'team:teammate' as any, teamId, teammate: updatedTm })
          }
        }
      } catch {}
    }
  })

  proc.stderr?.on('data', (chunk: Buffer) => {
    const msg = chunk.toString().trim()
    if (msg) {
      console.error(`[Team ${teamId}] stderr:`, msg)
    }
  })

  proc.on('close', (code) => {
    activeTeamSessions.delete(teamId)

    const finalStatus = code === 0 ? 'completed' : 'error'
    const now = new Date().toISOString()
    db.prepare("UPDATE teams SET status = ?, completed_at = ? WHERE id = ?").run(finalStatus, now, teamId)

    // Tüm teammate'leri done yap
    if (code === 0) {
      db.prepare("UPDATE teammates SET status = 'done' WHERE team_id = ?").run(teamId)
    }

    // Lead agent durumunu güncelle
    db.prepare("UPDATE agents SET status = 'idle', current_task = NULL WHERE id = ?").run(team.lead_agent_id)
    broadcast(project.office_id, { type: 'agent:status', agentId: team.lead_agent_id, status: 'idle' as any, currentTask: undefined })

    const updatedTeam = rowToTeam(db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId) as TeamRow)
    broadcast(project.office_id, { type: 'team:update' as any, projectId: team.project_id, team: updatedTeam })

    saveAndBroadcastMessage(
      project.office_id,
      team.lead_agent_id,
      agent.name,
      code === 0
        ? `✅ Takım "${team.name}" görevini tamamladı`
        : `❌ Takım "${team.name}" hata ile sona erdi (kod: ${code})`,
      'system'
    )

    console.log(`[Team ${teamId}] completed with code ${code}`)
  })

  // DB güncelle
  const now = new Date().toISOString()
  db.prepare("UPDATE teams SET status = 'running', started_at = ? WHERE id = ?").run(now, teamId)

  // Lead agent'ı thinking durumuna al
  db.prepare("UPDATE agents SET status = 'thinking', current_task = ? WHERE id = ?")
    .run(`Takım: ${team.name}`, team.lead_agent_id)
  broadcast(project.office_id, {
    type: 'agent:status',
    agentId: team.lead_agent_id,
    status: 'thinking' as any,
    currentTask: `Takım: ${team.name}`,
  })

  // Teammates'i working yap
  for (const tm of teammates) {
    db.prepare("UPDATE teammates SET status = 'working' WHERE id = ?").run(tm.id)
    db.prepare("UPDATE agents SET status = 'thinking', current_task = ? WHERE id = ?")
      .run(`Takım: ${team.name}`, tm.agent_id)
    broadcast(project.office_id, {
      type: 'agent:status',
      agentId: tm.agent_id,
      status: 'thinking' as any,
      currentTask: `Takım: ${team.name}`,
    })
  }

  activeTeamSessions.set(teamId, {
    teamId,
    projectId: team.project_id,
    officeId: project.office_id,
    leadProcess: proc,
    startedAt: now,
  })

  const updatedTeam = rowToTeam(db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId) as TeamRow)
  broadcast(project.office_id, { type: 'team:update' as any, projectId: team.project_id, team: updatedTeam })

  saveAndBroadcastMessage(
    project.office_id,
    team.lead_agent_id,
    agent.name,
    `🚀 Takım "${team.name}" başlatıldı (${teammates.length} üye)`,
    'system'
  )

  return updatedTeam
}

/** Takımı durdur */
export function stopTeam(teamId: string) {
  const session = activeTeamSessions.get(teamId)
  if (session) {
    try { session.leadProcess.kill('SIGTERM') } catch {}
    activeTeamSessions.delete(teamId)
  }

  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId) as TeamRow | undefined
  if (!team) return

  db.prepare("UPDATE teams SET status = 'idle' WHERE id = ?").run(teamId)
  db.prepare("UPDATE teammates SET status = 'idle', current_task = NULL WHERE team_id = ?").run(teamId)

  // Ajanları idle yap
  const teammates = db.prepare('SELECT agent_id FROM teammates WHERE team_id = ?').all(teamId) as { agent_id: string }[]
  for (const tm of teammates) {
    db.prepare("UPDATE agents SET status = 'idle', current_task = NULL WHERE id = ?").run(tm.agent_id)
  }
  db.prepare("UPDATE agents SET status = 'idle', current_task = NULL WHERE id = ?").run(team.lead_agent_id)

  const project = db.prepare('SELECT office_id FROM projects WHERE id = ?').get(team.project_id) as any
  if (project) {
    const updatedTeam = rowToTeam(db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId) as TeamRow)
    broadcast(project.office_id, { type: 'team:update' as any, projectId: team.project_id, team: updatedTeam })
  }
}

/** Proje takımlarını listele */
export function getProjectTeams(projectId: string) {
  const rows = db.prepare('SELECT * FROM teams WHERE project_id = ? ORDER BY created_at DESC').all(projectId) as TeamRow[]
  return rows.map(rowToTeam)
}

/** Takım detayı */
export function getTeam(teamId: string) {
  const row = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId) as TeamRow | undefined
  if (!row) return null
  return rowToTeam(row)
}

/** Takımı sil */
export function deleteTeam(teamId: string) {
  stopTeam(teamId)
  db.prepare('DELETE FROM teammates WHERE team_id = ?').run(teamId)
  db.prepare('DELETE FROM teams WHERE id = ?').run(teamId)
}

/** Aktif takım var mı kontrol */
export function isTeamRunning(teamId: string): boolean {
  return activeTeamSessions.has(teamId)
}
