import type { Office, Agent, Project, Task, AnimalType, ApprovalRequest, Skill, SessionLog, Hook, HookLog, MCPServer, Worktree, Team, Teammate, Subagent, DashboardStats, SessionLogExtended, TrainingProfile, TrainingRun } from '@smith/types'

const BASE = '/api'

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export const api = {
  // Offices
  getOffices: () => req<Office[]>('/offices'),
  getOffice: (id: string) => req<Office>(`/offices/${id}`),
  createOffice: (data: { name: string; description?: string; theme?: string }) =>
    req<Office>('/offices', { method: 'POST', body: JSON.stringify(data) }),
  updateOffice: (id: string, data: Partial<Office>) =>
    req<Office>(`/offices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOffice: (id: string) =>
    req<{ success: boolean }>(`/offices/${id}`, { method: 'DELETE' }),

  // Agents
  getAgents: (officeId: string) => req<Agent[]>(`/offices/${officeId}/agents`),
  createAgent: (
    officeId: string,
    data: {
      name: string
      role: string
      animal: AnimalType
      systemPrompt?: string
      deskPosition?: { x: number; y: number }
    }
  ) => req<Agent>(`/offices/${officeId}/agents`, { method: 'POST', body: JSON.stringify(data) }),
  updateAgent: (id: string, data: Partial<Agent>) =>
    req<Agent>(`/agents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAgent: (id: string) =>
    req<{ success: boolean }>(`/agents/${id}`, { method: 'DELETE' }),

  // Projects
  getProjects: (officeId: string) => req<Project[]>(`/offices/${officeId}/projects`),
  createProject: (officeId: string, data: { name: string; description?: string; workDir?: string }) =>
    req<Project>(`/offices/${officeId}/projects`, { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: Partial<Project>) =>
    req<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id: string) =>
    req<{ success: boolean }>(`/projects/${id}`, { method: 'DELETE' }),

  // Tasks
  createTask: (projectId: string, data: { description: string; assignedAgentId?: string; dependsOnTaskId?: string }) =>
    req<Task>(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, data: Partial<Task>) =>
    req<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (id: string) =>
    req<{ success: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),
  reorderTasks: (projectId: string, taskIds: string[]) =>
    req<{ success: boolean }>(`/projects/${projectId}/tasks/reorder`, {
      method: 'PATCH', body: JSON.stringify({ taskIds }),
    }),

  // Messages
  getMessages: (officeId: string, limit = 50) =>
    req<any[]>(`/offices/${officeId}/messages?limit=${limit}`),
  sendMessage: (officeId: string, data: any) =>
    req<any>(`/offices/${officeId}/messages`, { method: 'POST', body: JSON.stringify(data) }),

  // Sessions — Claude Code entegrasyonu
  startSession: (agentId: string, workDir: string, task: string) =>
    req<{ success: boolean; pid?: number; startedAt?: string }>(
      `/agents/${agentId}/session/start`,
      { method: 'POST', body: JSON.stringify({ workDir, task }) }
    ),
  stopSession: (agentId: string) =>
    req<{ success: boolean }>(`/agents/${agentId}/session/stop`, { method: 'POST' }),
  getSessionStatus: (agentId: string) =>
    req<{ active: boolean; pid?: number; startedAt?: string; jsonlPath?: string }>(
      `/agents/${agentId}/session/status`
    ),
  setWatchPath: (agentId: string, watchPath: string | null) =>
    req<{ success: boolean; watching: boolean }>(
      `/agents/${agentId}/watch`,
      { method: 'POST', body: JSON.stringify({ watchPath }) }
    ),
  setAgentStatus: (agentId: string, status: string, currentTask?: string) =>
    req<{ success: boolean }>(
      `/agents/${agentId}/status`,
      { method: 'POST', body: JSON.stringify({ status, currentTask }) }
    ),
  getAllSessions: () => req<any[]>('/sessions'),
  listJsonlFiles: () =>
    req<{ files: { path: string; project: string; mtime: string; size: number }[]; claudeDir: string }>(
      '/claude/jsonl-files'
    ),

  // Project & Task run
  runProject: (projectId: string) =>
    req<{ started: number; total: number; results: any[]; message?: string }>(
      `/projects/${projectId}/run`,
      { method: 'POST' }
    ),
  runTask: (taskId: string) =>
    req<{ success: boolean; pid?: number }>(`/tasks/${taskId}/run`, { method: 'POST' }),

  // PM Ajanı: Claude ile otomatik görev planı
  planProject: (projectId: string, extraContext?: string) =>
    req<{ created: number; tasks: any[] }>(
      `/projects/${projectId}/plan`,
      { method: 'POST', body: JSON.stringify({ extraContext: extraContext ?? '' }) }
    ),

  // JSONL transcript
  getTranscript: (agentId: string) =>
    req<{ entries: any[]; path: string | null; lineCount?: number }>(
      `/agents/${agentId}/transcript`
    ),

  // Faz 7 — Onay İstekleri
  getApprovals: (projectId: string) =>
    req<ApprovalRequest[]>(`/projects/${projectId}/approvals`),
  createApproval: (projectId: string, data: { fromAgentId: string; description: string; taskId?: string }) =>
    req<any>(`/projects/${projectId}/approvals`, { method: 'POST', body: JSON.stringify(data) }),
  respondApproval: (approvalId: string, data: { status: 'approved' | 'rejected'; responseNote?: string }) =>
    req<{ success: boolean }>(`/approvals/${approvalId}/respond`, { method: 'POST', body: JSON.stringify(data) }),

  // Faz 8 — Skills (Yetenekler)
  getSkills: () => req<Skill[]>('/skills'),
  getSkill: (id: string) => req<Skill>(`/skills/${id}`),
  createSkill: (data: { name: string; description?: string; content?: string; category?: string }) =>
    req<Skill>('/skills', { method: 'POST', body: JSON.stringify(data) }),
  importSkill: (markdown: string, source?: string) =>
    req<Skill>('/skills/import', { method: 'POST', body: JSON.stringify({ markdown, source }) }),
  importSkillsBatch: (skills: { name: string; description: string; content: string; source?: string; category?: string }[]) =>
    req<{ created: number; skills: Skill[] }>('/skills/import-batch', { method: 'POST', body: JSON.stringify({ skills }) }),
  importSkillsFromRepo: (repoUrl: string, branch?: string, pathFilter?: string) =>
    req<{ created: number; skipped: number; skills: Skill[]; errors: string[] }>('/skills/import-from-repo', { method: 'POST', body: JSON.stringify({ repoUrl, branch, pathFilter }) }),
  updateSkill: (id: string, data: Partial<Skill>) =>
    req<Skill>(`/skills/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSkill: (id: string) =>
    req<{ success: boolean }>(`/skills/${id}`, { method: 'DELETE' }),

  // Agent ↔ Skill
  getAgentSkills: (agentId: string) => req<Skill[]>(`/agents/${agentId}/skills`),
  attachSkill: (agentId: string, skillId: string) =>
    req<{ success: boolean }>(`/agents/${agentId}/skills`, { method: 'POST', body: JSON.stringify({ skillId }) }),
  detachSkill: (agentId: string, skillId: string) =>
    req<{ success: boolean }>(`/agents/${agentId}/skills/${skillId}`, { method: 'DELETE' }),

  // Faz 12 — Hooks
  getHooks: (projectId: string) => req<Hook[]>(`/projects/${projectId}/hooks`),
  createHook: (projectId: string, data: Partial<Hook>) =>
    req<Hook>(`/projects/${projectId}/hooks`, { method: 'POST', body: JSON.stringify(data) }),
  updateHook: (id: string, data: Partial<Hook>) =>
    req<Hook>(`/hooks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteHook: (id: string) =>
    req<{ success: boolean }>(`/hooks/${id}`, { method: 'DELETE' }),
  toggleHook: (id: string) =>
    req<Hook>(`/hooks/${id}/toggle`, { method: 'PATCH' }),
  getHookLogs: (hookId: string) => req<HookLog[]>(`/hooks/${hookId}/logs`),

  // Faz 13 — MCP Servers
  getMcpServers: () => req<MCPServer[]>('/mcp-servers'),
  getMcpServer: (id: string) => req<MCPServer>(`/mcp-servers/${id}`),
  createMcpServer: (data: Partial<MCPServer>) =>
    req<MCPServer>('/mcp-servers', { method: 'POST', body: JSON.stringify(data) }),
  updateMcpServer: (id: string, data: Partial<MCPServer>) =>
    req<MCPServer>(`/mcp-servers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMcpServer: (id: string) =>
    req<{ success: boolean }>(`/mcp-servers/${id}`, { method: 'DELETE' }),
  toggleMcpServer: (id: string) =>
    req<MCPServer>(`/mcp-servers/${id}/toggle`, { method: 'PATCH' }),
  testMcpServer: (id: string) =>
    req<{ status: string; message: string }>(`/mcp-servers/${id}/test`),

  // Agent ↔ MCP Server
  getAgentMcpServers: (agentId: string) => req<MCPServer[]>(`/agents/${agentId}/mcp-servers`),
  attachMcpServer: (agentId: string, mcpServerId: string) =>
    req<{ success: boolean }>(`/agents/${agentId}/mcp-servers`, { method: 'POST', body: JSON.stringify({ mcpServerId }) }),
  detachMcpServer: (agentId: string, mcpServerId: string) =>
    req<{ success: boolean }>(`/agents/${agentId}/mcp-servers/${mcpServerId}`, { method: 'DELETE' }),

  // Faz 9 — Token Stats
  getTokenStats: (officeId: string) =>
    req<{
      agents: { agentId: string; agentName: string; animal: string; inputTokens: number; outputTokens: number; totalTokens: number; sessionCount: number }[];
      total: { inputTokens: number; outputTokens: number; totalTokens: number; sessionCount: number };
    }>(`/token-stats/${officeId}`),
  getAgentTokenLogs: (agentId: string) => req<SessionLog[]>(`/agents/${agentId}/token-logs`),

  // Faz 17 — Gelişmiş Dashboard
  getDashboardStats: (officeId: string) => req<DashboardStats>(`/dashboard/${officeId}`),
  getAgentSessionLogs: (agentId: string) => req<SessionLogExtended[]>(`/agents/${agentId}/session-logs`),
  exportMetrics: (officeId: string, format: 'json' | 'csv' = 'json') => {
    if (format === 'csv') {
      // CSV indirme — blob olarak indir
      return fetch(`${BASE}/dashboard/${officeId}/export?format=csv`)
        .then(r => r.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `smith-metrics-${officeId}.csv`
          a.click()
          URL.revokeObjectURL(url)
        })
    }
    return req<any[]>(`/dashboard/${officeId}/export?format=json`)
  },

  // Faz 14 — Worktree İzolasyonu
  getWorktrees: (projectId: string) => req<Worktree[]>(`/projects/${projectId}/worktrees`),
  createWorktree: (projectId: string, agentId: string, taskId?: string) =>
    req<{ worktreeId: string; worktreePath: string; branch: string }>(
      `/projects/${projectId}/worktrees`,
      { method: 'POST', body: JSON.stringify({ agentId, taskId }) }
    ),
  mergeWorktree: (worktreeId: string) =>
    req<{ success: boolean; message: string }>(`/worktrees/${worktreeId}/merge`, { method: 'POST' }),
  refreshWorktree: (worktreeId: string) =>
    req<Worktree>(`/worktrees/${worktreeId}/refresh`, { method: 'POST' }),
  deleteWorktree: (worktreeId: string) =>
    req<{ success: boolean }>(`/worktrees/${worktreeId}`, { method: 'DELETE' }),
  getGitStatus: (projectId: string) =>
    req<{ isGitRepo: boolean; workDir?: string }>(`/projects/${projectId}/git-status`),

  // Faz 15 — Agent Teams
  getTeams: (projectId: string) => req<Team[]>(`/projects/${projectId}/teams`),
  createTeam: (projectId: string, name: string, leadAgentId: string, maxTeammates?: number) =>
    req<Team>(`/projects/${projectId}/teams`, {
      method: 'POST',
      body: JSON.stringify({ name, leadAgentId, maxTeammates }),
    }),
  getTeam: (teamId: string) => req<Team>(`/teams/${teamId}`),
  deleteTeam: (teamId: string) => req<{ success: boolean }>(`/teams/${teamId}`, { method: 'DELETE' }),
  startTeam: (teamId: string) => req<Team>(`/teams/${teamId}/start`, { method: 'POST' }),
  stopTeam: (teamId: string) => req<{ success: boolean }>(`/teams/${teamId}/stop`, { method: 'POST' }),
  addTeammate: (teamId: string, agentId: string) =>
    req<Teammate>(`/teams/${teamId}/teammates`, {
      method: 'POST',
      body: JSON.stringify({ agentId }),
    }),
  removeTeammate: (teamId: string, agentId: string) =>
    req<{ success: boolean }>(`/teams/${teamId}/teammates/${agentId}`, { method: 'DELETE' }),

  // Faz 16 — Subagent
  getSubagents: () => req<Subagent[]>('/subagents'),
  getSubagent: (id: string) => req<Subagent>(`/subagents/${id}`),
  createSubagent: (data: Partial<Subagent>) =>
    req<Subagent>('/subagents', { method: 'POST', body: JSON.stringify(data) }),
  updateSubagent: (id: string, data: Partial<Subagent>) =>
    req<Subagent>(`/subagents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSubagent: (id: string) =>
    req<{ success: boolean }>(`/subagents/${id}`, { method: 'DELETE' }),
  previewSubagent: (id: string) =>
    req<{ content: string }>(`/subagents/${id}/preview`),
  syncSubagent: (id: string, workDir: string) =>
    req<{ success: boolean; filePath: string }>(`/subagents/${id}/sync`, {
      method: 'POST',
      body: JSON.stringify({ workDir }),
    }),
  agentToSubagent: (agentId: string) =>
    req<Subagent>(`/agents/${agentId}/to-subagent`, { method: 'POST' }),

  // Faz 21 — Training Profiles
  getTrainingProfiles: () => req<TrainingProfile[]>('/training-profiles'),
  getTrainingProfile: (id: string) => req<TrainingProfile>(`/training-profiles/${id}`),
  createTrainingProfile: (data: { name: string; description?: string; mode?: string; source?: string; userPrompt?: string }) =>
    req<TrainingProfile>('/training-profiles', { method: 'POST', body: JSON.stringify(data) }),
  updateTrainingProfile: (id: string, data: Partial<TrainingProfile>) =>
    req<TrainingProfile>(`/training-profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTrainingProfile: (id: string) =>
    req<void>(`/training-profiles/${id}`, { method: 'DELETE' }),
  exportTrainingProfile: (id: string) =>
    fetch(`${BASE}/training-profiles/${id}/export`).then(r => r.json()),
  importTrainingProfile: (data: any) =>
    req<TrainingProfile>('/training-profiles/import', { method: 'POST', body: JSON.stringify(data) }),
  startTraining: (id: string) =>
    req<TrainingRun>(`/training-profiles/${id}/train`, { method: 'POST' }),
  getTrainingRuns: (profileId: string) =>
    req<TrainingRun[]>(`/training-profiles/${profileId}/runs`),
  importFromGithub: (url: string) =>
    req<{ profiles: TrainingProfile[]; count: number }>('/training-profiles/import-url', { method: 'POST', body: JSON.stringify({ url }) }),
  importMdFiles: (files: Array<{ name: string; content: string }>) =>
    req<{ profiles: TrainingProfile[]; count: number }>('/training-profiles/import-md', { method: 'POST', body: JSON.stringify({ files }) }),

  // Agent ↔ Training
  getAgentTraining: (agentId: string) =>
    req<TrainingProfile | null>(`/agents/${agentId}/training`),
  setAgentTraining: (agentId: string, profileId: string) =>
    req<void>(`/agents/${agentId}/training`, { method: 'POST', body: JSON.stringify({ profileId }) }),
  removeAgentTraining: (agentId: string) =>
    req<void>(`/agents/${agentId}/training`, { method: 'DELETE' }),

  // Seed Demo
  seedDemo: () => req<Office>('/seed-demo', { method: 'POST' }),
  seedDemoLight: () => req<Office>('/seed-demo-light', { method: 'POST' }),

  // Veritabanı Sıfırlama
  resetDb: () => req<{ success: boolean; deleted: number; details: Record<string, number> }>('/reset-db', { method: 'POST' }),
}
