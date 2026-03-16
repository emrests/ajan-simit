import { execSync, spawnSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import { v4 as uuid } from 'uuid'
import { db } from '../db/database'
import { broadcast } from '../ws/server'

// Worktree dizin adı: .claude/worktrees/<agent-name>
const WORKTREE_DIR = '.claude/worktrees'

interface WorktreeRow {
  id: string
  project_id: string
  agent_id: string
  agent_name: string
  branch: string
  worktree_path: string
  status: string
  changed_files: number
  ahead_by: number
  last_activity: string | null
  merged_at: string | null
  created_at: string
}

function rowToWorktree(r: WorktreeRow) {
  return {
    id: r.id,
    projectId: r.project_id,
    agentId: r.agent_id,
    agentName: r.agent_name,
    branch: r.branch,
    worktreePath: r.worktree_path,
    status: r.status,
    changedFiles: r.changed_files,
    aheadBy: r.ahead_by,
    lastActivity: r.last_activity ?? undefined,
    mergedAt: r.merged_at ?? undefined,
    createdAt: r.created_at,
  }
}

/** Git komutunu workDir'de çalıştır */
function git(workDir: string, args: string): string {
  try {
    return execSync(`git ${args}`, {
      cwd: workDir,
      encoding: 'utf8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
  } catch (e: any) {
    throw new Error(e.stderr?.trim() || e.message)
  }
}

/** Dizinin git reposu olup olmadığını kontrol et */
export function isGitRepo(workDir: string): boolean {
  try {
    git(workDir, 'rev-parse --is-inside-work-tree')
    return true
  } catch {
    return false
  }
}

/** Ana branch adını bul (main veya master) */
function getMainBranch(workDir: string): string {
  try {
    // Önce remote HEAD'i dene
    const remote = git(workDir, 'symbolic-ref refs/remotes/origin/HEAD 2>/dev/null').replace('refs/remotes/origin/', '')
    if (remote) return remote
  } catch {}
  // Fallback: main veya master
  try {
    git(workDir, 'rev-parse --verify main')
    return 'main'
  } catch {}
  try {
    git(workDir, 'rev-parse --verify master')
    return 'master'
  } catch {}
  return 'main'
}

/** Ajan için worktree oluştur */
export function createWorktree(
  projectId: string,
  agentId: string,
  taskId?: string
): { worktreeId: string; worktreePath: string; branch: string } {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any
  if (!project) throw new Error('Project not found')
  if (!project.work_dir) throw new Error('Project workDir not set')
  if (!isGitRepo(project.work_dir)) throw new Error('Project workDir is not a git repository')

  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId) as any
  if (!agent) throw new Error('Agent not found')

  // Mevcut aktif worktree var mı kontrol et
  const existing = db.prepare(
    "SELECT * FROM worktrees WHERE project_id = ? AND agent_id = ? AND status = 'active'"
  ).get(projectId, agentId) as WorktreeRow | undefined
  if (existing) {
    // Mevcut worktree dizini hala var mı?
    if (fs.existsSync(existing.worktree_path)) {
      return { worktreeId: existing.id, worktreePath: existing.worktree_path, branch: existing.branch }
    }
    // Dizin yoksa kaydı sil
    db.prepare('DELETE FROM worktrees WHERE id = ?').run(existing.id)
  }

  const workDir = project.work_dir
  const safeName = agent.name.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase()
  const shortId = taskId ? taskId.slice(0, 8) : uuid().slice(0, 8)
  const branch = `agent/${safeName}/${shortId}`
  const wtPath = path.join(workDir, WORKTREE_DIR, safeName)

  // Worktree dizini zaten varsa temizle
  if (fs.existsSync(wtPath)) {
    try {
      git(workDir, `worktree remove "${wtPath}" --force`)
    } catch {
      // Manuel temizle
      fs.rmSync(wtPath, { recursive: true, force: true })
      try { git(workDir, 'worktree prune') } catch {}
    }
  }

  // Branch zaten varsa sil (eski kalıntı)
  try { git(workDir, `branch -D "${branch}"`) } catch {}

  // Worktree oluştur
  const mainBranch = getMainBranch(workDir)
  git(workDir, `worktree add "${wtPath}" -b "${branch}" "${mainBranch}"`)

  const id = uuid()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO worktrees (id, project_id, agent_id, agent_name, branch, worktree_path, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`
  ).run(id, projectId, agentId, agent.name, branch, wtPath, now)

  const wt = rowToWorktree(db.prepare('SELECT * FROM worktrees WHERE id = ?').get(id) as WorktreeRow)
  broadcast(project.office_id, { type: 'worktree:update' as any, projectId, worktree: wt })

  return { worktreeId: id, worktreePath: wtPath, branch }
}

/** Worktree durumunu güncelle (changed files, ahead by) */
export function refreshWorktreeStatus(worktreeId: string): void {
  const wt = db.prepare('SELECT * FROM worktrees WHERE id = ?').get(worktreeId) as WorktreeRow | undefined
  if (!wt || wt.status !== 'active') return
  if (!fs.existsSync(wt.worktree_path)) {
    db.prepare("UPDATE worktrees SET status = 'deleted' WHERE id = ?").run(worktreeId)
    return
  }

  try {
    // Değişen dosya sayısı
    const diffOutput = git(wt.worktree_path, 'diff --name-only HEAD')
    const stagedOutput = git(wt.worktree_path, 'diff --cached --name-only')
    const untrackedOutput = git(wt.worktree_path, 'ls-files --others --exclude-standard')
    const allChanges = new Set([
      ...diffOutput.split('\n').filter(Boolean),
      ...stagedOutput.split('\n').filter(Boolean),
      ...untrackedOutput.split('\n').filter(Boolean),
    ])

    // Ana branch'ten kaç commit ilerde
    const project = db.prepare('SELECT work_dir FROM projects WHERE id = ?').get(wt.project_id) as any
    let aheadBy = 0
    if (project?.work_dir) {
      const mainBranch = getMainBranch(project.work_dir)
      try {
        const log = git(wt.worktree_path, `rev-list ${mainBranch}..HEAD --count`)
        aheadBy = parseInt(log) || 0
      } catch {}
    }

    db.prepare(
      'UPDATE worktrees SET changed_files = ?, ahead_by = ?, last_activity = ? WHERE id = ?'
    ).run(allChanges.size, aheadBy, new Date().toISOString(), worktreeId)
  } catch {}
}

/** Worktree'yi ana branch'e merge et */
export function mergeWorktree(worktreeId: string): { success: boolean; message: string } {
  const wt = db.prepare('SELECT * FROM worktrees WHERE id = ?').get(worktreeId) as WorktreeRow | undefined
  if (!wt) return { success: false, message: 'Worktree not found' }

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(wt.project_id) as any
  if (!project) return { success: false, message: 'Project not found' }

  const workDir = project.work_dir

  // Worktree'deki değişiklikleri commit et (varsa)
  if (fs.existsSync(wt.worktree_path)) {
    try {
      const status = git(wt.worktree_path, 'status --porcelain')
      if (status) {
        git(wt.worktree_path, 'add -A')
        git(wt.worktree_path, `commit -m "Auto-commit before merge (agent: ${wt.agent_name})"`)
      }
    } catch {}
  }

  const mainBranch = getMainBranch(workDir)

  // Dry-run merge ile çakışma kontrolü
  try {
    git(workDir, `merge --no-commit --no-ff "${wt.branch}"`)
    // Başarılı — gerçek merge yap
    git(workDir, 'merge --abort') // Dry-run'ı geri al
    git(workDir, `merge "${wt.branch}" -m "Merge ${wt.branch} into ${mainBranch} (agent: ${wt.agent_name})"`)
  } catch (e: any) {
    // Çakışma var
    try { git(workDir, 'merge --abort') } catch {}

    db.prepare("UPDATE worktrees SET status = 'conflict' WHERE id = ?").run(worktreeId)
    const wtData = rowToWorktree(db.prepare('SELECT * FROM worktrees WHERE id = ?').get(worktreeId) as WorktreeRow)
    broadcast(project.office_id, { type: 'worktree:merge' as any, projectId: wt.project_id, worktreeId, success: false, message: e.message })
    broadcast(project.office_id, { type: 'worktree:update' as any, projectId: wt.project_id, worktree: wtData })

    return { success: false, message: `Merge conflict: ${e.message}` }
  }

  // Worktree'yi temizle
  try {
    git(workDir, `worktree remove "${wt.worktree_path}" --force`)
  } catch {
    if (fs.existsSync(wt.worktree_path)) {
      fs.rmSync(wt.worktree_path, { recursive: true, force: true })
    }
    try { git(workDir, 'worktree prune') } catch {}
  }

  // Branch'i sil
  try { git(workDir, `branch -d "${wt.branch}"`) } catch {}

  const now = new Date().toISOString()
  db.prepare("UPDATE worktrees SET status = 'merged', merged_at = ? WHERE id = ?").run(now, worktreeId)

  const wtData = rowToWorktree(db.prepare('SELECT * FROM worktrees WHERE id = ?').get(worktreeId) as WorktreeRow)
  broadcast(project.office_id, { type: 'worktree:merge' as any, projectId: wt.project_id, worktreeId, success: true, message: 'Merge successful' })
  broadcast(project.office_id, { type: 'worktree:update' as any, projectId: wt.project_id, worktree: wtData })

  return { success: true, message: `${wt.branch} merged into ${mainBranch}` }
}

/** Worktree'yi sil (merge etmeden) */
export function deleteWorktree(worktreeId: string): { success: boolean } {
  const wt = db.prepare('SELECT * FROM worktrees WHERE id = ?').get(worktreeId) as WorktreeRow | undefined
  if (!wt) return { success: false }

  const project = db.prepare('SELECT work_dir FROM projects WHERE id = ?').get(wt.project_id) as any
  if (project?.work_dir) {
    // Worktree dizinini kaldır
    try {
      git(project.work_dir, `worktree remove "${wt.worktree_path}" --force`)
    } catch {
      if (fs.existsSync(wt.worktree_path)) {
        fs.rmSync(wt.worktree_path, { recursive: true, force: true })
      }
      try { git(project.work_dir, 'worktree prune') } catch {}
    }
    // Branch'i sil
    try { git(project.work_dir, `branch -D "${wt.branch}"`) } catch {}
  }

  db.prepare("UPDATE worktrees SET status = 'deleted' WHERE id = ?").run(worktreeId)
  return { success: true }
}

/** Proje için tüm aktif worktree'leri listele */
export function getProjectWorktrees(projectId: string) {
  const rows = db.prepare(
    'SELECT * FROM worktrees WHERE project_id = ? ORDER BY created_at DESC'
  ).all(projectId) as WorktreeRow[]
  return rows.map(rowToWorktree)
}

/** Ajan için aktif worktree path'ini döndür (varsa) */
export function getAgentWorktreePath(projectId: string, agentId: string): string | null {
  const wt = db.prepare(
    "SELECT worktree_path FROM worktrees WHERE project_id = ? AND agent_id = ? AND status = 'active'"
  ).get(projectId, agentId) as { worktree_path: string } | undefined
  return wt?.worktree_path ?? null
}

/** Projenin worktree modunda olup olmadığını kontrol et */
export function isWorktreeMode(projectId: string): boolean {
  const project = db.prepare('SELECT isolation_mode FROM projects WHERE id = ?').get(projectId) as any
  return project?.isolation_mode === 'worktree'
}
