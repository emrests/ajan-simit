import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { Office } from '@smith/types'
import { ANIMAL_EMOJIS } from '@smith/types'
import { api } from '../../hooks/useApi'

interface ReplayEntry {
  type: 'assistant' | 'tool_use' | 'tool_result' | 'system_init'
  text?: string
  tool?: string
  input?: any
  content?: string
  cwd?: string
  tools?: string[]
}

interface SessionReplayPanelProps {
  office: Office
  onClose: () => void
  isNight: boolean
}

const TOOL_ICONS: Record<string, string> = {
  Bash: '💻', Write: '✍️', Edit: '✏️', Read: '📖',
  Glob: '🔍', Grep: '🔎', WebFetch: '🌐', WebSearch: '🔎',
  Task: '🤖', TodoWrite: '📝', NotebookEdit: '📓',
}

const SPEEDS = [
  { label: '0.5×', ms: 2000 },
  { label: '1×', ms: 1000 },
  { label: '2×', ms: 500 },
  { label: '4×', ms: 250 },
]

export function SessionReplayPanel({ office, onClose, isNight }: SessionReplayPanelProps) {
  const { t } = useTranslation()
  const [selectedAgentId, setSelectedAgentId] = useState<string>(office.agents[0]?.id ?? '')
  const [entries, setEntries] = useState<ReplayEntry[]>([])
  const [transcriptPath, setTranscriptPath] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(-1)
  const [speedIdx, setSpeedIdx] = useState(1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const selectedAgent = office.agents.find(a => a.id === selectedAgentId)
  const speed = SPEEDS[speedIdx]

  const loadTranscript = async (agentId: string) => {
    if (!agentId) return
    setLoading(true)
    setEntries([])
    setCurrentIdx(-1)
    setPlaying(false)
    try {
      const result = await api.getTranscript(agentId)
      setEntries(result.entries as ReplayEntry[])
      setTranscriptPath(result.path)
    } catch (e: any) {
      // Sessizce geç
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedAgentId) loadTranscript(selectedAgentId)
  }, [selectedAgentId])

  useEffect(() => {
    if (playing && currentIdx < entries.length - 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIdx(prev => {
          if (prev >= entries.length - 1) {
            setPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, speed.ms)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [playing, speed.ms, entries.length])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentIdx])

  const handlePlay = () => {
    if (currentIdx >= entries.length - 1) setCurrentIdx(-1)
    setPlaying(true)
  }

  const handlePause = () => setPlaying(false)

  const handleReset = () => {
    setPlaying(false)
    setCurrentIdx(-1)
  }

  const handleStep = () => {
    if (currentIdx < entries.length - 1) setCurrentIdx(prev => prev + 1)
  }

  const visibleEntries = entries.slice(0, currentIdx + 1)
  const pct = entries.length > 0 ? Math.round(((currentIdx + 1) / entries.length) * 100) : 0

  const panelBg = isNight ? 'bg-[#0f1929]' : 'bg-[#faf7f4]'
  const cardBg = isNight ? 'bg-[#1a2a4a] border-[#2a3a5a]' : 'bg-white border-[#e8d5c4]'
  const titleColor = isNight ? 'text-blue-100' : 'text-[#3d2b1f]'
  const subColor = isNight ? 'text-blue-300' : 'text-[#a08060]'

  return (
    <AnimatePresence>
      <motion.div
        className={`absolute inset-0 z-40 flex flex-col ${panelBg}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Başlık */}
        <div className={`flex items-center gap-3 px-6 py-4 border-b-2 ${isNight ? 'border-[#2a3a5a]' : 'border-[#e8d5c4]'}`}>
          <span className="text-2xl">▶️</span>
          <div className="flex-1">
            <h2 className={`font-black text-lg ${titleColor}`}>{t('replay.title')}</h2>
            <p className={`text-[10px] ${subColor}`}>{t('replay.subtitle')}</p>
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${isNight ? 'hover:bg-[#2a3a5a] text-blue-300' : 'hover:bg-[#f5e6d3] text-[#7a5c3f]'}`}
          >
            ×
          </button>
        </div>

        {/* Kontroller */}
        <div className={`px-4 py-3 border-b ${isNight ? 'border-[#2a3a5a]' : 'border-[#e8d5c4]'} space-y-3`}>
          {/* Ajan seçimi */}
          <div className="flex items-center gap-3">
            <label className={`text-xs font-bold shrink-0 ${subColor}`}>{t('replay.agentLabel')}</label>
            <select
              value={selectedAgentId}
              onChange={e => setSelectedAgentId(e.target.value)}
              className={`flex-1 px-3 py-2 rounded-xl border-2 outline-none text-sm font-semibold ${isNight ? 'bg-[#1a2a4a] border-[#2a4a8a] text-blue-100' : 'bg-white border-[#e8d5c4] text-[#3d2b1f]'}`}
            >
              {office.agents.map(a => (
                <option key={a.id} value={a.id}>
                  {ANIMAL_EMOJIS[a.animal as keyof typeof ANIMAL_EMOJIS] ?? '🤖'} {a.name} — {a.role}
                </option>
              ))}
            </select>
            {selectedAgent?.watchPath && (
              <span className="text-[9px] text-green-500 font-bold shrink-0">● JSONL</span>
            )}
          </div>

          {/* İlerleme çubuğu */}
          <div>
            <div className={`flex justify-between text-[9px] mb-1 ${subColor}`}>
              <span>{t('replay.entryCount', { current: currentIdx + 1, total: entries.length })}</span>
              <span>{pct}%</span>
            </div>
            <div className={`h-1.5 rounded-full overflow-hidden ${isNight ? 'bg-[#2a3a5a]' : 'bg-[#e8d5c4]'}`}>
              <motion.div
                className="h-full bg-[#7eb5a6] rounded-full"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </div>

          {/* Oynatma butonları */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              disabled={loading || entries.length === 0}
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-colors disabled:opacity-30 ${isNight ? 'bg-[#1a2a4a] hover:bg-[#2a3a5a] text-blue-200' : 'bg-[#f5e6d3] hover:bg-[#e8d5c4] text-[#7a5c3f]'}`}
              title={t('replay.resetTitle')}
            >
              ⏮
            </button>
            {playing ? (
              <button
                onClick={handlePause}
                className="flex-1 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black transition-colors"
              >
                ⏸ {t('replay.pause')}
              </button>
            ) : (
              <button
                onClick={handlePlay}
                disabled={loading || entries.length === 0}
                className="flex-1 py-1.5 rounded-xl bg-[#7eb5a6] hover:bg-[#6aa596] text-white text-xs font-black transition-colors disabled:opacity-30"
              >
                {currentIdx >= entries.length - 1 ? `🔄 ${t('replay.replay')}` : `▶ ${t('replay.play')}`}
              </button>
            )}
            <button
              onClick={handleStep}
              disabled={loading || playing || currentIdx >= entries.length - 1}
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-colors disabled:opacity-30 ${isNight ? 'bg-[#1a2a4a] hover:bg-[#2a3a5a] text-blue-200' : 'bg-[#f5e6d3] hover:bg-[#e8d5c4] text-[#7a5c3f]'}`}
              title={t('replay.stepTitle')}
            >
              ⏭
            </button>
            {/* Hız seçici */}
            <div className="flex rounded-xl overflow-hidden border border-[#e8d5c4]">
              {SPEEDS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSpeedIdx(i)}
                  className={`px-2 py-1.5 text-[9px] font-black transition-colors ${
                    speedIdx === i
                      ? 'bg-[#7eb5a6] text-white'
                      : isNight ? 'bg-[#1a2a4a] text-blue-300 hover:bg-[#2a3a5a]' : 'bg-white text-[#7a5c3f] hover:bg-[#f5e6d3]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* JSONL yok uyarısı */}
          {!loading && entries.length === 0 && (
            <p className={`text-[10px] text-center ${subColor}`}>
              {t('replay.noJsonl')}
            </p>
          )}
          {loading && (
            <p className={`text-[10px] text-center ${subColor}`}>⏳ {t('common.loading')}</p>
          )}
        </div>

        {/* Replay akışı */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <AnimatePresence initial={false}>
            {visibleEntries.map((entry, i) => {
              const isLatest = i === currentIdx
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 30, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ duration: 0.25, type: 'spring', stiffness: 200 }}
                  className={`rounded-xl border px-3 py-2.5 text-xs ${
                    isLatest
                      ? entry.type === 'assistant' ? 'border-blue-400 bg-blue-50 shadow-md shadow-blue-100' :
                        entry.type === 'tool_use' ? 'border-purple-400 bg-[#1a1a2e] shadow-md shadow-purple-900/30' :
                        'border-[#7eb5a6] bg-[#7eb5a6]/10'
                      : entry.type === 'tool_use' ? 'border-purple-200 bg-[#1a1a2e]/80' :
                        entry.type === 'assistant' ? 'border-blue-100 bg-blue-50/60' :
                        isNight ? 'border-[#2a3a5a] bg-[#1a2a4a]/60' : 'border-[#e8d5c4] bg-white/60'
                  }`}
                >
                  {entry.type === 'system_init' && (
                    <div>
                      <p className={`text-[9px] font-bold ${subColor} mb-1`}>⚙️ {t('replay.sessionStarted')}</p>
                      <p className={`text-[9px] font-mono ${subColor}`}>📂 {entry.cwd}</p>
                      <p className={`text-[9px] ${subColor}`}>{t('replay.tools', { tools: (entry.tools ?? []).join(', ') })}</p>
                    </div>
                  )}
                  {entry.type === 'assistant' && (
                    <div>
                      <p className="text-[9px] font-bold text-blue-500 mb-1">
                        🤖 {selectedAgent?.name ?? 'Claude'}
                        {isLatest && <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
                      </p>
                      <p className="text-blue-900 leading-relaxed whitespace-pre-wrap break-words">{entry.text}</p>
                    </div>
                  )}
                  {entry.type === 'tool_use' && (
                    <div>
                      <p className="text-[9px] font-bold text-purple-300 mb-1">
                        {TOOL_ICONS[entry.tool ?? ''] ?? '⚡'} {entry.tool}
                        {isLatest && <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />}
                      </p>
                      <pre className="text-[9px] text-green-200 overflow-x-auto whitespace-pre-wrap break-all">
                        {typeof entry.input === 'object'
                          ? JSON.stringify(entry.input, null, 2).slice(0, 300)
                          : String(entry.input ?? '')}
                      </pre>
                    </div>
                  )}
                  {entry.type === 'tool_result' && (
                    <div>
                      <p className={`text-[9px] font-bold mb-1 ${isNight ? 'text-gray-400' : 'text-gray-500'}`}>📤 {t('replay.resultLabel')}</p>
                      <p className={`text-[9px] font-mono whitespace-pre-wrap break-all ${isNight ? 'text-gray-300' : 'text-gray-600'}`}>
                        {entry.content}
                      </p>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {transcriptPath && (
          <div className={`px-4 py-2 border-t ${isNight ? 'border-[#2a3a5a]' : 'border-[#e8d5c4]'}`}>
            <p className={`text-[9px] font-mono truncate ${subColor}`}>
              📄 {transcriptPath.split(/[\\/]/).slice(-2).join('/')}
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
