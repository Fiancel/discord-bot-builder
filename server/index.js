import 'dotenv/config'
import express            from 'express'
import { createServer }   from 'http'
import { WebSocketServer } from 'ws'
import cors               from 'cors'
import helmet             from 'helmet'
import rateLimit          from 'express-rate-limit'
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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProd    = process.env.NODE_ENV === 'production'

/* ── JWT Secret — hard fail en prod si absent ──────────────────────────────── */
if (!process.env.JWT_SECRET) {
  if (isProd) { console.error('❌  JWT_SECRET manquant en production'); process.exit(1) }
  else console.warn('⚠  JWT_SECRET non défini — clé de dev uniquement, NE PAS utiliser en production')
}
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-insecure-key'

if (!process.env.DATABASE_URL) { console.error('❌  DATABASE_URL manquant'); process.exit(1) }

/* ── Regex de validation ─────────────────────────────────────────────────── */
const EMAIL_RE        = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const DISCORD_TOKEN_RE = /^[\w-]{24,}\.[\w-]{6,}\.[\w-]{27,}$/
const BCRYPT_ROUNDS   = 12

/* ── Express ─────────────────────────────────────────────────────────────── */
const app    = express()
const server = createServer(app)
const wss    = new WebSocketServer({ server })

/* ── Helmet — en-têtes de sécurité HTTP ─────────────────────────────────── */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'"],
      styleSrc:       ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:        ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:         ["'self'", 'data:', 'https://cdn.discordapp.com'],
      connectSrc:     ["'self'", 'wss:', 'ws:'],
      frameSrc:       ["'none'"],
      objectSrc:      ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
}))

/* ── CORS — origines autorisées uniquement ───────────────────────────────── */
const allowedOrigins = isProd
  ? [process.env.RENDER_EXTERNAL_URL, process.env.FRONTEND_URL].filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3001', 'http://127.0.0.1:5173']

app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) cb(null, true)
    else cb(Object.assign(new Error('CORS refusé'), { status: 403 }))
  },
  credentials: true,
}))

/* ── Body parsing — limite 64 KB pour bloquer les payloads massifs ────────── */
app.use(express.json({ limit: '64kb' }))
app.use(express.urlencoded({ extended: false, limit: '64kb' }))

/* ── Rate limiters ───────────────────────────────────────────────────────── */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Trop de tentatives — réessayez dans 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
})

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Trop de requêtes — ralentissez' },
  standardHeaders: true,
  legacyHeaders: false,
})

/* ── WebSocket ───────────────────────────────────────────────────────────── */
function broadcast(userId, type, message) {
  const payload = JSON.stringify({ type, message, time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) })
  wss.clients.forEach(ws => { if (ws.userId === userId && ws.readyState === 1) ws.send(payload) })
}
setBroadcast(broadcast)

const wsPending = new Map()
wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress
  const now = Date.now()
  const prev = wsPending.get(ip) ?? []
  const recent = prev.filter(t => now - t < 10_000)
  if (recent.length >= 8) { ws.close(1008, 'Rate limit'); return }
  wsPending.set(ip, [...recent, now])

  try {
    const url   = new URL(req.url, 'http://localhost')
    const token = url.searchParams.get('token')
    if (token) ws.userId = jwt.verify(token, JWT_SECRET).userId
  } catch { ws.userId = null }

  const status = ws.userId ? getStatus(ws.userId) : 'offline'
  ws.send(JSON.stringify({
    type: status === 'online' ? 'success' : 'info',
    message: status === 'online' ? `Bot en ligne: ${getInfo(ws.userId)?.tag}` : 'Console connectée.',
    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  }))
})

/* ── Auth middleware ─────────────────────────────────────────────────────── */
function auth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Non authentifié' })
  try { req.userId = jwt.verify(header.slice(7), JWT_SECRET).userId; next() }
  catch { res.status(401).json({ error: 'Token invalide ou expiré' }) }
}

/* ── Sanitize string helper ──────────────────────────────────────────────── */
const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/* ── Auto-start bot ──────────────────────────────────────────────────────── */
function autoStartBot(userId) {
  if (getStatus(userId) !== 'offline') return   // déjà online ou en cours de connexion
  getConfig(userId).then(cfg => {
    if (!cfg.token) return
    startBot(userId, cfg.token, cfg.intents ?? {}).catch(err => {
      console.warn(`Auto-start bot [user ${userId}] échoué:`, err.message)
    })
  }).catch(() => {})
}

/* ── Auth routes (publiques + rate-limited) ──────────────────────────────── */
app.post('/api/auth/register', authLimiter, async (req, res) => {
  const email    = str(req.body?.email, 255).toLowerCase()
  const password = str(req.body?.password, 200)
  const username = str(req.body?.username, 50)

  if (!email || !password || !username)
    return res.status(400).json({ error: 'Tous les champs sont requis' })
  if (!EMAIL_RE.test(email))
    return res.status(400).json({ error: 'Format d\'email invalide' })
  if (password.length < 8)
    return res.status(400).json({ error: 'Mot de passe trop court (8 caractères minimum)' })
  if (username.length < 2)
    return res.status(400).json({ error: 'Nom d\'utilisateur trop court (2 caractères minimum)' })

  try {
    const hash  = await bcrypt.hash(password, BCRYPT_ROUNDS)
    const user  = await createUser(email, hash, username)
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, user: { id: user.id, email: user.email, username: user.username } })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email déjà utilisé' })
    console.error('register:', err.message)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const email    = str(req.body?.email, 255).toLowerCase()
  const password = str(req.body?.password, 200)

  if (!email || !password)
    return res.status(400).json({ error: 'Email et mot de passe requis' })

  // Même délai si l'utilisateur n'existe pas (défense timing attack)
  const user  = await getUserByEmail(email)
  const dummy = '$2a$12$invalidhashplaceholderXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
  const valid = await bcrypt.compare(password, user?.password ?? dummy)
  if (!user || !valid)
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' })

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })

  // Auto-démarrer le bot en arrière-plan si un token est configuré
  autoStartBot(user.id)

  res.json({ token, user: { id: user.id, email: user.email, username: user.username } })
})

app.get('/api/auth/me', auth, async (req, res) => {
  const user = await getUserById(req.userId)
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })
  const { password: _, ...safe } = user

  // Auto-démarrer le bot en arrière-plan si hors ligne et configuré
  autoStartBot(req.userId)

  res.json(safe)
})

/* ── Health ──────────────────────────────────────────────────────────────── */
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

/* ── Appliquer le rate limiter API à toutes les routes /api authentifiées ── */
app.use('/api', apiLimiter)

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
app.get('/api/config', auth, async (req, res) => {
  const { token, ...rest } = await getConfig(req.userId)
  res.json({ ...rest, hasToken: !!token })
})
app.post('/api/config', auth, async (req, res) => {
  const { token } = req.body
  if (token !== undefined && token !== '' && !DISCORD_TOKEN_RE.test(token))
    return res.status(400).json({ error: 'Format de token Discord invalide' })
  await saveConfig(req.userId, req.body)
  res.json({ ok: true })
})

/* ── Commands ────────────────────────────────────────────────────────────── */
app.get('/api/commands', auth, async (req, res) => res.json(await getCommands(req.userId)))
app.post('/api/commands', auth, async (req, res) => {
  const { name, description, response, enabled } = req.body
  if (!str(name) || !str(response)) return res.status(400).json({ error: 'name et response requis' })
  const cmd     = { name: str(name, 100), description: str(description, 200), response: str(response, 2000), enabled: !!enabled, id: Date.now() }
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
  const [commands, events, autoResp, xpcfg] = await Promise.all([
    getCommands(req.userId), getEvents(req.userId),
    getAutoResponses(req.userId), getXPConfig(req.userId),
  ])
  const info = getInfo(req.userId)
  res.json({
    status: getStatus(req.userId), botTag: info?.tag ?? null,
    guilds: info?.guilds ?? 0, ping: info?.ping ?? 0,
    commands: commands.length,
    activeEvents: Object.values(events).filter(e => e?.enabled).length,
    autoResponses: autoResp.filter(r => r.enabled).length,
    xpEnabled: xpcfg.enabled,
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
  try { res.json([]) } catch { res.json([]) }
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

/* ── Gestionnaire d'erreurs global ───────────────────────────────────────── */
app.use((err, _req, res, _next) => {
  if (err.status === 403) return res.status(403).json({ error: 'Accès refusé' })
  console.error('Erreur non gérée:', err.message)
  res.status(500).json({ error: 'Erreur serveur interne' })
})

/* ── Production — servir le frontend ─────────────────────────────────────── */
if (isProd) {
  const dist = path.join(__dirname, '..', 'dist')
  app.use(express.static(dist, { index: false }))
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
