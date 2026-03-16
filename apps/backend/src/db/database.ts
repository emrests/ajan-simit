import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DB_DIR, 'smith.db')

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true })
}

export const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ---------------------------------------------------------------------------
// Helper: Tabloda belirli bir sütun var mı?
// ---------------------------------------------------------------------------
function hasColumn(table: string, column: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as any[]
  return cols.some(c => c.name === column)
}

// ---------------------------------------------------------------------------
// Migration tanımları — her yeni şema değişikliği buraya eklenir
// ---------------------------------------------------------------------------
const MIGRATIONS: { version: number; name: string; up: () => void }[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: () => {
      // ── Temel tablolar ──
      db.exec(`
        CREATE TABLE IF NOT EXISTS offices (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT DEFAULT '',
          theme TEXT DEFAULT 'light',
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS agents (
          id TEXT PRIMARY KEY,
          office_id TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL,
          animal TEXT NOT NULL DEFAULT 'cat',
          system_prompt TEXT DEFAULT '',
          desk_x INTEGER DEFAULT 0,
          desk_y INTEGER DEFAULT 0,
          status TEXT DEFAULT 'idle',
          current_task TEXT,
          session_id TEXT,
          watch_path TEXT,
          session_pid INTEGER,
          created_at TEXT NOT NULL,
          FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          office_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT DEFAULT '',
          status TEXT DEFAULT 'planning',
          progress INTEGER DEFAULT 0,
          work_dir TEXT DEFAULT '',
          created_at TEXT NOT NULL,
          FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          assigned_agent_id TEXT,
          description TEXT NOT NULL,
          status TEXT DEFAULT 'todo',
          created_at TEXT NOT NULL,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (assigned_agent_id) REFERENCES agents(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          office_id TEXT NOT NULL,
          from_agent_id TEXT NOT NULL,
          from_agent_name TEXT NOT NULL,
          to_agent_id TEXT,
          content TEXT NOT NULL,
          type TEXT DEFAULT 'chat',
          timestamp TEXT NOT NULL
        );
      `)

      // ── agents sütun eklentileri ──
      if (!hasColumn('agents', 'watch_path'))
        db.exec('ALTER TABLE agents ADD COLUMN watch_path TEXT')
      if (!hasColumn('agents', 'session_pid'))
        db.exec('ALTER TABLE agents ADD COLUMN session_pid INTEGER')
      if (!hasColumn('agents', 'current_task_id'))
        db.exec('ALTER TABLE agents ADD COLUMN current_task_id TEXT')
      if (!hasColumn('agents', 'model'))
        db.exec("ALTER TABLE agents ADD COLUMN model TEXT DEFAULT ''")
      if (!hasColumn('agents', 'max_turns'))
        db.exec('ALTER TABLE agents ADD COLUMN max_turns INTEGER DEFAULT 0')
      if (!hasColumn('agents', 'effort_level'))
        db.exec("ALTER TABLE agents ADD COLUMN effort_level TEXT DEFAULT ''")
      if (!hasColumn('agents', 'allowed_tools'))
        db.exec("ALTER TABLE agents ADD COLUMN allowed_tools TEXT DEFAULT ''")
      if (!hasColumn('agents', 'disallowed_tools'))
        db.exec("ALTER TABLE agents ADD COLUMN disallowed_tools TEXT DEFAULT ''")
      if (!hasColumn('agents', 'environment_vars'))
        db.exec("ALTER TABLE agents ADD COLUMN environment_vars TEXT DEFAULT ''")
      if (!hasColumn('agents', 'append_system_prompt'))
        db.exec("ALTER TABLE agents ADD COLUMN append_system_prompt TEXT DEFAULT ''")
      if (!hasColumn('agents', 'output_schema'))
        db.exec("ALTER TABLE agents ADD COLUMN output_schema TEXT DEFAULT ''")
      if (!hasColumn('agents', 'system_prompt_file'))
        db.exec("ALTER TABLE agents ADD COLUMN system_prompt_file TEXT DEFAULT ''")
      if (!hasColumn('agents', 'subagent_id'))
        db.exec("ALTER TABLE agents ADD COLUMN subagent_id TEXT DEFAULT ''")
      if (!hasColumn('agents', 'training_profile_id'))
        db.exec("ALTER TABLE agents ADD COLUMN training_profile_id TEXT DEFAULT ''")

      // ── projects sütun eklentileri ──
      if (!hasColumn('projects', 'work_dir'))
        db.exec("ALTER TABLE projects ADD COLUMN work_dir TEXT DEFAULT ''")
      if (!hasColumn('projects', 'approval_policy'))
        db.exec("ALTER TABLE projects ADD COLUMN approval_policy TEXT DEFAULT 'auto'")
      if (!hasColumn('projects', 'error_policy'))
        db.exec("ALTER TABLE projects ADD COLUMN error_policy TEXT DEFAULT 'stop'")
      if (!hasColumn('projects', 'workflow_mode'))
        db.exec("ALTER TABLE projects ADD COLUMN workflow_mode TEXT DEFAULT 'free'")
      if (!hasColumn('projects', 'pm_agent_id'))
        db.exec('ALTER TABLE projects ADD COLUMN pm_agent_id TEXT')
      if (!hasColumn('projects', 'context_mode'))
        db.exec("ALTER TABLE projects ADD COLUMN context_mode TEXT DEFAULT 'full'")
      if (!hasColumn('projects', 'claude_md'))
        db.exec('ALTER TABLE projects ADD COLUMN claude_md TEXT')
      if (!hasColumn('projects', 'extra_instructions'))
        db.exec("ALTER TABLE projects ADD COLUMN extra_instructions TEXT DEFAULT ''")
      if (!hasColumn('projects', 'isolation_mode'))
        db.exec("ALTER TABLE projects ADD COLUMN isolation_mode TEXT DEFAULT 'shared'")

      // ── tasks sütun eklentileri ──
      if (!hasColumn('tasks', 'depends_on_task_id'))
        db.exec('ALTER TABLE tasks ADD COLUMN depends_on_task_id TEXT')
      if (!hasColumn('tasks', 'max_turns'))
        db.exec('ALTER TABLE tasks ADD COLUMN max_turns INTEGER DEFAULT 0')
      if (!hasColumn('tasks', 'sort_order'))
        db.exec('ALTER TABLE tasks ADD COLUMN sort_order INTEGER DEFAULT 0')
      if (!hasColumn('tasks', 'effort_level'))
        db.exec("ALTER TABLE tasks ADD COLUMN effort_level TEXT DEFAULT ''")
      if (!hasColumn('tasks', 'output_schema'))
        db.exec("ALTER TABLE tasks ADD COLUMN output_schema TEXT DEFAULT ''")

      // ── Ek tablolar ──
      db.exec(`
        CREATE TABLE IF NOT EXISTS approval_requests (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          task_id TEXT,
          from_agent_id TEXT NOT NULL,
          from_agent_name TEXT NOT NULL,
          description TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          responded_by TEXT,
          response_note TEXT,
          created_at TEXT NOT NULL,
          responded_at TEXT,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (from_agent_id) REFERENCES agents(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS session_logs (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          task_id TEXT,
          input_tokens INTEGER DEFAULT 0,
          output_tokens INTEGER DEFAULT 0,
          total_tokens INTEGER DEFAULT 0,
          model TEXT DEFAULT '',
          started_at TEXT NOT NULL,
          ended_at TEXT,
          FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS hooks (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          event TEXT NOT NULL,
          matcher TEXT DEFAULT '',
          type TEXT NOT NULL DEFAULT 'command',
          command TEXT DEFAULT '',
          url TEXT DEFAULT '',
          prompt TEXT DEFAULT '',
          enabled INTEGER DEFAULT 1,
          created_at TEXT NOT NULL,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS hook_logs (
          id TEXT PRIMARY KEY,
          hook_id TEXT NOT NULL,
          event TEXT NOT NULL,
          success INTEGER DEFAULT 1,
          output TEXT DEFAULT '',
          executed_at TEXT NOT NULL,
          FOREIGN KEY (hook_id) REFERENCES hooks(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS mcp_servers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT DEFAULT '',
          transport TEXT NOT NULL DEFAULT 'stdio',
          command TEXT DEFAULT '',
          url TEXT DEFAULT '',
          args TEXT DEFAULT '[]',
          env TEXT DEFAULT '{}',
          scope TEXT DEFAULT 'user',
          enabled INTEGER DEFAULT 1,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS agent_mcp_servers (
          agent_id TEXT NOT NULL,
          mcp_server_id TEXT NOT NULL,
          PRIMARY KEY (agent_id, mcp_server_id),
          FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
          FOREIGN KEY (mcp_server_id) REFERENCES mcp_servers(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS skills (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT DEFAULT '',
          content TEXT DEFAULT '',
          source TEXT DEFAULT 'manual',
          category TEXT DEFAULT 'general',
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS agent_skills (
          agent_id TEXT NOT NULL,
          skill_id TEXT NOT NULL,
          PRIMARY KEY (agent_id, skill_id),
          FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
          FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS subagents (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          description TEXT DEFAULT '',
          prompt TEXT DEFAULT '',
          model TEXT DEFAULT '',
          max_turns INTEGER DEFAULT 0,
          allowed_tools TEXT DEFAULT '[]',
          disallowed_tools TEXT DEFAULT '[]',
          scope TEXT DEFAULT 'project',
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS teams (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          name TEXT NOT NULL,
          lead_agent_id TEXT NOT NULL,
          lead_agent_name TEXT NOT NULL,
          status TEXT DEFAULT 'idle',
          max_teammates INTEGER DEFAULT 5,
          created_at TEXT NOT NULL,
          started_at TEXT,
          completed_at TEXT,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (lead_agent_id) REFERENCES agents(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS teammates (
          id TEXT PRIMARY KEY,
          team_id TEXT NOT NULL,
          agent_id TEXT NOT NULL,
          agent_name TEXT NOT NULL,
          animal TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT '',
          status TEXT DEFAULT 'idle',
          current_task TEXT,
          added_at TEXT NOT NULL,
          FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
          FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS worktrees (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          agent_id TEXT NOT NULL,
          agent_name TEXT NOT NULL,
          branch TEXT NOT NULL,
          worktree_path TEXT NOT NULL,
          status TEXT DEFAULT 'active',
          changed_files INTEGER DEFAULT 0,
          ahead_by INTEGER DEFAULT 0,
          last_activity TEXT,
          merged_at TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS training_profiles (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT DEFAULT '',
          content TEXT DEFAULT '',
          mode TEXT DEFAULT 'technology',
          source TEXT DEFAULT '',
          user_prompt TEXT DEFAULT '',
          status TEXT DEFAULT 'pending',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS training_runs (
          id TEXT PRIMARY KEY,
          profile_id TEXT NOT NULL,
          agent_id TEXT,
          status TEXT DEFAULT 'pending',
          input_tokens INTEGER DEFAULT 0,
          output_tokens INTEGER DEFAULT 0,
          started_at TEXT DEFAULT (datetime('now')),
          completed_at TEXT,
          error TEXT,
          FOREIGN KEY (profile_id) REFERENCES training_profiles(id) ON DELETE CASCADE
        );
      `)

      // ── session_logs sütun eklentileri ──
      if (!hasColumn('session_logs', 'result_json'))
        db.exec("ALTER TABLE session_logs ADD COLUMN result_json TEXT DEFAULT ''")
      if (!hasColumn('session_logs', 'schema_valid'))
        db.exec("ALTER TABLE session_logs ADD COLUMN schema_valid INTEGER DEFAULT -1")
      if (!hasColumn('session_logs', 'cost_usd'))
        db.exec("ALTER TABLE session_logs ADD COLUMN cost_usd REAL DEFAULT 0")
      if (!hasColumn('session_logs', 'tools_used'))
        db.exec("ALTER TABLE session_logs ADD COLUMN tools_used TEXT DEFAULT '[]'")
      if (!hasColumn('session_logs', 'duration_sec'))
        db.exec("ALTER TABLE session_logs ADD COLUMN duration_sec INTEGER DEFAULT 0")
    }
  },
  // ── Gelecekte yeni migration'lar buraya eklenir ──
  // {
  //   version: 2,
  //   name: 'add_priority_to_tasks',
  //   up: () => {
  //     db.exec("ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'normal'")
  //   }
  // },
]

// ---------------------------------------------------------------------------
// Migration runner
// ---------------------------------------------------------------------------
function runMigrations() {
  // schema_version tablosu her zaman mevcut olmalı
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `)

  const current = db.prepare('SELECT MAX(version) as v FROM schema_version').get() as any
  const currentVersion: number = current?.v ?? 0

  for (const m of MIGRATIONS) {
    if (m.version > currentVersion) {
      db.transaction(() => {
        m.up()
        db.prepare('INSERT INTO schema_version (version, name, applied_at) VALUES (?, ?, ?)')
          .run(m.version, m.name, new Date().toISOString())
      })()
      console.log(`[DB] Migration #${m.version} (${m.name}) applied`)
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function initDb() {
  runMigrations()
  console.log('Database initialized at', DB_PATH)
}
