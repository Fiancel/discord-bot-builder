import React, { useState, useEffect } from 'react'
import { Clock, Plus, Trash2, ToggleLeft, ToggleRight, Save, X, RefreshCw } from 'lucide-react'
import { api } from '../lib/api'

const DEFAULT_FORM = { label: '', channel_id: '', content: '', send_at: '', repeat_minutes: 0, enabled: true }

export default function ScheduledMessages() {
  const [items,   setItems]   = useState([])
  const [form,    setForm]    = useState(DEFAULT_FORM)
  const [editing, setEditing] = useState(null)
  const [error,   setError]   = useState('')
  const [saving,  setSaving]  = useState(false)

  const load = () => api.get('/scheduled').then(setItems).catch(() => {})
  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      if (editing) {
        await api.put(`/scheduled/${editing}`, form)
        await load()
      } else {
        const created = await api.post('/scheduled', form)
        setItems(prev => [...prev, created])
      }
      setForm(DEFAULT_FORM); setEditing(null)
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  const startEdit = (item) => {
    const localDt = new Date(item.send_at)
    const dtStr   = new Date(localDt.getTime() - localDt.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    setForm({ label: item.label, channel_id: item.channel_id, content: item.content, send_at: dtStr, repeat_minutes: item.repeat_minutes, enabled: item.enabled })
    setEditing(item.id)
  }

  const toggle = async (item) => {
    await api.put(`/scheduled/${item.id}`, { ...item, enabled: !item.enabled })
    await load()
  }

  const remove = async (id) => {
    if (!confirm('Supprimer ce message planifié ?')) return
    await api.delete(`/scheduled/${id}`)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Messages Planifiés</h1>
        <p className="text-[#72767d]">Programmez des messages à envoyer automatiquement dans vos salons</p>
      </div>

      <div className="bg-[#2f3136] rounded-xl p-6 border border-white/5 mb-6">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Clock size={17} className="text-[#5865F2]" />
          {editing ? 'Modifier le message' : 'Nouveau message planifié'}
        </h2>
        {error && <div className="bg-[#ED4245]/15 border border-[#ED4245]/40 rounded-lg px-4 py-3 mb-4 text-sm text-[#ED4245]">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#72767d] mb-1 block">Étiquette (optionnel)</label>
              <input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                placeholder="Rappel quotidien…"
                className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2.5 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs text-[#72767d] mb-1 block">ID du salon Discord</label>
              <input value={form.channel_id} onChange={e => setForm(p => ({ ...p, channel_id: e.target.value }))} required
                placeholder="123456789012345678"
                className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2.5 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm font-mono" />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#72767d] mb-1 block">Message</label>
            <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} required rows={2}
              placeholder="Contenu du message…"
              className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2.5 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#72767d] mb-1 block">Date et heure d'envoi</label>
              <input type="datetime-local" value={form.send_at} onChange={e => setForm(p => ({ ...p, send_at: e.target.value }))} required
                className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2.5 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs text-[#72767d] mb-1 block">Répéter toutes les X minutes (0 = une fois)</label>
              <input type="number" min="0" value={form.repeat_minutes} onChange={e => setForm(p => ({ ...p, repeat_minutes: Number(e.target.value) }))}
                className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2.5 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-60 text-white rounded-lg text-sm font-medium">
              <Save size={15} /> {saving ? 'Enregistrement…' : editing ? 'Modifier' : 'Planifier'}
            </button>
            {editing && (
              <button type="button" onClick={() => { setForm(DEFAULT_FORM); setEditing(null) }}
                className="px-4 py-2.5 bg-[#36393f] hover:bg-[#40444b] text-[#dcddde] rounded-lg text-sm">
                <X size={15} />
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="space-y-2">
        {items.length === 0 && (
          <div className="text-center text-[#72767d] py-12 bg-[#2f3136] rounded-xl border border-white/5">
            <Clock size={32} className="mx-auto mb-3 opacity-30" />
            <p>Aucun message planifié</p>
          </div>
        )}
        {items.map(item => (
          <div key={item.id} className={`bg-[#2f3136] rounded-xl p-4 border border-white/5 flex items-start gap-3 ${!item.enabled ? 'opacity-50' : ''}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white text-sm font-medium">{item.label || 'Sans étiquette'}</span>
                {item.repeat_minutes > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-[#5865F2]/20 text-[#5865F2] flex items-center gap-1">
                    <RefreshCw size={10} /> /{item.repeat_minutes}min
                  </span>
                )}
              </div>
              <p className="text-[#72767d] text-xs font-mono mb-1">Salon: {item.channel_id}</p>
              <p className="text-[#96989d] text-sm truncate">{item.content}</p>
              <p className="text-[#72767d] text-xs mt-1">Prochain envoi: {fmtDate(item.send_at)}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => toggle(item)} className="p-1.5 hover:bg-white/5 rounded">
                {item.enabled ? <ToggleRight size={18} className="text-[#57F287]" /> : <ToggleLeft size={18} className="text-[#72767d]" />}
              </button>
              <button onClick={() => startEdit(item)} className="p-1.5 hover:bg-white/5 rounded text-[#72767d] hover:text-[#5865F2]">
                <Save size={14} />
              </button>
              <button onClick={() => remove(item.id)} className="p-1.5 hover:bg-white/5 rounded text-[#72767d] hover:text-[#ED4245]">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
