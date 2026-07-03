import React from 'react'
import { LayoutDashboard, Settings, Terminal, Zap, MessageSquare, Bot, LogOut } from 'lucide-react'
import { useBotStatus } from '../context/BotContext'
import { useAuth }      from '../context/AuthContext'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',     icon: LayoutDashboard },
  { id: 'config',    label: 'Configuration', icon: Settings },
  { id: 'commands',  label: 'Commandes',     icon: MessageSquare },
  { id: 'events',    label: 'Événements',    icon: Zap },
  { id: 'console',   label: 'Console',       icon: Terminal },
]

const STATUS_STYLES = {
  online:     { dot: '#57F287', label: 'En ligne',   textColor: '#57F287' },
  connecting: { dot: '#FEE75C', label: 'Connexion…', textColor: '#FEE75C' },
  offline:    { dot: '#72767d', label: 'Hors ligne',  textColor: '#72767d' },
}

export default function Sidebar({ activePage, onNavigate }) {
  const { status, botInfo } = useBotStatus()
  const { user, logout }    = useAuth()
  const sc = STATUS_STYLES[status] ?? STATUS_STYLES.offline

  return (
    <aside className="w-64 bg-[#2f3136] flex flex-col h-full flex-shrink-0">
      {/* Header */}
      <div className="px-4 py-5 bg-[#202225] border-b border-black/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#5865F2] flex items-center justify-center shadow-lg">
            <Bot size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-white text-sm leading-tight truncate">Bot Builder</h1>
            <p className="text-[#72767d] text-xs truncate">{user?.username}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[#72767d] text-xs font-semibold uppercase tracking-wider px-3 mb-2">Navigation</p>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => onNavigate(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 text-left ${
              activePage === id
                ? 'bg-[#5865F2] text-white shadow-sm'
                : 'text-[#96989d] hover:bg-[#36393f] hover:text-[#dcddde]'
            }`}>
            <Icon size={17} className="flex-shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* Bot status */}
      <div className="px-4 py-3 bg-[#292b2f] border-t border-black/30">
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-[#5865F2]/20 flex items-center justify-center overflow-hidden">
              {botInfo?.avatar
                ? <img src={botInfo.avatar} alt="bot" className="w-8 h-8 rounded-full" />
                : <Bot size={15} className="text-[#5865F2]" />
              }
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#292b2f] ${status === 'online' ? 'animate-pulse' : ''}`}
              style={{ backgroundColor: sc.dot }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">
              {botInfo?.tag ?? 'Aucun bot'}
            </p>
            <p className="text-xs" style={{ color: sc.textColor }}>{sc.label}</p>
          </div>
        </div>

        {/* Déconnexion */}
        <button onClick={logout}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-[#72767d] hover:bg-[#ED4245]/15 hover:text-[#ED4245] transition-colors">
          <LogOut size={13} />
          Déconnexion ({user?.username})
        </button>
      </div>
    </aside>
  )
}
