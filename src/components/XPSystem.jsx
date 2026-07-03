import React, { useState, useEffect } from 'react'
import { Star, Save, CheckCircle, Trophy } from 'lucide-react'
import { api } from '../lib/api'

const DEFAULT = { enabled: false, xp_per_msg: 15, cooldown_seconds: 60, level_channel: '', level_msg: 'GG {user} ! Tu passes niveau **{level}** !' }

export default function XPSystem() {
  const [cfg,    setCfg]    = useState(DEFAULT)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => { api.get('/xp').then(data => setCfg(prev => ({ ...prev, ...data }))).catch(() => {}) }, [])

  const handleSave = async () => {
    setError(''); setSaved(false)
    try { await api.post('/xp', cfg); setSaved(true); setTimeout(() => setSaved(false), 3000) }
    catch (e) { setError(e.message) }
  }

  const f = (k) => (e) => setCfg(p => ({ ...p, [k]: e.target.value }))
  const n = (k) => (e) => setCfg(p => ({ ...p, [k]: Number(e.target.value) }))

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">XP & Niveaux</h1>
        <p className="text-[#72767d]">Récompensez l'activité de vos membres avec un système d'expérience</p>
      </div>

      {error && <div className="bg-[#ED4245]/15 border border-[#ED4245]/40 rounded-lg px-4 py-3 mb-5 text-sm text-[#ED4245]">{error}</div>}

      <div className="space-y-5">
        {/* Activer */}
        <section className="bg-[#2f3136] rounded-xl p-6 border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold flex items-center gap-2"><Star size={17} className="text-[#FEE75C]" /> Système XP</h2>
              <p className="text-xs text-[#72767d] mt-0.5">Active le gain d'expérience par message</p>
            </div>
            <button onClick={() => setCfg(p => ({ ...p, enabled: !p.enabled }))}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${cfg.enabled ? 'bg-[#57F287]/20 text-[#57F287]' : 'bg-[#36393f] text-[#72767d] hover:bg-[#40444b]'}`}>
              {cfg.enabled ? '✓ Activé' : 'Désactivé'}
            </button>
          </div>
        </section>

        {/* Paramètres */}
        <section className="bg-[#2f3136] rounded-xl p-6 border border-white/5">
          <h2 className="text-white font-semibold mb-4">Paramètres XP</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#72767d] mb-1 block">XP par message</label>
              <input type="number" min="1" max="100" value={cfg.xp_per_msg} onChange={n('xp_per_msg')}
                className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2.5 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs text-[#72767d] mb-1 block">Cooldown (secondes)</label>
              <input type="number" min="0" max="3600" value={cfg.cooldown_seconds} onChange={n('cooldown_seconds')}
                className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2.5 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm" />
            </div>
          </div>
          <p className="text-xs text-[#72767d] mt-3">
            Formule : Niveau = √(XP / 100) — Ex : niv.5 = 2 500 XP, niv.10 = 10 000 XP
          </p>
        </section>

        {/* Message de niveau */}
        <section className="bg-[#2f3136] rounded-xl p-6 border border-white/5">
          <h2 className="text-white font-semibold mb-4">Annonce de passage de niveau</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#72767d] mb-1 block">Salon (laisser vide = même salon)</label>
              <input value={cfg.level_channel} onChange={f('level_channel')} placeholder="#niveau-up ou vide"
                className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2.5 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs text-[#72767d] mb-1 block">Message — variables : <code className="text-[#5865F2]">{'{user}'}</code> <code className="text-[#5865F2]">{'{level}'}</code></label>
              <input value={cfg.level_msg} onChange={f('level_msg')}
                className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2.5 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm" />
            </div>
          </div>
        </section>

        {/* Commandes dispo */}
        <div className="bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-xl p-4 text-sm">
          <p className="font-semibold text-[#5865F2] mb-2 flex items-center gap-2"><Trophy size={14} /> Commandes slash disponibles</p>
          <div className="grid grid-cols-2 gap-2 text-[#96989d]">
            <div><code className="text-white">/rank</code> — Voir son niveau</div>
            <div><code className="text-white">/leaderboard</code> — Classement du serveur</div>
          </div>
        </div>

        <button onClick={handleSave}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all ${saved ? 'bg-[#57F287] text-[#202225]' : 'bg-[#5865F2] hover:bg-[#4752C4] text-white'}`}>
          {saved ? <><CheckCircle size={17} /> Sauvegardé !</> : <><Save size={17} /> Sauvegarder</>}
        </button>
      </div>
    </div>
  )
}
