import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { Office } from '@smith/types'
import { useStore } from '../../store/useStore'
import { api } from '../../hooks/useApi'
import { TemplateModal } from './TemplateModal'
import { TrainingPanel } from '../Training/TrainingPanel'
import logoLight from '../../assets/logo-light-small.png'
import logoDark from '../../assets/logo-dark-small.png'

interface OfficeSidebarProps {
  onSelectOffice: (id: string) => void
  onOfficesChange: () => void
  isNight?: boolean
  appTheme?: 'light' | 'dark'
  onThemeChange?: (theme: 'light' | 'dark') => void
}

export function OfficeSidebar({ onSelectOffice, onOfficesChange, isNight = false, appTheme = 'light', onThemeChange }: OfficeSidebarProps) {
  const { t, i18n } = useTranslation()
  const { offices, activeOfficeId } = useStore()
  const [showCreate, setShowCreate] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [templateOfficeId, setTemplateOfficeId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const [seedLoading, setSeedLoading] = useState(false)
  const [seedLightLoading, setSeedLightLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [showTraining, setShowTraining] = useState(false)

  const handleCreate = async () => {
    if (!newName.trim()) return
    setLoading(true)
    try {
      const office = await api.createOffice({ name: newName, description: newDesc })
      onOfficesChange()
      onSelectOffice(office.id)
      setShowCreate(false)
      setNewName('')
      setNewDesc('')
    } finally {
      setLoading(false)
    }
  }

  const handleSeedDemo = async () => {
    setSeedLoading(true)
    try {
      const office = await api.seedDemo()
      onOfficesChange()
      onSelectOffice(office.id)
    } finally {
      setSeedLoading(false)
    }
  }

  const handleSeedDemoLight = async () => {
    setSeedLightLoading(true)
    try {
      const office = await api.seedDemoLight()
      onOfficesChange()
      onSelectOffice(office.id)
    } finally {
      setSeedLightLoading(false)
    }
  }

  const handleResetDb = async () => {
    if (!confirm(t('confirm.resetDb'))) return
    setResetLoading(true)
    try {
      await api.resetDb()
      onOfficesChange()
    } finally {
      setResetLoading(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation()
    if (!confirm(t('confirm.deleteOffice', { name }))) return
    await api.deleteOffice(id)
    onOfficesChange()
  }

  return (
    <div className={`w-64 flex flex-col transition-colors duration-300 ${isNight ? 'bg-[#1a1b22] border-r border-[#2a2b35]' : 'bg-[#faf9f5] border-r border-[#e8e6df]'}`} style={!isNight ? { boxShadow: '1px 0 0 rgba(0,0,0,0.03)' } : undefined}>
      {/* Logo */}
      <div className={`px-3 py-3 border-b ${isNight ? 'border-[#2a2b35]' : 'border-[#e8e6df]'}`} style={{ backgroundColor: isNight ? '#14151a' : '#f7f6f1' }}>
        <img src={isNight ? logoDark : logoLight} alt="Ajan Simit" className="w-full object-contain" style={{ maxHeight: 400 }} />
      </div>

      {/* Ofis listesi */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <p className={`text-[10px] font-bold uppercase tracking-widest px-2 mb-3 ${isNight ? 'text-slate-400/60' : 'text-slate-400'}`}>{t('sidebar.offices')}</p>

        <AnimatePresence>
          {offices.map((office) => (
            <motion.button
              key={office.id}
              className={`w-full text-left px-3 py-3 rounded-xl border transition-all group relative overflow-hidden ${
                activeOfficeId === office.id
                  ? isNight ? 'border-[#7eb5a6]/40 bg-[#7eb5a6]/10 shadow-sm' : 'border-slate-200 bg-slate-50 shadow-sm'
                  : isNight ? 'border-transparent hover:border-[#2a2b35] hover:bg-[#2a2b35]/50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50/80'
              }`}
              onClick={() => onSelectOffice(office.id)}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Active indicator — left accent bar */}
              {activeOfficeId === office.id && (
                <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-[#7eb5a6]" />
              )}
              <div className="flex items-start gap-2">
                <span className="text-lg mt-0.5">
                  {office.theme === 'dark' ? '🌙' : '☀️'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm truncate ${isNight ? 'text-slate-200' : 'text-slate-800'}`}>{office.name}</p>
                  {office.description && (
                    <p className={`text-[10px] truncate ${isNight ? 'text-slate-400/70' : 'text-slate-400'}`}>{office.description}</p>
                  )}
                      {/* İstatistikler */}
                  {(() => {
                    const activeAgents = office.agents.filter(a => a.status !== 'idle')
                    const runningSessions = office.agents.filter(a => a.sessionPid)
                    const allTasks = office.projects.flatMap(p => p.tasks)
                    const doneTasks = allTasks.filter(t => t.status === 'done')
                    return (
                      <>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] text-[#7eb5a6] font-semibold flex items-center gap-1">
                            {activeAgents.length > 0 && (
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            )}
                            {t('sidebar.agentCount', { count: office.agents.length })}
                            {activeAgents.length > 0 && <span className="text-emerald-500">({t('sidebar.activeCount', { count: activeAgents.length })})</span>}
                          </span>
                          <span className={`text-[10px] font-semibold ${isNight ? 'text-slate-400/60' : 'text-slate-400'}`}>
                            {t('sidebar.projectCount', { count: office.projects.length })}
                          </span>
                        </div>
                        {runningSessions.length > 0 && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                            <span className="text-[10px] text-blue-500 font-bold">{t('sidebar.runningSessionsCount', { count: runningSessions.length })}</span>
                          </div>
                        )}
                        {allTasks.length > 0 && (
                          <div className="mt-1.5">
                            <div className="flex justify-between mb-0.5">
                              <span className={`text-[9px] ${isNight ? 'text-slate-400/60' : 'text-slate-400'}`}>{t('sidebar.tasks')}</span>
                              <span className={`text-[9px] font-bold ${isNight ? 'text-slate-300' : 'text-slate-500'}`}>{doneTasks.length}/{allTasks.length}</span>
                            </div>
                            <div className={`h-1 rounded-full overflow-hidden ${isNight ? 'bg-[#2a2b35]' : 'bg-slate-100'}`}>
                              <div
                                className="h-full bg-[#7eb5a6] rounded-full transition-all duration-500"
                                style={{ width: `${allTasks.length > 0 ? Math.round((doneTasks.length / allTasks.length) * 100) : 0}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* Şablon + Silme butonları */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  className="text-[#7eb5a6] hover:text-[#5c9a8b] text-xs font-bold px-1"
                  title={t('sidebar.templateButton')}
                  onClick={(e) => {
                    e.stopPropagation()
                    setTemplateOfficeId(office.id)
                    setShowTemplates(true)
                  }}
                >
                  📦
                </button>
                <button
                  className="text-red-400 hover:text-red-600 transition-all text-sm"
                  onClick={(e) => handleDelete(e, office.id, office.name)}
                >
                  ×
                </button>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>

        {offices.length === 0 && (
          <div className="text-center py-6">
            <p className={`text-xs ${isNight ? 'text-slate-400/60' : 'text-slate-400'}`}>{t('sidebar.noOffice')}</p>
          </div>
        )}
      </div>

      {/* Yeni ofis oluştur */}
      <div className={`p-3 border-t ${isNight ? 'border-[#2a2b35]' : 'border-slate-100'}`}>
        <AnimatePresence>
          {showCreate && (
            <motion.div
              className="mb-3 space-y-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('sidebar.officeName')}
                className={`w-full px-3 py-2 rounded-lg border focus:border-[#7eb5a6] focus:ring-2 focus:ring-[#7eb5a6]/20 outline-none text-sm font-semibold transition-all ${isNight ? 'border-[#2a2b35] text-slate-200 bg-[#1a1b22] placeholder-slate-500/30' : 'border-slate-200 text-slate-800 bg-white placeholder-slate-300'}`}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder={t('sidebar.officeDesc')}
                className={`w-full px-3 py-2 rounded-lg border focus:border-[#7eb5a6] focus:ring-2 focus:ring-[#7eb5a6]/20 outline-none text-xs transition-all ${isNight ? 'border-[#2a2b35] text-slate-200 bg-[#1a1b22] placeholder-slate-500/30' : 'border-slate-200 text-slate-800 bg-white placeholder-slate-300'}`}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-colors ${isNight ? 'border-[#2a2b35] text-slate-300 hover:bg-[#2a2b35]/50' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading || !newName.trim()}
                  className="flex-1 py-1.5 rounded-lg bg-[#7eb5a6] hover:bg-[#6aa596] text-white text-xs font-black disabled:opacity-50 transition-colors"
                  style={{ boxShadow: '0 2px 8px rgba(126,181,166,0.3)' }}
                >
                  {loading ? '...' : t('sidebar.createOffice')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!showCreate && (
          <div className="space-y-2">
            <button
              onClick={() => setShowCreate(true)}
              className={`w-full py-2.5 rounded-xl border-2 border-dashed text-xs font-bold transition-all ${isNight ? 'border-[#2a2b35] text-slate-400/50 hover:border-[#7eb5a6]/60 hover:text-[#7eb5a6] hover:bg-[#7eb5a6]/5' : 'border-slate-200 text-slate-400 hover:border-[#7eb5a6] hover:text-[#5c9a8b] hover:bg-[#7eb5a6]/5'}`}
            >
              {t('sidebar.newOffice')}
            </button>
            <button
              onClick={() => setShowTraining(true)}
              className={`w-full py-2.5 rounded-xl border text-xs font-bold transition-all ${isNight ? 'border-[#2a2b35] text-purple-400/70 hover:border-purple-500/40 hover:bg-purple-500/5' : 'border-slate-200 text-purple-600 hover:border-purple-300 hover:bg-purple-50'}`}
            >
              🎓 {t('training.title')}
            </button>
            <div className="flex gap-1.5">
              <button
                onClick={handleSeedDemoLight}
                disabled={seedLightLoading}
                className={`flex-1 py-2 rounded-xl border text-[10px] font-bold transition-all disabled:opacity-50 ${isNight ? 'border-[#2a2b35] text-emerald-400/70 hover:border-emerald-500/40 hover:bg-emerald-500/5' : 'border-slate-200 text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50'}`}
                title={t('sidebar.demoLightTitle')}
              >
                {seedLightLoading ? t('sidebar.demoProjectLoading') : t('sidebar.demoLight')}
              </button>
              <button
                onClick={handleSeedDemo}
                disabled={seedLoading}
                className={`flex-1 py-2 rounded-xl border text-[10px] font-bold transition-all disabled:opacity-50 ${isNight ? 'border-[#2a2b35] text-amber-400/70 hover:border-amber-500/40 hover:bg-amber-500/5' : 'border-slate-200 text-amber-600 hover:border-amber-300 hover:bg-amber-50'}`}
                title={t('sidebar.demoProjectTitle')}
              >
                {seedLoading ? t('sidebar.demoProjectLoading') : t('sidebar.demoFull')}
              </button>
            </div>
            <button
              onClick={handleResetDb}
              disabled={resetLoading}
              className={`w-full py-2 rounded-xl border text-[10px] font-bold transition-all disabled:opacity-50 ${isNight ? 'border-[#2a2b35] text-red-400/50 hover:border-red-500/40 hover:bg-red-500/5' : 'border-slate-100 text-red-300 hover:border-red-300 hover:bg-red-50 hover:text-red-500'}`}
              title={t('sidebar.resetDbTitle')}
            >
              {resetLoading ? t('sidebar.resetDbLoading') : t('sidebar.resetDb')}
            </button>
          </div>
        )}
      </div>

      {/* Dil ve tema seçimi */}
      <div className={`flex-shrink-0 px-3 py-2 border-t flex flex-col items-center gap-2 ${isNight ? 'border-[#2a2b35]' : 'border-slate-100'}`}>
        {/* Dil */}
        <div className="flex justify-center gap-1">
          {(['tr', 'en'] as const).map(lang => (
            <button
              key={lang}
              onClick={() => { i18n.changeLanguage(lang); localStorage.setItem('lang', lang) }}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                i18n.language === lang
                  ? 'bg-[#7eb5a6] text-white'
                  : isNight ? 'text-slate-400/50 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
        {/* Tema */}
        <div className="flex justify-center gap-1">
          {(['light', 'dark'] as const).map(themeKey => (
            <button
              key={themeKey}
              onClick={() => onThemeChange?.(themeKey)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                appTheme === themeKey
                  ? 'bg-[#7eb5a6] text-white'
                  : isNight ? 'text-slate-400/50 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {themeKey === 'light' ? '☀️' : '🌙'} {t('theme.' + themeKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Training Panel */}
      <AnimatePresence>
        {showTraining && (
          <TrainingPanel isNight={isNight} onClose={() => setShowTraining(false)} />
        )}
      </AnimatePresence>

      {/* Template Modal */}
      {showTemplates && templateOfficeId && (
        <TemplateModal
          officeId={templateOfficeId}
          onClose={() => { setShowTemplates(false); setTemplateOfficeId(null) }}
          onDone={() => { setShowTemplates(false); setTemplateOfficeId(null); onOfficesChange() }}
        />
      )}
    </div>
  )
}
