import React, { useState, useEffect, useCallback } from 'react'
import { UserPlus, Shield, Star, Volume2, Bell } from 'lucide-react'
import { api } from '../lib/api'

const EVENT_DEFS = [
  {
    id: 'welcome', icon: UserPlus, label: 'Message de Bienvenue', color: '#57F287',
    desc: 'Envoie un message quand un nouveau membre rejoint le serveur.',
    fields: [
      { key: 'channel', type: 'text',     label: 'Salon',   placeholder: 'bienvenue (sans #)' },
      { key: 'message', type: 'textarea', label: 'Message', placeholder: 'Bienvenue {user} sur {server} !' },
    ],
  },
  {
    id: 'moderation', icon: Shield, label: 'Auto-Modération', color: '#ED4245',
    desc: 'Supprime les messages contenant des mots interdits. Nécessite l\'intent Message Content.',
    fields: [
      { key: 'words', type: 'text', label: 'Mots filtrés (séparés par des virgules)', placeholder: 'spam, pub, discord.gg' },
    ],
  },
  {
    id: 'voicelog', icon: Volume2, label: 'Log Salon Vocal', color: '#5865F2',
    desc: 'Enregistre les connexions / déconnexions dans les salons vocaux.',
    fields: [],
  },
  {
    id: 'goodbye', icon: Bell, label: "Message d'Au Revoir", color: '#96989d',
    desc: 'Notifie quand un membre quitte le serveur.',
    fields: [
      { key: 'channel', type: 'text',     label: 'Salon',   placeholder: 'général (sans #)' },
      { key: 'message', type: 'textarea', label: 'Message', placeholder: '{user} nous a quittés.' },
    ],
  },
]

function Toggle({ value, onChange, color }) {
  return (
    <button type="button" role="switch" aria-checked={value} onClick={onChange}
      className="relative w-11 h-6 rounded-full transition-colors duration-300 flex items-center flex-shrink-0"
      style={{ backgroundColor: value ? color : 'rgba(114,118,125,.4)' }}
    >
      <span className="w-4 h-4 bg-white rounded-full absolute shadow transition-all duration-300"
        style={{ left: value ? '1.375rem' : '0.25rem' }} />
    </button>
  )
}

function EventCard({ def, data, onChange, onSave, saving }) {
  const Icon    = def.icon
  const enabled = !!data?.enabled
  const config  = data ?? {}

  const setField = (key, val) => onChange({ ...config, enabled, [key]: val })

  return (
    <div className={`bg-[#2f3136] rounded-xl border transition-all duration-200 overflow-hidden ${enabled ? 'border-white/10' : 'border-white/5'}`}>
      <div className="flex items-start gap-4 p-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${def.color}20` }}>
          <Icon size={18} style={{ color: def.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-white text-sm">{def.label}</h3>
            <Toggle value={enabled} color={def.color} onChange={() => onChange({ ...config, enabled: !enabled })} />
          </div>
          <p className="text-xs text-[#72767d]">{def.desc}</p>
        </div>
      </div>

      {enabled && (
        <div className="px-5 pb-5 space-y-3 border-t border-white/5 pt-4">
          {def.fields.map(({ key, type, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs text-[#72767d] mb-1">{label}</label>
              {type === 'textarea' ? (
                <textarea value={config[key] ?? ''} onChange={(e) => setField(key, e.target.value)}
                  placeholder={placeholder} rows={2}
                  className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm resize-none" />
              ) : (
                <input type="text" value={config[key] ?? ''} onChange={(e) => setField(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm" />
              )}
            </div>
          ))}
          <button type="button" onClick={onSave}
            className="text-xs font-semibold px-3 py-1.5 rounded-md transition-all"
            style={{ backgroundColor: `${def.color}25`, color: def.color }}>
            {saving ? 'Sauvegarde…' : '✓ Sauvegarder'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function EventManager() {
  const [events, setEvents] = useState({})
  const [saving, setSaving] = useState(null)
  const [error,  setError]  = useState('')

  const load = useCallback(async () => {
    try { setEvents(await api.get('/events')) } catch {}
  }, [])

  useEffect(() => { load() }, [load])

  const handleChange = (id, data) => {
    const updated = { ...events, [id]: data }
    setEvents(updated)
  }

  const handleSave = async (id) => {
    setError('')
    setSaving(id)
    try {
      await api.post('/events', events)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(null)
    }
  }

  // Auto-save on toggle
  const handleToggleAndSave = async (id, data) => {
    const updated = { ...events, [id]: data }
    setEvents(updated)
    try { await api.post('/events', updated) } catch {}
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Gestion des Événements</h1>
        <p className="text-[#72767d]">Activez et configurez les réactions automatiques. Les changements s'appliquent immédiatement si le bot est en ligne.</p>
      </div>

      {error && (
        <div className="bg-[#ED4245]/15 border border-[#ED4245]/40 rounded-lg px-4 py-3 mb-5 text-sm text-[#ED4245]">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {EVENT_DEFS.map((def) => (
          <EventCard
            key={def.id}
            def={def}
            data={events[def.id]}
            saving={saving === def.id}
            onChange={(data) => {
              // If only enabled changed (toggle), auto-save
              const prev = events[def.id]
              if (prev?.enabled !== data.enabled) {
                handleToggleAndSave(def.id, data)
              } else {
                handleChange(def.id, data)
              }
            }}
            onSave={() => handleSave(def.id)}
          />
        ))}
      </div>
    </div>
  )
}
