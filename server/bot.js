import {
  Client, GatewayIntentBits, REST, Routes,
  SlashCommandBuilder, Events, Partials,
} from 'discord.js'
import { getCommands, getEvents, getConfig } from './db.js'

/* ── Un client Discord par utilisateur ───────────────────────────────────── */
// bots : Map<userId, { client, handlers[] }>
const bots = new Map()

let _broadcast = (userId, type, msg) => console.log(`[user:${userId}][${type.toUpperCase()}] ${msg}`)
export const setBroadcast = (fn) => { _broadcast = fn }

function log(userId, type, message) {
  console.log(`[user:${userId}][${type.toUpperCase()}] ${message}`)
  _broadcast(userId, type, message)
}

/* ── Getters ─────────────────────────────────────────────────────────────── */

export function getStatus(userId) {
  const bot = bots.get(userId)
  if (!bot) return 'offline'
  if (bot.client.isReady()) return 'online'
  return 'connecting'
}

export function getInfo(userId) {
  const bot = bots.get(userId)
  if (!bot?.client.isReady()) return null
  return {
    tag:    bot.client.user.tag,
    id:     bot.client.user.id,
    avatar: bot.client.user.displayAvatarURL(),
    guilds: bot.client.guilds.cache.size,
    ping:   bot.client.ws.ping,
  }
}

export function getInviteUrl(userId) {
  const bot = bots.get(userId)
  if (!bot?.client.isReady()) return null
  return `https://discord.com/oauth2/authorize?client_id=${bot.client.user.id}&scope=bot+applications.commands&permissions=8`
}

/* ── Intent map ─────────────────────────────────────────────────────────── */

const INTENT_MAP = {
  guilds:                GatewayIntentBits.Guilds,
  guildMembers:          GatewayIntentBits.GuildMembers,
  guildMessages:         GatewayIntentBits.GuildMessages,
  guildMessageReactions: GatewayIntentBits.GuildMessageReactions,
  directMessages:        GatewayIntentBits.DirectMessages,
  guildPresences:        GatewayIntentBits.GuildPresences,
  guildVoiceStates:      GatewayIntentBits.GuildVoiceStates,
  messageContent:        GatewayIntentBits.MessageContent,
}

/* ── Start / Stop ────────────────────────────────────────────────────────── */

export async function startBot(userId, token, intents = {}) {
  if (bots.has(userId)) await stopBot(userId)

  const selected = [GatewayIntentBits.Guilds]
  Object.entries(intents).forEach(([k, v]) => {
    if (v && INTENT_MAP[k] && !selected.includes(INTENT_MAP[k])) selected.push(INTENT_MAP[k])
  })

  log(userId, 'info', 'Initialisation du client Discord…')
  const client = new Client({ intents: selected, partials: [Partials.Channel] })
  bots.set(userId, { client, handlers: [] })

  client.on(Events.ClientReady, async (c) => {
    log(userId, 'success', `Connecté en tant que ${c.user.tag}`)
    log(userId, 'success', `Présent sur ${c.guilds.cache.size} serveur(s)`)
    log(userId, 'info',    `Latence : ${c.ws.ping} ms`)
    await registerSlashCommands(userId, token, c.user.id)
    await setupEventListeners(userId)
  })

  client.on(Events.InteractionCreate, (i) => handleInteraction(userId, i))
  client.on(Events.ShardError, (err) => log(userId, 'error', `Erreur WebSocket : ${err.message}`))
  client.rest.on('rateLimited', (info) =>
    log(userId, 'warn', `Rate limit : pause ${Math.ceil(info.timeToReset / 1000)}s`))

  try {
    await client.login(token)
  } catch (err) {
    log(userId, 'error', `Échec de connexion : ${err.message}`)
    bots.delete(userId)
    throw err
  }
}

export async function stopBot(userId) {
  const bot = bots.get(userId)
  if (!bot) return
  log(userId, 'warn', 'Arrêt du bot en cours…')
  removeDynamicListeners(userId)
  bot.client.destroy()
  bots.delete(userId)
  _broadcast(userId, 'error', 'Bot hors ligne.')
}

/* ── Slash commands ──────────────────────────────────────────────────────── */

export async function registerSlashCommands(userId, token, clientId) {
  const commands = await getCommands(userId)
  const enabled  = commands.filter((c) => c.enabled)
  log(userId, 'info', `Synchronisation de ${enabled.length} commande(s) slash…`)

  const rest = new REST({ version: '10' }).setToken(token)
  const body = enabled.map((cmd) =>
    new SlashCommandBuilder()
      .setName(cmd.name.toLowerCase())
      .setDescription(cmd.description || 'Pas de description')
      .toJSON(),
  )
  try {
    await rest.put(Routes.applicationCommands(clientId), { body })
    log(userId, 'success', `${body.length} commande(s) synchronisée(s) ✓`)
  } catch (err) {
    log(userId, 'error', `Erreur sync commandes : ${err.message}`)
  }
}

export async function refreshCommands(userId) {
  const config = await getConfig(userId)
  const bot    = bots.get(userId)
  if (!bot?.client.isReady() || !config.token) return
  await registerSlashCommands(userId, config.token, bot.client.user.id)
  await setupEventListeners(userId)
}

/* ── Interaction handler ─────────────────────────────────────────────────── */

async function handleInteraction(userId, interaction) {
  if (!interaction.isChatInputCommand()) return
  const commands = await getCommands(userId)
  const cmd      = commands.find((c) => c.name === interaction.commandName && c.enabled)
  if (!cmd) return

  const bot = bots.get(userId)
  log(userId, 'info', `Commande /${cmd.name} par ${interaction.user.tag}`)

  try {
    const response = cmd.response
      .replace(/{user}/gi,    `<@${interaction.user.id}>`)
      .replace(/{server}/gi,  interaction.guild?.name || 'DM')
      .replace(/{members}/gi, String(interaction.guild?.memberCount ?? '?'))
      .replace(/{ping}/gi,    String(Math.round(bot?.client.ws.ping ?? 0)))
    await interaction.reply(response)
    log(userId, 'success', `Réponse envoyée pour /${cmd.name}`)
  } catch (err) {
    log(userId, 'error', `Erreur /${cmd.name} : ${err.message}`)
    if (!interaction.replied && !interaction.deferred)
      await interaction.reply({ content: '❌ Erreur.', ephemeral: true }).catch(() => {})
  }
}

/* ── Event listeners ─────────────────────────────────────────────────────── */

function removeDynamicListeners(userId) {
  const bot = bots.get(userId)
  if (!bot) return
  bot.handlers.forEach(({ event, fn }) => bot.client.off(event, fn))
  bot.handlers = []
}

function addHandler(userId, event, fn) {
  const bot = bots.get(userId)
  if (!bot) return
  bot.client.on(event, fn)
  bot.handlers.push({ event, fn })
}

export async function setupEventListeners(userId) {
  const bot = bots.get(userId)
  if (!bot?.client.isReady()) return
  removeDynamicListeners(userId)

  const ev = await getEvents(userId)

  if (ev.welcome?.enabled) {
    addHandler(userId, Events.GuildMemberAdd, async (member) => {
      log(userId, 'info', `Nouveau membre : ${member.user.tag}`)
      const chanName = (ev.welcome.channel || 'bienvenue').replace(/^#/, '')
      const channel  = member.guild.channels.cache.find((c) => c.name === chanName && c.isTextBased())
      if (channel) {
        const msg = (ev.welcome.message || 'Bienvenue {user} sur {server} !')
          .replace(/{user}/gi,    `<@${member.user.id}>`)
          .replace(/{server}/gi,  member.guild.name)
          .replace(/{members}/gi, String(member.guild.memberCount))
        await channel.send(msg).catch((e) => log(userId, 'error', `Welcome: ${e.message}`))
        log(userId, 'success', `Message de bienvenue → #${chanName}`)
      } else {
        log(userId, 'warn', `Salon #${chanName} introuvable`)
      }
    })
  }

  if (ev.goodbye?.enabled) {
    addHandler(userId, Events.GuildMemberRemove, async (member) => {
      log(userId, 'info', `${member.user.tag} a quitté ${member.guild.name}`)
      const chanName = (ev.goodbye.channel || 'général').replace(/^#/, '')
      const channel  = member.guild.channels.cache.find((c) => c.name === chanName && c.isTextBased())
      if (channel) {
        const msg = (ev.goodbye.message || '{user} nous a quittés.')
          .replace(/{user}/gi,   member.user.tag)
          .replace(/{server}/gi, member.guild.name)
        await channel.send(msg).catch((e) => log(userId, 'error', `Goodbye: ${e.message}`))
      }
    })
  }

  if (ev.moderation?.enabled && ev.moderation.words) {
    const banned = ev.moderation.words.split(',').map((w) => w.trim().toLowerCase()).filter(Boolean)
    if (banned.length) {
      addHandler(userId, Events.MessageCreate, async (message) => {
        if (message.author.bot) return
        const found = banned.find((w) => message.content.toLowerCase().includes(w))
        if (found) {
          await message.delete().catch(() => {})
          log(userId, 'warn', `Message supprimé (mot: "${found}") de ${message.author.tag}`)
        }
      })
    }
  }

  if (ev.voicelog?.enabled) {
    addHandler(userId, Events.VoiceStateUpdate, (old, next) => {
      const user = next.member?.user.tag ?? 'Inconnu'
      if (!old.channel && next.channel)        log(userId, 'info', `${user} → #${next.channel.name}`)
      else if (old.channel && !next.channel)   log(userId, 'info', `${user} ← #${old.channel.name}`)
    })
  }

  log(userId, 'info', `${bot.handlers.length} listener(s) actif(s)`)
}
