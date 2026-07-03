import {
  Client, GatewayIntentBits, REST, Routes,
  SlashCommandBuilder, Events, Partials,
} from 'discord.js'
import { getCommands, getEvents, getConfig } from './db.js'

let client          = null
let dynamicHandlers = []
let _broadcast      = (type, msg) => console.log(`[${type.toUpperCase()}] ${msg}`)

export const setBroadcast = (fn) => { _broadcast = fn }

function log(type, message) {
  console.log(`[${type.toUpperCase()}] ${message}`)
  _broadcast(type, message)
}

/* ── Getters ─────────────────────────────────────────────────────────────── */

export const getStatus = () => {
  if (!client)          return 'offline'
  if (client.isReady()) return 'online'
  return 'connecting'
}

export function getInfo() {
  if (!client?.isReady()) return null
  return {
    tag:    client.user.tag,
    id:     client.user.id,
    avatar: client.user.displayAvatarURL(),
    guilds: client.guilds.cache.size,
    ping:   client.ws.ping,
  }
}

export function getInviteUrl() {
  if (!client?.isReady()) return null
  return `https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot+applications.commands&permissions=8`
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

export async function startBot(token, intents = {}) {
  if (client) await stopBot()

  const selected = [GatewayIntentBits.Guilds]
  Object.entries(intents).forEach(([k, v]) => {
    if (v && INTENT_MAP[k] && !selected.includes(INTENT_MAP[k]))
      selected.push(INTENT_MAP[k])
  })

  log('info', 'Initialisation du client Discord…')
  client = new Client({ intents: selected, partials: [Partials.Channel] })

  client.on(Events.ClientReady, async (c) => {
    log('success', `Connecté en tant que ${c.user.tag}`)
    log('success', `Présent sur ${c.guilds.cache.size} serveur(s)`)
    log('info',    `Latence WebSocket : ${c.ws.ping} ms`)
    await registerSlashCommands(token, c.user.id)
    await setupEventListeners()
  })

  client.on(Events.InteractionCreate, handleInteraction)

  client.on(Events.ShardError, (err) =>
    log('error', `Erreur WebSocket : ${err.message}`))

  client.rest.on('rateLimited', (info) =>
    log('warn', `Rate limit : pause de ${Math.ceil(info.timeToReset / 1000)}s`))

  try {
    await client.login(token)
  } catch (err) {
    log('error', `Échec de connexion : ${err.message}`)
    client = null
    throw err
  }
}

export async function stopBot() {
  if (!client) return
  log('warn', 'Arrêt du bot en cours…')
  removeDynamicListeners()
  client.destroy()
  client = null
  log('error', 'Bot hors ligne.')
}

/* ── Slash commands ──────────────────────────────────────────────────────── */

export async function registerSlashCommands(token, clientId) {
  const commands = await getCommands()
  const enabled  = commands.filter((c) => c.enabled)

  log('info', `Synchronisation de ${enabled.length} commande(s) slash…`)

  const rest = new REST({ version: '10' }).setToken(token)
  const body = enabled.map((cmd) =>
    new SlashCommandBuilder()
      .setName(cmd.name.toLowerCase())
      .setDescription(cmd.description || 'Pas de description')
      .toJSON(),
  )

  try {
    await rest.put(Routes.applicationCommands(clientId), { body })
    log('success', `${body.length} commande(s) slash synchronisée(s) ✓`)
  } catch (err) {
    log('error', `Erreur synchronisation commandes : ${err.message}`)
  }
}

export async function refreshCommands() {
  const config = await getConfig()
  if (!client?.isReady() || !config.token) return
  await registerSlashCommands(config.token, client.user.id)
  await setupEventListeners()
}

/* ── Interaction handler ─────────────────────────────────────────────────── */

async function handleInteraction(interaction) {
  if (!interaction.isChatInputCommand()) return

  const commands = await getCommands()
  const cmd      = commands.find((c) => c.name === interaction.commandName && c.enabled)
  if (!cmd) return

  log('info', `Commande /${cmd.name} par ${interaction.user.tag} dans ${interaction.guild?.name || 'DM'}`)

  try {
    const response = cmd.response
      .replace(/{user}/gi,    `<@${interaction.user.id}>`)
      .replace(/{server}/gi,  interaction.guild?.name || 'DM')
      .replace(/{members}/gi, String(interaction.guild?.memberCount ?? '?'))
      .replace(/{ping}/gi,    String(Math.round(client.ws.ping)))

    await interaction.reply(response)
    log('success', `Réponse envoyée pour /${cmd.name}`)
  } catch (err) {
    log('error', `Erreur réponse /${cmd.name} : ${err.message}`)
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Une erreur est survenue.', ephemeral: true }).catch(() => {})
    }
  }
}

/* ── Event listeners ─────────────────────────────────────────────────────── */

function removeDynamicListeners() {
  dynamicHandlers.forEach(({ event, fn }) => client?.off(event, fn))
  dynamicHandlers = []
}

function addHandler(event, fn) {
  client.on(event, fn)
  dynamicHandlers.push({ event, fn })
}

export async function setupEventListeners() {
  if (!client?.isReady()) return
  removeDynamicListeners()

  const ev = await getEvents()

  // ── Welcome ──
  if (ev.welcome?.enabled) {
    addHandler(Events.GuildMemberAdd, async (member) => {
      log('info', `Nouveau membre : ${member.user.tag} a rejoint ${member.guild.name}`)
      const chanName = (ev.welcome.channel || 'bienvenue').replace(/^#/, '')
      const channel  = member.guild.channels.cache.find((c) => c.name === chanName && c.isTextBased())
      if (channel) {
        const msg = (ev.welcome.message || 'Bienvenue {user} sur {server} !')
          .replace(/{user}/gi,    `<@${member.user.id}>`)
          .replace(/{server}/gi,  member.guild.name)
          .replace(/{members}/gi, String(member.guild.memberCount))
        await channel.send(msg).catch((e) => log('error', `Welcome: ${e.message}`))
        log('success', `Message de bienvenue envoyé dans #${chanName}`)
      } else {
        log('warn', `Salon #${chanName} introuvable pour le message de bienvenue`)
      }
    })
  }

  // ── Goodbye ──
  if (ev.goodbye?.enabled) {
    addHandler(Events.GuildMemberRemove, async (member) => {
      log('info', `${member.user.tag} a quitté ${member.guild.name}`)
      const chanName = (ev.goodbye.channel || 'général').replace(/^#/, '')
      const channel  = member.guild.channels.cache.find((c) => c.name === chanName && c.isTextBased())
      if (channel) {
        const msg = (ev.goodbye.message || '{user} nous a quittés.')
          .replace(/{user}/gi,   member.user.tag)
          .replace(/{server}/gi, member.guild.name)
        await channel.send(msg).catch((e) => log('error', `Goodbye: ${e.message}`))
      }
    })
  }

  // ── Auto-modération ──
  if (ev.moderation?.enabled && ev.moderation.words) {
    const banned = ev.moderation.words.split(',').map((w) => w.trim().toLowerCase()).filter(Boolean)
    if (banned.length) {
      addHandler(Events.MessageCreate, async (message) => {
        if (message.author.bot) return
        const found = banned.find((w) => message.content.toLowerCase().includes(w))
        if (found) {
          await message.delete().catch(() => {})
          log('warn', `Message supprimé (mot interdit: "${found}") de ${message.author.tag}`)
        }
      })
    }
  }

  // ── Voice log ──
  if (ev.voicelog?.enabled) {
    addHandler(Events.VoiceStateUpdate, (old, next) => {
      const user = next.member?.user.tag ?? 'Inconnu'
      if (!old.channel && next.channel)
        log('info', `${user} a rejoint le vocal #${next.channel.name}`)
      else if (old.channel && !next.channel)
        log('info', `${user} a quitté le vocal #${old.channel.name}`)
      else if (old.channel && next.channel && old.channel.id !== next.channel.id)
        log('info', `${user} : #${old.channel.name} → #${next.channel.name}`)
    })
  }

  log('info', `${dynamicHandlers.length} listener(s) d'événements actif(s)`)
}
