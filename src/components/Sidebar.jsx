import React from 'react'
import {
  LayoutDashboard, Settings, Terminal, Zap, MessageSquare, Bot, LogOut,
  Reply, Star, Clock, Layers, ShieldAlert, ClipboardList,
  Ticket, Users, Activity,
} from 'lucide-react'
import { useBotStatus } from '../context/BotContext'
import { useAuth }      from '../context/AuthContext'

const NAV = [
  { section: 'GÉNÉRAL' },
  { id: 'dashboard',  label: 'Dashboard',          icon: LayoutDashboard },
  { id: 'config',     label: 'Configuration',       icon: Settings },
  { id: 'console',    label: 'Console',             icon: Terminal },
  { section: 'COMMANDES' },
  { id: 'commands',   label: 'Slash Commands',      icon: MessageSquare },
  { id: 'auto-resp',  label: 'Auto-Répondeur',      icon: Reply },
  { id: 'embeds',     label: 'Embeds',              icon: Layers },
  { section: 'MEMBRES' },
  { id: 'events',     label: 'Événements',          icon: Zap },
  { id: 'xp',         label: 'XP & Niveaux',        icon: Star },
  { id: 'roles',      label: 'Rôles',               icon: Users },
  { section: 'MODÉRATION' },
  { id: 'antispam',   label: 'Anti-Spam',           icon: ShieldAlert },
  { id: 'modlog',     label: 'Logs Mod',            icon: ClipboardList },
  { id: 'tickets',    label: 'Tickets',             icon: Ticket },
  { section: 'OUTILS' },
  { id: 'scheduled',  label: 'Messages Planifiés',  icon: Clock },
  { id: 'bot-status', label: 'Statut du Bot',       icon: Activity },
]

const STATUS_STYLES = {
  online:     { dot: '#57F287', label: 'En ligne',  textColor: '#57F287' },
  connecting: { dot: '#FEE75C', label: 'Connexion…',textColor: '#FEE75C' },
  offline:    { dot: '#72767d', label: 'Hors ligne', textColor: '#72767d' },
}

export default function Sidebar({ activePage, onNavigate }) {
  const { status, botInfo } = useBotStatus()
  const { user, logout }    = useAuth()
  const sc = STATUS_STYLES[status] ?? STATUS_STYLES.offline

  return (
    <aside className="w-60 bg-[#2f3136] flex flex-col h-full flex-shrink-0">
      {/* Header */}
      <div className="px-4 py-4 bg-[#202225] border-b border-black/40 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#5865F2] flex items-center justify-center shadow-lg flex-shrink-0">
            <Bot size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-white text-sm leading-tight">Bot Builder</h1>
            <p className="text-[#72767d] text-xs truncate">{user?.username}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {NAV.map((item, i) =>
          item.section ? (
            <p key={i} className="text-[#72767d] text-[10px] font-semibold uppercase tracking-wider px-3 pt-4 pb-1 first:pt-1">
              {item.section}
            </p>
          ) : (
            <button key={item.id} onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 text-left mb-0.5 ${
                activePage === item.id
                  ? 'bg-[#5865F2] text-white'
                  : 'text-[#96989d] hover:bg-[#36393f] hover:text-[#dcddde]'
              }`}>
              <item.icon size={16} className="flex-shrink-0" />
              {item.label}
            </button>
          )
        )}
      </nav>

      {/* Bot status */}
      <div className="px-4 py-3 bg-[#292b2f] border-t border-black/30 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-[#5865F2]/20 flex items-center justify-center overflow-hidden">
              {botInfo?.avatar
                ? <img src={botInfo.avatar} alt="bot" className="w-8 h-8 rounded-full" />
                : <Bot size={14} className="text-[#5865F2]" />}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#292b2f]`}
              style={{ backgroundColor: sc.dot }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{botInfo?.tag ?? 'Aucun bot'}</p>
            <p className="text-xs" style={{ color: sc.textColor }}>{sc.label}</p>
          </div>
        </div>
        <button onClick={logout}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-[#72767d] hover:bg-[#ED4245]/15 hover:text-[#ED4245] transition-colors">
          <LogOut size={12} /> Déconnexion
        </button>
      </div>
    </aside>
  )
}
