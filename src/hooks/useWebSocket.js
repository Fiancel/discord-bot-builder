import { useEffect, useRef, useState } from 'react'

const WS_URL = import.meta.env.DEV
  ? 'ws://localhost:3001'
  : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`

export function useWebSocket(onMessage) {
  const [connected, setConnected] = useState(false)
  const wsRef      = useRef(null)
  const cbRef      = useRef(onMessage)
  cbRef.current    = onMessage

  useEffect(() => {
    let retryTimer = null
    let unmounted  = false

    function connect() {
      if (unmounted) return
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen    = () => { if (!unmounted) setConnected(true) }
      ws.onclose   = () => {
        if (!unmounted) {
          setConnected(false)
          retryTimer = setTimeout(connect, 3000)
        }
      }
      ws.onerror   = () => ws.close()
      ws.onmessage = (e) => {
        try { cbRef.current?.(JSON.parse(e.data)) } catch {}
      }
    }

    connect()
    return () => {
      unmounted = true
      clearTimeout(retryTimer)
      wsRef.current?.close()
    }
  }, [])

  return connected
}
