import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { api } from '../../hooks/useApi'

interface TemplateAgent {
  name: string
  roleKey: string
  animal: string
  systemPromptKey: string
}

interface Template {
  id: string
  labelKey: string
  icon: string
  descKey: string
  agents: TemplateAgent[]
}

const TEMPLATES: Template[] = [
  {
    id: 'fullstack',
    labelKey: 'template.fullstack.label',
    icon: '🏗️',
    descKey: 'template.fullstack.desc',
    agents: [
      { name: 'Aria', roleKey: 'template.fullstack.frontendRole', animal: 'fox', systemPromptKey: 'template.fullstack.frontend' },
      { name: 'Rex', roleKey: 'template.fullstack.backendRole', animal: 'raccoon', systemPromptKey: 'template.fullstack.backend' },
      { name: 'Sage', roleKey: 'template.fullstack.qaRole', animal: 'owl', systemPromptKey: 'template.fullstack.qa' },
    ],
  },
  {
    id: 'ai-research',
    labelKey: 'template.aiResearch.label',
    icon: '🔬',
    descKey: 'template.aiResearch.desc',
    agents: [
      { name: 'Nova', roleKey: 'template.aiResearch.researcherRole', animal: 'octopus', systemPromptKey: 'template.aiResearch.researcher' },
      { name: 'Cora', roleKey: 'template.aiResearch.dataScientistRole', animal: 'squirrel', systemPromptKey: 'template.aiResearch.dataScientist' },
      { name: 'Atlas', roleKey: 'template.aiResearch.mlEngineerRole', animal: 'elephant', systemPromptKey: 'template.aiResearch.mlEngineer' },
    ],
  },
  {
    id: 'devops',
    labelKey: 'template.devops.label',
    icon: '⚙️',
    descKey: 'template.devops.desc',
    agents: [
      { name: 'Titan', roleKey: 'template.devops.devopsRole', animal: 'elephant', systemPromptKey: 'template.devops.devops' },
      { name: 'Vex', roleKey: 'template.devops.securityRole', animal: 'raccoon', systemPromptKey: 'template.devops.security' },
      { name: 'Sky', roleKey: 'template.devops.cloudRole', animal: 'owl', systemPromptKey: 'template.devops.cloud' },
    ],
  },
  {
    id: 'startup',
    labelKey: 'template.startup.label',
    icon: '🚀',
    descKey: 'template.startup.desc',
    agents: [
      { name: 'Kai', roleKey: 'template.startup.fullstackRole', animal: 'rabbit', systemPromptKey: 'template.startup.fullstack' },
      { name: 'Zara', roleKey: 'template.startup.uxRole', animal: 'cat', systemPromptKey: 'template.startup.ux' },
      { name: 'Bruno', roleKey: 'template.startup.pmRole', animal: 'bear', systemPromptKey: 'template.startup.pm' },
    ],
  },
  {
    id: 'content',
    labelKey: 'template.content.label',
    icon: '✍️',
    descKey: 'template.content.desc',
    agents: [
      { name: 'Lena', roleKey: 'template.content.writerRole', animal: 'cat', systemPromptKey: 'template.content.writer' },
      { name: 'Max', roleKey: 'template.content.researcherRole', animal: 'squirrel', systemPromptKey: 'template.content.researcher' },
      { name: 'Eli', roleKey: 'template.content.editorRole', animal: 'owl', systemPromptKey: 'template.content.editor' },
    ],
  },
]

interface TemplateModalProps {
  officeId: string
  onClose: () => void
  onDone: () => void
}

export function TemplateModal({ officeId, onClose, onDone }: TemplateModalProps) {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const selected = TEMPLATES.find(tpl => tpl.id === selectedId)

  const handleApply = async () => {
    if (!selected) return
    setLoading(true)
    setResult(null)
    try {
      for (const agent of selected.agents) {
        await api.createAgent(officeId, {
          name: agent.name,
          role: t(agent.roleKey),
          animal: agent.animal as any,
          systemPrompt: t(agent.systemPromptKey),
        })
      }
      setResult({ type: 'success', message: t('template.agentsAdded', { count: selected.agents.length }) })
      setTimeout(() => { onDone() }, 1200)
    } catch (e: any) {
      setResult({ type: 'error', message: t('template.error', { message: e.message }) })
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        className="bg-white rounded-4xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[85vh] flex flex-col"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#7eb5a6] to-[#6aa596] px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-white font-black text-lg">{t('template.title')}</h3>
            <p className="text-white/70 text-xs mt-0.5">{t('template.subtitle')}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          <div className="space-y-3">
            {TEMPLATES.map(template => (
              <motion.button
                key={template.id}
                onClick={() => setSelectedId(template.id === selectedId ? null : template.id)}
                className={`w-full text-left rounded-2xl border-2 transition-all p-4 ${
                  selectedId === template.id
                    ? 'border-[#7eb5a6] bg-[#7eb5a6]/10 shadow-md'
                    : 'border-[#e8d5c4] hover:border-[#c8a882] bg-white'
                }`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{template.icon}</span>
                  <div>
                    <p className="font-black text-[#3d2b1f] text-sm">{t(template.labelKey)}</p>
                    <p className="text-xs text-[#a08060]">{t(template.descKey)}</p>
                  </div>
                  {selectedId === template.id && (
                    <span className="ml-auto text-[#7eb5a6] font-black">✓</span>
                  )}
                </div>

                {/* Agent list */}
                <div className="flex flex-wrap gap-1.5">
                  {template.agents.map((agent, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-[#f5e6d3] text-[#7a5c3f] font-semibold"
                    >
                      {agent.name} · {t(agent.roleKey)}
                    </span>
                  ))}
                </div>

                {/* Show details when selected */}
                <AnimatePresence>
                  {selectedId === template.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 space-y-2 overflow-hidden"
                    >
                      {template.agents.map((agent, i) => (
                        <div key={i} className="rounded-xl bg-white border border-[#e8d5c4] px-3 py-2">
                          <p className="text-xs font-black text-[#3d2b1f]">{agent.name}</p>
                          <p className="text-[9px] text-[#a08060]">{t(agent.roleKey)}</p>
                          <p className="text-[9px] text-[#7a5c3f] mt-0.5 italic line-clamp-2">{t(agent.systemPromptKey)}</p>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-2 border-t border-[#e8d5c4] space-y-2 shrink-0">
          {result && (
            <p className={`text-sm font-semibold px-3 py-2 rounded-xl ${result.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {result.type === 'success' ? '✅' : '❌'} {result.message}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl border-2 border-[#e8d5c4] text-[#7a5c3f] text-sm font-bold"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleApply}
              disabled={!selectedId || loading}
              className="flex-1 py-2.5 rounded-2xl bg-[#7eb5a6] hover:bg-[#6aa596] text-white text-sm font-black transition-colors disabled:opacity-50"
            >
              {loading ? `⏳ ${t('template.applying')}` : selected ? `📦 ${t('template.apply', { count: selected.agents.length })}` : `📦 ${t('template.selectFirst')}`}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
