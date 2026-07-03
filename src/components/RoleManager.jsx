import React, { useState, useEffect } from 'react'
import { Users, Plus, Trash2, Save, CheckCircle, Info } from 'lucide-react'
import { api } from '../lib/api'

const DEFAULT_RR = { message_id: '', channel_id: '', emoji: '', role_id: '' }

export default function RoleManager() {
  const [cfg,    setCfg]    = useState({ auto_role: '', auto_role_enabled: false })
  const [rrs,    setRrs]    = useState([])
  const [form,   setForm]   = useState(DEFAULT_RR)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState('')

  const load = async () => {
    const data = await api.get('/roles').catch(() => null)
    if (data) { setCfg(data.config || {}); setRrs(data.reactionRoles || []) }
  }
  useEffect(() => { load() }, [])

  const handleSaveCfg = async () => {
    setError(''); setSaved(false)
    try { await api.post('/roles', cfg); setSaved(true); setTimeout(() => setSaved(false), 3000) }
    catch (e) { setError(e.message) }
  }

  const addRR = async (e) => {
    e.preventDefault(); setError('')
    try {
      const rr = await api.post('/roles/reaction', form)
      setRrs(p => [...p, rr])
      setForm(DEFAULT_RR)
    } catch (e) { setError(e.message) }
  }

  const removeRR = async (id) => {
    await api.delete(`/roles/reaction/${id}`)
    setRrs(p => p.filter(r => r.id !== id))
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Gestionnaire de Rôles</h1>
        <p className="text-[#72767d]">Rôle automatique à l'arrivée + rôles par réaction</p>
      </div>
      {error && <div className="bg-[#ED4245]/15 border border-[#ED4245]/40 rounded-lg px-4 py-3 mb-5 text-sm text-[#ED4245]">{error}</div>}

      <div className="space-y-5">
        {/* Auto-role */}
        <section className="bg-[#2f3136] rounded-xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-semibold flex items-center gap-2"><Users size={17} className="text-[#5865F2]" /> Rôle automatique</h2>
              <p className="text-xs text-[#72767d] mt-0.5">Assigné automatiquement à chaque nouveau membre</p>
            </div>
            <button onClick={() => setCfg(p => ({ ...p, auto_role_enabled: !p.auto_role_enabled }))}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${cfg.auto_role_enabled ? 'bg-[#57F287]/20 text-[#57F287]' : 'bg-[#36393f] text-[#72767d]'}`}>
              {cfg.auto_role_enabled ? '✓ Activé' : 'Désactivé'}
            </button>
          </div>
          <div>
            <label className="text-xs text-[#72767d] mb-1 block">Rôle (nom ou ID Discord)</label>
            <input value={cfg.auto_role || ''} onChange={e => setCfg(p => ({ ...p, auto_role: e.target.value }))}
              placeholder="Membre, 123456789012345678…"
              className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2.5 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm" />
          </div>
          <button onClick={handleSaveCfg}
            className={`mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-all ${saved ? 'bg-[#57F287] text-[#202225]' : 'bg-[#5865F2] hover:bg-[#4752C4] text-white'}`}>
            {saved ? <><CheckCircle size={16} /> Sauvegardé !</> : <><Save size={16} /> Sauvegarder le rôle auto</>}
          </button>
        </section>

        {/* Reaction Roles */}
        <section className="bg-[#2f3136] rounded-xl p-6 border border-white/5">
          <h2 className="text-white font-semibold mb-4">Rôles par Réaction</h2>
          <form onSubmit={addRR} className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-[#72767d] mb-1 block">ID du message</label>
              <input value={form.message_id} onChange={e => setForm(p => ({ ...p, message_id: e.target.value }))} required
                placeholder="ID du message cible"
                className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm font-mono" />
            </div>
            <div>
              <label className="text-xs text-[#72767d] mb-1 block">ID du salon</label>
              <input value={form.channel_id} onChange={e => setForm(p => ({ ...p, channel_id: e.target.value }))} required
                placeholder="ID du salon"
                className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm font-mono" />
            </div>
            <div>
              <label className="text-xs text-[#72767d] mb-1 block">Emoji (ex: 🎮 ou ID d'emoji)</label>
              <input value={form.emoji} onChange={e => setForm(p => ({ ...p, emoji: e.target.value }))} required
                placeholder="🎮"
                className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs text-[#72767d] mb-1 block">ID du rôle à assigner</label>
              <input value={form.role_id} onChange={e => setForm(p => ({ ...p, role_id: e.target.value }))} required
                placeholder="ID du rôle"
                className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm font-mono" />
            </div>
            <div className="col-span-2">
              <button type="submit"
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg text-sm font-medium">
                <Plus size={15} /> Ajouter la règle
              </button>
            </div>
          </form>

          <div className="space-y-2">
            {rrs.length === 0 && <p className="text-[#72767d] text-sm text-center py-4">Aucune règle de réaction</p>}
            {rrs.map(rr => (
              <div key={rr.id} className="flex items-center gap-3 p-3 bg-[#36393f] rounded-lg">
                <span className="text-xl leading-none">{rr.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-mono truncate">Msg: {rr.message_id}</p>
                  <p className="text-[#72767d] text-xs">Rôle: {rr.role_id}</p>
                </div>
                <button onClick={() => removeRR(rr.id)} className="p-1.5 hover:bg-white/10 rounded text-[#72767d] hover:text-[#ED4245]">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <div className="bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-xl p-4 text-sm">
          <p className="font-semibold text-[#5865F2] mb-1 flex items-center gap-2"><Info size={14} /> Comment obtenir un ID</p>
          <p className="text-[#96989d]">Activez le Mode Développeur dans Discord (Paramètres → Avancé), puis clic droit → Copier l'ID sur n'importe quel message, salon, ou rôle.</p>
        </div>
      </div>
    </div>
  )
}
