import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { spawnSync, spawn } from 'child_process'
import { db } from '../db/database'
import { broadcastAll } from '../ws/server'

export const trainingRouter = Router()

function rowToProfile(r: any) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    content: r.content,
    mode: r.mode,
    source: r.source,
    userPrompt: r.user_prompt,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function rowToRun(r: any) {
  return {
    id: r.id,
    profileId: r.profile_id,
    agentId: r.agent_id,
    status: r.status,
    inputTokens: r.input_tokens,
    outputTokens: r.output_tokens,
    startedAt: r.started_at,
    completedAt: r.completed_at,
    error: r.error,
  }
}

// ─── Training Profile CRUD ───

// GET /api/training-profiles
trainingRouter.get('/training-profiles', (_req, res) => {
  const profiles = db.prepare('SELECT * FROM training_profiles ORDER BY created_at DESC').all() as any[]
  res.json(profiles.map(rowToProfile))
})

// GET /api/training-profiles/:id
trainingRouter.get('/training-profiles/:id', (req, res) => {
  const profile = db.prepare('SELECT * FROM training_profiles WHERE id = ?').get(req.params.id) as any
  if (!profile) return res.status(404).json({ error: 'Training profile not found' }) as any
  res.json(rowToProfile(profile))
})

// POST /api/training-profiles
trainingRouter.post('/training-profiles', (req, res) => {
  const { name, description = '', mode = 'technology', source = '', userPrompt = '' } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' }) as any

  const id = uuid()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO training_profiles (id, name, description, content, mode, source, user_prompt, status, created_at)
    VALUES (?, ?, ?, '', ?, ?, ?, 'pending', ?)
  `).run(id, name, description, mode, source, userPrompt, now)

  const profile = rowToProfile(db.prepare('SELECT * FROM training_profiles WHERE id = ?').get(id))
  broadcastAll({ type: 'training:update', profile })
  res.status(201).json(profile)
})

// PUT /api/training-profiles/:id
trainingRouter.put('/training-profiles/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM training_profiles WHERE id = ?').get(req.params.id) as any
  if (!existing) return res.status(404).json({ error: 'Training profile not found' }) as any

  const { name, description, content, mode, source, userPrompt, status } = req.body
  const now = new Date().toISOString()

  db.prepare(`
    UPDATE training_profiles SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      content = COALESCE(?, content),
      mode = COALESCE(?, mode),
      source = COALESCE(?, source),
      user_prompt = COALESCE(?, user_prompt),
      status = COALESCE(?, status),
      updated_at = ?
    WHERE id = ?
  `).run(name, description, content, mode, source, userPrompt, status, now, req.params.id)

  const profile = rowToProfile(db.prepare('SELECT * FROM training_profiles WHERE id = ?').get(req.params.id))
  broadcastAll({ type: 'training:update', profile })
  res.json(profile)
})

// DELETE /api/training-profiles/:id
trainingRouter.delete('/training-profiles/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM training_profiles WHERE id = ?').get(req.params.id) as any
  if (!existing) return res.status(404).json({ error: 'Training profile not found' }) as any

  // Profili kullanan ajanların referansını temizle
  db.prepare('UPDATE agents SET training_profile_id = NULL WHERE training_profile_id = ?').run(req.params.id)
  db.prepare('DELETE FROM training_runs WHERE profile_id = ?').run(req.params.id)
  db.prepare('DELETE FROM training_profiles WHERE id = ?').run(req.params.id)

  res.json({ success: true })
})

// ─── Training Coach Session ───

// POST /api/training-profiles/:id/train
trainingRouter.post('/training-profiles/:id/train', (req, res) => {
  const profile = db.prepare('SELECT * FROM training_profiles WHERE id = ?').get(req.params.id) as any
  if (!profile) return res.status(404).json({ error: 'Training profile not found' }) as any

  const runId = uuid()
  const now = new Date().toISOString()

  // Run kaydı oluştur
  db.prepare(`
    INSERT INTO training_runs (id, profile_id, status, started_at)
    VALUES (?, ?, 'analyzing', ?)
  `).run(runId, profile.id, now)

  // Profil durumunu güncelle
  db.prepare("UPDATE training_profiles SET status = 'analyzing', updated_at = ? WHERE id = ?").run(now, profile.id)

  const updatedProfile = rowToProfile(db.prepare('SELECT * FROM training_profiles WHERE id = ?').get(profile.id))
  broadcastAll({ type: 'training:update', profile: updatedProfile })

  // Koç prompt'u oluştur
  let coachPrompt: string

  if (profile.mode === 'project') {
    coachPrompt = `Sen bir ajan eğitim koçusun. Aşağıdaki proje hakkında kapsamlı bir eğitim dokümanı oluştur.

Kullanıcı açıklaması: ${profile.user_prompt || 'Proje hakkında genel eğitim dokümanı oluştur.'}

Şu adımları izle:
1. Proje yapısını analiz et (dosya ağacı, ana klasörler)
2. Kullanılan teknolojileri belirle (framework, DB, paket yöneticisi)
3. Mimari kalıpları tespit et (katmanlı yapı, DI, repository pattern vb.)
4. Kritik dosya ve dizinleri listele
5. Kodlama konvansiyonlarını belirle (naming, import düzeni, hata yönetimi)
6. Tipik iş akışlarını dokümante et (yeni endpoint ekleme, DB değişikliği vb.)
7. Önemli bağımlılıkları ve konfigürasyonları belirle

Çıktın Markdown formatında, kapsamlı ve ajan için doğrudan kullanılabilir olmalı.
Ajanın bu projeye yeni katılmış bir geliştirici gibi hemen çalışabilmesini sağla.
Sadece Markdown çıktı ver, başka açıklama yapma.`
  } else {
    coachPrompt = `Sen bir ajan eğitim koçusun. "${profile.source || profile.name}" teknolojisi konusunda kapsamlı bir eğitim dokümanı oluştur.

Kullanıcı istekleri: ${profile.user_prompt || 'Bu teknoloji hakkında kapsamlı eğitim dokümanı oluştur.'}

Şu konuları kapsa:
1. Temel kavramlar ve mimari
2. Proje yapısı best practices
3. Güncel API referansları ve kullanım kalıpları
4. Yaygın hatalar ve çözümleri
5. Performans optimizasyonu
6. Test stratejileri
7. Deployment ve production best practices
8. Güncel versiyon özellikleri ve değişiklikler

En güncel bilgileri kullan. Çıktın Markdown formatında olmalı.
Ajan bu teknolojiyle profesyonel seviyede çalışabilecek bilgiye sahip olmalı.
Sadece Markdown çıktı ver, başka açıklama yapma.`
  }

  // Claude CLI'ı async olarak çalıştır
  const cliArgs: string[] = ['--print']

  // Proje modu: --directory ile proje dizinine git
  if (profile.mode === 'project' && profile.source) {
    cliArgs.push('--directory', profile.source)
  }

  // Async spawn — response'ı hemen döner, sonuç WS ile broadcast edilir
  const child = spawn('claude', cliArgs, {
    shell: true,
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  let stdout = ''
  let stderr = ''

  child.stdout.on('data', (data: Buffer) => {
    stdout += data.toString()
  })

  child.stderr.on('data', (data: Buffer) => {
    stderr += data.toString()
  })

  // stdin'e prompt'u yaz
  child.stdin.write(coachPrompt)
  child.stdin.end()

  child.on('close', (code: number | null) => {
    const completedAt = new Date().toISOString()

    if (code !== 0 || !stdout.trim()) {
      // Hata durumu
      const errorMsg = stderr || 'Claude çalıştırılamadı veya boş çıktı döndü'
      db.prepare("UPDATE training_runs SET status = 'error', error = ?, completed_at = ? WHERE id = ?")
        .run(errorMsg.slice(0, 2000), completedAt, runId)
      db.prepare("UPDATE training_profiles SET status = 'error', updated_at = ? WHERE id = ?")
        .run(completedAt, profile.id)

      const errorProfile = rowToProfile(db.prepare('SELECT * FROM training_profiles WHERE id = ?').get(profile.id))
      broadcastAll({ type: 'training:update', profile: errorProfile })
      return
    }

    // Claude CLI bazen JSON sarılı döner
    let content: string
    try {
      const output = JSON.parse(stdout)
      content = output.result ?? output.content ?? stdout
    } catch {
      content = stdout
    }

    // Markdown bloğu varsa çıkar
    const mdMatch = content.match(/```markdown\s*([\s\S]+?)\s*```/)
    if (mdMatch) content = mdMatch[1]

    // Profil içeriğini güncelle
    db.prepare("UPDATE training_profiles SET content = ?, status = 'done', updated_at = ? WHERE id = ?")
      .run(content.trim(), completedAt, profile.id)
    db.prepare("UPDATE training_runs SET status = 'done', completed_at = ? WHERE id = ?")
      .run(completedAt, runId)

    const doneProfile = rowToProfile(db.prepare('SELECT * FROM training_profiles WHERE id = ?').get(profile.id))
    const doneRun = rowToRun(db.prepare('SELECT * FROM training_runs WHERE id = ?').get(runId))
    broadcastAll({ type: 'training:update', profile: doneProfile })
    broadcastAll({ type: 'training:run', run: doneRun })
  })

  // İlk response hemen dönüyor (async)
  const run = rowToRun(db.prepare('SELECT * FROM training_runs WHERE id = ?').get(runId))
  res.json(run)
})

// GET /api/training-profiles/:id/runs
trainingRouter.get('/training-profiles/:id/runs', (req, res) => {
  const runs = db.prepare('SELECT * FROM training_runs WHERE profile_id = ? ORDER BY started_at DESC').all(req.params.id) as any[]
  res.json(runs.map(rowToRun))
})

// ─── Export / Import ───

// GET /api/training-profiles/:id/export
trainingRouter.get('/training-profiles/:id/export', (req, res) => {
  const profile = db.prepare('SELECT * FROM training_profiles WHERE id = ?').get(req.params.id) as any
  if (!profile) return res.status(404).json({ error: 'Training profile not found' }) as any

  const exportData = {
    _type: 'smith-training-profile',
    _version: 1,
    name: profile.name,
    description: profile.description,
    content: profile.content,
    mode: profile.mode,
    source: profile.source,
    userPrompt: profile.user_prompt,
    exportedAt: new Date().toISOString(),
  }

  res.setHeader('Content-Disposition', `attachment; filename="training-${profile.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.json"`)
  res.setHeader('Content-Type', 'application/json')
  res.json(exportData)
})

// POST /api/training-profiles/import
trainingRouter.post('/training-profiles/import', (req, res) => {
  const data = req.body
  if (!data || data._type !== 'smith-training-profile') {
    return res.status(400).json({ error: 'Invalid training profile format' }) as any
  }
  if (!data.name) {
    return res.status(400).json({ error: 'name is required in import data' }) as any
  }

  const id = uuid()
  const now = new Date().toISOString()
  const status = data.content ? 'done' : 'pending'

  db.prepare(`
    INSERT INTO training_profiles (id, name, description, content, mode, source, user_prompt, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.name, data.description || '', data.content || '', data.mode || 'technology', data.source || '', data.userPrompt || '', status, now)

  const profile = rowToProfile(db.prepare('SELECT * FROM training_profiles WHERE id = ?').get(id))
  broadcastAll({ type: 'training:update', profile })
  res.status(201).json(profile)
})

// ─── Agent Training Assignment ───

// GET /api/agents/:agentId/training
trainingRouter.get('/agents/:agentId/training', (req, res) => {
  const agent = db.prepare('SELECT training_profile_id FROM agents WHERE id = ?').get(req.params.agentId) as any
  if (!agent) return res.status(404).json({ error: 'Agent not found' }) as any
  if (!agent.training_profile_id) return res.json(null) as any

  const profile = db.prepare('SELECT * FROM training_profiles WHERE id = ?').get(agent.training_profile_id) as any
  if (!profile) return res.json(null) as any
  res.json(rowToProfile(profile))
})

// POST /api/agents/:agentId/training
trainingRouter.post('/agents/:agentId/training', (req, res) => {
  const { profileId } = req.body
  if (!profileId) return res.status(400).json({ error: 'profileId is required' }) as any

  const agent = db.prepare('SELECT id FROM agents WHERE id = ?').get(req.params.agentId) as any
  if (!agent) return res.status(404).json({ error: 'Agent not found' }) as any

  const profile = db.prepare('SELECT id FROM training_profiles WHERE id = ?').get(profileId) as any
  if (!profile) return res.status(404).json({ error: 'Training profile not found' }) as any

  db.prepare('UPDATE agents SET training_profile_id = ? WHERE id = ?').run(profileId, req.params.agentId)
  res.json({ success: true })
})

// DELETE /api/agents/:agentId/training
trainingRouter.delete('/agents/:agentId/training', (req, res) => {
  const agent = db.prepare('SELECT id FROM agents WHERE id = ?').get(req.params.agentId) as any
  if (!agent) return res.status(404).json({ error: 'Agent not found' }) as any

  db.prepare('UPDATE agents SET training_profile_id = NULL WHERE id = ?').run(req.params.agentId)
  res.json({ success: true })
})
