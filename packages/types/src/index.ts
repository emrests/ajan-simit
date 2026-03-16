export type AnimalType =
  | 'bear'
  | 'fox'
  | 'raccoon'
  | 'owl'
  | 'elephant'
  | 'octopus'
  | 'rabbit'
  | 'squirrel'
  | 'cat'
  | 'dog'

export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'typing'
  | 'reading'
  | 'waiting'
  | 'celebrating'

export type ProjectStatus = 'planning' | 'active' | 'review' | 'done'
export type TaskStatus = 'todo' | 'in_progress' | 'done'

export interface DeskPosition {
  x: number
  y: number
}

export interface Agent {
  id: string
  officeId: string
  name: string
  role: string
  animal: AnimalType
  systemPrompt: string
  model?: string           // Opsiyonel Claude model (ör. "claude-opus-4-6")
  maxTurns?: number        // Faz 9: Ajan başına max turns limiti
  // Faz 11 — Gelişmiş CLI Entegrasyonu
  effortLevel?: 'low' | 'medium' | 'high'
  allowedTools?: string[]
  disallowedTools?: string[]
  environmentVars?: Record<string, string>
  appendSystemPrompt?: string
  systemPromptFile?: string   // Faz 11: Dosyadan system prompt yükleme
  outputSchema?: string
  subagentId?: string          // Faz 16: Bağlı subagent profili
  trainingProfileId?: string   // Faz 21: Atanmış eğitim profili
  deskPosition: DeskPosition
  status: AgentStatus
  currentTask?: string
  sessionId?: string
  watchPath?: string
  sessionPid?: number
  createdAt: string
}

export interface Task {
  id: string
  projectId: string
  assignedAgentId?: string
  description: string
  status: TaskStatus
  dependsOnTaskId?: string   // Bu görev tamamlanmadan başlamaz
  maxTurns?: number          // Faz 9: Görev bazında max turns override
  effortLevel?: 'low' | 'medium' | 'high'  // Faz 11: Görev bazında efor override
  outputSchema?: string      // Faz 11: Görev bazında çıktı şeması
  sortOrder?: number         // Görev sıralama numarası
  createdAt: string
}

export interface Project {
  id: string
  officeId: string
  name: string
  description: string
  status: ProjectStatus
  tasks: Task[]
  progress: number
  workDir: string
  // Faz 7 — İş akışı ayarları
  approvalPolicy: ApprovalPolicy
  errorPolicy: ErrorPolicy
  workflowMode: WorkflowMode
  pmAgentId?: string
  // Faz 9 — Token verimliliği
  contextMode: ContextMode
  claudeMd?: string          // Proje CLAUDE.md içeriği
  extraInstructions?: string // Faz 11: Proje bazında ek talimatlar (tüm ajanlar için)
  // Faz 14 — Worktree izolasyonu
  isolationMode: IsolationMode
  createdAt: string
}

export interface ProjectCompleteSummary {
  projectId: string
  projectName: string
  description: string
  workDir: string
  totalTasks: number
  agentCount: number
  agents: { name: string; animal: AnimalType; taskCount: number }[]
  totalTokens: number
  totalCost: number
  durationSec: number
  startedAt: string
  completedAt: string
}

export interface Office {
  id: string
  name: string
  description: string
  theme: 'light' | 'dark'
  agents: Agent[]
  projects: Project[]
  createdAt: string
}

export interface AgentMessage {
  id: string
  fromAgentId: string
  fromAgentName: string
  toAgentId?: string
  content: string
  type: 'task' | 'result' | 'chat' | 'system' | 'agent-to-agent' | 'approval-request' | 'approval-response'
  timestamp: string
}

// Onay isteği durumu
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

// Onay politikası
export type ApprovalPolicy = 'auto' | 'ask-user' | 'ask-pm'

// Hata politikası
export type ErrorPolicy = 'stop' | 'notify-pm' | 'auto-retry'

// İş akışı modu
export type WorkflowMode = 'free' | 'coordinated' | 'team'

// Faz 9 — Bağlam modu
export type ContextMode = 'full' | 'compact' | 'minimal'

// Faz 14 — Worktree izolasyon modu
export type IsolationMode = 'shared' | 'worktree'
export type WorktreeStatus = 'active' | 'merged' | 'conflict' | 'deleted'

// Faz 9 — Tur profilleri
export const TURN_PROFILES: Record<string, { label: string; value: number }> = {
  light: { label: 'Hafif (5 tur)', value: 5 },
  normal: { label: 'Normal (15 tur)', value: 15 },
  heavy: { label: 'Ağır (30 tur)', value: 30 },
  unlimited: { label: 'Sınırsız', value: 0 },
}

// Faz 9 — Token kullanım kaydı
export interface SessionLog {
  id: string
  agentId: string
  taskId?: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  model: string
  startedAt: string
  endedAt?: string
}

// Onay isteği
export interface ApprovalRequest {
  id: string
  projectId: string
  fromAgentId: string
  fromAgentName: string
  description: string        // Ne için onay isteniyor
  status: ApprovalStatus
  respondedBy?: string       // Yanıtlayan (user / pm agent id)
  responseNote?: string      // Onay/ret açıklaması
  createdAt: string
  respondedAt?: string
}

// Proje iş akışı ayarları
export interface ProjectWorkflowSettings {
  approvalPolicy: ApprovalPolicy
  errorPolicy: ErrorPolicy
  workflowMode: WorkflowMode
  pmAgentId?: string          // PM rolündeki ajan
}

// WebSocket mesaj tipleri
export type WsMessage =
  | { type: 'agent:status'; agentId: string; status: AgentStatus; currentTask?: string }
  | { type: 'agent:message'; message: AgentMessage }
  | { type: 'office:update'; office: Office }
  | { type: 'project:update'; project: Project }
  | { type: 'project:complete'; summary: ProjectCompleteSummary }
  | { type: 'approval:request'; approval: ApprovalRequest }
  | { type: 'approval:response'; approval: ApprovalRequest }
  | { type: 'session:tokens'; agentId: string; inputTokens: number; outputTokens: number; totalTokens: number }
  | { type: 'hook:executed'; hookId: string; event: HookEvent; success: boolean; output?: string }
  | { type: 'team:update'; projectId: string; team: Team }
  | { type: 'team:teammate'; teamId: string; teammate: Teammate }
  | { type: 'worktree:update'; projectId: string; worktree: Worktree }
  | { type: 'worktree:merge'; projectId: string; worktreeId: string; success: boolean; message?: string }
  | { type: 'training:update'; profile: TrainingProfile }
  | { type: 'training:run'; run: TrainingRun }
  | { type: 'ping' }
  | { type: 'pong' }

export const ANIMAL_LABELS: Record<AnimalType, string> = {
  bear: 'Ayı',
  fox: 'Tilki',
  raccoon: 'Rakun',
  owl: 'Baykuş',
  elephant: 'Fil',
  octopus: 'Ahtapot',
  rabbit: 'Tavşan',
  squirrel: 'Sincap',
  cat: 'Kedi',
  dog: 'Köpek',
}

export const ANIMAL_EMOJIS: Record<AnimalType, string> = {
  bear: '🐻',
  fox: '🦊',
  raccoon: '🦝',
  owl: '🦉',
  elephant: '🐘',
  octopus: '🐙',
  rabbit: '🐰',
  squirrel: '🐿️',
  cat: '🐱',
  dog: '🐶',
}

// Faz 8 — Skill (Yetenek) sistemi
export interface Skill {
  id: string
  name: string
  description: string
  content: string          // SKILL.md body (talimatlar)
  source?: string          // Kaynak: URL, repo veya 'manual'
  category?: string        // Kategori: 'dev', 'devops', 'ai', 'general', vb.
  createdAt: string
}

export interface AgentSkill {
  agentId: string
  skillId: string
  skill?: Skill            // Join ile dolu gelir
}

export const SKILL_CATEGORIES: Record<string, string> = {
  dev: 'Geliştirme',
  devops: 'DevOps',
  ai: 'AI / Veri',
  testing: 'Test / QA',
  docs: 'Dokümantasyon',
  general: 'Genel',
}

// Faz 11 — Efor seviyeleri
export const EFFORT_PROFILES: Record<string, { label: string; value: string; description: string }> = {
  low: { label: 'Düşük', value: 'low', description: 'Basit görevler — %60-70 token tasarrufu' },
  medium: { label: 'Normal', value: 'medium', description: 'Standart görevler' },
  high: { label: 'Yüksek', value: 'high', description: 'Karmaşık görevler — en detaylı çıktı' },
}

// Faz 11 — Claude Code araç listesi
export const CLAUDE_TOOLS = [
  'Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep',
  'WebSearch', 'WebFetch', 'Task', 'TodoWrite',
  'NotebookEdit',
] as const

// Faz 11 — İzin profilleri
export const PERMISSION_PROFILES: Record<string, { label: string; allowed: string[]; disallowed: string[] }> = {
  safe: { label: 'Güvenli (Salt Okunur)', allowed: ['Read', 'Grep', 'Glob'], disallowed: [] },
  developer: { label: 'Geliştirici', allowed: ['Bash', 'Read', 'Write', 'Edit', 'Grep', 'Glob'], disallowed: [] },
  full: { label: 'Tam Yetki', allowed: [], disallowed: [] },
}

// Faz 12 — Hooks Sistemi (Olay Tabanlı Otomasyon)
export type HookEvent =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'SessionStart'
  | 'SessionStop'
  | 'TaskCompleted'
  | 'TaskFailed'
  | 'SubagentStart'
  | 'SubagentStop'
  | 'PreCompact'
  | 'Notification'

export type HookType = 'command' | 'http' | 'prompt'

export interface Hook {
  id: string
  projectId: string
  event: HookEvent
  matcher?: string          // Tool adı pattern (ör: "Bash", "mcp__github__*")
  type: HookType
  command?: string          // type=command: shell komutu
  url?: string              // type=http: webhook POST URL
  prompt?: string           // type=prompt: LLM değerlendirme prompt'u
  enabled: boolean
  createdAt: string
}

export interface HookLog {
  id: string
  hookId: string
  event: HookEvent
  success: boolean
  output?: string
  executedAt: string
}

export const HOOK_EVENT_LABELS: Record<HookEvent, string> = {
  PreToolUse: 'Tool Öncesi',
  PostToolUse: 'Tool Sonrası',
  SessionStart: 'Oturum Başlangıcı',
  SessionStop: 'Oturum Bitişi',
  TaskCompleted: 'Görev Tamamlandı',
  TaskFailed: 'Görev Başarısız',
  SubagentStart: 'Subagent Başladı',
  SubagentStop: 'Subagent Durdu',
  PreCompact: 'Sıkıştırma Öncesi',
  Notification: 'Bildirim',
}

export const HOOK_TYPE_LABELS: Record<HookType, string> = {
  command: 'Shell Komutu',
  http: 'Webhook (HTTP POST)',
  prompt: 'LLM Değerlendirme',
}

// Hazır hook şablonları
export const HOOK_TEMPLATES: { name: string; event: HookEvent; matcher: string; type: HookType; command?: string; url?: string; prompt?: string }[] = [
  { name: 'Bash sonrası auto-format', event: 'PostToolUse', matcher: 'Bash', type: 'command', command: 'npx prettier --write .' },
  { name: 'Push öncesi test', event: 'PreToolUse', matcher: 'Bash(git push*)', type: 'command', command: 'npm test' },
  { name: 'Görev bitti bildirim', event: 'TaskCompleted', matcher: '', type: 'http', url: 'https://hooks.example.com/notify' },
  { name: '.env okumayı engelle', event: 'PreToolUse', matcher: 'Read(.env*)', type: 'command', command: 'echo "BLOCKED: .env dosyası okunamaz" && exit 1' },
]

// Faz 13 — MCP Server Yönetimi
export type MCPTransport = 'stdio' | 'sse' | 'http'
export type MCPServerScope = 'user' | 'project'
export type MCPServerStatus = 'active' | 'error' | 'disabled'

export interface MCPServer {
  id: string
  name: string
  description?: string
  transport: MCPTransport
  command?: string           // stdio: çalıştırılacak komut (ör: "npx -y @modelcontextprotocol/server-github")
  url?: string               // sse/http: sunucu URL'i
  args?: string[]            // Ek argümanlar
  env?: Record<string, string>  // Ortam değişkenleri (API key vb.)
  scope: MCPServerScope
  enabled: boolean
  createdAt: string
}

export interface AgentMCPServer {
  agentId: string
  mcpServerId: string
}

export const MCP_TRANSPORT_LABELS: Record<MCPTransport, string> = {
  stdio: 'Standard I/O',
  sse: 'Server-Sent Events',
  http: 'HTTP (Streamable)',
}

// Hazır MCP sunucu şablonları
export const MCP_SERVER_TEMPLATES: {
  name: string
  description: string
  transport: MCPTransport
  command: string
  args?: string[]
  envKeys?: string[]   // Kullanıcıdan istenecek env key'leri
}[] = [
  {
    name: 'GitHub',
    description: 'GitHub API — repo, issue, PR yönetimi',
    transport: 'stdio',
    command: 'npx -y @modelcontextprotocol/server-github',
    envKeys: ['GITHUB_PERSONAL_ACCESS_TOKEN'],
  },
  {
    name: 'Filesystem',
    description: 'Dosya sistemi erişimi (belirli dizin)',
    transport: 'stdio',
    command: 'npx -y @modelcontextprotocol/server-filesystem',
    args: ['/path/to/allowed/dir'],
  },
  {
    name: 'SQLite',
    description: 'SQLite veritabanı sorgu erişimi',
    transport: 'stdio',
    command: 'npx -y @modelcontextprotocol/server-sqlite',
    args: ['--db-path', '/path/to/database.db'],
  },
  {
    name: 'Brave Search',
    description: 'Brave Search API ile web araması',
    transport: 'stdio',
    command: 'npx -y @modelcontextprotocol/server-brave-search',
    envKeys: ['BRAVE_API_KEY'],
  },
  {
    name: 'Slack',
    description: 'Slack kanal ve mesaj yönetimi',
    transport: 'stdio',
    command: 'npx -y @modelcontextprotocol/server-slack',
    envKeys: ['SLACK_BOT_TOKEN', 'SLACK_TEAM_ID'],
  },
]

// Faz 16 — Subagent & Plugin Yönetimi
export type SubagentScope = 'project' | 'user'

export interface Subagent {
  id: string
  name: string
  description: string
  prompt: string               // Subagent system prompt (markdown body)
  model?: string               // Opsiyonel model override
  maxTurns?: number
  allowedTools?: string[]
  disallowedTools?: string[]
  scope: SubagentScope
  createdAt: string
}

// Subagent .md dosya formatı (YAML frontmatter + body)
// ---
// name: researcher
// description: Safe research agent
// model: claude-haiku-4-5-20251001
// allowedTools: [Read, Grep, Glob]
// ---
// You are a research agent. Only read files, never modify them.

export const SUBAGENT_TEMPLATES: {
  name: string
  description: string
  model?: string
  maxTurns?: number
  allowedTools?: string[]
  disallowedTools?: string[]
  prompt: string
}[] = [
  {
    name: 'researcher',
    description: 'Güvenli Araştırmacı — sadece okuma yapabilir',
    model: 'claude-haiku-4-5-20251001',
    maxTurns: 10,
    allowedTools: ['Read', 'Grep', 'Glob', 'WebSearch', 'WebFetch'],
    prompt: 'Sen güvenli bir araştırma ajanısın. Sadece dosyaları oku, analiz et ve raporla. Asla dosya değiştirme veya komut çalıştırma.',
  },
  {
    name: 'fast-coder',
    description: 'Hızlı Kodlayıcı — Haiku ile hızlı kod yazımı',
    model: 'claude-haiku-4-5-20251001',
    maxTurns: 10,
    allowedTools: ['Bash', 'Read', 'Write', 'Edit', 'Grep', 'Glob'],
    prompt: 'Sen hızlı bir kodlama ajanısın. Kısa ve net değişiklikler yap. Gereksiz açıklama yapma, doğrudan kodu yaz.',
  },
  {
    name: 'security-auditor',
    description: 'Güvenlik Denetçisi — güvenlik açıklarını tara',
    allowedTools: ['Read', 'Grep', 'Glob'],
    prompt: 'Sen bir güvenlik denetçisisin. Kodda güvenlik açıklarını (XSS, SQL injection, OWASP Top 10) ara ve raporla. Asla dosya değiştirme.',
  },
  {
    name: 'test-runner',
    description: 'Test Koşucusu — sadece testleri çalıştırır',
    maxTurns: 5,
    allowedTools: ['Bash', 'Read', 'Grep', 'Glob'],
    prompt: 'Sen bir test koşucu ajanısın. Testleri çalıştır, sonuçları analiz et ve rapor ver. Sadece test komutları çalıştır (npm test, pytest vb.).',
  },
]

// Faz 15 — Agent Teams (Takım Modu)
export type TeamStatus = 'idle' | 'running' | 'completed' | 'error'
export type TeammateStatus = 'idle' | 'working' | 'done' | 'error'

export interface Team {
  id: string
  projectId: string
  name: string
  leadAgentId: string          // Takım lideri (PM ajanı)
  leadAgentName: string
  status: TeamStatus
  maxTeammates: number         // Max teammate sayısı (varsayılan 5, max 16)
  teammates: Teammate[]
  createdAt: string
  startedAt?: string
  completedAt?: string
}

export interface Teammate {
  id: string
  teamId: string
  agentId: string
  agentName: string
  animal: AnimalType
  role: string
  status: TeammateStatus
  currentTask?: string
  addedAt: string
}

export const TEAM_STATUS_LABELS: Record<TeamStatus, string> = {
  idle: 'Hazır',
  running: 'Çalışıyor',
  completed: 'Tamamlandı',
  error: 'Hata',
}

export const TEAMMATE_STATUS_LABELS: Record<TeammateStatus, string> = {
  idle: 'Boşta',
  working: 'Çalışıyor',
  done: 'Tamamladı',
  error: 'Hata',
}

// Faz 14 — Worktree (Git Worktree İzolasyonu)
export interface Worktree {
  id: string
  projectId: string
  agentId: string
  agentName: string
  branch: string             // ör: "agent/frontend-dev/task-abc123"
  worktreePath: string       // Worktree dizin yolu
  status: WorktreeStatus
  changedFiles: number       // Değişen dosya sayısı
  aheadBy: number            // Ana branch'ten kaç commit ilerde
  lastActivity?: string      // Son aktivite zamanı
  mergedAt?: string
  createdAt: string
}

export const ISOLATION_MODE_LABELS: Record<IsolationMode, string> = {
  shared: 'Paylaşımlı (Varsayılan)',
  worktree: 'Worktree İzolasyonu',
}

export const WORKTREE_STATUS_LABELS: Record<WorktreeStatus, string> = {
  active: 'Aktif',
  merged: 'Birleştirildi',
  conflict: 'Çakışma',
  deleted: 'Silindi',
}

export const STATUS_LABELS: Record<AgentStatus, string> = {
  idle: 'Boşta',
  thinking: 'Düşünüyor',
  typing: 'Yazıyor',
  reading: 'Okuyor',
  waiting: 'Bekliyor',
  celebrating: 'Tamamladı!',
}

// Faz 17 — Model Fiyatlandırma (USD / milyon token)
export interface ModelPricing {
  inputPerMillion: number   // USD / 1M input token
  outputPerMillion: number  // USD / 1M output token
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-opus-4-6':           { inputPerMillion: 15, outputPerMillion: 75 },
  'claude-sonnet-4-6':         { inputPerMillion: 3,  outputPerMillion: 15 },
  'claude-haiku-4-5-20251001': { inputPerMillion: 0.8, outputPerMillion: 4 },
  // Alias'lar
  'opus':   { inputPerMillion: 15, outputPerMillion: 75 },
  'sonnet': { inputPerMillion: 3,  outputPerMillion: 15 },
  'haiku':  { inputPerMillion: 0.8, outputPerMillion: 4 },
  // Varsayılan (bilinmeyen model)
  'default': { inputPerMillion: 3, outputPerMillion: 15 },
}

/** Token + model bilgisinden USD maliyet hesapla */
export function calculateCostUsd(inputTokens: number, outputTokens: number, model: string): number {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING['default']
  return (inputTokens * pricing.inputPerMillion + outputTokens * pricing.outputPerMillion) / 1_000_000
}

// Faz 17 — Gelişmiş Dashboard tipleri
export interface AgentCostStats {
  agentId: string
  agentName: string
  animal: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  costUsd: number
  sessionCount: number
  avgTokensPerSession: number
  tasksDone: number
  efficiency: number  // tasksDone / (totalTokens / 1000)  — görev/kilo-token
}

export interface ToolUsageStat {
  toolName: string
  count: number
  percentage: number
}

export interface DashboardStats {
  agents: AgentCostStats[]
  total: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    costUsd: number
    sessionCount: number
  }
  toolUsage: ToolUsageStat[]
  dailyUsage: { date: string; tokens: number; cost: number; sessions: number }[]
}

// Faz 17 — Session log genişletilmiş
export interface SessionLogExtended extends SessionLog {
  costUsd: number
  resultJson?: string
  schemaValid?: number
  duration?: number  // saniye
  toolsUsed?: string[]
}

// Faz 21 — Ajan Eğitim Sistemi
export type TrainingMode = 'project' | 'technology'
export type TrainingStatus = 'pending' | 'analyzing' | 'generating' | 'done' | 'error'

export interface TrainingProfile {
  id: string
  name: string
  description: string
  content: string
  mode: TrainingMode
  source?: string          // Proje path'i veya teknoloji adı
  userPrompt?: string      // Kullanıcının koça verdiği açıklama
  status: TrainingStatus
  createdAt: string
  updatedAt?: string
}

export interface TrainingRun {
  id: string
  profileId: string
  agentId?: string
  status: TrainingStatus
  inputTokens: number
  outputTokens: number
  startedAt: string
  completedAt?: string
  error?: string
}

export const TRAINING_MODE_LABELS: Record<TrainingMode, string> = {
  project: 'Proje Analizi',
  technology: 'Teknoloji Eğitimi',
}

export const TRAINING_STATUS_LABELS: Record<TrainingStatus, string> = {
  pending: 'Bekliyor',
  analyzing: 'Analiz Ediliyor',
  generating: 'Oluşturuluyor',
  done: 'Tamamlandı',
  error: 'Hata',
}
