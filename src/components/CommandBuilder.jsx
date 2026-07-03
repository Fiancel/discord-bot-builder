import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Edit2, Check, MessageSquare, ChevronRight, RefreshCw } from 'lucide-react'
import { api } from '../lib/api'
import { useBotStatus } from '../context/BotContext'

/* ── CommandCard ─────────────────────────────────────────────────────────── */

function StatusBadge({ enabled }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
      enabled ? 'bg-[#57F287]/20 text-[#57F287]' : 'bg-[#72767d]/20 text-[#72767d]'
    }`}>
      {enabled ? 'Actif' : 'Inactif'}
    </span>
  )
}

function CommandCard({ command, onDelete, onToggle, onEdit }) {
  return (
    <div className={`bg-[#2f3136] rounded-xl p-4 border transition-all ${
      command.enabled ? 'border-white/5 hover:border-[#5865F2]/30' : 'border-white/5 opacity-55'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          command.enabled ? 'bg-[#5865F2]/20' : 'bg-[#36393f]'
        }`}>
          <MessageSquare size={14} className={command.enabled ? 'text-[#5865F2]' : 'text-[#72767d]'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono font-bold text-white text-sm">/{command.name}</span>
            <StatusBadge enabled={command.enabled} />
          </div>
          <p className="text-xs text-[#72767d] mb-2">{command.description}</p>
          <div className="bg-[#202225] rounded-lg px-3 py-1.5 text-xs text-[#96989d] font-mono truncate">
            <ChevronRight size={10} className="inline mr-1 text-[#5865F2]" />
            {command.response}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-1">
          <button onClick={() => onToggle(command)}
            title={command.enabled ? 'Désactiver' : 'Activer'}
            className={`p-1.5 rounded-md transition-colors ${
              command.enabled ? 'text-[#57F287] hover:bg-[#57F287]/15' : 'text-[#72767d] hover:bg-[#72767d]/15'
            }`}>
            <Check size={14} />
          </button>
          <button onClick={() => onEdit(command)}
            className="p-1.5 rounded-md text-[#72767d] hover:bg-[#5865F2]/15 hover:text-[#5865F2] transition-colors">
            <Edit2 size={14} />
          </button>
          <button onClick={() => onDelete(command.id)}
            className="p-1.5 rounded-md text-[#72767d] hover:bg-[#ED4245]/15 hover:text-[#ED4245] transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── CommandForm ─────────────────────────────────────────────────────────── */

function CommandForm({ command, onSave, onCancel }) {
  const [form, setForm] = useState(
    command ? { ...command } : { name: '', description: '', response: '', enabled: true }
  )

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.response.trim()) return
    onSave(form)
  }

  return (
    <div className="bg-[#2f3136] rounded-xl p-6 border border-[#5865F2]/50">
      <h3 className="text-white font-semibold mb-4 text-sm">
        {command ? 'Modifier la commande' : 'Nouvelle Commande'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-[#72767d] mb-1">Nom</label>
          <div className="flex items-center gap-2">
            <span className="text-[#5865F2] font-mono font-bold">/</span>
            <input type="text" value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value.replace(/\s/g, '').toLowerCase() }))}
              placeholder="nom-de-la-commande"
              className="flex-1 bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm font-mono"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-[#72767d] mb-1">Description</label>
          <input type="text" value={form.description} onChange={set('description')}
            placeholder="Décrivez ce que fait cette commande…"
            className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-[#72767d] mb-1">Réponse du bot</label>
          <textarea value={form.response} onChange={set('response')} rows={3}
            placeholder="La réponse que le bot enverra…"
            className="w-full bg-[#202225] text-[#dcddde] rounded-lg px-3 py-2 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm resize-none"
          />
          <p className="text-xs text-[#72767d] mt-1">
            Variables : <span className="text-[#5865F2] font-mono">{'{ping}'} {'{user}'} {'{server}'} {'{members}'}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button type="submit"
            className="flex-1 bg-[#5865F2] hover:bg-[#4752C4] text-white py-2 rounded-lg font-medium transition-colors text-sm">
            {command ? 'Mettre à jour' : 'Créer la commande'}
          </button>
          <button type="button" onClick={onCancel}
            className="px-4 bg-[#36393f] hover:bg-[#40444b] text-[#dcddde] py-2 rounded-lg font-medium transition-colors text-sm">
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}

/* ── Main ────────────────────────────────────────────────────────────────── */

export default function CommandBuilder() {
  const { status }                        = useBotStatus()
  const [commands, setCommands]           = useState([])
  const [showForm, setShowForm]           = useState(false)
  const [editingCommand, setEditingCommand] = useState(null)
  const [error, setError]                 = useState('')
  const [syncing, setSyncing]             = useState(false)

  const loadCommands = useCallback(async () => {
    try { setCommands(await api.get('/commands')) }
    catch {}
  }, [])

  useEffect(() => { loadCommands() }, [loadCommands])

  const handleSave = async (form) => {
    setError('')
    try {
      if (editingCommand) {
        const updated = await api.put(`/commands/${editingCommand.id}`, form)
        setCommands((prev) => prev.map((c) => c.id === updated.id ? updated : c))
      } else {
        const created = await api.post('/commands', form)
        setCommands((prev) => [...prev, created])
      }
      setShowForm(false)
      setEditingCommand(null)
    } catch (e) {
      setError(e.message)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/commands/${id}`)
      setCommands((prev) => prev.filter((c) => c.id !== id))
    } catch (e) { setError(e.message) }
  }

  const handleToggle = async (command) => {
    try {
      const updated = await api.put(`/commands/${command.id}`, { enabled: !command.enabled })
      setCommands((prev) => prev.map((c) => c.id === updated.id ? updated : c))
    } catch (e) { setError(e.message) }
  }

  const handleEdit = (cmd) => { setEditingCommand(cmd); setShowForm(true) }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Constructeur de Commandes</h1>
          <p className="text-[#72767d]">
            {commands.length} commande{commands.length !== 1 ? 's' : ''}
            {status === 'online' && (
              <span className="ml-2 text-[#57F287] text-xs">· Synchronisation auto activée</span>
            )}
          </p>
        </div>
        {!showForm && (
          <button onClick={() => { setEditingCommand(null); setShowForm(true) }}
            className="flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm">
            <Plus size={15} /> Nouvelle commande
          </button>
        )}
      </div>

      {error && (
        <div className="bg-[#ED4245]/15 border border-[#ED4245]/40 rounded-lg px-4 py-3 mb-5 text-sm text-[#ED4245]">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {showForm && (
          <CommandForm
            command={editingCommand}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingCommand(null) }}
          />
        )}
        {commands.map((cmd) => (
          <CommandCard key={cmd.id} command={cmd}
            onDelete={handleDelete} onToggle={handleToggle} onEdit={handleEdit} />
        ))}
        {commands.length === 0 && !showForm && (
          <div className="text-center py-20 text-[#72767d]">
            <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucune commande configurée</p>
            <p className="text-xs mt-1">Cliquez sur «&nbsp;Nouvelle commande&nbsp;» pour commencer</p>
          </div>
        )}
      </div>
    </div>
  )
}
