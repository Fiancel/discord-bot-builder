import React, { useEffect, useState } from 'react'
import { Bot, Terminal, Zap, MessageSquare, Plus, TrendingUp, Activity, Wifi, Star, Reply, ShieldAlert, Clock, ArrowRight, Sparkles } from 'lucide-react'
import { api } from '../lib/api'
import { useBotStatus } from '../context/BotContext'
import { useAuth }      from '../context/AuthContext'

const QUICK_ACTIONS = [
  { label: 'Configurer le Bot',     page: 'config',     icon: Bot,         color: '#5865F2', bg: 'rgba(88,101,242,.15)' },
  { label: 'Créer une commande',    page: 'commands',   icon: MessageSquare, color: '#57F287', bg: 'rgba(87,242,135,.15)' },
  { label: 'Auto-Répondeur',        page: 'auto-resp',  icon: Reply,       color: '#a78bfa', bg: 'rgba(167,139,250,.15)' },
  { label: 'Système XP',            page: 'xp',         icon: Star,        color: '#FEE75C', bg: 'rgba(254,231,92,.15)' },
  { label: 'Anti-Spam',             page: 'antispam',   icon: ShieldAlert, color: '#ED4245', bg: 'rgba(237,66,69,.15)' },
  { label: 'Messages Planifiés',    page: 'scheduled',  icon: Clock,       color: '#57F287', bg: 'rgba(87,242,135,.15)' },
  { label: 'Ouvrir la Console',     page: 'console',    icon: Terminal,    color: '#5865F2', bg: 'rgba(88,101,242,.15)' },
  { label: 'Événements',            page: 'events',     icon: Zap,         color: '#F57C00', bg: 'rgba(245,124,0,.15)' },
]

export default function Dashboard({ onNavigate }) {
  const { status, botInfo } = useBotStatus()
  const { user }            = useAuth()
  const [stats, setStats]   = useState(null)
  const isOnline = status === 'online'

  useEffect(() => {
    api.get('/stats').then(setStats).catch(() => {})
    const t = setInterval(() => api.get('/stats').then(setStats).catch(() => {}), 10000)
    return () => clearInterval(t)
  }, [])

  const statCards = [
    {
      label: 'Statut',
      value: isOnline ? 'En ligne' : 'Hors ligne',
      sub:   botInfo?.tag ?? 'Aucun bot',
      icon: Wifi,
      color: isOnline ? '#57F287' : '#ED4245',
      glow:  isOnline ? 'rgba(87,242,135,.12)' : 'rgba(237,66,69,.08)',
      pulse: isOnline,
    },
    {
      label: 'Serveurs',
      value: isOnline ? String(botInfo?.guilds ?? 0) : '—',
      sub:   isOnline ? 'Discord servers' : 'Bot hors ligne',
      icon: Bot,
      color: '#5865F2',
      glow:  'rgba(88,101,242,.12)',
    },
    {
      label: 'Commandes',
      value: String(stats?.commands ?? '—'),
      sub:   'Slash commands actives',
      icon: MessageSquare,
      color: '#a78bfa',
      glow:  'rgba(167,139,250,.12)',
    },
    {
      label: 'Auto-Réponses',
      value: String(stats?.autoResponses ?? '—'),
      sub:   'Triggers configurés',
      icon: Reply,
      color: '#FEE75C',
      glow:  'rgba(254,231,92,.12)',
    },
    {
      label: 'Événements',
      value: String(stats?.activeEvents ?? '—'),
      sub:   'Listeners actifs',
      icon: Zap,
      color: '#F57C00',
      glow:  'rgba(245,124,0,.12)',
    },
    {
      label: 'Latence',
      value: isOnline ? `${stats?.ping ?? 0} ms` : '— ms',
      sub:   'WebSocket ping',
      icon: TrendingUp,
      color: isOnline && (stats?.ping ?? 0) < 100 ? '#57F287' : '#FEE75C',
      glow:  'rgba(88,101,242,.12)',
    },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5865F2] to-[#a78bfa] flex items-center justify-center shadow-lg">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white leading-tight">
                  Bonjour, <span className="gradient-text">{user?.username}</span> 👋
                </h1>
                <p className="text-[#72767d] text-sm">
                  {botInfo
                    ? `${botInfo.tag} · ${botInfo.guilds} serveur(s) · ${botInfo.ping}ms`
                    : 'Configurez votre bot pour commencer'}
                </p>
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold ${
            isOnline ? 'text-[#57F287]' : 'text-[#72767d]'
          }`} style={{ background: isOnline ? 'rgba(87,242,135,.1)' : 'rgba(114,118,125,.1)', border: `1px solid ${isOnline ? 'rgba(87,242,135,.25)' : 'rgba(114,118,125,.2)'}` }}>
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#57F287] animate-pulse' : 'bg-[#72767d]'}`} />
            {isOnline ? 'Bot en ligne' : 'Bot hors ligne'}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map(({ label, value, sub, icon: Icon, color, glow, pulse }) => (
          <div key={label} className="card-hover relative rounded-2xl p-5 overflow-hidden"
            style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)' }}>
            {/* Glow bg */}
            <div className="absolute inset-0 rounded-2xl opacity-60 pointer-events-none"
              style={{ background: `radial-gradient(circle at top right, ${glow}, transparent 70%)` }} />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: glow }}>
                  <Icon size={17} style={{ color }} />
                </div>
                {pulse && <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />}
              </div>
              <div className="text-2xl font-black text-white mb-0.5">{value}</div>
              <div className="text-xs text-[#72767d]">{label}</div>
              <div className="text-[10px] text-[#4f5259] mt-0.5">{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-base">Actions rapides</h2>
          <span className="text-xs text-[#72767d]">{QUICK_ACTIONS.length} raccourcis</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(({ label, page, icon: Icon, color, bg }) => (
            <button key={page} onClick={() => onNavigate(page)}
              className="card-hover flex items-center gap-3 p-3.5 rounded-xl text-left group"
              style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                style={{ background: bg }}>
                <Icon size={15} style={{ color }} />
              </div>
              <span className="text-[#dcddde] text-xs font-medium leading-tight">{label}</span>
              <ArrowRight size={12} className="text-[#4f5259] ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>

      {/* Bot info card */}
      {isOnline && botInfo && (
        <div className="rounded-2xl p-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg,rgba(88,101,242,.12),rgba(167,139,250,.08))', border: '1px solid rgba(88,101,242,.25)' }}>
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-10 pointer-events-none"
            style={{ background: '#5865F2', transform: 'translate(30%,-30%)' }} />
          <div className="flex items-center gap-5">
            <div className="relative">
              <img src={botInfo.avatar} alt="Bot Avatar"
                className="w-14 h-14 rounded-2xl border-2 border-[#5865F2]/40"
                onError={e => { e.target.style.display='none' }} />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#57F287] border-2 border-[#1a1b1f] animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-white font-bold">{botInfo.tag}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium text-[#57F287]" style={{ background: 'rgba(87,242,135,.1)' }}>En ligne</span>
              </div>
              <div className="flex gap-6">
                {[
                  ['Serveurs', botInfo.guilds],
                  ['Latence', `${botInfo.ping} ms`],
                  ['Commandes', stats?.commands ?? '—'],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div className="text-lg font-black text-white">{val}</div>
                    <div className="text-xs text-[#72767d]">{label}</div>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => onNavigate('console')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:brightness-110"
              style={{ background: 'rgba(88,101,242,.3)', border: '1px solid rgba(88,101,242,.4)' }}>
              <Terminal size={14} /> Console
            </button>
          </div>
        </div>
      )}

      {/* CTA quand pas de bot */}
      {!isOnline && (
        <div className="rounded-2xl p-8 text-center relative overflow-hidden"
          style={{ background: 'rgba(255,255,255,.02)', border: '1px dashed rgba(255,255,255,.08)' }}>
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(88,101,242,.1)' }}>
            <Bot size={28} className="text-[#5865F2]" />
          </div>
          <h3 className="text-white font-bold text-lg mb-2">Aucun bot connecté</h3>
          <p className="text-[#72767d] text-sm mb-5 max-w-sm mx-auto">
            Configurez votre token Discord pour démarrer votre bot et accéder à toutes les fonctionnalités.
          </p>
          <button onClick={() => onNavigate('config')}
            className="btn-glow inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#5865F2,#7c3aed)' }}>
            <Plus size={16} /> Configurer mon bot
          </button>
        </div>
      )}
    </div>
  )
}
