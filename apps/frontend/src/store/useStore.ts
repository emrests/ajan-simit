import { create } from 'zustand'
import type { Office, Agent, AgentMessage, AgentStatus, Project, ProjectCompleteSummary } from '@smith/types'

interface AppState {
  offices: Office[]
  activeOfficeId: string | null
  messages: AgentMessage[]
  wsConnected: boolean
  completedProject: ProjectCompleteSummary | null

  // Actions
  setOffices: (offices: Office[]) => void
  addOffice: (office: Office) => void
  updateOffice: (office: Office) => void
  removeOffice: (id: string) => void
  setActiveOffice: (id: string | null) => void

  updateProject: (project: Project) => void
  updateAgentStatus: (agentId: string, status: AgentStatus, currentTask?: string) => void
  addMessage: (message: AgentMessage) => void
  setMessages: (messages: AgentMessage[]) => void
  setWsConnected: (v: boolean) => void
  setCompletedProject: (summary: ProjectCompleteSummary | null) => void

  // Derived
  activeOffice: () => Office | null
}

export const useStore = create<AppState>((set, get) => ({
  offices: [],
  activeOfficeId: null,
  messages: [],
  wsConnected: false,
  completedProject: null,

  setOffices: (offices) => set({ offices }),
  addOffice: (office) => set((s) => ({ offices: [...s.offices, office] })),
  updateOffice: (office) =>
    set((s) => ({ offices: s.offices.map((o) => (o.id === office.id ? office : o)) })),
  removeOffice: (id) =>
    set((s) => ({
      offices: s.offices.filter((o) => o.id !== id),
      activeOfficeId: s.activeOfficeId === id ? null : s.activeOfficeId,
    })),
  setActiveOffice: (id) => set({ activeOfficeId: id, messages: [] }),

  updateProject: (project) =>
    set((s) => ({
      offices: s.offices.map((o) => ({
        ...o,
        projects: o.projects.map((p) => (p.id === project.id ? project : p)),
      })),
    })),

  updateAgentStatus: (agentId, status, currentTask) =>
    set((s) => ({
      offices: s.offices.map((office) => ({
        ...office,
        agents: office.agents.map((agent) =>
          agent.id === agentId
            ? { ...agent, status, currentTask: currentTask ?? agent.currentTask }
            : agent
        ),
      })),
    })),

  addMessage: (message) =>
    set((s) => ({ messages: [...s.messages.slice(-199), message] })),

  setMessages: (messages) => set({ messages }),
  setWsConnected: (wsConnected) => set({ wsConnected }),
  setCompletedProject: (completedProject) => set({ completedProject }),

  activeOffice: () => {
    const { offices, activeOfficeId } = get()
    return offices.find((o) => o.id === activeOfficeId) ?? null
  },
}))
