import {
  Client, GatewayIntentBits, REST, Routes,
  SlashCommandBuilder, Events, Partials,
  EmbedBuilder, PermissionsBitField, ChannelType,
  ActivityType,
} from 'discord.js'
import {
  getCommands, getEvents, getConfig,
  getAutoResponses, incrementAutoResponseUses,
  getBotStatus,
  getXPConfig, getOrCreateUserXP, addXPToUser, getLeaderboard,
  getDueScheduledMessages, markScheduledSent,
  getAntiSpamConfig,
  getModLogConfig,
  getTicketConfig,
  getRoleConfig, getReactionRoles,
} from './db.js'

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
  return bot.client.isReady() ? 'online' : 'connecting'
}
export function getInfo(userId) {
  const bot = bots.get(userId)
  if (!bot?.client.isReady()) return null
  return { tag: bot.client.user.tag, id: bot.client.user.id, avatar: bot.client.user.displayAvatarURL(), guilds: bot.client.guilds.cache.size, ping: bot.client.ws.ping }
}
export function getInviteUrl(userId) {
  const bot = bots.get(userId)
  if (!bot?.client.isReady()) return null
  return `https://discord.com/oauth2/authorize?client_id=${bot.client.user.id}&scope=bot+applications.commands&permissions=8`
}

/* ── Intent map ─────────────────────────────────────────────────────────── */
const INTENT_MAP = {
  guilds: GatewayIntentBits.Guilds,
  guildMembers: GatewayIntentBits.GuildMembers,
  guildMessages: GatewayIntentBits.GuildMessages,
  guildMessageReactions: GatewayIntentBits.GuildMessageReactions,
  directMessages: GatewayIntentBits.DirectMessages,
  guildPresences: GatewayIntentBits.GuildPresences,
  guildVoiceStates: GatewayIntentBits.GuildVoiceStates,
  messageContent: GatewayIntentBits.MessageContent,
}

/* ── Start / Stop ────────────────────────────────────────────────────────── */
export async function startBot(userId, token, intents = {}) {
  if (bots.has(userId)) await stopBot(userId)
  const selected = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences]
  Object.entries(intents).forEach(([k, v]) => {
    if (v && INTENT_MAP[k] && !selected.includes(INTENT_MAP[k])) selected.push(INTENT_MAP[k])
  })
  log(userId, 'info', 'Initialisation du client Discord…')
  const client = new Client({
    intents: selected,
    partials: [Partials.Channel, Partials.Message, Partials.Reaction],
  })
  bots.set(userId, { client, handlers: [] })

  client.on(Events.ClientReady, async (c) => {
    log(userId, 'success', `Connecté en tant que ${c.user.tag}`)
    log(userId, 'success', `${c.guilds.cache.size} serveur(s) | Ping: ${c.ws.ping}ms`)
    await registerSlashCommands(userId, token, c.user.id)
    await applyBotStatus(userId)
    await setupAllListeners(userId)
  })

  client.on(Events.InteractionCreate, (i) => handleInteraction(userId, i))
  client.on(Events.ShardError, (err) => log(userId, 'error', `Erreur WS: ${err.message}`))

  try {
    await client.login(token)
  } catch (err) {
    log(userId, 'error', `Échec de connexion: ${err.message}`)
    bots.delete(userId)
    throw err
  }
}

export async function stopBot(userId) {
  const bot = bots.get(userId)
  if (!bot) return
  log(userId, 'warn', 'Arrêt du bot…')
  removeDynamicListeners(userId)
  bot.client.destroy()
  bots.delete(userId)
  _broadcast(userId, 'error', 'Bot hors ligne.')
}

/* ── Slash commands ──────────────────────────────────────────────────────── */
const SYSTEM_COMMANDS = [
  new SlashCommandBuilder()
    .setName('poll').setDescription('Créer un sondage')
    .addStringOption(o => o.setName('question').setDescription('Question').setRequired(true))
    .addStringOption(o => o.setName('option1').setDescription('Option 1').setRequired(true))
    .addStringOption(o => o.setName('option2').setDescription('Option 2').setRequired(true))
    .addStringOption(o => o.setName('option3').setDescription('Option 3'))
    .addStringOption(o => o.setName('option4').setDescription('Option 4')),
  new SlashCommandBuilder().setName('ticket').setDescription('Ouvrir un ticket de support'),
  new SlashCommandBuilder().setName('close').setDescription('Fermer ce ticket'),
  new SlashCommandBuilder().setName('leaderboard').setDescription('Classement XP du serveur'),
  new SlashCommandBuilder().setName('rank').setDescription('Voir votre niveau XP'),
]

export async function registerSlashCommands(userId, token, clientId) {
  const commands = await getCommands(userId)
  const enabled  = commands.filter(c => c.enabled)
  const userCmds = enabled.map(cmd =>
    new SlashCommandBuilder()
      .setName(cmd.name.toLowerCase())
      .setDescription(cmd.description || 'Pas de description').toJSON())
  const body = [...userCmds, ...SYSTEM_COMMANDS.map(c => c.toJSON())]
  log(userId, 'info', `Synchronisation de ${body.length} commande(s)…`)
  const rest = new REST({ version: '10' }).setToken(token)
  try {
    await rest.put(Routes.applicationCommands(clientId), { body })
    log(userId, 'success', `${body.length} commande(s) synchronisée(s) ✓`)
  } catch (err) {
    log(userId, 'error', `Erreur sync: ${err.message}`)
  }
}

export async function refreshCommands(userId) {
  const config = await getConfig(userId)
  const bot    = bots.get(userId)
  if (!bot?.client.isReady() || !config.token) return
  await registerSlashCommands(userId, config.token, bot.client.user.id)
  await setupAllListeners(userId)
}

/* ── Statut du Bot ───────────────────────────────────────────────────────── */
const ACTIVITY_TYPES = {
  playing: ActivityType.Playing, watching: ActivityType.Watching,
  listening: ActivityType.Listening, competing: ActivityType.Competing,
  streaming: ActivityType.Streaming,
}

export async function applyBotStatus(userId) {
  const bot = bots.get(userId)
  if (!bot?.client.isReady()) return
  const status = await getBotStatus(userId)
  if (status.activity_text) {
    bot.client.user.setActivity(status.activity_text, { type: ACTIVITY_TYPES[status.activity_type] || ActivityType.Playing })
    log(userId, 'info', `Statut: ${status.activity_type} "${status.activity_text}"`)
  } else {
    bot.client.user.setActivity(null)
  }
}

/* ── Listeners helpers ───────────────────────────────────────────────────── */
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

/* ── Setup all listeners ─────────────────────────────────────────────────── */
export async function setupAllListeners(userId) {
  const bot = bots.get(userId)
  if (!bot?.client.isReady()) return
  removeDynamicListeners(userId)
  await setupEventListeners(userId)
  await setupAutoResponses(userId)
  await setupXP(userId)
  await setupAntiSpam(userId)
  await setupModLog(userId)
  await setupRoles(userId)
  await setupReactionRoles(userId)
  log(userId, 'info', `${bot.handlers.length} listener(s) actif(s)`)
}

/* ── 1. Events classiques ────────────────────────────────────────────────── */
async function setupEventListeners(userId) {
  const ev = await getEvents(userId)
  if (ev.welcome?.enabled) {
    addHandler(userId, Events.GuildMemberAdd, async (member) => {
      log(userId, 'info', `Nouveau membre: ${member.user.tag}`)
      const chanName = (ev.welcome.channel || 'bienvenue').replace(/^#/, '')
      const channel  = member.guild.channels.cache.find(c => c.name === chanName && c.isTextBased())
      if (channel) {
        const msg = (ev.welcome.message || 'Bienvenue {user} sur {server} !')
          .replace(/{user}/gi, `<@${member.user.id}>`).replace(/{server}/gi, member.guild.name).replace(/{members}/gi, String(member.guild.memberCount))
        await channel.send(msg).catch(e => log(userId, 'error', `Welcome: ${e.message}`))
      }
    })
  }
  if (ev.goodbye?.enabled) {
    addHandler(userId, Events.GuildMemberRemove, async (member) => {
      const chanName = (ev.goodbye.channel || 'général').replace(/^#/, '')
      const channel  = member.guild.channels.cache.find(c => c.name === chanName && c.isTextBased())
      if (channel) {
        const msg = (ev.goodbye.message || '{user} nous a quittés.').replace(/{user}/gi, member.user.tag).replace(/{server}/gi, member.guild.name)
        await channel.send(msg).catch(() => {})
      }
    })
  }
  if (ev.moderation?.enabled && ev.moderation.words) {
    const banned = ev.moderation.words.split(',').map(w => w.trim().toLowerCase()).filter(Boolean)
    if (banned.length) {
      addHandler(userId, Events.MessageCreate, async (message) => {
        if (message.author?.bot) return
        const found = banned.find(w => message.content.toLowerCase().includes(w))
        if (found) { await message.delete().catch(() => {}); log(userId, 'warn', `Mot banni supprimé: "${found}"`) }
      })
    }
  }
  if (ev.voicelog?.enabled) {
    addHandler(userId, Events.VoiceStateUpdate, (old, next) => {
      const user = next.member?.user.tag ?? 'Inconnu'
      if (!old.channel && next.channel)      log(userId, 'info', `${user} → #${next.channel.name}`)
      else if (old.channel && !next.channel) log(userId, 'info', `${user} ← #${old.channel.name}`)
    })
  }
}

/* ── 2. Auto-Répondeur ───────────────────────────────────────────────────── */
async function setupAutoResponses(userId) {
  const responses = await getAutoResponses(userId)
  const active    = responses.filter(r => r.enabled)
  if (!active.length) return
  addHandler(userId, Events.MessageCreate, async (message) => {
    if (message.author?.bot) return
    const content = message.content.toLowerCase()
    for (const ar of active) {
      const trigger = ar.trigger.toLowerCase()
      let match = false
      if (ar.match_type === 'exact')      match = content === trigger
      else if (ar.match_type === 'startswith') match = content.startsWith(trigger)
      else                                    match = content.includes(trigger)
      if (match) {
        await message.reply(ar.response).catch(() => {})
        await incrementAutoResponseUses(ar.id)
        log(userId, 'info', `Auto-réponse "${ar.trigger}" → ${message.author.tag}`)
        break
      }
    }
  })
  log(userId, 'info', `Auto-répondeur: ${active.length} trigger(s)`)
}

/* ── 3. XP & Niveaux ────────────────────────────────────────────────────── */
function getLevelFromXP(xp) { return Math.floor(Math.sqrt(Number(xp) / 100)) }
function getXPForLevel(level) { return level * level * 100 }

async function setupXP(userId) {
  const cfg = await getXPConfig(userId)
  if (!cfg.enabled) return
  addHandler(userId, Events.MessageCreate, async (message) => {
    if (message.author?.bot || !message.guild) return
    const record = await getOrCreateUserXP(userId, message.author.id, message.author.tag, message.guild.id)
    const cooldownMs = (cfg.cooldown_seconds || 60) * 1000
    if (Date.now() - new Date(record.last_xp).getTime() < cooldownMs) return
    const xpGain  = cfg.xp_per_msg || 15
    const updated = await addXPToUser(userId, message.author.id, message.author.tag, message.guild.id, xpGain)
    if (!updated) return
    const oldLevel = getLevelFromXP(Number(updated.xp) - xpGain)
    const newLevel = getLevelFromXP(Number(updated.xp))
    if (newLevel > oldLevel) {
      log(userId, 'success', `${message.author.tag} → niveau ${newLevel} !`)
      const chanName = (cfg.level_channel || '').replace(/^#/, '')
      const channel  = chanName
        ? message.guild.channels.cache.find(c => c.name === chanName && c.isTextBased())
        : message.channel
      if (channel) {
        const msg = (cfg.level_msg || 'GG {user} ! Tu passes niveau **{level}** !')
          .replace(/{user}/gi, `<@${message.author.id}>`).replace(/{level}/gi, String(newLevel))
        await channel.send(msg).catch(() => {})
      }
    }
  })
  log(userId, 'info', 'XP: système actif')
}

/* ── 4. Anti-Spam ────────────────────────────────────────────────────────── */
async function setupAntiSpam(userId) {
  const cfg = await getAntiSpamConfig(userId)
  if (!cfg.enabled) return
  const tracker = new Map()
  addHandler(userId, Events.MessageCreate, async (message) => {
    if (message.author?.bot || !message.guild) return
    const key    = message.author.id
    const now    = Date.now()
    const window = (cfg.window_seconds || 5) * 1000
    const times  = (tracker.get(key) || []).filter(t => now - t < window)
    times.push(now)
    tracker.set(key, times)
    if (times.length < (cfg.max_messages || 5)) return
    tracker.delete(key)
    log(userId, 'warn', `Anti-spam: ${message.author.tag} (${times.length} msgs)`)
    const msgs = await message.channel.messages.fetch({ limit: 10 }).catch(() => null)
    if (msgs) {
      const toDelete = [...msgs.values()].filter(m => m.author.id === message.author.id).slice(0, 5)
      await message.channel.bulkDelete(toDelete, true).catch(() => {})
    }
    if (cfg.action === 'warn') {
      const warnMsg = (cfg.warn_message || '{user} ⚠️ Spam détecté !').replace(/{user}/gi, `<@${message.author.id}>`)
      await message.channel.send(warnMsg).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {})
    }
    if (cfg.action === 'timeout') {
      const member = message.guild.members.cache.get(message.author.id)
      if (member) await member.timeout((cfg.timeout_seconds || 60) * 1000, 'Anti-spam').catch(() => {})
    }
  })
  log(userId, 'info', 'Anti-spam: actif')
}

/* ── 5. Logs Modération ──────────────────────────────────────────────────── */
async function setupModLog(userId) {
  const cfg = await getModLogConfig(userId)
  if (!cfg.enabled || !cfg.channel) return
  const getChan = (guild) => guild?.channels.cache.find(c => c.name === cfg.channel.replace(/^#/, '') && c.isTextBased())
  const send    = async (guild, embed) => { const ch = getChan(guild); if (ch) await ch.send({ embeds: [embed] }).catch(() => {}) }

  if (cfg.log_bans) {
    addHandler(userId, Events.GuildBanAdd, async (ban) => {
      send(ban.guild, new EmbedBuilder().setColor('#ED4245').setTitle('🔨 Bannissement')
        .addFields({ name: 'Utilisateur', value: ban.user.tag }, { name: 'Raison', value: ban.reason || 'Aucune' }).setTimestamp())
    })
    addHandler(userId, Events.GuildBanRemove, async (ban) => {
      send(ban.guild, new EmbedBuilder().setColor('#57F287').setTitle('✅ Débannissement')
        .addFields({ name: 'Utilisateur', value: ban.user.tag }).setTimestamp())
    })
  }
  if (cfg.log_deletes) {
    addHandler(userId, Events.MessageDelete, async (msg) => {
      if (!msg.author || msg.author.bot || !msg.guild) return
      send(msg.guild, new EmbedBuilder().setColor('#FEE75C').setTitle('🗑️ Message supprimé')
        .addFields({ name: 'Auteur', value: msg.author.tag, inline: true }, { name: 'Salon', value: `<#${msg.channel.id}>`, inline: true }, { name: 'Contenu', value: msg.content?.slice(0, 1000) || '*vide*' }).setTimestamp())
    })
  }
  if (cfg.log_edits) {
    addHandler(userId, Events.MessageUpdate, async (old, next) => {
      if (!next.author || next.author.bot || !next.guild || old.content === next.content) return
      send(next.guild, new EmbedBuilder().setColor('#5865F2').setTitle('✏️ Message modifié')
        .addFields({ name: 'Auteur', value: next.author.tag, inline: true }, { name: 'Salon', value: `<#${next.channel.id}>`, inline: true }, { name: 'Avant', value: old.content?.slice(0, 500) || '*vide*' }, { name: 'Après', value: next.content?.slice(0, 500) || '*vide*' }).setTimestamp())
    })
  }
  if (cfg.log_joins) {
    addHandler(userId, Events.GuildMemberAdd, async (member) => {
      send(member.guild, new EmbedBuilder().setColor('#57F287').setTitle('👋 Membre rejoint')
        .setThumbnail(member.user.displayAvatarURL())
        .addFields({ name: 'Utilisateur', value: `${member.user.tag} (<@${member.user.id}>)` }, { name: 'Compte créé', value: member.user.createdAt.toLocaleDateString('fr-FR') }).setTimestamp())
    })
  }
  if (cfg.log_leaves) {
    addHandler(userId, Events.GuildMemberRemove, async (member) => {
      send(member.guild, new EmbedBuilder().setColor('#ED4245').setTitle('🚪 Membre parti')
        .setThumbnail(member.user.displayAvatarURL()).addFields({ name: 'Utilisateur', value: member.user.tag }).setTimestamp())
    })
  }
  log(userId, 'info', 'Logs modération: actifs')
}

/* ── 6. Rôle automatique ─────────────────────────────────────────────────── */
async function setupRoles(userId) {
  const cfg = await getRoleConfig(userId)
  if (!cfg.auto_role_enabled || !cfg.auto_role) return
  addHandler(userId, Events.GuildMemberAdd, async (member) => {
    const role = member.guild.roles.cache.find(r => r.id === cfg.auto_role || r.name === cfg.auto_role)
    if (role) { await member.roles.add(role).catch(() => {}); log(userId, 'info', `Rôle auto "${role.name}" → ${member.user.tag}`) }
  })
  log(userId, 'info', 'Rôle automatique: actif')
}

/* ── 7. Reaction Roles ───────────────────────────────────────────────────── */
async function setupReactionRoles(userId) {
  const rrs = await getReactionRoles(userId)
  if (!rrs.length) return
  const handle = async (reaction, user, add) => {
    if (user.bot) return
    if (reaction.partial) await reaction.fetch().catch(() => {})
    const rr = rrs.find(r => r.message_id === reaction.message.id && r.emoji === (reaction.emoji.id ?? reaction.emoji.name))
    if (!rr) return
    const member = reaction.message.guild?.members.cache.get(user.id)
    const role   = reaction.message.guild?.roles.cache.get(rr.role_id)
    if (!member || !role) return
    if (add) await member.roles.add(role).catch(() => {})
    else     await member.roles.remove(role).catch(() => {})
    log(userId, 'info', `Reaction role: ${user.tag} ${add ? '+' : '-'} ${role.name}`)
  }
  addHandler(userId, Events.MessageReactionAdd,    (r, u) => handle(r, u, true))
  addHandler(userId, Events.MessageReactionRemove, (r, u) => handle(r, u, false))
  log(userId, 'info', `Reaction roles: ${rrs.length} règle(s)`)
}

/* ── Interactions ────────────────────────────────────────────────────────── */
async function handleInteraction(userId, interaction) {
  if (!interaction.isChatInputCommand()) return
  const { commandName: name } = interaction
  if (name === 'poll')        return handlePoll(userId, interaction)
  if (name === 'ticket')      return handleTicket(userId, interaction)
  if (name === 'close')       return handleClose(userId, interaction)
  if (name === 'leaderboard') return handleLeaderboard(userId, interaction)
  if (name === 'rank')        return handleRank(userId, interaction)

  const commands = await getCommands(userId)
  const cmd = commands.find(c => c.name === name && c.enabled)
  if (!cmd) return
  const bot = bots.get(userId)
  log(userId, 'info', `/${cmd.name} par ${interaction.user.tag}`)
  try {
    const response = cmd.response
      .replace(/{user}/gi, `<@${interaction.user.id}>`)
      .replace(/{server}/gi, interaction.guild?.name || 'DM')
      .replace(/{members}/gi, String(interaction.guild?.memberCount ?? '?'))
      .replace(/{ping}/gi, String(Math.round(bot?.client.ws.ping ?? 0)))
    await interaction.reply(response)
  } catch (err) {
    if (!interaction.replied && !interaction.deferred)
      await interaction.reply({ content: '❌ Erreur.', ephemeral: true }).catch(() => {})
  }
}

async function handlePoll(userId, interaction) {
  const question = interaction.options.getString('question')
  const opts = ['option1','option2','option3','option4'].map(k => interaction.options.getString(k)).filter(Boolean)
  const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣']
  const embed = new EmbedBuilder().setColor('#5865F2').setTitle('📊 ' + question)
    .setDescription(opts.map((o, i) => `${emojis[i]} **${o}**`).join('\n'))
    .setFooter({ text: `Sondage par ${interaction.user.tag}` }).setTimestamp()
  await interaction.reply({ embeds: [embed] })
  const msg = await interaction.fetchReply()
  for (let i = 0; i < opts.length; i++) await msg.react(emojis[i]).catch(() => {})
  log(userId, 'info', `Sondage créé par ${interaction.user.tag}`)
}

async function handleTicket(userId, interaction) {
  if (!interaction.guild) return interaction.reply({ content: 'Serveur uniquement.', ephemeral: true })
  const cfg = await getTicketConfig(userId)
  if (!cfg.enabled) return interaction.reply({ content: '❌ Tickets désactivés.', ephemeral: true })
  const guild    = interaction.guild
  const catName  = cfg.category_name || 'Tickets'
  const category = guild.channels.cache.find(c => c.name === catName && c.type === ChannelType.GuildCategory)
    || await guild.channels.create({ name: catName, type: ChannelType.GuildCategory }).catch(() => null)
  const ticketName = `ticket-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const existing   = guild.channels.cache.find(c => c.name === ticketName)
  if (existing) return interaction.reply({ content: `❌ Ticket existant: <#${existing.id}>`, ephemeral: true })
  const perms = [
    { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
  ]
  if (cfg.support_role) {
    const role = guild.roles.cache.find(r => r.name === cfg.support_role || r.id === cfg.support_role)
    if (role) perms.push({ id: role.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] })
  }
  const channel = await guild.channels.create({ name: ticketName, type: ChannelType.GuildText, parent: category?.id, permissionOverwrites: perms }).catch(() => null)
  if (!channel) return interaction.reply({ content: '❌ Impossible de créer le salon.', ephemeral: true })
  const embed = new EmbedBuilder().setColor('#5865F2').setTitle('🎫 Ticket Support')
    .setDescription(cfg.welcome_msg || 'Ticket créé !').setTimestamp()
  await channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed] })
  await interaction.reply({ content: `✅ Ticket: <#${channel.id}>`, ephemeral: true })
  log(userId, 'info', `Ticket créé: #${ticketName}`)
}

async function handleClose(userId, interaction) {
  if (!interaction.channel.name?.startsWith('ticket-'))
    return interaction.reply({ content: '❌ Pas un ticket.', ephemeral: true })
  await interaction.reply('🔒 Fermeture dans 5s…')
  setTimeout(() => interaction.channel.delete().catch(() => {}), 5000)
  log(userId, 'info', `Ticket fermé: #${interaction.channel.name}`)
}

async function handleLeaderboard(userId, interaction) {
  if (!interaction.guild) return interaction.reply({ content: 'Serveur uniquement.', ephemeral: true })
  const lb = await getLeaderboard(userId, interaction.guild.id)
  if (!lb.length) return interaction.reply({ content: 'Aucun XP enregistré.', ephemeral: true })
  const medals = ['🥇','🥈','🥉']
  const desc = lb.map((u, i) => `${medals[i] || `**${i+1}.**`} ${u.discord_tag} — **${u.xp} XP** (niv. ${u.level})`).join('\n')
  await interaction.reply({ embeds: [new EmbedBuilder().setColor('#FEE75C').setTitle('🏆 Classement XP').setDescription(desc).setTimestamp()] })
}

async function handleRank(userId, interaction) {
  if (!interaction.guild) return interaction.reply({ content: 'Serveur uniquement.', ephemeral: true })
  const record = await getOrCreateUserXP(userId, interaction.user.id, interaction.user.tag, interaction.guild.id)
  const level  = getLevelFromXP(Number(record.xp))
  const nextXP = getXPForLevel(level + 1)
  const embed  = new EmbedBuilder().setColor('#5865F2').setTitle(`📊 ${interaction.user.username}`)
    .setThumbnail(interaction.user.displayAvatarURL())
    .addFields({ name: 'Niveau', value: String(level), inline: true }, { name: 'XP', value: String(record.xp), inline: true }, { name: 'Prochain niveau', value: `${nextXP} XP`, inline: true }).setTimestamp()
  await interaction.reply({ embeds: [embed] })
}

/* ── Messages planifiés (timer global) ──────────────────────────────────── */
setInterval(async () => {
  try {
    const due = await getDueScheduledMessages()
    for (const sm of due) {
      const bot = bots.get(sm.user_id)
      if (!bot?.client.isReady()) continue
      const channel = bot.client.channels.cache.get(sm.channel_id)
        || await bot.client.channels.fetch(sm.channel_id).catch(() => null)
      if (channel?.isTextBased()) {
        await channel.send(sm.content).catch(() => {})
        log(sm.user_id, 'info', `Message planifié: "${sm.label || sm.id}"`)
      }
      await markScheduledSent(sm.id, sm.repeat_minutes)
    }
  } catch {}
}, 60_000)

/* ── Envoi d'embed via API ───────────────────────────────────────────────── */
export async function sendEmbedToChannel(userId, channelId, embedData) {
  const bot = bots.get(userId)
  if (!bot?.client.isReady()) throw new Error('Bot hors ligne')
  const channel = bot.client.channels.cache.get(channelId)
    || await bot.client.channels.fetch(channelId).catch(() => null)
  if (!channel?.isTextBased()) throw new Error('Salon introuvable ou non textuel')
  const embed = new EmbedBuilder()
  if (embedData.title)         embed.setTitle(embedData.title)
  if (embedData.description)   embed.setDescription(embedData.description)
  if (embedData.color)         embed.setColor(embedData.color)
  if (embedData.footer)        embed.setFooter({ text: embedData.footer })
  if (embedData.thumbnail_url) embed.setThumbnail(embedData.thumbnail_url)
  if (embedData.image_url)     embed.setImage(embedData.image_url)
  embed.setTimestamp()
  await channel.send({ embeds: [embed] })
  log(userId, 'success', `Embed envoyé → #${channelId}`)
}
