import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { Agent } from '@smith/types'
import { AnimalSVG } from '../../animals/AnimalSVG'
import { ANIMAL_EMOJIS } from '@smith/types'

interface AgentDeskProps {
  agent: Agent
  onClick?: () => void
  isNight?: boolean
  showDesk?: boolean
  seated?: boolean
}

const STATUS_COLORS: Record<string, string> = {
  idle: 'bg-slate-100 text-slate-500',
  thinking: 'bg-amber-100 text-amber-700',
  typing: 'bg-blue-100 text-blue-700',
  reading: 'bg-violet-100 text-violet-700',
  waiting: 'bg-amber-50 text-amber-600',
  celebrating: 'bg-emerald-100 text-emerald-700',
}

const STATUS_ANIM_CLASS: Record<string, string> = {
  idle: 'animal-idle',
  thinking: 'animal-thinking',
  typing: 'animal-typing',
  reading: 'animal-reading',
  waiting: 'animal-waiting',
  celebrating: 'animal-celebrating',
}

const STATUS_KEY: Record<string, string> = {
  idle: 'status.idle',
  thinking: 'status.thinking',
  typing: 'status.typing',
  reading: 'status.reading',
  waiting: 'status.waiting',
  celebrating: 'status.celebrating',
}

export function AgentDesk({ agent, onClick, isNight = false, showDesk = true, seated = false }: AgentDeskProps) {
  const { t } = useTranslation()
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      className="relative flex flex-col items-center select-none"
      style={{ cursor: 'pointer' }}
      onClick={onClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* İsim etiketi */}
      <div
        className={`mb-1 px-3 py-1 rounded-full shadow-sm border text-center flex items-center gap-1.5 ${
          isNight
            ? 'bg-[#1a2a4a]/90 border-[#3a5a8a]/80 backdrop-blur-sm'
            : 'bg-white/90 border-slate-200/80'
        }`}
        style={!isNight ? { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' } : undefined}
      >
        <span className={`text-xs font-bold ${isNight ? 'text-blue-100' : 'text-slate-800'}`}>{ANIMAL_EMOJIS[agent.animal]} {agent.name}</span>
        {/* Claude Code oturum aktif indikatörü */}
        {agent.sessionPid && (
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" title={t('agent.claudeCodeActive')} />
        )}
        {agent.watchPath && !agent.sessionPid && (
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" title={t('agent.jsonlWatching')} />
        )}
      </div>

      {/* Rol etiketi */}
      <div className={`mb-2 px-2.5 py-0.5 rounded-full ${isNight ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
        <span className={`text-[10px] font-semibold ${isNight ? 'text-blue-300' : 'text-slate-500'}`}>{agent.role}</span>
      </div>

      {/* Hayvan karakteri */}
      <div className={`${STATUS_ANIM_CLASS[agent.status]} ${seated ? 'animal-seated' : ''} relative`}>
        <AnimalSVG animal={agent.animal} status={agent.status} size={80} seated={seated} />

        {/* Konuşma balonu — koyu cam stili */}
        <AnimatePresence>
          {agent.currentTask && agent.status !== 'idle' && (
            <motion.div
              className={`speech-bubble absolute -top-10 left-1/2 -translate-x-1/2 w-36 rounded-2xl shadow-lg px-2 py-1.5 border ${
                isNight
                  ? 'bg-[#1a2a4a]/95 border-[#3a5a8a]/60 backdrop-blur-sm'
                  : 'bg-slate-800/90 border-slate-700/50 backdrop-blur-sm'
              }`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              style={{ originX: 0.5, originY: 1 }}
            >
              <p className={`text-[9px] leading-tight text-center line-clamp-2 ${
                isNight ? 'text-blue-100' : 'text-white'
              }`}>
                {agent.currentTask}
              </p>
              {/* Balon kuyruğu */}
              <div className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-r border-b ${
                isNight
                  ? 'bg-[#1a2a4a]/95 border-[#3a5a8a]/60'
                  : 'bg-slate-800/90 border-slate-700/50'
              }`} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Masa — 5 katmanlı modern tasarım */}
      {showDesk && (
        <div className="relative flex flex-col items-center mt-1">
          {/* Sandalye arkası */}
          <div className={`w-12 h-3 rounded-t-full border-t-2 border-x-2 -mb-1 z-0 ${
            isNight ? 'bg-[#1a2a4a] border-[#2a4060]' : 'bg-slate-200 border-slate-300'
          }`} />

          {/* Masa yüzeyi + monitör + klavye */}
          <div
            className={`relative w-28 h-6 rounded-t-lg flex items-end justify-center pb-0.5 z-10 ${
              isNight ? 'bg-[#243447]' : 'bg-slate-600'
            }`}
            style={{
              boxShadow: isNight
                ? 'inset 0 1px 0 rgba(100,140,200,0.15)'
                : 'inset 0 1px 0 rgba(255,255,255,0.12)',
            }}
          >
            {/* Monitör */}
            <div
              className={`w-11 h-4 rounded-sm flex items-center justify-center ${
                agent.sessionPid ? 'desk-active-glow' : ''
              }`}
              style={{
                background: agent.sessionPid
                  ? 'linear-gradient(135deg, #0f4c2a, #1a7a4a)'
                  : isNight
                  ? 'linear-gradient(135deg, #1a2a4a, #243a6a)'
                  : 'linear-gradient(135deg, #1e293b, #334155)',
                boxShadow: agent.sessionPid
                  ? '0 0 10px 3px rgba(74,220,128,0.5)'
                  : isNight
                  ? '0 0 6px 2px rgba(74,138,255,0.3)'
                  : undefined,
              }}
            >
              <div className="flex flex-col gap-0.5 w-full px-1">
                <div className={`h-0.5 w-3/4 rounded-full ${agent.sessionPid ? 'bg-green-300/70' : 'bg-slate-400/50'}`} />
                <div className={`h-0.5 w-1/2 rounded-full ${agent.sessionPid ? 'bg-green-400/60' : 'bg-slate-400/30'}`} />
              </div>
            </div>
            {/* Klavye */}
            <div className={`absolute bottom-0.5 left-3 w-7 h-1.5 rounded-sm ${
              isNight ? 'bg-[#1a2a4a]' : 'bg-slate-400/60'
            }`} />
          </div>

          {/* Masa ön yüzü */}
          <div className={`w-28 h-2.5 rounded-b-sm ${
            isNight ? 'bg-[#1a2030]' : 'bg-slate-700'
          }`}
            style={{
              boxShadow: isNight
                ? '0 3px 8px rgba(0,0,0,0.5)'
                : '0 3px 10px rgba(0,0,0,0.25)',
            }}
          />

          {/* Masa ayakları */}
          <div className="flex justify-between w-24 -mt-0.5">
            <div className={`w-1 h-2 ${isNight ? 'bg-[#1a2030]' : 'bg-slate-600'}`} />
            <div className={`w-1 h-2 ${isNight ? 'bg-[#1a2030]' : 'bg-slate-600'}`} />
          </div>
        </div>
      )}

      {/* Durum badge */}
      <div className={`mt-2 px-2 py-0.5 rounded-full text-[9px] font-bold ${STATUS_COLORS[agent.status]}`}>
        {t(STATUS_KEY[agent.status] || 'status.idle')}
      </div>

      {/* Hover tooltip — glassmorphism dark */}
      <AnimatePresence>
        {hovered && agent.currentTask && (
          <motion.div
            className="absolute -top-16 left-1/2 -translate-x-1/2 text-white text-[10px] rounded-xl px-3 py-2 shadow-xl z-50 w-48 text-center pointer-events-none backdrop-blur-sm bg-slate-900/90 border border-slate-700/50"
            style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
          >
            {agent.currentTask}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
