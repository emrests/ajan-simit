const translations: Record<string, string> = {
  // ============================================================
  // Common — shared labels
  // ============================================================
  'common.save': 'Kaydet',
  'common.cancel': 'İptal',
  'common.delete': 'Sil',
  'common.add': 'Ekle',
  'common.edit': 'Düzenle',
  'common.create': 'Oluştur',
  'common.close': 'Kapat',
  'common.loading': 'Yükleniyor...',
  'common.remove': 'Kaldır',
  'common.connect': 'Bağla',
  'common.test': 'Test',
  'common.refresh': 'Yenile',
  'common.new': 'Yeni',
  'common.noData': 'Veri yok',
  'common.optional': 'isteğe bağlı',
  'common.default': 'Varsayılan',
  'common.enabled': 'Etkinleştir',
  'common.disabled': 'Devre dışı bırak',
  'common.active': 'Aktif',
  'common.inactive': 'Kapalı',
  'common.error': 'Hata',
  'common.system': 'Sistem',
  'common.result': 'Sonuç',
  'common.preview': 'Önizle',
  'common.export': 'Dışa Aktar',
  'common.import': 'İçe Aktar',
  'common.start': 'Başlat',
  'common.stop': 'Durdur',
  'common.template': 'Şablon',
  'common.search': 'Ara',

  // ============================================================
  // App.tsx — main layout
  // ============================================================
  'app.title': 'Ajan Simit',
  'app.emptyState': 'Soldan bir ofis seçin ya da yeni ofis oluşturun.',

  // ============================================================
  // Sidebar — OfficeSidebar.tsx
  // ============================================================
  'sidebar.offices': 'Ofisler',
  'sidebar.agentCount': '{{count}} ajan',
  'sidebar.activeCount': '({{count}} aktif)',
  'sidebar.projectCount': '{{count}} proje',
  'sidebar.runningSessionsCount': '{{count}} Claude oturumu çalışıyor',
  'sidebar.tasks': 'Görevler',
  'sidebar.noOffice': 'Henüz ofis yok',
  'sidebar.newOffice': '+ Yeni Ofis',
  'sidebar.officeName': 'Ofis adı...',
  'sidebar.officeDesc': 'Açıklama (isteğe bağlı)...',
  'sidebar.createOffice': 'Oluştur',
  'sidebar.demoProject': 'Demo Proje Kur',
  'sidebar.demoProjectLoading': 'Kuruluyor...',
  'sidebar.demoProjectTitle': '5 ajanlı demo ofis, Tic Tac Toe projesi, görevler, skills, subagent, hooklar ve takım oluşturur',
  'sidebar.demoLight': '⚡ Hafif Demo',
  'sidebar.demoLightTitle': '2 ajanlı hafif demo — Not Defteri API, 3 görev, compact context modu (düşük token tüketimi)',
  'sidebar.demoFull': '🏗️ Tam Demo',
  'sidebar.resetDb': 'Veritabanını Sıfırla',
  'sidebar.resetDbLoading': 'Sıfırlanıyor...',
  'sidebar.resetDbTitle': 'Tüm veritabanını sıfırla — ofisler, ajanlar, projeler, skills, subagentlar, hooklar, takımlar',
  'sidebar.templateButton': 'Hazır takım şablonu ekle',

  // Confirm dialogs (sidebar)
  'confirm.resetDb': 'Tüm veritabanını sıfırlamak istediğinize emin misiniz?\n\nBu işlem geri alınamaz. Tüm ofisler, ajanlar, projeler, görevler, skills, subagentlar, hooklar, takımlar ve MCP sunucuları silinecek.',
  'confirm.deleteOffice': '"{{name}}" ofisini silmek istediğinize emin misiniz? Tüm ajanlar ve projeler silinecek.',
  'confirm.deleteAgent': '"{{name}}" ajanını silmek istediğinize emin misiniz?',
  'confirm.deleteProject': '"{{name}}" projesini silmek istediğinize emin misiniz?\nTüm görevler de silinecek.',
  'confirm.deleteSkill': 'Bu skill silinecek. Emin misiniz?',

  // ============================================================
  // Theme labels — OfficeView.tsx THEMES
  // ============================================================
  'theme.light': 'Açık',
  'theme.dark': 'Koyu',

  // ============================================================
  // Office — OfficeView.tsx
  // ============================================================
  'office.projects': 'Projeler',
  'office.dashboard': 'Dashboard',
  'office.replay': 'Replay',
  'office.help': 'Yardım',
  'office.emptyTitle': 'Ofis boş!',
  'office.emptyDesc': 'Aşağıdaki + butonuyla yeni ajan ekleyin.',
  'office.workRoom': 'Çalışma Odası',
  'office.coffeeCorner': 'Kahve Köşesi',
  'office.meetingRoom': 'Toplantı Odası',
  'office.emptyWorkRoom': 'Şu an kimse çalışmıyor',
  'office.emptyCoffeeCorner': 'Herkes çalışıyor!',
  'office.emptyMeetingRoom': 'Toplantı yok',
  'office.agentProjectStats': '{{agentCount}} ajan \u00a0·\u00a0 {{projectCount}} proje',
  'office.workingCount': '{{count}} çalışıyor',

  // ============================================================
  // Agent Desk — AgentDesk.tsx
  // ============================================================
  'agent.claudeCodeActive': 'Claude Code aktif',
  'agent.jsonlWatching': 'JSONL izleniyor',

  // ============================================================
  // Status labels — from @smith/types STATUS_LABELS
  // ============================================================
  'status.idle': 'Boşta',
  'status.thinking': 'Düşünüyor',
  'status.typing': 'Yazıyor',
  'status.reading': 'Okuyor',
  'status.waiting': 'Bekliyor',
  'status.celebrating': 'Tamamladı!',

  // ============================================================
  // Team status labels — from @smith/types
  // ============================================================
  'status.team.idle': 'Hazır',
  'status.team.running': 'Çalışıyor',
  'status.team.completed': 'Tamamlandı',
  'status.team.error': 'Hata',

  // ============================================================
  // Teammate status labels — from @smith/types
  // ============================================================
  'status.teammate.idle': 'Boşta',
  'status.teammate.working': 'Çalışıyor',
  'status.teammate.done': 'Tamamladı',
  'status.teammate.error': 'Hata',

  // ============================================================
  // Worktree status labels — from @smith/types
  // ============================================================
  'status.worktree.active': 'Aktif',
  'status.worktree.merged': 'Birleştirildi',
  'status.worktree.conflict': 'Çakışma',
  'status.worktree.deleted': 'Silindi',

  // ============================================================
  // Isolation mode labels — from @smith/types
  // ============================================================
  'isolation.shared': 'Paylaşımlı (Varsayılan)',
  'isolation.worktree': 'Worktree İzolasyonu',

  // ============================================================
  // Project status labels — ProjectPanel.tsx
  // ============================================================
  'project.status.planning': 'Planlama',
  'project.status.active': 'Aktif',
  'project.status.review': 'İnceleme',
  'project.status.done': 'Tamamlandı',

  // ============================================================
  // Conversation — ConversationPanel.tsx
  // ============================================================
  'conversation.activity': 'Aktivite',
  'conversation.filterAll': 'Tümü',
  'conversation.filterClaude': 'Claude',
  'conversation.filterTool': 'Araç',
  'conversation.filterTask': 'Görev',
  'conversation.filterResult': 'Sonuç',
  'conversation.filterSystem': 'Sistem',
  'conversation.filterTitle': '{{label}} mesajlarını filtrele',

  // Message type labels
  'conversation.msgChat': 'Mesaj',
  'conversation.msgTask': 'Görev',
  'conversation.msgResult': 'Sonuç',
  'conversation.msgSystem': 'Sistem',
  'conversation.msgClaude': 'Claude',
  'conversation.msgTool': 'Araç',
  'conversation.msgError': 'Hata',

  // Tool parse labels
  'conversation.toolWriting': 'Yazıyor: ',
  'conversation.toolEditing': 'Düzenliyor: ',
  'conversation.toolReading': 'Okuyor: ',
  'conversation.toolUsing': 'kullanıyor',
  'conversation.toolRunning': 'çalışıyor...',
  'conversation.toolSubtask': 'Alt görev: ',

  // Handoff card
  'conversation.handoffTitle': 'Görev Zinciri Tetiklendi',
  'conversation.handoffBadge': 'Otomatik',

  // Completion card
  'conversation.completed': 'Tamamladı!',

  // Agent-to-Agent card
  'conversation.agentToAgent': 'Ajan→Ajan',

  // Approval cards
  'conversation.approvalRequest': 'Onay İstiyor',
  'conversation.approvalResponse': 'Onay Yanıtı',
  'conversation.approved': 'Onaylandı',
  'conversation.rejected': 'Reddedildi',
  'conversation.approvalPending': 'Bekliyor',
  'conversation.approvalResponded': 'Yanıtlandı',
  'conversation.approve': 'Onayla',
  'conversation.reject': 'Reddet',

  // Message actions
  'conversation.collapse': 'Daralt',
  'conversation.showAll': 'Tümünü göster',

  // Empty states
  'conversation.noConnection': 'Bağlantı yok',
  'conversation.noMsgType': 'Bu tipte mesaj yok',
  'conversation.noActivity': 'Henüz aktivite yok',
  'conversation.noActivityHint': 'Ajan düzenleyip Claude Code sekmesinden JSONL bağlayın ya da oturum başlatın',

  // Footer
  'conversation.liveConnection': 'Canlı bağlantı aktif',
  'conversation.disconnected': 'Bağlantı kesildi',
  'conversation.agentsWorking': '{{count}} ajan çalışıyor',

  // ============================================================
  // Agent Modal — AgentModal.tsx
  // ============================================================
  'agent.editTitle': '{{name}} Düzenle',
  'agent.addTitle': 'Yeni Ajan Ekle',
  'agent.nameRequired': 'İsim ve rol zorunludur.',

  // Tabs
  'agent.tabProfile': 'Profil',
  'agent.tabAdvanced': 'Gelişmiş',
  'agent.tabSkills': 'Skills',
  'agent.tabMcp': 'MCP',
  'agent.tabSubagent': 'Subagent',
  'agent.tabTraining': 'Eğitim',
  'agent.tabSession': 'Claude Code',
  'agent.tabTranscript': 'Transcript',

  // Profile tab
  'agent.selectCharacter': 'Karakter Seç',
  'agent.agentName': 'Ajan İsmi',
  'agent.agentNamePlaceholder': 'Örn: Mehmet, Alex, Luna...',
  'agent.role': 'Rol / Uzmanlık',
  'agent.rolePlaceholder': 'Örn: Backend Dev, Proje Yöneticisi, QA...',
  'agent.model': 'Claude Modeli',
  'agent.modelDefault': 'Varsayılan (claude-sonnet-4-6)',
  'agent.modelOpus': 'Claude Opus 4.6 (en güçlü)',
  'agent.modelSonnet': 'Claude Sonnet 4.6 (dengeli)',
  'agent.modelHaiku': 'Claude Haiku 4.5 (hızlı)',
  'agent.maxTurns': 'Max Turns',
  'agent.maxTurnsDesc': 'Claude\'un bir oturumda yapacağı maksimum tur sayısı. 0 = sınırsız.',
  'agent.maxTurnsTokenSave': 'token tasarrufu',
  'agent.maxTurnsCustom': 'Özel: {{count}} tur',
  'agent.systemPrompt': 'Sistem Prompt',
  'agent.systemPromptDesc': 'Ajanın uzmanlığını ve kurallarını tanımlar. Her oturumda geçerli olur.',
  'agent.systemPromptExample': 'Örn: "Sen bir Next.js uzmanısın. TypeScript kullanırsın, clean code yazarsın."',
  'agent.systemPromptPlaceholder': 'Sen bir [uzmanlık alanı] uzmanısın. [teknolojiler] kullanırsın. [kurallar]...',
  'agent.addAgent': 'Ajan Ekle',

  // Turn profiles — from @smith/types
  'agent.turnLight': 'Hafif (5 tur)',
  'agent.turnNormal': 'Normal (15 tur)',
  'agent.turnHeavy': 'Ağır (30 tur)',
  'agent.turnUnlimited': 'Sınırsız',

  // Advanced tab
  'agent.effortLevel': 'Efor Seviyesi',
  'agent.effortDesc': 'Düşük efor basit görevlerde %60-70 token tasarrufu sağlar.',
  'agent.effortLow': 'Düşük',
  'agent.effortMedium': 'Normal',
  'agent.effortHigh': 'Yüksek',
  'agent.effortLowDesc': 'Basit görevler — %60-70 token tasarrufu',
  'agent.effortMediumDesc': 'Standart görevler',
  'agent.effortHighDesc': 'Karmaşık görevler — en detaylı çıktı',

  'agent.toolPermissions': 'Araç İzinleri',
  'agent.toolPermissionsDesc': 'Ajanın kullanabileceği araçları sınırlandırın. Boş = tam yetki.',
  'agent.permSafe': 'Güvenli (Salt Okunur)',
  'agent.permDeveloper': 'Geliştirici',
  'agent.permFull': 'Tam Yetki',
  'agent.allowedTools': 'İzin Verilen (boş = hepsi)',
  'agent.disallowedTools': 'Engellenen',

  'agent.envVars': 'Ortam Değişkenleri',
  'agent.envVarsDesc': 'Ajan oturumuna özel env değişkenleri. Hassas değerler maskelenir.',

  'agent.appendSystemPrompt': 'Ek Talimatlar',
  'agent.appendSystemPromptLabel': 'append system prompt',
  'agent.appendSystemPromptDesc': 'Oturum başlatırken system prompt\'a eklenir. Ana prompt\'u değiştirmez.',
  'agent.appendSystemPromptPlaceholder': 'Ek talimatlar...\nÖrn: Her dosyayı değiştirmeden önce test yaz. TypeScript strict mode kullan.',

  'agent.promptFile': 'Prompt Dosyası',
  'agent.promptFileLabel': '--system-prompt-file',
  'agent.promptFileDesc': 'Dosya yolundan system prompt yükler. Mutlak veya çalışma dizinine göre göreceli yol.',
  'agent.promptFilePlaceholder': 'Örn: .claude/prompts/backend.md veya C:\\prompts\\agent.md',

  'agent.promptTemplates': 'Prompt Şablonları',
  'agent.promptTemplatesDesc': 'Sistem prompt ve ek talimatlarda değişken kullanabilirsiniz:',

  'agent.outputSchema': 'Çıktı Şeması',
  'agent.outputSchemaLabel': 'JSON Schema',
  'agent.outputSchemaDesc': 'Ajanın yanıtını bu JSON şemasına uygun formatlamasını ister. Boş = serbest format.',
  'agent.validJson': 'Geçerli JSON',
  'agent.invalidJson': 'Geçersiz JSON',

  // Session tab
  'agent.sessionActive': 'Oturum Aktif',
  'agent.sessionNone': 'Oturum Yok',
  'agent.stopSession': 'Oturumu Durdur',
  'agent.startSession': 'Yeni Oturum Başlat',
  'agent.startSessionButton': 'Claude Oturumu Başlat',
  'agent.startingSession': 'Başlatılıyor...',
  'agent.workDir': 'Çalışma Dizini',
  'agent.selectProject': '— Proje seç —',
  'agent.manualInput': 'Manuel gir',
  'agent.task': 'Görev',
  'agent.taskHint': 'Claude\'a ne yapmasını söyleyeceksiniz?',
  'agent.assignedTasks': 'Atanmış Görevler',
  'agent.taskPlaceholder': 'Ajana ne yapmasını istiyorsunuz?\nÖrn: src/App.tsx dosyasına dark mode toggle ekle',
  'agent.jsonlBind': 'JSONL Bağla',
  'agent.scanFiles': 'Dosyaları Tara',
  'agent.relativeTimeJustNow': 'az önce',
  'agent.relativeTimeMinutes': '{{count}}dk önce',
  'agent.relativeTimeHours': '{{count}}sa önce',
  'agent.relativeTimeDays': '{{count}}g önce',

  // Skills tab
  'agent.agentSkills': 'Ajanın Yetenekleri ({{count}})',
  'agent.noSkills': 'Henüz skill eklenmemiş.',
  'agent.noSkillsHint': 'Aşağıdan skill ekleyebilirsiniz.',
  'agent.skillLibrary': 'Skill Kütüphanesi',
  'agent.createSkill': 'Yeni Oluştur',
  'agent.skillMd': 'SKILL.md',
  'agent.skillGitHub': 'GitHub',
  'agent.skillNamePlaceholder': 'Skill adı (ör: tdd, code-review, changelog)',
  'agent.skillDescPlaceholder': 'Kısa açıklama — Claude ne zaman kullanmalı?',
  'agent.skillContentPlaceholder': 'Skill talimatları (markdown)...\n\n# TDD Skill\n\n## Süreç\n1. Önce test yaz\n2. Testi çalıştır (kırmızı)\n3. Minimum kod yaz\n4. Testi çalıştır (yeşil)\n5. Refactor et',
  'agent.createSkillButton': 'Skill Oluştur',
  'agent.skillImportDesc': 'YAML frontmatter\'lı SKILL.md içeriğini yapıştırın:',
  'agent.importButton': 'Import Et',
  'agent.ghImportDesc': 'GitHub reposundaki tüm SKILL.md dosyalarını toplu olarak indirin:',
  'agent.ghBranchPlaceholder': 'Branch (varsayılan: main)',
  'agent.ghPathPlaceholder': 'Klasör filtresi (ör: skills/)',
  'agent.ghDownloading': 'İndiriliyor...',
  'agent.ghDownloadButton': 'İndir & İçe Aktar',
  'agent.ghResultCreated': '{{count}} skill eklendi',
  'agent.ghResultSkipped': '{{count}} atlandı (zaten mevcut)',
  'agent.ghResultErrors': '{{count}} hata',
  'agent.ghMoreErrors': '...ve {{count}} hata daha',

  // MCP tab
  'agent.agentMcpServers': 'Ajanın MCP Sunucuları ({{count}})',
  'agent.noMcpServers': 'Henüz MCP sunucu bağlı değil.',
  'agent.noMcpServersHint': 'Aşağıdan sunucu ekleyebilirsiniz.',
  'agent.mcpConnected': 'Bağlı',
  'agent.mcpError': 'Hata',
  'agent.mcpDisabled': 'Devre dışı',
  'agent.mcpConnectionTest': 'Bağlantı testi',
  'agent.existingServers': 'Mevcut Sunucular',
  'agent.newMcpServer': '+ Yeni MCP Sunucu',
  'agent.readyServer': 'Hazır Sunucu',
  'agent.mcpServerTitle': 'Yeni MCP Sunucu',
  'agent.mcpName': 'Ad',
  'agent.mcpTransport': 'Transport',
  'agent.mcpDescription': 'Açıklama',
  'agent.mcpCommand': 'Komut',
  'agent.mcpUrl': 'URL',
  'agent.mcpArgs': 'Argümanlar',
  'agent.mcpArgsHint': 'boşlukla ayır',
  'agent.mcpEnvVars': 'Ortam Değişkenleri',
  'agent.mcpDeleteServer': 'Sunucuyu sil',
  'agent.mcpNamePlaceholder': 'ör: GitHub',
  'agent.mcpDescPlaceholder': 'ör: GitHub API — repo, issue, PR yönetimi',
  'agent.mcpCommandPlaceholder': 'ör: npx -y @modelcontextprotocol/server-github',
  'agent.mcpUrlPlaceholder': 'ör: http://localhost:8080/sse',
  'agent.mcpArgsPlaceholder': 'ör: --db-path /path/to/db.sqlite',
  'agent.skillImportPlaceholder': "---\nname: my-skill\ndescription: Bu skill ...\n---\n\n# Talimatlar\n\n1. Adım bir\n2. Adım iki",

  // Subagent tab
  'agent.subagentProfile': 'Subagent Profili',
  'agent.boundSubagent': 'Bağlı subagent',
  'agent.noSubagentBound': 'Henüz subagent profili bağlı değil',
  'agent.existingSubagents': 'Mevcut Subagent\'lar',
  'agent.noSubagents': 'Henüz subagent yok',
  'agent.newSubagent': '+ Yeni Subagent',
  'agent.readyTemplate': 'Hazır Şablon',
  'agent.exportProfile': 'Profili Aktar',
  'agent.exportProfileTitle': 'Bu ajanın ayarlarından subagent oluştur',
  'agent.subagentTitle': 'Yeni Subagent',
  'agent.subagentName': 'Ad',
  'agent.subagentModel': 'Model (opsiyonel)',
  'agent.subagentDescription': 'Açıklama',
  'agent.subagentPrompt': 'Prompt (Talimat)',
  'agent.subagentMaxTurns': 'Max Turns',
  'agent.subagentScope': 'Kapsam',
  'agent.scopeProject': 'Proje (.claude/agents/)',
  'agent.scopeUser': 'Kullanıcı (~/.claude/agents/)',
  'agent.subagentAllowedTools': 'İzin Verilen Araçlar',

  // Transcript tab
  'agent.transcript': 'Konuşma Transcript',
  'agent.noTranscript': 'Bu ajan için JSONL dosyası bağlı değil.',
  'agent.noTranscriptHint': 'Claude Code sekmesinden bir dosya bağlayın.',
  'agent.transcriptEmpty': 'Transcript boş veya okunamadı.',
  'agent.transcriptInit': 'Başlangıç',
  'agent.transcriptTools': 'Araçlar: {{tools}}',

  // ============================================================
  // Project — ProjectPanel.tsx
  // ============================================================
  'project.title': 'Projeler',
  'project.new': '+ Yeni',
  'project.namePlaceholder': 'Proje adı...',
  'project.dirPlaceholder': 'Klasör yolu (isteğe bağlı): d:\\projelerim\\proje-adi',
  'project.noProject': 'Proje yok',
  'project.noProjectHint': 'Yukarıdan yeni proje oluşturun.',
  'project.deleteProject': 'Projeyi sil',
  'project.addDirHint': 'Klasör yolu ekle...',

  // Run project
  'project.startProject': 'Projeyi Başlat — Tüm Ajanlar Çalışsın',
  'project.starting': 'Başlatılıyor...',
  'project.addDirFirst': 'Önce klasör yolu ekleyin',
  'project.startAllTitle': 'Atanmış tüm görevleri başlat',
  'project.noTasksToStart': 'Başlatılacak görev bulunamadı. Görevlere ajan atayın.',
  'project.startedResult': '{{started}}/{{total}} ajan çalışmaya başladı!',
  'project.taskStartedResult': '"{{desc}}..." başlatıldı',

  // PM planning
  'project.planWithPm': 'PM ile Otomatik Planla',
  'project.pmThinking': 'PM düşünüyor...',
  'project.planWithClaude': 'Claude\'a Planla',
  'project.pmContextPlaceholder': 'Ek bağlam (isteğe bağlı): teknoloji yığını, gereksinimler, öncelikler...',
  'project.pmCreated': 'PM oluşturdu: {{count}} görev',
  'project.pmError': 'PM hatası: {{message}}',
  'project.addAgentsFirst': 'Önce ajan ekleyin',
  'project.pmPlanTitle': 'Claude ile görev planı oluştur',

  // Progress
  'project.progress': 'İlerleme',

  // Workflow settings
  'project.workflowSettings': 'İş Akışı Ayarları',
  'project.workflowMode': 'İş Akışı Modu',
  'project.workflowFree': 'Serbest — Ajanlar bağımsız çalışır',
  'project.workflowCoordinated': 'Koordineli — PM ajanı yönetir',
  'project.workflowTeam': 'Takım — Claude Agent Teams ile çalışır',
  'project.pmAgent': 'PM Ajanı',
  'project.pmNotAssigned': 'PM atanmamış',
  'project.approvalPolicy': 'Onay Politikası',
  'project.approvalAuto': 'Otomatik — Onay gerektirmez',
  'project.approvalUser': 'Kullanıcıya Sor — Her onay isteği size gelir',
  'project.approvalPm': 'PM\'e Sor — PM ajanı karar verir',
  'project.errorPolicy': 'Hata Politikası',
  'project.errorStop': 'Durdur — Hata olursa ajan durur',
  'project.errorNotifyPm': 'PM\'e Bildir — PM ajana hata raporu gönderilir',
  'project.errorAutoRetry': 'Otomatik Yeniden Dene',
  'project.contextMode': 'Bağlam Modu',
  'project.contextModeSave': 'token tasarrufu',
  'project.contextFull': 'Tam — Tüm tamamlanan görevler bağlam olarak verilir',
  'project.contextCompact': 'Kompakt — Son 3 görev + özet (token tasarruflu)',
  'project.contextMinimal': 'Minimal — Sadece "N/M görev tamamlandı" (en tasarruflu)',
  'project.claudeMd': 'CLAUDE.md',
  'project.claudeMdLabel': 'proje kuralları',
  'project.claudeMdDesc': 'Proje klasörüne yazılır, Claude oturumlarında otomatik okunur. System prompt\'u kısa tutun, kuralları buraya yazın.',
  'project.claudeMdPlaceholder': '# Proje Kuralları\n\n- TypeScript kullan\n- Test yaz\n- Türkçe commit mesajları',
  'project.extraInstructions': 'Ek Talimatlar',
  'project.extraInstructionsLabel': 'tüm ajanlar için ortak',
  'project.extraInstructionsDesc': 'Bu projedeki tüm ajanların system prompt\'una otomatik eklenir. Şablon değişkenleri kullanabilirsiniz: {{agent.name}}, {{project.name}}, {{date}} vb.',

  // Hooks
  'project.hooks': 'Hooks',
  'project.hooksActive': '{{count}} aktif',
  'project.noHooks': 'Henüz hook tanımlı değil',
  'project.newHook': '+ Yeni Hook',
  'project.hookEvent': 'Olay',
  'project.hookType': 'Tip',
  'project.hookMatcher': 'Matcher',
  'project.hookCommand': 'Komut',
  'project.hookWebhookUrl': 'Webhook URL',
  'project.hookLlmPrompt': 'LLM Prompt',
  'project.hookLogs': 'Logları göster',
  'project.hookNoLogs': 'Henüz çalışma logu yok',
  'project.hookTemplate': 'Şablon',

  // Hook event labels — from @smith/types
  'hook.PreToolUse': 'Tool Öncesi',
  'hook.PostToolUse': 'Tool Sonrası',
  'hook.SessionStart': 'Oturum Başlangıcı',
  'hook.SessionStop': 'Oturum Bitişi',
  'hook.TaskCompleted': 'Görev Tamamlandı',
  'hook.TaskFailed': 'Görev Başarısız',
  'hook.SubagentStart': 'Subagent Başladı',
  'hook.SubagentStop': 'Subagent Durdu',
  'hook.PreCompact': 'Sıkıştırma Öncesi',
  'hook.Notification': 'Bildirim',

  // Hook type labels — from @smith/types
  'hook.command': 'Shell Komutu',
  'hook.http': 'Webhook (HTTP POST)',
  'hook.prompt': 'LLM Değerlendirme',

  // Worktree isolation
  'project.worktreeIsolation': 'Worktree İzolasyonu',
  'project.worktreeMode': 'Mod:',
  'project.notGitRepo': 'Git repo değil',
  'project.noWorktrees': 'Henüz worktree yok. Görev başlatıldığında otomatik oluşturulur.',
  'project.worktreeFiles': '{{count}} dosya',
  'project.worktreeCommits': '{{count}} commit',
  'project.worktreeRefresh': 'Durumu yenile',
  'project.worktreeMerge': 'Merge et',
  'project.worktreeCreate': '+ Oluştur',
  'project.worktreeSelectAgent': 'Ajan seç...',
  'project.worktreeError': 'Worktree hatası: {{message}}',
  'project.mergeFailed': 'Merge başarısız: {{message}}',

  // Teams
  'project.teamMode': 'Takım Modu',
  'project.teamCount': '{{count}} takım',
  'project.teamLeader': 'Lider: {{name}}',
  'project.teamAddMember': 'Üye ekle...',
  'project.newTeam': '+ Yeni Takım Oluştur',
  'project.teamNamePlaceholder': 'Takım adı...',
  'project.teamLeadLabel': 'Takım Lideri (PM)',
  'project.teamLeadSelect': 'Lider seç...',
  'project.teamMaxMembers': 'Max Üye Sayısı',
  'project.teamRemoveMember': 'Çıkar',

  // Tasks
  'project.tasks': 'Görevler',
  'project.noTasks': 'Henüz görev yok',
  'project.newTask': '+ Yeni Görev',
  'project.taskDescPlaceholder': 'Görev açıklaması...',
  'project.selectAgent': 'Ajan seç (isteğe bağlı)',
  'project.noAgent': 'Ajan yok',
  'project.dependsOn': 'Önce şu bitmeli: (isteğe bağlı)',
  'project.blocked': 'Bekliyor: "{{desc}}..."',
  'project.startTask': 'Bu görevi başlat',
  'project.deleteTask': 'Görevi sil',
  'project.editTask': 'Tıklayarak düzenle',
  'project.moveUp': 'Yukarı taşı',
  'project.moveDown': 'Aşağı taşı',
  'project.noDependency': 'Bağımlılık yok',
  'project.blockPrereq': 'Önce "{{desc}}..." tamamlanmalı',

  // ============================================================
  // Template — TemplateModal.tsx
  // ============================================================
  'template.title': 'Hazır Takım Şablonları',
  'template.subtitle': 'Tek tıkla tüm ajanları ekle',
  'template.apply': '{{count}} Ajanı Ekle',
  'template.selectFirst': 'Şablon Seç',
  'template.applying': 'Ekleniyor...',
  'template.agentsAdded': '{{count}} ajan eklendi!',
  'template.error': 'Hata: {{message}}',

  // Template names & descriptions
  'template.fullstack.label': 'Full-Stack Takım',
  'template.fullstack.desc': 'Frontend, backend ve QA ajanları',
  'template.aiResearch.label': 'AI Araştırma Ekibi',
  'template.aiResearch.desc': 'Araştırma, analiz ve geliştirme',
  'template.devops.label': 'DevOps Takımı',
  'template.devops.desc': 'Altyapı, CI/CD ve güvenlik',
  'template.startup.label': 'Startup Takımı',
  'template.startup.desc': 'Küçük, çok yönlü bir ekip',
  'template.content.label': 'İçerik Ekibi',
  'template.content.desc': 'İçerik üretimi ve editöryel',

  // Template agent roles
  'template.fullstack.frontendRole': 'Frontend Developer',
  'template.fullstack.backendRole': 'Backend Developer',
  'template.fullstack.qaRole': 'QA Mühendisi',
  'template.aiResearch.researcherRole': 'AI Araştırmacı',
  'template.aiResearch.dataScientistRole': 'Veri Bilimci',
  'template.aiResearch.mlEngineerRole': 'ML Mühendisi',
  'template.devops.devopsRole': 'DevOps Mühendisi',
  'template.devops.securityRole': 'Güvenlik Mühendisi',
  'template.devops.cloudRole': 'Bulut Mimarı',
  'template.startup.fullstackRole': 'Full-Stack Geliştirici',
  'template.startup.uxRole': 'UX Tasarımcı',
  'template.startup.pmRole': 'Proje Yöneticisi',
  'template.content.writerRole': 'İçerik Yazarı',
  'template.content.researcherRole': 'Araştırmacı',
  'template.content.editorRole': 'Editör',

  // Template system prompts
  'template.fullstack.frontend': 'Sen bir React/TypeScript uzmanısın. Tailwind CSS kullanırsın, temiz ve erişilebilir UI yazarsın.',
  'template.fullstack.backend': 'Sen bir Node.js/Express uzmanısın. REST API ve veritabanı tasarımında iyisin.',
  'template.fullstack.qa': 'Sen bir test uzmanısın. Jest, Playwright ve e2e test yazarsın. Hataları bulursun.',
  'template.aiResearch.researcher': 'Sen bir AI araştırmacısısın. Makale okur, analiz eder ve özetler çıkarırsın.',
  'template.aiResearch.dataScientist': 'Sen bir veri bilimcisisin. Python, pandas ve makine öğrenimi konusunda uzmanısın.',
  'template.aiResearch.mlEngineer': 'Sen bir ML mühendisisin. Model eğitimi, fine-tuning ve deployment yaparsın.',
  'template.devops.devops': 'Sen bir DevOps uzmanısın. Docker, Kubernetes ve CI/CD pipeline kurarsın.',
  'template.devops.security': 'Sen bir güvenlik uzmanısın. Vulnerabiliteleri bulur ve güvenlik denetimleri yaparsın.',
  'template.devops.cloud': 'Sen bir bulut mimarısın. AWS/Azure/GCP servislerini optimize edersin.',
  'template.startup.fullstack': 'Sen çok yönlü bir full-stack geliştiricisin. Hızlı prototip yaparsın.',
  'template.startup.ux': 'Sen bir UX tasarımcısısın. Kullanıcı deneyimini önceliklendirir, wireframe ve prototip yaparsın.',
  'template.startup.pm': 'Sen bir proje yöneticisisin. Görevleri koordine eder, öncelikleri belirler ve ilerlemeyi takip edersin.',
  'template.content.writer': 'Sen bir içerik yazarısın. SEO dostu, akıcı ve ilgi çekici içerikler yazarsın.',
  'template.content.researcher': 'Sen bir araştırmacısın. Kaynakları bulur, bilgileri doğrular ve özetler çıkarırsın.',
  'template.content.editor': 'Sen bir editörsün. Metinleri düzenler, tutarlılığı kontrol eder ve kaliteyi artırırsın.',

  // ============================================================
  // Dashboard — DashboardPanel.tsx
  // ============================================================
  'dashboard.title': 'Dashboard',
  'dashboard.subtitle': '{{name}} — Gelişmiş İzleme',

  // Tabs
  'dashboard.tabOverview': 'Genel',
  'dashboard.tabCosts': 'Maliyet',
  'dashboard.tabTools': 'Araçlar',
  'dashboard.tabAgents': 'Ajanlar',
  'dashboard.tabTimeline': 'Aktivite',

  // Overview cards
  'dashboard.agent': 'Ajan',
  'dashboard.activeLabel': 'Aktif',
  'dashboard.session': 'Oturum',
  'dashboard.completedLabel': 'Tamamlanan',
  'dashboard.cost': 'Maliyet',
  'dashboard.allTasks': 'Tüm Görevler',
  'dashboard.completed': '{{count}} tamamlandı',
  'dashboard.inProgress': '{{count}} devam ediyor',
  'dashboard.waiting': '{{count}} bekliyor',
  'dashboard.tokenCostSummary': 'Token & Maliyet Özeti',
  'dashboard.total': 'Toplam',
  'dashboard.last30Days': 'Son 30 Gün — Token Kullanımı',
  'dashboard.noAgents': 'Henüz ajan yok',
  'dashboard.noProjects': 'Henüz proje yok',

  // Project card
  'dashboard.projectCompleted': 'Tamamlandı',
  'dashboard.projectActive': 'Aktif',
  'dashboard.projectPlanning': 'Planlama',
  'dashboard.projectProgress': 'İlerleme',
  'dashboard.projectDone': '{{count}} bitti',
  'dashboard.projectContinue': '{{count}} devam',
  'dashboard.projectTotal': '/ {{count}} toplam',
  'dashboard.projectNoTasks': 'Henüz görev yok',

  // Costs tab
  'dashboard.totalCost': 'Toplam Maliyet',
  'dashboard.agentCost': 'Ajan Bazlı Maliyet',
  'dashboard.dailyCostTrend': 'Günlük Maliyet Trendi',

  // Tools tab
  'dashboard.toolUsageStats': 'Araç Kullanım İstatistikleri',
  'dashboard.noToolData': 'Henüz tool kullanım verisi yok',
  'dashboard.toolUsageTotal': 'Toplam: {{count}} tool kullanımı, {{unique}} farklı araç',

  // Agents tab
  'dashboard.agentSessions': '{{count}} oturum | {{tasks}} görev',
  'dashboard.avgPerSession': 'Ort/Oturum',
  'dashboard.efficiency': 'Verimlilik',

  // Timeline tab
  'dashboard.recentActivities': 'Son Aktiviteler',
  'dashboard.noActivities': 'Henüz aktivite yok',

  // Loading states
  'dashboard.loadingData': 'Yükleniyor...',

  // ============================================================
  // Session Replay — SessionReplayPanel.tsx
  // ============================================================
  'replay.title': 'Session Replay',
  'replay.subtitle': 'Konuşma geçmişini adım adım izle',
  'replay.agentLabel': 'Ajan:',
  'replay.entryCount': '{{current}} / {{total}} giriş',
  'replay.resetTitle': 'Başa dön',
  'replay.pause': 'Duraklat',
  'replay.replay': 'Tekrar Oynat',
  'replay.play': 'Oynat',
  'replay.stepTitle': 'Sonraki adım',
  'replay.noJsonl': 'Bu ajan için JSONL bağlı değil. AgentModal → Claude Code sekmesinden bağlayın.',
  'replay.sessionStarted': 'Oturum Başladı',
  'replay.tools': 'Araçlar: {{tools}}',
  'replay.resultLabel': 'Sonuç',

  // ============================================================
  // Help — HelpPanel.tsx
  // ============================================================
  'help.title': 'Kullanım Kılavuzu',
  'help.subtitle': 'SmithAgentOffice — Tüm Özellikler',
  'help.footer': 'SmithAgentOffice v1.0 — Claude Code Agent Orchestration Platform',

  // Help sections
  'help.start.title': 'Hızlı Başlangıç',
  'help.agents.title': 'Ajan Yönetimi',
  'help.projects.title': 'Proje & Görev Yönetimi',
  'help.sessions.title': 'Oturum & Transcript',
  'help.workflow.title': 'İş Akışı Ayarları',
  'help.skills.title': 'Yetenekler (Skills)',
  'help.hooks.title': 'Hooks (Olay Otomasyonu)',
  'help.mcp.title': 'MCP Server Yönetimi',
  'help.subagents.title': 'Subagent Profilleri',
  'help.teams.title': 'Takım Modu',
  'help.worktree.title': 'Worktree İzolasyonu',
  'help.dashboard.title': 'Dashboard & İzleme',
  'help.tokenEfficiency.title': 'Token Verimliliği',
  'help.tips.title': 'İpuçları & En İyi Uygulamalar',

  // ============================================================
  // Animal labels — from @smith/types
  // ============================================================
  'animal.bear': 'Ayı',
  'animal.fox': 'Tilki',
  'animal.raccoon': 'Rakun',
  'animal.owl': 'Baykuş',
  'animal.elephant': 'Fil',
  'animal.octopus': 'Ahtapot',
  'animal.rabbit': 'Tavşan',
  'animal.squirrel': 'Sincap',
  'animal.cat': 'Kedi',
  'animal.dog': 'Köpek',

  // ============================================================
  // Skill categories — from @smith/types
  // ============================================================
  'skill.category.dev': 'Geliştirme',
  'skill.category.devops': 'DevOps',
  'skill.category.ai': 'AI / Veri',
  'skill.category.testing': 'Test / QA',
  'skill.category.docs': 'Dokümantasyon',
  'skill.category.general': 'Genel',

  // ============================================================
  // Subagent templates — from @smith/types
  // ============================================================
  'subagent.researcher.name': 'researcher',
  'subagent.researcher.desc': 'Güvenli Araştırmacı — sadece okuma yapabilir',
  'subagent.researcher.prompt': 'Sen güvenli bir araştırma ajanısın. Sadece dosyaları oku, analiz et ve raporla. Asla dosya değiştirme veya komut çalıştırma.',
  'subagent.fastCoder.name': 'fast-coder',
  'subagent.fastCoder.desc': 'Hızlı Kodlayıcı — Haiku ile hızlı kod yazımı',
  'subagent.fastCoder.prompt': 'Sen hızlı bir kodlama ajanısın. Kısa ve net değişiklikler yap. Gereksiz açıklama yapma, doğrudan kodu yaz.',
  'subagent.securityAuditor.name': 'security-auditor',
  'subagent.securityAuditor.desc': 'Güvenlik Denetçisi — güvenlik açıklarını tara',
  'subagent.securityAuditor.prompt': 'Sen bir güvenlik denetçisisin. Kodda güvenlik açıklarını (XSS, SQL injection, OWASP Top 10) ara ve raporla. Asla dosya değiştirme.',
  'subagent.testRunner.name': 'test-runner',
  'subagent.testRunner.desc': 'Test Koşucusu — sadece testleri çalıştırır',
  'subagent.testRunner.prompt': 'Sen bir test koşucu ajanısın. Testleri çalıştır, sonuçları analiz et ve rapor ver. Sadece test komutları çalıştır (npm test, pytest vb.).',

  // ============================================================
  // MCP Server templates — from @smith/types
  // ============================================================
  'mcp.github.desc': 'GitHub API — repo, issue, PR yönetimi',
  'mcp.filesystem.desc': 'Dosya sistemi erişimi (belirli dizin)',
  'mcp.sqlite.desc': 'SQLite veritabanı sorgu erişimi',
  'mcp.braveSearch.desc': 'Brave Search API ile web araması',
  'mcp.slack.desc': 'Slack kanal ve mesaj yönetimi',

  // ============================================================
  // Hook templates — from @smith/types
  // ============================================================
  'hookTemplate.autoFormat': 'Bash sonrası auto-format',
  'hookTemplate.prePushTest': 'Push öncesi test',
  'hookTemplate.taskNotify': 'Görev bitti bildirim',
  'hookTemplate.blockEnv': '.env okumayı engelle',

  // ============================================================
  // Project Complete Modal
  // ============================================================
  'projectComplete.title': 'Proje Tamamlandı!',
  'projectComplete.tasks': 'Görev',
  'projectComplete.agents': 'Ajan',
  'projectComplete.duration': 'Süre',
  'projectComplete.tokens': 'Token',
  'projectComplete.team': 'Katılımcılar',
  'projectComplete.cost': 'Maliyet',
  'projectComplete.close': 'Tamam',

  // ============================================================
  // Training — TrainingPanel.tsx & AgentModal training tab
  // ============================================================
  'training.title': 'Ajan Eğitimi',
  'training.profiles': 'Eğitim Profilleri',
  'training.newProfile': 'Yeni Eğitim',
  'training.profileName': 'Profil Adı',
  'training.projectMode': 'Proje Analizi',
  'training.techMode': 'Teknoloji Eğitimi',
  'training.projectPath': 'Proje Dizini (tam yol)',
  'training.techName': 'Teknoloji Adı (ör: Next.js, .NET Core)',
  'training.description': 'Koça Açıklama',
  'training.startTraining': 'Eğitimi Başlat',
  'training.retrain': 'Yeniden Eğit',
  'training.status.pending': 'Bekliyor',
  'training.status.analyzing': 'Analiz Ediliyor',
  'training.status.generating': 'Oluşturuluyor',
  'training.status.done': 'Tamamlandı',
  'training.status.error': 'Hata',
  'training.assignToAgent': 'Ajana Ata',
  'training.assignedProfile': 'Atanmış Profil',
  'training.removeFromAgent': 'Profili Kaldır',
  'training.preview': 'Önizleme',
  'training.noProfiles': 'Henüz eğitim profili yok',
  'training.selectProfile': 'Profil seçin',
  'training.clickStart': 'Eğitimi başlatmak için butona tıklayın',
  'training.confirmDelete': 'Bu eğitim profilini silmek istediğinize emin misiniz?',
  'training.delete': 'Sil',
  'training.export': 'Dışa Aktar',
  'training.import': 'İçe Aktar',
  'training.importError': 'Geçersiz eğitim profili dosyası. Lütfen geçerli bir JSON dosyası seçin.',
  'training.cancel': 'İptal',
  'training.create': 'Oluştur',
  'training.coach': 'Eğitim Koçu',
}

export default translations
