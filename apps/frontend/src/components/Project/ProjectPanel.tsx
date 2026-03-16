import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import type { Office, Project, Task, ApprovalPolicy, ErrorPolicy, WorkflowMode, ContextMode, Hook, HookEvent, HookType, HookLog, IsolationMode, Worktree, Team } from '@smith/types'
import { HOOK_TEMPLATES, ISOLATION_MODE_LABELS, WORKTREE_STATUS_LABELS, TEAM_STATUS_LABELS, TEAMMATE_STATUS_LABELS } from '@smith/types'
import { api } from '../../hooks/useApi'

interface ProjectPanelProps {
  office: Office
  onClose: () => void
  onUpdate: () => void
  isNight?: boolean
}

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  active: 'bg-blue-100 text-blue-700 border-blue-200',
  review: 'bg-purple-100 text-purple-700 border-purple-200',
  done: 'bg-green-100 text-green-700 border-green-200',
}
const STATUS_LABEL_KEYS: Record<string, string> = {
  planning: 'project.status.planning',
  active: 'project.status.active',
  review: 'project.status.review',
  done: 'project.status.done',
}

const HOOK_EVENT_LABEL_KEYS: Record<string, string> = {
  PreToolUse: 'hook.PreToolUse',
  PostToolUse: 'hook.PostToolUse',
  SessionStart: 'hook.SessionStart',
  SessionStop: 'hook.SessionStop',
  TaskCompleted: 'hook.TaskCompleted',
  TaskFailed: 'hook.TaskFailed',
  SubagentStart: 'hook.SubagentStart',
  SubagentStop: 'hook.SubagentStop',
  PreCompact: 'hook.PreCompact',
  Notification: 'hook.Notification',
}

const HOOK_TYPE_LABEL_KEYS: Record<string, string> = {
  command: 'hook.command',
  http: 'hook.http',
  prompt: 'hook.prompt',
}

const ISOLATION_MODE_LABEL_KEYS: Record<string, string> = {
  shared: 'isolation.shared',
  worktree: 'isolation.worktree',
}

const WORKTREE_STATUS_LABEL_KEYS: Record<string, string> = {
  active: 'status.worktree.active',
  merged: 'status.worktree.merged',
  conflict: 'status.worktree.conflict',
  deleted: 'status.worktree.deleted',
}

const TEAM_STATUS_LABEL_KEYS: Record<string, string> = {
  idle: 'status.team.idle',
  running: 'status.team.running',
  completed: 'status.team.completed',
  error: 'status.team.error',
}

const TEAMMATE_STATUS_LABEL_KEYS: Record<string, string> = {
  idle: 'status.teammate.idle',
  working: 'status.teammate.working',
  done: 'status.teammate.done',
  error: 'status.teammate.error',
}

export function ProjectPanel({ office, onClose, onUpdate, isNight = false }: ProjectPanelProps) {
  const { t } = useTranslation()
  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    office.projects[0]?.id ?? null
  )
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDir, setNewProjectDir] = useState('')
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [newTaskAgent, setNewTaskAgent] = useState('')
  const [newTaskDependsOn, setNewTaskDependsOn] = useState('')
  const [loading, setLoading] = useState(false)
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null)
  const [runningProject, setRunningProject] = useState(false)
  const [planningProject, setPlanningProject] = useState(false)
  const [runResult, setRunResult] = useState<string | null>(null)
  const [editingDir, setEditingDir] = useState(false)
  const [dirValue, setDirValue] = useState('')
  const [showPmContext, setShowPmContext] = useState(false)
  const [pmContext, setPmContext] = useState('')
  // Faz 12 — Hooks
  const [hooks, setHooks] = useState<Hook[]>([])
  const [hooksLoading, setHooksLoading] = useState(false)
  const [showNewHook, setShowNewHook] = useState(false)
  const [newHookEvent, setNewHookEvent] = useState<HookEvent>('PostToolUse')
  const [newHookMatcher, setNewHookMatcher] = useState('')
  const [newHookType, setNewHookType] = useState<HookType>('command')
  const [newHookCommand, setNewHookCommand] = useState('')
  const [newHookUrl, setNewHookUrl] = useState('')
  const [newHookPrompt, setNewHookPrompt] = useState('')
  const [hookLogs, setHookLogs] = useState<Record<string, HookLog[]>>({})
  const [expandedHookId, setExpandedHookId] = useState<string | null>(null)
  // Faz 14 — Worktree
  const [worktrees, setWorktrees] = useState<Worktree[]>([])
  const [worktreeLoading, setWorktreeLoading] = useState(false)
  const [isGitRepo, setIsGitRepo] = useState(false)
  // Faz 15 — Teams
  const [teams, setTeams] = useState<Team[]>([])
  const [teamsLoading, setTeamsLoading] = useState(false)
  const [showTeamCreator, setShowTeamCreator] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamLeadId, setNewTeamLeadId] = useState('')
  const [newTeamMax, setNewTeamMax] = useState(5)
  // Görev düzenleme & sıralama
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingTaskDesc, setEditingTaskDesc] = useState('')

  const activeProject = office.projects.find(p => p.id === activeProjectId) ?? null

  // Faz 12 — Hook'ları yükle
  const loadHooks = useCallback(async (projectId: string) => {
    try {
      const data = await api.getHooks(projectId)
      setHooks(data)
    } catch {}
  }, [])

  // Faz 14 — Worktree'leri yükle
  const loadWorktrees = useCallback(async (projectId: string) => {
    try {
      const data = await api.getWorktrees(projectId)
      setWorktrees(data)
    } catch {}
  }, [])

  const checkGitRepo = useCallback(async (projectId: string) => {
    try {
      const data = await api.getGitStatus(projectId)
      setIsGitRepo(data.isGitRepo)
    } catch { setIsGitRepo(false) }
  }, [])

  // Faz 15 — Teams yükle
  const loadTeams = useCallback(async (projectId: string) => {
    try {
      const data = await api.getTeams(projectId)
      setTeams(data)
    } catch {}
  }, [])

  useEffect(() => {
    if (activeProjectId) {
      loadHooks(activeProjectId)
      loadWorktrees(activeProjectId)
      checkGitRepo(activeProjectId)
      loadTeams(activeProjectId)
    }
  }, [activeProjectId, loadHooks, loadWorktrees, checkGitRepo, loadTeams])

  const bg = isNight ? 'bg-[#0f1a2e]' : 'bg-white'
  const border = isNight ? 'border-[#1a3a6a]' : 'border-[#e8d5c4]'
  const text = isNight ? 'text-blue-100' : 'text-[#3d2b1f]'
  const subtext = isNight ? 'text-blue-300' : 'text-[#a08060]'
  const inputCls = `w-full px-3 py-2 rounded-xl border-2 outline-none text-sm font-semibold ${isNight ? 'bg-[#1a2a4a] border-[#2a4a8a] text-blue-100 placeholder-blue-400 focus:border-[#4a8aff]' : 'bg-[#faf7f4] border-[#e8d5c4] text-[#3d2b1f] placeholder-[#c8a882] focus:border-[#7eb5a6]'}`

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return
    setLoading(true)
    try {
      const p = await api.createProject(office.id, {
        name: newProjectName,
        workDir: newProjectDir.trim() || undefined,
      })
      await onUpdate()
      setActiveProjectId(p.id)
      setShowNewProject(false)
      setNewProjectName('')
      setNewProjectDir('')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!activeProject) return
    if (!confirm(t('confirm.deleteProject', { name: activeProject.name }))) return
    setLoading(true)
    try {
      await api.deleteProject(activeProject.id)
      // Sıradaki projeye geç
      const remaining = office.projects.filter(p => p.id !== activeProject.id)
      setActiveProjectId(remaining[0]?.id ?? null)
      await onUpdate()
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDir = async () => {
    if (!activeProject) return
    setLoading(true)
    try {
      await api.updateProject(activeProject.id, { workDir: dirValue } as any)
      setEditingDir(false)
      await onUpdate()
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTask = async () => {
    if (!newTaskDesc.trim() || !activeProjectId) return
    setLoading(true)
    try {
      await api.createTask(activeProjectId, {
        description: newTaskDesc,
        assignedAgentId: newTaskAgent || undefined,
        dependsOnTaskId: newTaskDependsOn || undefined,
      })
      await onUpdate()
      setNewTaskDesc('')
      setNewTaskAgent('')
      setNewTaskDependsOn('')
    } finally {
      setLoading(false)
    }
  }

  const handleTaskStatus = async (task: Task, status: string) => {
    await api.updateTask(task.id, { status } as any)
    onUpdate()
  }

  const handleRunTask = async (task: Task) => {
    setRunningTaskId(task.id)
    setRunResult(null)
    try {
      await api.runTask(task.id)
      setRunResult(t('project.taskStartedResult', { desc: task.description.slice(0, 40) }))
      await onUpdate()
    } catch (e: any) {
      setRunResult(`${e.message}`)
    } finally {
      setRunningTaskId(null)
    }
  }

  const handleRunProject = async () => {
    if (!activeProject) return
    setRunningProject(true)
    setRunResult(null)
    try {
      const result = await api.runProject(activeProject.id)
      if (result.started === 0) {
        setRunResult(result.message ?? t('project.noTasksToStart'))
      } else {
        setRunResult(t('project.startedResult', { started: result.started, total: result.total }))
      }
      await onUpdate()
    } catch (e: any) {
      setRunResult(`${e.message}`)
    } finally {
      setRunningProject(false)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    await api.deleteTask(taskId)
    onUpdate()
  }

  const handleEditTask = async (taskId: string, description: string) => {
    if (!description.trim()) return
    await api.updateTask(taskId, { description } as any)
    setEditingTaskId(null)
    setEditingTaskDesc('')
    onUpdate()
  }

  const handleMoveTask = async (taskId: string, direction: 'up' | 'down') => {
    if (!activeProject) return
    const tasks = activeProject.tasks
    const idx = tasks.findIndex(t => t.id === taskId)
    if (direction === 'up' && idx <= 0) return
    if (direction === 'down' && idx >= tasks.length - 1) return
    const newOrder = [...tasks]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    ;[newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]]
    await api.reorderTasks(activeProject.id, newOrder.map(t => t.id))
    onUpdate()
  }

  const handleUpdateDependency = async (taskId: string, dependsOnTaskId: string | undefined) => {
    await api.updateTask(taskId, { dependsOnTaskId: dependsOnTaskId || null } as any)
    onUpdate()
  }

  const handlePlanProject = async () => {
    if (!activeProject) return
    setPlanningProject(true)
    setRunResult(null)
    try {
      const result = await api.planProject(activeProject.id, pmContext.trim() || undefined)
      setRunResult(t('project.pmCreated', { count: result.created }))
      setPmContext('')
      setShowPmContext(false)
      await onUpdate()
    } catch (e: any) {
      setRunResult(t('project.pmError', { message: e.message }))
    } finally {
      setPlanningProject(false)
    }
  }

  const handleProjectStatus = async (projectId: string, status: string) => {
    await api.updateProject(projectId, { status } as any)
    onUpdate()
  }

  // Proje değişince dir editini kapat
  const switchProject = (id: string) => {
    setActiveProjectId(id)
    setEditingDir(false)
  }

  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-stretch justify-end">
      {/* Dışarıya tıkla kapat */}
      <div className="flex-1" onClick={onClose} />

      <motion.div
        className={`w-[480px] flex flex-col shadow-2xl border-l-2 ${bg} ${border}`}
        initial={{ x: 480 }}
        animate={{ x: 0 }}
        exit={{ x: 480 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className={`px-5 py-4 border-b-2 ${border} flex items-center gap-3`}>
          <span className="text-2xl">📋</span>
          <div className="flex-1">
            <h3 className={`font-black text-lg ${text}`}>{t('project.title')}</h3>
            <p className={`text-[10px] ${subtext}`}>{office.name}</p>
          </div>
          <button onClick={onClose} className={`text-2xl leading-none ${subtext} hover:${text}`}>×</button>
        </div>

        {/* Proje sekmeleri */}
        <div className={`flex gap-1 px-3 pt-3 pb-0 border-b ${border} overflow-x-auto`}>
          {office.projects.map(p => (
            <button
              key={p.id}
              onClick={() => switchProject(p.id)}
              className={`px-3 py-1.5 rounded-t-xl text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                activeProjectId === p.id
                  ? isNight ? 'border-[#4a8aff] text-blue-200 bg-[#1a2a4a]' : 'border-[#7eb5a6] text-[#3d2b1f] bg-white'
                  : `border-transparent ${subtext}`
              }`}
            >
              {p.name}
              <span className="ml-1.5 opacity-60">
                {p.tasks.filter(t => t.status === 'done').length}/{p.tasks.length}
              </span>
            </button>
          ))}
          <button
            onClick={() => setShowNewProject(v => !v)}
            className={`px-3 py-1.5 rounded-t-xl text-xs font-bold border-b-2 border-dashed transition-all ${isNight ? 'border-[#2a4a8a] text-blue-400' : 'border-[#c8a882] text-[#a08060]'}`}
          >
            {t('project.new')}
          </button>
        </div>

        {/* Yeni proje formu */}
        <AnimatePresence>
          {showNewProject && (
            <motion.div
              className={`px-4 py-3 border-b ${border} space-y-2`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                  placeholder={t('project.namePlaceholder')}
                  className={inputCls}
                />
                <button
                  onClick={handleCreateProject}
                  disabled={loading || !newProjectName.trim()}
                  className="px-4 py-2 rounded-xl bg-[#7eb5a6] text-white text-xs font-black disabled:opacity-50 shrink-0"
                >
                  {t('common.add')}
                </button>
              </div>
              <input
                type="text"
                value={newProjectDir}
                onChange={e => setNewProjectDir(e.target.value)}
                placeholder={t('project.dirPlaceholder')}
                className={`${inputCls} text-xs font-normal`}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Aktif proje içeriği */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!activeProject ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">📁</div>
              <p className={`font-bold ${text}`}>{t('project.noProject')}</p>
              <p className={`text-sm ${subtext}`}>{t('project.noProjectHint')}</p>
            </div>
          ) : (
            <>
              {/* Proje başlığı + durum + sil */}
              <div className={`p-3 rounded-2xl border ${isNight ? 'bg-[#1a2a4a] border-[#2a4a8a]' : 'bg-[#f5e6d3] border-[#e8d5c4]'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`font-black ${text}`}>{activeProject.name}</h4>
                  <div className="flex items-center gap-2">
                    <select
                      value={activeProject.status}
                      onChange={e => handleProjectStatus(activeProject.id, e.target.value)}
                      className={`text-xs font-bold rounded-xl px-2 py-1 border cursor-pointer ${STATUS_COLORS[activeProject.status]} bg-transparent`}
                    >
                      {Object.entries(STATUS_LABEL_KEYS).map(([k, labelKey]) => (
                        <option key={k} value={k}>{t(labelKey)}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleDeleteProject}
                      disabled={loading}
                      title={t('project.deleteProject')}
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors text-sm"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                {/* Projeyi Başlat butonu */}
                <button
                  onClick={handleRunProject}
                  disabled={runningProject || !activeProject.workDir}
                  title={!activeProject.workDir ? t('project.addDirFirst') : t('project.startAllTitle')}
                  className={`w-full py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 mt-2 ${
                    runningProject
                      ? 'bg-[#7eb5a6]/50 text-white cursor-wait'
                      : !activeProject.workDir
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : isNight
                      ? 'bg-[#4a8aff] hover:bg-[#3a7aef] text-white shadow-md'
                      : 'bg-[#7eb5a6] hover:bg-[#6aa596] text-white shadow-md'
                  }`}
                >
                  {runningProject ? (
                    <><span className="animate-spin">⏳</span> {t('project.starting')}</>
                  ) : (
                    <>🚀 {t('project.startProject')}</>
                  )}
                </button>

                {/* PM Ajanı: Claude ile görev planla */}
                <div className="mt-2">
                  {!showPmContext ? (
                    <button
                      onClick={() => setShowPmContext(true)}
                      disabled={planningProject || office.agents.length === 0}
                      title={office.agents.length === 0 ? t('project.addAgentsFirst') : t('project.pmPlanTitle')}
                      className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        planningProject
                          ? 'bg-purple-100 text-purple-400 cursor-wait'
                          : office.agents.length === 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : isNight
                          ? 'bg-[#3a2a5a] hover:bg-[#4a3a7a] text-purple-200 border border-purple-700'
                          : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200'
                      }`}
                    >
                      {planningProject ? <><span className="animate-spin">⏳</span> {t('project.pmThinking')}</> : `🤖 ${t('project.planWithPm')}`}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        value={pmContext}
                        onChange={e => setPmContext(e.target.value)}
                        placeholder={t('project.pmContextPlaceholder')}
                        rows={2}
                        className={`w-full px-3 py-2 rounded-xl border-2 outline-none text-xs resize-none ${isNight ? 'bg-[#1a2a4a] border-[#2a4a8a] text-blue-100 placeholder-blue-400' : 'bg-[#faf7f4] border-[#e8d5c4] text-[#3d2b1f] placeholder-[#c8a882]'}`}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowPmContext(false)}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold border ${isNight ? 'border-[#2a4a8a] text-blue-300' : 'border-[#e8d5c4] text-[#7a5c3f]'}`}
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          onClick={handlePlanProject}
                          disabled={planningProject}
                          className="flex-1 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-black disabled:opacity-50"
                        >
                          {planningProject ? '⏳...' : `🤖 ${t('project.planWithClaude')}`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sonuç mesajı */}
                {runResult && (
                  <p className={`text-[11px] font-semibold mt-2 px-2 py-1.5 rounded-lg ${
                    runResult.startsWith('❌') ? 'bg-red-50 text-red-600' :
                    runResult.startsWith('🚀') ? 'bg-green-50 text-green-700' :
                    runResult.startsWith('🤖') ? 'bg-purple-50 text-purple-700' :
                    'bg-yellow-50 text-yellow-700'
                  }`}>
                    {runResult}
                  </p>
                )}

                {/* Klasör yolu */}
                {editingDir ? (
                  <div className="flex gap-2 mt-1">
                    <input
                      autoFocus
                      type="text"
                      value={dirValue}
                      onChange={e => setDirValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveDir()
                        if (e.key === 'Escape') setEditingDir(false)
                      }}
                      placeholder="d:\projelerim\proje-adi"
                      className={`flex-1 px-2 py-1 rounded-lg border-2 outline-none text-xs font-mono ${isNight ? 'bg-[#1a2a4a] border-[#3a5a9a] text-blue-100' : 'bg-white border-[#c8a882] text-[#3d2b1f]'}`}
                    />
                    <button onClick={handleSaveDir} disabled={loading} className="px-2 py-1 rounded-lg bg-[#7eb5a6] text-white text-xs font-bold">
                      {t('common.save')}
                    </button>
                    <button onClick={() => setEditingDir(false)} className={`px-2 py-1 rounded-lg text-xs ${subtext}`}>
                      {t('common.cancel')}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setDirValue(activeProject.workDir ?? ''); setEditingDir(true) }}
                    className={`flex items-center gap-1.5 text-[10px] font-mono mt-1 px-2 py-1 rounded-lg hover:opacity-80 transition-opacity w-full text-left ${isNight ? 'bg-[#1a3a5a]/50 text-blue-300' : 'bg-white/60 text-[#a08060]'}`}
                  >
                    <span>📂</span>
                    <span className="truncate">
                      {activeProject.workDir ? activeProject.workDir : t('project.addDirHint')}
                    </span>
                    <span className="ml-auto opacity-50 shrink-0">✏️</span>
                  </button>
                )}
              </div>

              {/* İlerleme çubuğu */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className={subtext}>{t('project.progress')}</span>
                  <span className={`font-bold ${text}`}>{activeProject.progress}%</span>
                </div>
                <div className={`h-2.5 rounded-full overflow-hidden ${isNight ? 'bg-[#1a2a4a]' : 'bg-[#e8d5c4]'}`}>
                  <motion.div
                    className="h-full bg-[#7eb5a6] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${activeProject.progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* İş Akışı Ayarları */}
              <details className={`rounded-2xl border ${isNight ? 'bg-[#1a2a4a] border-[#2a4a8a]' : 'bg-[#faf7f4] border-[#e8d5c4]'}`}>
                <summary className={`px-3 py-2.5 cursor-pointer text-xs font-bold ${subtext} select-none flex items-center gap-2`}>
                  <span>⚙️ {t('project.workflowSettings')}</span>
                  <span className={`text-[9px] font-normal ${subtext} opacity-70`}>
                    ({activeProject.workflowMode === 'team' ? t('project.workflowTeam').split(' — ')[0] : activeProject.workflowMode === 'coordinated' ? t('project.workflowCoordinated').split(' — ')[0] : t('project.workflowFree').split(' — ')[0]})
                  </span>
                </summary>
                <div className={`px-3 pb-3 space-y-2.5 border-t ${border}`}>
                  {/* İş akışı modu */}
                  <div className="pt-2">
                    <label className={`text-[10px] font-bold block mb-1 ${subtext}`}>{t('project.workflowMode')}</label>
                    <select
                      value={activeProject.workflowMode ?? 'free'}
                      onChange={async e => {
                        await api.updateProject(activeProject.id, { workflowMode: e.target.value as WorkflowMode } as any)
                        onUpdate()
                      }}
                      className={`w-full px-2 py-1.5 rounded-lg border text-xs ${isNight ? 'bg-[#1a3a5a] border-[#2a5a8a] text-blue-200' : 'bg-white border-[#e8d5c4] text-[#3d2b1f]'}`}
                    >
                      <option value="free">🔓 {t('project.workflowFree')}</option>
                      <option value="coordinated">🎯 {t('project.workflowCoordinated')}</option>
                      <option value="team">👥 {t('project.workflowTeam')}</option>
                    </select>
                  </div>

                  {/* PM Ajanı seçimi */}
                  <div>
                    <label className={`text-[10px] font-bold block mb-1 ${subtext}`}>{t('project.pmAgent')}</label>
                    <select
                      value={activeProject.pmAgentId ?? ''}
                      onChange={async e => {
                        await api.updateProject(activeProject.id, { pmAgentId: e.target.value || undefined } as any)
                        onUpdate()
                      }}
                      className={`w-full px-2 py-1.5 rounded-lg border text-xs ${isNight ? 'bg-[#1a3a5a] border-[#2a5a8a] text-blue-200' : 'bg-white border-[#e8d5c4] text-[#3d2b1f]'}`}
                    >
                      <option value="">{t('project.pmNotAssigned')}</option>
                      {office.agents.map(a => (
                        <option key={a.id} value={a.id}>🐻 {a.name} — {a.role}</option>
                      ))}
                    </select>
                  </div>

                  {/* Onay politikası */}
                  <div>
                    <label className={`text-[10px] font-bold block mb-1 ${subtext}`}>{t('project.approvalPolicy')}</label>
                    <select
                      value={activeProject.approvalPolicy ?? 'auto'}
                      onChange={async e => {
                        await api.updateProject(activeProject.id, { approvalPolicy: e.target.value as ApprovalPolicy } as any)
                        onUpdate()
                      }}
                      className={`w-full px-2 py-1.5 rounded-lg border text-xs ${isNight ? 'bg-[#1a3a5a] border-[#2a5a8a] text-blue-200' : 'bg-white border-[#e8d5c4] text-[#3d2b1f]'}`}
                    >
                      <option value="auto">⚡ {t('project.approvalAuto')}</option>
                      <option value="ask-user">👤 {t('project.approvalUser')}</option>
                      <option value="ask-pm">🤖 {t('project.approvalPm')}</option>
                    </select>
                  </div>

                  {/* Hata politikası */}
                  <div>
                    <label className={`text-[10px] font-bold block mb-1 ${subtext}`}>{t('project.errorPolicy')}</label>
                    <select
                      value={activeProject.errorPolicy ?? 'stop'}
                      onChange={async e => {
                        await api.updateProject(activeProject.id, { errorPolicy: e.target.value as ErrorPolicy } as any)
                        onUpdate()
                      }}
                      className={`w-full px-2 py-1.5 rounded-lg border text-xs ${isNight ? 'bg-[#1a3a5a] border-[#2a5a8a] text-blue-200' : 'bg-white border-[#e8d5c4] text-[#3d2b1f]'}`}
                    >
                      <option value="stop">🛑 {t('project.errorStop')}</option>
                      <option value="notify-pm">📢 {t('project.errorNotifyPm')}</option>
                      <option value="auto-retry">🔄 {t('project.errorAutoRetry')}</option>
                    </select>
                  </div>

                  {/* Faz 9 — Bağlam Modu */}
                  <div>
                    <label className={`text-[10px] font-bold block mb-1 ${subtext}`}>{t('project.contextMode')} <span className="font-normal opacity-70">({t('project.contextModeSave')})</span></label>
                    <select
                      value={activeProject.contextMode ?? 'full'}
                      onChange={async e => {
                        await api.updateProject(activeProject.id, { contextMode: e.target.value as ContextMode } as any)
                        onUpdate()
                      }}
                      className={`w-full px-2 py-1.5 rounded-lg border text-xs ${isNight ? 'bg-[#1a3a5a] border-[#2a5a8a] text-blue-200' : 'bg-white border-[#e8d5c4] text-[#3d2b1f]'}`}
                    >
                      <option value="full">📝 {t('project.contextFull')}</option>
                      <option value="compact">📦 {t('project.contextCompact')}</option>
                      <option value="minimal">⚡ {t('project.contextMinimal')}</option>
                    </select>
                  </div>

                  {/* Faz 9 — CLAUDE.md */}
                  <div>
                    <label className={`text-[10px] font-bold block mb-1 ${subtext}`}>{t('project.claudeMd')} <span className="font-normal opacity-70">({t('project.claudeMdLabel')})</span></label>
                    <p className={`text-[9px] mb-1 ${subtext} opacity-70`}>
                      {t('project.claudeMdDesc')}
                    </p>
                    <textarea
                      defaultValue={activeProject.claudeMd ?? ''}
                      onBlur={async e => {
                        const val = e.target.value.trim()
                        if (val !== (activeProject.claudeMd ?? '')) {
                          await api.updateProject(activeProject.id, { claudeMd: val || undefined } as any)
                          onUpdate()
                        }
                      }}
                      placeholder={t('project.claudeMdPlaceholder')}
                      rows={4}
                      className={`w-full px-2 py-1.5 rounded-lg border text-[10px] font-mono resize-none ${isNight ? 'bg-[#1a3a5a] border-[#2a5a8a] text-blue-200 placeholder-blue-400/50' : 'bg-white border-[#e8d5c4] text-[#3d2b1f] placeholder-[#c8a882]'}`}
                    />
                  </div>

                  {/* Faz 11 — Proje bazında ek talimatlar */}
                  <div>
                    <label className={`text-[10px] font-bold block mb-1 ${subtext}`}>
                      {t('project.extraInstructions')} <span className="font-normal opacity-70">({t('project.extraInstructionsLabel')})</span>
                    </label>
                    <p className={`text-[9px] mb-1 ${subtext} opacity-70`}>
                      {t('project.extraInstructionsDesc')}
                    </p>
                    <textarea
                      defaultValue={(activeProject as any).extraInstructions ?? ''}
                      onBlur={async e => {
                        const val = e.target.value.trim()
                        if (val !== ((activeProject as any).extraInstructions ?? '')) {
                          await api.updateProject(activeProject.id, { extraInstructions: val || undefined } as any)
                          onUpdate()
                        }
                      }}
                      placeholder={"Her dosyayı değiştirmeden önce test yaz.\nTypescript strict mode kullan.\nCommit mesajlarını Türkçe yaz.\n\nBu proje: {{project.name}}"}
                      rows={3}
                      className={`w-full px-2 py-1.5 rounded-lg border text-[10px] font-mono resize-none ${isNight ? 'bg-[#1a3a5a] border-[#2a5a8a] text-blue-200 placeholder-blue-400/50' : 'bg-white border-[#e8d5c4] text-[#3d2b1f] placeholder-[#c8a882]'}`}
                    />
                  </div>
                </div>
              </details>

              {/* Faz 12 — Hooks Yönetimi */}
              <details className={`rounded-2xl border ${isNight ? 'bg-[#1a2a4a] border-[#2a4a8a]' : 'bg-[#faf7f4] border-[#e8d5c4]'}`}>
                <summary className={`px-3 py-2.5 cursor-pointer text-xs font-bold ${subtext} select-none flex items-center gap-2`}>
                  <span>🪝 {t('project.hooks')}</span>
                  <span className={`text-[9px] font-normal ${subtext} opacity-70`}>
                    ({t('project.hooksActive', { count: hooks.filter(h => h.enabled).length })})
                  </span>
                </summary>
                <div className={`px-3 pb-3 space-y-2 border-t ${border}`}>
                  {/* Mevcut hook listesi */}
                  {hooks.length === 0 ? (
                    <p className={`text-xs text-center py-3 ${subtext}`}>{t('project.noHooks')}</p>
                  ) : (
                    <div className="space-y-1.5 pt-2">
                      {hooks.map(hook => (
                        <div
                          key={hook.id}
                          className={`rounded-xl border p-2 ${
                            hook.enabled
                              ? isNight ? 'bg-[#1a3a5a] border-[#2a5a8a]' : 'bg-white border-[#e8d5c4]'
                              : isNight ? 'bg-[#1a2a3a] border-[#2a3a5a] opacity-50' : 'bg-gray-50 border-gray-200 opacity-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                await api.toggleHook(hook.id)
                                loadHooks(activeProject!.id)
                              }}
                              className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                                hook.enabled
                                  ? 'bg-[#7eb5a6] border-[#7eb5a6] text-white'
                                  : isNight ? 'border-[#3a5a8a]' : 'border-[#c8a882]'
                              }`}
                              title={hook.enabled ? t('common.disabled') : t('common.enabled')}
                            >
                              {hook.enabled && <span className="text-[8px]">✓</span>}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  isNight ? 'bg-[#2a4a7a] text-blue-200' : 'bg-[#e8d5c4] text-[#5a3a1f]'
                                }`}>
                                  {t(HOOK_EVENT_LABEL_KEYS[hook.event as HookEvent] ?? hook.event)}
                                </span>
                                {hook.matcher && (
                                  <span className={`text-[9px] font-mono ${subtext}`}>{hook.matcher}</span>
                                )}
                              </div>
                              <p className={`text-[10px] mt-0.5 font-mono truncate ${text}`}>
                                {hook.type === 'command' ? `$ ${hook.command}` :
                                 hook.type === 'http' ? `POST ${hook.url}` :
                                 `LLM: ${hook.prompt?.slice(0, 50)}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={async () => {
                                  if (expandedHookId === hook.id) {
                                    setExpandedHookId(null)
                                  } else {
                                    setExpandedHookId(hook.id)
                                    try {
                                      const logs = await api.getHookLogs(hook.id)
                                      setHookLogs(prev => ({ ...prev, [hook.id]: logs }))
                                    } catch {}
                                  }
                                }}
                                className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] transition-colors ${isNight ? 'hover:bg-[#2a4a7a] text-blue-300' : 'hover:bg-[#f0e0d0] text-[#7a5c3f]'}`}
                                title={t('project.hookLogs')}
                              >
                                📋
                              </button>
                              <button
                                onClick={async () => {
                                  await api.deleteHook(hook.id)
                                  loadHooks(activeProject!.id)
                                }}
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] text-red-300 hover:bg-red-50 transition-colors"
                                title={t('common.delete')}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          {/* Hook logları */}
                          {expandedHookId === hook.id && hookLogs[hook.id] && (
                            <div className={`mt-2 pt-2 border-t space-y-1 ${border}`}>
                              {hookLogs[hook.id].length === 0 ? (
                                <p className={`text-[9px] ${subtext}`}>{t('project.hookNoLogs')}</p>
                              ) : (
                                hookLogs[hook.id].slice(0, 5).map(log => (
                                  <div key={log.id} className={`text-[9px] flex items-center gap-1.5 ${subtext}`}>
                                    <span>{log.success ? '✅' : '❌'}</span>
                                    <span className="font-mono">{new Date(log.executedAt).toLocaleTimeString('tr-TR')}</span>
                                    <span className="truncate opacity-70">{log.output?.slice(0, 60)}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Yeni hook oluşturma */}
                  {!showNewHook ? (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setShowNewHook(true)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isNight ? 'bg-[#2a4a7a] hover:bg-[#3a5a9a] text-blue-200' : 'bg-[#7eb5a6]/10 hover:bg-[#7eb5a6]/20 text-[#4a9a86]'
                        }`}
                      >
                        {t('project.newHook')}
                      </button>
                      {/* Hazır şablonlar */}
                      <select
                        value=""
                        onChange={async e => {
                          const tpl = HOOK_TEMPLATES[Number(e.target.value)]
                          if (!tpl || !activeProject) return
                          await api.createHook(activeProject.id, {
                            event: tpl.event,
                            matcher: tpl.matcher,
                            type: tpl.type,
                            command: tpl.command ?? '',
                            url: tpl.url ?? '',
                            prompt: tpl.prompt ?? '',
                          })
                          loadHooks(activeProject.id)
                        }}
                        className={`px-2 py-1.5 rounded-xl text-[10px] border cursor-pointer ${
                          isNight ? 'bg-[#1a3a5a] border-[#2a5a8a] text-blue-200' : 'bg-white border-[#e8d5c4] text-[#7a5c3f]'
                        }`}
                      >
                        <option value="">📦 {t('project.hookTemplate')}</option>
                        {HOOK_TEMPLATES.map((tpl, i) => (
                          <option key={i} value={i}>{tpl.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className={`space-y-2 pt-2 pb-1 px-2 rounded-xl border ${isNight ? 'bg-[#1a3a5a] border-[#2a5a8a]' : 'bg-white border-[#e8d5c4]'}`}>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className={`text-[9px] font-bold block mb-0.5 ${subtext}`}>{t('project.hookEvent')}</label>
                          <select
                            value={newHookEvent}
                            onChange={e => setNewHookEvent(e.target.value as HookEvent)}
                            className={`w-full px-2 py-1 rounded-lg border text-[10px] ${isNight ? 'bg-[#1a2a4a] border-[#2a4a8a] text-blue-200' : 'bg-[#faf7f4] border-[#e8d5c4] text-[#3d2b1f]'}`}
                          >
                            {(Object.entries(HOOK_EVENT_LABEL_KEYS) as [string, string][]).map(([k, labelKey]) => (
                              <option key={k} value={k}>{t(labelKey)}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className={`text-[9px] font-bold block mb-0.5 ${subtext}`}>{t('project.hookType')}</label>
                          <select
                            value={newHookType}
                            onChange={e => setNewHookType(e.target.value as HookType)}
                            className={`w-full px-2 py-1 rounded-lg border text-[10px] ${isNight ? 'bg-[#1a2a4a] border-[#2a4a8a] text-blue-200' : 'bg-[#faf7f4] border-[#e8d5c4] text-[#3d2b1f]'}`}
                          >
                            {(Object.entries(HOOK_TYPE_LABEL_KEYS) as [string, string][]).map(([k, labelKey]) => (
                              <option key={k} value={k}>{t(labelKey)}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {(newHookEvent === 'PreToolUse' || newHookEvent === 'PostToolUse') && (
                        <div>
                          <label className={`text-[9px] font-bold block mb-0.5 ${subtext}`}>{t('project.hookMatcher')} <span className="font-normal opacity-70">({t('common.optional')})</span></label>
                          <input
                            type="text"
                            value={newHookMatcher}
                            onChange={e => setNewHookMatcher(e.target.value)}
                            placeholder='ör: Bash, Read(.env*), mcp__github__*'
                            className={`w-full px-2 py-1 rounded-lg border text-[10px] font-mono ${isNight ? 'bg-[#1a2a4a] border-[#2a4a8a] text-blue-200 placeholder-blue-400/50' : 'bg-[#faf7f4] border-[#e8d5c4] text-[#3d2b1f] placeholder-[#c8a882]'}`}
                          />
                        </div>
                      )}
                      {newHookType === 'command' && (
                        <div>
                          <label className={`text-[9px] font-bold block mb-0.5 ${subtext}`}>{t('project.hookCommand')}</label>
                          <input
                            type="text"
                            value={newHookCommand}
                            onChange={e => setNewHookCommand(e.target.value)}
                            placeholder='ör: npx prettier --write .'
                            className={`w-full px-2 py-1 rounded-lg border text-[10px] font-mono ${isNight ? 'bg-[#1a2a4a] border-[#2a4a8a] text-blue-200 placeholder-blue-400/50' : 'bg-[#faf7f4] border-[#e8d5c4] text-[#3d2b1f] placeholder-[#c8a882]'}`}
                          />
                        </div>
                      )}
                      {newHookType === 'http' && (
                        <div>
                          <label className={`text-[9px] font-bold block mb-0.5 ${subtext}`}>{t('project.hookWebhookUrl')}</label>
                          <input
                            type="text"
                            value={newHookUrl}
                            onChange={e => setNewHookUrl(e.target.value)}
                            placeholder='https://hooks.example.com/notify'
                            className={`w-full px-2 py-1 rounded-lg border text-[10px] font-mono ${isNight ? 'bg-[#1a2a4a] border-[#2a4a8a] text-blue-200 placeholder-blue-400/50' : 'bg-[#faf7f4] border-[#e8d5c4] text-[#3d2b1f] placeholder-[#c8a882]'}`}
                          />
                        </div>
                      )}
                      {newHookType === 'prompt' && (
                        <div>
                          <label className={`text-[9px] font-bold block mb-0.5 ${subtext}`}>{t('project.hookLlmPrompt')}</label>
                          <textarea
                            value={newHookPrompt}
                            onChange={e => setNewHookPrompt(e.target.value)}
                            placeholder='Bu değişiklik güvenli mi? Değerlendir...'
                            rows={2}
                            className={`w-full px-2 py-1 rounded-lg border text-[10px] resize-none ${isNight ? 'bg-[#1a2a4a] border-[#2a4a8a] text-blue-200 placeholder-blue-400/50' : 'bg-[#faf7f4] border-[#e8d5c4] text-[#3d2b1f] placeholder-[#c8a882]'}`}
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setShowNewHook(false)
                            setNewHookMatcher('')
                            setNewHookCommand('')
                            setNewHookUrl('')
                            setNewHookPrompt('')
                          }}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold border ${isNight ? 'border-[#2a4a8a] text-blue-300' : 'border-[#e8d5c4] text-[#7a5c3f]'}`}
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          onClick={async () => {
                            if (!activeProject) return
                            setHooksLoading(true)
                            try {
                              await api.createHook(activeProject.id, {
                                event: newHookEvent,
                                matcher: newHookMatcher || undefined,
                                type: newHookType,
                                command: newHookCommand || undefined,
                                url: newHookUrl || undefined,
                                prompt: newHookPrompt || undefined,
                              })
                              await loadHooks(activeProject.id)
                              setShowNewHook(false)
                              setNewHookMatcher('')
                              setNewHookCommand('')
                              setNewHookUrl('')
                              setNewHookPrompt('')
                            } finally {
                              setHooksLoading(false)
                            }
                          }}
                          disabled={hooksLoading || (newHookType === 'command' && !newHookCommand) || (newHookType === 'http' && !newHookUrl) || (newHookType === 'prompt' && !newHookPrompt)}
                          className="flex-1 py-1.5 rounded-xl bg-[#7eb5a6] hover:bg-[#6aa596] text-white text-xs font-black disabled:opacity-50"
                        >
                          {hooksLoading ? '⏳' : t('common.add')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </details>

              {/* Faz 14 — Worktree İzolasyonu */}
              <details className={`rounded-2xl border ${isNight ? 'bg-[#1a2a4a] border-[#2a4a8a]' : 'bg-[#faf7f4] border-[#e8d5c4]'}`}>
                <summary className={`px-3 py-2.5 cursor-pointer text-xs font-bold ${subtext} select-none flex items-center gap-2`}>
                  <span>🌳 {t('project.worktreeIsolation')}</span>
                  <span className={`text-[9px] font-normal ${subtext} opacity-70`}>
                    ({activeProject.isolationMode === 'worktree' ? t('common.active') : t('common.inactive')})
                  </span>
                </summary>
                <div className={`px-3 pb-3 space-y-2 border-t ${border}`}>
                  {/* İzolasyon modu seçimi */}
                  <div className="flex items-center gap-2 pt-2">
                    <label className={`text-[10px] font-bold ${subtext}`}>{t('project.worktreeMode')}</label>
                    <select
                      value={activeProject.isolationMode ?? 'shared'}
                      onChange={async e => {
                        const mode = e.target.value as IsolationMode
                        await api.updateProject(activeProject.id, { isolationMode: mode } as any)
                        onUpdate()
                      }}
                      className={`px-2 py-1 rounded-lg border text-[10px] ${isNight ? 'bg-[#1a3a5a] border-[#2a5a8a] text-blue-200' : 'bg-white border-[#e8d5c4] text-[#3d2b1f]'}`}
                    >
                      {(Object.keys(ISOLATION_MODE_LABEL_KEYS) as string[]).map(k => (
                        <option key={k} value={k}>{t(ISOLATION_MODE_LABEL_KEYS[k])}</option>
                      ))}
                    </select>
                    {!isGitRepo && activeProject.workDir && (
                      <span className={`text-[9px] text-red-400`}>⚠ {t('project.notGitRepo')}</span>
                    )}
                  </div>

                  {activeProject.isolationMode === 'worktree' && (
                    <>
                      {/* Mevcut worktree listesi */}
                      {worktrees.filter(w => w.status !== 'deleted').length === 0 ? (
                        <p className={`text-xs text-center py-2 ${subtext}`}>
                          {t('project.noWorktrees')}
                        </p>
                      ) : (
                        <div className="space-y-1.5 pt-1">
                          {worktrees.filter(w => w.status !== 'deleted').map(wt => (
                            <div
                              key={wt.id}
                              className={`rounded-xl border p-2 ${
                                wt.status === 'active'
                                  ? isNight ? 'bg-[#1a3a5a] border-[#2a5a8a]' : 'bg-white border-[#e8d5c4]'
                                  : wt.status === 'conflict'
                                  ? isNight ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200'
                                  : isNight ? 'bg-[#1a2a3a] border-[#2a3a5a] opacity-60' : 'bg-gray-50 border-gray-200 opacity-60'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm">
                                  {wt.status === 'active' ? '🟢' : wt.status === 'merged' ? '✅' : wt.status === 'conflict' ? '⚠️' : '🗑️'}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[10px] font-bold ${text}`}>{wt.agentName}</span>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                                      isNight ? 'bg-[#2a4a7a] text-blue-200' : 'bg-[#e8d5c4] text-[#5a3a1f]'
                                    }`}>
                                      {t(WORKTREE_STATUS_LABEL_KEYS[wt.status as keyof typeof WORKTREE_STATUS_LABEL_KEYS] ?? wt.status)}
                                    </span>
                                  </div>
                                  <p className={`text-[9px] font-mono truncate ${subtext}`}>{wt.branch}</p>
                                  <div className={`flex gap-3 text-[9px] mt-0.5 ${subtext}`}>
                                    {wt.changedFiles > 0 && <span>📝 {t('project.worktreeFiles', { count: wt.changedFiles })}</span>}
                                    {wt.aheadBy > 0 && <span>⬆ {t('project.worktreeCommits', { count: wt.aheadBy })}</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {wt.status === 'active' && (
                                    <>
                                      <button
                                        onClick={async () => {
                                          setWorktreeLoading(true)
                                          try {
                                            await api.refreshWorktree(wt.id)
                                            await loadWorktrees(activeProject.id)
                                          } finally { setWorktreeLoading(false) }
                                        }}
                                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] transition-colors ${isNight ? 'hover:bg-[#2a4a7a] text-blue-300' : 'hover:bg-[#f0e0d0] text-[#7a5c3f]'}`}
                                        title={t('project.worktreeRefresh')}
                                      >
                                        🔄
                                      </button>
                                      <button
                                        onClick={async () => {
                                          setWorktreeLoading(true)
                                          try {
                                            const result = await api.mergeWorktree(wt.id)
                                            if (!result.success) {
                                              setRunResult(t('project.mergeFailed', { message: result.message }))
                                            }
                                            await loadWorktrees(activeProject.id)
                                          } finally { setWorktreeLoading(false) }
                                        }}
                                        className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] text-green-500 hover:bg-green-50 transition-colors"
                                        title={t('project.worktreeMerge')}
                                      >
                                        🔀
                                      </button>
                                    </>
                                  )}
                                  {(wt.status === 'active' || wt.status === 'conflict') && (
                                    <button
                                      onClick={async () => {
                                        setWorktreeLoading(true)
                                        try {
                                          await api.deleteWorktree(wt.id)
                                          await loadWorktrees(activeProject.id)
                                        } finally { setWorktreeLoading(false) }
                                      }}
                                      className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] text-red-300 hover:bg-red-50 transition-colors"
                                      title={t('common.delete')}
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Manuel worktree oluştur */}
                      {office.agents.length > 0 && (
                        <div className="flex gap-2 pt-1">
                          <select
                            id="wt-agent-select"
                            defaultValue=""
                            className={`flex-1 px-2 py-1.5 rounded-xl text-[10px] border ${isNight ? 'bg-[#1a3a5a] border-[#2a5a8a] text-blue-200' : 'bg-white border-[#e8d5c4] text-[#3d2b1f]'}`}
                          >
                            <option value="">{t('project.worktreeSelectAgent')}</option>
                            {office.agents.map(a => (
                              <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={async () => {
                              const select = document.getElementById('wt-agent-select') as HTMLSelectElement
                              if (!select?.value) return
                              setWorktreeLoading(true)
                              try {
                                await api.createWorktree(activeProject.id, select.value)
                                await loadWorktrees(activeProject.id)
                                select.value = ''
                              } catch (e: any) {
                                setRunResult(t('project.worktreeError', { message: e.message }))
                              } finally { setWorktreeLoading(false) }
                            }}
                            disabled={worktreeLoading}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                              isNight ? 'bg-[#2a4a7a] hover:bg-[#3a5a9a] text-blue-200' : 'bg-[#7eb5a6]/10 hover:bg-[#7eb5a6]/20 text-[#4a9a86]'
                            } disabled:opacity-50`}
                          >
                            {worktreeLoading ? '⏳' : t('project.worktreeCreate')}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </details>

              {/* Faz 15 — Agent Teams */}
              {activeProject.workflowMode === 'team' && (
              <details className={`rounded-2xl border ${isNight ? 'bg-[#1a2a4a] border-[#2a4a8a]' : 'bg-[#faf7f4] border-[#e8d5c4]'}`}>
                <summary className={`px-3 py-2.5 cursor-pointer text-xs font-bold ${subtext} select-none flex items-center gap-2`}>
                  <span>👥 {t('project.teamMode')}</span>
                  <span className={`text-[9px] font-normal ${subtext} opacity-70`}>
                    ({t('project.teamCount', { count: teams.length })})
                  </span>
                </summary>
                <div className={`px-3 pb-3 space-y-2 border-t ${border}`}>
                  {/* Mevcut takımlar */}
                  {teams.map(team => (
                    <div
                      key={team.id}
                      className={`rounded-xl border p-2.5 mt-2 ${
                        team.status === 'running'
                          ? isNight ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'
                          : team.status === 'error'
                          ? isNight ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'
                          : isNight ? 'bg-[#1a3a5a] border-[#2a5a8a]' : 'bg-white border-[#e8d5c4]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {team.status === 'running' ? '🟢' : team.status === 'completed' ? '✅' : team.status === 'error' ? '❌' : '⏸️'}
                          </span>
                          <div>
                            <span className={`text-[11px] font-bold ${text}`}>{team.name}</span>
                            <span className={`text-[9px] ml-2 px-1.5 py-0.5 rounded ${
                              isNight ? 'bg-[#2a4a7a] text-blue-200' : 'bg-[#e8d5c4] text-[#5a3a1f]'
                            }`}>
                              {t(TEAM_STATUS_LABEL_KEYS[team.status as keyof typeof TEAM_STATUS_LABEL_KEYS] ?? team.status)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {team.status === 'idle' && (
                            <button
                              onClick={async () => {
                                setTeamsLoading(true)
                                try {
                                  await api.startTeam(team.id)
                                  await loadTeams(activeProject.id)
                                } catch (e: any) { setRunResult(e.message) }
                                finally { setTeamsLoading(false) }
                              }}
                              disabled={teamsLoading}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold text-green-600 hover:bg-green-50 transition-colors"
                              title={t('common.start')}
                            >
                              ▶️
                            </button>
                          )}
                          {team.status === 'running' && (
                            <button
                              onClick={async () => {
                                setTeamsLoading(true)
                                try {
                                  await api.stopTeam(team.id)
                                  await loadTeams(activeProject.id)
                                } finally { setTeamsLoading(false) }
                              }}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold text-red-400 hover:bg-red-50 transition-colors"
                              title={t('common.stop')}
                            >
                              ⏹️
                            </button>
                          )}
                          {team.status !== 'running' && (
                            <button
                              onClick={async () => {
                                setTeamsLoading(true)
                                try {
                                  await api.deleteTeam(team.id)
                                  await loadTeams(activeProject.id)
                                } finally { setTeamsLoading(false) }
                              }}
                              className="px-2 py-1 rounded-lg text-[10px] text-red-300 hover:bg-red-50 transition-colors"
                              title={t('common.delete')}
                            >
                              🗑
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Lead agent */}
                      <div className={`text-[9px] mb-1.5 ${subtext}`}>
                        👑 {t('project.teamLeader', { name: team.leadAgentName })}
                      </div>

                      {/* Teammates */}
                      {team.teammates.length > 0 && (
                        <div className="space-y-1">
                          {team.teammates.map(tm => (
                            <div key={tm.id} className={`flex items-center justify-between px-2 py-1 rounded-lg ${isNight ? 'bg-[#1a2a4a]' : 'bg-[#f5f0eb]'}`}>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px]">
                                  {tm.status === 'working' ? '⚡' : tm.status === 'done' ? '✅' : tm.status === 'error' ? '❌' : '💤'}
                                </span>
                                <span className={`text-[10px] font-medium ${text}`}>{tm.agentName}</span>
                                <span className={`text-[8px] ${subtext}`}>({tm.role})</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className={`text-[8px] px-1 py-0.5 rounded ${
                                  isNight ? 'bg-[#2a3a5a] text-blue-300' : 'bg-[#e8d5c4] text-[#5a3a1f]'
                                }`}>
                                  {t(TEAMMATE_STATUS_LABEL_KEYS[tm.status as keyof typeof TEAMMATE_STATUS_LABEL_KEYS] ?? tm.status)}
                                </span>
                                {team.status !== 'running' && (
                                  <button
                                    onClick={async () => {
                                      await api.removeTeammate(team.id, tm.agentId)
                                      await loadTeams(activeProject.id)
                                    }}
                                    className="text-[10px] text-red-300 hover:text-red-500"
                                    title={t('project.teamRemoveMember')}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Üye ekle */}
                      {team.status !== 'running' && (
                        <div className="flex gap-1.5 mt-2">
                          <select
                            id={`team-add-${team.id}`}
                            defaultValue=""
                            className={`flex-1 px-2 py-1 rounded-lg text-[10px] border ${isNight ? 'bg-[#1a3a5a] border-[#2a5a8a] text-blue-200' : 'bg-white border-[#e8d5c4] text-[#3d2b1f]'}`}
                          >
                            <option value="">{t('project.teamAddMember')}</option>
                            {office.agents
                              .filter(a => a.id !== team.leadAgentId && !team.teammates.some(t => t.agentId === a.id))
                              .map(a => (
                                <option key={a.id} value={a.id}>{a.name} — {a.role}</option>
                              ))}
                          </select>
                          <button
                            onClick={async () => {
                              const select = document.getElementById(`team-add-${team.id}`) as HTMLSelectElement
                              if (!select?.value) return
                              try {
                                await api.addTeammate(team.id, select.value)
                                await loadTeams(activeProject.id)
                                select.value = ''
                              } catch (e: any) { setRunResult(e.message) }
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold ${isNight ? 'bg-[#2a4a7a] hover:bg-[#3a5a9a] text-blue-200' : 'bg-[#7eb5a6]/10 hover:bg-[#7eb5a6]/20 text-[#4a9a86]'}`}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Yeni takım oluştur */}
                  {!showTeamCreator ? (
                    <button
                      onClick={() => setShowTeamCreator(true)}
                      className={`w-full mt-2 py-2 rounded-xl text-[11px] font-bold transition-all ${
                        isNight ? 'bg-[#2a4a7a]/50 hover:bg-[#2a4a7a] text-blue-200' : 'bg-[#7eb5a6]/10 hover:bg-[#7eb5a6]/20 text-[#4a9a86]'
                      }`}
                    >
                      {t('project.newTeam')}
                    </button>
                  ) : (
                    <div className={`mt-2 p-2.5 rounded-xl border space-y-2 ${isNight ? 'bg-[#1a3a5a] border-[#2a5a8a]' : 'bg-white border-[#e8d5c4]'}`}>
                      <input
                        type="text"
                        value={newTeamName}
                        onChange={e => setNewTeamName(e.target.value)}
                        placeholder={t('project.teamNamePlaceholder')}
                        className={`w-full px-2 py-1.5 rounded-lg border text-[11px] ${isNight ? 'bg-[#1a2a4a] border-[#2a4a8a] text-blue-200' : 'bg-[#faf7f4] border-[#e8d5c4] text-[#3d2b1f]'}`}
                      />
                      <div>
                        <label className={`text-[9px] font-bold ${subtext}`}>{t('project.teamLeadLabel')}</label>
                        <select
                          value={newTeamLeadId}
                          onChange={e => setNewTeamLeadId(e.target.value)}
                          className={`w-full px-2 py-1.5 rounded-lg border text-[10px] ${isNight ? 'bg-[#1a2a4a] border-[#2a4a8a] text-blue-200' : 'bg-[#faf7f4] border-[#e8d5c4] text-[#3d2b1f]'}`}
                        >
                          <option value="">{t('project.teamLeadSelect')}</option>
                          {office.agents.map(a => (
                            <option key={a.id} value={a.id}>{a.name} — {a.role}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={`text-[9px] font-bold ${subtext}`}>{t('project.teamMaxMembers')}</label>
                        <input
                          type="number"
                          min={1}
                          max={16}
                          value={newTeamMax}
                          onChange={e => setNewTeamMax(Number(e.target.value))}
                          className={`w-full px-2 py-1.5 rounded-lg border text-[10px] ${isNight ? 'bg-[#1a2a4a] border-[#2a4a8a] text-blue-200' : 'bg-[#faf7f4] border-[#e8d5c4] text-[#3d2b1f]'}`}
                        />
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={async () => {
                            if (!newTeamName || !newTeamLeadId) return
                            setTeamsLoading(true)
                            try {
                              await api.createTeam(activeProject.id, newTeamName, newTeamLeadId, newTeamMax)
                              await loadTeams(activeProject.id)
                              setShowTeamCreator(false)
                              setNewTeamName('')
                              setNewTeamLeadId('')
                              setNewTeamMax(5)
                            } catch (e: any) { setRunResult(e.message) }
                            finally { setTeamsLoading(false) }
                          }}
                          disabled={!newTeamName || !newTeamLeadId || teamsLoading}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            isNight ? 'bg-green-800/50 hover:bg-green-800 text-green-200' : 'bg-green-100 hover:bg-green-200 text-green-700'
                          } disabled:opacity-50`}
                        >
                          {teamsLoading ? '...' : t('common.create')}
                        </button>
                        <button
                          onClick={() => setShowTeamCreator(false)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] ${isNight ? 'text-blue-300 hover:bg-[#2a4a7a]' : 'text-[#7a5c3f] hover:bg-[#f0e0d0]'}`}
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </details>
              )}

              {/* Görevler */}
              <div>
                <h5 className={`text-xs font-bold uppercase tracking-wider mb-2 ${subtext}`}>{t('project.tasks')}</h5>
                <div className="space-y-2">
                  {activeProject.tasks.length === 0 ? (
                    <p className={`text-xs text-center py-4 ${subtext}`}>{t('project.noTasks')}</p>
                  ) : (
                    activeProject.tasks.map((task, taskIndex) => {
                      const assignee = office.agents.find(a => a.id === task.assignedAgentId)
                      const blockedBy = task.dependsOnTaskId
                        ? activeProject.tasks.find(t => t.id === task.dependsOnTaskId)
                        : null
                      const isBlocked = blockedBy && blockedBy.status !== 'done'
                      const isEditing = editingTaskId === task.id
                      return (
                        <div
                          key={task.id}
                          className={`flex items-start gap-2 p-3 rounded-2xl border transition-all group ${
                            isBlocked
                              ? isNight ? 'bg-[#2a1a1a] border-[#5a2a2a] opacity-70' : 'bg-[#fff8f0] border-orange-200'
                              : task.status === 'done'
                              ? isNight ? 'bg-[#1a3a2a] border-[#2a6a4a] opacity-60' : 'bg-[#f0fff4] border-green-100 opacity-70'
                              : isNight ? 'bg-[#1a2a4a] border-[#2a4a8a]' : 'bg-white border-[#e8d5c4]'
                          }`}
                        >
                          {/* Sıralama butonları */}
                          <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleMoveTask(task.id, 'up')}
                              disabled={taskIndex === 0}
                              title={t('project.moveUp')}
                              className={`w-5 h-5 rounded flex items-center justify-center text-[10px] transition-colors disabled:opacity-20 ${isNight ? 'text-blue-300 hover:bg-[#2a4a8a]' : 'text-[#a08060] hover:bg-[#f0e0d0]'}`}
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => handleMoveTask(task.id, 'down')}
                              disabled={taskIndex === activeProject.tasks.length - 1}
                              title={t('project.moveDown')}
                              className={`w-5 h-5 rounded flex items-center justify-center text-[10px] transition-colors disabled:opacity-20 ${isNight ? 'text-blue-300 hover:bg-[#2a4a8a]' : 'text-[#a08060] hover:bg-[#f0e0d0]'}`}
                            >
                              ↓
                            </button>
                          </div>

                          {/* Durum checkbox */}
                          <button
                            onClick={() => handleTaskStatus(task, task.status === 'done' ? 'todo' : task.status === 'todo' ? 'in_progress' : 'done')}
                            className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                              task.status === 'done' ? 'bg-[#7eb5a6] border-[#7eb5a6] text-white' :
                              task.status === 'in_progress' ? 'bg-blue-100 border-blue-400' :
                              isNight ? 'border-[#3a5a8a]' : 'border-[#c8a882]'
                            }`}
                          >
                            {task.status === 'done' && <span className="text-[10px]">✓</span>}
                            {task.status === 'in_progress' && <span className="text-[8px] text-blue-500">⚡</span>}
                          </button>

                          <div className="flex-1 min-w-0">
                            {/* Açıklama — inline düzenleme */}
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingTaskDesc}
                                onChange={e => setEditingTaskDesc(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleEditTask(task.id, editingTaskDesc)
                                  if (e.key === 'Escape') { setEditingTaskId(null); setEditingTaskDesc('') }
                                }}
                                onBlur={() => handleEditTask(task.id, editingTaskDesc)}
                                autoFocus
                                className={`w-full text-xs font-semibold px-2 py-1 rounded-lg border outline-none ${isNight ? 'bg-[#1a3a5a] border-[#4a8aff] text-blue-100' : 'bg-white border-[#7eb5a6] text-[#3d2b1f]'}`}
                              />
                            ) : (
                              <p
                                className={`text-xs font-semibold leading-relaxed cursor-pointer hover:opacity-80 ${task.status === 'done' ? 'line-through opacity-60' : ''} ${text}`}
                                onClick={() => { setEditingTaskId(task.id); setEditingTaskDesc(task.description) }}
                                title={t('project.editTask')}
                              >
                                {task.description}
                              </p>
                            )}
                            {isBlocked && (
                              <p className="text-[10px] mt-0.5 text-orange-500 font-bold">
                                ⛓ {t('project.blocked', { desc: blockedBy?.description.slice(0, 35) })}
                              </p>
                            )}
                            {assignee && !isBlocked && (
                              <p className={`text-[10px] mt-0.5 ${subtext}`}>
                                → {assignee.name} ({assignee.role})
                              </p>
                            )}
                            {/* Bağımlılık düzenleme — hover'da görünür */}
                            <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <select
                                value={task.dependsOnTaskId ?? ''}
                                onChange={e => handleUpdateDependency(task.id, e.target.value || undefined)}
                                className={`text-[9px] rounded-lg px-1.5 py-0.5 border cursor-pointer ${isNight ? 'bg-[#1a3a5a] border-[#2a5a8a] text-blue-300' : 'bg-[#faf7f4] border-[#e8d5c4] text-[#a08060]'}`}
                              >
                                <option value="">⛓ {t('project.noDependency')}</option>
                                {activeProject.tasks.filter(t => t.id !== task.id).map(t => (
                                  <option key={t.id} value={t.id}>
                                    ⛓ {t.description.slice(0, 40)}{t.description.length > 40 ? '...' : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Sağ taraf: ajan seç + başlat + sil */}
                          <div className="flex items-center gap-1 shrink-0">
                            <select
                              value={task.assignedAgentId ?? ''}
                              onChange={async e => {
                                await api.updateTask(task.id, { assignedAgentId: e.target.value || undefined } as any)
                                onUpdate()
                              }}
                              className={`text-[10px] rounded-lg px-1.5 py-1 border cursor-pointer ${isNight ? 'bg-[#1a3a5a] border-[#2a5a8a] text-blue-200' : 'bg-[#faf7f4] border-[#e8d5c4] text-[#7a5c3f]'}`}
                            >
                              <option value="">{t('project.noAgent')}</option>
                              {office.agents.map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                              ))}
                            </select>

                            {/* Görevi başlat */}
                            {task.assignedAgentId && task.status !== 'done' && activeProject?.workDir && (
                              <button
                                onClick={() => handleRunTask(task)}
                                disabled={runningTaskId === task.id || !!isBlocked}
                                title={isBlocked ? t('project.blockPrereq', { desc: blockedBy?.description.slice(0, 30) }) : t('project.startTask')}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors ${
                                  runningTaskId === task.id
                                    ? 'bg-[#7eb5a6]/40 text-white cursor-wait'
                                    : isNight
                                    ? 'bg-[#4a8aff]/20 text-blue-300 hover:bg-[#4a8aff]/40'
                                    : 'bg-[#7eb5a6]/20 text-[#4a9a86] hover:bg-[#7eb5a6]/40'
                                }`}
                              >
                                {runningTaskId === task.id ? '⏳' : '▶'}
                              </button>
                            )}

                            {/* Görevi sil */}
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              title={t('project.deleteTask')}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] text-red-300 hover:bg-red-50 transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Yeni görev ekle */}
              <div className={`p-3 rounded-2xl border ${isNight ? 'bg-[#1a2a4a] border-[#2a4a8a]' : 'bg-[#faf7f4] border-[#e8d5c4]'}`}>
                <p className={`text-xs font-bold mb-2 ${subtext}`}>{t('project.newTask')}</p>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newTaskDesc}
                    onChange={e => setNewTaskDesc(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateTask()}
                    placeholder={t('project.taskDescPlaceholder')}
                    className={inputCls}
                  />
                  <div className="flex gap-2">
                    <select
                      value={newTaskAgent}
                      onChange={e => setNewTaskAgent(e.target.value)}
                      className={`flex-1 px-3 py-2 rounded-xl border-2 outline-none text-xs ${isNight ? 'bg-[#1a2a4a] border-[#2a4a8a] text-blue-200' : 'bg-[#faf7f4] border-[#e8d5c4] text-[#7a5c3f]'}`}
                    >
                      <option value="">{t('project.selectAgent')}</option>
                      {office.agents.map(a => (
                        <option key={a.id} value={a.id}>{a.name} — {a.role}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleCreateTask}
                      disabled={loading || !newTaskDesc.trim()}
                      className="px-4 py-2 rounded-xl bg-[#7eb5a6] text-white text-xs font-black disabled:opacity-50 shrink-0"
                    >
                      {t('common.add')}
                    </button>
                  </div>

                  {/* Bağımlılık seçici */}
                  {activeProject.tasks.length > 0 && (
                    <select
                      value={newTaskDependsOn}
                      onChange={e => setNewTaskDependsOn(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border-2 outline-none text-xs ${isNight ? 'bg-[#1a2a4a] border-[#2a4a8a] text-blue-200' : 'bg-[#faf7f4] border-[#e8d5c4] text-[#7a5c3f]'}`}
                    >
                      <option value="">⛓ {t('project.dependsOn')}</option>
                      {activeProject.tasks.filter(t => t.status !== 'done').map(t => (
                        <option key={t.id} value={t.id}>
                          {t.description.slice(0, 50)}{t.description.length > 50 ? '...' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
