import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useWebSocket } from '../hooks/useWebSocket'

const BotContext = createContext(null)

export function BotProvider({ children }) {
  const [status,  setStatus]  = useState('offline')
  const [botInfo, setBotInfo] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/bot/status')
      setStatus(data.status)
      setBotInfo(data.info ?? null)
    } catch { /* server not ready yet */ }
  }, [])

  useWebSocket(useCallback((msg) => {
    // Update status when bot connects or disconnects
    if (msg.type === 'success' && msg.message.includes('Connecté en tant que')) {
      setTimeout(refresh, 500) // slight delay for bot.isReady()
    }
    if (msg.type === 'error' && msg.message.includes('hors ligne')) {
      setStatus('offline')
      setBotInfo(null)
    }
  }, [refresh]))

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 20000)
    return () => clearInterval(t)
  }, [refresh])

  return (
    <BotContext.Provider value={{ status, botInfo, refresh }}>
      {children}
    </BotContext.Provider>
  )
}

export const useBotStatus = () => useContext(BotContext)
