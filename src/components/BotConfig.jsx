import React, { useState, useEffect } from 'react'
import { Eye, EyeOff, Save, Key, Hash, Wifi, Shield, CheckCircle, Play, Square, Link, Copy, Check } from 'lucide-react'
import { api } from '../lib/api'
import { useBotStatus } from '../context/BotContext'

const INTENTS = [
  { id: 'guilds',                label: 'Guilds',             desc: 'Accès aux serveurs' },
  { id: 'guildMembers',          label: 'Guild Members',      desc: 'Informations sur les membres ⚡' },
  { id: 'guildMessages',         label: 'Guild Messages',     desc: 'Lecture des messages' },
  { id: 'guildMessageReactions', label: 'Message Reactions',  desc: 'Réactions aux messages' },
  { id: 'directMessages',        label: 'Direct Messages',    desc: 'Messages privés' },
  { id: 'guildPresences',        label: 'Guild Presences',    desc: 'Statuts des membres ⚡' },
  { id: 'guildVoiceStates',      label: 'Voice States',       desc: 'Salons vocaux' },
  { id: 'messageContent',        label: 'Message Content',    desc: 'Contenu des messages ⚡' },
]

function Checkbox({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`w-4 h-4 rounded flex items-center justify-center border transition-all flex-shrink-0 mt-0.5 ${
        checked ? 'bg-[#5865F2] border-[#5865F2]' : 'border-[#72767d]'
      }`}
    >
      {checked && (
        <svg viewBox="0 0 10 8" className="w-2.5 h-2.5" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

export default function BotConfig() {
  const { status, refresh } = useBotStatus()

  const [showToken, setShowToken] = useState(false)
  const [token,     setToken]     = useState('')
  const [prefix,    setPrefix]    = useState('!')
  const [intents,   setIntents]   = useState({ guilds: true, guildMessages: true })
  const [hasToken,  setHasToken]  = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [error,     setError]     = useState('')
  const [starting,  setStarting]  = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [copied,    setCopied]    = useState(false)

  useEffect(() => {
    api.get('/config').then((data) => {
      setPrefix(data.prefix ?? '!')
      setIntents(data.intents ?? { guilds: true, guildMessages: true })
      setHasToken(!!data.hasToken)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (status === 'online') {
      api.get('/bot/invite').then((d) => setInviteUrl(d.url)).catch(() => {})
    } else {
      setInviteUrl('')
    }
  }, [status])

  const handleSave = async () => {
    setError('')
    try {
      const body = { prefix, intents }
      if (token) body.token = token
      await api.post('/config', body)
      setSaved(true)
      setHasToken(true)
      if (token) setToken('')
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e.message)
    }
  }

  const handleStart = async () => {
    setError('')
    setStarting(true)
    try {
      await api.post('/bot/start')
      await refresh()
    } catch (e) {
      setError(e.message)
    } finally {
      setStarting(false)
    }
  }

  const handleStop = async () => {
    setError('')
    try {
      await api.post('/bot/stop')
      await refresh()
    } catch (e) {
      setError(e.message)
    }
  }

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isOnline     = status === 'online'
  const isConnecting = status === 'connecting'

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Configuration du Bot</h1>
        <p className="text-[#72767d]">Renseignez votre token Discord et démarrez votre bot</p>
      </div>

      {/* Guide rapide */}
      <div className="bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-xl p-4 mb-6 text-sm text-[#dcddde]">
        <p className="font-semibold text-[#5865F2] mb-1">Guide rapide</p>
        <ol className="list-decimal list-inside space-y-0.5 text-[#96989d]">
          <li>Créez un bot sur <span className="text-white">discord.com/developers/applications</span></li>
          <li>Activez les intents privilegiés (⚡) dans l'onglet <span className="text-white">Bot</span> si nécessaire</li>
          <li>Copiez votre <span className="text-white">Token</span> et collez-le ci-dessous</li>
          <li>Cliquez <span className="text-white">Sauvegarder</span> puis <span className="text-white">Démarrer</span></li>
          <li>Utilisez le lien d'invitation pour inviter votre bot</li>
        </ol>
      </div>

      {error && (
        <div className="bg-[#ED4245]/15 border border-[#ED4245]/40 rounded-lg px-4 py-3 mb-5 text-sm text-[#ED4245]">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {/* Token */}
        <section className="bg-[#2f3136] rounded-xl p-6 border border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <Key size={17} className="text-[#5865F2]" />
            <h2 className="text-white font-semibold">Token du Bot</h2>
            {hasToken && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[#57F287]/20 text-[#57F287]">Token enregistré</span>
            )}
          </div>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={hasToken ? '••••••• (laisser vide pour conserver)' : 'Collez votre token Discord ici…'}
              className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-4 py-3 pr-11 border border-white/10 focus:border-[#5865F2] focus:outline-none placeholder-[#72767d] text-sm font-mono"
            />
            <button type="button" onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#72767d] hover:text-[#dcddde] transition-colors">
              {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-[#72767d] mt-2 flex items-center gap-1">
            <Shield size={11} /> Chiffré et stocké dans votre compte — jamais partagé
          </p>
        </section>

        {/* Prefix */}
        <section className="bg-[#2f3136] rounded-xl p-6 border border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <Hash size={17} className="text-[#5865F2]" />
            <h2 className="text-white font-semibold">Préfixe des Commandes</h2>
          </div>
          <input
            type="text"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            maxLength={5}
            className="bg-[#202225] text-[#dcddde] rounded-lg px-4 py-3 w-28 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm font-mono"
          />
          <p className="text-xs text-[#72767d] mt-2">
            Avec «&nbsp;<span className="text-[#5865F2] font-mono">{prefix || '!'}</span>&nbsp;» → commande <span className="text-[#dcddde] font-mono">{prefix || '!'}help</span>
          </p>
        </section>

        {/* Intents */}
        <section className="bg-[#2f3136] rounded-xl p-6 border border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <Wifi size={17} className="text-[#5865F2]" />
            <h2 className="text-white font-semibold">Gateway Intents</h2>
          </div>
          <p className="text-xs text-[#72767d] mb-4">⚡ = Intent privilégié, doit être activé sur le portail Discord</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {INTENTS.map(({ id, label, desc }) => (
              <button key={id} type="button"
                onClick={() => setIntents((p) => ({ ...p, [id]: !p[id] }))}
                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                  intents[id] ? 'bg-[#5865F2]/10 border-[#5865F2]/50' : 'bg-[#36393f] border-white/5 hover:border-white/20'
                }`}
              >
                <Checkbox checked={!!intents[id]} onChange={() => {}} />
                <div>
                  <div className="text-sm font-medium text-[#dcddde]">{label}</div>
                  <div className="text-xs text-[#72767d]">{desc}</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Save */}
        <button type="button" onClick={handleSave}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all text-sm ${
            saved ? 'bg-[#57F287] text-[#202225]' : 'bg-[#5865F2] hover:bg-[#4752C4] text-white'
          }`}
        >
          {saved ? <><CheckCircle size={17} /> Sauvegardé !</> : <><Save size={17} /> Sauvegarder la Configuration</>}
        </button>

        {/* Start / Stop */}
        <div className="flex gap-3">
          <button type="button" onClick={handleStart}
            disabled={isOnline || isConnecting || starting}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all text-sm bg-[#57F287]/20 text-[#57F287] hover:bg-[#57F287]/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play size={16} />
            {starting ? 'Démarrage…' : isConnecting ? 'Connexion…' : 'Démarrer le Bot'}
          </button>
          <button type="button" onClick={handleStop}
            disabled={!isOnline}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all text-sm bg-[#ED4245]/20 text-[#ED4245] hover:bg-[#ED4245]/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Square size={16} />
            Arrêter le Bot
          </button>
        </div>

        {/* Invite URL */}
        {inviteUrl && (
          <section className="bg-[#57F287]/10 border border-[#57F287]/30 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Link size={16} className="text-[#57F287]" />
              <h2 className="text-white font-semibold text-sm">Lien d'invitation</h2>
            </div>
            <div className="flex gap-2">
              <input readOnly value={inviteUrl}
                className="flex-1 bg-[#202225] text-[#96989d] rounded-lg px-3 py-2 text-xs font-mono border border-white/10 truncate" />
              <button onClick={copyInvite}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#57F287] hover:bg-[#57F287]/80 text-[#202225] rounded-lg text-xs font-semibold transition-colors flex-shrink-0"
              >
                {copied ? <><Check size={13} /> Copié</> : <><Copy size={13} /> Copier</>}
              </button>
            </div>
            <p className="text-xs text-[#72767d] mt-2">
              Ouvrez ce lien dans votre navigateur pour inviter le bot sur votre serveur.
            </p>
          </section>
        )}
      </div>
    </div>
  )
}
