import React, { useEffect, useState } from 'react'
import { Bot, Terminal, Zap, MessageSquare, Plus, TrendingUp, Activity, Wifi } from 'lucide-react'
import { api } from '../lib/api'
import { useBotStatus } from '../context/BotContext'

const ACTIVITY_STATIC = [
  { text: 'Commande /ping ajoutée',          time: 'à l\'instant',  dot: '#5865F2' },
  { text: 'Événement welcome activé',         time: 'il y a 15 min', dot: '#FEE75C' },
  { text: 'Configuration token sauvegardée',  time: 'il y a 1h',     dot: '#57F287' },
]

export default function Dashboard({ onNavigate }) {
  const { status, botInfo } = useBotStatus()
  const [stats, setStats]   = useState(null)

  useEffect(() => {
    api.get('/stats').then(setStats).catch(() => {})
    const t = setInterval(() => api.get('/stats').then(setStats).catch(() => {}), 10000)
    return () => clearInterval(t)
  }, [])

  const cards = [
    {
      label: 'Statut Bot',
      value: status === 'online' ? 'En ligne' : 'Hors ligne',
      icon: Wifi,
      color: status === 'online' ? '#57F287' : '#ED4245',
      bg:    status === 'online' ? 'rgba(87,242,135,.12)' : 'rgba(237,66,69,.12)',
    },
    {
      label: 'Commandes',
      value: String(stats?.commands ?? '—'),
      icon: MessageSquare,
      color: '#5865F2',
      bg:   'rgba(88,101,242,.12)',
    },
    {
      label: 'Événements actifs',
      value: String(stats?.activeEvents ?? '—'),
      icon: Zap,
      color: '#FEE75C',
      bg:   'rgba(254,231,92,.12)',
    },
    {
      label: 'Latence',
      value: status === 'online' ? `${stats?.ping ?? 0} ms` : '— ms',
      icon: TrendingUp,
      color: '#5865F2',
      bg:   'rgba(88,101,242,.12)',
    },
  ]

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Tableau de Bord</h1>
        <p className="text-[#72767d]">
          {botInfo ? `Connecté en tant que ${botInfo.tag} · ${botInfo.guilds} serveur(s)` : 'Aucun bot connecté'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-[#2f3136] rounded-xl p-5 border border-white/5 hover:border-[#5865F2]/40 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: bg }}>
                <Icon size={19} style={{ color }} />
              </div>
              <Activity size={13} className="text-[#72767d]" />
            </div>
            <div className="text-xl font-bold text-white mb-0.5">{value}</div>
            <div className="text-xs text-[#72767d]">{label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#2f3136] rounded-xl p-6 border border-white/5">
          <h2 className="text-white font-semibold text-base mb-4">Actions Rapides</h2>
          <div className="space-y-3">
            <button
              onClick={() => onNavigate('config')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-[#5865F2] hover:bg-[#4752C4] rounded-lg text-white font-medium transition-colors text-sm"
            >
              <Plus size={16} />
              Configurer un Bot
            </button>
            <button
              onClick={() => onNavigate('commands')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-[#36393f] hover:bg-[#40444b] rounded-lg text-[#dcddde] font-medium transition-colors text-sm border border-white/5"
            >
              <MessageSquare size={16} />
              Gérer les commandes
            </button>
            <button
              onClick={() => onNavigate('console')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-[#36393f] hover:bg-[#40444b] rounded-lg text-[#dcddde] font-medium transition-colors text-sm border border-white/5"
            >
              <Terminal size={16} />
              Ouvrir la Console
            </button>
          </div>
        </div>

        <div className="bg-[#2f3136] rounded-xl p-6 border border-white/5">
          <h2 className="text-white font-semibold text-base mb-4">Activité Récente</h2>
          <div className="space-y-1">
            {ACTIVITY_STATIC.map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.dot }} />
                <span className="text-sm text-[#dcddde] flex-1">{item.text}</span>
                <span className="text-xs text-[#72767d] flex-shrink-0 whitespace-nowrap">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
