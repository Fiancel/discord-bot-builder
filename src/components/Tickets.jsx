import React, { useState, useEffect } from 'react'
import { Ticket, Save, CheckCircle, Info } from 'lucide-react'
import { api } from '../lib/api'

export default function Tickets() {
  const [cfg,   setCfg]   = useState({ enabled: false, category_name: 'Tickets', support_role: '', welcome_msg: 'Ticket créé ! Notre équipe répond bientôt. Fermez avec /close', log_channel: '' })
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => { api.get('/tickets').then(data => setCfg(p => ({ ...p, ...data }))).catch(() => {}) }, [])

  const handleSave = async () => {
    setError(''); setSaved(false)
    try { await api.post('/tickets', cfg); setSaved(true); setTimeout(() => setSaved(false), 3000) }
    catch (e) { setError(e.message) }
  }

  const f = (k) => (e) => setCfg(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Système de Tickets</h1>
        <p className="text-[#72767d]">Gérez les demandes de support avec des tickets Discord</p>
      </div>
      {error && <div className="bg-[#ED4245]/15 border border-[#ED4245]/40 rounded-lg px-4 py-3 mb-5 text-sm text-[#ED4245]">{error}</div>}

      <div className="space-y-5">
        <section className="bg-[#2f3136] rounded-xl p-6 border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold flex items-center gap-2"><Ticket size={17} className="text-[#5865F2]" /> Système de tickets</h2>
              <p className="text-xs text-[#72767d] mt-0.5">Commandes <code className="text-[#5865F2]">/ticket</code> et <code className="text-[#5865F2]">/close</code></p>
            </div>
            <button onClick={() => setCfg(p => ({ ...p, enabled: !p.enabled }))}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${cfg.enabled ? 'bg-[#57F287]/20 text-[#57F287]' : 'bg-[#36393f] text-[#72767d]'}`}>
              {cfg.enabled ? '✓ Activé' : 'Désactivé'}
            </button>
          </div>
        </section>

        <section className="bg-[#2f3136] rounded-xl p-6 border border-white/5">
          <h2 className="text-white font-semibold mb-4">Configuration</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#72767d] mb-1 block">Catégorie Discord (nom)</label>
                <input value={cfg.category_name} onChange={f('category_name')} placeholder="Tickets"
                  className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2.5 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm" />
              </div>
              <div>
                <label className="text-xs text-[#72767d] mb-1 block">Rôle support (nom ou ID)</label>
                <input value={cfg.support_role} onChange={f('support_role')} placeholder="Support, Modérateur…"
                  className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2.5 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-[#72767d] mb-1 block">Message de bienvenue du ticket</label>
              <textarea value={cfg.welcome_msg} onChange={f('welcome_msg')} rows={2}
                className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2.5 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm resize-none" />
            </div>
            <div>
              <label className="text-xs text-[#72767d] mb-1 block">Salon de logs des tickets (optionnel)</label>
              <input value={cfg.log_channel} onChange={f('log_channel')} placeholder="ticket-logs"
                className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2.5 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm" />
            </div>
          </div>
        </section>

        <div className="bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-xl p-4 text-sm">
          <p className="font-semibold text-[#5865F2] mb-2 flex items-center gap-2"><Info size={14} /> Comment ça marche</p>
          <ul className="text-[#96989d] space-y-1 list-disc list-inside">
            <li>Un membre tape <code className="text-white">/ticket</code> → un salon privé est créé</li>
            <li>Seuls le membre et le rôle support voient ce salon</li>
            <li>Tapez <code className="text-white">/close</code> pour fermer et supprimer le ticket</li>
            <li>Le bot a besoin de la permission <span className="text-white">Gérer les salons</span></li>
          </ul>
        </div>

        <button onClick={handleSave}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all ${saved ? 'bg-[#57F287] text-[#202225]' : 'bg-[#5865F2] hover:bg-[#4752C4] text-white'}`}>
          {saved ? <><CheckCircle size={17} /> Sauvegardé !</> : <><Save size={17} /> Sauvegarder</>}
        </button>
      </div>
    </div>
  )
}
