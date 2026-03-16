import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import type { WsMessage } from '@smith/types'

const WS_URL = 'ws://localhost:3001'

export function useWebSocket(officeId: string | null) {
  const wsRef = useRef<WebSocket | null>(null)
  const { updateAgentStatus, updateProject, addMessage, setWsConnected, setCompletedProject } = useStore()

  useEffect(() => {
    if (!officeId) return

    const url = `${WS_URL}?officeId=${officeId}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setWsConnected(true)
      console.log('WS connected')
    }

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data)
        switch (msg.type) {
          case 'agent:status':
            updateAgentStatus(msg.agentId, msg.status, msg.currentTask)
            break
          case 'agent:message':
            addMessage(msg.message)
            break
          case 'project:update':
            updateProject(msg.project)
            break
          case 'project:complete':
            setCompletedProject(msg.summary)
            break
        }
      } catch {}
    }

    ws.onclose = () => {
      setWsConnected(false)
    }

    ws.onerror = () => {
      setWsConnected(false)
    }

    // Ping
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)

    return () => {
      clearInterval(pingInterval)
      ws.close()
      wsRef.current = null
    }
  }, [officeId])
}
