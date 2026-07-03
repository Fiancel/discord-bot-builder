import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Terminal, Trash2, Play, Square, Wifi, WifiOff } from 'lucide-react'
import { api } from '../lib/api'
import { useWebSocket } from '../hooks/useWebSocket'
import { useBotStatus } from '../context/BotContext'

const LOG_STYLES = {
  info:    { color: '#5865F2', label: 'INFO'  },
  success: { color: '#57F287', label: 'OK'    },
  warn:    { color: '#FEE75C', label: 'WARN'  },
  error:   { color: '#ED4245', label: 'ERR'   },
  debug:   { color: '#96989d', label: 'DBG'   },
}

function LogLine({ log }) {
  const style = LOG_STYLES[log.type] ?? LOG_STYLES.info
  return (
    <div className="log-entry flex items-start gap-3 px-1 py-0.5 rounded text-xs hover:bg-white/5">
      <span className="text-[#72767d] flex-shrink-0 select-none tabular-nums">{log.time}</span>
      <span className="font-bold flex-shrink-0 w-10 text-right select-none" style={{ color: style.color }}>
        [{style.label}]
      </span>
      <span className="text-[#dcddde] break-all">{log.message}</span>
    </div>
  )
}

export default function LogConsole() {
  const { status, refresh } = useBotStatus()
  const [logs,     setLogs]    = useState([])
  const [starting, setStarting] = useState(false)
  const [error,    setError]   = useState('')
  const bottomRef = useRef(null)

  const addLog = useCallback((entry) => {
    setLogs((prev) => {
      const next = [...prev, entry]
      return next.length > 500 ? next.slice(-500) : next // cap at 500 lines
    })
  }, [])

  // WebSocket — real bot logs
  const wsConnected = useWebSocket(useCallback((msg) => {
    addLog(msg)
    // Refresh bot status when important events happen
    if (msg.type === 'success' || msg.type === 'error') {
      setTimeout(refresh, 800)
    }
  }, [addLog, refresh]))

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleStart = async () => {
    setError('')
    setStarting(true)
    try {
      await api.post('/bot/start')
    } catch (e) {
      setError(e.message)
      addLog({ type: 'error', message: e.message, time: now() })
    } finally {
      setStarting(false)
    }
  }

  const handleStop = async () => {
    setError('')
    try {
      await api.post('/bot/stop')
    } catch (e) {
      setError(e.message)
    }
  }

  const isOnline = status === 'online'
  const errCount  = logs.filter((l) => l.type === 'error').length
  const warnCount = logs.filter((l) => l.type === 'warn').length

  const statusConfig = {
    online:     { dot: 'bg-[#57F287] animate-pulse', badge: 'bg-[#57F287]/15 text-[#57F287]', label: 'En ligne'    },
    connecting: { dot: 'bg-[#FEE75C] animate-pulse', badge: 'bg-[#FEE75C]/15 text-[#FEE75C]', label: 'Connexion…' },
    offline:    { dot: 'bg-[#ED4245]',                badge: 'bg-[#ED4245]/15 text-[#ED4245]', label: 'Hors ligne'  },
  }[status] ?? {}

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Console de Log</h1>
          <p className="text-[#72767d]">Logs en temps réel de votre bot Discord</p>
        </div>
        <div className="flex items-center gap-3">
          {/* WS connection indicator */}
          <div className={`flex items-center gap-1.5 text-xs ${wsConnected ? 'text-[#57F287]' : 'text-[#72767d]'}`}>
            {wsConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
            <span>{wsConnected ? 'Connecté' : 'Reconnexion…'}</span>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${statusConfig.badge}`}>
            <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
            {statusConfig.label}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-[#ED4245]/15 border border-[#ED4245]/40 rounded-lg px-4 py-3 mb-5 text-sm text-[#ED4245]">
          {error}
        </div>
      )}

      {/* Terminal */}
      <div className="bg-[#202225] rounded-xl border border-white/5 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#18191c] border-b border-white/5">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ED4245]" />
            <div className="w-3 h-3 rounded-full bg-[#FEE75C]" />
            <div className="w-3 h-3 rounded-full bg-[#57F287]" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#72767d]">
            <Terminal size={11} />
            <span className="font-mono">bot — console</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLogs([])} title="Effacer"
              className="text-[#72767d] hover:text-[#dcddde] transition-colors p-1">
              <Trash2 size={13} />
            </button>
            {!isOnline ? (
              <button onClick={handleStart} disabled={starting || status === 'connecting'}
                className="flex items-center gap-1 px-2 py-1 bg-[#57F287]/15 text-[#57F287] rounded text-xs font-semibold hover:bg-[#57F287]/25 transition-colors disabled:opacity-50">
                <Play size={10} /> {starting ? 'Démarrage…' : 'Démarrer'}
              </button>
            ) : (
              <button onClick={handleStop}
                className="flex items-center gap-1 px-2 py-1 bg-[#ED4245]/15 text-[#ED4245] rounded text-xs font-semibold hover:bg-[#ED4245]/25 transition-colors">
                <Square size={10} /> Arrêter
              </button>
            )}
          </div>
        </div>

        {/* Log output */}
        <div className="h-[420px] overflow-y-auto p-4 font-mono space-y-0.5">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#72767d] select-none">
              <Terminal size={32} className="mb-2 opacity-20" />
              <p className="text-sm">Aucun log</p>
              <p className="text-xs mt-1">
                {wsConnected
                  ? 'Démarrez le bot pour voir les logs en temps réel'
                  : 'Connexion au serveur en cours…'}
              </p>
            </div>
          ) : (
            logs.map((log, i) => <LogLine key={i} log={log} />)
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-4">
        {[
          { label: 'Entrées totales', value: logs.length,  color: '#dcddde' },
          { label: 'Avertissements',  value: warnCount,    color: '#FEE75C' },
          { label: 'Erreurs',         value: errCount,     color: '#ED4245' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#2f3136] rounded-lg p-3 border border-white/5 text-center">
            <div className="text-xl font-bold" style={{ color }}>{value}</div>
            <div className="text-xs text-[#72767d] mt-0.5">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function now() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
