import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { db } from '../db/database'

export const skillsRouter = Router()

function rowToSkill(r: any) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    content: r.content,
    source: r.source,
    category: r.category,
    createdAt: r.created_at,
  }
}

// ─── Skill CRUD ───

// GET /api/skills — Tüm skill'leri listele
skillsRouter.get('/skills', (_req, res) => {
  const skills = db.prepare('SELECT * FROM skills ORDER BY name ASC').all() as any[]
  res.json(skills.map(rowToSkill))
})

// GET /api/skills/:id
skillsRouter.get('/skills/:id', (req, res) => {
  const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(req.params.id) as any
  if (!skill) return res.status(404).json({ error: 'Skill not found' }) as any
  res.json(rowToSkill(skill))
})

// POST /api/skills — Yeni skill oluştur
skillsRouter.post('/skills', (req, res) => {
  const { name, description = '', content = '', source = 'manual', category = 'general' } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' }) as any

  const id = uuid()
  const createdAt = new Date().toISOString()

  db.prepare(`
    INSERT INTO skills (id, name, description, content, source, category, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, description, content, source, category, createdAt)

  const skill = rowToSkill(db.prepare('SELECT * FROM skills WHERE id = ?').get(id))
  res.status(201).json(skill)
})

// POST /api/skills/import — SKILL.md formatından import et (frontmatter + body)
skillsRouter.post('/skills/import', (req, res) => {
  const { markdown, source = 'import' } = req.body
  if (!markdown) return res.status(400).json({ error: 'markdown is required' }) as any

  // YAML frontmatter parse et
  const fmMatch = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  let name = ''
  let description = ''
  let content = markdown
  let category = 'general'

  if (fmMatch) {
    const frontmatter = fmMatch[1]
    content = fmMatch[2].trim()

    // Basit YAML parse (name, description, category)
    const nameMatch = frontmatter.match(/^name:\s*(.+)$/m)
    const descMatch = frontmatter.match(/^description:\s*["']?([\s\S]*?)["']?\s*$/m)
    const catMatch = frontmatter.match(/^category:\s*(.+)$/m)

    if (nameMatch) name = nameMatch[1].trim()
    if (descMatch) description = descMatch[1].trim()
    if (catMatch) category = catMatch[1].trim()
  }

  if (!name) {
    // İlk heading'den al
    const headingMatch = content.match(/^#\s+(.+)$/m)
    name = headingMatch ? headingMatch[1].trim() : 'İsimsiz Skill'
  }

  const id = uuid()
  const createdAt = new Date().toISOString()

  db.prepare(`
    INSERT INTO skills (id, name, description, content, source, category, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, description, content, source, category, createdAt)

  const skill = rowToSkill(db.prepare('SELECT * FROM skills WHERE id = ?').get(id))
  res.status(201).json(skill)
})

// POST /api/skills/import-batch — Birden fazla SKILL.md import et
skillsRouter.post('/skills/import-batch', (req, res) => {
  const { skills: skillList } = req.body as { skills: { name: string; description: string; content: string; source?: string; category?: string }[] }
  if (!Array.isArray(skillList)) return res.status(400).json({ error: 'skills array is required' }) as any

  const created: any[] = []
  const insert = db.prepare(`
    INSERT INTO skills (id, name, description, content, source, category, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const createdAt = new Date().toISOString()

  for (const s of skillList) {
    if (!s.name) continue
    const id = uuid()
    insert.run(id, s.name, s.description ?? '', s.content ?? '', s.source ?? 'import', s.category ?? 'general', createdAt)
    created.push(rowToSkill(db.prepare('SELECT * FROM skills WHERE id = ?').get(id)))
  }

  res.status(201).json({ created: created.length, skills: created })
})

// POST /api/skills/import-from-repo — GitHub reposundan toplu skill import
skillsRouter.post('/skills/import-from-repo', async (req, res) => {
  const { repoUrl, branch, pathFilter = '' } = req.body
  if (!repoUrl) return res.status(400).json({ error: 'repoUrl is required' }) as any

  // URL'den owner/repo parse et
  const urlMatch = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
  if (!urlMatch) return res.status(400).json({ error: 'Invalid GitHub URL. Format: https://github.com/owner/repo' }) as any

  const owner = urlMatch[1]
  const repo = urlMatch[2].replace(/\.git$/, '').replace(/\/.*$/, '')
  const source = `github:${owner}/${repo}`
  const ghHeaders = { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'SmithAgentOffice' }

  try {
    // 1. Branch belirtilmediyse repo'nun default branch'ini çek
    let targetBranch = branch
    if (!targetBranch) {
      const repoRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
        { headers: ghHeaders }
      )
      if (!repoRes.ok) {
        return res.status(repoRes.status).json({ error: `GitHub repo bulunamadı: ${owner}/${repo}` }) as any
      }
      const repoData = await repoRes.json() as { default_branch: string }
      targetBranch = repoData.default_branch
    }

    // 2. Repo tree'yi recursive çek
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`,
      { headers: ghHeaders }
    )
    if (!treeRes.ok) {
      const errText = await treeRes.text()
      return res.status(treeRes.status).json({ error: `GitHub API error: ${treeRes.status} — ${errText}` }) as any
    }

    const treeData = await treeRes.json() as { tree: { path: string; type: string }[]; truncated?: boolean }
    console.log(`[skill-import] Tree: ${treeData.tree?.length ?? 0} items, truncated: ${treeData.truncated}`)

    // Tree truncated ise partial tree verisini koru + eksik dizinleri Contents API ile tamamla
    let allFiles: { path: string; type: string }[] = treeData.tree ?? []
    if (treeData.truncated) {
      // Partial tree'den hangi üst dizinler zaten kapsanıyor?
      const coveredDirs = new Set<string>()
      for (const item of treeData.tree) {
        const topDir = item.path.split('/')[0]
        if (item.path.includes('/')) coveredDirs.add(topDir)
      }

      // Root dizin listesini çek — eksik dizinleri belirle
      let apiCalls = 0
      const MAX_API_CALLS = 100
      const rootUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${pathFilter || ''}?ref=${targetBranch}`
      apiCalls++
      const rootRes = await fetch(rootUrl, { headers: ghHeaders })
      if (rootRes.ok) {
        const rootItems = await rootRes.json() as { path: string; type: string; name: string }[]

        // Eksik dizinleri Contents API ile tara
        for (const dir of rootItems) {
          if (dir.type !== 'dir' || coveredDirs.has(dir.name) || apiCalls >= MAX_API_CALLS) continue

          // Bu dizini ve alt dizinlerini tara
          const scanDir = async (dirPath: string) => {
            if (apiCalls >= MAX_API_CALLS) return
            apiCalls++
            const url = `https://api.github.com/repos/${owner}/${repo}/contents/${dirPath}?ref=${targetBranch}`
            const dirRes = await fetch(url, { headers: ghHeaders })
            if (!dirRes.ok) return
            const items = await dirRes.json() as { path: string; type: string; name: string }[]
            for (const item of items) {
              if (item.type === 'file') {
                allFiles.push({ path: item.path, type: 'blob' })
              } else if (item.type === 'dir' && apiCalls < MAX_API_CALLS) {
                await scanDir(item.path)
              }
            }
          }
          await scanDir(dir.path)
        }
      }
    }

    // 3. .md dosyalarını filtrele
    const skipNames = new Set(['readme.md', 'contributing.md', 'changelog.md', 'license.md'])
    const mdFiles = allFiles.filter(item => {
      if (item.type !== 'blob') return false
      if (!item.path.toLowerCase().endsWith('.md')) return false
      const filename = item.path.split('/').pop()?.toLowerCase() ?? ''
      if (skipNames.has(filename)) return false
      if (pathFilter && !treeData.truncated && !item.path.startsWith(pathFilter)) return false
      return true
    })

    console.log(`[skill-import] allFiles: ${allFiles.length}, mdFiles: ${mdFiles.length}`)
    if (mdFiles.length > 0) {
      console.log(`[skill-import] İlk 5 md dosya:`, mdFiles.slice(0, 5).map(f => f.path))
    }

    if (mdFiles.length === 0) {
      // Debug: neden 0 bulundu?
      const blobCount = allFiles.filter(f => f.type === 'blob').length
      const mdCount = allFiles.filter(f => f.type === 'blob' && f.path?.toLowerCase().endsWith('.md')).length
      const samplePaths = allFiles.slice(0, 10).map(f => `${f.path} (${f.type})`)
      console.log(`[skill-import] DEBUG — blobs: ${blobCount}, md blobs: ${mdCount}, samples:`, samplePaths)
      return res.json({
        created: 0, skipped: 0, skills: [],
        errors: [`No .md skill files found in repository (tree: ${treeData.tree?.length ?? 0} items, truncated: ${treeData.truncated}, allFiles: ${allFiles.length}, blobs: ${blobCount}, mdBlobs: ${mdCount})`]
      }) as any
    }

    // 3. Mevcut skill isimlerini al (duplicate kontrolü)
    const existingNames = new Set(
      (db.prepare('SELECT name FROM skills').all() as any[]).map(r => r.name.toLowerCase())
    )

    // 4. Her dosyanın içeriğini çek ve parse et
    const created: any[] = []
    const errors: string[] = []
    let skipped = 0
    const createdAt = new Date().toISOString()
    const insert = db.prepare(`
      INSERT INTO skills (id, name, description, content, source, category, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    // Paralel fetch — 10'arlı batch'ler ile
    for (let i = 0; i < mdFiles.length; i += 10) {
      const batch = mdFiles.slice(i, i + 10)
      const results = await Promise.allSettled(
        batch.map(async (file) => {
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${targetBranch}/${file.path}`
          const rawRes = await fetch(rawUrl)
          if (!rawRes.ok) throw new Error(`Failed to fetch ${file.path}: ${rawRes.status}`)
          const markdown = await rawRes.text()
          return { path: file.path, markdown }
        })
      )

      for (const result of results) {
        if (result.status === 'rejected') {
          errors.push(result.reason?.message ?? 'Unknown fetch error')
          continue
        }

        const { path, markdown } = result.value

        // Frontmatter parse (mevcut import endpoint ile aynı mantık)
        const fmMatch = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
        let name = ''
        let description = ''
        let content = markdown
        let category = 'general'

        if (fmMatch) {
          const frontmatter = fmMatch[1]
          content = fmMatch[2].trim()

          const nameMatch = frontmatter.match(/^name:\s*(.+)$/m)
          const descMatch = frontmatter.match(/^description:\s*["']?([\s\S]*?)["']?\s*$/m)
          const catMatch = frontmatter.match(/^category:\s*(.+)$/m)

          if (nameMatch) name = nameMatch[1].trim()
          if (descMatch) description = descMatch[1].trim()
          if (catMatch) category = catMatch[1].trim()
        }

        if (!name) {
          const headingMatch = content.match(/^#\s+(.+)$/m)
          if (headingMatch) {
            name = headingMatch[1].trim()
          } else {
            // Dosya adından al
            const filename = path.split('/').pop()?.replace(/\.md$/i, '') ?? ''
            name = filename || 'İsimsiz Skill'
          }
        }

        // Duplicate kontrolü
        if (existingNames.has(name.toLowerCase())) {
          skipped++
          continue
        }

        const id = uuid()
        try {
          insert.run(id, name, description, content, source, category, createdAt)
          const skill = rowToSkill(db.prepare('SELECT * FROM skills WHERE id = ?').get(id))
          created.push(skill)
          existingNames.add(name.toLowerCase())
        } catch (e: any) {
          errors.push(`${name}: ${e.message}`)
        }
      }
    }

    res.status(201).json({ created: created.length, skipped, skills: created, errors })
  } catch (e: any) {
    res.status(500).json({ error: `GitHub import failed: ${e.message}` })
  }
})

// PUT /api/skills/:id
skillsRouter.put('/skills/:id', (req, res) => {
  const { name, description, content, category } = req.body
  const existing = db.prepare('SELECT * FROM skills WHERE id = ?').get(req.params.id) as any
  if (!existing) return res.status(404).json({ error: 'Skill not found' }) as any

  db.prepare(`
    UPDATE skills SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      content = COALESCE(?, content),
      category = COALESCE(?, category)
    WHERE id = ?
  `).run(name ?? null, description ?? null, content ?? null, category ?? null, req.params.id)

  const skill = rowToSkill(db.prepare('SELECT * FROM skills WHERE id = ?').get(req.params.id))
  res.json(skill)
})

// DELETE /api/skills/:id
skillsRouter.delete('/skills/:id', (req, res) => {
  const result = db.prepare('DELETE FROM skills WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Skill not found' }) as any
  res.json({ success: true })
})

// ─── Agent ↔ Skill ilişkisi ───

// GET /api/agents/:agentId/skills — Ajanın skill'lerini listele
skillsRouter.get('/agents/:agentId/skills', (req, res) => {
  const skills = db.prepare(`
    SELECT s.* FROM skills s
    JOIN agent_skills ags ON s.id = ags.skill_id
    WHERE ags.agent_id = ?
    ORDER BY s.name ASC
  `).all(req.params.agentId) as any[]
  res.json(skills.map(rowToSkill))
})

// POST /api/agents/:agentId/skills — Ajana skill ekle
skillsRouter.post('/agents/:agentId/skills', (req, res) => {
  const { skillId } = req.body
  if (!skillId) return res.status(400).json({ error: 'skillId is required' }) as any

  const agent = db.prepare('SELECT id FROM agents WHERE id = ?').get(req.params.agentId)
  if (!agent) return res.status(404).json({ error: 'Agent not found' }) as any

  const skill = db.prepare('SELECT id FROM skills WHERE id = ?').get(skillId)
  if (!skill) return res.status(404).json({ error: 'Skill not found' }) as any

  // Zaten ekli mi kontrol et
  const existing = db.prepare('SELECT 1 FROM agent_skills WHERE agent_id = ? AND skill_id = ?')
    .get(req.params.agentId, skillId)
  if (existing) return res.json({ success: true, message: 'Already attached' }) as any

  db.prepare('INSERT INTO agent_skills (agent_id, skill_id) VALUES (?, ?)')
    .run(req.params.agentId, skillId)

  res.status(201).json({ success: true })
})

// DELETE /api/agents/:agentId/skills/:skillId — Ajandan skill kaldır
skillsRouter.delete('/agents/:agentId/skills/:skillId', (req, res) => {
  const result = db.prepare('DELETE FROM agent_skills WHERE agent_id = ? AND skill_id = ?')
    .run(req.params.agentId, req.params.skillId)
  if (result.changes === 0) return res.status(404).json({ error: 'Skill assignment not found' }) as any
  res.json({ success: true })
})

// GET /api/agents/:agentId/skills/compiled — Ajanın skill'lerini derlenmiş prompt olarak döndür
skillsRouter.get('/agents/:agentId/skills/compiled', (req, res) => {
  const skills = db.prepare(`
    SELECT s.name, s.content FROM skills s
    JOIN agent_skills ags ON s.id = ags.skill_id
    WHERE ags.agent_id = ?
    ORDER BY s.name ASC
  `).all(req.params.agentId) as any[]

  if (skills.length === 0) {
    return res.json({ prompt: '', count: 0 }) as any
  }

  const prompt = skills
    .map((s: any) => `[Skill: ${s.name}]\n${s.content}`)
    .join('\n\n---\n\n')

  res.json({ prompt, count: skills.length })
})
