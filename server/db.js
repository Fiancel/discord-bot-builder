import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false } : false,
})

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    username VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS bot_config (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    token TEXT, prefix VARCHAR(10) DEFAULT '!', intents JSONB DEFAULT '{}'
  );
  CREATE TABLE IF NOT EXISTS commands (
    id BIGINT NOT NULL, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, description TEXT DEFAULT '',
    response TEXT NOT NULL DEFAULT '', enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id), UNIQUE (user_id, name)
  );
  CREATE TABLE IF NOT EXISTS events (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL, enabled BOOLEAN DEFAULT FALSE, cfg JSONB DEFAULT '{}',
    PRIMARY KEY (user_id, event_id)
  );

  -- Fonctionnalités avancées
  CREATE TABLE IF NOT EXISTS auto_responses (
    id BIGINT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trigger TEXT NOT NULL, response TEXT NOT NULL,
    match_type VARCHAR(20) DEFAULT 'contains',
    enabled BOOLEAN DEFAULT TRUE, uses INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS bot_status (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(20) DEFAULT 'playing',
    activity_text VARCHAR(100) DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS xp_config (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT FALSE, xp_per_msg INTEGER DEFAULT 15,
    cooldown_seconds INTEGER DEFAULT 60,
    level_channel TEXT DEFAULT '',
    level_msg TEXT DEFAULT 'GG {user} ! Tu passes niveau **{level}** !'
  );
  CREATE TABLE IF NOT EXISTS user_xp (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    discord_user_id TEXT NOT NULL, discord_tag TEXT DEFAULT 'Inconnu',
    guild_id TEXT NOT NULL, xp BIGINT DEFAULT 0, level INTEGER DEFAULT 0,
    last_xp TIMESTAMPTZ DEFAULT '1970-01-01 00:00:00+00',
    UNIQUE (user_id, discord_user_id, guild_id)
  );
  CREATE TABLE IF NOT EXISTS scheduled_messages (
    id BIGINT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(100) DEFAULT '', channel_id TEXT NOT NULL,
    content TEXT NOT NULL, send_at TIMESTAMPTZ NOT NULL,
    repeat_minutes INTEGER DEFAULT 0, enabled BOOLEAN DEFAULT TRUE,
    last_sent TIMESTAMPTZ
  );
  CREATE TABLE IF NOT EXISTS embed_templates (
    id BIGINT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, title TEXT DEFAULT '',
    description TEXT DEFAULT '', color VARCHAR(10) DEFAULT '#5865F2',
    footer TEXT DEFAULT '', thumbnail_url TEXT DEFAULT '', image_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS antispam_config (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT FALSE, max_messages INTEGER DEFAULT 5,
    window_seconds INTEGER DEFAULT 5, action VARCHAR(20) DEFAULT 'delete',
    timeout_seconds INTEGER DEFAULT 60,
    warn_message TEXT DEFAULT '{user} ⚠️ Spam détecté !'
  );
  CREATE TABLE IF NOT EXISTS modlog_config (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT FALSE, channel TEXT DEFAULT '',
    log_bans BOOLEAN DEFAULT TRUE, log_kicks BOOLEAN DEFAULT TRUE,
    log_deletes BOOLEAN DEFAULT TRUE, log_edits BOOLEAN DEFAULT FALSE,
    log_joins BOOLEAN DEFAULT FALSE, log_leaves BOOLEAN DEFAULT FALSE
  );
  CREATE TABLE IF NOT EXISTS ticket_config (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT FALSE, category_name TEXT DEFAULT 'Tickets',
    support_role TEXT DEFAULT '',
    welcome_msg TEXT DEFAULT 'Ticket créé ! Notre équipe répond bientôt. Fermez avec /close',
    log_channel TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS role_config (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    auto_role TEXT DEFAULT '', auto_role_enabled BOOLEAN DEFAULT FALSE
  );
  CREATE TABLE IF NOT EXISTS reaction_roles (
    id BIGINT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL, channel_id TEXT NOT NULL,
    emoji TEXT NOT NULL, role_id TEXT NOT NULL
  );
`

export async function initDB() {
  await pool.query(`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bot_config' AND column_name = 'id'
      ) THEN
        DROP TABLE IF EXISTS events CASCADE;
        DROP TABLE IF EXISTS commands CASCADE;
        DROP TABLE IF EXISTS bot_config CASCADE;
      END IF;
    END $$;
  `)
  await pool.query(SCHEMA)
  console.log('✓ Base de données initialisée')
}

/* ── Utilisateurs ───────────────────────────────────────────────────────── */
export async function createUser(email, password, username) {
  const { rows } = await pool.query(
    `INSERT INTO users (email,password,username) VALUES ($1,$2,$3)
     RETURNING id,email,username,created_at`, [email, password, username])
  return rows[0]
}
export async function getUserByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email])
  return rows[0] ?? null
}
export async function getUserById(id) {
  const { rows } = await pool.query(
    'SELECT id,email,username,created_at FROM users WHERE id=$1', [id])
  return rows[0] ?? null
}

/* ── Config ─────────────────────────────────────────────────────────────── */
export async function getConfig(userId) {
  const { rows } = await pool.query('SELECT * FROM bot_config WHERE user_id=$1', [userId])
  const row = rows[0] ?? {}
  return { token: row.token ?? null, prefix: row.prefix ?? '!', intents: row.intents ?? {}, hasToken: !!row.token }
}
export async function saveConfig(userId, data) {
  const existing  = await getConfig(userId)
  const newToken  = (data.token && data.token.trim() !== '') ? data.token.trim() : existing.token
  const newPrefix = data.prefix  ?? existing.prefix  ?? '!'
  const newIntents = data.intents ?? existing.intents ?? {}
  await pool.query(
    `INSERT INTO bot_config (user_id,token,prefix,intents) VALUES ($1,$2,$3,$4)
     ON CONFLICT (user_id) DO UPDATE SET token=EXCLUDED.token,prefix=EXCLUDED.prefix,intents=EXCLUDED.intents`,
    [userId, newToken, newPrefix, JSON.stringify(newIntents)])
}

/* ── Commandes ──────────────────────────────────────────────────────────── */
export async function getCommands(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM commands WHERE user_id=$1 ORDER BY created_at ASC', [userId])
  return rows
}
export async function createCommand(userId, cmd) {
  const { rows } = await pool.query(
    `INSERT INTO commands (id,user_id,name,description,response,enabled)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [cmd.id, userId, cmd.name, cmd.description ?? '', cmd.response, cmd.enabled ?? true])
  return rows[0]
}
export async function updateCommand(userId, id, data) {
  const parts = []; const values = []; let i = 1
  if (data.name        !== undefined) { parts.push(`name=$${i++}`);        values.push(data.name) }
  if (data.description !== undefined) { parts.push(`description=$${i++}`); values.push(data.description) }
  if (data.response    !== undefined) { parts.push(`response=$${i++}`);    values.push(data.response) }
  if (data.enabled     !== undefined) { parts.push(`enabled=$${i++}`);     values.push(data.enabled) }
  if (!parts.length) return null
  values.push(id, userId)
  const { rows } = await pool.query(
    `UPDATE commands SET ${parts.join(',')} WHERE id=$${i} AND user_id=$${i+1} RETURNING *`, values)
  return rows[0] ?? null
}
export async function deleteCommand(userId, id) {
  await pool.query('DELETE FROM commands WHERE id=$1 AND user_id=$2', [id, userId])
}

/* ── Événements ─────────────────────────────────────────────────────────── */
export async function getEvents(userId) {
  const { rows } = await pool.query('SELECT * FROM events WHERE user_id=$1', [userId])
  const result = {}
  for (const row of rows) result[row.event_id] = { enabled: row.enabled, ...(row.cfg ?? {}) }
  return result
}
export async function saveEvents(userId, events) {
  for (const [event_id, data] of Object.entries(events)) {
    const { enabled = false, ...cfg } = data ?? {}
    await pool.query(
      `INSERT INTO events (user_id,event_id,enabled,cfg) VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id,event_id) DO UPDATE SET enabled=$3,cfg=$4`,
      [userId, event_id, !!enabled, cfg ? JSON.stringify(cfg) : '{}'])
  }
}

/* ── Auto-Répondeur ─────────────────────────────────────────────────────── */
export async function getAutoResponses(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM auto_responses WHERE user_id=$1 ORDER BY id ASC', [userId])
  return rows
}
export async function createAutoResponse(userId, data) {
  const { rows } = await pool.query(
    `INSERT INTO auto_responses (id,user_id,trigger,response,match_type,enabled)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [Date.now(), userId, data.trigger, data.response, data.match_type || 'contains', data.enabled ?? true])
  return rows[0]
}
export async function updateAutoResponse(userId, id, data) {
  const parts = []; const values = []; let i = 1
  for (const [k, v] of Object.entries(data)) {
    if (['trigger','response','match_type','enabled'].includes(k)) { parts.push(`${k}=$${i++}`); values.push(v) }
  }
  if (!parts.length) return null
  values.push(id, userId)
  const { rows } = await pool.query(
    `UPDATE auto_responses SET ${parts.join(',')} WHERE id=$${i} AND user_id=$${i+1} RETURNING *`, values)
  return rows[0] ?? null
}
export async function deleteAutoResponse(userId, id) {
  await pool.query('DELETE FROM auto_responses WHERE id=$1 AND user_id=$2', [id, userId])
}
export async function incrementAutoResponseUses(id) {
  await pool.query('UPDATE auto_responses SET uses=uses+1 WHERE id=$1', [id])
}

/* ── Statut du Bot ──────────────────────────────────────────────────────── */
export async function getBotStatus(userId) {
  const { rows } = await pool.query('SELECT * FROM bot_status WHERE user_id=$1', [userId])
  return rows[0] ?? { activity_type: 'playing', activity_text: '' }
}
export async function saveBotStatus(userId, data) {
  await pool.query(
    `INSERT INTO bot_status (user_id,activity_type,activity_text) VALUES ($1,$2,$3)
     ON CONFLICT (user_id) DO UPDATE SET activity_type=$2,activity_text=$3`,
    [userId, data.activity_type || 'playing', data.activity_text || ''])
}

/* ── XP & Niveaux ───────────────────────────────────────────────────────── */
export async function getXPConfig(userId) {
  const { rows } = await pool.query('SELECT * FROM xp_config WHERE user_id=$1', [userId])
  return rows[0] ?? { enabled: false, xp_per_msg: 15, cooldown_seconds: 60, level_channel: '', level_msg: 'GG {user} ! Tu passes niveau **{level}** !' }
}
export async function saveXPConfig(userId, data) {
  await pool.query(
    `INSERT INTO xp_config (user_id,enabled,xp_per_msg,cooldown_seconds,level_channel,level_msg)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (user_id) DO UPDATE SET enabled=$2,xp_per_msg=$3,cooldown_seconds=$4,level_channel=$5,level_msg=$6`,
    [userId, !!data.enabled, data.xp_per_msg||15, data.cooldown_seconds||60, data.level_channel||'', data.level_msg||'GG {user} ! Tu passes niveau **{level}** !'])
}
export async function getOrCreateUserXP(userId, discordUserId, discordTag, guildId) {
  const { rows } = await pool.query(
    `INSERT INTO user_xp (user_id,discord_user_id,discord_tag,guild_id)
     VALUES ($1,$2,$3,$4) ON CONFLICT (user_id,discord_user_id,guild_id) DO UPDATE SET discord_tag=$3
     RETURNING *`,
    [userId, discordUserId, discordTag, guildId])
  return rows[0]
}
export async function addXPToUser(userId, discordUserId, discordTag, guildId, amount) {
  const { rows } = await pool.query(
    `UPDATE user_xp SET xp=xp+$5, discord_tag=$4, last_xp=NOW()
     WHERE user_id=$1 AND discord_user_id=$2 AND guild_id=$3 RETURNING *`,
    [userId, discordUserId, guildId, discordTag, amount])
  return rows[0] ?? null
}
export async function getLeaderboard(userId, guildId) {
  const { rows } = await pool.query(
    `SELECT discord_tag, xp, level FROM user_xp
     WHERE user_id=$1 AND guild_id=$2 ORDER BY xp DESC LIMIT 20`,
    [userId, guildId])
  return rows
}

/* ── Messages Planifiés ─────────────────────────────────────────────────── */
export async function getScheduledMessages(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM scheduled_messages WHERE user_id=$1 ORDER BY send_at ASC', [userId])
  return rows
}
export async function createScheduledMessage(userId, data) {
  const { rows } = await pool.query(
    `INSERT INTO scheduled_messages (id,user_id,label,channel_id,content,send_at,repeat_minutes,enabled)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [Date.now(), userId, data.label||'', data.channel_id, data.content, data.send_at, data.repeat_minutes||0, true])
  return rows[0]
}
export async function updateScheduledMessage(userId, id, data) {
  await pool.query(
    `UPDATE scheduled_messages SET label=$3,channel_id=$4,content=$5,send_at=$6,repeat_minutes=$7,enabled=$8
     WHERE id=$1 AND user_id=$2`,
    [id, userId, data.label||'', data.channel_id, data.content, data.send_at, data.repeat_minutes||0, !!data.enabled])
}
export async function deleteScheduledMessage(userId, id) {
  await pool.query('DELETE FROM scheduled_messages WHERE id=$1 AND user_id=$2', [id, userId])
}
export async function getDueScheduledMessages() {
  const { rows } = await pool.query(
    `SELECT * FROM scheduled_messages WHERE enabled=TRUE AND send_at<=NOW()
     AND (last_sent IS NULL OR (repeat_minutes>0 AND last_sent + (repeat_minutes||' minutes')::interval <= NOW()))`)
  return rows
}
export async function markScheduledSent(id, repeatMinutes) {
  if (repeatMinutes > 0) {
    await pool.query(
      `UPDATE scheduled_messages SET last_sent=NOW(), send_at=NOW()+(repeat_minutes||' minutes')::interval WHERE id=$1`, [id])
  } else {
    await pool.query('UPDATE scheduled_messages SET enabled=FALSE, last_sent=NOW() WHERE id=$1', [id])
  }
}

/* ── Embeds ─────────────────────────────────────────────────────────────── */
export async function getEmbedTemplates(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM embed_templates WHERE user_id=$1 ORDER BY created_at DESC', [userId])
  return rows
}
export async function createEmbedTemplate(userId, data) {
  const { rows } = await pool.query(
    `INSERT INTO embed_templates (id,user_id,name,title,description,color,footer,thumbnail_url,image_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [Date.now(), userId, data.name, data.title||'', data.description||'',
     data.color||'#5865F2', data.footer||'', data.thumbnail_url||'', data.image_url||''])
  return rows[0]
}
export async function updateEmbedTemplate(userId, id, data) {
  await pool.query(
    `UPDATE embed_templates SET name=$3,title=$4,description=$5,color=$6,footer=$7,thumbnail_url=$8,image_url=$9
     WHERE id=$1 AND user_id=$2`,
    [id, userId, data.name, data.title||'', data.description||'',
     data.color||'#5865F2', data.footer||'', data.thumbnail_url||'', data.image_url||''])
}
export async function deleteEmbedTemplate(userId, id) {
  await pool.query('DELETE FROM embed_templates WHERE id=$1 AND user_id=$2', [id, userId])
}

/* ── Anti-Spam ──────────────────────────────────────────────────────────── */
export async function getAntiSpamConfig(userId) {
  const { rows } = await pool.query('SELECT * FROM antispam_config WHERE user_id=$1', [userId])
  return rows[0] ?? { enabled: false, max_messages: 5, window_seconds: 5, action: 'delete', timeout_seconds: 60, warn_message: '{user} ⚠️ Spam détecté !' }
}
export async function saveAntiSpamConfig(userId, data) {
  await pool.query(
    `INSERT INTO antispam_config (user_id,enabled,max_messages,window_seconds,action,timeout_seconds,warn_message)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (user_id) DO UPDATE SET enabled=$2,max_messages=$3,window_seconds=$4,action=$5,timeout_seconds=$6,warn_message=$7`,
    [userId, !!data.enabled, data.max_messages||5, data.window_seconds||5,
     data.action||'delete', data.timeout_seconds||60, data.warn_message||'{user} ⚠️ Spam détecté !'])
}

/* ── Logs Modération ────────────────────────────────────────────────────── */
export async function getModLogConfig(userId) {
  const { rows } = await pool.query('SELECT * FROM modlog_config WHERE user_id=$1', [userId])
  return rows[0] ?? { enabled: false, channel: '', log_bans: true, log_kicks: true, log_deletes: true, log_edits: false, log_joins: false, log_leaves: false }
}
export async function saveModLogConfig(userId, data) {
  await pool.query(
    `INSERT INTO modlog_config (user_id,enabled,channel,log_bans,log_kicks,log_deletes,log_edits,log_joins,log_leaves)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (user_id) DO UPDATE SET enabled=$2,channel=$3,log_bans=$4,log_kicks=$5,log_deletes=$6,log_edits=$7,log_joins=$8,log_leaves=$9`,
    [userId, !!data.enabled, data.channel||'', !!data.log_bans, !!data.log_kicks,
     !!data.log_deletes, !!data.log_edits, !!data.log_joins, !!data.log_leaves])
}

/* ── Tickets ────────────────────────────────────────────────────────────── */
export async function getTicketConfig(userId) {
  const { rows } = await pool.query('SELECT * FROM ticket_config WHERE user_id=$1', [userId])
  return rows[0] ?? { enabled: false, category_name: 'Tickets', support_role: '', welcome_msg: 'Ticket créé ! Notre équipe répond bientôt. Fermez avec /close', log_channel: '' }
}
export async function saveTicketConfig(userId, data) {
  await pool.query(
    `INSERT INTO ticket_config (user_id,enabled,category_name,support_role,welcome_msg,log_channel)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (user_id) DO UPDATE SET enabled=$2,category_name=$3,support_role=$4,welcome_msg=$5,log_channel=$6`,
    [userId, !!data.enabled, data.category_name||'Tickets', data.support_role||'', data.welcome_msg||'', data.log_channel||''])
}

/* ── Rôles ──────────────────────────────────────────────────────────────── */
export async function getRoleConfig(userId) {
  const { rows } = await pool.query('SELECT * FROM role_config WHERE user_id=$1', [userId])
  return rows[0] ?? { auto_role: '', auto_role_enabled: false }
}
export async function saveRoleConfig(userId, data) {
  await pool.query(
    `INSERT INTO role_config (user_id,auto_role,auto_role_enabled) VALUES ($1,$2,$3)
     ON CONFLICT (user_id) DO UPDATE SET auto_role=$2,auto_role_enabled=$3`,
    [userId, data.auto_role||'', !!data.auto_role_enabled])
}
export async function getReactionRoles(userId) {
  const { rows } = await pool.query('SELECT * FROM reaction_roles WHERE user_id=$1', [userId])
  return rows
}
export async function addReactionRole(userId, data) {
  const { rows } = await pool.query(
    `INSERT INTO reaction_roles (id,user_id,message_id,channel_id,emoji,role_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [Date.now(), userId, data.message_id, data.channel_id, data.emoji, data.role_id])
  return rows[0]
}
export async function deleteReactionRole(userId, id) {
  await pool.query('DELETE FROM reaction_roles WHERE id=$1 AND user_id=$2', [id, userId])
}

export { pool }
