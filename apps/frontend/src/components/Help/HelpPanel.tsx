import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'

interface HelpPanelProps {
  onClose: () => void
  isNight: boolean
}

type HelpSection =
  | 'start'
  | 'agents'
  | 'projects'
  | 'sessions'
  | 'workflow'
  | 'skills'
  | 'hooks'
  | 'mcp'
  | 'subagents'
  | 'teams'
  | 'worktree'
  | 'dashboard'
  | 'tokenEfficiency'
  | 'tips'

interface SectionInfo {
  key: HelpSection
  icon: string
  titleKey: string
  content: Record<string, string[]>
}

const SECTIONS: SectionInfo[] = [
  {
    key: 'start',
    icon: '🚀',
    titleKey: 'help.start.title',
    content: {
      tr: [
        'SmithAgentOffice, Claude Code CLI uzerinden yapay zeka ajanlarini gorsel olarak yonetmenizi saglayan bir platformdur.',
        '1. Sol paneldeki "+" butonuyla yeni bir ofis olusturun.',
        '2. Ofis icinde sag alttaki "+" butonuyla ajan ekleyin.',
        '3. Ajana bir hayvan avatari, rol ve sistem prompt\'u tanimlayabilirsiniz.',
        '4. "Projeler" panelinden yeni proje olusturup gorevler ekleyin.',
        '5. Gorevleri ajanlara atayin ve "Baslat" ile calistirin.',
        '6. Ajanlar Claude Code CLI uzerinden gorevleri otomatik olarak yerine getirir.',
        '',
        'Gereksinimler: Claude Code CLI\'nin sisteminizde yuklu ve calisir durumda olmasi gerekir.',
      ],
      en: [
        'SmithAgentOffice is a platform that lets you visually manage AI agents through the Claude Code CLI.',
        '1. Create a new office using the "+" button in the left panel.',
        '2. Add an agent using the "+" button at the bottom right of the office.',
        '3. You can assign an animal avatar, role, and system prompt to the agent.',
        '4. Create a new project and add tasks from the "Projects" panel.',
        '5. Assign tasks to agents and run them with "Start".',
        '6. Agents automatically execute tasks through the Claude Code CLI.',
        '',
        'Requirements: Claude Code CLI must be installed and running on your system.',
      ],
    },
  },
  {
    key: 'agents',
    icon: '🤖',
    titleKey: 'help.agents.title',
    content: {
      tr: [
        'Her ajan bir Claude Code oturumu olarak calisir.',
        '',
        'Ajan Olusturma:',
        '- Isim, Rol ve Hayvan avatari secin.',
        '- Sistem prompt ile ajanin davranisini belirleyin.',
        '- Opsiyonel: Model secimi (Opus / Sonnet / Haiku).',
        '',
        'Ajan Ayarlari:',
        '- Model: claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5-20251001',
        '- Max Turns: Tur limiti (0 = sinirsiz).',
        '- Efor Seviyesi: low / medium / high -- token tuketimini etkiler.',
        '- Izin Verilen Araclar: Ajanin kullanabilecegi Claude Code araclari (Read, Write, Bash vb.).',
        '- Yasakli Araclar: Kullanimini engellemek istediginiz araclar.',
        '- Ortam Degiskenleri: JSON formatinda ozel env vars.',
        '- Ek Sistem Prompt: Claude\'a eklenen ek talimatlar.',
        '- Sistem Prompt Dosyasi: Dosyadan prompt yukleme yolu.',
        '- Cikti Semasi: JSON Schema formatinda yapilandirilmis cikti.',
        '',
        'Durum Gostergeleri:',
        '- Bostta (gri): Ajan calismıyor.',
        '- Dusunuyor (sari): Claude islem yapiyor.',
        '- Yaziyor (mavi): Dosya yazma/duzenleme.',
        '- Okuyor (mor): Dosya okuma/arama.',
        '- Tamamladi (yesil): Gorev basariyla bitti.',
        '- Bekliyor (gri): Onay bekliyor.',
      ],
      en: [
        'Each agent runs as a Claude Code session.',
        '',
        'Creating an Agent:',
        '- Choose a Name, Role, and Animal avatar.',
        '- Define the agent\'s behavior with a system prompt.',
        '- Optional: Model selection (Opus / Sonnet / Haiku).',
        '',
        'Agent Settings:',
        '- Model: claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5-20251001',
        '- Max Turns: Turn limit (0 = unlimited).',
        '- Effort Level: low / medium / high — affects token consumption.',
        '- Allowed Tools: Claude Code tools the agent can use (Read, Write, Bash etc.).',
        '- Blocked Tools: Tools you want to prevent the agent from using.',
        '- Environment Variables: Custom env vars in JSON format.',
        '- Additional System Prompt: Extra instructions added to Claude.',
        '- System Prompt File: Path to load prompt from a file.',
        '- Output Schema: Structured output in JSON Schema format.',
        '',
        'Status Indicators:',
        '- Idle (gray): Agent is not running.',
        '- Thinking (yellow): Claude is processing.',
        '- Typing (blue): Writing/editing files.',
        '- Reading (purple): Reading/searching files.',
        '- Completed (green): Task finished successfully.',
        '- Waiting (gray): Waiting for approval.',
      ],
    },
  },
  {
    key: 'projects',
    icon: '📁',
    titleKey: 'help.projects.title',
    content: {
      tr: [
        '"Projeler" panelinden proje olusturabilir ve yonetebilirsiniz.',
        '',
        'Proje Olusturma:',
        '- Proje adi ve aciklama girin.',
        '- Calisma Dizini (Work Dir): Ajanların dosya islemleri yapacagi klasor.',
        '- Bu klasor mevcut bir git reposu olabilir.',
        '',
        'Gorev Yonetimi:',
        '- Her projeye birden fazla gorev eklenebilir.',
        '- Gorevler ajanlara atanabilir.',
        '- Bagimlilık: Bir gorev baska bir gorevin tamamlanmasini bekleyebilir.',
        '- Gorev durumlari: Bekliyor / Devam Ediyor / Tamamlandi.',
        '',
        'Proje Calistirma:',
        '- "Projeyi Baslat" butonu tum atanmis gorevleri paralel baslatir.',
        '- Bagimliligi olan gorevler otomatik olarak siradaki gorevi tetikler.',
        '- "Tek Gorev Baslat" ile tekil gorev de calistirilabilir.',
        '',
        'PM ile Otomatik Planlama:',
        '- PM ajani seciliyse "Otomatik Planla" butonuyla Claude gorev plani olusturur.',
        '- PM ajani, gorevler tamamlandikca degerlendirme yapar ve sonraki adimi koordine eder.',
      ],
      en: [
        'You can create and manage projects from the "Projects" panel.',
        '',
        'Creating a Project:',
        '- Enter a project name and description.',
        '- Working Directory (Work Dir): The folder where agents perform file operations.',
        '- This folder can be an existing git repository.',
        '',
        'Task Management:',
        '- Multiple tasks can be added to each project.',
        '- Tasks can be assigned to agents.',
        '- Dependencies: A task can wait for another task to complete.',
        '- Task statuses: Waiting / In Progress / Completed.',
        '',
        'Running a Project:',
        '- The "Start Project" button launches all assigned tasks in parallel.',
        '- Tasks with dependencies automatically trigger the next task.',
        '- Individual tasks can also be started with "Start Task".',
        '',
        'Auto-Planning with PM:',
        '- If a PM agent is selected, the "Auto Plan" button lets Claude create a task plan.',
        '- The PM agent evaluates as tasks complete and coordinates the next step.',
      ],
    },
  },
  {
    key: 'sessions',
    icon: '🖥️',
    titleKey: 'help.sessions.title',
    content: {
      tr: [
        'Her ajan icin bir Claude Code oturumu baslatilabilir.',
        '',
        'Oturum Baslatma:',
        '- Ajan modali > "Oturum Baslat" -- calisma dizini ve gorev girin.',
        '- Veya proje panelinden gorev calistirin.',
        '',
        'Canli Izleme:',
        '- Ajan calisirken durum (dusunuyor/yaziyor/okuyor) gercek zamanli guncellenir.',
        '- Kullanilan araclar (Bash, Write, Read vb.) konusma balonunda gosterilir.',
        '- Token tuketimi anlık olarak izlenir.',
        '',
        'JSONL Dosya Izleme:',
        '- Claude CLI\'nin olusturdugu JSONL dosyalari otomatik bulunur.',
        '- Manuel olarak da JSONL dosyasi baglanabilir.',
        '',
        'Session Replay:',
        '- "Replay" panelinden gecmis oturumlar izlenebilir.',
        '- Transcript: Ajanin tum arac kullanimi ve yanitlari goruntulenir.',
      ],
      en: [
        'A Claude Code session can be started for each agent.',
        '',
        'Starting a Session:',
        '- Agent modal > "Start Session" — enter working directory and task.',
        '- Or run a task from the project panel.',
        '',
        'Live Monitoring:',
        '- Agent status (thinking/typing/reading) updates in real time while running.',
        '- Tools used (Bash, Write, Read etc.) are shown in conversation bubbles.',
        '- Token consumption is tracked in real time.',
        '',
        'JSONL File Watching:',
        '- JSONL files created by Claude CLI are automatically discovered.',
        '- JSONL files can also be connected manually.',
        '',
        'Session Replay:',
        '- Past sessions can be watched from the "Replay" panel.',
        '- Transcript: All tool usage and responses from the agent are displayed.',
      ],
    },
  },
  {
    key: 'workflow',
    icon: '⚙️',
    titleKey: 'help.workflow.title',
    content: {
      tr: [
        'Her proje icin is akisi politikalari ayarlanabilir.',
        '',
        'Onay Politikasi:',
        '- Otomatik: Tum islemler onaysiz yapilir.',
        '- Kullaniciya Sor: Kritik islemlerde kullanicidan onay istenir.',
        '- PM\'e Sor: PM ajani onay degerlendirir.',
        '',
        'Hata Politikasi:',
        '- Durdur: Hata olunca gorev durur.',
        '- PM\'e Bildir: PM ajani hatayi analiz eder ve yeniden atar.',
        '- Otomatik Yeniden Dene: 1 kez otomatik yeniden dener.',
        '',
        'Is Akisi Modu:',
        '- Serbest: Her ajan bagimsiz calisir.',
        '- Koordineli: PM ajani gorevleri koordine eder.',
        '- Takim: Takim modu ile isbirligi.',
        '',
        'Baglamm Modu (Token Verimliligi):',
        '- Tam: Tum tamamlanan gorevler baglam olarak gonderilir.',
        '- Kompakt: Son 3 gorev + ozet.',
        '- Minimal: Sadece ilerleme yuzdesi.',
        '',
        'CLAUDE.md:',
        '- Proje icin CLAUDE.md icerigini tanimlayin.',
        '- Her oturum basinda calisma dizinine yazilir.',
      ],
      en: [
        'Workflow policies can be configured for each project.',
        '',
        'Approval Policy:',
        '- Automatic: All operations proceed without approval.',
        '- Ask User: User approval is requested for critical operations.',
        '- Ask PM: PM agent evaluates the approval.',
        '',
        'Error Policy:',
        '- Stop: Task stops on error.',
        '- Notify PM: PM agent analyzes the error and reassigns.',
        '- Auto Retry: Automatically retries once.',
        '',
        'Workflow Mode:',
        '- Free: Each agent works independently.',
        '- Coordinated: PM agent coordinates tasks.',
        '- Team: Collaboration via team mode.',
        '',
        'Context Mode (Token Efficiency):',
        '- Full: All completed tasks are sent as context.',
        '- Compact: Last 3 tasks + summary.',
        '- Minimal: Only progress percentage.',
        '',
        'CLAUDE.md:',
        '- Define CLAUDE.md content for the project.',
        '- Written to the working directory at the start of each session.',
      ],
    },
  },
  {
    key: 'skills',
    icon: '🎯',
    titleKey: 'help.skills.title',
    content: {
      tr: [
        'Yetenekler, ajanlara eklenebilen yeniden kullanilabilir talimat setleridir.',
        '',
        'Yetenek Olusturma:',
        '- Isim, aciklama ve icerik (Markdown) girin.',
        '- Kategori: Gelistirme, DevOps, AI, Test, Dokuumantasyon, Genel.',
        '',
        'Ajana Yetenek Ekleme:',
        '- Ajan modali > "Skills" sekmesi.',
        '- Mevcut yeteneklerden secip baglayin.',
        '- Bagli yetenekler her oturumda sistem prompt\'a eklenir.',
        '',
        'Toplu Aktarim:',
        '- Markdown dosyasindan import.',
        '- Git reposundan toplu import.',
        '- Batch import destegi.',
      ],
      en: [
        'Skills are reusable instruction sets that can be added to agents.',
        '',
        'Creating a Skill:',
        '- Enter a name, description, and content (Markdown).',
        '- Category: Development, DevOps, AI, Testing, Documentation, General.',
        '',
        'Adding Skills to an Agent:',
        '- Agent modal > "Skills" tab.',
        '- Select and connect from existing skills.',
        '- Connected skills are added to the system prompt in every session.',
        '',
        'Bulk Import:',
        '- Import from Markdown files.',
        '- Bulk import from a Git repo.',
        '- Batch import support.',
      ],
    },
  },
  {
    key: 'hooks',
    icon: '🪝',
    titleKey: 'help.hooks.title',
    content: {
      tr: [
        'Hook\'lar, belirli olaylarda otomatik calisan kurallardir.',
        '',
        'Olay Turleri:',
        '- PreToolUse: Bir arac kullanilmadan once.',
        '- PostToolUse: Arac kullanildiktan sonra.',
        '- SessionStart / SessionStop: Oturum baslangici/bitisi.',
        '- TaskCompleted / TaskFailed: Gorev tamamlandi/basarisiz.',
        '- Notification: Bildirim olayları.',
        '',
        'Hook Tipleri:',
        '- Shell Komutu: Bir komut calistirir (npm test, prettier vb.).',
        '- Webhook: HTTP POST istegi gonderir.',
        '- LLM Degerlendirme: Prompt ile degerlendirme yapar.',
        '',
        'Matcher (Eslestirici):',
        '- Belirli bir arac adina gore filtreleme.',
        '- Ornek: "Bash" -- sadece Bash araci kullanildiginda tetiklenir.',
        '- Ornek: "Bash(git push*)" -- git push komutlarinda tetiklenir.',
        '',
        'Hazir Sablonlar: Proje panelindeki hook bolumunden sablon secebilirsiniz.',
      ],
      en: [
        'Hooks are rules that automatically run on specific events.',
        '',
        'Event Types:',
        '- PreToolUse: Before a tool is used.',
        '- PostToolUse: After a tool is used.',
        '- SessionStart / SessionStop: Session start/end.',
        '- TaskCompleted / TaskFailed: Task completed/failed.',
        '- Notification: Notification events.',
        '',
        'Hook Types:',
        '- Shell Command: Runs a command (npm test, prettier etc.).',
        '- Webhook: Sends an HTTP POST request.',
        '- LLM Evaluation: Evaluates with a prompt.',
        '',
        'Matcher:',
        '- Filter by specific tool name.',
        '- Example: "Bash" — triggers only when Bash tool is used.',
        '- Example: "Bash(git push*)" — triggers on git push commands.',
        '',
        'Ready Templates: You can select templates from the hooks section in the project panel.',
      ],
    },
  },
  {
    key: 'mcp',
    icon: '🔌',
    titleKey: 'help.mcp.title',
    content: {
      tr: [
        'MCP (Model Context Protocol) sunuculari, ajanlara ek araclar saglar.',
        '',
        'MCP Sunucu Ekleme:',
        '- Sol paneldeki MCP Server bolumunden ekleyin.',
        '- Transport: stdio (komut tabanli), SSE veya HTTP.',
        '- Komut, arguman ve ortam degiskenleri belirleyin.',
        '',
        'Hazir Sablonlar:',
        '- GitHub: Repo, issue, PR yonetimi.',
        '- Filesystem: Dosya sistemi erisimi.',
        '- SQLite: Veritabani sorgulama.',
        '- Brave Search: Web aramasi.',
        '- Slack: Kanal ve mesaj yonetimi.',
        '',
        'Ajana Baglama:',
        '- Ajan modali > "MCP" sekmesinden sunucu baglayın.',
        '- Bagli sunucular oturum baslatilirken --mcp-config ile enjekte edilir.',
        '',
        'Kapsam:',
        '- Kullanici: Tum projelerde gecerli.',
        '- Proje: Sadece belirli projede gecerli.',
      ],
      en: [
        'MCP (Model Context Protocol) servers provide additional tools to agents.',
        '',
        'Adding an MCP Server:',
        '- Add from the MCP Server section in the left panel.',
        '- Transport: stdio (command-based), SSE, or HTTP.',
        '- Set command, arguments, and environment variables.',
        '',
        'Ready Templates:',
        '- GitHub: Repo, issue, PR management.',
        '- Filesystem: File system access.',
        '- SQLite: Database querying.',
        '- Brave Search: Web search.',
        '- Slack: Channel and message management.',
        '',
        'Connecting to an Agent:',
        '- Connect a server from the Agent modal > "MCP" tab.',
        '- Connected servers are injected via --mcp-config when starting a session.',
        '',
        'Scope:',
        '- User: Valid across all projects.',
        '- Project: Valid only for a specific project.',
      ],
    },
  },
  {
    key: 'subagents',
    icon: '🤖',
    titleKey: 'help.subagents.title',
    content: {
      tr: [
        'Subagent\'lar, Claude Code\'un --agent parametresiyle kullandigi ozel profilerdir.',
        '',
        'Subagent Olusturma:',
        '- Ajan modali > "Subagent" sekmesi > yeni olustur.',
        '- Isim, aciklama, prompt, model, arac izinleri belirleyin.',
        '- .claude/agents/<isim>.md dosyasi olarak kaydedilir.',
        '',
        'Hazir Sablonlar:',
        '- Arastirmaci: Sadece okuma yapan guvenli ajan.',
        '- Hızlı Kodlayici: Haiku ile hizli kod yazimi.',
        '- Guvenlik Denetcisi: Guvenlik aciklari tarayıcı.',
        '- Test Kosucu: Sadece test calistiran ajan.',
        '',
        'Profil Aktarma:',
        '- Mevcut ajan ayarlarini subagent profiline aktarabilirsiniz.',
        '- "Profili Aktar" butonu ile tek tikla donusum.',
        '',
        'Kapsam:',
        '- Proje: Proje dizinindeki .claude/agents/ altina kaydedilir.',
        '- Kullanici: ~/.claude/agents/ altina kaydedilir (global).',
      ],
      en: [
        'Subagents are custom profiles used by Claude Code with the --agent parameter.',
        '',
        'Creating a Subagent:',
        '- Agent modal > "Subagent" tab > create new.',
        '- Set name, description, prompt, model, and tool permissions.',
        '- Saved as a .claude/agents/<name>.md file.',
        '',
        'Ready Templates:',
        '- Researcher: A safe agent that only reads.',
        '- Fast Coder: Quick coding with Haiku.',
        '- Security Auditor: Vulnerability scanner.',
        '- Test Runner: An agent that only runs tests.',
        '',
        'Profile Export:',
        '- You can export existing agent settings to a subagent profile.',
        '- One-click conversion with the "Export Profile" button.',
        '',
        'Scope:',
        '- Project: Saved under .claude/agents/ in the project directory.',
        '- User: Saved under ~/.claude/agents/ (global).',
      ],
    },
  },
  {
    key: 'teams',
    icon: '👥',
    titleKey: 'help.teams.title',
    content: {
      tr: [
        'Takim modu, birden fazla ajanin isbirligi yapmasini saglar.',
        '',
        'Takim Olusturma:',
        '- Proje paneli > Is Akisi Modu = "Takim" secin.',
        '- Takim adi ve lider ajan belirleyin.',
        '- Takim uyelerini ekleyin (max 16).',
        '',
        'Calisma Prensibi:',
        '- Lider ajan, takim uyelerine gorev dagitir.',
        '- CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 ortam degiskeni kullanilir.',
        '- Lider, Claude CLI uzerinden takimi koordine eder.',
        '',
        'Takım Yonetimi:',
        '- Baslat: Tum takimi isbirligi modunda calistirir.',
        '- Durdur: Aktif oturumu sonlandirir.',
        '- Uye Ekle/Cikar: Takim yapisini dinamik degistirin.',
      ],
      en: [
        'Team mode enables multiple agents to collaborate.',
        '',
        'Creating a Team:',
        '- Project panel > Workflow Mode = "Team".',
        '- Set a team name and leader agent.',
        '- Add team members (max 16).',
        '',
        'How It Works:',
        '- The leader agent distributes tasks to team members.',
        '- Uses the CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 environment variable.',
        '- The leader coordinates the team through the Claude CLI.',
        '',
        'Team Management:',
        '- Start: Runs the entire team in collaboration mode.',
        '- Stop: Terminates the active session.',
        '- Add/Remove Members: Dynamically change the team structure.',
      ],
    },
  },
  {
    key: 'worktree',
    icon: '🌳',
    titleKey: 'help.worktree.title',
    content: {
      tr: [
        'Git Worktree ile her ajan kendi branch\'inde izole calisabilir.',
        '',
        'Aktiflestime:',
        '- Proje paneli > Izolasyon Modu = "Worktree" secin.',
        '- Projenin calisma dizini bir git reposu olmalidir.',
        '',
        'Nasil Calisir:',
        '- Her ajan icin otomatik worktree olusturulur.',
        '- Branch adi: agent/<ajan-adi>/<kisa-id>',
        '- Dizin: .claude/worktrees/<ajan-adi>',
        '',
        'Birlestirme (Merge):',
        '- Worktree tamamlaninca "Birlestir" butonuyla ana branch\'e merge.',
        '- Cakisma tespiti: Dry-run merge ile onceden kontrol edilir.',
        '- Cakisma varsa worktree "conflict" durumuna gecer.',
        '',
        'Durum Yenileme:',
        '- "Yenile" butonu ile degisen dosya sayisi ve commit farki guncellenir.',
        '- Oturum bitiminde otomatik guncelleme.',
      ],
      en: [
        'With Git Worktree, each agent can work in isolation on its own branch.',
        '',
        'Activation:',
        '- Project panel > Isolation Mode = "Worktree".',
        '- The project\'s working directory must be a git repository.',
        '',
        'How It Works:',
        '- A worktree is automatically created for each agent.',
        '- Branch name: agent/<agent-name>/<short-id>',
        '- Directory: .claude/worktrees/<agent-name>',
        '',
        'Merging:',
        '- Merge to the main branch with the "Merge" button when the worktree is complete.',
        '- Conflict detection: Checked in advance with a dry-run merge.',
        '- If there are conflicts, the worktree enters a "conflict" state.',
        '',
        'Status Refresh:',
        '- The "Refresh" button updates the changed file count and commit difference.',
        '- Automatic update when the session ends.',
      ],
    },
  },
  {
    key: 'dashboard',
    icon: '📊',
    titleKey: 'help.dashboard.title',
    content: {
      tr: [
        'Dashboard, ofis genelinde detayli istatistikler sunar.',
        '',
        'Sekmeler:',
        '- Genel: Ozet kartlar, gorev ilerleme, token/maliyet ozeti, gunluk grafik.',
        '- Maliyet: Toplam ve ajan bazli maliyet, gunluk trend.',
        '- Araclar: En cok kullanilan Claude Code araclari.',
        '- Ajanlar: Performans kartlari, verimlilik skoru (gorev/K-token).',
        '- Aktivite: Son mesajlar ve olaylar zaman cizelgesi.',
        '',
        'Maliyet Hesaplama:',
        '- Opus: $15 / M input, $75 / M output',
        '- Sonnet: $3 / M input, $15 / M output',
        '- Haiku: $0.8 / M input, $4 / M output',
        '',
        'Butce Limiti:',
        '- SMITH_MAX_BUDGET_USD ortam degiskeniyle ajanin oturum butcesini sinirlayin.',
        '- Limit asildiginda oturum otomatik durdurulur.',
        '',
        'Disa Aktarma:',
        '- MD: Markdown raporu.',
        '- CSV: Tablo formatinda metrikler.',
        '- JSON: Programatik erisim icin JSON verisi.',
      ],
      en: [
        'Dashboard provides detailed statistics across the office.',
        '',
        'Tabs:',
        '- Overview: Summary cards, task progress, token/cost summary, daily chart.',
        '- Costs: Total and per-agent cost, daily trend.',
        '- Tools: Most used Claude Code tools.',
        '- Agents: Performance cards, efficiency score (tasks/K-tokens).',
        '- Activity: Recent messages and events timeline.',
        '',
        'Cost Calculation:',
        '- Opus: $15 / M input, $75 / M output',
        '- Sonnet: $3 / M input, $15 / M output',
        '- Haiku: $0.8 / M input, $4 / M output',
        '',
        'Budget Limit:',
        '- Limit agent session budget with the SMITH_MAX_BUDGET_USD environment variable.',
        '- Session is automatically stopped when the limit is exceeded.',
        '',
        'Export:',
        '- MD: Markdown report.',
        '- CSV: Metrics in table format.',
        '- JSON: JSON data for programmatic access.',
      ],
    },
  },
  {
    key: 'tokenEfficiency',
    icon: '⚡',
    titleKey: 'help.tokenEfficiency.title',
    content: {
      tr: [
        'Token tuketimi dogrudan maliyeti belirler. Asagidaki yontemlerle ayni kalitede sonuclari cok daha az tokenle alabilirsiniz.',
        '',
        '1. Model Secimi — En Buyuk Etki:',
        '- Opus: $15/$75 (input/output per M token). Sadece karmasik koordinasyon ve mimari kararlar icin.',
        '- Sonnet: $3/$15. Kod yazma, debugging, cogu gelistirme gorevi icin ideal.',
        '- Haiku: $0.8/$4. Test, kod inceleme, basit gorevler, subagent olarak mukemmel.',
        '- Kural: Bir gorev Haiku ile yapilabiliyorsa, Sonnet kullanmayin.',
        '',
        '2. System Prompt Optimizasyonu:',
        '- System prompt HER turda gonderilir. 1000 karakter = ~250 token × tur sayisi.',
        '- Kisa ve oze odakli promptlar yazin (5-8 satir yeterli).',
        '- Gereksiz ornekleri cikartin, davranis kurallarini maddeleyin.',
        '- Uzun referans bilgilerini prompt yerine skill olarak ekleyin (skill sadece basa eklenir).',
        '',
        '3. Context Mode — Kritik Ayar:',
        '- Full: Tum tamamlanan gorev ciktilari sonraki gorevlere eklenir. En pahali.',
        '- Compact: Son 3 gorev + ozet. Cogu proje icin en iyi denge.',
        '- Minimal: Sadece ilerleme yuzdesi. En ucuz ama baglam kaybi yasanabilir.',
        '- Oneri: Varsayilan olarak "compact" kullanin. Sadece birbirine cok bagli gorevlerde "full" secin.',
        '',
        '4. Effort Level:',
        '- high: Model daha uzun dusunur, daha fazla token harcar. Karmasik gorevler icin.',
        '- medium: Cogu gorev icin yeterli. Varsayilan olarak bunu kullanin.',
        '- low: Basit, rutinize gorevler icin (format duzenleme, basit kod uretimi).',
        '',
        '5. Max Turns:',
        '- Her tur = 1 API cagirisi. 30 tur yerine 10 tur cok fark yaratir.',
        '- Basit gorevler: 5-8 tur yeterli.',
        '- Orta gorevler: 10-15 tur.',
        '- Karmasik gorevler: 20-30 tur.',
        '- Gorev bitmezse devam ettirmek, gereksiz yere 30 tur vermekten ucuzdur.',
        '',
        '6. Gorev Aciklamasi Yazma:',
        '- Net ve spesifik gorev aciklamalari yazin.',
        '- "API yaz" yerine "Express ile GET /notes, POST /notes, DELETE /notes/:id endpointleri yaz" deyin.',
        '- Belirsiz gorevler modelin daha cok tur donmesine neden olur.',
        '',
        '7. Subagent ile Delegasyon:',
        '- Arastirma gorevlerini Haiku subagent\'a devredin (salt okunur).',
        '- Ana ajan Sonnet, subagent Haiku = toplam maliyet %60 daha az.',
        '',
        '8. Skill Kullanimi:',
        '- Skill icerigi system prompt\'a eklenir, bu da token arttirir.',
        '- Skill icerigi kisa ve oze odakli olmali (500-800 karakter ideal).',
        '- Gereksiz skill baglamamayin — her skill prompt\'u buyutur.',
        '',
        '9. Butce Siniri:',
        '- SMITH_MAX_BUDGET_USD ortam degiskeni ile oturum butcesi koyun.',
        '- Limit asildiginda oturum otomatik durur.',
        '- Dashboard > Maliyetler sekmesinden harcamalari takip edin.',
        '',
        '10. Pratik Karsilastirma:',
        '- Tam demo (5 ajan, 8 gorev, full context): ~$2-5 / calisma.',
        '- Hafif demo (2 ajan, 3 gorev, compact context): ~$0.20-0.50 / calisma.',
        '- Fark: 10 kata kadar tasarruf, benzer kalitede sonuc.',
      ],
      en: [
        'Token consumption directly determines cost. With the methods below you can get the same quality results with far fewer tokens.',
        '',
        '1. Model Selection — Biggest Impact:',
        '- Opus: $15/$75 (input/output per M token). Only for complex coordination and architectural decisions.',
        '- Sonnet: $3/$15. Ideal for coding, debugging, most development tasks.',
        '- Haiku: $0.8/$4. Excellent for testing, code review, simple tasks, and as a subagent.',
        '- Rule: If a task can be done with Haiku, don\'t use Sonnet.',
        '',
        '2. System Prompt Optimization:',
        '- System prompt is sent EVERY turn. 1000 chars = ~250 tokens × number of turns.',
        '- Write short, focused prompts (5-8 lines is enough).',
        '- Remove unnecessary examples, use bullet points for behavior rules.',
        '- Add long reference info as a skill instead of in the prompt (skill is prepended once).',
        '',
        '3. Context Mode — Critical Setting:',
        '- Full: All completed task outputs are appended to subsequent tasks. Most expensive.',
        '- Compact: Last 3 tasks + summary. Best balance for most projects.',
        '- Minimal: Only progress percentage. Cheapest but may lose context.',
        '- Recommendation: Use "compact" as default. Only use "full" for highly interdependent tasks.',
        '',
        '4. Effort Level:',
        '- high: Model thinks longer, spends more tokens. For complex tasks.',
        '- medium: Sufficient for most tasks. Use this as default.',
        '- low: For simple, routine tasks (formatting, simple code generation).',
        '',
        '5. Max Turns:',
        '- Each turn = 1 API call. 10 turns instead of 30 makes a huge difference.',
        '- Simple tasks: 5-8 turns is enough.',
        '- Medium tasks: 10-15 turns.',
        '- Complex tasks: 20-30 turns.',
        '- Continuing an unfinished task is cheaper than giving 30 turns unnecessarily.',
        '',
        '6. Writing Task Descriptions:',
        '- Write clear, specific task descriptions.',
        '- Instead of "write API", say "write GET /notes, POST /notes, DELETE /notes/:id endpoints with Express".',
        '- Vague tasks cause the model to spend more turns.',
        '',
        '7. Delegation with Subagents:',
        '- Delegate research tasks to a Haiku subagent (read-only).',
        '- Main agent on Sonnet + subagent on Haiku = 60% lower total cost.',
        '',
        '8. Skill Usage:',
        '- Skill content is appended to system prompt, increasing tokens.',
        '- Keep skill content short and focused (500-800 chars ideal).',
        '- Don\'t attach unnecessary skills — each skill enlarges the prompt.',
        '',
        '9. Budget Limit:',
        '- Set session budget with the SMITH_MAX_BUDGET_USD environment variable.',
        '- Session stops automatically when the limit is exceeded.',
        '- Track spending from Dashboard > Costs tab.',
        '',
        '10. Practical Comparison:',
        '- Full demo (5 agents, 8 tasks, full context): ~$2-5 / run.',
        '- Light demo (2 agents, 3 tasks, compact context): ~$0.20-0.50 / run.',
        '- Difference: Up to 10x savings, similar quality results.',
      ],
    },
  },
  {
    key: 'tips',
    icon: '💡',
    titleKey: 'help.tips.title',
    content: {
      tr: [
        'Verimli Kullanim:',
        '- Basit gorevler icin Haiku modeli kullanin -- %90 daha ucuz.',
        '- Efor seviyesini "low" yapin sadece basit gorevler icin.',
        '- Max turns ile gereksiz uzun oturumlari sinirlayin.',
        '',
        'Proje Organizasyonu:',
        '- Her proje icin ayri calisma dizini kullanin.',
        '- PM ajani atayarak koordineli is akisi kurun.',
        '- Gorev bagimliliklaini dogru kurun (A tamamlaninca B baslasin).',
        '',
        'Guvenlik:',
        '- Hassas dosyalar icin Read/Grep ile salt okunur profil kullanin.',
        '- Hooks ile .env dosyasi okumayı engelleyin.',
        '- Subagent profilleriyle arac erisimini sinirlayin.',
        '',
        'Hata Ayiklama:',
        '- Session Replay ile gecmis oturumlari inceleyin.',
        '- JSONL dosyalarindan detayli tool akisini gorun.',
        '- Dashboard > Araclar sekmesinden hangi tool\'larin kullanildigini kontrol edin.',
        '',
        'Performans & Token Tasarrufu:',
        '- Kompakt baglam modu ile token tuketimini azaltin.',
        '- Worktree izolasyonu ile paralel calismada cakismalari onleyin.',
        '- Takim modu ile buyuk projeleri parcalayarak hizlandirin.',
        '- Detayli rehber icin "Token Verimliligi" bolumune bakin.',
      ],
      en: [
        'Efficient Usage:',
        '- Use the Haiku model for simple tasks — 90% cheaper.',
        '- Set effort level to "low" for simple tasks only.',
        '- Limit unnecessarily long sessions with max turns.',
        '',
        'Project Organization:',
        '- Use a separate working directory for each project.',
        '- Set up a coordinated workflow by assigning a PM agent.',
        '- Set task dependencies correctly (B starts when A completes).',
        '',
        'Security:',
        '- Use Read/Grep read-only profiles for sensitive files.',
        '- Block .env file reading with hooks.',
        '- Restrict tool access with subagent profiles.',
        '',
        'Debugging:',
        '- Review past sessions with Session Replay.',
        '- View detailed tool flow from JSONL files.',
        '- Check which tools are used from Dashboard > Tools tab.',
        '',
        'Performance & Token Savings:',
        '- Reduce token consumption with compact context mode.',
        '- Prevent conflicts in parallel work with worktree isolation.',
        '- Speed up large projects by splitting them with team mode.',
        '- See the "Token Efficiency" section for a detailed guide.',
      ],
    },
  },
]

export function HelpPanel({ onClose, isNight }: HelpPanelProps) {
  const { t, i18n } = useTranslation()
  const [activeSection, setActiveSection] = useState<HelpSection>('start')
  const lang = i18n.language.startsWith('en') ? 'en' : 'tr'

  const section = SECTIONS.find(s => s.key === activeSection) ?? SECTIONS[0]
  const content = section.content[lang] ?? section.content['tr']

  const cardBg = isNight ? 'bg-[#1a2a4a] border-[#2a3a5a]' : 'bg-white border-[#e8d5c4]'
  const titleColor = isNight ? 'text-blue-100' : 'text-[#3d2b1f]'
  const subColor = isNight ? 'text-blue-300' : 'text-[#a08060]'
  const textColor = isNight ? 'text-blue-200' : 'text-[#5c3d1f]'

  return (
    <AnimatePresence>
      <motion.div
        className="absolute inset-0 z-40 flex flex-col"
        style={{ background: isNight ? 'rgba(10,15,30,0.97)' : 'rgba(250,247,244,0.97)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Baslik */}
        <div className={`flex items-center gap-3 px-6 py-3 border-b-2 ${isNight ? 'border-[#2a3a5a]' : 'border-[#e8d5c4]'}`}>
          <span className="text-2xl">📖</span>
          <div>
            <h2 className={`font-black text-lg ${titleColor}`}>{t('help.title')}</h2>
            <p className={`text-[10px] ${subColor}`}>{t('help.subtitle')}</p>
          </div>
          <button
            onClick={onClose}
            className={`ml-auto w-7 h-7 rounded-full flex items-center justify-center text-lg transition-colors ${isNight ? 'hover:bg-[#2a3a5a] text-blue-300' : 'hover:bg-[#f5e6d3] text-[#7a5c3f]'}`}
          >
            x
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sol menu */}
          <div className={`w-48 border-r overflow-y-auto py-2 ${isNight ? 'border-[#2a3a5a]' : 'border-[#e8d5c4]'}`}>
            {SECTIONS.map(s => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`w-full text-left px-3 py-2 text-[11px] font-bold transition-colors flex items-center gap-2 ${
                  activeSection === s.key
                    ? (isNight ? 'bg-blue-600/20 text-blue-200' : 'bg-[#7eb5a6]/10 text-[#3d6b5a]')
                    : (isNight ? 'text-blue-300 hover:bg-[#2a3a5a]/50' : 'text-[#7a5c3f] hover:bg-[#f5e6d3]')
                }`}
              >
                <span>{s.icon}</span>
                <span className="truncate">{t(s.titleKey)}</span>
              </button>
            ))}
          </div>

          {/* Icerik */}
          <div className="flex-1 overflow-y-auto p-6">
            <motion.div
              key={section.key}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{section.icon}</span>
                <h3 className={`font-black text-lg ${titleColor}`}>{t(section.titleKey)}</h3>
              </div>

              <div className={`rounded-2xl border-2 p-5 ${cardBg}`}>
                <div className="space-y-1">
                  {content.map((line, i) => {
                    if (line === '') {
                      return <div key={i} className="h-2" />
                    }
                    // Baslik satiri (: ile biten)
                    if (line.endsWith(':') && !line.startsWith('-')) {
                      return (
                        <p key={i} className={`font-black text-sm mt-3 mb-1 ${titleColor}`}>
                          {line}
                        </p>
                      )
                    }
                    // Numarali adim
                    if (/^\d+\./.test(line)) {
                      return (
                        <p key={i} className={`text-[12px] leading-relaxed pl-2 ${textColor}`}>
                          {line}
                        </p>
                      )
                    }
                    // Madde isareti
                    if (line.startsWith('- ')) {
                      return (
                        <p key={i} className={`text-[12px] leading-relaxed pl-4 ${textColor}`}>
                          <span className={`${isNight ? 'text-blue-400' : 'text-[#7eb5a6]'}`}>&#8226;</span>{' '}
                          {line.slice(2)}
                        </p>
                      )
                    }
                    // Normal paragraf
                    return (
                      <p key={i} className={`text-[12px] leading-relaxed ${textColor}`}>
                        {line}
                      </p>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Alt bilgi */}
        <div className={`px-6 py-2 border-t text-center ${isNight ? 'border-[#2a3a5a]' : 'border-[#e8d5c4]'}`}>
          <p className={`text-[9px] ${subColor}`}>
            {t('help.footer')}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
