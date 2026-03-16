<div align="center">

**English** | [Türkçe](README.tr.md)

<img src="images/logo.png" alt="Ajan Simit" width="200">

# Ajan Simit

**AI Agent Orchestration Platform for Claude Code**

Manage multiple Claude Code agents in a virtual office environment.
Assign roles, coordinate tasks, and monitor everything in real-time.

[Getting Started](#getting-started) · [Features](#features) · [Architecture](#architecture)

</div>

---

> **What's in a name?** Simit is one of the most iconic street foods in Turkey— a sesame-covered bread ring that accompanies mornings, tea, ferry rides, and everyday conversations. Simple, affordable, and everywhere, it's practically a cultural symbol. The name *Ajan Simit* is both a tribute to this beloved snack and a small tech joke: it sounds a lot like *Agent Smith* from The Matrix. But instead of a mysterious digital antagonist, imagine a friendly Turkish simit managing your AI agents. In short, Ajan Simit is a playful name for a serious tool—an agent manager inspired by one of Turkey's most famous snacks.

---

![Office View](images/project.png)

## Features

**Office & Agents** — Create offices, add agents with unique animal characters, assign roles (PM, Backend, Frontend, Tester, Reviewer), and watch them work at their desks.

**Project Management** — Define projects with task dependencies, workflow modes (solo/coordinated/parallel), approval policies, and CLAUDE.md injection.

**Real-time Monitoring** — Live WebSocket updates, JSONL transcript viewer, and activity feed showing every Claude tool call and message.

**Dashboard & Analytics** — Token usage, cost tracking, session history, and per-agent performance metrics.

![Dashboard](images/dashboard.png)

**Agent Training** — Train agents on specific technologies or project codebases using an AI coach. Export/import training profiles across teams.

![Agent Training](images/train-agent.png)

**Skills & MCP** — Create reusable skill documents, attach them to agents. Configure MCP servers for extended tool access.

**Teams** — Form agent teams with a lead coordinator. Run collaborative workflows where agents communicate through a shared context.

**Hooks** — Pre/post tool-use hooks for guardrails (e.g., block `git push` before tests pass).

**Git Worktrees** — Isolate each agent's work in separate git worktrees to prevent conflicts.

**Subagents** — Define lightweight subagent profiles that agents can spawn for research or subtasks.

**i18n** — Full English and Turkish language support.

**Themes** — Light and dark mode with smooth transitions.

## Prerequisites

| Requirement | Version | Description |
|-------------|---------|-------------|
| [Node.js](https://nodejs.org/) | 18+ | JavaScript runtime |
| [npm](https://www.npmjs.com/) | 9+ | Comes with Node.js |
| [Claude CLI](https://docs.anthropic.com/en/docs/claude-code) | Latest | Must be installed and authenticated (`claude --version`) |
| [Git](https://git-scm.com/) | 2.20+ | Required for worktree isolation feature |

## Getting Started

```bash
# Install dependencies
npm install

# Start both backend and frontend
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3005

Click **Light Demo** or **Full Demo** in the sidebar to seed sample data and explore.

## Architecture

```
smith-agent-office/
├── apps/
│   ├── frontend/          React 19 + Vite + Tailwind + Zustand
│   └── backend/           Express + WebSocket + SQLite
├── packages/
│   └── types/             Shared TypeScript types
└── package.json           npm workspaces monorepo
```

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, Tailwind CSS, Framer Motion, Zustand, i18next |
| Backend | Express, ws (WebSocket), better-sqlite3, chokidar |
| AI | Claude CLI subprocess, @anthropic-ai/sdk |
| Data | SQLite (18 tables, zero-migration schema) |

## License

MIT
