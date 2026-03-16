import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { db } from '../db/database'

export const seedRouter = Router()

// POST /api/seed-demo
seedRouter.post('/seed-demo', (_req, res) => {
  const now = new Date().toISOString()

  const seedAll = db.transaction(() => {
    // Kısa benzersiz suffix (tekrarlayan seed'lerde çakışmayı önler)
    const suffix = Date.now().toString(36).slice(-4)

    // ─── 1. Office ───
    const officeId = uuid()
    db.prepare(
      'INSERT INTO offices (id, name, description, theme, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(officeId, `Simit Yazılım Ofisi — ${suffix}`, 'Demo: Tic Tac Toe WebSocket Multiplayer projesi — tüm sistem özelliklerini sergiler', 'light', now)

    // ─── 2. Agents ───
    const agents = [
      {
        id: uuid(), name: 'Baykuş (PM)', role: 'Proje Yöneticisi', animal: 'owl',
        model: 'claude-opus-4-6', maxTurns: 30, effortLevel: 'high',
        deskX: 0, deskY: 0,
        allowedTools: JSON.stringify(['Read', 'Grep', 'Glob', 'Bash', 'TodoWrite', 'Task']),
        disallowedTools: JSON.stringify([]),
        systemPrompt: `Sen "Baykuş" adında deneyimli bir Proje Yöneticisisin.

## Görevlerin:
- Tic Tac Toe WebSocket projesini orkestra et
- Takım üyelerine görev ata ve takip et
- Her görev tamamlandığında geri bildirim ver
- Kod kalitesini ve mimari kararları denetle
- Engelleri tespit edip çözüm üret

## İletişim Kuralları:
- Türkçe konuş
- Net ve kısa talimatlar ver
- Her milestone sonunda durum raporu hazırla
- Takım motivasyonunu yüksek tut
- Sorun varsa çözüm önerisiyle birlikte bildir

## Proje Bilgisi:
2 oyuncunun WebSocket üzerinden gerçek zamanlı oynayacağı bir Tic Tac Toe oyunu geliştiriyoruz.
Backend: Node.js + ws kütüphanesi
Frontend: Vanilla HTML/CSS/JS
İletişim: WebSocket (JSON mesajlar)`,
      },
      {
        id: uuid(), name: 'Ayı (Backend)', role: 'Backend Geliştirici', animal: 'bear',
        model: 'claude-sonnet-4-6', maxTurns: 30, effortLevel: 'high',
        deskX: 1, deskY: 0,
        allowedTools: JSON.stringify(['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob']),
        disallowedTools: JSON.stringify(['WebSearch', 'WebFetch']),
        systemPrompt: `Sen "Ayı" adında uzman bir Backend Geliştiricisin.

## Uzmanlık Alanların:
- Node.js ve WebSocket (ws kütüphanesi)
- Gerçek zamanlı sunucu mimarisi
- Oyun mantığı implementasyonu
- API tasarımı

## Görevlerin:
- WebSocket sunucusu kur (oda yönetimi, oyuncu eşleştirme)
- Oyun mantığını implemente et (hamle doğrulama, kazanma kontrolü, beraberlik tespiti)
- Sıra yönetimi ve oyun durumu senkronizasyonu
- Hata yönetimi ve bağlantı kopması senaryoları

## Teknik Gereksinimler:
- ws kütüphanesi kullan (socket.io DEĞİL)
- Her oda 2 oyuncu kapasiteli
- JSON mesaj protokolü: { type, payload }
- Mesaj tipleri: join, move, gameState, error, gameOver

## İletişim:
- Türkçe konuş
- Kod yazarken yorum satırlarını Türkçe yaz
- PM'e ilerleme raporu ver
- Frontend geliştiriciye API dökümanı sun`,
      },
      {
        id: uuid(), name: 'Tilki (Frontend)', role: 'Frontend Geliştirici', animal: 'fox',
        model: 'claude-sonnet-4-6', maxTurns: 30, effortLevel: 'high',
        deskX: 2, deskY: 0,
        allowedTools: JSON.stringify(['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob']),
        disallowedTools: JSON.stringify(['WebSearch', 'WebFetch']),
        systemPrompt: `Sen "Tilki" adında yetenekli bir Frontend Geliştiricisin.

## Uzmanlık Alanların:
- HTML5, CSS3, JavaScript (vanilla)
- WebSocket client implementasyonu
- Responsive ve şık UI tasarımı
- Kullanıcı deneyimi (UX)

## Görevlerin:
- 3x3 Tic Tac Toe oyun tahtası oluştur
- WebSocket client bağlantısı kur
- Hamle gönderme ve alma mekanizması
- Oyun durumu göstergesi (sıra, kazanan, beraberlik)
- 2 tarayıcı sekmesinde eş zamanlı oynanabilir olmalı

## Tasarım Gereksinimleri:
- Modern ve temiz UI (CSS Grid kullan)
- X ve O için farklı renkler
- Kazanan kombinasyonunu vurgula
- Bağlantı durumu göstergesi
- Yeniden başlat butonu

## İletişim:
- Türkçe konuş
- Backend API'sine uygun WebSocket mesajları kullan
- PM'e UI kararlarını danış`,
      },
      {
        id: uuid(), name: 'Rakun (Test)', role: 'Test Mühendisi', animal: 'raccoon',
        model: 'claude-haiku-4-5-20251001', maxTurns: 15, effortLevel: 'medium',
        deskX: 0, deskY: 1,
        allowedTools: JSON.stringify(['Read', 'Bash', 'Grep', 'Glob', 'Write']),
        disallowedTools: JSON.stringify(['Edit']),
        systemPrompt: `Sen "Rakun" adında titiz bir Test Mühendisisin.

## Uzmanlık Alanların:
- Test planı oluşturma
- Birim test ve entegrasyon test yazma
- Edge case tespiti
- Hata raporlama

## Test Senaryoları:
1. Oyun mantığı testleri:
   - Geçerli/geçersiz hamle kontrolü
   - Tüm kazanma kombinasyonları (yatay, dikey, çapraz)
   - Beraberlik tespiti
   - Sıra kontrolü

2. WebSocket testleri:
   - Bağlantı kurma/kopma
   - Oda oluşturma ve katılma
   - Eşzamanlı mesaj alışverişi
   - Hata mesajları

3. Frontend testleri:
   - UI elementlerinin varlığı
   - Tıklama olayları
   - Durum göstergeleri

## İletişim:
- Türkçe konuş
- Bulunan hataları detaylı raporla
- Öncelik seviyesi belirt (kritik/orta/düşük)
- Yeniden test sonuçlarını paylaş`,
      },
      {
        id: uuid(), name: 'Fil (İnceleme)', role: 'Kod İncelemeci', animal: 'elephant',
        model: 'claude-sonnet-4-6', maxTurns: 15, effortLevel: 'medium',
        deskX: 1, deskY: 1,
        allowedTools: JSON.stringify(['Read', 'Grep', 'Glob']),
        disallowedTools: JSON.stringify(['Write', 'Edit', 'Bash']),
        systemPrompt: `Sen "Fil" adında deneyimli bir Kod İncelemecisisin.

## Uzmanlık Alanların:
- Kod kalitesi ve best practice analizi
- Güvenlik açığı tespiti
- Performans değerlendirmesi
- Mimari inceleme

## İnceleme Kriterlerin:
1. **Güvenlik**: Input validation, XSS, injection riskleri
2. **Mimari**: Separation of concerns, modülerlik
3. **Performans**: Gereksiz hesaplama, bellek sızıntısı
4. **Okunabilirlik**: Değişken isimlendirme, kod organizasyonu
5. **Hata Yönetimi**: Try-catch, edge case'ler

## Çıktı Formatı:
Her dosya için:
- ✅ İyi yönler
- ⚠️ Uyarılar
- ❌ Kritik sorunlar
- 💡 İyileştirme önerileri

## İletişim:
- Türkçe konuş
- Yapıcı geri bildirim ver
- Alternatif çözüm öner
- Sadece OKU, değiştirme (read-only rol)`,
      },
    ]

    const insertAgent = db.prepare(`
      INSERT INTO agents (id, office_id, name, role, animal, system_prompt, model, max_turns,
        effort_level, allowed_tools, disallowed_tools, environment_vars,
        desk_x, desk_y, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?, 'idle', ?)
    `)

    for (const a of agents) {
      insertAgent.run(
        a.id, officeId, a.name, a.role, a.animal, a.systemPrompt,
        a.model, a.maxTurns, a.effortLevel, a.allowedTools, a.disallowedTools,
        a.deskX, a.deskY, now
      )
    }

    const pmAgent = agents[0]
    const backendAgent = agents[1]
    const frontendAgent = agents[2]
    const testerAgent = agents[3]
    const reviewerAgent = agents[4]

    // ─── 3. Skills ───
    const skills = [
      {
        id: uuid(),
        name: 'WebSocket Uzmanı',
        description: 'WebSocket protokolü, ws kütüphanesi ve gerçek zamanlı iletişim konularında uzmanlaşmış skill',
        category: 'dev',
        content: `# WebSocket Uzmanı

## Temel Bilgi
- WebSocket tam çift yönlü (full-duplex) iletişim protokolüdür
- HTTP üzerinden handshake ile başlar, sonra ws:// protokolüne yükseltilir
- \`ws\` kütüphanesi Node.js için en performanslı WebSocket implementasyonudur

## Best Practices
- Her bağlantıya benzersiz ID ata
- Heartbeat/ping-pong mekanizması kur (30sn aralıkla)
- Mesajları JSON formatında gönder: \`{ type: string, payload: any }\`
- Bağlantı kopmasında otomatik temizlik yap
- Oda (room) bazlı mesaj yönlendirmesi kullan

## Hata Yönetimi
- ECONNRESET ve timeout hatalarını yakala
- Reconnection stratejisi: exponential backoff
- Buffer overflow koruması: mesaj boyutu limiti koy

## Güvenlik
- Origin kontrolü yap
- Rate limiting uygula
- Mesaj validasyonu: beklenmeyen tipleri reddet`,
      },
      {
        id: uuid(),
        name: 'Test Stratejisti',
        description: 'Test planı oluşturma, birim test ve entegrasyon test yazma konularında uzman skill',
        category: 'testing',
        content: `# Test Stratejisti

## Test Piramidi
1. Birim Testler (en çok) — tek fonksiyon, izole
2. Entegrasyon Testleri — modüller arası etkileşim
3. E2E Testler (en az) — tam kullanıcı senaryosu

## Test Yazım Kuralları
- Her test tek bir davranışı doğrulamalı
- AAA pattern: Arrange → Act → Assert
- Test isimleri "should..." ile başlamalı
- Edge case'leri unutma: null, undefined, boş string, sınır değerler

## WebSocket Test Stratejisi
- Mock WebSocket server kullan
- Asenkron mesajlaşmayı Promise ile test et
- Bağlantı timeout senaryolarını test et
- Eşzamanlı oyuncu hareketlerini simüle et

## Raporlama
- Bulunan her hata için: adım adım yeniden üretme talimatı
- Beklenen vs gerçek sonuç karşılaştırması
- Ekran görüntüsü veya log çıktısı ekle`,
      },
      {
        id: uuid(),
        name: 'Kod İnceleme Rehberi',
        description: 'Sistematik kod inceleme, güvenlik analizi ve kalite değerlendirmesi rehberi',
        category: 'dev',
        content: `# Kod İnceleme Rehberi

## İnceleme Sırası
1. Genel mimari ve dosya yapısı
2. Güvenlik kontrolleri
3. Hata yönetimi
4. Performans
5. Okunabilirlik ve stil

## Güvenlik Checklist
- [ ] Input validation mevcut mu?
- [ ] SQL/NoSQL injection riski var mı?
- [ ] XSS koruması var mı?
- [ ] Sensitive data loglanıyor mu?
- [ ] Rate limiting var mı?
- [ ] CORS doğru yapılandırılmış mı?

## Performans Checklist
- [ ] Gereksiz döngü var mı?
- [ ] Memory leak riski var mı?
- [ ] Büyük veri setleri için pagination var mı?
- [ ] Caching stratejisi uygun mu?

## Puan Sistemi
- 🟢 Temiz kod, sorun yok
- 🟡 Küçük iyileştirmeler önerilir
- 🟠 Önemli sorunlar var, düzeltilmeli
- 🔴 Kritik sorun, merge edilmemeli`,
      },
      {
        id: uuid(),
        name: 'Proje Yönetimi',
        description: 'Agile proje yönetimi, görev takibi ve takım koordinasyonu skill\'i',
        category: 'general',
        content: `# Proje Yönetimi

## Görev Yönetimi
- Her görevi SMART kriterlerine göre tanımla (Specific, Measurable, Achievable, Relevant, Time-bound)
- Bağımlılıkları belirle ve kritik yolu takip et
- Blokaj varsa hemen müdahale et

## Takım Koordinasyonu
- Günlük durum toplantısı yap (stand-up)
- Her üyenin kapasitesini bil
- Paralel çalışabilecek görevleri belirle
- İletişim darboğazlarını çöz

## Risk Yönetimi
- Teknik riskleri önceden belirle
- Plan B hazırla
- Scope creep'e karşı dikkatli ol

## Raporlama
- İlerleme: tamamlanan/toplam görev
- Engeller ve çözüm önerileri
- Sonraki adımlar ve zaman tahmini`,
      },
    ]

    const insertSkill = db.prepare(
      'INSERT INTO skills (id, name, description, content, source, category, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    const insertAgentSkill = db.prepare(
      'INSERT INTO agent_skills (agent_id, skill_id) VALUES (?, ?)'
    )

    for (const s of skills) {
      insertSkill.run(s.id, s.name, s.description, s.content, 'seed-demo', s.category, now)
    }

    // Skill → Agent atamaları
    insertAgentSkill.run(pmAgent.id, skills[3].id)       // PM ← Proje Yönetimi
    insertAgentSkill.run(backendAgent.id, skills[0].id)   // Backend ← WebSocket Uzmanı
    insertAgentSkill.run(frontendAgent.id, skills[0].id)  // Frontend ← WebSocket Uzmanı
    insertAgentSkill.run(testerAgent.id, skills[1].id)    // Tester ← Test Stratejisti
    insertAgentSkill.run(reviewerAgent.id, skills[2].id)  // Reviewer ← Kod İnceleme Rehberi

    // ─── 4. Subagent ───
    const subagentId = uuid()
    db.prepare(
      'INSERT INTO subagents (id, name, description, prompt, model, max_turns, allowed_tools, disallowed_tools, scope, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      subagentId,
      `Araştırmacı — ${suffix}`,
      'Proje yöneticisi için bilgi toplayan read-only araştırma subagent\'ı',
      `Sen bir araştırma asistanısın. Görevin proje yöneticisine teknik bilgi toplamak.
Sadece oku, analiz et ve raporla. Hiçbir dosya oluşturma veya değiştirme.
WebSocket, oyun geliştirme ve Node.js konularında bilgi topla.`,
      'claude-haiku-4-5-20251001',
      10,
      JSON.stringify(['Read', 'Grep', 'Glob']),
      JSON.stringify(['Write', 'Edit', 'Bash']),
      'project',
      now
    )

    // PM'e subagent bağla
    db.prepare('UPDATE agents SET subagent_id = ? WHERE id = ?').run(subagentId, pmAgent.id)

    // ─── 5. Project ───
    const projectId = uuid()
    db.prepare(`
      INSERT INTO projects (id, office_id, name, description, status, work_dir,
        approval_policy, error_policy, workflow_mode, pm_agent_id, context_mode,
        extra_instructions, created_at)
      VALUES (?, ?, ?, ?, 'active', '', 'ask-pm', 'notify-pm', 'coordinated', ?, 'full', ?, ?)
    `).run(
      projectId, officeId,
      'Tic Tac Toe — WebSocket Multiplayer',
      '2 oyunculu gerçek zamanlı Tic Tac Toe oyunu. WebSocket ile iletişim. 2 tarayıcı sekmesinde eş zamanlı oynanabilir.',
      pmAgent.id,
      'Tüm kod yorumları ve commit mesajları Türkçe olmalıdır. Proje yapısı temiz ve modüler olmalıdır.',
      now
    )

    // ─── 6. Tasks ───
    const taskIds: string[] = []
    const taskDefs = [
      { desc: 'Proje yapısını oluştur: package.json, tsconfig.json, klasör yapısı (src/server, src/client, src/game), temel bağımlılıkları kur (ws, typescript)', agent: backendAgent.id, dep: null },
      { desc: 'WebSocket sunucusu kur: ws kütüphanesi ile HTTP server oluştur, oda yönetimi (oluşturma/katılma), oyuncu bağlantı/kopma yönetimi, JSON mesaj protokolü tanımla', agent: backendAgent.id, dep: 0 },
      { desc: 'Oyun mantığını implemente et: 3x3 tahta yönetimi, hamle doğrulama (geçerli hücre, doğru sıra), kazanma kontrolü (yatay/dikey/çapraz), beraberlik tespiti, oyun durumu senkronizasyonu', agent: backendAgent.id, dep: 1 },
      { desc: 'Frontend HTML/CSS/JS iskeletini oluştur: 3x3 grid (CSS Grid), X ve O stilleri, durum göstergesi (sıra, bekleme, sonuç), responsive tasarım, yeniden başlat butonu', agent: frontendAgent.id, dep: 0 },
      { desc: 'Frontend WebSocket client entegrasyonu: sunucuya bağlantı, oda oluşturma/katılma UI, hamle gönderme (hücre tıklama), sunucudan gelen state güncelleme, bağlantı durumu göstergesi', agent: frontendAgent.id, dep: 2 },
      { desc: 'Kod incelemesi yap: tüm dosyaları incele, güvenlik analizi (input validation, XSS), mimari değerlendirme, performans kontrolü, kod kalitesi raporu hazırla', agent: reviewerAgent.id, dep: 4 },
      { desc: 'Test planı oluştur ve testleri yaz: oyun mantığı birim testleri (kazanma, beraberlik, geçersiz hamle), WebSocket entegrasyon testleri (bağlantı, mesajlaşma), frontend etkileşim testleri', agent: testerAgent.id, dep: 4 },
      { desc: 'Final raporu hazırla: proje durumu özeti, tamamlanan özellikler, kod inceleme sonuçları, test sonuçları, eksikler ve iyileştirme önerileri, deployment talimatları', agent: pmAgent.id, dep: null },
      { desc: 'Proje kök dizinine README.md oluştur. İçerik: projenin kısa tanımı (1-2 cümle), Gereksinimler (Node.js sürümü), Kurulum (npm install), Çalıştırma (sunucu başlatma komutu ve port), Oynama talimatı (tarayıcıda 2 sekme açıp adresi gir), Kullanılan teknolojiler listesi. Kısa ve net yaz, gereksiz detay ekleme.', agent: backendAgent.id, dep: 4 },
    ]

    const insertTask = db.prepare(`
      INSERT INTO tasks (id, project_id, assigned_agent_id, description, status, depends_on_task_id, created_at)
      VALUES (?, ?, ?, ?, 'todo', ?, ?)
    `)

    for (const t of taskDefs) {
      const taskId = uuid()
      taskIds.push(taskId)
      const depId = t.dep !== null ? taskIds[t.dep] : null
      insertTask.run(taskId, projectId, t.agent, t.desc, depId, now)
    }

    // Son görev (Final rapor) — 6 ve 7. görevlere bağımlı (ikisinin de bitmesini bekler)
    // SQLite'da tek depends_on_task_id var, en son biten göreve bağla (7. görev = index 6)
    db.prepare('UPDATE tasks SET depends_on_task_id = ? WHERE id = ?').run(taskIds[6], taskIds[7])

    // ─── 7. Hooks ───
    const insertHook = db.prepare(
      'INSERT INTO hooks (id, project_id, event, matcher, type, command, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)'
    )

    insertHook.run(uuid(), projectId, 'TaskCompleted', '', 'command', 'echo "✅ Görev tamamlandı!"', now)
    insertHook.run(uuid(), projectId, 'PreToolUse', 'Bash(git push*)', 'command', 'echo "⚠️ Push engellendi — önce testleri çalıştırın!" && exit 1', now)

    // ─── 8. Team ───
    const teamId = uuid()
    db.prepare(`
      INSERT INTO teams (id, project_id, name, lead_agent_id, lead_agent_name, status, max_teammates, created_at)
      VALUES (?, ?, ?, ?, ?, 'idle', 5, ?)
    `).run(teamId, projectId, 'Simit Takımı', pmAgent.id, pmAgent.name, now)

    const insertTeammate = db.prepare(
      'INSERT INTO teammates (id, team_id, agent_id, agent_name, animal, role, status, added_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    const teammates = [backendAgent, frontendAgent, testerAgent, reviewerAgent]
    for (const t of teammates) {
      insertTeammate.run(uuid(), teamId, t.id, t.name, t.animal, t.role, 'idle', now)
    }

    return officeId
  })

  try {
    const officeId = seedAll()

    // getOfficeWithRelations benzeri full response döndür
    const office = db.prepare('SELECT * FROM offices WHERE id = ?').get(officeId) as any
    const agentRows = db.prepare('SELECT * FROM agents WHERE office_id = ?').all(officeId) as any[]
    const projectRows = db.prepare('SELECT * FROM projects WHERE office_id = ?').all(officeId) as any[]

    for (const p of projectRows) {
      p.tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(p.id)
    }

    function parseJsonField<T>(val: any, fallback: T): T {
      if (!val || val === '') return fallback
      try { return JSON.parse(val) } catch { return fallback }
    }

    res.status(201).json({
      id: office.id,
      name: office.name,
      description: office.description,
      theme: office.theme,
      createdAt: office.created_at,
      agents: agentRows.map(a => ({
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
      projects: projectRows.map(p => ({
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
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/seed-demo-light — Hafif demo (2 ajan, 3 görev, compact context)
seedRouter.post('/seed-demo-light', (_req, res) => {
  const now = new Date().toISOString()

  const seedAll = db.transaction(() => {
    const suffix = Date.now().toString(36).slice(-4)

    // ─── 1. Office ───
    const officeId = uuid()
    db.prepare(
      'INSERT INTO offices (id, name, description, theme, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(officeId, `Not Defteri — ${suffix}`, 'Hafif Demo: JSON dosyaya CRUD yapan basit REST API', 'light', now)

    // ─── 2. Agents (3 adet — PM + Backend + Frontend) ───
    const agents = [
      {
        id: uuid(), name: 'Baykuş (PM)', role: 'Proje Yöneticisi', animal: 'owl',
        model: 'claude-haiku-4-5-20251001', maxTurns: 8, effortLevel: 'low',
        deskX: 0, deskY: 0,
        allowedTools: JSON.stringify(['Read', 'Grep', 'Glob']),
        disallowedTools: JSON.stringify(['Write', 'Edit', 'Bash']),
        systemPrompt: `Sen proje yöneticisisin. Backend ve Frontend geliştiricileri koordine ediyorsun.
Görev tamamlandığında kodu oku ve değerlendir.
Sonraki ajana ne yapması gerektiğini net talimatlarla bildir.
Kısa ve öz iletişim kur.`,
      },
      {
        id: uuid(), name: 'Tilki (Backend)', role: 'Backend Geliştirici', animal: 'fox',
        model: 'claude-sonnet-4-6', maxTurns: 12, effortLevel: 'medium',
        deskX: 1, deskY: 0,
        allowedTools: JSON.stringify(['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob']),
        disallowedTools: JSON.stringify(['WebSearch', 'WebFetch']),
        systemPrompt: `Sen backend geliştiricisin. Görevleri adım adım yap.
Dosyaları Write tool ile oluştur. Komutları Bash tool ile çalıştır.
Fazla açıklama yazma, sadece dosyaları oluştur.
express.json() middleware MUTLAKA ekle. Dosya yollarında path.join(__dirname, ...) kullan.`,
      },
      {
        id: uuid(), name: 'Kedi (Frontend)', role: 'Frontend Geliştirici', animal: 'cat',
        model: 'claude-sonnet-4-6', maxTurns: 12, effortLevel: 'medium',
        deskX: 2, deskY: 0,
        allowedTools: JSON.stringify(['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob']),
        disallowedTools: JSON.stringify(['WebSearch', 'WebFetch']),
        systemPrompt: `Sen frontend geliştiricisin. HTML, CSS ve JavaScript yazarsın.
Dosyaları Write tool ile oluştur. Tüm CSS ve JS inline olsun, harici dosya kullanma.
Sana atanmış "Distinctive Frontend Design" skill'ini uygula — generic/sıradan tasarım yapma.
Backend ajanının yazdığı API endpointlerini (GET /notes, POST /notes, DELETE /notes/:id) kullan.`,
      },
    ]

    const insertAgent = db.prepare(`
      INSERT INTO agents (id, office_id, name, role, animal, system_prompt, model, max_turns,
        effort_level, allowed_tools, disallowed_tools, environment_vars,
        desk_x, desk_y, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?, 'idle', ?)
    `)

    for (const a of agents) {
      insertAgent.run(
        a.id, officeId, a.name, a.role, a.animal, a.systemPrompt,
        a.model, a.maxTurns, a.effortLevel, a.allowedTools, a.disallowedTools,
        a.deskX, a.deskY, now
      )
    }

    const pmAgent = agents[0]
    const backendAgent = agents[1]
    const frontendAgent = agents[2]

    // ─── 3. Project (coordinated — PM koordinasyonlu) ───
    const projectId = uuid()
    db.prepare(`
      INSERT INTO projects (id, office_id, name, description, status, work_dir,
        approval_policy, error_policy, workflow_mode, pm_agent_id, context_mode,
        extra_instructions, created_at)
      VALUES (?, ?, ?, ?, 'active', '', 'auto-approve', 'notify-pm', 'coordinated', ?, 'full', ?, ?)
    `).run(
      projectId, officeId,
      'Not Defteri',
      'Tarayıcıda çalışan basit not uygulaması. Backend: Express API, Frontend: HTML arayüz.',
      pmAgent.id,
      'Sadece istenen dosyaları oluştur, fazlasını yapma.',
      now
    )

    // ─── 4. Tasks (4 adet — PM koordinasyonuyla Backend → Frontend akışı) ───
    const taskIds: string[] = []
    const taskDefs = [
      { desc: 'Write tool ile package.json oluştur: {"name":"not-defteri","version":"1.0.0","scripts":{"start":"node index.js"},"dependencies":{"express":"^4.18.0"}}. Sonra Write tool ile notes.json oluştur: []. Sonra Bash ile npm install çalıştır.', agent: backendAgent.id, dep: null },
      { desc: "Write tool ile index.js oluştur. Express sunucusu, port 3005. Gerekli: const express=require('express'), fs=require('fs'), path=require('path'). app.use(express.json()). app.use(express.static(__dirname)) ile aynı dizindeki statik dosyaları sun. NOTES_FILE=path.join(__dirname,'notes.json'). readNotes fonksiyonu: try-catch ile readFileSync+JSON.parse, hata olursa boş dizi dön. writeNotes fonksiyonu: writeFileSync ile JSON.stringify(notes,null,2) yaz. Endpointler: GET /notes notları döndür. POST /notes req.body.text yoksa 400, varsa {id:Date.now(),text,createdAt:new Date().toISOString()} oluştur push et kaydet 201 döndür. DELETE /notes/:id parseInt ile bul yoksa 404 varsa splice ile sil kaydet {success:true} döndür. app.listen(3005) ile başlat, console.log yaz.", agent: backendAgent.id, dep: 0 },
      { desc: `Write tool ile index.html oluştur. SKILL TALİMATLARINI UYGULA — sana atanmış "Distinctive Frontend Design" skill'ini kullan. Türkçe HTML5, title: Not Defteri. Tüm CSS ve JS inline, harici dosya yok. Google Fonts link: Space Grotesk (wght 300;700;900) ve Inter (wght 200;500).

TASARIM — POST-IT TARZI NOTLAR:
Koyu arka plan (Cyberpunk tema: --bg-primary #0a0e27, --bg-secondary #1a1f3a, --accent-1 #ff2e97, --accent-2 #00d9ff, --text-primary #e4f1ff). body üzerine radial-gradient overlay (accent renklerle) ve animated gradient background. CSS @keyframes gradientShift ile background-position animasyonu (0%→100% 15s infinite alternate).

Post-it notlar: 180x180px kare kartlar, hafif eğik (random rotation -3deg ile +3deg arası CSS transform), renkli arka planlar (her not farklı pastel: #fff740, #ff7eb3, #7afcff, #ffa9e7, #98ff98 gibi — rastgele atanır). Kartlar board alanında serbest pozisyonda (position absolute). Kartlara box-shadow: 2px 4px 12px rgba(0,0,0,0.3). Kart üzerinde not text'i + sağ üst köşede X sil butonu.

SÜRÜKLE BIRAK (Drag & Drop):
Her post-it mousedown ile sürüklenebilir olsun. mousedown → dragStart (offset hesapla), mousemove → kart pozisyonunu güncelle (left, top), mouseup → dragEnd. Sürüklenen kart z-index artsın (en üstte olsun). Sürüklerken kart hafif büyüsün (scale 1.05) ve shadow artsın.

ÜST BAR:
Sayfanın üstünde input + ekle butonu. Input: koyu arka plan, parlak border, geniş (flex 1). Ekle butonu: accent-1 rengi (#ff2e97), beyaz yazı, border-radius 8px.

ANİMASYON:
Her yeni not eklendğinde fadeInUp animasyonu ile gelsin (opacity 0→1, translateY 30px→0, 0.5s ease-out). Sayfa ilk yüklendiğinde mevcut notlar stagger animasyonla (her biri 0.1s arayla) belirsin.

JAVASCRIPT:
Notların pozisyonlarını bellekte tut (notes array'inde x,y koordinatları). İlk yüklemede notları grid gibi dağıt (board alanına göre). Yeni not eklenince rastgele boş pozisyona yerleştir. load() fetch('/notes') ile GET. addNote() fetch('/notes', POST, {text}). del(id) fetch('/notes/'+id, DELETE). Her işlem sonrası load(). Enter tuşu addNote() tetiklesin.

Font: h1 Space Grotesk 900 weight, not text Inter 500 weight. h1 rengi accent-2 (#00d9ff).`, agent: frontendAgent.id, dep: 1 },
      { desc: 'Write tool ile README.md oluştur. Kısa tut: Başlık: Not Defteri. Açıklama: Tarayıcıda çalışan basit not uygulaması. Kurulum: npm install. Çalıştırma: npm start. Kullanım: Tarayıcıda http://localhost:3005 adresini aç.', agent: frontendAgent.id, dep: 2 },
    ]

    const insertTask = db.prepare(`
      INSERT INTO tasks (id, project_id, assigned_agent_id, description, status, depends_on_task_id, created_at)
      VALUES (?, ?, ?, ?, 'todo', ?, ?)
    `)

    for (const t of taskDefs) {
      const taskId = uuid()
      taskIds.push(taskId)
      const depId = t.dep !== null ? taskIds[t.dep] : null
      insertTask.run(taskId, projectId, t.agent, t.desc, depId, now)
    }

    // ─── 5. Skill — Distinctive Frontend Design ───
    const skillId = uuid()
    db.prepare(`
      INSERT INTO skills (id, name, description, content, source, category, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      skillId,
      'Distinctive Frontend Design',
      'Create visually distinctive, high-impact frontend interfaces using typography, color/theme, motion, and backgrounds.',
      `# Distinctive Frontend Design

Create visually distinctive, high-impact frontend interfaces that avoid generic "AI slop" aesthetics. Apply the four-vector approach: typography, color/theme, motion, and backgrounds.

## Core Principles
- **Avoid distributional convergence**: Reject default choices (Inter/Roboto fonts, purple gradients, minimal animations). Make bold, cohesive design decisions.
- **Think in systems**: Use CSS variables, design tokens, and coordinated choices across all four dimensions.

## Typography - Use Extremes
- Go to extremes: 100-200 (thin) vs 800-900 (black), not safe 400 vs 600
- Font pairing example: Space Grotesk (display, 900) + Inter (body, 200)
- Tight letter-spacing for bold weights (-0.03em), slight tracking for body (0.01em)

## Color & Theme
- Draw from cultural references: Cyberpunk, Nordic, Vaporwave, Brutalist
- Example Cyberpunk: --bg-primary: #0a0e27, --accent-1: #ff2e97, --accent-2: #00d9ff
- Use CSS custom properties for systematic color application

## Motion - Orchestrated Page Load
- Staggered fadeInUp animations (0.1s delay between elements)
- cubic-bezier(0.16, 1, 0.3, 1) easing
- Respect prefers-reduced-motion

## Backgrounds - Atmospheric Depth
- Layer radial gradients with accent colors
- Add noise/grain texture overlay (opacity 0.05)
- Animated gradient backgrounds with @keyframes

## Quick Checklist
Avoid: Inter/Roboto as primary, font-weights 400-600, purple-blue gradients, no animations, flat backgrounds
Aim for: Distinctive fonts, extreme weight contrast, cohesive color theme, orchestrated entrance animation, layered backgrounds`,
      'seed',
      'frontend-design',
      now
    )

    // Skill'i frontend ajanına ata
    db.prepare('INSERT INTO agent_skills (agent_id, skill_id) VALUES (?, ?)').run(frontendAgent.id, skillId)

    // ─── 6. Hook (1 adet) ───
    db.prepare(
      'INSERT INTO hooks (id, project_id, event, matcher, type, command, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)'
    ).run(uuid(), projectId, 'TaskCompleted', '', 'command', 'echo "✅ Görev tamamlandı!"', now)

    return officeId
  })

  try {
    const officeId = seedAll()

    const office = db.prepare('SELECT * FROM offices WHERE id = ?').get(officeId) as any
    const agentRows = db.prepare('SELECT * FROM agents WHERE office_id = ?').all(officeId) as any[]
    const projectRows = db.prepare('SELECT * FROM projects WHERE office_id = ?').all(officeId) as any[]

    for (const p of projectRows) {
      p.tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(p.id)
    }

    function parseJsonField<T>(val: any, fallback: T): T {
      if (!val || val === '') return fallback
      try { return JSON.parse(val) } catch { return fallback }
    }

    res.status(201).json({
      id: office.id,
      name: office.name,
      description: office.description,
      theme: office.theme,
      createdAt: office.created_at,
      agents: agentRows.map(a => ({
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
      projects: projectRows.map(p => ({
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
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/reset-db — Veritabanını tamamen sıfırla
seedRouter.post('/reset-db', (_req, res) => {
  try {
    const resetAll = db.transaction(() => {
      // FK bağımlılık sırasına göre: önce bağımlı tablolar, sonra ana tablolar
      const tables = [
        'training_runs',
        'training_profiles',
        'hook_logs',
        'hooks',
        'teammates',
        'teams',
        'worktrees',
        'agent_mcp_servers',
        'agent_skills',
        'approval_requests',
        'session_logs',
        'messages',
        'tasks',
        'projects',
        'agents',
        'offices',
        'subagents',
        'skills',
        'mcp_servers',
      ]
      const counts: Record<string, number> = {}
      for (const table of tables) {
        const result = db.prepare(`DELETE FROM ${table}`).run()
        counts[table] = result.changes
      }
      return counts
    })

    const counts = resetAll()
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    res.json({ success: true, deleted: total, details: counts })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})
