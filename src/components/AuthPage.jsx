import React, { useState } from 'react'
import { Bot, Mail, Lock, User, Eye, EyeOff, LogIn, UserPlus, ArrowLeft, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function Field({ icon: Icon, type, placeholder, value, onChange }) {
  const [show, setShow] = useState(false)
  const isPass = type === 'password'
  return (
    <div className="relative group">
      <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4f5259] group-focus-within:text-[#5865F2] transition-colors" />
      <input
        type={isPass && show ? 'text' : type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        className="w-full rounded-xl pl-10 pr-10 py-3.5 text-sm text-white placeholder-[#4f5259] transition-all outline-none"
        style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}
        onFocus={e => { e.target.style.borderColor = 'rgba(88,101,242,.6)'; e.target.style.background = 'rgba(88,101,242,.05)' }}
        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,.08)'; e.target.style.background = 'rgba(255,255,255,.04)' }}
      />
      {isPass && (
        <button type="button" onClick={() => setShow(!show)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4f5259] hover:text-[#dcddde] transition-colors">
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      )}
    </div>
  )
}

export default function AuthPage({ onBack }) {
  const { login, register } = useAuth()
  const [mode,     setMode]     = useState('login')
  const [username, setUsername] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      if (mode === 'login') await login(email, password)
      else await register(email, password, username)
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  const switchMode = (m) => { setMode(m); setError(''); setUsername(''); setEmail(''); setPassword('') }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden dot-grid" style={{ background: '#0c0d11' }}>
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ background: '#5865F2' }} />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full blur-3xl opacity-8 pointer-events-none" style={{ background: '#a78bfa' }} />

      <div className="w-full max-w-md relative animate-fade-up">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-2 text-[#72767d] hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft size={15} /> Retour à l'accueil
          </button>
        )}

        <div className="text-center mb-8">
          <div className="relative inline-block mb-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5865F2] to-[#7c3aed] flex items-center justify-center shadow-2xl animate-pulse-glow">
              <Bot size={30} className="text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-lg bg-[#FEE75C] flex items-center justify-center">
              <Sparkles size={12} className="text-[#1a1b1f]" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Discord Bot Builder</h1>
          <p className="text-[#4f5259] text-sm">La plateforme no-code pour vos bots</p>
        </div>

        <div className="rounded-2xl p-7 shadow-2xl" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)' }}>
          <div className="flex rounded-xl p-1 mb-6" style={{ background: 'rgba(255,255,255,.04)' }}>
            {[['login', LogIn, 'Connexion'], ['register', UserPlus, 'Inscription']].map(([m, Icon, label]) => (
              <button key={m} type="button" onClick={() => switchMode(m)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === m ? 'text-white shadow-lg' : 'text-[#4f5259] hover:text-[#72767d]'}`}
                style={mode === m ? { background: 'linear-gradient(135deg,#5865F2,#7c3aed)' } : {}}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 mb-5 text-sm flex items-center gap-2"
              style={{ background: 'rgba(237,66,69,.1)', border: '1px solid rgba(237,66,69,.25)', color: '#ED4245' }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <Field icon={User} type="text" placeholder="Nom d'utilisateur"
                value={username} onChange={e => setUsername(e.target.value)} />
            )}
            <Field icon={Mail} type="email" placeholder="Adresse email"
              value={email} onChange={e => setEmail(e.target.value)} />
            <Field icon={Lock} type="password"
              placeholder={mode === 'register' ? 'Mot de passe (6 caractères min)' : 'Mot de passe'}
              value={password} onChange={e => setPassword(e.target.value)} />

            <button type="submit" disabled={loading}
              className="btn-glow w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white text-sm mt-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#5865F2,#7c3aed)' }}>
              {loading
                ? <span className="flex items-center gap-2"><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="20 40"/></svg>Chargement…</span>
                : mode === 'login' ? <><LogIn size={16}/> Se connecter</> : <><UserPlus size={16}/> Créer mon compte</>
              }
            </button>
          </form>

          <p className="text-center text-xs text-[#4f5259] mt-5">
            {mode === 'login' ? "Pas encore de compte ? " : "Déjà un compte ? "}
            <button onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              className="text-[#5865F2] hover:text-[#a78bfa] transition-colors font-semibold">
              {mode === 'login' ? "S'inscrire gratuitement" : 'Se connecter'}
            </button>
          </p>
        </div>

        <p className="text-center text-[10px] text-[#3a3c42] mt-6">
          100% gratuit · Données sécurisées · Aucune carte requise
        </p>
      </div>
    </div>
  )
}
