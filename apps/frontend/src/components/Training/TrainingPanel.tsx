import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import type { TrainingProfile } from '@smith/types'
import { api } from '../../hooks/useApi'

interface TrainingPanelProps {
  isNight?: boolean
  onClose: () => void
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-400/20 text-slate-500',
  analyzing: 'bg-amber-400/20 text-amber-600',
  generating: 'bg-blue-400/20 text-blue-600',
  done: 'bg-emerald-400/20 text-emerald-600',
  error: 'bg-red-400/20 text-red-600',
}

export function TrainingPanel({ isNight = false, onClose }: TrainingPanelProps) {
  const { t } = useTranslation()
  const [profiles, setProfiles] = useState<TrainingProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<TrainingProfile | null>(null)

  // Create form
  const [mode, setMode] = useState<'project' | 'technology'>('technology')
  const [name, setName] = useState('')
  const [source, setSource] = useState('')
  const [userPrompt, setUserPrompt] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [trainLoading, setTrainLoading] = useState<string | null>(null)

  const loadProfiles = async () => {
    setLoading(true)
    try {
      const data = await api.getTrainingProfiles()
      setProfiles(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfiles()
  }, [])

  const handleCreate = async () => {
    if (!name.trim()) return
    setCreateLoading(true)
    try {
      const profile = await api.createTrainingProfile({
        name: name.trim(),
        description: mode === 'project'
          ? `${t('training.projectMode')}: ${source}`
          : `${t('training.techMode')}: ${source || name}`,
        mode,
        source: source.trim(),
        userPrompt: userPrompt.trim(),
      })
      setProfiles(prev => [profile, ...prev])
      setName('')
      setSource('')
      setUserPrompt('')
      setShowCreate(false)
    } finally {
      setCreateLoading(false)
    }
  }

  const handleStartTraining = async (profileId: string) => {
    setTrainLoading(profileId)
    try {
      await api.startTraining(profileId)
      // Profili güncelle
      setProfiles(prev => prev.map(p =>
        p.id === profileId ? { ...p, status: 'analyzing' as const } : p
      ))
      // Polling ile durum takibi (WS da broadcast ediyor ama polling da yapalım)
      const pollInterval = setInterval(async () => {
        try {
          const updated = await api.getTrainingProfile(profileId)
          setProfiles(prev => prev.map(p => p.id === profileId ? updated : p))
          if (selectedProfile?.id === profileId) setSelectedProfile(updated)
          if (updated.status === 'done' || updated.status === 'error') {
            clearInterval(pollInterval)
            setTrainLoading(null)
          }
        } catch {
          clearInterval(pollInterval)
          setTrainLoading(null)
        }
      }, 3000)
    } catch {
      setTrainLoading(null)
    }
  }

  const handleDelete = async (profileId: string) => {
    if (!confirm(t('training.confirmDelete'))) return
    await api.deleteTrainingProfile(profileId)
    setProfiles(prev => prev.filter(p => p.id !== profileId))
    if (selectedProfile?.id === profileId) setSelectedProfile(null)
  }

  const handleExport = async (profileId: string) => {
    try {
      const data = await api.exportTrainingProfile(profileId)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `training-${data.name?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'profile'}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignore */ }
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        const profile = await api.importTrainingProfile(data)
        setProfiles(prev => [profile, ...prev])
        setSelectedProfile(profile)
      } catch {
        alert(t('training.importError'))
      }
    }
    input.click()
  }

  const bg = isNight ? 'bg-[#1a1b22]' : 'bg-white'
  const border = isNight ? 'border-[#2a2b35]' : 'border-slate-200'
  const text = isNight ? 'text-slate-200' : 'text-slate-800'
  const textMuted = isNight ? 'text-slate-400' : 'text-slate-500'
  const cardBg = isNight ? 'bg-[#22232b]' : 'bg-slate-50'
  const inputBg = isNight ? 'bg-[#14151a] border-[#2a2b35] text-slate-200' : 'bg-white border-slate-200 text-slate-800'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className={`${bg} ${border} border rounded-2xl shadow-2xl w-[900px] max-h-[85vh] overflow-hidden flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${border}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎓</span>
            <h2 className={`text-lg font-bold ${text}`}>{t('training.title')}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full ${isNight ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
              {profiles.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleImport}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${border} ${textMuted} hover:${text} transition-all`}
              title={t('training.import')}
            >
              📥 {t('training.import')}
            </button>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
            >
              + {t('training.newProfile')}
            </button>
            <button onClick={onClose} className={`p-1.5 rounded-lg ${textMuted} hover:${text} transition-all`}>
              ✕
            </button>
          </div>
        </div>

        {/* Create Form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`border-b ${border} overflow-hidden`}
            >
              <div className="p-4 space-y-3">
                {/* Mode Toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setMode('project')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                      mode === 'project'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                        : `${cardBg} ${border} ${textMuted}`
                    }`}
                  >
                    📁 {t('training.projectMode')}
                  </button>
                  <button
                    onClick={() => setMode('technology')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                      mode === 'technology'
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-600'
                        : `${cardBg} ${border} ${textMuted}`
                    }`}
                  >
                    🔧 {t('training.techMode')}
                  </button>
                </div>

                {/* Name */}
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t('training.profileName')}
                  className={`w-full px-3 py-2 rounded-lg text-sm border ${inputBg}`}
                />

                {/* Source */}
                <input
                  value={source}
                  onChange={e => setSource(e.target.value)}
                  placeholder={mode === 'project' ? t('training.projectPath') : t('training.techName')}
                  className={`w-full px-3 py-2 rounded-lg text-sm border ${inputBg}`}
                />

                {/* User Prompt */}
                <textarea
                  value={userPrompt}
                  onChange={e => setUserPrompt(e.target.value)}
                  placeholder={t('training.description')}
                  rows={3}
                  className={`w-full px-3 py-2 rounded-lg text-sm border resize-none ${inputBg}`}
                />

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowCreate(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs ${textMuted} hover:${text}`}
                  >
                    {t('training.cancel')}
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!name.trim() || createLoading}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-all"
                  >
                    {createLoading ? '...' : t('training.create')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Profile List */}
          <div className={`w-[320px] border-r ${border} overflow-y-auto`}>
            {loading ? (
              <div className={`p-8 text-center ${textMuted} text-sm`}>...</div>
            ) : profiles.length === 0 ? (
              <div className={`p-8 text-center ${textMuted} text-sm`}>
                <div className="text-4xl mb-2">🎓</div>
                {t('training.noProfiles')}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {profiles.map(profile => (
                  <div
                    key={profile.id}
                    className={`group relative w-full text-left p-3 rounded-xl transition-all cursor-pointer ${
                      selectedProfile?.id === profile.id
                        ? isNight ? 'bg-[#2a2b35]' : 'bg-slate-100'
                        : `hover:${cardBg}`
                    }`}
                    onClick={() => setSelectedProfile(profile)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{profile.mode === 'project' ? '📁' : '🔧'}</span>
                      <span className={`text-sm font-semibold truncate flex-1 ${text}`}>{profile.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${STATUS_COLORS[profile.status] || STATUS_COLORS.pending}`}>
                        {t(`training.status.${profile.status}`)}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(profile.id) }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-all text-xs"
                        title={t('training.delete')}
                      >
                        🗑
                      </button>
                    </div>
                    {profile.source && (
                      <div className={`text-[10px] truncate ${textMuted}`}>{profile.source}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Profile Detail */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedProfile ? (
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span>{selectedProfile.mode === 'project' ? '📁' : '🔧'}</span>
                      <h3 className={`text-lg font-bold ${text}`}>{selectedProfile.name}</h3>
                    </div>
                    {selectedProfile.description && (
                      <p className={`text-xs ${textMuted}`}>{selectedProfile.description}</p>
                    )}
                    {selectedProfile.source && (
                      <p className={`text-xs mt-1 ${textMuted}`}>
                        {selectedProfile.mode === 'project' ? '📂' : '🔗'} {selectedProfile.source}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${STATUS_COLORS[selectedProfile.status] || STATUS_COLORS.pending}`}>
                      {t(`training.status.${selectedProfile.status}`)}
                    </span>
                  </div>
                </div>

                {/* User Prompt */}
                {selectedProfile.userPrompt && (
                  <div className={`p-3 rounded-lg ${cardBg} border ${border}`}>
                    <div className={`text-[10px] font-bold mb-1 ${textMuted}`}>{t('training.description')}</div>
                    <p className={`text-xs ${text}`}>{selectedProfile.userPrompt}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {(selectedProfile.status === 'pending' || selectedProfile.status === 'error') && (
                    <button
                      onClick={() => handleStartTraining(selectedProfile.id)}
                      disabled={trainLoading === selectedProfile.id}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-all"
                    >
                      {trainLoading === selectedProfile.id ? (
                        <span className="flex items-center gap-1">
                          <span className="animate-spin">⏳</span> {t('training.status.analyzing')}
                        </span>
                      ) : (
                        `🚀 ${t('training.startTraining')}`
                      )}
                    </button>
                  )}
                  {selectedProfile.status === 'analyzing' && (
                    <div className={`px-4 py-2 rounded-lg text-xs font-bold ${STATUS_COLORS.analyzing} flex items-center gap-1`}>
                      <span className="animate-spin">⏳</span> {t('training.status.analyzing')}
                    </div>
                  )}
                  {selectedProfile.status === 'done' && (
                    <button
                      onClick={() => handleStartTraining(selectedProfile.id)}
                      disabled={trainLoading === selectedProfile.id}
                      className={`px-4 py-2 rounded-lg text-xs font-bold border ${border} ${textMuted} hover:${text} transition-all`}
                    >
                      🔄 {t('training.retrain')}
                    </button>
                  )}
                  <button
                    onClick={() => handleExport(selectedProfile.id)}
                    className={`px-3 py-2 rounded-lg text-xs border ${border} ${textMuted} hover:${text} transition-all`}
                    title={t('training.export')}
                  >
                    📤 {t('training.export')}
                  </button>
                  <button
                    onClick={() => handleDelete(selectedProfile.id)}
                    className="px-3 py-2 rounded-lg text-xs text-red-400 hover:text-red-500 hover:bg-red-500/5 transition-all"
                  >
                    🗑
                  </button>
                </div>

                {/* Content */}
                {selectedProfile.content ? (
                  <div className={`p-4 rounded-xl border ${border} ${cardBg} overflow-y-auto max-h-[400px]`}>
                    <div className={`text-[10px] font-bold mb-2 ${textMuted}`}>{t('training.preview')}</div>
                    <pre className={`text-xs whitespace-pre-wrap font-mono ${text}`}>
                      {selectedProfile.content}
                    </pre>
                  </div>
                ) : selectedProfile.status === 'pending' ? (
                  <div className={`p-8 text-center rounded-xl border border-dashed ${border} ${textMuted} text-sm`}>
                    🎓 {t('training.clickStart')}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className={`h-full flex items-center justify-center ${textMuted} text-sm`}>
                <div className="text-center">
                  <div className="text-5xl mb-3">🎓</div>
                  <p>{t('training.selectProfile')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
