import React, { useState, useEffect } from 'react'
import { Layers, Save, Trash2, Send, Plus, Edit2, X } from 'lucide-react'
import { api } from '../lib/api'

const BLANK = { name: '', title: '', description: '', color: '#5865F2', footer: '', thumbnail_url: '', image_url: '' }

function Preview({ embed }) {
  const hex = embed.color || '#5865F2'
  return (
    <div className="bg-[#2f3136] rounded-lg overflow-hidden border border-white/5" style={{ borderLeft: `4px solid ${hex}` }}>
      <div className="p-4">
        {embed.thumbnail_url && (
          <div className="float-right ml-3 mb-2">
            <img src={embed.thumbnail_url} alt="" className="w-16 h-16 rounded object-cover" onError={e => e.target.style.display='none'} />
          </div>
        )}
        {embed.title && <p className="text-white font-semibold mb-1">{embed.title}</p>}
        {embed.description && <p className="text-[#dcddde] text-sm whitespace-pre-wrap">{embed.description}</p>}
        <div className="clear-both" />
        {embed.image_url && <img src={embed.image_url} alt="" className="mt-3 rounded w-full max-h-60 object-cover" onError={e => e.target.style.display='none'} />}
        {embed.footer && <p className="text-[#72767d] text-xs mt-3 pt-3 border-t border-white/10">{embed.footer}</p>}
      </div>
    </div>
  )
}

export default function EmbedBuilder() {
  const [templates, setTemplates] = useState([])
  const [form,      setForm]      = useState(BLANK)
  const [editing,   setEditing]   = useState(null)
  const [channelId, setChannelId] = useState('')
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')
  const [saving,    setSaving]    = useState(false)

  const load = () => api.get('/embeds').then(setTemplates).catch(() => {})
  useEffect(() => { load() }, [])

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }

  const handleSave = async () => {
    setError(''); setSaving(true)
    try {
      if (editing) {
        await api.put(`/embeds/${editing}`, form)
        await load()
        flash('Modèle mis à jour !')
      } else {
        if (!form.name) return setError('Donnez un nom au modèle')
        const t = await api.post('/embeds', form)
        setTemplates(p => [t, ...p])
        flash('Modèle sauvegardé !')
      }
      setEditing(null); setForm(BLANK)
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  const handleSend = async () => {
    if (!channelId) return setError('Entrez un ID de salon')
    setError(''); setSaving(true)
    try { await api.post('/embeds/send', { channelId, ...form }); flash('Embed envoyé sur Discord !') }
    catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  const loadTemplate = (t) => { setForm({ name: t.name, title: t.title, description: t.description, color: t.color, footer: t.footer, thumbnail_url: t.thumbnail_url, image_url: t.image_url }); setEditing(t.id) }

  const remove = async (id) => {
    if (!confirm('Supprimer ce modèle ?')) return
    await api.delete(`/embeds/${id}`)
    setTemplates(p => p.filter(t => t.id !== id))
    if (editing === id) { setEditing(null); setForm(BLANK) }
  }

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Constructeur d'Embeds</h1>
        <p className="text-[#72767d]">Créez de beaux messages enrichis et envoyez-les dans vos salons</p>
      </div>
      {error   && <div className="bg-[#ED4245]/15 border border-[#ED4245]/40 rounded-lg px-4 py-3 mb-4 text-sm text-[#ED4245]">{error}</div>}
      {success && <div className="bg-[#57F287]/15 border border-[#57F287]/40 rounded-lg px-4 py-3 mb-4 text-sm text-[#57F287]">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Éditeur */}
        <div className="space-y-4">
          <div className="bg-[#2f3136] rounded-xl p-5 border border-white/5">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Layers size={17} className="text-[#5865F2]" /> Éditeur</h2>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-[#72767d] mb-1 block">Nom du modèle</label>
                  <input value={form.name} onChange={f('name')} placeholder="Mon Annonce" className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm" />
                </div>
                <div>
                  <label className="text-xs text-[#72767d] mb-1 block">Couleur</label>
                  <div className="flex items-center gap-2 bg-[#202225] rounded-lg border border-white/10 px-3 py-1.5">
                    <input type="color" value={form.color} onChange={f('color')} className="w-7 h-7 rounded cursor-pointer bg-transparent border-0" />
                    <span className="text-[#dcddde] text-sm font-mono">{form.color}</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#72767d] mb-1 block">Titre</label>
                <input value={form.title} onChange={f('title')} placeholder="Titre de l'embed" className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm" />
              </div>
              <div>
                <label className="text-xs text-[#72767d] mb-1 block">Description</label>
                <textarea value={form.description} onChange={f('description')} rows={4} placeholder="Corps du message…" className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm resize-none" />
              </div>
              <div>
                <label className="text-xs text-[#72767d] mb-1 block">Pied de page</label>
                <input value={form.footer} onChange={f('footer')} placeholder="Texte en bas de l'embed" className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm" />
              </div>
              <div>
                <label className="text-xs text-[#72767d] mb-1 block">URL Miniature (coin droit)</label>
                <input value={form.thumbnail_url} onChange={f('thumbnail_url')} placeholder="https://…" className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm" />
              </div>
              <div>
                <label className="text-xs text-[#72767d] mb-1 block">URL Image (grande)</label>
                <input value={form.image_url} onChange={f('image_url')} placeholder="https://…" className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-[#2f3136] rounded-xl p-5 border border-white/5">
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2"><Send size={17} className="text-[#57F287]" /> Envoyer dans Discord</h2>
            <div className="flex gap-2">
              <input value={channelId} onChange={e => setChannelId(e.target.value)} placeholder="ID du salon (Clic droit → Copier l'ID)"
                className="flex-1 bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm font-mono" />
              <button onClick={handleSend} disabled={saving}
                className="px-4 py-2 bg-[#57F287]/20 hover:bg-[#57F287]/30 text-[#57F287] rounded-lg text-sm font-medium disabled:opacity-60">
                Envoyer
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg text-sm font-medium disabled:opacity-60">
                <Save size={15} /> {editing ? 'Mettre à jour' : 'Sauvegarder modèle'}
              </button>
              {editing && (
                <button onClick={() => { setEditing(null); setForm(BLANK) }}
                  className="px-4 py-2.5 bg-[#36393f] hover:bg-[#40444b] text-[#dcddde] rounded-lg text-sm">
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Prévisualisation + Templates */}
        <div className="space-y-4">
          <div className="bg-[#2f3136] rounded-xl p-5 border border-white/5">
            <h2 className="text-white font-semibold mb-4">Prévisualisation</h2>
            <div className="bg-[#36393f] rounded-lg p-3">
              <div className="flex items-start gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">B</div>
                <div className="min-w-0">
                  <span className="text-white text-sm font-medium">Votre Bot</span>
                  <span className="text-[#72767d] text-xs ml-2">Aujourd'hui à 12:00</span>
                </div>
              </div>
              <div className="ml-11">
                {(form.title || form.description || form.footer) ? <Preview embed={form} /> : (
                  <div className="text-[#72767d] text-sm text-center py-8 border border-dashed border-white/10 rounded-lg">
                    Remplissez les champs pour voir la prévisualisation
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-[#2f3136] rounded-xl p-5 border border-white/5">
            <h2 className="text-white font-semibold mb-3">Modèles sauvegardés</h2>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {templates.length === 0 && <p className="text-[#72767d] text-sm text-center py-4">Aucun modèle</p>}
              {templates.map(t => (
                <div key={t.id} className="flex items-center gap-2 p-2.5 bg-[#36393f] rounded-lg">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: t.color }} />
                  <span className="text-[#dcddde] text-sm flex-1 truncate">{t.name}</span>
                  <button onClick={() => loadTemplate(t)} className="p-1 hover:bg-white/10 rounded text-[#72767d] hover:text-[#5865F2]"><Edit2 size={13} /></button>
                  <button onClick={() => remove(t.id)} className="p-1 hover:bg-white/10 rounded text-[#72767d] hover:text-[#ED4245]"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
