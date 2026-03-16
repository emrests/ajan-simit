# AjanSimit (SmithAgentOffice)

Claude Code ajanlarını yöneten web tabanlı ajan orkestrasyon platformu.
Hayvan karakterli ajanlar ofiste çalışır, proje/görev yönetimi ve gerçek zamanlı izleme sağlar.

## Teknoloji

- **Monorepo:** npm workspaces (`apps/frontend`, `apps/backend`, `packages/types`)
- **Frontend:** React 19 + Vite + Tailwind CSS + Framer Motion + Zustand + i18n (TR/EN)
- **Backend:** Express + ws (WebSocket) + better-sqlite3 + chokidar
- **AI:** Claude CLI subprocess (`claude` komutu) + @anthropic-ai/sdk
- **Port:** Backend 3005, Frontend 5173

## Proje Yapısı

```
packages/types/src/index.ts        — Tüm tipler (Office, Agent, Project, Task, Skill...)
apps/backend/src/
  index.ts                         — Express + WS sunucusu
  db/database.ts                   — SQLite şeması (17 tablo)
  agents/processManager.ts         — Claude CLI subprocess yönetimi (en büyük dosya ~1700 satır)
  agents/teamManager.ts            — Takım modu koordinasyonu
  agents/worktreeManager.ts        — Git worktree izolasyonu
  agents/subagentManager.ts        — Subagent profil sync
  agents/hookRunner.ts             — Hook çalıştırma motoru
  watcher/jsonlWatcher.ts          — JSONL transcript izleme
  ws/server.ts                     — WebSocket broadcast
  routes/                          — REST API (offices, agents, projects, sessions, skills, hooks, mcp, worktrees, teams, subagents, training, seed, messages)
apps/frontend/src/
  App.tsx                          — Ana uygulama, tema state (localStorage), isNight prop dağıtımı
  store/useStore.ts                — Zustand global state
  hooks/useApi.ts                  — REST API client
  hooks/useWebSocket.ts            — WS bağlantı yönetimi
  components/
    Office/OfficeView.tsx           — Oda tabanlı yerleşim (Çalışma/Kahve/Toplantı), tema renkleri
    Office/AgentDesk.tsx            — Ajan masası + hayvan karakter
    Sidebar/OfficeSidebar.tsx       — Sol sidebar: ofisler, dil, tema seçici, seed/reset
    Agent/AgentModal.tsx            — Ajan detay: 8 sekme (Profil, Claude, Transcript, Skills, MCP, Subagent, Training)
    Training/TrainingPanel.tsx      — Eğitim yönetim paneli (profil listesi + oluşturma formu)
    Project/ProjectPanel.tsx        — Proje: görevler, iş akışı, CLAUDE.md, worktree, hooks, takım
    Conversation/ConversationPanel.tsx — Mesaj akışı, özel kartlar
    Dashboard/DashboardPanel.tsx    — İstatistik, maliyet, tool kullanımı
  animals/AnimalSVG.tsx            — 10 SVG hayvan (bear, fox, raccoon, owl, elephant, octopus, rabbit, squirrel, cat, dog)
  i18n/locales/{tr,en}.ts          — Çeviriler
```

## Tema Sistemi

- 2 tema: `light` / `dark` — **uygulama geneli**, localStorage'da saklanır
- `App.tsx` → `appTheme` state + `isNight` boolean, tüm bileşenlere prop olarak geçer
- Açık: logo-light-small.png, logo alanı #f7f6f1, sidebar #faf9f5
- Koyu: logo-dark-small.png, logo alanı #14151a, sidebar #1a1b22
- Tema seçici: `OfficeSidebar.tsx` alt kısımda dil butonlarının altında
- `OfficeView.tsx` → THEMES objesi (floor, wall, window renkleri), ROOM_STYLES
- `index.css` → `.office-floor` (açık) + `.office-floor-dark` (koyu) zemin desenleri

## Önemli Kurallar

- TypeScript strict — her değişiklik sonrası `npx tsc --noEmit -p apps/frontend/tsconfig.json` ve backend kontrolü
- `isNight` prop'u koyu tema koşullu stilleri için kullanılır (blue tonları değil, slate/nötr tonlar)
- Emoji: JSX'te `\uXXXX` literal metin olarak render olur, gerçek emoji karakterleri kullanılmalı
- Backend port 3005 (3030 değil)
- DB şeması `database.ts`'de, migration yok — direkt CREATE IF NOT EXISTS
- Seed demo: `routes/seed.ts` → 2 demo proje (Tic Tac Toe + Not Defteri)
- Dil: localStorage'da `lang` key'i (tr/en), tema: `theme` key'i (light/dark)

## DB Tabloları (Özet)

offices, agents, projects, tasks, messages, approval_requests, skills, agent_skills,
session_logs, hooks, hook_logs, mcp_servers, agent_mcp_servers, subagents, teams,
teammates, worktrees, training_profiles, training_runs

## API Yapısı

Tüm API `/api/` altında. Ana endpoint grupları:
offices, agents, projects, tasks, sessions, skills, hooks, mcp-servers,
worktrees, teams, subagents, training-profiles, dashboard, token-stats, seed-demo, reset-db, health, messages

## Eğitim Sistemi

- `training_profiles` tablosu: id, name, description, content (MD), mode (project/technology), source, user_prompt, status
- `training_runs` tablosu: id, profile_id, status, input/output_tokens, started_at, completed_at
- `agents.training_profile_id`: Ajana atanmış eğitim profili
- Koç: `claude --print` ile async çalışır, proje modunda `--directory` ile dizine gider
- Enjeksiyon: `startSession()` içinde Skills'den önce `[Eğitim/Training: ...]` bloğu
- UI: OfficeSidebar'da 🎓 butonu → TrainingPanel, AgentModal'da "training" sekmesi
