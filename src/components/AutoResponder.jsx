import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Save, X, Reply, ToggleLeft, ToggleRight } from 'lucide-react'
import { api } from '../lib/api'

const MATCH_TYPES = [
  { value: 'contains',   label: 'Contient' },
  { value: 'exact',      label: 'Exact' },
  { value: 'startswith', label: 'Commence par' },
]

const DEFAULT_FORM = { trigger: '', response: '', match_type: 'contains', enabled: true }

export default function AutoResponder() {
  const [items,   setItems]   = useState([])
  const [form,    setForm]    = useState(DEFAULT_FORM)
  const [editing, setEditing] = useState(null)
  const [error,   setError]   = useState('')
  const [saving,  setSaving]  = useState(false)

  const load = () => api.get('/auto-responses').then(setItems).catch(() => {})
  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      if (editing) {
        const updated = await api.put(`/auto-responses/${editing}`, form)
        setItems(prev => prev.map(i => i.id === editing ? updated : i))
      } else {
        const created = await api.post('/auto-responses', form)
        setItems(prev => [...prev, created])
      }
      setForm(DEFAULT_FORM); setEditing(null)
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  const startEdit = (item) => { setForm({ trigger: item.trigger, response: item.response, match_type: item.match_type, enabled: item.enabled }); setEditing(item.id); setError('') }

  const cancelEdit = () => { setForm(DEFAULT_FORM); setEditing(null); setError('') }

  const toggle = async (item) => {
    try {
      const updated = await api.put(`/auto-responses/${item.id}`, { ...item, enabled: !item.enabled })
      setItems(prev => prev.map(i => i.id === item.id ? updated : i))
    } catch {}
  }

  const remove = async (id) => {
    if (!confirm('Supprimer cette réponse ?')) return
    await api.delete(`/auto-responses/${id}`)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Auto-Répondeur</h1>
        <p className="text-[#72767d]">Le bot répond automatiquement aux messages contenant vos déclencheurs</p>
      </div>

      {/* Formulaire */}
      <div className="bg-[#2f3136] rounded-xl p-6 border border-white/5 mb-6">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Reply size={17} className="text-[#5865F2]" />
          {editing ? 'Modifier la réponse' : 'Nouvelle réponse'}
        </h2>
        {error && <div className="bg-[#ED4245]/15 border border-[#ED4245]/40 rounded-lg px-4 py-3 mb-4 text-sm text-[#ED4245]">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-[#72767d] mb-1 block">Déclencheur</label>
              <input value={form.trigger} onChange={e => setForm(p => ({ ...p, trigger: e.target.value }))} required
                placeholder="ex: bonjour, !aide, comment ça va"
                className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2.5 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs text-[#72767d] mb-1 block">Type de correspondance</label>
              <select value={form.match_type} onChange={e => setForm(p => ({ ...p, match_type: e.target.value }))}
                className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2.5 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm">
                {MATCH_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-[#72767d] mb-1 block">Réponse du bot</label>
            <textarea value={form.response} onChange={e => setForm(p => ({ ...p, response: e.target.value }))} required rows={2}
              placeholder="La réponse que le bot envoie…"
              className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2.5 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm resize-none" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-60 text-white rounded-lg text-sm font-medium">
              <Save size={15} /> {saving ? 'Enregistrement…' : editing ? 'Modifier' : 'Ajouter'}
            </button>
            {editing && (
              <button type="button" onClick={cancelEdit}
                className="px-4 py-2.5 bg-[#36393f] hover:bg-[#40444b] text-[#dcddde] rounded-lg text-sm">
                <X size={15} />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {items.length === 0 && (
          <div className="text-center text-[#72767d] py-12 bg-[#2f3136] rounded-xl border border-white/5">
            <Reply size={32} className="mx-auto mb-3 opacity-30" />
            <p>Aucune réponse automatique</p>
            <p className="text-xs mt-1">Ajoutez-en une ci-dessus</p>
          </div>
        )}
        {items.map(item => (
          <div key={item.id} className={`bg-[#2f3136] rounded-xl p-4 border flex items-start gap-4 ${item.enabled ? 'border-white/5' : 'border-white/5 opacity-60'}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-mono text-sm font-medium truncate">{item.trigger}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-[#5865F2]/20 text-[#5865F2]">
                  {MATCH_TYPES.find(m => m.value === item.match_type)?.label}
                </span>
                {item.uses > 0 && <span className="text-xs text-[#72767d] ml-auto">{item.uses} utilisations</span>}
              </div>
              <p className="text-[#96989d] text-sm truncate">{item.response}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => toggle(item)} className="p-1.5 hover:bg-white/5 rounded text-[#72767d]">
                {item.enabled ? <ToggleRight size={18} className="text-[#57F287]" /> : <ToggleLeft size={18} />}
              </button>
              <button onClick={() => startEdit(item)} className="p-1.5 hover:bg-white/5 rounded text-[#72767d] hover:text-[#5865F2]">
                <Edit2 size={14} />
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
