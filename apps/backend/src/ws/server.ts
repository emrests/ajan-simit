import { WebSocket, WebSocketServer } from 'ws'
import { IncomingMessage } from 'http'

interface ClientInfo {
  ws: WebSocket
  officeId: string | null
}

const clients = new Set<ClientInfo>()
let wss: WebSocketServer | null = null

export function createWsServer(server: any) {
  wss = new WebSocketServer({ server })

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || '/', `http://localhost`)
    const officeId = url.searchParams.get('officeId')

    const client: ClientInfo = { ws, officeId }
    clients.add(client)

    console.log(`WS connected — officeId: ${officeId ?? 'none'} | total: ${clients.size}`)

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString())
        if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }))
        if (msg.type === 'subscribe' && msg.officeId) {
          client.officeId = msg.officeId
        }
      } catch {}
    })

    ws.on('close', () => {
      clients.delete(client)
      console.log(`WS disconnected | total: ${clients.size}`)
    })

    ws.send(JSON.stringify({ type: 'pong' }))
  })

  return wss
}

export function broadcast(officeId: string, message: object) {
  const data = JSON.stringify(message)
  for (const client of clients) {
    if (client.officeId === officeId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data)
    }
  }
}

export function broadcastAll(message: object) {
  const data = JSON.stringify(message)
  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data)
    }
  }
}
