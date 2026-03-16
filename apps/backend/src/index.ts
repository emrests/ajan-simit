import http from 'http'
import express from 'express'
import cors from 'cors'
import { initDb } from './db/database'
import { officesRouter } from './routes/offices'
import { agentsRouter } from './routes/agents'
import { projectsRouter } from './routes/projects'
import { messagesRouter } from './routes/messages'
import { sessionsRouter } from './routes/sessions'
import { skillsRouter } from './routes/skills'
import { hooksRouter } from './routes/hooks'
import { mcpRouter } from './routes/mcp'
import { worktreesRouter } from './routes/worktrees'
import { teamsRouter } from './routes/teams'
import { subagentsRouter } from './routes/subagents'
import { seedRouter } from './routes/seed'
import { trainingRouter } from './routes/training'
import { createWsServer } from './ws/server'
import { initWatcher, closeWatcher } from './watcher/jsonlWatcher'

const PORT = process.env.PORT || 3001

const app = express()
const server = http.createServer(app)

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// Routes
app.use('/api/offices', officesRouter)
app.use('/api', agentsRouter)
app.use('/api', projectsRouter)
app.use('/api', messagesRouter)
app.use('/api', sessionsRouter)
app.use('/api', skillsRouter)
app.use('/api', hooksRouter)
app.use('/api', mcpRouter)
app.use('/api', worktreesRouter)
app.use('/api', teamsRouter)
app.use('/api', subagentsRouter)
app.use('/api', seedRouter)
app.use('/api', trainingRouter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// WebSocket
createWsServer(server)

// Init DB & Watcher
initDb()
initWatcher()

// Graceful shutdown
process.on('SIGTERM', () => { closeWatcher(); process.exit(0) })
process.on('SIGINT', () => { closeWatcher(); process.exit(0) })

server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════╗
  ║   SmithAgentOffice Backend       ║
  ║   http://localhost:${PORT}          ║
  ║   ws://localhost:${PORT}            ║
  ╚══════════════════════════════════╝
  `)
})
