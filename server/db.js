import pg from 'pg'
const { Pool } = pg

// SSL : actif pour toute connexion distante (Supabase, Railway…)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false }
    : false,
})

/* ── Schéma ─────────────────────────────────────────────────────────────── */

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS bot_config (
    id      INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    token   TEXT,
    prefix  VARCHAR(10)  DEFAULT '!',
    intents JSONB        DEFAULT '{}'
  );

  INSERT INTO bot_config (id) VALUES (1) ON CONFLICT DO NOTHING;

  CREATE TABLE IF NOT EXISTS commands (
    id          BIGINT       PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT         DEFAULT '',
    response    TEXT         NOT NULL DEFAULT '',
    enabled     BOOLEAN      DEFAULT TRUE,
    created_at  TIMESTAMPTZ  DEFAULT NOW(),
    CONSTRAINT  commands_name_unique UNIQUE (name)
  );

  CREATE TABLE IF NOT EXISTS events (
    event_id TEXT    PRIMARY KEY,
    enabled  BOOLEAN DEFAULT FALSE,
    cfg      JSONB   DEFAULT '{}'
  );
`

export async function initDB() {
  await pool.query(SCHEMA)
  console.log('✓ Base de données initialisée')
}

/* ── Config ─────────────────────────────────────────────────────────────── */

export async function getConfig() {
  const { rows } = await pool.query('SELECT * FROM bot_config WHERE id = 1')
  const row = rows[0] ?? {}
  return {
    token:    row.token   ?? null,
    prefix:   row.prefix  ?? '!',
    intents:  row.intents ?? {},
    hasToken: !!row.token,
  }
}

export async function saveConfig(data) {
  const parts  = []
  const values = []
  let i = 1

  if (data.token   && data.token !== '')  { parts.push(`token = $${i++}`);   values.push(data.token) }
  if (data.prefix  !== undefined)         { parts.push(`prefix = $${i++}`);  values.push(data.prefix) }
  if (data.intents !== undefined)         { parts.push(`intents = $${i++}`); values.push(JSON.stringify(data.intents)) }

  if (!parts.length) return
  await pool.query(`UPDATE bot_config SET ${parts.join(', ')} WHERE id = 1`, values)
}

/* ── Commands ───────────────────────────────────────────────────────────── */

export async function getCommands() {
  const { rows } = await pool.query('SELECT * FROM commands ORDER BY created_at ASC')
  return rows
}

export async function createCommand(cmd) {
  const { rows } = await pool.query(
    `INSERT INTO commands (id, name, description, response, enabled)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [cmd.id, cmd.name, cmd.description ?? '', cmd.response, cmd.enabled ?? true],
  )
  return rows[0]
}

export async function updateCommand(id, data) {
  const parts  = []
  const values = []
  let i = 1

  if (data.name        !== undefined) { parts.push(`name = $${i++}`);        values.push(data.name) }
  if (data.description !== undefined) { parts.push(`description = $${i++}`); values.push(data.description) }
  if (data.response    !== undefined) { parts.push(`response = $${i++}`);    values.push(data.response) }
  if (data.enabled     !== undefined) { parts.push(`enabled = $${i++}`);     values.push(data.enabled) }

  if (!parts.length) return null
  values.push(id)
  const { rows } = await pool.query(
    `UPDATE commands SET ${parts.join(', ')} WHERE id = $${i} RETURNING *`,
    values,
  )
  return rows[0] ?? null
}

export async function deleteCommand(id) {
  await pool.query('DELETE FROM commands WHERE id = $1', [id])
}

/* ── Events ─────────────────────────────────────────────────────────────── */

export async function getEvents() {
  const { rows } = await pool.query('SELECT * FROM events')
  const result = {}
  for (const row of rows) {
    result[row.event_id] = { enabled: row.enabled, ...(row.cfg ?? {}) }
  }
  return result
}

export async function saveEvents(events) {
  for (const [event_id, data] of Object.entries(events)) {
    const { enabled = false, ...cfg } = data ?? {}
    await pool.query(
      `INSERT INTO events (event_id, enabled, cfg)
       VALUES ($1,$2,$3)
       ON CONFLICT (event_id) DO UPDATE SET enabled = $2, cfg = $3`,
      [event_id, !!enabled, JSON.stringify(cfg)],
    )
  }
}

export { pool }
