import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import type { Agent } from '@smith/types'
import { useStore } from '../../store/useStore'
import { api } from '../../hooks/useApi'

interface QuickTaskPanelProps {
  isNight?: boolean
  onClose: () => void
  preSelectedAgentId?: string
}

interface QuickTaskLog {
  id: string
  agentId: string
  agentName: string
  animal: string
  totalTokens: number
  costUsd: number
  durationSec: number
  startedAt: string
  endedAt?: string
}

export function QuickTaskPanel({ isNight = false, onClose, preSelectedAgentId }: QuickTaskPanelProps) {
  const { t } = useTranslation()
  const { offices, activeOfficeId } = useStore()
  const office = offices.find(o => o.id === activeOfficeId)
  const agents = office?.agents ?? []

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(preSelectedAgentId ?? null)
  const [workDir, setWorkDir] = useState(office?.workDir || '')
  const [task, setTask] = useState('')
  const [starting, setStarting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [resultType, setResultType] = useState<'success' | 'error'>('success')
  const [recentTasks, setRecentTasks] = useState<QuickTaskLog[]>([])
  const [savingWorkDir, setSavingWorkDir] = useState(false)

  const selectedAgent = agents.find(a => a.id === selectedAgentId)

  const loadRecentTasks = async () => {
    if (!activeOfficeId) return
    try {
      const data = await api.getQuickTasks(activeOfficeId)
      setRecentTasks(data)
    } catch {}
  }

  useEffect(() => {
    loadRecentTasks()
  }, [activeOfficeId])

  // Ofis work_dir değişince input'u güncelle
  useEffect(() => {
    if (office?.workDir && !workDir) {
      setWorkDir(office.workDir)
    }
  }, [office?.workDir])

  // Ajan seçildiğinde ajanın workDir'ini doldur
  useEffect(() => {
    if (selectedAgentId) {
      const agent = agents.find(a => a.id === selectedAgentId)
      if (agent?.workDir) {
        setWorkDir(agent.workDir)
      } else if (office?.workDir) {
        setWorkDir(office.workDir)
      }
    } else {
      // "Tüm Ajanlar" seçildiğinde ofis dizinine dön
      setWorkDir(office?.workDir || '')
    }
  }, [selectedAgentId])

  const handleSaveWorkDir = async () => {
    if (!activeOfficeId) return
    setSavingWorkDir(true)
    try {
      await api.updateOffice(activeOfficeId, { workDir: workDir.trim() } as any)
      // Ofisleri yeniden çek
      const updatedOffices = await api.getOffices()
      useStore.getState().setOffices(updatedOffices)
    } catch {} finally {
      setSavingWorkDir(false)
    }
  }

  const handleStart = async () => {
    if (!task.trim()) {
      setResult(t('quickTask.noTask'))
      setResultType('error')
      return
    }
    if (agents.length === 0) {
      setResult(t('quickTask.noAgents'))
      setResultType('error')
      return
    }

    setStarting(true)
    setResult(null)
    try {
      const effectiveWorkDir = workDir.trim() || '.'
      const trimmedTask = task.trim()

      if (selectedAgentId) {
        // Tek ajan seçili — sadece o çalışsın
        await api.startSession(selectedAgentId, effectiveWorkDir, trimmedTask)
        setResult(t('quickTask.started'))
      } else {
        // Ajan seçilmedi — tüm idle ajanlar çalışsın
        const idleAgents = agents.filter(a => a.status === 'idle')
        if (idleAgents.length === 0) {
          setResult(t('quickTask.noIdleAgents'))
          setResultType('error')
          setStarting(false)
          return
        }

        // PM var mı kontrol et — varsa koordinasyonlu mod
        const hasPm = agents.some(a => a.isPm && a.status === 'idle')
        if (hasPm && activeOfficeId) {
          setResult(t('quickTask.pmCoordinating'))
          const resp = await api.startCoordinatedQuickTask(activeOfficeId, effectiveWorkDir, trimmedTask)
          if (resp.mode === 'coordinated') {
            setResult(t('quickTask.pmDone', { count: resp.subtasks || 0 }))
          } else {
            setResult(t('quickTask.startedAll', { succeeded: resp.count || 0, failed: 0, total: idleAgents.length }))
          }
        } else {
          const results = await Promise.allSettled(
            idleAgents.map(a => api.startSession(a.id, a.workDir || effectiveWorkDir, trimmedTask))
          )
          const succeeded = results.filter(r => r.status === 'fulfilled').length
          const failed = results.filter(r => r.status === 'rejected').length
          setResult(t('quickTask.startedAll', { succeeded, failed, total: idleAgents.length }))
        }
      }

      setResultType('success')
      setTask('')
      setTimeout(loadRecentTasks, 2000)
    } catch (e: any) {
      setResult(e.message || 'Error')
      setResultType('error')
    } finally {
      setStarting(false)
    }
  }

  const bg = isNight ? 'bg-[#1a1b22]' : 'bg-white'
  const border = isNight ? 'border-[#2a2b35]' : 'border-slate-200'
  const textPrimary = isNight ? 'text-slate-200' : 'text-slate-800'
  const textSecondary = isNight ? 'text-slate-400' : 'text-slate-500'
  const inputBg = isNight ? 'bg-[#14151a] border-[#2a2b35] text-slate-200' : 'bg-white border-slate-200 text-slate-800'
  const hoverBg = isNight ? 'hover:bg-[#2a2b35]' : 'hover:bg-slate-50'
  const selectedStyle = isNight ? 'bg-[#7eb5a6]/20 border-[#7eb5a6]/40' : 'bg-[#7eb5a6]/10 border-[#7eb5a6]/40'

  const workDirChanged = workDir.trim() !== (office?.workDir || '').trim()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className={`w-[800px] max-h-[80vh] rounded-2xl shadow-2xl border overflow-hidden flex flex-col ${bg} ${border}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-3 border-b ${border}`}>
          <h2 className={`text-sm font-bold ${textPrimary}`}>
            ⚡ {t('quickTask.title')}
          </h2>
          <button
            onClick={onClose}
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${textSecondary} ${hoverBg} transition-colors`}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Agent list */}
          <div className={`w-[240px] border-r ${border} overflow-y-auto p-3 flex-shrink-0`}>
            <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
              {t('quickTask.selectAgent')}
            </div>
            {agents.length === 0 ? (
              <div className={`text-xs ${textSecondary} text-center py-4`}>
                {t('quickTask.noAgents')}
              </div>
            ) : (
              <div className="space-y-1">
                {/* Tüm Ajanlar seçeneği */}
                <button
                  onClick={() => setSelectedAgentId(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all border ${
                    selectedAgentId === null
                      ? selectedStyle
                      : `border-transparent ${hoverBg}`
                  }`}
                >
                  <div className={`font-bold ${textPrimary}`}>
                    {t('quickTask.allAgents')}
                  </div>
                  <div className={`text-[10px] ${textSecondary}`}>
                    {t('quickTask.allAgentsDesc')}
                  </div>
                  <div className="text-[10px] mt-0.5 text-emerald-500">
                    {agents.filter(a => a.status === 'idle').length}/{agents.length} idle
                  </div>
                  {agents.some(a => a.isPm && a.status === 'idle') && (
                    <div className="text-[10px] mt-0.5 text-blue-500 font-medium">
                      🎯 {t('quickTask.pmWillCoordinate')}
                    </div>
                  )}
                </button>

                <div className={`border-b my-1 ${border}`} />

                {agents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgentId(agent.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all border ${
                      selectedAgentId === agent.id
                        ? selectedStyle
                        : `border-transparent ${hoverBg}`
                    }`}
                  >
                    <div className={`font-bold ${textPrimary} flex items-center gap-1`}>
                      {agent.name}
                      {agent.isPm && <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500/20 text-blue-500 font-bold">PM</span>}
                    </div>
                    <div className={`text-[10px] ${textSecondary}`}>
                      {agent.role}
                    </div>
                    {agent.workDir && (
                      <div className={`text-[10px] ${textSecondary} truncate`} title={agent.workDir}>
                        📂 {agent.workDir.split(/[/\\]/).slice(-2).join('/')}
                      </div>
                    )}
                    <div className={`text-[10px] mt-0.5 ${
                      agent.status === 'idle'
                        ? 'text-emerald-500'
                        : agent.status === 'thinking'
                          ? 'text-amber-500'
                          : 'text-blue-500'
                    }`}>
                      {agent.status}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Task form + Recent */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {/* Selected agent info */}
            {selectedAgent ? (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isNight ? 'bg-[#14151a]' : 'bg-slate-50'}`}>
                <div className={`text-sm font-bold ${textPrimary}`}>
                  {selectedAgent.name}
                </div>
                <div className={`text-xs ${textSecondary}`}>
                  — {selectedAgent.role}
                </div>
              </div>
            ) : agents.length > 0 && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isNight ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
                <div className={`text-sm font-bold ${isNight ? 'text-amber-400' : 'text-amber-700'}`}>
                  {t('quickTask.allAgents')}
                </div>
                <div className={`text-xs ${isNight ? 'text-amber-400/60' : 'text-amber-600/70'}`}>
                  — {t('quickTask.allAgentsHint', { count: agents.filter(a => a.status === 'idle').length })}
                </div>
              </div>
            )}

            {/* Work directory — ofis seviyesinde kaydedilebilir */}
            <div>
              <label className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>
                {t('quickTask.workDir')}
              </label>
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={workDir}
                  onChange={(e) => setWorkDir(e.target.value)}
                  placeholder={t('quickTask.workDirPlaceholder')}
                  className={`flex-1 px-3 py-2 rounded-lg border text-xs ${inputBg} placeholder:text-slate-400/50`}
                />
                {workDirChanged && (
                  <button
                    onClick={handleSaveWorkDir}
                    disabled={savingWorkDir}
                    className={`px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${
                      isNight
                        ? 'bg-[#7eb5a6]/20 text-[#7eb5a6] hover:bg-[#7eb5a6]/30'
                        : 'bg-[#7eb5a6]/10 text-[#5c9a8b] hover:bg-[#7eb5a6]/20'
                    }`}
                    title={t('quickTask.saveWorkDir')}
                  >
                    {savingWorkDir ? '...' : t('quickTask.saveWorkDir')}
                  </button>
                )}
              </div>
              {office?.workDir && !workDirChanged && (
                <div className={`text-[10px] mt-1 ${textSecondary}`}>
                  {t('quickTask.savedWorkDir')}
                </div>
              )}
            </div>

            {/* Task */}
            <div>
              <label className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>
                {t('quickTask.task')}
              </label>
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder={t('quickTask.taskPlaceholder')}
                rows={6}
                className={`w-full mt-1 px-3 py-2 rounded-lg border text-xs resize-y ${inputBg} placeholder:text-slate-400/50`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleStart()
                  }
                }}
              />
            </div>

            {/* Start button + result */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleStart}
                disabled={starting || !task.trim() || agents.length === 0}
                className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-[#7eb5a6] hover:bg-[#5c9a8b] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {starting ? t('quickTask.starting') : t('quickTask.start')}
              </button>
              {result && (
                <div className={`text-xs font-medium ${resultType === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>
                  {result}
                </div>
              )}
            </div>

            {/* Recent quick tasks */}
            {recentTasks.length > 0 && (
              <div className="mt-2">
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
                  {t('quickTask.recentTasks')}
                </div>
                <div className="space-y-1">
                  {recentTasks.slice(0, 8).map(log => (
                    <div
                      key={log.id}
                      className={`px-3 py-2 rounded-lg border text-xs ${border} ${isNight ? 'bg-[#14151a]' : 'bg-slate-50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${textPrimary}`}>
                          {log.agentName}
                        </span>
                        <span className={`text-[10px] ${textSecondary}`}>
                          {new Date(log.startedAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className={`text-[10px] mt-0.5 ${textSecondary}`}>
                        {log.totalTokens > 0 ? `${log.totalTokens.toLocaleString()} token` : ''}
                        {log.durationSec > 0 ? ` · ${log.durationSec}s` : ''}
                        {log.costUsd > 0 ? ` · $${log.costUsd.toFixed(4)}` : ''}
                        {log.endedAt ? '' : ' · ...'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
