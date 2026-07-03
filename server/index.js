import 'dotenv/config'
import express         from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import cors            from 'cors'
import path            from 'path'
import { fileURLToPath } from 'url'
import { initDB, getConfig, saveConfig, getCommands, createCommand, updateCommand, deleteCommand, getEvents, saveEvents } from './db.js'
import {
  startBot, stopBot, getStatus, getInfo, getInviteUrl,
  refreshCommands, setupEventListeners, setBroadcast,
} from './bot.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProd    = process.env.NODE_ENV === 'production'

/* ── Vérification DATABASE_URL ───────────────────────────────────────────── */
if (!process.env.DATABASE_URL) {
  console.error('❌  DATABASE_URL manquant. Créez un fichier .env avec votre URL PostgreSQL.')
  console.error('    Exemple : DATABASE_URL=postgresql://user:pass@host:5432/dbname')
  process.exit(1)
}

/* ── Express + WebSocket ─────────────────────────────────────────────────── */

const app    = express()
const server = createServer(app)
const wss    = new WebSocketServer({ server })

app.use(cors())
app.use(express.json())

/* ── Broadcast WebSocket ─────────────────────────────────────────────────── */

function broadcast(type, message) {
  const payload = JSON.stringify({
    type, message,
    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  })
  wss.clients.forEach((ws) => { if (ws.readyState === 1) ws.send(payload) })
}

setBroadcast(broadcast)

wss.on('connection', (ws) => {
  const status = getStatus()
  ws.send(JSON.stringify({
    type: status === 'online' ? 'success' : 'info',
    message: status === 'online'
      ? `Bot déjà en ligne : ${getInfo()?.tag}`
      : 'Console connectée au serveur. Bot hors ligne.',
    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  }))
})

/* ── Routes bot ──────────────────────────────────────────────────────────── */

app.get('/api/bot/status', (_req, res) => {
  res.json({ status: getStatus(), info: getInfo() })
})

app.get('/api/bot/invite', (_req, res) => {
  const url = getInviteUrl()
  if (!url) return res.status(400).json({ error: 'Bot non connecté' })
  res.json({ url })
})

app.post('/api/bot/start', async (_req, res) => {
  const config = await getConfig()
  if (!config.token) return res.status(400).json({ error: 'Token non configuré' })
  try {
    await startBot(config.token, config.intents ?? {})
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post('/api/bot/stop', async (_req, res) => {
  await stopBot()
  res.json({ ok: true })
})

/* ── Health check (pour UptimeRobot / Render) ────────────────────────────── */

app.get('/health', (_req, res) => res.json({ status: 'ok', bot: getStatus() }))

/* ── Routes config ───────────────────────────────────────────────────────── */

app.get('/api/config', async (_req, res) => {
  const { token, ...rest } = await getConfig()
  res.json({ ...rest, hasToken: !!token })
})

app.post('/api/config', async (req, res) => {
  await saveConfig(req.body)
  res.json({ ok: true })
})

/* ── Routes commands ─────────────────────────────────────────────────────── */

app.get('/api/commands', async (_req, res) => {
  res.json(await getCommands())
})

app.post('/api/commands', async (req, res) => {
  const cmd = { ...req.body, id: Date.now() }
  const created = await createCommand(cmd)
  try { await refreshCommands() } catch {}
  res.json(created)
})

app.put('/api/commands/:id', async (req, res) => {
  const updated = await updateCommand(Number(req.params.id), req.body)
  if (!updated) return res.status(404).json({ error: 'Commande introuvable' })
  try { await refreshCommands() } catch {}
  res.json(updated)
})

app.delete('/api/commands/:id', async (req, res) => {
  await deleteCommand(Number(req.params.id))
  try { await refreshCommands() } catch {}
  res.json({ ok: true })
})

/* ── Routes events ───────────────────────────────────────────────────────── */

app.get('/api/events', async (_req, res) => {
  res.json(await getEvents())
})

app.post('/api/events', async (req, res) => {
  await saveEvents(req.body)
  try { await setupEventListeners() } catch {}
  res.json({ ok: true })
})

/* ── Route stats ─────────────────────────────────────────────────────────── */

app.get('/api/stats', async (_req, res) => {
  const info     = getInfo()
  const commands = await getCommands()
  const events   = await getEvents()
  const activeEv = Object.values(events).filter((e) => e?.enabled).length

  res.json({
    status:       getStatus(),
    botTag:       info?.tag  ?? null,
    guilds:       info?.guilds ?? 0,
    ping:         info?.ping   ?? 0,
    commands:     commands.length,
    activeEvents: activeEv,
  })
})

/* ── Production : sert le build Vite ────────────────────────────────────── */

if (isProd) {
  const dist = path.join(__dirname, '..', 'dist')
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

/* ── Démarrage ───────────────────────────────────────────────────────────── */

const PORT = process.env.PORT || 3001

await initDB()
server.listen(PORT, () => {
  console.log(`✓ Serveur → http://localhost:${PORT}`)
})
