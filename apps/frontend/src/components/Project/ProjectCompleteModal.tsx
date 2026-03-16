import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import type { ProjectCompleteSummary, AnimalType } from '@smith/types'
import { ANIMAL_EMOJIS } from '@smith/types'

interface Props {
  summary: ProjectCompleteSummary
  onClose: () => void
  isNight?: boolean
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`
}

function formatTokens(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`
  return `${(n / 1_000_000).toFixed(2)}M`
}

export function ProjectCompleteModal({ summary, onClose, isNight }: Props) {
  const { t } = useTranslation()

  const bg = isNight ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'
  const cardBg = isNight ? 'bg-slate-700/60' : 'bg-slate-50'
  const mutedText = isNight ? 'text-slate-400' : 'text-slate-500'

  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        className={`${bg} rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden`}
        initial={{ scale: 0.85, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        {/* Header */}
        <div className="text-center pt-8 pb-4 px-6">
          <motion.div
            className="text-5xl mb-3"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.2 }}
          >
            🎉
          </motion.div>
          <h2 className="text-xl font-bold">{t('projectComplete.title')}</h2>
          <p className={`text-sm ${mutedText} mt-1`}>{summary.projectName}</p>
          {summary.description && (
            <p className={`text-xs ${mutedText} mt-0.5 line-clamp-2`}>{summary.description}</p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="px-6 pb-4 grid grid-cols-2 gap-3">
          <div className={`${cardBg} rounded-xl p-3 text-center`}>
            <div className="text-2xl font-bold">{summary.totalTasks}</div>
            <div className={`text-xs ${mutedText}`}>{t('projectComplete.tasks')}</div>
          </div>
          <div className={`${cardBg} rounded-xl p-3 text-center`}>
            <div className="text-2xl font-bold">{summary.agentCount}</div>
            <div className={`text-xs ${mutedText}`}>{t('projectComplete.agents')}</div>
          </div>
          <div className={`${cardBg} rounded-xl p-3 text-center`}>
            <div className="text-2xl font-bold">{formatDuration(summary.durationSec)}</div>
            <div className={`text-xs ${mutedText}`}>{t('projectComplete.duration')}</div>
          </div>
          <div className={`${cardBg} rounded-xl p-3 text-center`}>
            <div className="text-2xl font-bold">{formatTokens(summary.totalTokens)}</div>
            <div className={`text-xs ${mutedText}`}>{t('projectComplete.tokens')}</div>
          </div>
        </div>

        {/* Agent List */}
        {summary.agents.length > 0 && (
          <div className="px-6 pb-4">
            <div className={`text-xs font-medium ${mutedText} mb-2`}>{t('projectComplete.team')}</div>
            <div className="flex flex-wrap gap-2">
              {summary.agents.map((a, i) => (
                <div key={i} className={`${cardBg} rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-sm`}>
                  <span>{ANIMAL_EMOJIS[a.animal as AnimalType] ?? '🤖'}</span>
                  <span className="font-medium">{a.name}</span>
                  <span className={`${mutedText} text-xs`}>({a.taskCount})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Work Dir */}
        {summary.workDir && (
          <div className="px-6 pb-4">
            <div className={`${cardBg} rounded-lg px-3 py-2 text-xs font-mono ${mutedText} truncate`}>
              {summary.workDir}
            </div>
          </div>
        )}

        {/* Cost */}
        {summary.totalCost > 0 && (
          <div className={`px-6 pb-4 text-center text-xs ${mutedText}`}>
            {t('projectComplete.cost')}: ${summary.totalCost.toFixed(4)}
          </div>
        )}

        {/* Close Button */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors"
          >
            {t('projectComplete.close')}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
