import React, { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { BotProvider }           from './context/BotContext'
import LandingPage       from './components/LandingPage'
import AuthPage          from './components/AuthPage'
import Sidebar           from './components/Sidebar'
import Dashboard         from './components/Dashboard'
import BotConfig         from './components/BotConfig'
import CommandBuilder    from './components/CommandBuilder'
import EventManager      from './components/EventManager'
import LogConsole        from './components/LogConsole'
import AutoResponder     from './components/AutoResponder'
import XPSystem          from './components/XPSystem'
import ScheduledMessages from './components/ScheduledMessages'
import EmbedBuilder      from './components/EmbedBuilder'
import AntiSpam          from './components/AntiSpam'
import ModLog            from './components/ModLog'
import Tickets           from './components/Tickets'
import RoleManager       from './components/RoleManager'
import BotStatusPage     from './components/BotStatusPage'

const PAGES = {
  dashboard:    Dashboard,
  config:       BotConfig,
  commands:     CommandBuilder,
  events:       EventManager,
  console:      LogConsole,
  'auto-resp':  AutoResponder,
  xp:           XPSystem,
  scheduled:    ScheduledMessages,
  embeds:       EmbedBuilder,
  antispam:     AntiSpam,
  modlog:       ModLog,
  tickets:      Tickets,
  roles:        RoleManager,
  'bot-status': BotStatusPage,
}

function AppInner() {
  const { user, loading } = useAuth()
  const [activePage, setActivePage] = useState('dashboard')
  const [showAuth,   setShowAuth]   = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0c0d11' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5865F2] to-[#a78bfa] flex items-center justify-center animate-pulse-glow">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-[#4f5259] text-sm">Chargement…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    if (showAuth) return <AuthPage onBack={() => setShowAuth(false)} />
    return <LandingPage onGetStarted={() => setShowAuth(true)} />
  }

  const PageComponent = PAGES[activePage] ?? Dashboard

  return (
    <BotProvider>
      <div className="flex h-screen text-[#dcddde] overflow-hidden" style={{ background: '#1a1b1f' }}>
        <Sidebar activePage={activePage} onNavigate={setActivePage} />
        <main className="flex-1 overflow-auto" style={{ background: '#111216' }}>
          <PageComponent onNavigate={setActivePage} />
        </main>
      </div>
    </BotProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
