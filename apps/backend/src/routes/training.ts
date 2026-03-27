import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { spawnSync, spawn } from 'child_process'
import { db } from '../db/database'
import { broadcastAll } from '../ws/server'
import { detectRateLimit } from '../agents/processManager'

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

// ─── Training Status Reset ───

// POST /api/training-profiles/:id/reset — Takılı kalan eğitimi sıfırla
trainingRouter.post('/training-profiles/:id/reset', (req, res) => {
  const profile = db.prepare('SELECT * FROM training_profiles WHERE id = ?').get(req.params.id) as any
  if (!profile) return res.status(404).json({ error: 'Training profile not found' }) as any

  const now = new Date().toISOString()
  db.prepare("UPDATE training_profiles SET status = 'pending', updated_at = ? WHERE id = ?").run(now, req.params.id)

  // Aktif run varsa error olarak işaretle
  db.prepare("UPDATE training_runs SET status = 'error', error = 'Manuel sıfırlama', completed_at = ? WHERE profile_id = ? AND status IN ('analyzing', 'generating')")
    .run(now, req.params.id)

  const updated = rowToProfile(db.prepare('SELECT * FROM training_profiles WHERE id = ?').get(req.params.id))
  broadcastAll({ type: 'training:update', profile: updated })
  res.json(updated)
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
    coachPrompt = `Sen bir ajan eğitim koçusun. Bu proje dizinini analiz et ve kapsamlı bir eğitim dokümanı oluştur.

Kullanıcı açıklaması: ${profile.user_prompt || 'Proje hakkında genel eğitim dokümanı oluştur.'}

Şu adımları izle:
1. Proje yapısını analiz et (dosya ağacı, ana klasörler)
2. Kullanılan teknolojileri belirle (framework, DB, paket yöneticisi)
3. Mimari kalıpları tespit et (katmanlı yapı, DI, repository pattern vb.)
4. Kritik dosya ve dizinleri listele
5. Kodlama konvansiyonlarını belirle (naming, import düzeni, hata yönetimi)
6. Tipik iş akışlarını dokümante et (yeni endpoint ekleme, DB değişikliği vb.)
7. Önemli bağımlılıkları ve konfigürasyonları belirle

ÖNEMLİ KURALLAR:
- Çıktını düz Markdown olarak ver. Markdown code fence (\`\`\`markdown ... \`\`\`) ile SARMA.
- Tüm bölümleri eksiksiz yaz. Yarıda bırakma, kısaltma, "..." ile atlama yapma.
- Her bölümü bitir, sonra bir sonrakine geç. Dokümanı tam tamamla.
- Ajanın bu projeye yeni katılmış bir geliştirici gibi hemen çalışabilmesini sağla.`
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

ÖNEMLİ KURALLAR:
- Çıktını düz Markdown olarak ver. Markdown code fence (\`\`\`markdown ... \`\`\`) ile SARMA.
- Tüm bölümleri eksiksiz yaz. Yarıda bırakma, kısaltma, "..." ile atlama yapma.
- Her bölümü bitir, sonra bir sonrakine geç. Dokümanı tam tamamla.
- Ajan bu teknolojiyle profesyonel seviyede çalışabilecek bilgiye sahip olmalı.`
  }

  // Claude CLI'ı async olarak çalıştır
  const cliArgs: string[] = ['--print', '--output-format', 'text', '--verbose']

  // Proje modu: cwd olarak proje dizinini kullan (Claude o dizindeki dosyaları görür)
  const cwd = (profile.mode === 'project' && profile.source)
    ? profile.source.trim()
    : process.cwd()

  // Async spawn — response'ı hemen döner, sonuç WS ile broadcast edilir
  console.log(`[Training] Başlatılıyor: ${profile.name} (mode: ${profile.mode}, cwd: ${cwd})`)
  console.log(`[Training] CLI args: claude ${cliArgs.join(' ')}`)

  const child = spawn('claude', cliArgs, {
    cwd,
    shell: true,
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  // 10 dakika timeout — takılma durumunda süreci sonlandır
  const TRAINING_TIMEOUT = 10 * 60 * 1000
  const timeoutHandle = setTimeout(() => {
    console.warn(`[Training] Timeout: ${profile.name} (${TRAINING_TIMEOUT / 1000}s)`)
    child.kill('SIGTERM')
    setTimeout(() => { try { child.kill('SIGKILL') } catch {} }, 5000)
  }, TRAINING_TIMEOUT)

  let stdout = ''
  let stderr = ''

  child.stdout.on('data', (data: Buffer) => {
    stdout += data.toString()
  })

  child.stderr.on('data', (data: Buffer) => {
    stderr += data.toString()
  })

  // spawn hatası yakala (ör. claude komutu bulunamadı)
  child.on('error', (err) => {
    clearTimeout(timeoutHandle)
    const completedAt = new Date().toISOString()
    const errorMsg = `Spawn hatası: ${err.message}. Claude CLI yolu kontrol edin. Platform: ${process.platform}`
    console.error(`[Training] ${errorMsg}`)
    db.prepare("UPDATE training_runs SET status = 'error', error = ?, completed_at = ? WHERE id = ?")
      .run(errorMsg, completedAt, runId)
    db.prepare("UPDATE training_profiles SET status = 'error', updated_at = ? WHERE id = ?")
      .run(completedAt, profile.id)
    const errorProfile = rowToProfile(db.prepare('SELECT * FROM training_profiles WHERE id = ?').get(profile.id))
    broadcastAll({ type: 'training:update', profile: errorProfile })
  })

  // stdin'e prompt'u yaz
  child.stdin.write(coachPrompt)
  child.stdin.end()

  child.on('close', (code: number | null, signal: string | null) => {
    clearTimeout(timeoutHandle)
    const completedAt = new Date().toISOString()

    console.log(`[Training] Process kapandı: code=${code}, signal=${signal}, stdout=${stdout.length} bytes, stderr=${stderr.length} bytes`)
    if (stderr) console.log(`[Training] stderr: ${stderr.slice(0, 1000)}`)

    if ((code !== 0 && code !== null) || !stdout.trim()) {
      // Rate limit algılama — otomatik yeniden deneme
      const rateLimitInfo = detectRateLimit(stderr + ' ' + stdout)
      if (rateLimitInfo) {
        const delayMs = rateLimitInfo.retryAt.getTime() - Date.now()
        const retryTimeStr = rateLimitInfo.retryAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        const MAX_WAIT_MS = 4 * 60 * 60 * 1000

        console.log(`[Training] Rate limit: ${profile.name} — ${rateLimitInfo.rawMatch}, retry at ${retryTimeStr}`)

        if (delayMs > 0 && delayMs <= MAX_WAIT_MS) {
          // Profili pending'e çevir (UI'da "Bekliyor" görünür)
          db.prepare("UPDATE training_profiles SET status = 'pending', updated_at = ? WHERE id = ?").run(completedAt, profile.id)
          db.prepare("UPDATE training_runs SET status = 'error', error = ?, completed_at = ? WHERE id = ?")
            .run(`Rate limit — saat ${retryTimeStr}'de tekrar denenecek`, completedAt, runId)

          const pendingProfile = rowToProfile(db.prepare('SELECT * FROM training_profiles WHERE id = ?').get(profile.id))
          broadcastAll({ type: 'training:update', profile: pendingProfile })

          // Zamanlı yeniden deneme
          setTimeout(async () => {
            try {
              console.log(`[Training] Rate limit retry başlatılıyor: ${profile.name}`)
              // POST /training-profiles/:id/train endpoint'ini dahili olarak çağır
              const currentProfile = db.prepare('SELECT * FROM training_profiles WHERE id = ?').get(profile.id) as any
              if (currentProfile && currentProfile.status === 'pending') {
                // Doğrudan endpoint'e fetch yapmak yerine, profili analyzing'e çevir ve yeni spawn başlat
                // Bu basit yaklaşım: profil hala pending ise tekrar eğitim başlat sinyali gönder
                broadcastAll({ type: 'training:retry', profileId: profile.id })
              }
            } catch (e: any) {
              console.error(`[Training] Rate limit retry hatası: ${e.message}`)
            }
          }, delayMs)
        } else {
          db.prepare("UPDATE training_runs SET status = 'error', error = ?, completed_at = ? WHERE id = ?")
            .run(`Rate limit (${rateLimitInfo.rawMatch}) — bekleme süresi çok uzun`, completedAt, runId)
          db.prepare("UPDATE training_profiles SET status = 'error', updated_at = ? WHERE id = ?")
            .run(completedAt, profile.id)
          const errorProfile = rowToProfile(db.prepare('SELECT * FROM training_profiles WHERE id = ?').get(profile.id))
          broadcastAll({ type: 'training:update', profile: errorProfile })
        }
        return
      }

      // Hata durumu
      let errorMsg: string
      if (signal) {
        errorMsg = `Process sinyal ile sonlandırıldı: ${signal}. Timeout veya bellek sorunu olabilir.`
      } else if (code === null) {
        errorMsg = `Process beklenmedik şekilde kapandı (code: null). stderr: ${stderr.slice(0, 500) || 'boş'}`
      } else if (!stdout.trim()) {
        errorMsg = `Claude boş çıktı döndü (çıkış kodu: ${code}). stderr: ${stderr.slice(0, 500) || 'boş'}`
      } else {
        errorMsg = stderr
          ? `Çıkış kodu: ${code}\n${stderr.slice(0, 1000)}`
          : `Claude çıkış kodu: ${code}`
      }
      console.error(`[Training] Hata: ${errorMsg.slice(0, 500)}`)
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

    // Markdown bloğu varsa çıkar — greedy match ile tüm içeriği al
    const mdMatch = content.match(/```markdown\s*([\s\S]+)\s*```\s*$/)
    if (mdMatch) content = mdMatch[1]

    // Profil içeriğini güncelle
    console.log(`[Training] Tamamlandı: ${profile.name} (${content.length} karakter)`)
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

// ─── GitHub / MD Toplu İçe Aktarma ───

// Dosya adından profil adı oluştur: "engineering-code-reviewer.md" → "Engineering Code Reviewer"
function fileNameToProfileName(fileName: string): string {
  return fileName
    .replace(/\.md$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

// GitHub API helper
const ghHeaders = { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'SmithAgentOffice' }

async function fetchGhDir(owner: string, repo: string, dirPath: string, branch: string): Promise<any[]> {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${dirPath}?ref=${branch}`
  const resp = await fetch(apiUrl, { headers: ghHeaders })
  if (!resp.ok) throw new Error(`GitHub API hatası: ${resp.status}`)
  return await resp.json() as any[]
}

async function fetchRawFile(url: string): Promise<string> {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Dosya indirilemedi: ${resp.status}`)
  return await resp.text()
}

// GitHub URL'den repo bilgilerini çıkar
function parseGithubUrl(url: string): { owner: string; repo: string; branch: string; dirPath: string } | null {
  // github.com/user/repo/tree/branch/path
  const treeMatch = url.match(/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+?)\/?\s*$/)
  if (treeMatch) return { owner: treeMatch[1], repo: treeMatch[2], branch: treeMatch[3], dirPath: treeMatch[4] }

  // github.com/user/repo (root)
  const repoMatch = url.match(/github\.com\/([^/]+)\/([^/]+?)\/?$/)
  if (repoMatch) return { owner: repoMatch[1], repo: repoMatch[2], branch: 'main', dirPath: '' }

  return null
}

// POST /api/training-profiles/import-url — GitHub URL'den MD dosyaları çek
// Desteklenen yapılar:
// 1. Düz klasör: her .md dosyası → ayrı profil
// 2. Plugin yapısı (skills/ altında alt klasörler): her alt klasördeki tüm .md → tek profil olarak birleştirilir
// 3. Repo root: plugin.json varsa skills + agents otomatik çekilir
trainingRouter.post('/training-profiles/import-url', async (req, res) => {
  const { url } = req.body
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' }) as any
  }

  try {
    const profiles: any[] = []
    const now = new Date().toISOString()

    // Raw URL: tek dosya
    if (url.includes('raw.githubusercontent.com') && url.endsWith('.md')) {
      const content = await fetchRawFile(url)
      const fileName = url.split('/').pop() || 'imported.md'

      const id = uuid()
      db.prepare(`
        INSERT INTO training_profiles (id, name, description, content, mode, source, user_prompt, status, created_at)
        VALUES (?, ?, ?, ?, 'technology', ?, '', 'done', ?)
      `).run(id, fileNameToProfileName(fileName), `GitHub: ${fileName}`, content, url, now)
      profiles.push(rowToProfile(db.prepare('SELECT * FROM training_profiles WHERE id = ?').get(id)))

    } else {
      const gh = parseGithubUrl(url)
      if (!gh) throw new Error('Geçersiz GitHub URL. Beklenen: github.com/user/repo veya github.com/user/repo/tree/branch/path')

      const { owner, repo, branch, dirPath } = gh

      // Repo root veya plugin yapısı mı kontrol et
      let targetPath = dirPath
      let isPluginRepo = false

      if (!dirPath) {
        // Root URL: plugin.json var mı kontrol et
        try {
          const rootFiles = await fetchGhDir(owner, repo, '', branch)
          const hasPluginDir = rootFiles.some((f: any) => f.name === '.claude-plugin' && f.type === 'dir')
          const hasSkillsDir = rootFiles.some((f: any) => f.name === 'skills' && f.type === 'dir')
          const hasAgentsDir = rootFiles.some((f: any) => f.name === 'agents' && f.type === 'dir')

          if (hasPluginDir || hasSkillsDir) {
            isPluginRepo = true
            // Skills ve agents klasörlerini tara
            if (hasSkillsDir) targetPath = 'skills'

            // Agents klasörünü de çek
            if (hasAgentsDir) {
              const agentFiles = await fetchGhDir(owner, repo, 'agents', branch)
              const agentMds = agentFiles.filter((f: any) => f.type === 'file' && f.name.endsWith('.md'))
              for (const file of agentMds) {
                try {
                  const content = await fetchRawFile(file.download_url)
                  const id = uuid()
                  db.prepare(`
                    INSERT INTO training_profiles (id, name, description, content, mode, source, user_prompt, status, created_at)
                    VALUES (?, ?, ?, ?, 'technology', ?, '', 'done', ?)
                  `).run(id, fileNameToProfileName(file.name), `Agent: ${repo}/${file.name}`, content, file.download_url, now)
                  const profile = rowToProfile(db.prepare('SELECT * FROM training_profiles WHERE id = ?').get(id))
                  broadcastAll({ type: 'training:update', profile })
                  profiles.push(profile)
                } catch (e: any) {
                  console.error(`[Training] Agent ${file.name} indirilemedi: ${e.message}`)
                }
              }
            }
          } else {
            // Düz repo — root'taki MD'leri çek
            const mdFiles = rootFiles.filter((f: any) => f.type === 'file' && f.name.endsWith('.md') && f.name !== 'README.md' && f.name !== 'LICENSE')
            for (const file of mdFiles) {
              try {
                const content = await fetchRawFile(file.download_url)
                const id = uuid()
                db.prepare(`
                  INSERT INTO training_profiles (id, name, description, content, mode, source, user_prompt, status, created_at)
                  VALUES (?, ?, ?, ?, 'technology', ?, '', 'done', ?)
                `).run(id, fileNameToProfileName(file.name), `GitHub: ${repo}/${file.name}`, content, file.download_url, now)
                const profile = rowToProfile(db.prepare('SELECT * FROM training_profiles WHERE id = ?').get(id))
                broadcastAll({ type: 'training:update', profile })
                profiles.push(profile)
              } catch {}
            }
            if (profiles.length === 0) throw new Error('Repoda skill dosyası bulunamadı')
            res.json({ profiles, count: profiles.length })
            return
          }
        } catch (e: any) {
          if (profiles.length > 0) { res.json({ profiles, count: profiles.length }); return }
          throw e
        }
      }

      // Hedef dizini listele
      const entries = await fetchGhDir(owner, repo, targetPath, branch)
      const mdFiles = entries.filter((f: any) => f.type === 'file' && f.name.endsWith('.md'))
      const subDirs = entries.filter((f: any) => f.type === 'dir')

      // Alt klasörler varsa → her klasör = bir skill profili (tüm MD'leri birleştir)
      if (subDirs.length > 0) {
        for (const dir of subDirs) {
          try {
            const subEntries = await fetchGhDir(owner, repo, `${targetPath}/${dir.name}`, branch)
            const subMds = subEntries.filter((f: any) => f.type === 'file' && f.name.endsWith('.md'))
            if (subMds.length === 0) continue

            // Tüm MD dosyalarını birleştir — SKILL.md önce
            const sorted = subMds.sort((a: any, b: any) => {
              if (a.name === 'SKILL.md') return -1
              if (b.name === 'SKILL.md') return 1
              return a.name.localeCompare(b.name)
            })

            let combinedContent = ''
            for (const file of sorted) {
              try {
                const content = await fetchRawFile(file.download_url)
                combinedContent += `${combinedContent ? '\n\n---\n\n' : ''}${content}`
              } catch {}
            }

            if (!combinedContent.trim()) continue

            const id = uuid()
            const profileName = fileNameToProfileName(dir.name)
            db.prepare(`
              INSERT INTO training_profiles (id, name, description, content, mode, source, user_prompt, status, created_at)
              VALUES (?, ?, ?, ?, 'technology', ?, '', 'done', ?)
            `).run(id, profileName, `Skill: ${repo}/${dir.name} (${sorted.length} dosya)`, combinedContent, `https://github.com/${owner}/${repo}/tree/${branch}/${targetPath}/${dir.name}`, now)
            const profile = rowToProfile(db.prepare('SELECT * FROM training_profiles WHERE id = ?').get(id))
            broadcastAll({ type: 'training:update', profile })
            profiles.push(profile)
          } catch (e: any) {
            console.error(`[Training] Klasör ${dir.name} işlenemedi: ${e.message}`)
          }
        }
      }

      // Kök dizindeki MD dosyalarını da ekle (README hariç)
      for (const file of mdFiles) {
        if (file.name === 'README.md' || file.name === 'LICENSE') continue
        try {
          const content = await fetchRawFile(file.download_url)
          const id = uuid()
          db.prepare(`
            INSERT INTO training_profiles (id, name, description, content, mode, source, user_prompt, status, created_at)
            VALUES (?, ?, ?, ?, 'technology', ?, '', 'done', ?)
          `).run(id, fileNameToProfileName(file.name), `GitHub: ${repo}/${file.name}`, content, file.download_url, now)
          const profile = rowToProfile(db.prepare('SELECT * FROM training_profiles WHERE id = ?').get(id))
          broadcastAll({ type: 'training:update', profile })
          profiles.push(profile)
        } catch {}
      }

      if (profiles.length === 0) throw new Error('Dizinde .md dosyası veya skill klasörü bulunamadı')
    }

    res.json({ profiles, count: profiles.length })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

// POST /api/training-profiles/import-md — Lokal MD dosyaları yükle
trainingRouter.post('/training-profiles/import-md', (req, res) => {
  const { files } = req.body
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'files array is required' }) as any
  }

  const profiles: any[] = []
  const now = new Date().toISOString()

  for (const file of files) {
    if (!file.name || !file.content) continue
    const id = uuid()
    db.prepare(`
      INSERT INTO training_profiles (id, name, description, content, mode, source, user_prompt, status, created_at)
      VALUES (?, ?, ?, ?, 'technology', ?, '', 'done', ?)
    `).run(id, fileNameToProfileName(file.name), `Dosya: ${file.name}`, file.content, file.name, now)
    const profile = rowToProfile(db.prepare('SELECT * FROM training_profiles WHERE id = ?').get(id))
    broadcastAll({ type: 'training:update', profile })
    profiles.push(profile)
  }

  res.json({ profiles, count: profiles.length })
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
