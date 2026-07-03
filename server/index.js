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
  getAutoResponses, createAutoResponse, updateAutoResponse, deleteAutoResponse,
  getBotStatus, saveBotStatus,
  getXPConfig, saveXPConfig, getLeaderboard,
  getScheduledMessages, createScheduledMessage, updateScheduledMessage, deleteScheduledMessage,
  getEmbedTemplates, createEmbedTemplate, updateEmbedTemplate, deleteEmbedTemplate,
  getAntiSpamConfig, saveAntiSpamConfig,
  getModLogConfig, saveModLogConfig,
  getTicketConfig, saveTicketConfig,
  getRoleConfig, saveRoleConfig, getReactionRoles, addReactionRole, deleteReactionRole,
} from './db.js'
import {
  startBot, stopBot, getStatus, getInfo, getInviteUrl,
  refreshCommands, setupAllListeners, setBroadcast, applyBotStatus, sendEmbedToChannel,
} from './bot.js'

const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const isProd     = process.env.NODE_ENV === 'production'
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod'

if (!process.env.DATABASE_URL) { console.error('❌  DATABASE_URL manquant'); process.exit(1) }

const app    = express()
const server = createServer(app)
const wss    = new WebSocketServer({ server })

app.use(cors())
app.use(express.json())

/* ── WebSocket ───────────────────────────────────────────────────────────── */
function broadcast(userId, type, message) {
  const payload = JSON.stringify({ type, message, time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) })
  wss.clients.forEach(ws => { if (ws.userId === userId && ws.readyState === 1) ws.send(payload) })
}
setBroadcast(broadcast)

wss.on('connection', (ws, req) => {
  try {
    const url   = new URL(req.url, 'http://localhost')
    const token = url.searchParams.get('token')
    if (token) ws.userId = jwt.verify(token, JWT_SECRET).userId
  } catch { ws.userId = null }
  const status = ws.userId ? getStatus(ws.userId) : 'offline'
  ws.send(JSON.stringify({ type: status === 'online' ? 'success' : 'info', message: status === 'online' ? `Bot en ligne: ${getInfo(ws.userId)?.tag}` : 'Console connectée.', time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }))
})

/* ── Auth middleware ─────────────────────────────────────────────────────── */
function auth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Non authentifié' })
  try { req.userId = jwt.verify(header.slice(7), JWT_SECRET).userId; next() }
  catch { res.status(401).json({ error: 'Token invalide ou expiré' }) }
}

/* ── Auth routes (publiques) ─────────────────────────────────────────────── */
app.post('/api/auth/register', async (req, res) => {
  const { email, password, username } = req.body
  if (!email || !password || !username) return res.status(400).json({ error: 'Tous les champs sont requis' })
  if (password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (6 caractères min)' })
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
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' })
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

/* ── Bot ─────────────────────────────────────────────────────────────────── */
app.get('/api/bot/status', auth, (req, res) => res.json({ status: getStatus(req.userId), info: getInfo(req.userId) }))
app.get('/api/bot/invite', auth, (req, res) => {
  const url = getInviteUrl(req.userId)
  if (!url) return res.status(400).json({ error: 'Bot non connecté' })
  res.json({ url })
})
app.post('/api/bot/start', auth, async (req, res) => {
  const config = await getConfig(req.userId)
  if (!config.token) return res.status(400).json({ error: 'Token non configuré' })
  try { await startBot(req.userId, config.token, config.intents ?? {}); res.json({ ok: true }) }
  catch (err) { res.status(400).json({ error: err.message }) }
})
app.post('/api/bot/stop', auth, async (req, res) => { await stopBot(req.userId); res.json({ ok: true }) })

/* ── Config ──────────────────────────────────────────────────────────────── */
app.get('/api/config', auth, async (req, res) => { const { token, ...rest } = await getConfig(req.userId); res.json({ ...rest, hasToken: !!token }) })
app.post('/api/config', auth, async (req, res) => { await saveConfig(req.userId, req.body); res.json({ ok: true }) })

/* ── Commands ────────────────────────────────────────────────────────────── */
app.get('/api/commands', auth, async (req, res) => res.json(await getCommands(req.userId)))
app.post('/api/commands', auth, async (req, res) => {
  const cmd = { ...req.body, id: Date.now() }
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

/* ── Events ──────────────────────────────────────────────────────────────── */
app.get('/api/events', auth, async (req, res) => res.json(await getEvents(req.userId)))
app.post('/api/events', auth, async (req, res) => {
  await saveEvents(req.userId, req.body)
  try { await setupAllListeners(req.userId) } catch {}
  res.json({ ok: true })
})

/* ── Stats ───────────────────────────────────────────────────────────────── */
app.get('/api/stats', auth, async (req, res) => {
  const info     = getInfo(req.userId)
  const commands = await getCommands(req.userId)
  const events   = await getEvents(req.userId)
  const autoResp = await getAutoResponses(req.userId)
  const xpcfg    = await getXPConfig(req.userId)
  res.json({
    status: getStatus(req.userId), botTag: info?.tag ?? null, guilds: info?.guilds ?? 0, ping: info?.ping ?? 0,
    commands: commands.length, activeEvents: Object.values(events).filter(e => e?.enabled).length,
    autoResponses: autoResp.filter(r => r.enabled).length, xpEnabled: xpcfg.enabled,
  })
})

/* ── Auto-Répondeur ──────────────────────────────────────────────────────── */
app.get('/api/auto-responses', auth, async (req, res) => res.json(await getAutoResponses(req.userId)))
app.post('/api/auto-responses', auth, async (req, res) => {
  const ar = await createAutoResponse(req.userId, req.body)
  try { await setupAllListeners(req.userId) } catch {}
  res.json(ar)
})
app.put('/api/auto-responses/:id', auth, async (req, res) => {
  const updated = await updateAutoResponse(req.userId, Number(req.params.id), req.body)
  if (!updated) return res.status(404).json({ error: 'Introuvable' })
  try { await setupAllListeners(req.userId) } catch {}
  res.json(updated)
})
app.delete('/api/auto-responses/:id', auth, async (req, res) => {
  await deleteAutoResponse(req.userId, Number(req.params.id))
  try { await setupAllListeners(req.userId) } catch {}
  res.json({ ok: true })
})

/* ── Bot Status ──────────────────────────────────────────────────────────── */
app.get('/api/bot-status', auth, async (req, res) => res.json(await getBotStatus(req.userId)))
app.post('/api/bot-status', auth, async (req, res) => {
  await saveBotStatus(req.userId, req.body)
  await applyBotStatus(req.userId)
  res.json({ ok: true })
})

/* ── XP ──────────────────────────────────────────────────────────────────── */
app.get('/api/xp', auth, async (req, res) => res.json(await getXPConfig(req.userId)))
app.post('/api/xp', auth, async (req, res) => {
  await saveXPConfig(req.userId, req.body)
  try { await setupAllListeners(req.userId) } catch {}
  res.json({ ok: true })
})
app.get('/api/xp/leaderboard', auth, async (req, res) => {
  const info = getInfo(req.userId)
  if (!info) return res.json([])
  const guilds = []
  try {
    const bot = (await import('./bot.js'))
    res.json([])
  } catch { res.json([]) }
})

/* ── Messages Planifiés ──────────────────────────────────────────────────── */
app.get('/api/scheduled', auth, async (req, res) => res.json(await getScheduledMessages(req.userId)))
app.post('/api/scheduled', auth, async (req, res) => res.json(await createScheduledMessage(req.userId, req.body)))
app.put('/api/scheduled/:id', auth, async (req, res) => { await updateScheduledMessage(req.userId, Number(req.params.id), req.body); res.json({ ok: true }) })
app.delete('/api/scheduled/:id', auth, async (req, res) => { await deleteScheduledMessage(req.userId, Number(req.params.id)); res.json({ ok: true }) })

/* ── Embeds ──────────────────────────────────────────────────────────────── */
app.get('/api/embeds', auth, async (req, res) => res.json(await getEmbedTemplates(req.userId)))
app.post('/api/embeds', auth, async (req, res) => res.json(await createEmbedTemplate(req.userId, req.body)))
app.put('/api/embeds/:id', auth, async (req, res) => { await updateEmbedTemplate(req.userId, Number(req.params.id), req.body); res.json({ ok: true }) })
app.delete('/api/embeds/:id', auth, async (req, res) => { await deleteEmbedTemplate(req.userId, Number(req.params.id)); res.json({ ok: true }) })
app.post('/api/embeds/send', auth, async (req, res) => {
  const { channelId, ...embedData } = req.body
  if (!channelId) return res.status(400).json({ error: 'channelId requis' })
  try { await sendEmbedToChannel(req.userId, channelId, embedData); res.json({ ok: true }) }
  catch (err) { res.status(400).json({ error: err.message }) }
})

/* ── Anti-Spam ───────────────────────────────────────────────────────────── */
app.get('/api/antispam', auth, async (req, res) => res.json(await getAntiSpamConfig(req.userId)))
app.post('/api/antispam', auth, async (req, res) => {
  await saveAntiSpamConfig(req.userId, req.body)
  try { await setupAllListeners(req.userId) } catch {}
  res.json({ ok: true })
})

/* ── Logs Modération ─────────────────────────────────────────────────────── */
app.get('/api/modlog', auth, async (req, res) => res.json(await getModLogConfig(req.userId)))
app.post('/api/modlog', auth, async (req, res) => {
  await saveModLogConfig(req.userId, req.body)
  try { await setupAllListeners(req.userId) } catch {}
  res.json({ ok: true })
})

/* ── Tickets ─────────────────────────────────────────────────────────────── */
app.get('/api/tickets', auth, async (req, res) => res.json(await getTicketConfig(req.userId)))
app.post('/api/tickets', auth, async (req, res) => { await saveTicketConfig(req.userId, req.body); res.json({ ok: true }) })

/* ── Rôles ───────────────────────────────────────────────────────────────── */
app.get('/api/roles', auth, async (req, res) => {
  const [config, reactionRoles] = await Promise.all([getRoleConfig(req.userId), getReactionRoles(req.userId)])
  res.json({ config, reactionRoles })
})
app.post('/api/roles', auth, async (req, res) => {
  await saveRoleConfig(req.userId, req.body)
  try { await setupAllListeners(req.userId) } catch {}
  res.json({ ok: true })
})
app.post('/api/roles/reaction', auth, async (req, res) => {
  const rr = await addReactionRole(req.userId, req.body)
  try { await setupAllListeners(req.userId) } catch {}
  res.json(rr)
})
app.delete('/api/roles/reaction/:id', auth, async (req, res) => {
  await deleteReactionRole(req.userId, Number(req.params.id))
  try { await setupAllListeners(req.userId) } catch {}
  res.json({ ok: true })
})

/* ── Production ──────────────────────────────────────────────────────────── */
if (isProd) {
  const dist = path.join(__dirname, '..', 'dist')
  app.use(express.static(dist))
  app.use((_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

/* ── Start ───────────────────────────────────────────────────────────────── */
const PORT = process.env.PORT || 3001
await initDB()
server.listen(PORT, () => {
  console.log(`✓ Serveur → http://localhost:${PORT}`)
  if (isProd && process.env.RENDER_EXTERNAL_URL) {
    const url = `${process.env.RENDER_EXTERNAL_URL}/health`
    setInterval(() => { fetch(url).catch(() => {}) }, 4 * 60 * 1000)
    console.log(`✓ Auto-ping → ${url}`)
  }
})
