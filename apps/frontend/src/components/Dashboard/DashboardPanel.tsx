import React, { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import type { Office, DashboardStats, AgentCostStats } from '@smith/types'
import { ANIMAL_EMOJIS, STATUS_LABELS } from '@smith/types'
import { useStore } from '../../store/useStore'
import { api } from '../../hooks/useApi'

interface DashboardPanelProps {
  office: Office
  onClose: () => void
  isNight: boolean
}

type DashboardTab = 'overview' | 'costs' | 'tools' | 'agents' | 'timeline'

const STATUS_COLORS: Record<string, { dot: string; badge: string; text: string }> = {
  idle:       { dot: 'bg-gray-300',   badge: 'bg-gray-100 text-gray-500',     text: 'text-gray-400' },
  thinking:   { dot: 'bg-yellow-400 animate-pulse', badge: 'bg-yellow-100 text-yellow-700', text: 'text-yellow-600' },
  typing:     { dot: 'bg-blue-400 animate-pulse',   badge: 'bg-blue-100 text-blue-700',     text: 'text-blue-600' },
  reading:    { dot: 'bg-purple-400 animate-pulse', badge: 'bg-purple-100 text-purple-700', text: 'text-purple-600' },
  celebrating:{ dot: 'bg-green-400 animate-bounce', badge: 'bg-green-100 text-green-700',   text: 'text-green-600' },
  waiting:    { dot: 'bg-gray-300',   badge: 'bg-gray-100 text-gray-400',     text: 'text-gray-400' },
}

const TAB_DEFS: { key: DashboardTab; labelKey: string; icon: string }[] = [
  { key: 'overview', labelKey: 'dashboard.tabOverview', icon: '📊' },
  { key: 'costs',    labelKey: 'dashboard.tabCosts',    icon: '💰' },
  { key: 'tools',    labelKey: 'dashboard.tabTools',    icon: '🔧' },
  { key: 'agents',   labelKey: 'dashboard.tabAgents',   icon: '👥' },
  { key: 'timeline', labelKey: 'dashboard.tabTimeline', icon: '⏱' },
]

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  if (usd < 1) return `$${usd.toFixed(3)}`
  return `$${usd.toFixed(2)}`
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  const s = sec % 60
  return `${min}m ${s}s`
}

// Basit bar chart bileşeni
function BarChart({ data, maxVal, color, isNight }: {
  data: { label: string; value: number; extra?: string }[]
  maxVal: number
  color: string
  isNight: boolean
}) {
  return (
    <div className="space-y-1.5">
      {data.map(item => (
        <div key={item.label} className="flex items-center gap-2">
          <span className={`text-[9px] w-16 truncate text-right font-semibold ${isNight ? 'text-blue-200' : 'text-[#3d2b1f]'}`}>
            {item.label}
          </span>
          <div className={`flex-1 h-4 rounded-full overflow-hidden ${isNight ? 'bg-[#2a3a5a]' : 'bg-[#e8d5c4]'}`}>
            <motion.div
              className={`h-full rounded-full ${color}`}
              initial={{ width: 0 }}
              animate={{ width: maxVal > 0 ? `${(item.value / maxVal) * 100}%` : '0%' }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className={`text-[9px] w-14 font-bold ${isNight ? 'text-blue-300' : 'text-[#7a5c3f]'}`}>
            {item.extra ?? item.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// Mini spark bar (günlük kullanım)
function SparkBars({ data, isNight }: { data: { date: string; tokens: number; cost: number }[]; isNight: boolean }) {
  const maxTokens = Math.max(...data.map(d => d.tokens), 1)
  return (
    <div className="flex items-end gap-0.5 h-16">
      {data.map(d => (
        <div
          key={d.date}
          className="flex-1 group relative"
          title={`${d.date}\nToken: ${formatTokens(d.tokens)}\n${formatCost(d.cost)}`}
        >
          <motion.div
            className={`w-full rounded-t ${isNight ? 'bg-blue-400' : 'bg-[#7eb5a6]'} group-hover:opacity-80`}
            initial={{ height: 0 }}
            animate={{ height: `${Math.max((d.tokens / maxTokens) * 100, 4)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      ))}
    </div>
  )
}

function AgentCard({ agent }: { agent: Office['agents'][0] }) {
  const colors = STATUS_COLORS[agent.status] ?? STATUS_COLORS.idle
  const emoji = ANIMAL_EMOJIS[agent.animal as keyof typeof ANIMAL_EMOJIS] ?? '🤖'
  const isActive = agent.status !== 'idle'

  return (
    <motion.div
      className={`rounded-2xl border-2 p-3 ${isActive ? 'border-[#7eb5a6] bg-[#7eb5a6]/5' : 'border-[#e8d5c4] bg-white'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start gap-2">
        <div className="relative shrink-0">
          <div className="text-2xl">{emoji}</div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${colors.dot}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-black text-[#3d2b1f] text-sm truncate">{agent.name}</p>
            {agent.sessionPid && (
              <span className="text-[8px] bg-green-100 text-green-600 px-1 py-0.5 rounded-full font-bold shrink-0">
                PID {agent.sessionPid}
              </span>
            )}
          </div>
          <p className="text-[10px] text-[#a08060] truncate">{agent.role}</p>
          <span className={`inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${colors.badge}`}>
            {STATUS_LABELS[agent.status] ?? agent.status}
          </span>
          {agent.currentTask && (
            <p className={`text-[9px] mt-1 truncate font-medium ${colors.text}`}>
              {agent.currentTask}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function ProjectCard({ project }: { project: Office['projects'][0] }) {
  const { t } = useTranslation()
  const allTasks = project.tasks ?? []
  const doneTasks = allTasks.filter(t => t.status === 'done')
  const inProgressTasks = allTasks.filter(t => t.status === 'in_progress')
  const pct = allTasks.length > 0 ? Math.round((doneTasks.length / allTasks.length) * 100) : 0

  const statusColor =
    project.status === 'done' ? 'text-green-600 bg-green-100' :
    project.status === 'active' ? 'text-blue-600 bg-blue-100' :
    'text-gray-500 bg-gray-100'

  const statusLabel =
    project.status === 'done' ? t('dashboard.projectCompleted') :
    project.status === 'active' ? t('dashboard.projectActive') :
    t('dashboard.projectPlanning')

  return (
    <motion.div
      className="rounded-2xl border-2 border-[#e8d5c4] bg-white p-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-black text-[#3d2b1f] text-sm truncate">{project.name}</p>
          {project.workDir && (
            <p className="text-[9px] text-[#a08060] truncate font-mono mt-0.5">{project.workDir}</p>
          )}
        </div>
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {allTasks.length > 0 && (
        <>
          <div className="flex justify-between mb-1">
            <span className="text-[9px] text-[#a08060]">{t('dashboard.projectProgress')}</span>
            <span className="text-[9px] font-black text-[#7a5c3f]">{pct}%</span>
          </div>
          <div className="h-2 bg-[#e8d5c4] rounded-full overflow-hidden mb-2">
            <motion.div
              className={`h-full rounded-full ${pct === 100 ? 'bg-green-400' : 'bg-[#7eb5a6]'}`}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, type: 'spring' }}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="text-[9px] text-green-600 font-semibold">{t('dashboard.projectDone', { count: doneTasks.length })}</span>
            {inProgressTasks.length > 0 && (
              <span className="text-[9px] text-blue-500 font-semibold">{t('dashboard.projectContinue', { count: inProgressTasks.length })}</span>
            )}
            <span className="text-[9px] text-[#a08060]">{t('dashboard.projectTotal', { count: allTasks.length })}</span>
          </div>
        </>
      )}

      {allTasks.length === 0 && (
        <p className="text-[9px] text-[#c8a882] italic">{t('dashboard.projectNoTasks')}</p>
      )}
    </motion.div>
  )
}

export function DashboardPanel({ office, onClose, isNight }: DashboardPanelProps) {
  const { t } = useTranslation()
  const { messages } = useStore()
  const [tab, setTab] = useState<DashboardTab>('overview')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(false)

  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getDashboardStats(office.id)
      setStats(data)
    } catch (e) {
      console.error('Dashboard stats yuklenemedi:', e)
    } finally {
      setLoading(false)
    }
  }, [office.id])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const activeAgents = office.agents.filter(a => a.status !== 'idle')
  const runningSessions = office.agents.filter(a => a.sessionPid)
  const allTasks = office.projects.flatMap(p => p.tasks ?? [])
  const doneTasks = allTasks.filter(t => t.status === 'done')
  const inProgressTasks = allTasks.filter(t => t.status === 'in_progress')
  const totalPct = allTasks.length > 0 ? Math.round((doneTasks.length / allTasks.length) * 100) : 0

  const timeline = [...messages].reverse().slice(0, 15)

  // Export
  const handleExportCsv = () => { api.exportMetrics(office.id, 'csv') }
  const handleExportJson = async () => {
    try {
      const data = await api.exportMetrics(office.id, 'json')
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `smith-metrics-${office.id}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {}
  }
  const handleExportMd = () => {
    const now = new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    const lines: string[] = [
      `# ${office.name} -- Proje Raporu`,
      `> Olusturulma: ${now}`,
      '', '---', '',
      '## Ozet', '',
      `| Metrik | Deger |`,
      `|--------|-------|`,
      `| Toplam Ajan | ${office.agents.length} |`,
      `| Aktif Ajan | ${activeAgents.length} |`,
      `| Toplam Proje | ${office.projects.length} |`,
      `| Toplam Gorev | ${allTasks.length} |`,
      `| Tamamlanan | ${doneTasks.length} (${totalPct}%) |`,
    ]
    if (stats) {
      lines.push(`| Toplam Token | ${formatTokens(stats.total.totalTokens)} |`)
      lines.push(`| Toplam Maliyet | ${formatCost(stats.total.costUsd)} |`)
      lines.push(`| Oturum Sayisi | ${stats.total.sessionCount} |`)
    }
    lines.push('', '---', '', '## Ajanlar', '')
    for (const agent of office.agents) {
      const emoji = ANIMAL_EMOJIS[agent.animal as keyof typeof ANIMAL_EMOJIS] ?? ''
      lines.push(`### ${emoji} ${agent.name}`)
      lines.push(`- **Rol:** ${agent.role}`)
      lines.push(`- **Durum:** ${STATUS_LABELS[agent.status] ?? agent.status}`)
      if (agent.model) lines.push(`- **Model:** ${agent.model}`)
      const agentStat = stats?.agents.find(a => a.agentId === agent.id)
      if (agentStat) {
        lines.push(`- **Token:** ${formatTokens(agentStat.totalTokens)} (${formatCost(agentStat.costUsd)})`)
        lines.push(`- **Verimlilik:** ${agentStat.efficiency.toFixed(2)} gorev/K-token`)
      }
      lines.push('')
    }
    const md = lines.join('\n')
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${office.name.replace(/\s+/g, '-')}-rapor-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const cardBg = isNight ? 'bg-[#1a2a4a] border-[#2a3a5a]' : 'bg-white border-[#e8d5c4]'
  const titleColor = isNight ? 'text-blue-100' : 'text-[#3d2b1f]'
  const subColor = isNight ? 'text-blue-300' : 'text-[#a08060]'

  return (
    <AnimatePresence>
      <motion.div
        className="absolute inset-0 z-40 flex flex-col"
        style={{ background: isNight ? 'rgba(10,15,30,0.97)' : 'rgba(250,247,244,0.97)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Baslik */}
        <div className={`flex items-center gap-3 px-6 py-3 border-b-2 ${isNight ? 'border-[#2a3a5a]' : 'border-[#e8d5c4]'}`}>
          <span className="text-2xl">📊</span>
          <div>
            <h2 className={`font-black text-lg ${titleColor}`}>{t('dashboard.title')}</h2>
            <p className={`text-[10px] ${subColor}`}>{t('dashboard.subtitle', { name: office.name })}</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={handleExportMd}
              className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-colors ${isNight ? 'bg-[#1a2a4a] hover:bg-[#2a3a5a] text-blue-200 border border-[#2a3a5a]' : 'bg-[#f5e6d3] hover:bg-[#e8d5c4] text-[#7a5c3f] border border-[#e8d5c4]'}`}
            >MD</button>
            <button onClick={handleExportCsv}
              className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-colors ${isNight ? 'bg-[#1a2a4a] hover:bg-[#2a3a5a] text-blue-200 border border-[#2a3a5a]' : 'bg-[#f5e6d3] hover:bg-[#e8d5c4] text-[#7a5c3f] border border-[#e8d5c4]'}`}
            >CSV</button>
            <button onClick={handleExportJson}
              className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-colors ${isNight ? 'bg-[#1a2a4a] hover:bg-[#2a3a5a] text-blue-200 border border-[#2a3a5a]' : 'bg-[#f5e6d3] hover:bg-[#e8d5c4] text-[#7a5c3f] border border-[#e8d5c4]'}`}
            >JSON</button>
            <button onClick={loadStats}
              className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-colors ${isNight ? 'bg-[#1a2a4a] hover:bg-[#2a3a5a] text-blue-200 border border-[#2a3a5a]' : 'bg-[#f5e6d3] hover:bg-[#e8d5c4] text-[#7a5c3f] border border-[#e8d5c4]'}`}
              title={t('common.refresh')}
            >{loading ? '...' : t('common.refresh')}</button>
            <button onClick={onClose}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-lg transition-colors ${isNight ? 'hover:bg-[#2a3a5a] text-blue-300' : 'hover:bg-[#f5e6d3] text-[#7a5c3f]'}`}
            >x</button>
          </div>
        </div>

        {/* Sekmeler */}
        <div className={`flex gap-1 px-6 py-2 border-b ${isNight ? 'border-[#2a3a5a]' : 'border-[#e8d5c4]'}`}>
          {TAB_DEFS.map(td => (
            <button
              key={td.key}
              onClick={() => setTab(td.key)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-colors ${
                tab === td.key
                  ? (isNight ? 'bg-blue-600 text-white' : 'bg-[#7eb5a6] text-white')
                  : (isNight ? 'text-blue-300 hover:bg-[#2a3a5a]' : 'text-[#7a5c3f] hover:bg-[#f5e6d3]')
              }`}
            >
              {td.icon} {t(td.labelKey)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* ===== GENEL BAKIS ===== */}
          {tab === 'overview' && (
            <>
              {/* Ozet istatistikler */}
              <div className="grid grid-cols-5 gap-3 mb-6">
                {[
                  { icon: '👥', value: office.agents.length, labelKey: 'dashboard.agent', color: 'text-[#7eb5a6]' },
                  { icon: '⚡', value: activeAgents.length, labelKey: 'dashboard.activeLabel', color: 'text-yellow-500' },
                  { icon: '🖥️', value: runningSessions.length, labelKey: 'dashboard.session', color: 'text-blue-500' },
                  { icon: '✅', value: `${totalPct}%`, labelKey: 'dashboard.completedLabel', color: 'text-green-500' },
                  { icon: '💰', value: stats ? formatCost(stats.total.costUsd) : '-', labelKey: 'dashboard.cost', color: 'text-orange-500' },
                ].map(stat => (
                  <div key={stat.labelKey} className={`rounded-2xl border-2 p-3 text-center ${cardBg}`}>
                    <div className="text-xl mb-1">{stat.icon}</div>
                    <div className={`font-black text-lg ${stat.color}`}>{stat.value}</div>
                    <div className={`text-[9px] font-semibold ${subColor}`}>{t(stat.labelKey)}</div>
                  </div>
                ))}
              </div>

              {/* Gorev ilerleme cubugu */}
              {allTasks.length > 0 && (
                <div className={`rounded-2xl border-2 p-4 mb-6 ${cardBg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-black text-sm ${titleColor}`}>{t('dashboard.allTasks')}</span>
                    <span className={`text-xs font-black ${isNight ? 'text-blue-200' : 'text-[#7a5c3f]'}`}>
                      {doneTasks.length} / {allTasks.length}
                    </span>
                  </div>
                  <div className={`h-3 rounded-full overflow-hidden ${isNight ? 'bg-[#2a3a5a]' : 'bg-[#e8d5c4]'}`}>
                    <motion.div
                      className={`h-full rounded-full ${totalPct === 100 ? 'bg-green-400' : 'bg-[#7eb5a6]'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${totalPct}%` }}
                      transition={{ duration: 0.8, type: 'spring' }}
                    />
                  </div>
                  <div className="flex gap-3 mt-2">
                    <span className="text-[10px] text-green-500 font-semibold">{t('dashboard.completed', { count: doneTasks.length })}</span>
                    <span className="text-[10px] text-blue-500 font-semibold">{t('dashboard.inProgress', { count: inProgressTasks.length })}</span>
                    <span className="text-[10px] text-[#a08060]">{t('dashboard.waiting', { count: allTasks.length - doneTasks.length - inProgressTasks.length })}</span>
                  </div>
                </div>
              )}

              {/* Token + Maliyet ozeti */}
              {stats && (
                <div className={`rounded-2xl border-2 p-4 mb-6 ${cardBg}`}>
                  <h3 className={`font-black text-sm mb-3 ${titleColor}`}>{t('dashboard.tokenCostSummary')}</h3>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="text-center">
                      <div className={`text-[10px] ${subColor}`}>Input</div>
                      <div className={`font-black text-sm ${titleColor}`}>{formatTokens(stats.total.inputTokens)}</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-[10px] ${subColor}`}>Output</div>
                      <div className={`font-black text-sm ${titleColor}`}>{formatTokens(stats.total.outputTokens)}</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-[10px] ${subColor}`}>{t('dashboard.total')}</div>
                      <div className={`font-black text-sm ${titleColor}`}>{formatTokens(stats.total.totalTokens)}</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-[10px] ${subColor}`}>{t('dashboard.session')}</div>
                      <div className={`font-black text-sm ${titleColor}`}>{stats.total.sessionCount}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Gunluk kullanim grafigi */}
              {stats && stats.dailyUsage.length > 0 && (
                <div className={`rounded-2xl border-2 p-4 mb-6 ${cardBg}`}>
                  <h3 className={`font-black text-sm mb-3 ${titleColor}`}>{t('dashboard.last30Days')}</h3>
                  <SparkBars data={stats.dailyUsage} isNight={isNight} />
                  <div className="flex justify-between mt-1">
                    <span className={`text-[8px] ${subColor}`}>{stats.dailyUsage[0]?.date ?? ''}</span>
                    <span className={`text-[8px] ${subColor}`}>{stats.dailyUsage[stats.dailyUsage.length - 1]?.date ?? ''}</span>
                  </div>
                </div>
              )}

              {/* Projeler grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className={`font-black text-sm mb-3 ${titleColor}`}>{t('dashboard.tabAgents')}</h3>
                  {office.agents.length === 0 ? (
                    <p className={`text-xs ${subColor} italic`}>{t('dashboard.noAgents')}</p>
                  ) : (
                    <div className="space-y-2">
                      {office.agents.map(agent => <AgentCard key={agent.id} agent={agent} />)}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className={`font-black text-sm mb-3 ${titleColor}`}>{t('office.projects')}</h3>
                  {office.projects.length === 0 ? (
                    <p className={`text-xs ${subColor} italic`}>{t('dashboard.noProjects')}</p>
                  ) : (
                    <div className="space-y-2">
                      {office.projects.map(project => <ProjectCard key={project.id} project={project} />)}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ===== MALIYET SEKMESI ===== */}
          {tab === 'costs' && stats && (
            <>
              {/* Toplam maliyet */}
              <div className={`rounded-2xl border-2 p-4 mb-6 ${cardBg}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`font-black text-sm ${titleColor}`}>{t('dashboard.totalCost')}</h3>
                  <span className="text-2xl font-black text-orange-500">{formatCost(stats.total.costUsd)}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className={`text-[10px] ${subColor}`}>Input Token</div>
                    <div className={`font-bold text-xs ${titleColor}`}>{formatTokens(stats.total.inputTokens)}</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-[10px] ${subColor}`}>Output Token</div>
                    <div className={`font-bold text-xs ${titleColor}`}>{formatTokens(stats.total.outputTokens)}</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-[10px] ${subColor}`}>{t('dashboard.session')}</div>
                    <div className={`font-bold text-xs ${titleColor}`}>{stats.total.sessionCount}</div>
                  </div>
                </div>
              </div>

              {/* Ajan bazli maliyet siralamasi */}
              <div className={`rounded-2xl border-2 p-4 mb-6 ${cardBg}`}>
                <h3 className={`font-black text-sm mb-3 ${titleColor}`}>{t('dashboard.agentCost')}</h3>
                {stats.agents.length === 0 ? (
                  <p className={`text-xs ${subColor} italic`}>{t('common.noData')}</p>
                ) : (
                  <BarChart
                    data={stats.agents.map(a => ({
                      label: `${ANIMAL_EMOJIS[a.animal as keyof typeof ANIMAL_EMOJIS] ?? ''} ${a.agentName}`,
                      value: a.costUsd,
                      extra: formatCost(a.costUsd),
                    }))}
                    maxVal={Math.max(...stats.agents.map(a => a.costUsd), 0.001)}
                    color={isNight ? 'bg-orange-400' : 'bg-orange-400'}
                    isNight={isNight}
                  />
                )}
              </div>

              {/* Gunluk maliyet */}
              {stats.dailyUsage.length > 0 && (
                <div className={`rounded-2xl border-2 p-4 ${cardBg}`}>
                  <h3 className={`font-black text-sm mb-3 ${titleColor}`}>{t('dashboard.dailyCostTrend')}</h3>
                  <div className="space-y-1">
                    {stats.dailyUsage.slice(-10).map(d => (
                      <div key={d.date} className="flex items-center gap-2">
                        <span className={`text-[9px] w-20 ${subColor}`}>{d.date}</span>
                        <div className={`flex-1 h-3 rounded-full overflow-hidden ${isNight ? 'bg-[#2a3a5a]' : 'bg-[#e8d5c4]'}`}>
                          <motion.div
                            className="h-full rounded-full bg-orange-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max((d.cost / Math.max(...stats.dailyUsage.map(x => x.cost), 0.001)) * 100, 2)}%` }}
                          />
                        </div>
                        <span className={`text-[9px] w-16 text-right font-bold ${isNight ? 'text-blue-300' : 'text-[#7a5c3f]'}`}>
                          {formatCost(d.cost)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ===== ARAC KULLANIMI SEKMESI ===== */}
          {tab === 'tools' && stats && (
            <div className={`rounded-2xl border-2 p-4 ${cardBg}`}>
              <h3 className={`font-black text-sm mb-3 ${titleColor}`}>{t('dashboard.toolUsageStats')}</h3>
              {stats.toolUsage.length === 0 ? (
                <p className={`text-xs ${subColor} italic`}>{t('dashboard.noToolData')}</p>
              ) : (
                <>
                  <BarChart
                    data={stats.toolUsage.map(tu => ({
                      label: tu.toolName,
                      value: tu.count,
                      extra: `${tu.count} (%${tu.percentage})`,
                    }))}
                    maxVal={Math.max(...stats.toolUsage.map(tu => tu.count), 1)}
                    color={isNight ? 'bg-purple-400' : 'bg-purple-400'}
                    isNight={isNight}
                  />
                  <div className={`mt-4 text-[10px] ${subColor}`}>
                    {t('dashboard.toolUsageTotal', { count: stats.toolUsage.reduce((s, tu) => s + tu.count, 0), unique: stats.toolUsage.length })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ===== AJAN PERFORMANS SEKMESI ===== */}
          {tab === 'agents' && stats && (
            <>
              {stats.agents.length === 0 ? (
                <p className={`text-xs ${subColor} italic`}>{t('common.noData')}</p>
              ) : (
                <div className="space-y-3">
                  {stats.agents.map((a: AgentCostStats) => {
                    const emoji = ANIMAL_EMOJIS[a.animal as keyof typeof ANIMAL_EMOJIS] ?? ''
                    return (
                      <div key={a.agentId} className={`rounded-2xl border-2 p-4 ${cardBg}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">{emoji}</span>
                          <div>
                            <p className={`font-black text-sm ${titleColor}`}>{a.agentName}</p>
                            <p className={`text-[9px] ${subColor}`}>
                              {t('dashboard.agentSessions', { count: a.sessionCount, tasks: a.tasksDone })}
                            </p>
                          </div>
                          <div className="ml-auto text-right">
                            <p className="font-black text-sm text-orange-500">{formatCost(a.costUsd)}</p>
                            <p className={`text-[9px] ${subColor}`}>{formatTokens(a.totalTokens)} token</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          <div className={`text-center rounded-xl p-2 ${isNight ? 'bg-[#0f1929]' : 'bg-[#faf7f4]'}`}>
                            <div className={`text-[9px] ${subColor}`}>Input</div>
                            <div className={`font-bold text-[10px] ${titleColor}`}>{formatTokens(a.inputTokens)}</div>
                          </div>
                          <div className={`text-center rounded-xl p-2 ${isNight ? 'bg-[#0f1929]' : 'bg-[#faf7f4]'}`}>
                            <div className={`text-[9px] ${subColor}`}>Output</div>
                            <div className={`font-bold text-[10px] ${titleColor}`}>{formatTokens(a.outputTokens)}</div>
                          </div>
                          <div className={`text-center rounded-xl p-2 ${isNight ? 'bg-[#0f1929]' : 'bg-[#faf7f4]'}`}>
                            <div className={`text-[9px] ${subColor}`}>{t('dashboard.avgPerSession')}</div>
                            <div className={`font-bold text-[10px] ${titleColor}`}>{formatTokens(a.avgTokensPerSession)}</div>
                          </div>
                          <div className={`text-center rounded-xl p-2 ${isNight ? 'bg-[#0f1929]' : 'bg-[#faf7f4]'}`}>
                            <div className={`text-[9px] ${subColor}`}>{t('dashboard.efficiency')}</div>
                            <div className={`font-bold text-[10px] ${a.efficiency > 0.5 ? 'text-green-500' : a.efficiency > 0 ? 'text-yellow-500' : titleColor}`}>
                              {a.efficiency > 0 ? `${a.efficiency.toFixed(2)}` : '-'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ===== AKTIVITE ZAMAN CIZELGESI ===== */}
          {tab === 'timeline' && (
            <div className={`rounded-2xl border-2 p-4 ${cardBg}`}>
              <h3 className={`font-black text-sm mb-3 ${titleColor}`}>{t('dashboard.recentActivities')}</h3>
              {timeline.length === 0 ? (
                <p className={`text-xs ${subColor} italic`}>{t('dashboard.noActivities')}</p>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {timeline.map(msg => {
                    const msgType = (msg as any).type as string
                    const typeIcon =
                      msgType === 'system' ? '⚙️' :
                      msgType === 'result' ? '✅' :
                      msgType === 'chat' ? '💬' :
                      msgType === 'agent-to-agent' ? '🤝' :
                      msgType === 'approval-request' ? '🔔' :
                      msgType === 'approval-response' ? '✔️' : '📌'
                    const typeColor =
                      msgType === 'system' ? (isNight ? 'text-gray-400' : 'text-gray-500') :
                      msgType === 'result' ? 'text-green-500' :
                      msgType === 'agent-to-agent' ? 'text-purple-500' : 'text-[#a08060]'

                    return (
                      <div key={msg.id} className="flex items-start gap-2">
                        <span className="text-sm shrink-0 mt-0.5">{typeIcon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold truncate ${isNight ? 'text-blue-200' : 'text-[#3d2b1f]'}`}>
                              {msg.fromAgentName || t('common.system')}
                            </span>
                            <span className={`text-[9px] shrink-0 ${typeColor}`}>
                              {new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                          <p className={`text-[9px] truncate ${isNight ? 'text-blue-300' : 'text-[#7a5c3f]'}`}>
                            {msg.content.slice(0, 120)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Stats loading fallback */}
          {!stats && tab !== 'timeline' && tab !== 'overview' && (
            <div className={`rounded-2xl border-2 p-8 text-center ${cardBg}`}>
              <p className={`text-sm ${subColor}`}>{loading ? t('dashboard.loadingData') : t('common.noData')}</p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
