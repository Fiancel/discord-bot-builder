import React, { useState, useEffect } from 'react'
import { ClipboardList, Save, CheckCircle } from 'lucide-react'
import { api } from '../lib/api'

const LOG_OPTIONS = [
  { key: 'log_bans',    label: 'Bannissements / Débannissements', emoji: '🔨' },
  { key: 'log_kicks',   label: 'Expulsions',                      emoji: '👢' },
  { key: 'log_deletes', label: 'Messages supprimés',              emoji: '🗑️' },
  { key: 'log_edits',   label: 'Messages modifiés',               emoji: '✏️' },
  { key: 'log_joins',   label: 'Membres rejoignant',              emoji: '👋' },
  { key: 'log_leaves',  label: 'Membres partant',                 emoji: '🚪' },
]

export default function ModLog() {
  const [cfg,   setCfg]   = useState({ enabled: false, channel: '', log_bans: true, log_kicks: true, log_deletes: true, log_edits: false, log_joins: false, log_leaves: false })
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => { api.get('/modlog').then(data => setCfg(p => ({ ...p, ...data }))).catch(() => {}) }, [])

  const handleSave = async () => {
    setError(''); setSaved(false)
    try { await api.post('/modlog', cfg); setSaved(true); setTimeout(() => setSaved(false), 3000) }
    catch (e) { setError(e.message) }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Logs de Modération</h1>
        <p className="text-[#72767d]">Enregistrez les actions de modération dans un salon dédié</p>
      </div>
      {error && <div className="bg-[#ED4245]/15 border border-[#ED4245]/40 rounded-lg px-4 py-3 mb-5 text-sm text-[#ED4245]">{error}</div>}

      <div className="space-y-5">
        <section className="bg-[#2f3136] rounded-xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold flex items-center gap-2"><ClipboardList size={17} className="text-[#5865F2]" /> Logs de modération</h2>
            <button onClick={() => setCfg(p => ({ ...p, enabled: !p.enabled }))}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${cfg.enabled ? 'bg-[#57F287]/20 text-[#57F287]' : 'bg-[#36393f] text-[#72767d]'}`}>
              {cfg.enabled ? '✓ Activé' : 'Désactivé'}
            </button>
          </div>
          <div>
            <label className="text-xs text-[#72767d] mb-1 block">Salon de logs (nom exact, sans #)</label>
            <input value={cfg.channel} onChange={e => setCfg(p => ({ ...p, channel: e.target.value }))}
              placeholder="mod-logs"
              className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2.5 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm" />
          </div>
        </section>

        <section className="bg-[#2f3136] rounded-xl p-6 border border-white/5">
          <h2 className="text-white font-semibold mb-4">Événements à enregistrer</h2>
          <div className="space-y-2">
            {LOG_OPTIONS.map(opt => (
              <button key={opt.key} type="button" onClick={() => setCfg(p => ({ ...p, [opt.key]: !p[opt.key] }))}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${cfg[opt.key] ? 'border-[#5865F2]/50 bg-[#5865F2]/10' : 'border-white/5 bg-[#36393f] hover:border-white/20'}`}>
                <span className="text-lg leading-none">{opt.emoji}</span>
                <span className="text-sm text-[#dcddde]">{opt.label}</span>
                <div className={`ml-auto w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${cfg[opt.key] ? 'bg-[#5865F2] border-[#5865F2]' : 'border-[#72767d]'}`}>
                  {cfg[opt.key] && <svg viewBox="0 0 10 8" className="w-2.5 h-2.5" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
              </button>
            ))}
          </div>
        </section>

        <button onClick={handleSave}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all ${saved ? 'bg-[#57F287] text-[#202225]' : 'bg-[#5865F2] hover:bg-[#4752C4] text-white'}`}>
          {saved ? <><CheckCircle size={17} /> Sauvegardé !</> : <><Save size={17} /> Sauvegarder</>}
        </button>
      </div>
    </div>
  )
}
