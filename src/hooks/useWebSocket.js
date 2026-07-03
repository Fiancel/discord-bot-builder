import { useEffect, useRef, useState } from 'react'

function getWsUrl() {
  const token = localStorage.getItem('token') ?? ''
  if (import.meta.env.DEV) return `ws://localhost:3001?token=${token}`
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}?token=${token}`
}

export function useWebSocket(onMessage) {
  const [connected, setConnected] = useState(false)
  const wsRef   = useRef(null)
  const cbRef   = useRef(onMessage)
  cbRef.current = onMessage

  useEffect(() => {
    let retryTimer = null
    let unmounted  = false

    function connect() {
      if (unmounted) return
      const ws = new WebSocket(getWsUrl())
      wsRef.current = ws
      ws.onopen    = () => { if (!unmounted) setConnected(true) }
      ws.onclose   = () => {
        if (!unmounted) {
          setConnected(false)
          retryTimer = setTimeout(connect, 3000)
        }
      }
      ws.onerror   = () => ws.close()
      ws.onmessage = (e) => { try { cbRef.current?.(JSON.parse(e.data)) } catch {} }
    }

    connect()
    return () => { unmounted = true; clearTimeout(retryTimer); wsRef.current?.close() }
  }, [])

  return connected
}
