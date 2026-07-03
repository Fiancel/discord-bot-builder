import 'dotenv/config'
import express            from 'express'
import { createServer }   from 'http'
import { WebSocketServer } from 'ws'
import cors               from 'cors'
import path               from 'path'
import { fileURLToPath }  from 'url'
import jwt                from 'jsonwebtoken'
import bcrypt             from 'bcryptjs'
import {
  initDB, createUser, getUserByEmail, getUserById,
  getConfig, saveConfig,
  getCommands, createCommand, updateCommand, deleteCommand,
  getEvents, saveEvents,
} from './db.js'
import {
  startBot, stopBot, getStatus, getInfo, getInviteUrl,
  refreshCommands, setupEventListeners, setBroadcast,
} from './bot.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProd    = process.env.NODE_ENV === 'production'
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod'

if (!process.env.DATABASE_URL) {
  console.error('❌  DATABASE_URL manquant dans .env')
  process.exit(1)
}

/* ── Express + WebSocket ─────────────────────────────────────────────────── */

const app    = express()
const server = createServer(app)
const wss    = new WebSocketServer({ server })

app.use(cors())
app.use(express.json())

/* ── WebSocket (logs par utilisateur) ───────────────────────────────────── */

function broadcast(userId, type, message) {
  const payload = JSON.stringify({
    type, message,
    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  })
  wss.clients.forEach((ws) => {
    if (ws.userId === userId && ws.readyState === 1) ws.send(payload)
  })
}

setBroadcast(broadcast)

wss.on('connection', (ws, req) => {
  // Authentification via token en query string : ?token=xxx
  try {
    const url   = new URL(req.url, 'http://localhost')
    const token = url.searchParams.get('token')
    if (token) {
      const payload = jwt.verify(token, JWT_SECRET)
      ws.userId = payload.userId
    }
  } catch { ws.userId = null }

  const status = ws.userId ? getStatus(ws.userId) : 'offline'
  ws.send(JSON.stringify({
    type:    status === 'online' ? 'success' : 'info',
    message: status === 'online'
      ? `Bot déjà en ligne : ${getInfo(ws.userId)?.tag}`
      : 'Console connectée. Bot hors ligne.',
    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  }))
})

/* ── Middleware Auth ─────────────────────────────────────────────────────── */

function auth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Non authentifié' })
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET)
    req.userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' })
  }
}

/* ── Routes Auth (publiques) ─────────────────────────────────────────────── */

app.post('/api/auth/register', async (req, res) => {
  const { email, password, username } = req.body
  if (!email || !password || !username)
    return res.status(400).json({ error: 'Tous les champs sont requis' })
  if (password.length < 6)
    return res.status(400).json({ error: 'Mot de passe trop court (6 caractères min)' })
  try {
    const hash = await bcrypt.hash(password, 10)
    const user = await createUser(email.toLowerCase(), hash, username)
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' })
    res.json({ token, user: { id: user.id, email: user.email, username: user.username } })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email déjà utilisé' })
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password)
    return res.status(400).json({ error: 'Email et mot de passe requis' })
  const user = await getUserByEmail(email.toLowerCase())
  if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' })
  res.json({ token, user: { id: user.id, email: user.email, username: user.username } })
})

app.get('/api/auth/me', auth, async (req, res) => {
  const user = await getUserById(req.userId)
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })
  res.json(user)
})

/* ── Health ──────────────────────────────────────────────────────────────── */

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

/* ── Routes Bot (protégées) ──────────────────────────────────────────────── */

app.get('/api/bot/status', auth, (_req, res) => {
  res.json({ status: getStatus(_req.userId), info: getInfo(_req.userId) })
})

app.get('/api/bot/invite', auth, (_req, res) => {
  const url = getInviteUrl(_req.userId)
  if (!url) return res.status(400).json({ error: 'Bot non connecté' })
  res.json({ url })
})

app.post('/api/bot/start', auth, async (req, res) => {
  const config = await getConfig(req.userId)
  if (!config.token) return res.status(400).json({ error: 'Token non configuré' })
  try {
    await startBot(req.userId, config.token, config.intents ?? {})
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post('/api/bot/stop', auth, async (req, res) => {
  await stopBot(req.userId)
  res.json({ ok: true })
})

/* ── Routes Config ───────────────────────────────────────────────────────── */

app.get('/api/config', auth, async (req, res) => {
  const { token, ...rest } = await getConfig(req.userId)
  res.json({ ...rest, hasToken: !!token })
})

app.post('/api/config', auth, async (req, res) => {
  await saveConfig(req.userId, req.body)
  res.json({ ok: true })
})

/* ── Routes Commands ─────────────────────────────────────────────────────── */

app.get('/api/commands', auth, async (req, res) => {
  res.json(await getCommands(req.userId))
})

app.post('/api/commands', auth, async (req, res) => {
  const cmd     = { ...req.body, id: Date.now() }
  const created = await createCommand(req.userId, cmd)
  try { await refreshCommands(req.userId) } catch {}
  res.json(created)
})

app.put('/api/commands/:id', auth, async (req, res) => {
  const updated = await updateCommand(req.userId, Number(req.params.id), req.body)
  if (!updated) return res.status(404).json({ error: 'Commande introuvable' })
  try { await refreshCommands(req.userId) } catch {}
  res.json(updated)
})

app.delete('/api/commands/:id', auth, async (req, res) => {
  await deleteCommand(req.userId, Number(req.params.id))
  try { await refreshCommands(req.userId) } catch {}
  res.json({ ok: true })
})

/* ── Routes Events ───────────────────────────────────────────────────────── */

app.get('/api/events', auth, async (req, res) => {
  res.json(await getEvents(req.userId))
})

app.post('/api/events', auth, async (req, res) => {
  await saveEvents(req.userId, req.body)
  try { await setupEventListeners(req.userId) } catch {}
  res.json({ ok: true })
})

/* ── Stats ───────────────────────────────────────────────────────────────── */

app.get('/api/stats', auth, async (req, res) => {
  const info     = getInfo(req.userId)
  const commands = await getCommands(req.userId)
  const events   = await getEvents(req.userId)
  res.json({
    status:       getStatus(req.userId),
    botTag:       info?.tag   ?? null,
    guilds:       info?.guilds ?? 0,
    ping:         info?.ping   ?? 0,
    commands:     commands.length,
    activeEvents: Object.values(events).filter((e) => e?.enabled).length,
  })
})

/* ── Production ──────────────────────────────────────────────────────────── */

if (isProd) {
  const dist = path.join(__dirname, '..', 'dist')
  app.use(express.static(dist))
  app.use((_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

/* ── Démarrage ───────────────────────────────────────────────────────────── */

const PORT = process.env.PORT || 3001
await initDB()
server.listen(PORT, () => {
  console.log(`✓ Serveur → http://localhost:${PORT}`)
  if (isProd && process.env.RENDER_EXTERNAL_URL) {
    const url = `${process.env.RENDER_EXTERNAL_URL}/health`
    setInterval(() => { fetch(url).catch(() => {}) }, 4 * 60 * 1000)
    console.log(`✓ Auto-ping actif → ${url}`)
  }
})
