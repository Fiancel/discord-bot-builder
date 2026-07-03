import React, { useState } from 'react'
import { BotProvider } from './context/BotContext'
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

export default function App() {
  const [activePage, setActivePage] = useState('dashboard')
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
