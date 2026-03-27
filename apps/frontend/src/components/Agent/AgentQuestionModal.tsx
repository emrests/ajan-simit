import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import type { AgentQuestion, AnimalType } from '@smith/types'
import { AnimalSVG } from '../../animals/AnimalSVG'

interface AgentQuestionModalProps {
  question: AgentQuestion
  isNight: boolean
  onRespond: (response: string) => void
  onSkip: () => void
}

export function AgentQuestionModal({ question, isNight, onRespond, onSkip }: AgentQuestionModalProps) {
  const { t } = useTranslation()
  const [response, setResponse] = useState('')
  const [sending, setSending] = useState(false)

  const bg = isNight ? 'bg-[#1a1b22]' : 'bg-white'
  const border = isNight ? 'border-[#2a2b35]' : 'border-slate-200'
  const textPrimary = isNight ? 'text-slate-200' : 'text-slate-800'
  const textSecondary = isNight ? 'text-slate-400' : 'text-slate-500'
  const inputBg = isNight ? 'bg-[#14151a] border-[#2a2b35] text-slate-200' : 'bg-white border-slate-200 text-slate-800'

  const handleRespond = async (text: string) => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await onRespond(text.trim())
    } finally {
      setSending(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onSkip() }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className={`w-[520px] rounded-2xl shadow-2xl border overflow-hidden ${bg} ${border}`}
      >
        {/* Header */}
        <div className={`flex items-center gap-3 px-5 py-4 border-b ${border}`}>
          <div className="w-10 h-10 flex-shrink-0">
            <AnimalSVG animal={question.animal as AnimalType} status="idle" size={40} />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-bold ${textPrimary}`}>
              {t('agentQuestion.from', { name: question.agentName })}
            </div>
            <div className={`text-[10px] ${textSecondary}`}>
              {t('agentQuestion.waiting')}
            </div>
          </div>
          <button
            onClick={onSkip}
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${textSecondary} hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors`}
          >
            ✕
          </button>
        </div>

        {/* Question */}
        <div className="px-5 py-4">
          <div className={`text-sm leading-relaxed ${textPrimary} whitespace-pre-wrap`}>
            {question.question}
          </div>
        </div>

        {/* Options (if any) */}
        {question.options.length > 0 && (
          <div className="px-5 pb-3">
            <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>
              {t('agentQuestion.options')}
            </div>
            <div className="flex flex-wrap gap-2">
              {question.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleRespond(opt)}
                  disabled={sending}
                  className={`px-4 py-2 rounded-lg text-xs font-medium border transition-all ${
                    isNight
                      ? 'border-[#2a2b35] text-slate-300 hover:bg-[#7eb5a6]/20 hover:border-[#7eb5a6]/40'
                      : 'border-slate-200 text-slate-700 hover:bg-[#7eb5a6]/10 hover:border-[#7eb5a6]/40'
                  } disabled:opacity-50`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Text response */}
        <div className="px-5 pb-4">
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder={t('agentQuestion.placeholder')}
            rows={3}
            className={`w-full px-3 py-2 rounded-lg border text-xs resize-y ${inputBg} placeholder:text-slate-400/50`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleRespond(response)
              }
            }}
          />
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-2 px-5 py-3 border-t ${border}`}>
          <button
            onClick={onSkip}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              isNight
                ? 'text-slate-400 hover:bg-[#2a2b35]'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {t('agentQuestion.skip')}
          </button>
          <button
            onClick={() => handleRespond(response)}
            disabled={!response.trim() || sending}
            className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-[#7eb5a6] hover:bg-[#5c9a8b] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {sending ? '...' : t('agentQuestion.respond')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
