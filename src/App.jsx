import React, { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { BotProvider }           from './context/BotContext'
import AuthPage       from './components/AuthPage'
import Sidebar        from './components/Sidebar'
import Dashboard      from './components/Dashboard'
import BotConfig      from './components/BotConfig'
import CommandBuilder from './components/CommandBuilder'
import EventManager   from './components/EventManager'
import LogConsole     from './components/LogConsole'

const PAGES = {
  dashboard: Dashboard,
  config:    BotConfig,
  commands:  CommandBuilder,
  events:    EventManager,
  console:   LogConsole,
}

function AppInner() {
  const { user, loading } = useAuth()
  const [activePage, setActivePage] = useState('dashboard')

  if (loading) {
    return (
      <div className="min-h-screen bg-[#36393f] flex items-center justify-center">
        <div className="text-[#72767d] text-sm">Chargement…</div>
      </div>
    )
  }

  if (!user) return <AuthPage />

  const PageComponent = PAGES[activePage]

  return (
    <BotProvider>
      <div className="flex h-screen bg-[#36393f] text-[#dcddde] overflow-hidden">
        <Sidebar activePage={activePage} onNavigate={setActivePage} />
        <main className="flex-1 overflow-auto">
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
