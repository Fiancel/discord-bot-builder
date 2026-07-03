import React, { useState, useEffect } from 'react'
import { Activity, Save, CheckCircle } from 'lucide-react'
import { api } from '../lib/api'

const TYPES = [
  { value: 'playing',   label: '🎮 Joue à',      example: 'Minecraft, League of Legends…' },
  { value: 'watching',  label: '📺 Regarde',      example: 'YouTube, votre serveur…' },
  { value: 'listening', label: '🎵 Écoute',        example: 'Spotify, de la musique…' },
  { value: 'competing', label: '🏆 Participe à',  example: 'un tournoi, un événement…' },
  { value: 'streaming', label: '📡 Diffuse',       example: 'Twitch, un stream…' },
]

export default function BotStatusPage() {
  const [cfg,   setCfg]   = useState({ activity_type: 'playing', activity_text: '' })
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => { api.get('/bot-status').then(data => setCfg(p => ({ ...p, ...data }))).catch(() => {}) }, [])

  const handleSave = async () => {
    setError(''); setSaved(false)
    try { await api.post('/bot-status', cfg); setSaved(true); setTimeout(() => setSaved(false), 3000) }
    catch (e) { setError(e.message) }
  }

  const selected = TYPES.find(t => t.value === cfg.activity_type) || TYPES[0]

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Statut du Bot</h1>
        <p className="text-[#72767d]">Personnalisez l'activité affichée sous le nom de votre bot</p>
      </div>
      {error && <div className="bg-[#ED4245]/15 border border-[#ED4245]/40 rounded-lg px-4 py-3 mb-5 text-sm text-[#ED4245]">{error}</div>}

      <div className="space-y-5">
        <section className="bg-[#2f3136] rounded-xl p-6 border border-white/5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Activity size={17} className="text-[#5865F2]" /> Type d'activité</h2>
          <div className="space-y-2">
            {TYPES.map(t => (
              <button key={t.value} type="button" onClick={() => setCfg(p => ({ ...p, activity_type: t.value }))}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${cfg.activity_type === t.value ? 'border-[#5865F2]/50 bg-[#5865F2]/10' : 'border-white/5 bg-[#36393f] hover:border-white/20'}`}>
                <span className="text-lg leading-none w-7">{t.label.split(' ')[0]}</span>
                <div>
                  <p className="text-sm text-[#dcddde] font-medium">{t.label.split(' ').slice(1).join(' ')}</p>
                  <p className="text-xs text-[#72767d]">ex: {t.example}</p>
                </div>
                {cfg.activity_type === t.value && <span className="ml-auto text-xs text-[#5865F2]">✓</span>}
              </button>
            ))}
          </div>
        </section>

        <section className="bg-[#2f3136] rounded-xl p-6 border border-white/5">
          <h2 className="text-white font-semibold mb-3">Texte d'activité</h2>
          <input value={cfg.activity_text} onChange={e => setCfg(p => ({ ...p, activity_text: e.target.value }))}
            placeholder={selected.example}
            className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2.5 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm" />
          {cfg.activity_text && (
            <div className="mt-4 bg-[#36393f] rounded-lg p-3">
              <p className="text-xs text-[#72767d] mb-1">Aperçu dans Discord :</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#57F287]" />
                <div>
                  <p className="text-white text-sm font-medium">Votre Bot</p>
                  <p className="text-[#72767d] text-xs">{selected.label} {cfg.activity_text}</p>
                </div>
              </div>
            </div>
          )}
          <p className="text-xs text-[#72767d] mt-2">Laissez vide pour retirer le statut</p>
        </section>

        <button onClick={handleSave}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all ${saved ? 'bg-[#57F287] text-[#202225]' : 'bg-[#5865F2] hover:bg-[#4752C4] text-white'}`}>
          {saved ? <><CheckCircle size={17} /> Appliqué !</> : <><Save size={17} /> Appliquer le statut</>}
        </button>
      </div>
    </div>
  )
}
