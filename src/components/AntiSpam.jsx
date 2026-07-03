import React, { useState, useEffect } from 'react'
import { ShieldAlert, Save, CheckCircle } from 'lucide-react'
import { api } from '../lib/api'

const ACTIONS = [
  { value: 'delete',  label: 'Supprimer les messages',           color: '#FEE75C' },
  { value: 'warn',    label: 'Avertir + supprimer',              color: '#F57C00' },
  { value: 'timeout', label: 'Timeout + supprimer',              color: '#ED4245' },
]

export default function AntiSpam() {
  const [cfg,   setCfg]   = useState({ enabled: false, max_messages: 5, window_seconds: 5, action: 'delete', timeout_seconds: 60, warn_message: '{user} ⚠️ Spam détecté !' })
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => { api.get('/antispam').then(data => setCfg(p => ({ ...p, ...data }))).catch(() => {}) }, [])

  const handleSave = async () => {
    setError(''); setSaved(false)
    try { await api.post('/antispam', cfg); setSaved(true); setTimeout(() => setSaved(false), 3000) }
    catch (e) { setError(e.message) }
  }

  const n = (k) => (e) => setCfg(p => ({ ...p, [k]: Number(e.target.value) }))

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Anti-Spam</h1>
        <p className="text-[#72767d]">Détectez et sanctionnez automatiquement le spam</p>
      </div>
      {error && <div className="bg-[#ED4245]/15 border border-[#ED4245]/40 rounded-lg px-4 py-3 mb-5 text-sm text-[#ED4245]">{error}</div>}

      <div className="space-y-5">
        <section className="bg-[#2f3136] rounded-xl p-6 border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold flex items-center gap-2"><ShieldAlert size={17} className="text-[#ED4245]" /> Anti-Spam</h2>
              <p className="text-xs text-[#72767d] mt-0.5">Détection automatique des messages en rafale</p>
            </div>
            <button onClick={() => setCfg(p => ({ ...p, enabled: !p.enabled }))}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${cfg.enabled ? 'bg-[#57F287]/20 text-[#57F287]' : 'bg-[#36393f] text-[#72767d]'}`}>
              {cfg.enabled ? '✓ Activé' : 'Désactivé'}
            </button>
          </div>
        </section>

        <section className="bg-[#2f3136] rounded-xl p-6 border border-white/5">
          <h2 className="text-white font-semibold mb-4">Seuil de détection</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#72767d] mb-1 block">Nb messages maximum</label>
              <input type="number" min="2" max="20" value={cfg.max_messages} onChange={n('max_messages')}
                className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2.5 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs text-[#72767d] mb-1 block">Dans une fenêtre de (secondes)</label>
              <input type="number" min="1" max="60" value={cfg.window_seconds} onChange={n('window_seconds')}
                className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2.5 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm" />
            </div>
          </div>
          <p className="text-xs text-[#72767d] mt-2">
            Ex: déclenche si un utilisateur envoie plus de {cfg.max_messages} messages en {cfg.window_seconds}s
          </p>
        </section>

        <section className="bg-[#2f3136] rounded-xl p-6 border border-white/5">
          <h2 className="text-white font-semibold mb-4">Action à effectuer</h2>
          <div className="space-y-2">
            {ACTIONS.map(a => (
              <button key={a.value} type="button" onClick={() => setCfg(p => ({ ...p, action: a.value }))}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all text-sm ${cfg.action === a.value ? 'border-[#5865F2]/50 bg-[#5865F2]/10' : 'border-white/5 bg-[#36393f] hover:border-white/20'}`}>
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                <span className="text-[#dcddde]">{a.label}</span>
                {cfg.action === a.value && <span className="ml-auto text-xs text-[#5865F2]">Sélectionné</span>}
              </button>
            ))}
          </div>
          {cfg.action === 'timeout' && (
            <div className="mt-4">
              <label className="text-xs text-[#72767d] mb-1 block">Durée du timeout (secondes)</label>
              <input type="number" min="10" max="2419200" value={cfg.timeout_seconds} onChange={n('timeout_seconds')}
                className="w-32 bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2.5 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm" />
            </div>
          )}
          {cfg.action === 'warn' && (
            <div className="mt-4">
              <label className="text-xs text-[#72767d] mb-1 block">Message d'avertissement — variable: <code className="text-[#5865F2]">{'{user}'}</code></label>
              <input value={cfg.warn_message} onChange={e => setCfg(p => ({ ...p, warn_message: e.target.value }))}
                className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2.5 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm" />
            </div>
          )}
        </section>

        <button onClick={handleSave}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all ${saved ? 'bg-[#57F287] text-[#202225]' : 'bg-[#5865F2] hover:bg-[#4752C4] text-white'}`}>
          {saved ? <><CheckCircle size={17} /> Sauvegardé !</> : <><Save size={17} /> Sauvegarder</>}
        </button>
      </div>
    </div>
  )
}
