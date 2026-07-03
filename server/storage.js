import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR  = path.join(__dirname, '..', 'data')

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const fp = (name) => path.join(DATA_DIR, `${name}.json`)

export function read(name, fallback) {
  const file = fp(name)
  if (!fs.existsSync(file)) return fallback ?? null
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')) }
  catch { return fallback ?? null }
}

export function write(name, data) {
  fs.writeFileSync(fp(name), JSON.stringify(data, null, 2), 'utf-8')
}
