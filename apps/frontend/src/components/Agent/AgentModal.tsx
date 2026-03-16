import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import type { Agent, AnimalType, Project, Skill, MCPServer, MCPTransport, Subagent, TrainingProfile } from '@smith/types'
import { ANIMAL_LABELS, ANIMAL_EMOJIS, SKILL_CATEGORIES, TURN_PROFILES, EFFORT_PROFILES, CLAUDE_TOOLS, PERMISSION_PROFILES, MCP_TRANSPORT_LABELS, MCP_SERVER_TEMPLATES, SUBAGENT_TEMPLATES } from '@smith/types'
import { AnimalSVG } from '../../animals/AnimalSVG'
import { api } from '../../hooks/useApi'

const ANIMAL_TYPES: AnimalType[] = [
  'bear', 'fox', 'raccoon', 'owl', 'elephant',
  'octopus', 'rabbit', 'squirrel', 'cat', 'dog',
]

const CLAUDE_MODEL_KEYS: { id: string; labelKey: string; emoji: string }[] = [
  { id: '', labelKey: 'agent.modelDefault', emoji: '' },
  { id: 'claude-opus-4-6', labelKey: 'agent.modelOpus', emoji: '⚡ ' },
  { id: 'claude-sonnet-4-6', labelKey: 'agent.modelSonnet', emoji: '🔄' },
  { id: 'claude-haiku-4-5-20251001', labelKey: 'agent.modelHaiku', emoji: '🚀' },
]

interface AgentModalProps {
  officeId: string
  agent?: Agent
  projects?: Project[]
  onClose: () => void
  onSave: () => void
  onDelete?: () => void
}

export function AgentModal({ officeId, agent, projects = [], onClose, onSave, onDelete }: AgentModalProps) {
  const { t } = useTranslation()
  const isEdit = !!agent
  const [name, setName] = useState(agent?.name ?? '')
  const [role, setRole] = useState(agent?.role ?? '')
  const [animal, setAnimal] = useState<AnimalType>(agent?.animal ?? 'cat')
  const [systemPrompt, setSystemPrompt] = useState(agent?.systemPrompt ?? '')
  const [model, setModel] = useState(agent?.model ?? '')
  const [maxTurns, setMaxTurns] = useState(agent?.maxTurns ?? 0)
  // Faz 11 — Gelişmiş ayarlar
  const [effortLevel, setEffortLevel] = useState(agent?.effortLevel ?? '')
  const [allowedTools, setAllowedTools] = useState<string[]>(agent?.allowedTools ?? [])
  const [disallowedTools, setDisallowedTools] = useState<string[]>(agent?.disallowedTools ?? [])
  const [environmentVars, setEnvironmentVars] = useState<Record<string, string>>(agent?.environmentVars ?? {})
  const [appendSystemPrompt, setAppendSystemPrompt] = useState(agent?.appendSystemPrompt ?? '')
  const [systemPromptFile, setSystemPromptFile] = useState(agent?.systemPromptFile ?? '')
  const [outputSchema, setOutputSchema] = useState(agent?.outputSchema ?? '')
  const [newEnvKey, setNewEnvKey] = useState('')
  const [newEnvValue, setNewEnvValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Claude Code entegrasyonu
  const [activeTab, setActiveTab] = useState<'profile' | 'advanced' | 'session' | 'transcript' | 'skills' | 'mcp' | 'subagent' | 'training'>('profile')
  const [watchPath, setWatchPath] = useState(agent?.watchPath ?? '')
  const [sessionTask, setSessionTask] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [sessionWorkDir, setSessionWorkDir] = useState('')
  const [sessionStatus, setSessionStatus] = useState<{ active: boolean; pid?: number } | null>(null)
  const [sessionLoading, setSessionLoading] = useState(false)
  const [jsonlFiles, setJsonlFiles] = useState<{ path: string; project: string; mtime: string; size: number }[]>([])
  const [showJsonlPicker, setShowJsonlPicker] = useState(false)
  const [jsonlScanLoading, setJsonlScanLoading] = useState(false)

  // Transcript
  const [transcriptEntries, setTranscriptEntries] = useState<any[]>([])
  const [transcriptLoading, setTranscriptLoading] = useState(false)
  const [transcriptPath, setTranscriptPath] = useState<string | null>(null)

  // Skills
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [agentSkills, setAgentSkills] = useState<Skill[]>([])
  const [skillsLoading, setSkillsLoading] = useState(false)
  const [showSkillCreator, setShowSkillCreator] = useState(false)
  const [newSkillName, setNewSkillName] = useState('')
  const [newSkillDesc, setNewSkillDesc] = useState('')
  const [newSkillContent, setNewSkillContent] = useState('')
  const [newSkillCategory, setNewSkillCategory] = useState('general')
  const [skillImportText, setSkillImportText] = useState('')
  const [showSkillImport, setShowSkillImport] = useState(false)
  const [showGitHubImport, setShowGitHubImport] = useState(false)
  const [ghRepoUrl, setGhRepoUrl] = useState('')
  const [ghBranch, setGhBranch] = useState('')
  const [ghPathFilter, setGhPathFilter] = useState('')
  const [ghImporting, setGhImporting] = useState(false)
  const [ghResult, setGhResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null)

  // Faz 13 — MCP Servers
  const [allMcpServers, setAllMcpServers] = useState<MCPServer[]>([])
  const [agentMcpServers, setAgentMcpServers] = useState<MCPServer[]>([])
  const [mcpLoading, setMcpLoading] = useState(false)
  const [showMcpCreator, setShowMcpCreator] = useState(false)
  const [newMcpName, setNewMcpName] = useState('')
  const [newMcpDesc, setNewMcpDesc] = useState('')
  const [newMcpTransport, setNewMcpTransport] = useState<MCPTransport>('stdio')
  const [newMcpCommand, setNewMcpCommand] = useState('')
  const [newMcpUrl, setNewMcpUrl] = useState('')
  const [newMcpArgs, setNewMcpArgs] = useState('')
  const [newMcpEnvKey, setNewMcpEnvKey] = useState('')
  const [newMcpEnvVal, setNewMcpEnvVal] = useState('')
  const [newMcpEnvPairs, setNewMcpEnvPairs] = useState<Record<string, string>>({})
  const [mcpTestResults, setMcpTestResults] = useState<Record<string, { status: string; message: string }>>({})
  // Faz 16 — Subagent
  const [allSubagents, setAllSubagents] = useState<Subagent[]>([])
  const [subagentPreview, setSubagentPreview] = useState('')
  const [showSubagentCreator, setShowSubagentCreator] = useState(false)
  const [newSubName, setNewSubName] = useState('')
  const [newSubDesc, setNewSubDesc] = useState('')
  const [newSubPrompt, setNewSubPrompt] = useState('')
  const [newSubModel, setNewSubModel] = useState('')
  const [newSubMaxTurns, setNewSubMaxTurns] = useState(0)
  const [newSubAllowed, setNewSubAllowed] = useState<string[]>([])
  const [newSubDisallowed, setNewSubDisallowed] = useState<string[]>([])
  const [newSubScope, setNewSubScope] = useState<'project' | 'user'>('project')

  // Faz 21 — Training
  const [trainingProfiles, setTrainingProfiles] = useState<TrainingProfile[]>([])
  const [selectedTrainingId, setSelectedTrainingId] = useState(agent?.trainingProfileId ?? '')
  const [trainingLoading, setTrainingLoading] = useState(false)

  useEffect(() => {
    if (isEdit && agent && activeTab === 'session') {
      api.getSessionStatus(agent.id).then(setSessionStatus).catch(() => {})
    }
    if (isEdit && agent && activeTab === 'transcript') {
      loadTranscript()
    }
    if (isEdit && agent && activeTab === 'skills') {
      loadSkills()
    }
    if (isEdit && agent && activeTab === 'mcp') {
      loadMcpServers()
    }
    if (isEdit && agent && activeTab === 'subagent') {
      loadSubagents()
    }
    if (activeTab === 'training') {
      loadTrainingProfiles()
    }
  }, [isEdit, agent, activeTab])

  const loadSkills = async () => {
    if (!agent) return
    setSkillsLoading(true)
    try {
      const [all, attached] = await Promise.all([
        api.getSkills(),
        api.getAgentSkills(agent.id),
      ])
      setAllSkills(all)
      setAgentSkills(attached)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSkillsLoading(false)
    }
  }

  const handleAttachSkill = async (skillId: string) => {
    if (!agent) return
    try {
      await api.attachSkill(agent.id, skillId)
      await loadSkills()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleDetachSkill = async (skillId: string) => {
    if (!agent) return
    try {
      await api.detachSkill(agent.id, skillId)
      await loadSkills()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleCreateSkill = async () => {
    if (!newSkillName.trim()) return
    try {
      await api.createSkill({
        name: newSkillName,
        description: newSkillDesc,
        content: newSkillContent,
        category: newSkillCategory,
      })
      setNewSkillName('')
      setNewSkillDesc('')
      setNewSkillContent('')
      setNewSkillCategory('general')
      setShowSkillCreator(false)
      await loadSkills()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleImportSkill = async () => {
    if (!skillImportText.trim()) return
    try {
      await api.importSkill(skillImportText)
      setSkillImportText('')
      setShowSkillImport(false)
      await loadSkills()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleGitHubImport = async () => {
    if (!ghRepoUrl.trim()) return
    setGhImporting(true)
    setGhResult(null)
    try {
      const result = await api.importSkillsFromRepo(
        ghRepoUrl.trim(),
        ghBranch.trim() || undefined,
        ghPathFilter.trim() || undefined
      )
      setGhResult({ created: result.created, skipped: result.skipped, errors: result.errors })
      if (result.created > 0) await loadSkills()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGhImporting(false)
    }
  }

  const handleDeleteSkill = async (skillId: string) => {
    if (!confirm(t('confirm.deleteSkill'))) return
    try {
      await api.deleteSkill(skillId)
      await loadSkills()
    } catch (e: any) {
      setError(e.message)
    }
  }

  // Faz 13 — MCP Server yönetimi
  const loadMcpServers = async () => {
    if (!agent) return
    setMcpLoading(true)
    try {
      const [all, attached] = await Promise.all([
        api.getMcpServers(),
        api.getAgentMcpServers(agent.id),
      ])
      setAllMcpServers(all)
      setAgentMcpServers(attached)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setMcpLoading(false)
    }
  }

  const handleAttachMcp = async (mcpServerId: string) => {
    if (!agent) return
    try {
      await api.attachMcpServer(agent.id, mcpServerId)
      await loadMcpServers()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleDetachMcp = async (mcpServerId: string) => {
    if (!agent) return
    try {
      await api.detachMcpServer(agent.id, mcpServerId)
      await loadMcpServers()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleCreateMcpServer = async () => {
    if (!newMcpName.trim()) return
    setMcpLoading(true)
    try {
      const argsArray = newMcpArgs.trim() ? newMcpArgs.split(/\s+/) : []
      await api.createMcpServer({
        name: newMcpName,
        description: newMcpDesc,
        transport: newMcpTransport,
        command: newMcpCommand || undefined,
        url: newMcpUrl || undefined,
        args: argsArray,
        env: newMcpEnvPairs,
      })
      setNewMcpName('')
      setNewMcpDesc('')
      setNewMcpCommand('')
      setNewMcpUrl('')
      setNewMcpArgs('')
      setNewMcpEnvPairs({})
      setShowMcpCreator(false)
      await loadMcpServers()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setMcpLoading(false)
    }
  }

  const handleDeleteMcpServer = async (id: string) => {
    try {
      await api.deleteMcpServer(id)
      await loadMcpServers()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleTestMcpServer = async (id: string) => {
    try {
      const result = await api.testMcpServer(id)
      setMcpTestResults(prev => ({ ...prev, [id]: result }))
    } catch (e: any) {
      setMcpTestResults(prev => ({ ...prev, [id]: { status: 'error', message: e.message } }))
    }
  }

  const handleApplyMcpTemplate = async (templateIdx: number) => {
    const tpl = MCP_SERVER_TEMPLATES[templateIdx]
    if (!tpl) return
    setNewMcpName(tpl.name)
    setNewMcpDesc(tpl.description)
    setNewMcpTransport(tpl.transport)
    setNewMcpCommand(tpl.command)
    setNewMcpArgs(tpl.args?.join(' ') ?? '')
    const envPairs: Record<string, string> = {}
    tpl.envKeys?.forEach(k => { envPairs[k] = '' })
    setNewMcpEnvPairs(envPairs)
    setShowMcpCreator(true)
  }

  // Faz 16 — Subagent handlers
  const loadSubagents = async () => {
    try {
      const subs = await api.getSubagents()
      setAllSubagents(subs)
    } catch {}
  }

  const loadTrainingProfiles = async () => {
    setTrainingLoading(true)
    try {
      const profiles = await api.getTrainingProfiles()
      setTrainingProfiles(profiles.filter(p => p.status === 'done'))
    } catch {}
    setTrainingLoading(false)
  }

  const handleTrainingChange = async (profileId: string) => {
    setSelectedTrainingId(profileId)
    if (!agent) return
    try {
      if (profileId) {
        await api.setAgentTraining(agent.id, profileId)
      } else {
        await api.removeAgentTraining(agent.id)
      }
    } catch {}
  }

  const handleCreateSubagent = async () => {
    if (!newSubName) return
    try {
      await api.createSubagent({
        name: newSubName,
        description: newSubDesc,
        prompt: newSubPrompt,
        model: newSubModel || undefined,
        maxTurns: newSubMaxTurns || undefined,
        allowedTools: newSubAllowed.length > 0 ? newSubAllowed : undefined,
        disallowedTools: newSubDisallowed.length > 0 ? newSubDisallowed : undefined,
        scope: newSubScope,
      } as any)
      setShowSubagentCreator(false)
      setNewSubName(''); setNewSubDesc(''); setNewSubPrompt('')
      setNewSubModel(''); setNewSubMaxTurns(0)
      setNewSubAllowed([]); setNewSubDisallowed([])
      await loadSubagents()
    } catch {}
  }

  const handleApplySubagentTemplate = (idx: number) => {
    const tpl = SUBAGENT_TEMPLATES[idx]
    if (!tpl) return
    setNewSubName(tpl.name)
    setNewSubDesc(tpl.description)
    setNewSubPrompt(tpl.prompt)
    setNewSubModel(tpl.model || '')
    setNewSubMaxTurns(tpl.maxTurns || 0)
    setNewSubAllowed(tpl.allowedTools || [])
    setNewSubDisallowed(tpl.disallowedTools || [])
    setShowSubagentCreator(true)
  }

  const handleBindSubagent = async (subId: string) => {
    if (!agent) return
    await api.updateAgent(agent.id, { subagentId: subId } as any)
    onSave()
  }

  const handleUnbindSubagent = async () => {
    if (!agent) return
    await api.updateAgent(agent.id, { subagentId: '' } as any)
    onSave()
  }

  const handleAgentToSubagent = async () => {
    if (!agent) return
    try {
      await api.agentToSubagent(agent.id)
      await loadSubagents()
    } catch {}
  }

  const loadTranscript = async () => {
    if (!agent) return
    setTranscriptLoading(true)
    try {
      const result = await api.getTranscript(agent.id)
      setTranscriptEntries(result.entries)
      setTranscriptPath(result.path)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setTranscriptLoading(false)
    }
  }

  const handleScanJsonlFiles = async () => {
    setJsonlScanLoading(true)
    try {
      const result = await api.listJsonlFiles()
      setJsonlFiles(result.files)
      setShowJsonlPicker(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setJsonlScanLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  }

  const formatRelativeTime = (isoStr: string) => {
    const diff = Date.now() - new Date(isoStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return t('agent.relativeTimeJustNow')
    if (mins < 60) return t('agent.relativeTimeMinutes', { count: mins })
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return t('agent.relativeTimeHours', { count: hrs })
    return t('agent.relativeTimeDays', { count: Math.floor(hrs / 24) })
  }

  const handleSave = async () => {
    if (!name.trim() || !role.trim()) {
      setError(t('agent.nameRequired'))
      return
    }
    setLoading(true)
    setError('')
    try {
      const payload = {
        name, role, animal, systemPrompt, model, maxTurns,
        effortLevel: effortLevel || undefined,
        allowedTools, disallowedTools, environmentVars,
        appendSystemPrompt: appendSystemPrompt || undefined,
        systemPromptFile: systemPromptFile || undefined,
        outputSchema: outputSchema || undefined,
      }
      if (isEdit) {
        await api.updateAgent(agent!.id, payload as any)
      } else {
        await api.createAgent(officeId, payload as any)
      }
      onSave()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!agent || !confirm(t('confirm.deleteAgent', { name: agent.name }))) return
    setLoading(true)
    try {
      await api.deleteAgent(agent.id)
      onDelete?.()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSetWatchPath = async () => {
    if (!agent) return
    setSessionLoading(true)
    try {
      await api.setWatchPath(agent.id, watchPath || null)
      setError('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSessionLoading(false)
    }
  }

  const handleStartSession = async () => {
    if (!agent || !sessionTask.trim()) return
    setSessionLoading(true)
    try {
      await api.startSession(agent.id, sessionWorkDir || '.', sessionTask)
      const status = await api.getSessionStatus(agent.id)
      setSessionStatus(status)
      setSessionTask('')
      onSave()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSessionLoading(false)
    }
  }

  const handleStopSession = async () => {
    if (!agent) return
    setSessionLoading(true)
    try {
      await api.stopSession(agent.id)
      setSessionStatus({ active: false })
      onSave()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSessionLoading(false)
    }
  }

  const inputCls = 'w-full px-4 py-2.5 rounded-2xl border-2 border-[#e8d5c4] focus:border-[#7eb5a6] outline-none text-sm font-semibold text-[#3d2b1f] bg-[#faf7f4]'

  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        className="bg-white rounded-4xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#7eb5a6] to-[#6aa596] px-6 py-4 flex items-center justify-between shrink-0">
          <h3 className="text-white font-black text-lg">
            {isEdit ? `✏️ ${t('agent.editTitle', { name: agent!.name })}` : `➕ ${t('agent.addTitle')}`}
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Sekmeler — sadece düzenleme modunda */}
        {isEdit && (
          <div className="flex border-b border-[#e8d5c4] shrink-0">
            {[
              { id: 'profile', label: `👤 ${t('agent.tabProfile')}` },
              { id: 'advanced', label: `⚙️ ${t('agent.tabAdvanced')}` },
              { id: 'skills', label: `🧩 ${t('agent.tabSkills')}`, badge: false, count: agentSkills.length },
              { id: 'mcp', label: `🔌 ${t('agent.tabMcp')}`, badge: false, count: agentMcpServers.length },
              { id: 'subagent', label: `🤖 ${t('agent.tabSubagent')}`, badge: false, count: agent?.subagentId ? 1 : 0 },
              { id: 'training', label: `🎓 ${t('agent.tabTraining')}`, badge: false, count: agent?.trainingProfileId ? 1 : 0 },
              { id: 'session', label: `⚡ ${t('agent.tabSession')}`, badge: sessionStatus?.active },
              { id: 'transcript', label: `📜 ${t('agent.tabTranscript')}` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-2.5 text-xs font-bold transition-colors ${
                  activeTab === tab.id
                    ? 'text-[#7eb5a6] border-b-2 border-[#7eb5a6]'
                    : 'text-[#a08060]'
                }`}
              >
                {tab.label}
                {tab.badge && (
                  <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                )}
                {'count' in tab && (tab as any).count > 0 && (
                  <span className="ml-1 text-[9px] bg-[#7eb5a6] text-white rounded-full px-1.5 py-0.5 font-bold">
                    {(tab as any).count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="overflow-y-auto flex-1">
          {/* Profil sekmesi */}
          {activeTab === 'profile' && (
            <div className="p-6 space-y-5">
              {/* Karakter önizleme */}
              <div className="flex justify-center">
                <div className="bg-[#f5e6d3] rounded-3xl p-4 flex flex-col items-center gap-2">
                  <div className="animal-idle">
                    <AnimalSVG animal={animal} status="idle" size={90} />
                  </div>
                  <span className="text-sm font-bold text-[#7a5c3f]">
                    {ANIMAL_EMOJIS[animal]} {ANIMAL_LABELS[animal]}
                  </span>
                </div>
              </div>

              {/* Hayvan seçimi */}
              <div>
                <label className="block text-xs font-bold text-[#7a5c3f] mb-2">{t('agent.selectCharacter')}</label>
                <div className="grid grid-cols-5 gap-2">
                  {ANIMAL_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => setAnimal(type)}
                      className={`p-2 rounded-2xl border-2 text-center transition-all ${
                        animal === type
                          ? 'border-[#7eb5a6] bg-[#7eb5a6]/20 scale-105'
                          : 'border-[#e8d5c4] hover:border-[#c8a882] bg-white'
                      }`}
                    >
                      <div className="text-xl">{ANIMAL_EMOJIS[type]}</div>
                      <div className="text-[9px] font-semibold text-[#7a5c3f] mt-0.5">{ANIMAL_LABELS[type]}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* İsim */}
              <div>
                <label className="block text-xs font-bold text-[#7a5c3f] mb-1">{t('agent.agentName')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('agent.agentNamePlaceholder')}
                  className={inputCls}
                />
              </div>

              {/* Rol */}
              <div>
                <label className="block text-xs font-bold text-[#7a5c3f] mb-1">{t('agent.role')}</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder={t('agent.rolePlaceholder')}
                  className={inputCls}
                />
              </div>

              {/* Model seçimi */}
              <div>
                <label className="block text-xs font-bold text-[#7a5c3f] mb-1">
                  {t('agent.model')} <span className="font-normal text-[#a08060]">({t('common.optional')})</span>
                </label>
                <select
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className={inputCls}
                >
                  {CLAUDE_MODEL_KEYS.map(m => (
                    <option key={m.id} value={m.id}>{m.emoji}{t(m.labelKey)}</option>
                  ))}
                </select>
              </div>

              {/* Max Turns */}
              <div>
                <label className="block text-xs font-bold text-[#7a5c3f] mb-1">
                  {t('agent.maxTurns')} <span className="font-normal text-[#a08060]">({t('agent.maxTurnsTokenSave')})</span>
                </label>
                <p className="text-[10px] text-[#a08060] mb-1.5">
                  {t('agent.maxTurnsDesc')}
                </p>
                <div className="flex gap-2">
                  {Object.entries(TURN_PROFILES).map(([key, profile]) => (
                    <button
                      key={key}
                      onClick={() => setMaxTurns(profile.value)}
                      className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold transition-colors ${
                        maxTurns === profile.value
                          ? 'bg-[#7eb5a6] text-white'
                          : 'border border-[#e8d5c4] text-[#7a5c3f] hover:bg-[#f5e6d3]'
                      }`}
                    >
                      {key === 'light' ? t('agent.turnLight') : key === 'normal' ? t('agent.turnNormal') : key === 'heavy' ? t('agent.turnHeavy') : t('agent.turnUnlimited')}
                    </button>
                  ))}
                </div>
                {maxTurns > 0 && ![5, 15, 30].includes(maxTurns) && (
                  <p className="text-[10px] text-[#7eb5a6] mt-1 font-mono">{t('agent.maxTurnsCustom', { count: maxTurns })}</p>
                )}
              </div>

              {/* Sistem prompt */}
              <div>
                <label className="block text-xs font-bold text-[#7a5c3f] mb-1">
                  {t('agent.systemPrompt')} <span className="font-normal text-[#a08060]">({t('common.optional')})</span>
                </label>
                <p className="text-[10px] text-[#a08060] mb-1.5">
                  {t('agent.systemPromptDesc')}
                  <br/><em>{t('agent.systemPromptExample')}</em>
                </p>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder={t('agent.systemPromptPlaceholder')}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#e8d5c4] focus:border-[#7eb5a6] outline-none text-sm text-[#3d2b1f] bg-[#faf7f4] resize-none"
                />
              </div>

              {error && (
                <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Butonlar */}
              <div className="flex gap-3">
                {isEdit && (
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-4 py-2.5 rounded-2xl border-2 border-red-200 text-red-500 hover:bg-red-50 text-sm font-bold transition-colors"
                  >
                    {t('common.delete')}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-2xl border-2 border-[#e8d5c4] text-[#7a5c3f] hover:bg-[#f5e6d3] text-sm font-bold transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-[#7eb5a6] hover:bg-[#6aa596] text-white text-sm font-black transition-colors shadow-md disabled:opacity-50"
                >
                  {loading ? '...' : isEdit ? t('common.save') : t('agent.addAgent')}
                </button>
              </div>
            </div>
          )}

          {/* Gelişmiş sekmesi */}
          {activeTab === 'advanced' && isEdit && (
            <div className="p-6 space-y-5">
              {/* Efor Seviyesi */}
              <div>
                <label className="block text-xs font-bold text-[#7a5c3f] mb-1">
                  {t('agent.effortLevel')} <span className="font-normal text-[#a08060]">({t('agent.maxTurnsTokenSave')})</span>
                </label>
                <p className="text-[10px] text-[#a08060] mb-1.5">
                  {t('agent.effortDesc')}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEffortLevel('')}
                    className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold transition-colors ${
                      !effortLevel ? 'bg-[#7eb5a6] text-white' : 'border border-[#e8d5c4] text-[#7a5c3f] hover:bg-[#f5e6d3]'
                    }`}
                  >
                    {t('common.default')}
                  </button>
                  {Object.entries(EFFORT_PROFILES).map(([key, profile]) => (
                    <button
                      key={key}
                      onClick={() => setEffortLevel(key as any)}
                      className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold transition-colors ${
                        effortLevel === key ? 'bg-[#7eb5a6] text-white' : 'border border-[#e8d5c4] text-[#7a5c3f] hover:bg-[#f5e6d3]'
                      }`}
                      title={key === 'low' ? t('agent.effortLowDesc') : key === 'medium' ? t('agent.effortMediumDesc') : t('agent.effortHighDesc')}
                    >
                      {key === 'low' ? t('agent.effortLow') : key === 'medium' ? t('agent.effortMedium') : t('agent.effortHigh')}
                    </button>
                  ))}
                </div>
              </div>

              {/* İzin Yönetimi */}
              <div>
                <label className="block text-xs font-bold text-[#7a5c3f] mb-1">
                  {t('agent.toolPermissions')}
                </label>
                <p className="text-[10px] text-[#a08060] mb-2">
                  {t('agent.toolPermissionsDesc')}
                </p>
                {/* Hazır profiller */}
                <div className="flex gap-2 mb-2">
                  {Object.entries(PERMISSION_PROFILES).map(([key, profile]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setAllowedTools(profile.allowed)
                        setDisallowedTools(profile.disallowed)
                      }}
                      className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold transition-colors ${
                        JSON.stringify(allowedTools) === JSON.stringify(profile.allowed) && JSON.stringify(disallowedTools) === JSON.stringify(profile.disallowed)
                          ? 'bg-[#7eb5a6] text-white'
                          : 'border border-[#e8d5c4] text-[#7a5c3f] hover:bg-[#f5e6d3]'
                      }`}
                    >
                      {key === 'safe' ? t('agent.permSafe') : key === 'developer' ? t('agent.permDeveloper') : t('agent.permFull')}
                    </button>
                  ))}
                </div>
                {/* İzin verilen araçlar */}
                <div className="p-2 bg-[#faf7f4] rounded-xl border border-[#e8d5c4]">
                  <div className="text-[9px] font-bold text-[#a08060] mb-1">{t('agent.allowedTools')}</div>
                  <div className="flex flex-wrap gap-1">
                    {CLAUDE_TOOLS.map(tool => (
                      <button
                        key={tool}
                        onClick={() => {
                          if (allowedTools.includes(tool)) {
                            setAllowedTools(allowedTools.filter(t => t !== tool))
                          } else {
                            setAllowedTools([...allowedTools, tool])
                            setDisallowedTools(disallowedTools.filter(t => t !== tool))
                          }
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition-colors ${
                          allowedTools.includes(tool)
                            ? 'bg-green-100 text-green-700 border border-green-300'
                            : 'bg-white text-[#a08060] border border-[#e8d5c4] hover:border-green-300'
                        }`}
                      >
                        {tool}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Engellenen araçlar */}
                <div className="p-2 bg-[#faf7f4] rounded-xl border border-[#e8d5c4] mt-1.5">
                  <div className="text-[9px] font-bold text-[#a08060] mb-1">{t('agent.disallowedTools')}</div>
                  <div className="flex flex-wrap gap-1">
                    {CLAUDE_TOOLS.map(tool => (
                      <button
                        key={tool}
                        onClick={() => {
                          if (disallowedTools.includes(tool)) {
                            setDisallowedTools(disallowedTools.filter(t => t !== tool))
                          } else {
                            setDisallowedTools([...disallowedTools, tool])
                            setAllowedTools(allowedTools.filter(t => t !== tool))
                          }
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition-colors ${
                          disallowedTools.includes(tool)
                            ? 'bg-red-100 text-red-700 border border-red-300'
                            : 'bg-white text-[#a08060] border border-[#e8d5c4] hover:border-red-300'
                        }`}
                      >
                        {tool}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Environment Variables */}
              <div>
                <label className="block text-xs font-bold text-[#7a5c3f] mb-1">
                  {t('agent.envVars')}
                </label>
                <p className="text-[10px] text-[#a08060] mb-1.5">
                  {t('agent.envVarsDesc')}
                </p>
                {Object.keys(environmentVars).length > 0 && (
                  <div className="space-y-1 mb-2">
                    {Object.entries(environmentVars).map(([key, val]) => {
                      const isSensitive = /api.key|token|secret|password/i.test(key)
                      return (
                        <div key={key} className="flex items-center gap-1.5 px-2 py-1.5 bg-[#faf7f4] rounded-lg border border-[#e8d5c4]">
                          <span className="text-[10px] font-mono font-bold text-[#3d2b1f] shrink-0">{key}</span>
                          <span className="text-[10px] text-[#a08060]">=</span>
                          <span className="text-[10px] font-mono text-[#7a5c3f] flex-1 truncate">
                            {isSensitive ? '••••••••' : val}
                          </span>
                          <button
                            onClick={() => {
                              const next = { ...environmentVars }
                              delete next[key]
                              setEnvironmentVars(next)
                            }}
                            className="text-red-400 hover:text-red-600 text-[10px] shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newEnvKey}
                    onChange={e => setNewEnvKey(e.target.value)}
                    placeholder="KEY"
                    className="w-1/3 px-2 py-1.5 rounded-lg border border-[#e8d5c4] focus:border-[#7eb5a6] outline-none text-[10px] font-mono text-[#3d2b1f] bg-[#faf7f4]"
                  />
                  <input
                    type="text"
                    value={newEnvValue}
                    onChange={e => setNewEnvValue(e.target.value)}
                    placeholder="value"
                    className="flex-1 px-2 py-1.5 rounded-lg border border-[#e8d5c4] focus:border-[#7eb5a6] outline-none text-[10px] font-mono text-[#3d2b1f] bg-[#faf7f4]"
                  />
                  <button
                    onClick={() => {
                      if (newEnvKey.trim()) {
                        setEnvironmentVars({ ...environmentVars, [newEnvKey.trim()]: newEnvValue })
                        setNewEnvKey('')
                        setNewEnvValue('')
                      }
                    }}
                    disabled={!newEnvKey.trim()}
                    className="px-2 py-1.5 rounded-lg bg-[#7eb5a6] text-white text-[10px] font-bold shrink-0 disabled:opacity-50"
                  >
                    + {t('common.add')}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['ANTHROPIC_API_KEY', 'CLAUDE_CODE_MAX_OUTPUT_TOKENS', 'CLAUDE_CODE_AUTOCOMPACT_PCT_OVERRIDE'].map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        if (!environmentVars[suggestion]) {
                          setNewEnvKey(suggestion)
                        }
                      }}
                      className="text-[9px] text-[#a08060] hover:text-[#7eb5a6] transition-colors"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ek Sistem Prompt */}
              <div>
                <label className="block text-xs font-bold text-[#7a5c3f] mb-1">
                  {t('agent.appendSystemPrompt')} <span className="font-normal text-[#a08060]">({t('agent.appendSystemPromptLabel')})</span>
                </label>
                <p className="text-[10px] text-[#a08060] mb-1.5">
                  {t('agent.appendSystemPromptDesc')}
                </p>
                <textarea
                  value={appendSystemPrompt}
                  onChange={e => setAppendSystemPrompt(e.target.value)}
                  placeholder={t('agent.appendSystemPromptPlaceholder')}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#e8d5c4] focus:border-[#7eb5a6] outline-none text-sm text-[#3d2b1f] bg-[#faf7f4] resize-none"
                />
              </div>

              {/* System Prompt File */}
              <div>
                <label className="block text-xs font-bold text-[#7a5c3f] mb-1">
                  {t('agent.promptFile')} <span className="font-normal text-[#a08060]">({t('agent.promptFileLabel')})</span>
                </label>
                <p className="text-[10px] text-[#a08060] mb-1.5">
                  {t('agent.promptFileDesc')}
                </p>
                <input
                  type="text"
                  value={systemPromptFile}
                  onChange={e => setSystemPromptFile(e.target.value)}
                  placeholder={t('agent.promptFilePlaceholder')}
                  className={inputCls}
                />
              </div>

              {/* Prompt Şablonları Bilgi */}
              <div className="p-3 bg-[#faf7f4] rounded-2xl border border-[#e8d5c4]">
                <div className="text-[10px] font-bold text-[#7a5c3f] mb-1">💡 {t('agent.promptTemplates')}</div>
                <p className="text-[9px] text-[#a08060] leading-relaxed">
                  {t('agent.promptTemplatesDesc')}
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['{{agent.name}}', '{{agent.role}}', '{{project.name}}', '{{project.workDir}}', '{{date}}'].map(v => (
                    <span key={v} className="text-[9px] font-mono bg-white px-1.5 py-0.5 rounded border border-[#e8d5c4] text-[#7eb5a6]">
                      {v}
                    </span>
                  ))}
                </div>
              </div>

              {/* Structured Output */}
              <div>
                <label className="block text-xs font-bold text-[#7a5c3f] mb-1">
                  {t('agent.outputSchema')} <span className="font-normal text-[#a08060]">({t('agent.outputSchemaLabel')})</span>
                </label>
                <p className="text-[10px] text-[#a08060] mb-1.5">
                  {t('agent.outputSchemaDesc')}
                </p>
                <textarea
                  value={outputSchema}
                  onChange={e => setOutputSchema(e.target.value)}
                  placeholder={'{\n  "type": "object",\n  "properties": {\n    "summary": { "type": "string" },\n    "files": { "type": "array" }\n  }\n}'}
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#e8d5c4] focus:border-[#7eb5a6] outline-none text-xs text-[#3d2b1f] bg-[#faf7f4] resize-none font-mono"
                />
                {outputSchema && (() => {
                  try { JSON.parse(outputSchema); return <p className="text-[10px] text-green-600 mt-1">{'✓'} {t('agent.validJson')}</p> }
                  catch { return <p className="text-[10px] text-red-500 mt-1">{'✗'} {t('agent.invalidJson')}</p> }
                })()}
              </div>

              {error && (
                <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Butonlar */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-2xl border-2 border-[#e8d5c4] text-[#7a5c3f] hover:bg-[#f5e6d3] text-sm font-bold transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-[#7eb5a6] hover:bg-[#6aa596] text-white text-sm font-black transition-colors shadow-md disabled:opacity-50"
                >
                  {loading ? '...' : t('common.save')}
                </button>
              </div>
            </div>
          )}

          {/* Claude Code sekmesi */}
          {activeTab === 'session' && isEdit && (
            <div className="p-6 space-y-5">
              {/* Aktif oturum durumu */}
              <div className={`p-4 rounded-2xl border-2 ${sessionStatus?.active ? 'border-green-200 bg-green-50' : 'border-[#e8d5c4] bg-[#faf7f4]'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${sessionStatus?.active ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`} />
                  <span className="text-xs font-black text-[#3d2b1f]">
                    {sessionStatus?.active ? `🟢${t('agent.sessionActive')}` : `⚫ ${t('agent.sessionNone')}`}
                  </span>
                </div>
                {sessionStatus?.active && sessionStatus.pid && (
                  <p className="text-[10px] text-[#7a5c3f] font-mono">PID: {sessionStatus.pid}</p>
                )}
              </div>

              {/* Oturumu durdur */}
              {sessionStatus?.active && (
                <button
                  onClick={handleStopSession}
                  disabled={sessionLoading}
                  className="w-full py-2.5 rounded-2xl border-2 border-red-200 text-red-500 hover:bg-red-50 text-sm font-bold transition-colors disabled:opacity-50"
                >
                  ⏹ {t('agent.stopSession')}
                </button>
              )}

              {/* Yeni oturum başlat */}
              {!sessionStatus?.active && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-[#7a5c3f] uppercase tracking-wider">🚀 {t('agent.startSession')}</h4>

                  <div>
                    <label className="block text-xs font-bold text-[#a08060] mb-1">{t('agent.workDir')}</label>
                    {projects.filter(p => p.workDir).length > 0 ? (
                      <div className="space-y-2">
                        <select
                          value={selectedProjectId}
                          onChange={e => {
                            setSelectedProjectId(e.target.value)
                            if (e.target.value) {
                              const proj = projects.find(p => p.id === e.target.value)
                              if (proj?.workDir) setSessionWorkDir(proj.workDir)
                            } else {
                              setSessionWorkDir('')
                            }
                          }}
                          className={inputCls}
                        >
                          <option value="">{t('agent.selectProject')}</option>
                          {projects.filter(p => p.workDir).map(p => (
                            <option key={p.id} value={p.id}>
                              📁 {p.name} — {p.workDir}
                            </option>
                          ))}
                          <option value="__manual">{'✏️'} {t('agent.manualInput')}</option>
                        </select>
                        {(selectedProjectId === '__manual' || !selectedProjectId) && (
                          <input
                            type="text"
                            value={sessionWorkDir}
                            onChange={e => setSessionWorkDir(e.target.value)}
                            placeholder="d:\proje\klasoru"
                            className={inputCls}
                          />
                        )}
                        {selectedProjectId && selectedProjectId !== '__manual' && (
                          <p className="text-[10px] text-green-600 font-mono px-1">📂 {sessionWorkDir}</p>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={sessionWorkDir}
                        onChange={e => setSessionWorkDir(e.target.value)}
                        placeholder="d:\proje\klasoru"
                        className={inputCls}
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#a08060] mb-1">
                      {t('agent.task')}
                      <span className="ml-1 font-normal text-[#c8a882]">— {t('agent.taskHint')}</span>
                    </label>
                    {(() => {
                      const assignedTasks = projects.flatMap(p =>
                        (p.tasks ?? [])
                          .filter((t: any) => t.assignedAgentId === agent?.id && t.status !== 'done')
                          .map((t: any) => ({ ...t, projectName: p.name }))
                      )
                      return assignedTasks.length > 0 ? (
                        <div className="mb-2 border-2 border-[#e8d5c4] rounded-2xl overflow-hidden">
                          <div className="px-3 py-1.5 bg-[#f5e6d3] border-b border-[#e8d5c4]">
                            <span className="text-[10px] font-black text-[#7a5c3f] uppercase tracking-wider">📋 {t('agent.assignedTasks')}</span>
                          </div>
                          {assignedTasks.map((task: any) => (
                            <button
                              key={task.id}
                              onClick={() => setSessionTask(task.description)}
                              className={`w-full text-left px-3 py-2 border-b border-[#e8d5c4] last:border-b-0 hover:bg-[#f5e6d3] transition-colors ${sessionTask === task.description ? 'bg-[#eaf5f2]' : ''}`}
                            >
                              <div className="flex items-start gap-2">
                                <span className="text-[10px] text-[#7eb5a6] shrink-0 mt-0.5">▶</span>
                                <div>
                                  <p className="text-xs text-[#3d2b1f] leading-snug">{task.description}</p>
                                  <p className="text-[9px] text-[#a08060] mt-0.5">📁 {task.projectName}</p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : null
                    })()}
                    <textarea
                      value={sessionTask}
                      onChange={e => setSessionTask(e.target.value)}
                      placeholder={t('agent.taskPlaceholder')}
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#e8d5c4] focus:border-[#7eb5a6] outline-none text-sm text-[#3d2b1f] bg-[#faf7f4] resize-none"
                    />
                  </div>

                  <button
                    onClick={handleStartSession}
                    disabled={sessionLoading || !sessionTask.trim()}
                    className="w-full py-2.5 rounded-2xl bg-[#7eb5a6] hover:bg-[#6aa596] text-white text-sm font-black transition-colors shadow-md disabled:opacity-50"
                  >
                    {sessionLoading ? `⏳ ${t('agent.startingSession')}` : `▶ ${t('agent.startSessionButton')}`}
                  </button>
                </div>
              )}

              {/* Manuel JSONL bağla */}
              <div className="space-y-2 pt-2 border-t border-[#e8d5c4]">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-[#7a5c3f] uppercase tracking-wider">📂 {t('agent.jsonlBind')}</h4>
                  <button
                    onClick={handleScanJsonlFiles}
                    disabled={jsonlScanLoading}
                    className="text-[10px] font-bold text-[#7eb5a6] hover:text-[#5c9a8b] disabled:opacity-50 flex items-center gap-1"
                  >
                    {jsonlScanLoading ? '⏳' : '🔍'} {t('agent.scanFiles')}
                  </button>
                </div>

                {showJsonlPicker && jsonlFiles.length > 0 && (
                  <div className="border-2 border-[#e8d5c4] rounded-2xl overflow-hidden max-h-40 overflow-y-auto">
                    {jsonlFiles.map((f, i) => (
                      <button
                        key={i}
                        onClick={() => { setWatchPath(f.path); setShowJsonlPicker(false) }}
                        className="w-full text-left px-3 py-2 hover:bg-[#f5e6d3] border-b border-[#e8d5c4] last:border-b-0 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono text-[#3d2b1f] truncate flex-1">
                            {f.path.split(/[\\/]/).slice(-2).join('/')}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[9px] text-[#a08060]">{formatFileSize(f.size)}</span>
                            <span className="text-[9px] text-[#c8a882]">{formatRelativeTime(f.mtime)}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={watchPath}
                    onChange={e => setWatchPath(e.target.value)}
                    placeholder="C:\Users\..\.claude\projects\..\.jsonl"
                    className="flex-1 px-3 py-2 rounded-xl border-2 border-[#e8d5c4] focus:border-[#7eb5a6] outline-none text-[11px] font-mono text-[#3d2b1f] bg-[#faf7f4]"
                  />
                  <button
                    onClick={handleSetWatchPath}
                    disabled={sessionLoading || !watchPath}
                    className="px-3 py-2 rounded-xl bg-[#7eb5a6] text-white text-xs font-bold shrink-0 disabled:opacity-50"
                  >
                    {t('common.connect')}
                  </button>
                </div>
                {agent?.watchPath && (
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-green-600 font-mono truncate flex-1">{'✓'} {agent.watchPath}</p>
                    <button
                      onClick={() => { setWatchPath(''); handleSetWatchPath() }}
                      className="text-[10px] text-red-400 shrink-0"
                    >
                      {t('common.remove')}
                    </button>
                  </div>
                )}
              </div>

              {error && (
                <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-2xl border-2 border-[#e8d5c4] text-[#7a5c3f] hover:bg-[#f5e6d3] text-sm font-bold transition-colors"
              >
                {t('common.close')}
              </button>
            </div>
          )}

          {/* Skills sekmesi */}
          {activeTab === 'skills' && isEdit && (
            <div className="p-4 space-y-4">
              {/* Ajanın mevcut skill'leri */}
              <div>
                <h4 className="text-xs font-black text-[#7a5c3f] uppercase tracking-wider mb-2">
                  🧩 {t('agent.agentSkills', { count: agentSkills.length })}
                </h4>
                {skillsLoading ? (
                  <div className="text-center py-4 text-[#a08060] text-xs">⏳ {t('common.loading')}</div>
                ) : agentSkills.length === 0 ? (
                  <div className="text-center py-4 bg-[#faf7f4] rounded-2xl border-2 border-dashed border-[#e8d5c4]">
                    <p className="text-[#a08060] text-xs">{t('agent.noSkills')}</p>
                    <p className="text-[#c8a882] text-[10px] mt-1">{t('agent.noSkillsHint')}</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {agentSkills.map(skill => (
                      <div key={skill.id} className="flex items-center gap-2 px-3 py-2 bg-[#eaf5f2] rounded-xl border border-[#7eb5a6]/30">
                        <span className="text-sm">🧩</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#3d2b1f] truncate">{skill.name}</span>
                            {skill.category && (
                              <span className="text-[9px] bg-[#7eb5a6]/20 text-[#5c9a8b] px-1.5 py-0.5 rounded-full font-bold shrink-0">
                                {SKILL_CATEGORIES[skill.category] ?? skill.category}
                              </span>
                            )}
                          </div>
                          {skill.description && (
                            <p className="text-[10px] text-[#7a5c3f] truncate mt-0.5">{skill.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDetachSkill(skill.id)}
                          className="text-red-400 hover:text-red-600 text-xs font-bold shrink-0"
                          title={t('common.remove')}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mevcut skill kütüphanesinden ekle */}
              {(() => {
                const attachedIds = new Set(agentSkills.map(s => s.id))
                const available = allSkills.filter(s => !attachedIds.has(s.id))
                return available.length > 0 ? (
                  <div>
                    <h4 className="text-xs font-black text-[#7a5c3f] uppercase tracking-wider mb-2">
                      📚 {t('agent.skillLibrary')}
                    </h4>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {available.map(skill => (
                        <div key={skill.id} className="flex items-center gap-2 px-3 py-2 bg-[#faf7f4] rounded-xl border border-[#e8d5c4] hover:border-[#7eb5a6] transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#3d2b1f] truncate">{skill.name}</span>
                              {skill.category && (
                                <span className="text-[9px] bg-[#e8d5c4]/60 text-[#7a5c3f] px-1.5 py-0.5 rounded-full font-bold shrink-0">
                                  {SKILL_CATEGORIES[skill.category] ?? skill.category}
                                </span>
                              )}
                            </div>
                            {skill.description && (
                              <p className="text-[10px] text-[#a08060] truncate mt-0.5">{skill.description}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleAttachSkill(skill.id)}
                            className="text-[#7eb5a6] hover:text-[#5c9a8b] text-xs font-bold shrink-0 px-2 py-1 rounded-lg hover:bg-[#eaf5f2] transition-colors"
                          >
                            + {t('common.add')}
                          </button>
                          <button
                            onClick={() => handleDeleteSkill(skill.id)}
                            className="text-red-300 hover:text-red-500 text-[10px] shrink-0"
                            title={t('common.delete')}
                          >
                            🗑
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              })()}

              {/* Yeni skill oluştur */}
              <div className="pt-2 border-t border-[#e8d5c4] space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowSkillCreator(!showSkillCreator); setShowSkillImport(false); setShowGitHubImport(false) }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
                      showSkillCreator ? 'bg-[#7eb5a6] text-white' : 'border-2 border-[#e8d5c4] text-[#7a5c3f] hover:bg-[#f5e6d3]'
                    }`}
                  >
                    {'✏️'} {t('agent.createSkill')}
                  </button>
                  <button
                    onClick={() => { setShowSkillImport(!showSkillImport); setShowSkillCreator(false); setShowGitHubImport(false) }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
                      showSkillImport ? 'bg-[#7eb5a6] text-white' : 'border-2 border-[#e8d5c4] text-[#7a5c3f] hover:bg-[#f5e6d3]'
                    }`}
                  >
                    📄 {t('agent.skillMd')}
                  </button>
                  <button
                    onClick={() => { setShowGitHubImport(!showGitHubImport); setShowSkillCreator(false); setShowSkillImport(false); setGhResult(null) }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
                      showGitHubImport ? 'bg-[#7eb5a6] text-white' : 'border-2 border-[#e8d5c4] text-[#7a5c3f] hover:bg-[#f5e6d3]'
                    }`}
                  >
                    🐙 {t('agent.skillGitHub')}
                  </button>
                </div>

                {/* Skill oluşturma formu */}
                {showSkillCreator && (
                  <div className="space-y-2 p-3 bg-[#faf7f4] rounded-2xl border-2 border-[#e8d5c4]">
                    <input
                      type="text"
                      value={newSkillName}
                      onChange={e => setNewSkillName(e.target.value)}
                      placeholder={t('agent.skillNamePlaceholder')}
                      className={inputCls}
                    />
                    <input
                      type="text"
                      value={newSkillDesc}
                      onChange={e => setNewSkillDesc(e.target.value)}
                      placeholder={t('agent.skillDescPlaceholder')}
                      className={inputCls}
                    />
                    <select
                      value={newSkillCategory}
                      onChange={e => setNewSkillCategory(e.target.value)}
                      className={inputCls}
                    >
                      {Object.entries(SKILL_CATEGORIES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <textarea
                      value={newSkillContent}
                      onChange={e => setNewSkillContent(e.target.value)}
                      placeholder={t('agent.skillContentPlaceholder')}
                      rows={6}
                      className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#e8d5c4] focus:border-[#7eb5a6] outline-none text-xs text-[#3d2b1f] bg-white resize-none font-mono"
                    />
                    <button
                      onClick={handleCreateSkill}
                      disabled={!newSkillName.trim()}
                      className="w-full py-2 rounded-xl bg-[#7eb5a6] hover:bg-[#6aa596] text-white text-xs font-bold disabled:opacity-50 transition-colors"
                    >
                      {t('agent.createSkillButton')}
                    </button>
                  </div>
                )}

                {/* SKILL.md Import */}
                {showSkillImport && (
                  <div className="space-y-2 p-3 bg-[#faf7f4] rounded-2xl border-2 border-[#e8d5c4]">
                    <p className="text-[10px] text-[#a08060]">
                      {t('agent.skillImportDesc')}
                    </p>
                    <textarea
                      value={skillImportText}
                      onChange={e => setSkillImportText(e.target.value)}
                      placeholder={t('agent.skillImportPlaceholder')}
                      rows={8}
                      className="w-full px-4 py-2.5 rounded-2xl border-2 border-[#e8d5c4] focus:border-[#7eb5a6] outline-none text-xs text-[#3d2b1f] bg-white resize-none font-mono"
                    />
                    <button
                      onClick={handleImportSkill}
                      disabled={!skillImportText.trim()}
                      className="w-full py-2 rounded-xl bg-[#7eb5a6] hover:bg-[#6aa596] text-white text-xs font-bold disabled:opacity-50 transition-colors"
                    >
                      📥 {t('agent.importButton')}
                    </button>
                  </div>
                )}

                {/* GitHub Repo Import */}
                {showGitHubImport && (
                  <div className="space-y-2 p-3 bg-[#faf7f4] rounded-2xl border-2 border-[#e8d5c4]">
                    <p className="text-[10px] text-[#a08060]">
                      {t('agent.ghImportDesc')}
                    </p>
                    <input
                      type="text"
                      value={ghRepoUrl}
                      onChange={e => setGhRepoUrl(e.target.value)}
                      placeholder="https://github.com/ComposioHQ/awesome-claude-skills"
                      className={inputCls}
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={ghBranch}
                        onChange={e => setGhBranch(e.target.value)}
                        placeholder={t('agent.ghBranchPlaceholder')}
                        className={`flex-1 ${inputCls}`}
                      />
                      <input
                        type="text"
                        value={ghPathFilter}
                        onChange={e => setGhPathFilter(e.target.value)}
                        placeholder={t('agent.ghPathPlaceholder')}
                        className={`flex-1 ${inputCls}`}
                      />
                    </div>
                    <button
                      onClick={handleGitHubImport}
                      disabled={!ghRepoUrl.trim() || ghImporting}
                      className="w-full py-2 rounded-xl bg-[#7eb5a6] hover:bg-[#6aa596] text-white text-xs font-bold disabled:opacity-50 transition-colors"
                    >
                      {ghImporting ? `⏳ ${t('agent.ghDownloading')}` : `🐙${t('agent.ghDownloadButton')}`}
                    </button>

                    {/* Sonuç gösterimi */}
                    {ghResult && (
                      <div className={`p-2 rounded-xl text-xs ${ghResult.created > 0 ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-yellow-50 border border-yellow-200 text-yellow-700'}`}>
                        <p className="font-bold">
                          {'✅'} {t('agent.ghResultCreated', { count: ghResult.created })}
                          {ghResult.skipped > 0 && <span className="font-normal"> {'\·'} {t('agent.ghResultSkipped', { count: ghResult.skipped })}</span>}
                        </p>
                        {ghResult.errors.length > 0 && (
                          <details className="mt-1">
                            <summary className="text-[10px] cursor-pointer text-red-500">{'⚠️'} {t('agent.ghResultErrors', { count: ghResult.errors.length })}</summary>
                            <ul className="mt-1 text-[10px] text-red-400 list-disc list-inside">
                              {ghResult.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                              {ghResult.errors.length > 5 && <li>{t('agent.ghMoreErrors', { count: ghResult.errors.length - 5 })}</li>}
                            </ul>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-2xl border-2 border-[#e8d5c4] text-[#7a5c3f] hover:bg-[#f5e6d3] text-sm font-bold transition-colors"
              >
                {t('common.close')}
              </button>
            </div>
          )}

          {/* MCP sekmesi */}
          {activeTab === 'mcp' && isEdit && (
            <div className="p-4 space-y-4">
              {/* Ajanın MCP sunucuları */}
              <div>
                <h4 className="text-xs font-black text-[#7a5c3f] uppercase tracking-wider mb-2">
                  🔌 {t('agent.agentMcpServers', { count: agentMcpServers.length })}
                </h4>
                {mcpLoading ? (
                  <div className="text-center py-4 text-[#a08060] text-xs">{t('common.loading')}</div>
                ) : agentMcpServers.length === 0 ? (
                  <div className="text-center py-4 bg-[#faf7f4] rounded-2xl border-2 border-dashed border-[#e8d5c4]">
                    <p className="text-[#a08060] text-xs">{t('agent.noMcpServers')}</p>
                    <p className="text-[#c8a882] text-[10px] mt-1">{t('agent.noMcpServersHint')}</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {agentMcpServers.map(srv => (
                      <div key={srv.id} className="flex items-center gap-2 px-3 py-2 bg-[#eaf5f2] rounded-xl border border-[#7eb5a6]/30">
                        <span className="text-sm">🔌</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#3d2b1f] truncate">{srv.name}</span>
                            <span className="text-[9px] bg-[#7eb5a6]/20 text-[#5c9a8b] px-1.5 py-0.5 rounded-full font-bold shrink-0">
                              {MCP_TRANSPORT_LABELS[srv.transport]}
                            </span>
                            {mcpTestResults[srv.id] && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                mcpTestResults[srv.id].status === 'active'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-600'
                              }`}>
                                {mcpTestResults[srv.id].status === 'active' ? t('agent.mcpConnected') : t('agent.mcpError')}
                              </span>
                            )}
                          </div>
                          {srv.description && (
                            <p className="text-[10px] text-[#7a5c3f] truncate mt-0.5">{srv.description}</p>
                          )}
                          <p className="text-[9px] text-[#a08060] font-mono truncate mt-0.5">
                            {srv.transport === 'stdio' ? `$ ${srv.command}` : srv.url}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleTestMcpServer(srv.id)}
                            className="text-[10px] text-[#7eb5a6] hover:text-[#5c9a8b] font-bold px-1.5 py-1 rounded-lg hover:bg-[#eaf5f2]"
                            title={t('agent.mcpConnectionTest')}
                          >
                            {t('common.test')}
                          </button>
                          <button
                            onClick={() => handleDetachMcp(srv.id)}
                            className="text-red-400 hover:text-red-600 text-xs font-bold"
                            title={t('common.remove')}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mevcut sunuculardan bağla */}
              {(() => {
                const attachedIds = new Set(agentMcpServers.map(s => s.id))
                const available = allMcpServers.filter(s => !attachedIds.has(s.id))
                return available.length > 0 ? (
                  <div>
                    <h4 className="text-xs font-black text-[#7a5c3f] uppercase tracking-wider mb-2">
                      {t('agent.existingServers')}
                    </h4>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {available.map(srv => (
                        <div key={srv.id} className="flex items-center gap-2 px-3 py-2 bg-[#faf7f4] rounded-xl border border-[#e8d5c4] hover:border-[#7eb5a6] transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#3d2b1f] truncate">{srv.name}</span>
                              <span className="text-[9px] bg-[#e8d5c4]/60 text-[#7a5c3f] px-1.5 py-0.5 rounded-full font-bold shrink-0">
                                {MCP_TRANSPORT_LABELS[srv.transport]}
                              </span>
                              {!srv.enabled && (
                                <span className="text-[9px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full font-bold">{t('agent.mcpDisabled')}</span>
                              )}
                            </div>
                            {srv.description && (
                              <p className="text-[10px] text-[#7a5c3f] truncate mt-0.5">{srv.description}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleAttachMcp(srv.id)}
                            className="text-[#7eb5a6] hover:text-[#5c9a8b] text-xs font-bold shrink-0 px-2 py-1 rounded-lg hover:bg-[#eaf5f2]"
                          >
                            + {t('common.connect')}
                          </button>
                          <button
                            onClick={() => handleDeleteMcpServer(srv.id)}
                            className="text-red-300 hover:text-red-500 text-[10px] shrink-0"
                            title={t('agent.mcpDeleteServer')}
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              })()}

              {/* Yeni MCP sunucu oluştur */}
              {!showMcpCreator ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowMcpCreator(true)}
                    className="flex-1 py-2 rounded-2xl bg-[#7eb5a6]/10 hover:bg-[#7eb5a6]/20 text-[#4a9a86] text-xs font-bold transition-colors"
                  >
                    {t('agent.newMcpServer')}
                  </button>
                  <select
                    value=""
                    onChange={e => {
                      const idx = Number(e.target.value)
                      if (!isNaN(idx)) handleApplyMcpTemplate(idx)
                    }}
                    className="px-3 py-2 rounded-2xl text-[10px] border-2 border-[#e8d5c4] text-[#7a5c3f] cursor-pointer bg-white"
                  >
                    <option value="">{t('agent.readyServer')}</option>
                    {MCP_SERVER_TEMPLATES.map((tpl, i) => (
                      <option key={i} value={i}>{tpl.name} — {tpl.description}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-4 bg-[#faf7f4] rounded-2xl border-2 border-[#e8d5c4] space-y-3">
                  <h4 className="text-xs font-black text-[#7a5c3f]">{t('agent.mcpServerTitle')}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-[#7a5c3f] block mb-1">{t('agent.mcpName')}</label>
                      <input
                        type="text"
                        value={newMcpName}
                        onChange={e => setNewMcpName(e.target.value)}
                        placeholder={t('agent.mcpNamePlaceholder')}
                        className="w-full px-3 py-2 rounded-xl border-2 border-[#e8d5c4] text-xs focus:border-[#7eb5a6] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#7a5c3f] block mb-1">{t('agent.mcpTransport')}</label>
                      <select
                        value={newMcpTransport}
                        onChange={e => setNewMcpTransport(e.target.value as MCPTransport)}
                        className="w-full px-3 py-2 rounded-xl border-2 border-[#e8d5c4] text-xs focus:border-[#7eb5a6] outline-none"
                      >
                        {(Object.entries(MCP_TRANSPORT_LABELS) as [MCPTransport, string][]).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#7a5c3f] block mb-1">{t('agent.mcpDescription')}</label>
                    <input
                      type="text"
                      value={newMcpDesc}
                      onChange={e => setNewMcpDesc(e.target.value)}
                      placeholder={t('agent.mcpDescPlaceholder')}
                      className="w-full px-3 py-2 rounded-xl border-2 border-[#e8d5c4] text-xs focus:border-[#7eb5a6] outline-none"
                    />
                  </div>
                  {newMcpTransport === 'stdio' ? (
                    <div>
                      <label className="text-[10px] font-bold text-[#7a5c3f] block mb-1">{t('agent.mcpCommand')}</label>
                      <input
                        type="text"
                        value={newMcpCommand}
                        onChange={e => setNewMcpCommand(e.target.value)}
                        placeholder={t('agent.mcpCommandPlaceholder')}
                        className="w-full px-3 py-2 rounded-xl border-2 border-[#e8d5c4] text-xs font-mono focus:border-[#7eb5a6] outline-none"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] font-bold text-[#7a5c3f] block mb-1">{t('agent.mcpUrl')}</label>
                      <input
                        type="text"
                        value={newMcpUrl}
                        onChange={e => setNewMcpUrl(e.target.value)}
                        placeholder={t('agent.mcpUrlPlaceholder')}
                        className="w-full px-3 py-2 rounded-xl border-2 border-[#e8d5c4] text-xs font-mono focus:border-[#7eb5a6] outline-none"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] font-bold text-[#7a5c3f] block mb-1">{t('agent.mcpArgs')} <span className="font-normal text-[#a08060]">({t('agent.mcpArgsHint')})</span></label>
                    <input
                      type="text"
                      value={newMcpArgs}
                      onChange={e => setNewMcpArgs(e.target.value)}
                      placeholder={t('agent.mcpArgsPlaceholder')}
                      className="w-full px-3 py-2 rounded-xl border-2 border-[#e8d5c4] text-xs font-mono focus:border-[#7eb5a6] outline-none"
                    />
                  </div>
                  {/* Environment variables */}
                  <div>
                    <label className="text-[10px] font-bold text-[#7a5c3f] block mb-1">{t('agent.mcpEnvVars')}</label>
                    {Object.entries(newMcpEnvPairs).map(([key, val]) => (
                      <div key={key} className="flex gap-2 mb-1.5">
                        <span className="text-[10px] font-mono bg-[#e8d5c4] px-2 py-1.5 rounded-lg text-[#5a3a1f] min-w-[120px]">{key}</span>
                        <input
                          type="text"
                          value={val}
                          onChange={e => setNewMcpEnvPairs(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder="value"
                          className="flex-1 px-2 py-1.5 rounded-lg border border-[#e8d5c4] text-[10px] font-mono focus:border-[#7eb5a6] outline-none"
                        />
                        <button
                          onClick={() => setNewMcpEnvPairs(prev => { const n = { ...prev }; delete n[key]; return n })}
                          className="text-red-400 hover:text-red-600 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMcpEnvKey}
                        onChange={e => setNewMcpEnvKey(e.target.value)}
                        placeholder="KEY"
                        className="flex-1 px-2 py-1.5 rounded-lg border border-[#e8d5c4] text-[10px] font-mono focus:border-[#7eb5a6] outline-none"
                      />
                      <input
                        type="text"
                        value={newMcpEnvVal}
                        onChange={e => setNewMcpEnvVal(e.target.value)}
                        placeholder="VALUE"
                        className="flex-1 px-2 py-1.5 rounded-lg border border-[#e8d5c4] text-[10px] font-mono focus:border-[#7eb5a6] outline-none"
                      />
                      <button
                        onClick={() => {
                          if (newMcpEnvKey.trim()) {
                            setNewMcpEnvPairs(prev => ({ ...prev, [newMcpEnvKey.trim()]: newMcpEnvVal }))
                            setNewMcpEnvKey('')
                            setNewMcpEnvVal('')
                          }
                        }}
                        className="text-[#7eb5a6] hover:text-[#5c9a8b] text-xs font-bold px-2"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        setShowMcpCreator(false)
                        setNewMcpName('')
                        setNewMcpDesc('')
                        setNewMcpCommand('')
                        setNewMcpUrl('')
                        setNewMcpArgs('')
                        setNewMcpEnvPairs({})
                      }}
                      className="flex-1 py-2.5 rounded-2xl border-2 border-[#e8d5c4] text-[#7a5c3f] text-sm font-bold"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={handleCreateMcpServer}
                      disabled={mcpLoading || !newMcpName.trim() || (newMcpTransport === 'stdio' ? !newMcpCommand.trim() : !newMcpUrl.trim())}
                      className="flex-1 py-2.5 rounded-2xl bg-[#7eb5a6] hover:bg-[#6aa596] text-white text-sm font-black disabled:opacity-50 transition-colors"
                    >
                      {t('common.create')}
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-2xl border-2 border-[#e8d5c4] text-[#7a5c3f] hover:bg-[#f5e6d3] text-sm font-bold transition-colors"
              >
                {t('common.close')}
              </button>
            </div>
          )}

          {/* Transcript sekmesi */}
          {activeTab === 'transcript' && isEdit && (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-[#7a5c3f] uppercase tracking-wider">📜 {t('agent.transcript')}</h4>
                  {transcriptPath && (
                    <p className="text-[9px] text-[#a08060] font-mono truncate mt-0.5 max-w-xs">{transcriptPath.split(/[\\/]/).slice(-2).join('/')}</p>
                  )}
                </div>
                <button
                  onClick={loadTranscript}
                  disabled={transcriptLoading}
                  className="text-[10px] font-bold text-[#7eb5a6] hover:text-[#5c9a8b] disabled:opacity-50"
                >
                  {transcriptLoading ? '⏳' : '📜'} {t('common.refresh')}
                </button>
              </div>

              {transcriptLoading && (
                <div className="text-center py-8 text-[#a08060] text-xs">⏳ {t('common.loading')}</div>
              )}

              {!transcriptLoading && !transcriptPath && (
                <div className="text-center py-8">
                  <p className="text-[#a08060] text-xs">{t('agent.noTranscript')}</p>
                  <p className="text-[#c8a882] text-[10px] mt-1">{t('agent.noTranscriptHint')}</p>
                </div>
              )}

              {!transcriptLoading && transcriptPath && transcriptEntries.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-[#a08060] text-xs">{t('agent.transcriptEmpty')}</p>
                </div>
              )}

              {!transcriptLoading && transcriptEntries.length > 0 && (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {transcriptEntries.map((entry, i) => (
                    <div key={i} className={`rounded-xl px-3 py-2 text-xs ${
                      entry.type === 'assistant' ? 'bg-blue-50 border border-blue-100' :
                      entry.type === 'tool_use' ? 'bg-[#1a1a2e] text-green-300' :
                      entry.type === 'tool_result' ? 'bg-gray-50 border border-gray-100' :
                      'bg-[#f5e6d3]'
                    }`}>
                      {entry.type === 'assistant' && (
                        <>
                          <div className="text-[9px] text-blue-400 font-bold mb-1">🤖 Claude</div>
                          <p className="text-blue-900 leading-relaxed whitespace-pre-wrap break-words">{entry.text}</p>
                        </>
                      )}
                      {entry.type === 'tool_use' && (
                        <>
                          <div className="text-[9px] text-purple-300 font-bold mb-1">⚡ {entry.tool}</div>
                          <pre className="text-[9px] text-green-200 overflow-x-auto whitespace-pre-wrap break-all">
                            {typeof entry.input === 'object'
                              ? JSON.stringify(entry.input, null, 2).slice(0, 300)
                              : String(entry.input ?? '')}
                          </pre>
                        </>
                      )}
                      {entry.type === 'tool_result' && (
                        <>
                          <div className="text-[9px] text-gray-400 font-bold mb-1">📤 {t('common.result')}</div>
                          <p className="text-gray-600 font-mono text-[9px] whitespace-pre-wrap break-all">{entry.content}</p>
                        </>
                      )}
                      {entry.type === 'system_init' && (
                        <>
                          <div className="text-[9px] text-[#a08060] font-bold mb-1">⚙️ {t('agent.transcriptInit')}</div>
                          <p className="text-[#7a5c3f] text-[9px]">📂 {entry.cwd}</p>
                          <p className="text-[#a08060] text-[9px]">{t('agent.transcriptTools', { tools: (entry.tools ?? []).join(', ') })}</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-2xl border-2 border-[#e8d5c4] text-[#7a5c3f] hover:bg-[#f5e6d3] text-sm font-bold transition-colors"
              >
                {t('common.close')}
              </button>
            </div>
          )}
          {/* Faz 16 — Subagent sekmesi */}
          {activeTab === 'subagent' && isEdit && (
            <div className="p-4 space-y-4">
              {/* Mevcut bağlı subagent */}
              <div>
                <h4 className="text-xs font-black text-[#7a5c3f] uppercase tracking-wider mb-2">
                  🤖 {t('agent.subagentProfile')}
                </h4>
                {agent?.subagentId ? (
                  <div className="p-3 bg-green-50 border-2 border-green-200 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-green-700">
                          {'✅'} {allSubagents.find(s => s.id === agent.subagentId)?.name || t('agent.boundSubagent')}
                        </span>
                        <p className="text-[10px] text-green-600 mt-0.5">
                          {allSubagents.find(s => s.id === agent.subagentId)?.description || ''}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={async () => {
                            if (!agent.subagentId) return
                            const data = await api.previewSubagent(agent.subagentId)
                            setSubagentPreview(data.content)
                          }}
                          className="px-2 py-1 rounded-lg text-[10px] text-[#7a5c3f] hover:bg-[#f5e6d3]"
                        >
                          📄 {t('common.preview')}
                        </button>
                        <button
                          onClick={handleUnbindSubagent}
                          className="px-2 py-1 rounded-lg text-[10px] text-red-500 hover:bg-red-50"
                        >
                          ✕ {t('common.remove')}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center py-3 text-xs text-[#a08060] bg-[#faf7f4] rounded-2xl border-2 border-dashed border-[#e8d5c4]">
                    {t('agent.noSubagentBound')}
                  </p>
                )}
              </div>

              {/* Önizleme */}
              {subagentPreview && (
                <div className="bg-[#1a1a2e] rounded-2xl p-3 overflow-auto max-h-48">
                  <pre className="text-[10px] text-green-300 whitespace-pre-wrap font-mono">{subagentPreview}</pre>
                  <button
                    onClick={() => setSubagentPreview('')}
                    className="mt-2 text-[9px] text-gray-400 hover:text-white"
                  >
                    {t('common.close')}
                  </button>
                </div>
              )}

              {/* Mevcut subagent'lar listesi — bağla */}
              <div>
                <h4 className="text-xs font-bold text-[#7a5c3f] mb-2">{t('agent.existingSubagents')}</h4>
                {allSubagents.length === 0 ? (
                  <p className="text-[10px] text-[#a08060] text-center py-2">{t('agent.noSubagents')}</p>
                ) : (
                  <div className="space-y-1.5">
                    {allSubagents.map(sub => (
                      <div key={sub.id} className="flex items-center justify-between p-2 rounded-xl bg-[#faf7f4] border border-[#e8d5c4]">
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-bold text-[#3d2b1f]">{sub.name}</span>
                          <p className="text-[9px] text-[#a08060] truncate">{sub.description}</p>
                          <div className="flex gap-2 mt-0.5">
                            {sub.model && <span className="text-[8px] px-1 py-0.5 rounded bg-blue-50 text-blue-600">{sub.model}</span>}
                            {sub.maxTurns && sub.maxTurns > 0 && <span className="text-[8px] px-1 py-0.5 rounded bg-purple-50 text-purple-600">{sub.maxTurns} tur</span>}
                            {sub.allowedTools && sub.allowedTools.length > 0 && (
                              <span className="text-[8px] px-1 py-0.5 rounded bg-green-50 text-green-600">
                                {sub.allowedTools.length} araç
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {agent?.subagentId !== sub.id ? (
                            <button
                              onClick={() => handleBindSubagent(sub.id)}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold text-[#4a9a86] hover:bg-[#7eb5a6]/10"
                            >
                              {t('common.connect')}
                            </button>
                          ) : (
                            <span className="px-2 py-1 text-[10px] font-bold text-green-600">{'✓'} {t('common.active')}</span>
                          )}
                          <button
                            onClick={async () => {
                              await api.deleteSubagent(sub.id)
                              if (agent?.subagentId === sub.id) await handleUnbindSubagent()
                              await loadSubagents()
                            }}
                            className="px-1.5 py-1 rounded-lg text-[10px] text-red-300 hover:text-red-500 hover:bg-red-50"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Oluştur / Şablon */}
              {!showSubagentCreator ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSubagentCreator(true)}
                    className="flex-1 py-2 rounded-2xl text-[11px] font-bold border-2 border-dashed border-[#e8d5c4] text-[#a08060] hover:bg-[#faf7f4]"
                  >
                    {t('agent.newSubagent')}
                  </button>
                  <select
                    defaultValue=""
                    onChange={e => {
                      const idx = parseInt(e.target.value)
                      if (!isNaN(idx)) handleApplySubagentTemplate(idx)
                      e.target.value = ''
                    }}
                    className="px-3 py-2 rounded-2xl text-[10px] border-2 border-[#e8d5c4] text-[#7a5c3f] bg-white cursor-pointer"
                  >
                    <option value="">{t('agent.readyTemplate')}</option>
                    {SUBAGENT_TEMPLATES.map((tpl, i) => (
                      <option key={i} value={i}>{tpl.name} — {tpl.description}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAgentToSubagent}
                    className="px-3 py-2 rounded-2xl text-[10px] font-bold border-2 border-[#e8d5c4] text-[#7a5c3f] hover:bg-[#faf7f4]"
                    title={t('agent.exportProfileTitle')}
                  >
                    📤 {t('agent.exportProfile')}
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-[#faf7f4] rounded-2xl border-2 border-[#e8d5c4] space-y-3">
                  <h4 className="text-xs font-black text-[#7a5c3f]">{t('agent.subagentTitle')}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-[#7a5c3f] block mb-1">{t('agent.subagentName')}</label>
                      <input value={newSubName} onChange={e => setNewSubName(e.target.value)}
                        placeholder="researcher" className="w-full px-3 py-2 rounded-xl text-xs border-2 border-[#e8d5c4] bg-white" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#7a5c3f] block mb-1">{t('agent.subagentModel')}</label>
                      <input value={newSubModel} onChange={e => setNewSubModel(e.target.value)}
                        placeholder="claude-haiku-4-5-20251001" className="w-full px-3 py-2 rounded-xl text-xs border-2 border-[#e8d5c4] bg-white" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#7a5c3f] block mb-1">{t('agent.subagentDescription')}</label>
                    <input value={newSubDesc} onChange={e => setNewSubDesc(e.target.value)}
                      placeholder="Güvenli araştırma ajanı" className="w-full px-3 py-2 rounded-xl text-xs border-2 border-[#e8d5c4] bg-white" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#7a5c3f] block mb-1">{t('agent.subagentPrompt')}</label>
                    <textarea value={newSubPrompt} onChange={e => setNewSubPrompt(e.target.value)}
                      rows={3} placeholder="Sen güvenli bir araştırma ajanısın..."
                      className="w-full px-3 py-2 rounded-xl text-xs border-2 border-[#e8d5c4] bg-white resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-[#7a5c3f] block mb-1">{t('agent.subagentMaxTurns')}</label>
                      <input type="number" min={0} max={100} value={newSubMaxTurns} onChange={e => setNewSubMaxTurns(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl text-xs border-2 border-[#e8d5c4] bg-white" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#7a5c3f] block mb-1">{t('agent.subagentScope')}</label>
                      <select value={newSubScope} onChange={e => setNewSubScope(e.target.value as 'project' | 'user')}
                        className="w-full px-3 py-2 rounded-xl text-xs border-2 border-[#e8d5c4] bg-white">
                        <option value="project">{t('agent.scopeProject')}</option>
                        <option value="user">{t('agent.scopeUser')}</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#7a5c3f] block mb-1">{t('agent.subagentAllowedTools')}</label>
                    <div className="flex flex-wrap gap-1.5">
                      {CLAUDE_TOOLS.map(tool => (
                        <button key={tool}
                          onClick={() => setNewSubAllowed(prev =>
                            prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]
                          )}
                          className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-colors ${
                            newSubAllowed.includes(tool)
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'bg-gray-50 text-gray-400 border border-gray-200'
                          }`}
                        >
                          {tool}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateSubagent}
                      disabled={!newSubName}
                      className="flex-1 py-2 rounded-2xl text-xs font-bold bg-[#7eb5a6] text-white hover:bg-[#6da596] disabled:opacity-50"
                    >
                      {t('common.create')}
                    </button>
                    <button
                      onClick={() => setShowSubagentCreator(false)}
                      className="px-4 py-2 rounded-2xl text-xs text-[#7a5c3f] hover:bg-[#f5e6d3]"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'training' && (
            <div className="p-4 space-y-4">
              <h4 className="text-xs font-black text-[#7a5c3f] uppercase tracking-wider mb-2">
                🎓 {t('agent.tabTraining')}
              </h4>

              {/* Mevcut atanmış profil */}
              {selectedTrainingId && (
                <div className="p-3 bg-emerald-50 border-2 border-emerald-200 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-emerald-700">
                        {'✅'} {trainingProfiles.find(p => p.id === selectedTrainingId)?.name || t('training.assignedProfile')}
                      </span>
                      <p className="text-[10px] text-emerald-600 mt-0.5">
                        {trainingProfiles.find(p => p.id === selectedTrainingId)?.description || ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleTrainingChange('')}
                      className="px-2 py-1 rounded-lg text-[10px] text-red-500 hover:bg-red-50"
                    >
                      {'✕'} {t('training.removeFromAgent')}
                    </button>
                  </div>
                </div>
              )}

              {/* Profil seçimi */}
              <div>
                <h4 className="text-xs font-bold text-[#7a5c3f] mb-2">{t('training.profiles')}</h4>
                {trainingLoading ? (
                  <p className="text-[10px] text-[#a08060] text-center py-2">...</p>
                ) : trainingProfiles.length === 0 ? (
                  <p className="text-[10px] text-[#a08060] text-center py-3 bg-[#faf7f4] rounded-2xl border-2 border-dashed border-[#e8d5c4]">
                    {t('training.noProfiles')}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {trainingProfiles.map(profile => (
                      <div key={profile.id} className={`flex items-center justify-between p-2 rounded-xl border ${
                        selectedTrainingId === profile.id
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-[#faf7f4] border-[#e8d5c4]'
                      }`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs">{profile.mode === 'project' ? '📁' : '🔧'}</span>
                            <span className="text-[11px] font-bold text-[#3d2b1f]">{profile.name}</span>
                          </div>
                          <p className="text-[9px] text-[#a08060] truncate">{profile.description}</p>
                          {profile.source && (
                            <span className="text-[8px] px-1 py-0.5 rounded bg-slate-100 text-slate-500 mt-0.5 inline-block">{profile.source}</span>
                          )}
                        </div>
                        <div className="shrink-0 ml-2">
                          {selectedTrainingId === profile.id ? (
                            <span className="px-2 py-1 text-[10px] font-bold text-emerald-600">{'✓'} {t('common.active')}</span>
                          ) : (
                            <button
                              onClick={() => handleTrainingChange(profile.id)}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold text-[#4a9a86] hover:bg-[#7eb5a6]/10"
                            >
                              {t('training.assignToAgent')}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Önizleme */}
              {selectedTrainingId && (() => {
                const profile = trainingProfiles.find(p => p.id === selectedTrainingId)
                return profile?.content ? (
                  <div className="bg-[#1a1a2e] rounded-2xl p-3 overflow-auto max-h-48">
                    <div className="text-[9px] text-gray-400 font-bold mb-1">📋 {t('training.preview')}</div>
                    <pre className="text-[10px] text-green-300 whitespace-pre-wrap font-mono">{profile.content.slice(0, 2000)}{profile.content.length > 2000 ? '\n...' : ''}</pre>
                  </div>
                ) : null
              })()}
            </div>
          )}

        </div>
      </motion.div>
    </div>
  )
}
