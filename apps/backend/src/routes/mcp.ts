import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { db } from '../db/database'

export const mcpRouter = Router()

function parseJson<T>(val: any, fallback: T): T {
  if (!val || val === '') return fallback
  try { return JSON.parse(val) } catch { return fallback }
}

function rowToMcpServer(r: any) {
  return {
    id: r.id,
    name: r.name,
    description: r.description || '',
    transport: r.transport,
    command: r.command || '',
    url: r.url || '',
    args: parseJson<string[]>(r.args, []),
    env: parseJson<Record<string, string>>(r.env, {}),
    scope: r.scope || 'user',
    enabled: r.enabled === 1,
    createdAt: r.created_at,
  }
}

// ─── MCP Server CRUD ───

// GET /api/mcp-servers — Tüm MCP sunucularını listele
mcpRouter.get('/mcp-servers', (_req, res) => {
  const servers = db.prepare('SELECT * FROM mcp_servers ORDER BY name ASC').all() as any[]
  res.json(servers.map(rowToMcpServer))
})

// GET /api/mcp-servers/:id
mcpRouter.get('/mcp-servers/:id', (req, res) => {
  const server = db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(req.params.id) as any
  if (!server) return res.status(404).json({ error: 'MCP server not found' }) as any
  res.json(rowToMcpServer(server))
})

// POST /api/mcp-servers — Yeni MCP sunucusu oluştur
mcpRouter.post('/mcp-servers', (req, res) => {
  const { name, description, transport, command, url, args, env, scope, enabled } = req.body
  if (!name || !transport) {
    return res.status(400).json({ error: 'name and transport are required' })
  }

  const id = uuid()
  const createdAt = new Date().toISOString()
  db.prepare(
    'INSERT INTO mcp_servers (id, name, description, transport, command, url, args, env, scope, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id, name, description ?? '', transport,
    command ?? '', url ?? '',
    JSON.stringify(args ?? []),
    JSON.stringify(env ?? {}),
    scope ?? 'user',
    enabled !== false ? 1 : 0,
    createdAt
  )

  res.status(201).json(rowToMcpServer(db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(id)))
})

// PUT /api/mcp-servers/:id — MCP sunucusu güncelle
mcpRouter.put('/mcp-servers/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'MCP server not found' }) as any

  const { name, description, transport, command, url, args, env, scope, enabled } = req.body
  db.prepare(
    `UPDATE mcp_servers SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      transport = COALESCE(?, transport),
      command = COALESCE(?, command),
      url = COALESCE(?, url),
      args = COALESCE(?, args),
      env = COALESCE(?, env),
      scope = COALESCE(?, scope),
      enabled = COALESCE(?, enabled)
    WHERE id = ?`
  ).run(
    name ?? null, description ?? null, transport ?? null,
    command ?? null, url ?? null,
    args ? JSON.stringify(args) : null,
    env ? JSON.stringify(env) : null,
    scope ?? null,
    enabled != null ? (enabled ? 1 : 0) : null,
    req.params.id
  )

  res.json(rowToMcpServer(db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(req.params.id)))
})

// DELETE /api/mcp-servers/:id
mcpRouter.delete('/mcp-servers/:id', (req, res) => {
  const result = db.prepare('DELETE FROM mcp_servers WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'MCP server not found' }) as any
  res.json({ success: true })
})

// PATCH /api/mcp-servers/:id/toggle — Aktif/pasif toggle
mcpRouter.patch('/mcp-servers/:id/toggle', (req, res) => {
  const existing = db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(req.params.id) as any
  if (!existing) return res.status(404).json({ error: 'MCP server not found' }) as any

  const newEnabled = existing.enabled === 1 ? 0 : 1
  db.prepare('UPDATE mcp_servers SET enabled = ? WHERE id = ?').run(newEnabled, req.params.id)
  res.json(rowToMcpServer(db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(req.params.id)))
})

// ─── Agent ↔ MCP Server ───

// GET /api/agents/:agentId/mcp-servers — Ajanın MCP sunucularını getir
mcpRouter.get('/agents/:agentId/mcp-servers', (req, res) => {
  const servers = db.prepare(
    `SELECT s.* FROM mcp_servers s
     INNER JOIN agent_mcp_servers ams ON ams.mcp_server_id = s.id
     WHERE ams.agent_id = ?
     ORDER BY s.name ASC`
  ).all(req.params.agentId) as any[]
  res.json(servers.map(rowToMcpServer))
})

// POST /api/agents/:agentId/mcp-servers — Ajana MCP sunucu bağla
mcpRouter.post('/agents/:agentId/mcp-servers', (req, res) => {
  const { mcpServerId } = req.body
  if (!mcpServerId) return res.status(400).json({ error: 'mcpServerId is required' }) as any

  const agent = db.prepare('SELECT id FROM agents WHERE id = ?').get(req.params.agentId)
  if (!agent) return res.status(404).json({ error: 'Agent not found' }) as any

  const server = db.prepare('SELECT id FROM mcp_servers WHERE id = ?').get(mcpServerId)
  if (!server) return res.status(404).json({ error: 'MCP server not found' }) as any

  try {
    db.prepare('INSERT OR IGNORE INTO agent_mcp_servers (agent_id, mcp_server_id) VALUES (?, ?)').run(req.params.agentId, mcpServerId)
    res.json({ success: true })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

// DELETE /api/agents/:agentId/mcp-servers/:mcpServerId — Ajandan MCP sunucu çıkar
mcpRouter.delete('/agents/:agentId/mcp-servers/:mcpServerId', (req, res) => {
  const result = db.prepare('DELETE FROM agent_mcp_servers WHERE agent_id = ? AND mcp_server_id = ?')
    .run(req.params.agentId, req.params.mcpServerId)
  if (result.changes === 0) return res.status(404).json({ error: 'Relation not found' }) as any
  res.json({ success: true })
})

// GET /api/mcp-servers/:id/test — MCP sunucusu bağlantı testi
mcpRouter.get('/mcp-servers/:id/test', async (req, res) => {
  const server = db.prepare('SELECT * FROM mcp_servers WHERE id = ?').get(req.params.id) as any
  if (!server) return res.status(404).json({ error: 'MCP server not found' }) as any

  // Basit sağlık kontrolü: stdio sunucu için komutun var olup olmadığını kontrol et
  if (server.transport === 'stdio') {
    const { spawnSync } = require('child_process')
    const cmd = (server.command || '').split(' ')[0]
    if (!cmd) return res.json({ status: 'error', message: 'Komut tanımlı değil' })

    // which/where ile komut varlığını kontrol et
    const check = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], {
      shell: true,
      timeout: 5000,
      env: { ...process.env, ...parseJson(server.env, {}) },
    })
    if (check.status === 0) {
      return res.json({ status: 'active', message: `${cmd} bulundu` })
    }
    return res.json({ status: 'error', message: `${cmd} bulunamadı` })
  }

  // SSE/HTTP: URL erişilebilirlik kontrolü
  if (server.transport === 'sse' || server.transport === 'http') {
    if (!server.url) return res.json({ status: 'error', message: 'URL tanımlı değil' })
    try {
      const resp = await fetch(server.url, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
      return res.json({ status: resp.ok ? 'active' : 'error', message: `HTTP ${resp.status}` })
    } catch (e: any) {
      return res.json({ status: 'error', message: e.message })
    }
  }

  res.json({ status: 'disabled', message: 'Bilinmeyen transport' })
})
