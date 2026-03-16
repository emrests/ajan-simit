import fs from 'fs'
import path from 'path'
import os from 'os'
import { v4 as uuid } from 'uuid'
import { db } from '../db/database'

interface SubagentRow {
  id: string
  name: string
  description: string
  prompt: string
  model: string
  max_turns: number
  allowed_tools: string
  disallowed_tools: string
  scope: string
  created_at: string
}

function parseJson<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback
  try { return JSON.parse(val) } catch { return fallback }
}

function rowToSubagent(r: SubagentRow) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    prompt: r.prompt,
    model: r.model || undefined,
    maxTurns: r.max_turns || undefined,
    allowedTools: parseJson<string[]>(r.allowed_tools, []),
    disallowedTools: parseJson<string[]>(r.disallowed_tools, []),
    scope: r.scope as 'project' | 'user',
    createdAt: r.created_at,
  }
}

/** YAML frontmatter + markdown body formatında subagent dosyası oluştur */
function buildSubagentMd(sub: {
  name: string
  description: string
  prompt: string
  model?: string
  maxTurns?: number
  allowedTools?: string[]
  disallowedTools?: string[]
}): string {
  const lines: string[] = ['---']
  lines.push(`name: ${sub.name}`)
  if (sub.description) lines.push(`description: ${sub.description}`)
  if (sub.model) lines.push(`model: ${sub.model}`)
  if (sub.maxTurns && sub.maxTurns > 0) lines.push(`maxTurns: ${sub.maxTurns}`)
  if (sub.allowedTools && sub.allowedTools.length > 0) {
    lines.push(`allowedTools: [${sub.allowedTools.join(', ')}]`)
  }
  if (sub.disallowedTools && sub.disallowedTools.length > 0) {
    lines.push(`disallowedTools: [${sub.disallowedTools.join(', ')}]`)
  }
  lines.push('---')
  lines.push('')
  lines.push(sub.prompt)
  return lines.join('\n')
}

/** Subagent .md dosyasını diske yaz */
export function writeSubagentFile(sub: SubagentRow, workDir?: string): string | null {
  const scope = sub.scope || 'project'
  let agentsDir: string

  if (scope === 'user') {
    agentsDir = path.join(os.homedir(), '.claude', 'agents')
  } else if (workDir) {
    agentsDir = path.join(workDir, '.claude', 'agents')
  } else {
    return null
  }

  try {
    fs.mkdirSync(agentsDir, { recursive: true })
  } catch {}

  const filePath = path.join(agentsDir, `${sub.name}.md`)
  const content = buildSubagentMd({
    name: sub.name,
    description: sub.description,
    prompt: sub.prompt,
    model: sub.model || undefined,
    maxTurns: sub.max_turns || undefined,
    allowedTools: parseJson<string[]>(sub.allowed_tools, []),
    disallowedTools: parseJson<string[]>(sub.disallowed_tools, []),
  })

  fs.writeFileSync(filePath, content, 'utf8')
  return filePath
}

/** Subagent .md dosyasını sil */
export function removeSubagentFile(name: string, scope: string, workDir?: string): void {
  const dirs: string[] = []
  if (scope === 'user') {
    dirs.push(path.join(os.homedir(), '.claude', 'agents'))
  }
  if (workDir) {
    dirs.push(path.join(workDir, '.claude', 'agents'))
  }

  for (const dir of dirs) {
    const filePath = path.join(dir, `${name}.md`)
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    } catch {}
  }
}

// --- CRUD ---

export function getSubagents() {
  const rows = db.prepare('SELECT * FROM subagents ORDER BY created_at DESC').all() as SubagentRow[]
  return rows.map(rowToSubagent)
}

export function getSubagent(id: string) {
  const row = db.prepare('SELECT * FROM subagents WHERE id = ?').get(id) as SubagentRow | undefined
  return row ? rowToSubagent(row) : null
}

export function createSubagent(data: {
  name: string
  description?: string
  prompt?: string
  model?: string
  maxTurns?: number
  allowedTools?: string[]
  disallowedTools?: string[]
  scope?: string
}) {
  const id = uuid()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO subagents (id, name, description, prompt, model, max_turns, allowed_tools, disallowed_tools, scope, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.name,
    data.description || '',
    data.prompt || '',
    data.model || '',
    data.maxTurns || 0,
    JSON.stringify(data.allowedTools || []),
    JSON.stringify(data.disallowedTools || []),
    data.scope || 'project',
    now,
  )
  return rowToSubagent(db.prepare('SELECT * FROM subagents WHERE id = ?').get(id) as SubagentRow)
}

export function updateSubagent(id: string, data: Partial<{
  name: string
  description: string
  prompt: string
  model: string
  maxTurns: number
  allowedTools: string[]
  disallowedTools: string[]
  scope: string
}>) {
  const existing = db.prepare('SELECT * FROM subagents WHERE id = ?').get(id) as SubagentRow | undefined
  if (!existing) throw new Error('Subagent not found')

  db.prepare(
    `UPDATE subagents SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      prompt = COALESCE(?, prompt),
      model = COALESCE(?, model),
      max_turns = COALESCE(?, max_turns),
      allowed_tools = COALESCE(?, allowed_tools),
      disallowed_tools = COALESCE(?, disallowed_tools),
      scope = COALESCE(?, scope)
    WHERE id = ?`
  ).run(
    data.name ?? null,
    data.description ?? null,
    data.prompt ?? null,
    data.model ?? null,
    data.maxTurns ?? null,
    data.allowedTools ? JSON.stringify(data.allowedTools) : null,
    data.disallowedTools ? JSON.stringify(data.disallowedTools) : null,
    data.scope ?? null,
    id,
  )
  return rowToSubagent(db.prepare('SELECT * FROM subagents WHERE id = ?').get(id) as SubagentRow)
}

export function deleteSubagent(id: string) {
  const row = db.prepare('SELECT * FROM subagents WHERE id = ?').get(id) as SubagentRow | undefined
  if (row) {
    removeSubagentFile(row.name, row.scope)
  }
  db.prepare('DELETE FROM subagents WHERE id = ?').run(id)
}

/** Subagent dosyasını proje workDir'ine sync et */
export function syncSubagentToProject(subagentId: string, workDir: string): string | null {
  const row = db.prepare('SELECT * FROM subagents WHERE id = ?').get(subagentId) as SubagentRow | undefined
  if (!row) return null
  return writeSubagentFile(row, workDir)
}

/** Subagent'ın .md dosya içeriğini önizle */
export function previewSubagentMd(id: string): string {
  const row = db.prepare('SELECT * FROM subagents WHERE id = ?').get(id) as SubagentRow | undefined
  if (!row) return ''
  return buildSubagentMd({
    name: row.name,
    description: row.description,
    prompt: row.prompt,
    model: row.model || undefined,
    maxTurns: row.max_turns || undefined,
    allowedTools: parseJson<string[]>(row.allowed_tools, []),
    disallowedTools: parseJson<string[]>(row.disallowed_tools, []),
  })
}

/** Ajan profilini subagent şablonuna dönüştür */
export function agentToSubagent(agentId: string) {
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId) as any
  if (!agent) throw new Error('Agent not found')

  const safeName = agent.name.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase()
  return createSubagent({
    name: safeName,
    description: `${agent.name} — ${agent.role}`,
    prompt: agent.system_prompt || '',
    model: agent.model || '',
    maxTurns: agent.max_turns || 0,
    allowedTools: parseJson<string[]>(agent.allowed_tools, []),
    disallowedTools: parseJson<string[]>(agent.disallowed_tools, []),
    scope: 'project',
  })
}
