import React, { useState, useMemo } from 'react'
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { Office, Agent, AgentMessage } from '@smith/types'
import { AgentDesk } from './AgentDesk'
import { AgentModal } from '../Agent/AgentModal'
import { ProjectPanel } from '../Project/ProjectPanel'
import { ProjectCompleteModal } from '../Project/ProjectCompleteModal'
import { DashboardPanel } from '../Dashboard/DashboardPanel'
import { SessionReplayPanel } from '../SessionReplay/SessionReplayPanel'
import { HelpPanel } from '../Help/HelpPanel'
import { useStore } from '../../store/useStore'
import { api } from '../../hooks/useApi'

interface OfficeViewProps {
  office: Office
  onOfficeUpdate: () => void
}

type RoomType = 'work' | 'coffee' | 'meeting'

// Tema tanımları
const THEMES = {
  light: {
    floor: 'bg-[#f0f2f5]',
    floorPattern: 'office-floor',
    wall: 'bg-[#f7f6f1]',
    wallBorder: 'border-[#e8e6df]',
    window: 'bg-[#e8e6df]',
    emoji: '☀️',
    labelKey: 'light',
    isDark: false,
  },
  dark: {
    floor: 'bg-[#14151a]',
    floorPattern: 'office-floor-dark',
    wall: 'bg-[#1a1b22]',
    wallBorder: 'border-[#2a2b35]',
    window: 'bg-[#1e1f28]',
    emoji: '🌙',
    labelKey: 'dark',
    isDark: true,
  },
}

// Her tema için oda stilleri
const ROOM_STYLES: Record<string, { work: string; coffee: string; meeting: string }> = {
  light: {
    work: 'bg-white/55 border-[#e8e6df]/60',
    coffee: 'bg-[#faf9f5]/50 border-[#e8e6df]/40',
    meeting: 'bg-[#f2f1eb]/50 border-[#dbd9d0]/50',
  },
  dark: {
    work: 'bg-[#1a1b22]/70 border-[#2a2b35]/50',
    coffee: 'bg-[#1e1f28]/60 border-[#2a2b35]/40',
    meeting: 'bg-[#1c1d26]/60 border-[#2e2f3a]/50',
  },
}

function assignAgentRooms(agents: Agent[], messages: AgentMessage[]): Map<string, RoomType> {
  const roomMap = new Map<string, RoomType>()

  // Son 5 dk içinde agent-to-agent mesajı olan ajanlar → toplantı
  const fiveMinAgo = Date.now() - 5 * 60 * 1000
  const meetingAgentIds = new Set<string>()
  for (const msg of messages) {
    if (msg.type === 'agent-to-agent' && new Date(msg.timestamp).getTime() > fiveMinAgo) {
      meetingAgentIds.add(msg.fromAgentId)
      if (msg.toAgentId) meetingAgentIds.add(msg.toAgentId)
    }
  }

  for (const agent of agents) {
    if (meetingAgentIds.has(agent.id)) {
      roomMap.set(agent.id, 'meeting')
    } else if (['thinking', 'typing', 'reading', 'waiting', 'celebrating'].includes(agent.status)) {
      roomMap.set(agent.id, 'work')
    } else {
      roomMap.set(agent.id, 'coffee')
    }
  }

  return roomMap
}

export function OfficeView({ office, onOfficeUpdate }: OfficeViewProps) {
  const { t } = useTranslation()
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [showAddAgent, setShowAddAgent] = useState(false)
  const [showProjects, setShowProjects] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
  const [showReplay, setShowReplay] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const messages = useStore((s) => s.messages)
  const completedProject = useStore((s) => s.completedProject)
  const setCompletedProject = useStore((s) => s.setCompletedProject)

  const theme = THEMES[office.theme as keyof typeof THEMES] ?? THEMES.light
  const isNight = theme.isDark
  const roomStyle = ROOM_STYLES[office.theme] ?? ROOM_STYLES.light

  // Oda atamalarını hesapla
  const roomMap = useMemo(
    () => assignAgentRooms(office.agents, messages),
    [office.agents, messages]
  )

  const workAgents = office.agents.filter(a => roomMap.get(a.id) === 'work')
  const coffeeAgents = office.agents.filter(a => roomMap.get(a.id) === 'coffee')
  const meetingAgents = office.agents.filter(a => roomMap.get(a.id) === 'meeting')

  // Deterministik ama karışık gecikme — her ajan için sabit
  const getWalkDelay = (agentId: string) => {
    let hash = 0
    for (let i = 0; i < agentId.length; i++) hash = ((hash << 5) - hash) + agentId.charCodeAt(i)
    return (Math.abs(hash) % 5000) / 1000 // 0-5s arası
  }

  const renderRoomLabel = (icon: string, label: string, count: number) => (
    <div className="absolute top-2.5 left-3 z-10 flex items-center gap-1.5">
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-sm border shadow-sm ${
        isNight
          ? 'bg-[#14151a]/70 border-[#2a2b35]/60 text-slate-300'
          : 'bg-white/70 border-white/80 text-slate-600'
      }`}>
        <span className="text-sm leading-none">{icon}</span>
        <span className="text-[11px] font-bold tracking-wide leading-none">{label}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
          isNight ? 'bg-slate-700/60 text-slate-400' : 'bg-slate-100 text-slate-500'
        }`}>
          {count}
        </span>
      </div>
    </div>
  )

  const renderEmptyRoom = (text: string) => (
    <div className={`flex items-center justify-center h-full opacity-40 text-xs ${isNight ? 'text-slate-400' : 'text-slate-400'}`}>
      {text}
    </div>
  )

  return (
    <div className={`h-full w-full relative overflow-hidden ${theme.floorPattern} ${theme.floor}`}>
      {/* Koyu tema overlay */}
      {isNight && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d0d1a] via-transparent to-[#0d0d1a] opacity-30 pointer-events-none z-0" />
      )}

      {/* Duvar — glassmorphism */}
      <div
        className={`absolute top-0 left-0 right-0 h-16 z-20 border-b ${
          isNight
            ? `${theme.wall} border-b-2 ${theme.wallBorder}`
            : 'bg-white/80 backdrop-blur-md border-slate-200/80'
        }`}
        style={
          !isNight ? { boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 2px 8px rgba(0,0,0,0.06)' } :
          undefined
        }
      >
        {/* Toolbar — glassmorphism pill bar */}
        <div className={`absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1.5 rounded-2xl backdrop-blur border shadow-sm ${
          isNight
            ? 'bg-[#1e1f28]/80 border-[#35363f]/60'
            : 'bg-slate-100/80 border-white/60'
        }`}>
          <button
            onClick={() => setShowProjects(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              isNight
                ? 'text-slate-300 hover:bg-[#2a2b35]/60'
                : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm'
            }`}
          >
            <span className="text-sm">📋</span>
            <span>{t('office.projects')}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
              isNight ? 'bg-slate-700/50 text-slate-400' : 'bg-[#7eb5a6]/15 text-[#5c9a8b]'
            }`}>{office.projects.length}</span>
          </button>

          <div className={`w-px h-5 ${isNight ? 'bg-slate-700/60' : 'bg-slate-200'}`} />

          <button
            onClick={() => setShowDashboard(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              isNight
                ? 'text-slate-300 hover:bg-[#2a2b35]/60'
                : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm'
            }`}
          >
            <span className="text-sm">📊</span>
            <span>{t('office.dashboard')}</span>
          </button>

          <div className={`w-px h-5 ${isNight ? 'bg-slate-700/60' : 'bg-slate-200'}`} />

          <button
            onClick={() => setShowReplay(true)}
            disabled={office.agents.length === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-40 ${
              isNight
                ? 'text-slate-300 hover:bg-[#2a2b35]/60'
                : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm'
            }`}
          >
            <span className="text-sm">▶️</span>
            <span>{t('office.replay')}</span>
          </button>

          <div className={`w-px h-5 ${isNight ? 'bg-slate-700/60' : 'bg-slate-200'}`} />

          <button
            onClick={() => setShowHelp(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              isNight
                ? 'text-slate-300 hover:bg-[#2a2b35]/60'
                : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm'
            }`}
          >
            <span className="text-sm">📖</span>
            <span>{t('office.help')}</span>
          </button>
        </div>
      </div>

      {/* === ODA TABANLI LAYOUT === */}
      {office.agents.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center pt-16">
          <div className="text-center p-8">
            <div className="text-6xl mb-4">🏢</div>
            <p className={`font-bold text-lg ${isNight ? 'text-slate-300' : 'text-slate-600'}`}>{t('office.emptyTitle')}</p>
            <p className={`text-sm mt-1 ${isNight ? 'text-slate-400' : 'text-slate-400'}`}>{t('office.emptyDesc')}</p>
          </div>
        </div>
      ) : (
        <LayoutGroup>
          <div className="absolute top-[68px] bottom-[56px] left-2 right-2 flex flex-col gap-1.5 z-10">

            {/* Çalışma Odası — üst %55 */}
            <div className={`flex-[55] rounded-xl border ${roomStyle.work} relative overflow-hidden min-h-0`}>
              <div className="room-glass-edge" />
              {renderRoomLabel('💻', t('office.workRoom'), workAgents.length)}

              {/* Dekoratif — CSS monitörler */}
              <div className="absolute top-3 right-3 flex gap-2 opacity-20 pointer-events-none">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex flex-col items-center gap-0.5">
                    <div className={`w-8 h-6 rounded-sm border ${
                      isNight ? 'bg-[#1e1f28] border-[#35363f]' : 'bg-slate-700 border-slate-500'
                    }`}>
                      <div className="h-0.5 mt-1.5 bg-teal-400/40 rounded-sm mx-auto" style={{ width: '80%' }} />
                      <div className="h-0.5 mt-0.5 bg-slate-400/30 rounded-sm mx-auto" style={{ width: '60%' }} />
                    </div>
                    <div className={`w-1.5 h-2 ${isNight ? 'bg-[#2a3a5a]' : 'bg-slate-500'}`} />
                    <div className={`w-4 h-0.5 rounded ${isNight ? 'bg-[#2a3a5a]' : 'bg-slate-400'}`} />
                  </div>
                ))}
              </div>

              {workAgents.length === 0 ? (
                renderEmptyRoom(t('office.emptyWorkRoom'))
              ) : (
                <div className="flex flex-wrap gap-3 p-2 pt-8 items-end justify-center h-full overflow-y-auto">
                  {workAgents.map(agent => (
                    <motion.div
                      key={agent.id}
                      layoutId={agent.id}
                      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                    >
                      <AgentDesk
                        agent={agent}
                        onClick={() => setSelectedAgent(agent)}
                        isNight={isNight}
                        seated
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Alt satır — %45 */}
            <div className="flex-[45] flex gap-1.5 min-h-0">

              {/* Kahve Köşesi — sol yarı */}
              <div className={`flex-1 rounded-xl border ${roomStyle.coffee} relative overflow-hidden`}>
                <div className="room-glass-edge" />
                {renderRoomLabel('☕', t('office.coffeeCorner'), coffeeAgents.length)}

                {/* Dekoratif — CSS kahve istasyonu */}
                <div className="absolute bottom-3 right-3 flex items-end gap-2 opacity-25 pointer-events-none">
                  {/* Kahve makinesi */}
                  <div className={`w-8 h-10 rounded-lg border flex flex-col items-center justify-center gap-1 ${
                    isNight ? 'bg-[#1e1f28] border-[#35363f]' : 'bg-slate-600 border-slate-500'
                  }`}>
                    <div className="w-4 h-3 rounded-sm bg-slate-800/60" />
                    <div className="w-3 h-3 rounded-full bg-amber-600/70" />
                  </div>
                  {/* Bardak */}
                  <div className={`w-4 h-5 rounded-t-lg border border-b-0 ${
                    isNight ? 'border-[#35363f]' : 'border-slate-400'
                  }`} />
                  {/* Bitki */}
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-4 rounded-full ${isNight ? 'bg-green-800/50' : 'bg-green-600/50'}`} />
                    <div className={`w-4 h-2 rounded-sm ${isNight ? 'bg-[#1e1f28]' : 'bg-slate-400/60'}`} />
                  </div>
                </div>

                {coffeeAgents.length === 0 ? (
                  renderEmptyRoom(t('office.emptyCoffeeCorner'))
                ) : (
                  <div className="flex flex-wrap gap-3 p-2 pt-8 items-end justify-center h-full overflow-y-auto">
                    {coffeeAgents.map(agent => (
                      <motion.div
                        key={agent.id}
                        layoutId={agent.id}
                        className="animal-walking"
                        style={{ animationDelay: `${getWalkDelay(agent.id)}s` }}
                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                      >
                        <AgentDesk
                          agent={agent}
                          onClick={() => setSelectedAgent(agent)}
                          isNight={isNight}
                          showDesk={false}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Toplantı Odası — sağ yarı */}
              <div className={`flex-1 rounded-xl border ${roomStyle.meeting} relative overflow-hidden`}>
                <div className="room-glass-edge" />
                {renderRoomLabel('🤝', t('office.meetingRoom'), meetingAgents.length)}

                {/* Dekoratif — konferans masası */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                  <div
                    className={`meeting-table-active rounded-[2rem] border ${
                      isNight
                        ? 'bg-[#1e1f28]/40 border-[#2a2b35]/40'
                        : 'bg-white/30 border-slate-200/50'
                    }`}
                    style={{
                      width: '60%',
                      height: '45%',
                      backdropFilter: 'blur(4px)',
                      boxShadow: isNight
                        ? '0 4px 32px rgba(30,58,95,0.3), inset 0 1px 0 rgba(74,138,255,0.1)'
                        : '0 4px 24px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)',
                    }}
                  >
                    <div className="w-4/5 h-px mx-auto mt-3 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  </div>
                </div>

                {meetingAgents.length === 0 ? (
                  renderEmptyRoom(t('office.emptyMeetingRoom'))
                ) : (
                  <div className="flex flex-wrap gap-3 p-2 pt-8 items-end justify-center h-full overflow-y-auto relative z-10">
                    {meetingAgents.map(agent => (
                      <motion.div
                        key={agent.id}
                        layoutId={agent.id}
                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                      >
                        <AgentDesk
                          agent={agent}
                          onClick={() => setSelectedAgent(agent)}
                          isNight={isNight}
                          showDesk={false}
                          seated
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </LayoutGroup>
      )}

      {/* Alt toolbar — glassmorphism */}
      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between z-20">
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border shadow-sm ${
            isNight
              ? 'bg-[#14151a]/80 border-[#2a2b35]/80 text-slate-300'
              : 'bg-white/75 border-white/60 text-slate-500'
          }`}
          style={!isNight ? { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' } : undefined}
        >
          <span className="text-xs font-semibold">
            {t('office.agentProjectStats', { agentCount: office.agents.length, projectCount: office.projects.length })}
          </span>
          {workAgents.length > 0 && (
            <span className="text-xs text-[#7eb5a6] font-bold">
              {t('office.workingCount', { count: workAgents.length })}
            </span>
          )}
          {coffeeAgents.length > 0 && (
            <span className="text-xs opacity-50">
              ☕ {coffeeAgents.length}
            </span>
          )}
          {meetingAgents.length > 0 && (
            <span className="text-xs opacity-50">
              🤝 {meetingAgents.length}
            </span>
          )}
        </div>
        <motion.button
          className="w-12 h-12 bg-[#7eb5a6] text-white rounded-full shadow-lg flex items-center justify-center text-2xl font-bold"
          style={{ boxShadow: '0 4px 14px rgba(126,181,166,0.5)' }}
          onClick={() => setShowAddAgent(true)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          +
        </motion.button>
      </div>

      {/* Modal — ajan ekle */}
      {showAddAgent && (
        <AgentModal
          officeId={office.id}
          projects={office.projects}
          onClose={() => setShowAddAgent(false)}
          onSave={() => { setShowAddAgent(false); onOfficeUpdate() }}
        />
      )}

      {/* Modal — ajan düzenle */}
      {selectedAgent && (
        <AgentModal
          officeId={office.id}
          agent={selectedAgent}
          projects={office.projects}
          onClose={() => setSelectedAgent(null)}
          onSave={() => { setSelectedAgent(null); onOfficeUpdate() }}
          onDelete={() => { setSelectedAgent(null); onOfficeUpdate() }}
        />
      )}

      {/* Proje paneli */}
      {showProjects && (
        <ProjectPanel
          office={office}
          onClose={() => setShowProjects(false)}
          onUpdate={onOfficeUpdate}
          isNight={isNight}
        />
      )}

      {/* Dashboard paneli */}
      {showDashboard && (
        <DashboardPanel
          office={office}
          onClose={() => setShowDashboard(false)}
          isNight={isNight}
        />
      )}

      {/* Session Replay */}
      {showReplay && (
        <SessionReplayPanel
          office={office}
          onClose={() => setShowReplay(false)}
          isNight={isNight}
        />
      )}

      {/* Yardim / Kullanim Kilavuzu */}
      {showHelp && (
        <HelpPanel
          onClose={() => setShowHelp(false)}
          isNight={isNight}
        />
      )}

      {/* Proje tamamlanma modalı */}
      {completedProject && (
        <ProjectCompleteModal
          summary={completedProject}
          onClose={() => setCompletedProject(null)}
          isNight={isNight}
        />
      )}
    </div>
  )
}
