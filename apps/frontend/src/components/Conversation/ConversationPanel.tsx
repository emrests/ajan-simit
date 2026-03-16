import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { api } from '../../hooks/useApi'
import { ANIMAL_EMOJIS, STATUS_LABELS } from '@smith/types'
import type { Office } from '@smith/types'

interface ConversationPanelProps {
  office: Office | null
  isNight?: boolean
}

// Mesaj tipi -> gorsel ayar
const MSG_STYLES: Record<string, { border: string; bg: string; icon: string; labelKey: string }> = {
  chat:      { border: 'border-slate-200',   bg: 'bg-white',          icon: '\u{1F4AC}', labelKey: 'conversation.msgChat' },
  task:      { border: 'border-amber-200',   bg: 'bg-amber-50',       icon: '\u{1F4CB}', labelKey: 'conversation.msgTask' },
  result:    { border: 'border-emerald-200', bg: 'bg-emerald-50',     icon: '\u2705',    labelKey: 'conversation.msgResult' },
  system:    { border: 'border-slate-200',   bg: 'bg-slate-50',       icon: '\u2699\uFE0F', labelKey: 'conversation.msgSystem' },
  assistant: { border: 'border-blue-200',    bg: 'bg-blue-50',        icon: '\u{1F916}', labelKey: 'conversation.msgClaude' },
  tool:      { border: 'border-violet-200',  bg: 'bg-violet-50',      icon: '\u{1F527}', labelKey: 'conversation.msgTool' },
  error:     { border: 'border-red-200',     bg: 'bg-red-50',         icon: '\u274C',    labelKey: 'conversation.msgError' },
}

const FILTERS = [
  { val: 'all',       labelKey: 'conversation.filterAll',    dot: 'bg-slate-400' },
  { val: 'assistant', labelKey: 'conversation.filterClaude', dot: 'bg-blue-400' },
  { val: 'tool',      labelKey: 'conversation.filterTool',   dot: 'bg-violet-400' },
  { val: 'task',      labelKey: 'conversation.filterTask',   dot: 'bg-amber-400' },
  { val: 'result',    labelKey: 'conversation.filterResult', dot: 'bg-emerald-400' },
  { val: 'system',    labelKey: 'conversation.filterSystem', dot: 'bg-slate-400' },
]

// Tool adi -> emoji
const TOOL_ICONS: Record<string, string> = {
  Bash: '\u{1F4BB}', Write: '\u270D\uFE0F', Edit: '\u270F\uFE0F', Read: '\u{1F4D6}',
  Glob: '\u{1F50D}', Grep: '\u{1F50E}', WebFetch: '\u{1F310}', WebSearch: '\u{1F50D}',
  Task: '\u{1F916}', TodoWrite: '\u{1F4DD}', NotebookEdit: '\u{1F4D3}',
}

function parseToolCall(content: string, t: (key: string) => string): { tool: string; detail: string } | null {
  // "$ command" -> bash
  if (content.startsWith('$ ')) return { tool: 'Bash', detail: content.slice(2) }
  if (content.startsWith('\u{270D}\uFE0F ') || content.startsWith('Yaz\u0131yor: ')) {
    const prefix = content.startsWith('\u{270D}\uFE0F ') ? '\u{270D}\uFE0F ' : 'Yaz\u0131yor: '
    return { tool: 'Write', detail: `${t('conversation.toolWriting')}${content.slice(prefix.length)}` }
  }
  if (content.startsWith('D\u00FCzenliyor: ')) return { tool: 'Edit', detail: `${t('conversation.toolEditing')}${content.slice(12)}` }
  if (content.startsWith('Okuyor: ')) return { tool: 'Read', detail: `${t('conversation.toolReading')}${content.slice(8)}` }
  if (content.startsWith('\u{1F310} ')) return { tool: 'WebFetch', detail: content.slice(3) }
  // Stream-json tool_use mesajlari
  const streamMatch = content.match(/^(?:\u{1F4BB}|\u{270D}\uFE0F|\u{270F}\uFE0F|\u{1F4D6}|\u{1F50D}|\u{1F50E}|\u{1F310}|\u{1F916}|\u{1F4DD}|\u{1F4D3}|\u{1F527})\s+(\w+)\s+kullan\u0131yor/u)
  if (streamMatch) return { tool: streamMatch[1], detail: `${t('conversation.toolUsing')} ${t('conversation.toolRunning')}` }
  if (content.startsWith('Alt g\u00F6rev: ')) return { tool: 'Task', detail: `${t('conversation.toolSubtask')}${content.slice(11)}` }
  const toolMatch = content.match(/^(\w+)\.\.\./)
  if (toolMatch) return { tool: toolMatch[1], detail: '' }
  return null
}

function HandoffCard({ msg }: { msg: any }) {
  const { t, i18n } = useTranslation()
  const text = msg.content.replace(/^\u26D3\s*/, '')
  const locale = i18n.language === 'tr' ? 'tr-TR' : 'en-US'
  return (
    <motion.div
      className="rounded-2xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-3 py-2.5 text-xs"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, type: 'spring' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{'\u26D3'}</span>
        <span className="font-black text-orange-700 text-[11px]">{t('conversation.handoffTitle')}</span>
        <span className="ml-auto text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-bold">{t('conversation.handoffBadge')}</span>
      </div>
      <p className="text-orange-800 leading-relaxed font-medium">{text}</p>
      <p className="text-[9px] text-orange-400 mt-1 text-right">
        {new Date(msg.timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
    </motion.div>
  )
}

function CompletionCard({ msg, agentMap }: { msg: any; agentMap: Record<string, any> }) {
  const { t, i18n } = useTranslation()
  const fromAgent = agentMap[msg.fromAgentId]
  const locale = i18n.language === 'tr' ? 'tr-TR' : 'en-US'
  return (
    <motion.div
      className="rounded-2xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 px-3 py-2.5 text-xs"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, type: 'spring' }}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{'\u{1F389}'}</span>
        <div className="flex-1">
          <p className="font-black text-green-700 text-[11px]">
            {fromAgent
              ? `${ANIMAL_EMOJIS[fromAgent.animal as keyof typeof ANIMAL_EMOJIS] ?? '\u{1F916}'} ${fromAgent.name}`
              : msg.fromAgentName} {'\u2014'} {t('conversation.completed')}
          </p>
          <p className="text-[9px] text-green-500 mt-0.5">
            {new Date(msg.timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
        <span className="text-lg">{'\u2705'}</span>
      </div>
    </motion.div>
  )
}

function AgentToAgentCard({ msg, agentMap }: { msg: any; agentMap: Record<string, any> }) {
  const { t, i18n } = useTranslation()
  const fromAgent = agentMap[msg.fromAgentId]
  const locale = i18n.language === 'tr' ? 'tr-TR' : 'en-US'
  return (
    <motion.div
      className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 px-3 py-2.5 text-xs"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, type: 'spring' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{'\u{1F4AC}'}</span>
        <span className="font-black text-indigo-700 text-[11px]">
          {fromAgent
            ? `${ANIMAL_EMOJIS[fromAgent.animal as keyof typeof ANIMAL_EMOJIS] ?? '\u{1F916}'} ${fromAgent.name}`
            : msg.fromAgentName}
        </span>
        <span className="ml-auto text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold">{t('conversation.agentToAgent')}</span>
      </div>
      <p className="text-indigo-800 leading-relaxed font-medium whitespace-pre-wrap">{msg.content}</p>
      <p className="text-[9px] text-indigo-400 mt-1 text-right">
        {new Date(msg.timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
    </motion.div>
  )
}

function ApprovalResponseCard({ msg }: { msg: any }) {
  const { t, i18n } = useTranslation()
  const isApproved = msg.content.includes('ONAYLANDI')
  const locale = i18n.language === 'tr' ? 'tr-TR' : 'en-US'
  return (
    <motion.div
      className={`rounded-2xl border-2 px-3 py-2.5 text-xs ${
        isApproved
          ? 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50'
          : 'border-red-200 bg-gradient-to-r from-red-50 to-rose-50'
      }`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, type: 'spring' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{isApproved ? '\u2705' : '\u274C'}</span>
        <span className={`font-black text-[11px] ${isApproved ? 'text-emerald-700' : 'text-red-700'}`}>
          {t('conversation.approvalResponse')}
        </span>
        <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
          isApproved ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
        }`}>
          {isApproved ? t('conversation.approved') : t('conversation.rejected')}
        </span>
      </div>
      <p className={`leading-relaxed font-medium ${isApproved ? 'text-emerald-800' : 'text-red-800'}`}>
        {msg.content.replace(/^[\u2705\u274C]\s*Onay yan\u0131t\u0131:\s*/, '')}
      </p>
      <p className={`text-[9px] mt-1 text-right ${isApproved ? 'text-emerald-400' : 'text-red-400'}`}>
        {new Date(msg.timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
    </motion.div>
  )
}

function ApprovalRequestCard({ msg, agentMap }: { msg: any; agentMap: Record<string, any> }) {
  const { t, i18n } = useTranslation()
  const [responding, setResponding] = useState(false)
  const [responded, setResponded] = useState(false)
  const fromAgent = agentMap[msg.fromAgentId]
  const description = msg.content.replace(/^\u{1F514}\s*Onay iste\u011Fi:\s*/u, '')
  const locale = i18n.language === 'tr' ? 'tr-TR' : 'en-US'

  const handleRespond = async (status: 'approved' | 'rejected') => {
    setResponding(true)
    try {
      const projects = await api.getProjects(msg.officeId || '')
      for (const project of projects) {
        const approvals = await api.getApprovals(project.id)
        const pending = approvals.find(a => a.fromAgentId === msg.fromAgentId && a.status === 'pending')
        if (pending) {
          await api.respondApproval(pending.id, { status })
          setResponded(true)
          return
        }
      }
    } catch (e) {
      console.error('Approval response error:', e)
    } finally {
      setResponding(false)
    }
  }

  return (
    <motion.div
      className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 px-3 py-2.5 text-xs"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, type: 'spring' }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base">{'\u{1F514}'}</span>
        <span className="font-black text-amber-700 text-[11px]">
          {fromAgent
            ? `${ANIMAL_EMOJIS[fromAgent.animal as keyof typeof ANIMAL_EMOJIS] ?? '\u{1F916}'} ${fromAgent.name}`
            : msg.fromAgentName} {'\u2014'} {t('conversation.approvalRequest')}
        </span>
        <span className="ml-auto text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold animate-pulse">
          {responded ? t('conversation.approvalResponded') : t('conversation.approvalPending')}
        </span>
      </div>
      <p className="text-amber-800 leading-relaxed font-medium mb-2">{description}</p>
      {!responded && (
        <div className="flex gap-2">
          <button
            onClick={() => handleRespond('approved')}
            disabled={responding}
            className="flex-1 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black disabled:opacity-50 transition-colors"
          >
            {responding ? '\u23F3' : `\u2705 ${t('conversation.approve')}`}
          </button>
          <button
            onClick={() => handleRespond('rejected')}
            disabled={responding}
            className="flex-1 py-1.5 rounded-xl bg-red-400 hover:bg-red-500 text-white text-[11px] font-black disabled:opacity-50 transition-colors"
          >
            {responding ? '\u23F3' : `\u274C ${t('conversation.reject')}`}
          </button>
        </div>
      )}
      <p className="text-[9px] text-amber-400 mt-1 text-right">
        {new Date(msg.timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
    </motion.div>
  )
}

function MessageBubble({ msg, agentMap, officeId }: { msg: any; agentMap: Record<string, any>; officeId?: string }) {
  const { t, i18n } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const fromAgent = agentMap[msg.fromAgentId]
  const locale = i18n.language === 'tr' ? 'tr-TR' : 'en-US'

  // Ozel kart: handoff bildirimi
  if (msg.type === 'system' && msg.content.startsWith('\u26D3')) {
    return <HandoffCard msg={msg} />
  }
  // Ozel kart: tamamlandi bildirimi
  if (msg.type === 'system' && msg.content === '\u2705 G\u00F6rev tamamland\u0131!') {
    return <CompletionCard msg={msg} agentMap={agentMap} />
  }
  // Ajan-Ajan mesaj karti
  if (msg.type === 'agent-to-agent') {
    return <AgentToAgentCard msg={msg} agentMap={agentMap} />
  }
  // Onay istegi karti (butonlarla)
  if (msg.type === 'approval-request') {
    return <ApprovalRequestCard msg={{...msg, officeId}} agentMap={agentMap} />
  }
  // Onay yaniti karti
  if (msg.type === 'approval-response') {
    return <ApprovalResponseCard msg={msg} />
  }

  const style = MSG_STYLES[msg.type] ?? MSG_STYLES.chat
  const toolInfo = msg.type === 'tool' ? parseToolCall(msg.content, t) : null
  const isLong = msg.content.length > 120
  const showContent = !isLong || expanded

  return (
    <motion.div
      className={`rounded-2xl border px-3 py-2 text-xs ${style.border} ${style.bg}`}
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Baslik */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm">{style.icon}</span>
        <span className="font-bold text-slate-800 truncate">
          {fromAgent
            ? `${ANIMAL_EMOJIS[fromAgent.animal as keyof typeof ANIMAL_EMOJIS] ?? '\u{1F916}'} ${fromAgent.name}`
            : msg.fromAgentName || t('common.system')}
        </span>
        <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
          msg.type === 'assistant' ? 'bg-blue-100 text-blue-600' :
          msg.type === 'tool' ? 'bg-violet-100 text-violet-600' :
          msg.type === 'system' ? 'bg-slate-100 text-slate-500' :
          msg.type === 'result' ? 'bg-emerald-100 text-emerald-600' :
          'bg-slate-100 text-slate-500'
        }`}>
          {t(style.labelKey)}
        </span>
      </div>

      {/* Tool call gorunumu */}
      {msg.type === 'tool' || parseToolCall(msg.content, t) ? (
        <div className="font-mono text-[10px] bg-[#1a1a2e] text-green-300 rounded-lg px-2 py-1.5 mt-1 overflow-hidden">
          <span className="text-purple-300">
            {TOOL_ICONS[toolInfo?.tool ?? ''] ?? '\u26A1'} {toolInfo?.tool ?? ''}
          </span>
          {toolInfo?.detail && (
            <span className="text-green-200 ml-1 truncate block">{toolInfo.detail}</span>
          )}
          {!toolInfo && <span className="text-green-200">{msg.content}</span>}
        </div>
      ) : (
        /* Normal icerik */
        <div>
          <p className={`text-slate-700 leading-relaxed whitespace-pre-wrap break-words ${!showContent ? 'line-clamp-3' : ''}`}>
            {msg.content}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-[9px] text-[#7eb5a6] font-bold mt-1"
            >
              {expanded ? `\u25B2 ${t('conversation.collapse')}` : `\u25BC ${t('conversation.showAll')}`}
            </button>
          )}
        </div>
      )}

      {/* Zaman */}
      <p className="text-[9px] text-slate-400 mt-1 text-right">
        {new Date(msg.timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
    </motion.div>
  )
}

export function ConversationPanel({ office, isNight = false }: ConversationPanelProps) {
  const { t, i18n } = useTranslation()
  const { messages, wsConnected } = useStore()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const agentMap = Object.fromEntries((office?.agents ?? []).map((a) => [a.id, a]))

  const activeAgents = (office?.agents ?? []).filter(a => a.status !== 'idle')

  const filteredMessages = filter === 'all'
    ? messages
    : messages.filter(m => m.type === filter)

  return (
    <div className={`w-80 flex flex-col transition-colors duration-300 ${isNight ? 'bg-[#0a1628] border-l border-[#1e3a5f]' : 'bg-[#f8f9fb] border-l border-slate-200'}`}>
      {/* Baslik */}
      <div className={`px-4 py-3 border-b ${isNight ? 'bg-[#0f1b2e] border-[#1e3a5f]' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          <h3 className={`font-black text-sm ${isNight ? 'text-blue-100' : 'text-slate-800'}`}>{t('conversation.activity')}</h3>
          <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold ${isNight ? 'bg-[#1e3a5f] text-blue-300' : 'bg-slate-100 text-slate-500'}`}>{messages.length}</span>
        </div>

        {/* Aktif ajan ozeti */}
        {activeAgents.length > 0 && (
          <div className="mt-2 space-y-1">
            {activeAgents.map(agent => (
              <div key={agent.id} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${isNight ? 'bg-[#162a4a]' : 'bg-slate-50 border border-slate-100'}`}>
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  agent.status === 'typing' ? 'bg-blue-400 animate-pulse' :
                  agent.status === 'thinking' ? 'bg-amber-400 animate-pulse' :
                  agent.status === 'reading' ? 'bg-violet-400 animate-pulse' :
                  'bg-slate-400'
                }`} />
                <span className={`text-[10px] font-bold shrink-0 ${isNight ? 'text-blue-100' : 'text-slate-700'}`}>
                  {ANIMAL_EMOJIS[agent.animal as keyof typeof ANIMAL_EMOJIS] ?? '\u{1F916}'} {agent.name}
                </span>
                <span className={`text-[9px] truncate ${isNight ? 'text-blue-300/70' : 'text-slate-400'}`}>
                  {agent.currentTask ?? STATUS_LABELS[agent.status]}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Filtreler */}
        <div className="flex gap-1 mt-2.5 overflow-x-auto pb-0.5">
          {FILTERS.map(({ val, labelKey, dot }) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              title={t('conversation.filterTitle', { label: t(labelKey) })}
              className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                filter === val
                  ? 'bg-[#7eb5a6] text-white shadow-sm'
                  : isNight
                  ? 'bg-[#1e3a5f]/60 text-blue-300 hover:bg-[#264a70]'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
              }`}
              style={filter === val ? { boxShadow: '0 2px 8px rgba(126,181,166,0.4)' } : undefined}
            >
              {val !== 'all' && (
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${filter === val ? 'bg-white/60' : dot}`} />
              )}
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Mesajlar */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">
              {wsConnected ? (activeAgents.length > 0 ? '\u26A1' : '\u{1F4AC}') : '\u{1F50C}'}
            </div>
            <p className={`text-xs font-semibold ${isNight ? 'text-blue-300/60' : 'text-slate-400'}`}>
              {!wsConnected ? t('conversation.noConnection') :
               filter !== 'all' ? t('conversation.noMsgType') :
               t('conversation.noActivity')}
            </p>
            {wsConnected && filter === 'all' && (
              <p className={`text-[10px] mt-1 px-4 text-center leading-relaxed ${isNight ? 'text-blue-400/40' : 'text-slate-300'}`}>
                {t('conversation.noActivityHint')}
              </p>
            )}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredMessages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} agentMap={agentMap} officeId={office?.id} />
            ))}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Alt bilgi */}
      <div className={`px-3 py-2 border-t flex items-center gap-2 ${isNight ? 'border-[#1e3a5f]' : 'border-slate-200 bg-white/50'}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
        <span className={`text-[10px] ${isNight ? 'text-blue-300/60' : 'text-slate-400'}`}>
          {wsConnected ? t('conversation.liveConnection') : t('conversation.disconnected')}
        </span>
        {activeAgents.length > 0 && (
          <span className="ml-auto text-[9px] text-[#7eb5a6] font-bold">
            {'\u26A1'} {t('conversation.agentsWorking', { count: activeAgents.length })}
          </span>
        )}
      </div>
    </div>
  )
}
