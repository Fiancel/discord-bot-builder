import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false }
    : false,
})

/* ── Schéma multi-utilisateurs ───────────────────────────────────────────── */

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    email      VARCHAR(255) UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    username   VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS bot_config (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    token   TEXT,
    prefix  VARCHAR(10) DEFAULT '!',
    intents JSONB DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS commands (
    id          BIGINT  NOT NULL,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    description TEXT    DEFAULT '',
    response    TEXT    NOT NULL DEFAULT '',
    enabled     BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id),
    UNIQUE (user_id, name)
  );

  CREATE TABLE IF NOT EXISTS events (
    user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id TEXT    NOT NULL,
    enabled  BOOLEAN DEFAULT FALSE,
    cfg      JSONB   DEFAULT '{}',
    PRIMARY KEY (user_id, event_id)
  );
`

export async function initDB() {
  await pool.query(SCHEMA)
  console.log('✓ Base de données initialisée')
}

/* ── Utilisateurs ────────────────────────────────────────────────────────── */

export async function createUser(email, password, username) {
  const { rows } = await pool.query(
    `INSERT INTO users (email, password, username) VALUES ($1,$2,$3)
     RETURNING id, email, username, created_at`,
    [email, password, username],
  )
  return rows[0]
}

export async function getUserByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email])
  return rows[0] ?? null
}

export async function getUserById(id) {
  const { rows } = await pool.query(
    'SELECT id, email, username, created_at FROM users WHERE id = $1', [id]
  )
  return rows[0] ?? null
}

/* ── Config ──────────────────────────────────────────────────────────────── */

export async function getConfig(userId) {
  const { rows } = await pool.query('SELECT * FROM bot_config WHERE user_id = $1', [userId])
  const row = rows[0] ?? {}
  return { token: row.token ?? null, prefix: row.prefix ?? '!', intents: row.intents ?? {}, hasToken: !!row.token }
}

export async function saveConfig(userId, data) {
  // Lire la config existante pour préserver le token si non fourni
  const existing  = await getConfig(userId)
  const newToken  = (data.token && data.token.trim() !== '') ? data.token.trim() : existing.token
  const newPrefix = data.prefix  ?? existing.prefix  ?? '!'
  const newIntents = data.intents ?? existing.intents ?? {}

  await pool.query(
    `INSERT INTO bot_config (user_id, token, prefix, intents)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE SET
       token   = EXCLUDED.token,
       prefix  = EXCLUDED.prefix,
       intents = EXCLUDED.intents`,
    [userId, newToken, newPrefix, JSON.stringify(newIntents)],
  )
}

/* ── Commandes ───────────────────────────────────────────────────────────── */

export async function getCommands(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM commands WHERE user_id = $1 ORDER BY created_at ASC', [userId]
  )
  return rows
}

export async function createCommand(userId, cmd) {
  const { rows } = await pool.query(
    `INSERT INTO commands (id, user_id, name, description, response, enabled)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [cmd.id, userId, cmd.name, cmd.description ?? '', cmd.response, cmd.enabled ?? true],
  )
  return rows[0]
}

export async function updateCommand(userId, id, data) {
  const parts = []; const values = []; let i = 1
  if (data.name        !== undefined) { parts.push(`name = $${i++}`);        values.push(data.name) }
  if (data.description !== undefined) { parts.push(`description = $${i++}`); values.push(data.description) }
  if (data.response    !== undefined) { parts.push(`response = $${i++}`);    values.push(data.response) }
  if (data.enabled     !== undefined) { parts.push(`enabled = $${i++}`);     values.push(data.enabled) }
  if (!parts.length) return null
  values.push(id, userId)
  const { rows } = await pool.query(
    `UPDATE commands SET ${parts.join(', ')} WHERE id = $${i} AND user_id = $${i+1} RETURNING *`, values
  )
  return rows[0] ?? null
}

export async function deleteCommand(userId, id) {
  await pool.query('DELETE FROM commands WHERE id = $1 AND user_id = $2', [id, userId])
}

/* ── Événements ──────────────────────────────────────────────────────────── */

export async function getEvents(userId) {
  const { rows } = await pool.query('SELECT * FROM events WHERE user_id = $1', [userId])
  const result = {}
  for (const row of rows) result[row.event_id] = { enabled: row.enabled, ...(row.cfg ?? {}) }
  return result
}

export async function saveEvents(userId, events) {
  for (const [event_id, data] of Object.entries(events)) {
    const { enabled = false, ...cfg } = data ?? {}
    await pool.query(
      `INSERT INTO events (user_id, event_id, enabled, cfg) VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, event_id) DO UPDATE SET enabled = $3, cfg = $4`,
      [userId, event_id, !!enabled, cfg ? JSON.stringify(cfg) : '{}'],
    )
  }
}

export { pool }
