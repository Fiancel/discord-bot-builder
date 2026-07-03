import React, { useState } from 'react'
import { Bot, Mail, Lock, User, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function Field({ icon: Icon, type, placeholder, value, onChange, action }) {
  const [show, setShow] = useState(false)
  const isPass = type === 'password'
  return (
    <div className="relative">
      <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#72767d]" />
      <input
        type={isPass && show ? 'text' : type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        className="w-full bg-[#202225] text-[#dcddde] rounded-lg pl-9 pr-10 py-3 border border-white/10 focus:border-[#5865F2] focus:outline-none text-sm placeholder-[#72767d]"
      />
      {isPass && (
        <button type="button" onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#72767d] hover:text-[#dcddde]">
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      )}
    </div>
  )
}

export default function AuthPage() {
  const { login, register } = useAuth()
  const [mode,     setMode]     = useState('login')   // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password, username)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (m) => {
    setMode(m); setError(''); setUsername(''); setEmail(''); setPassword('')
  }

  return (
    <div className="min-h-screen bg-[#36393f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#5865F2] flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Bot size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Discord Bot Builder</h1>
          <p className="text-[#72767d] text-sm mt-1">Créez et gérez vos bots Discord</p>
        </div>

        {/* Card */}
        <div className="bg-[#2f3136] rounded-2xl p-8 border border-white/5 shadow-2xl">
          {/* Tabs */}
          <div className="flex rounded-lg bg-[#202225] p-1 mb-6">
            {[['login', 'Connexion'], ['register', 'Inscription']].map(([m, label]) => (
              <button key={m} type="button" onClick={() => switchMode(m)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                  mode === m ? 'bg-[#5865F2] text-white shadow-sm' : 'text-[#72767d] hover:text-[#dcddde]'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-[#ED4245]/15 border border-[#ED4245]/40 rounded-lg px-4 py-3 mb-4 text-sm text-[#ED4245]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <Field icon={User} type="text" placeholder="Nom d'utilisateur"
                value={username} onChange={(e) => setUsername(e.target.value)} />
            )}
            <Field icon={Mail} type="email" placeholder="Adresse email"
              value={email} onChange={(e) => setEmail(e.target.value)} />
            <Field icon={Lock} type="password"
              placeholder={mode === 'register' ? 'Mot de passe (6 caractères min)' : 'Mot de passe'}
              value={password} onChange={(e) => setPassword(e.target.value)} />

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-60 text-white rounded-lg font-semibold transition-colors text-sm mt-2">
              {loading
                ? 'Chargement…'
                : mode === 'login'
                  ? <><LogIn size={16} /> Se connecter</>
                  : <><UserPlus size={16} /> Créer mon compte</>
              }
            </button>
          </form>

          <p className="text-center text-xs text-[#72767d] mt-5">
            {mode === 'login' ? "Pas encore de compte ? " : "Déjà un compte ? "}
            <button onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              className="text-[#5865F2] hover:underline font-medium">
              {mode === 'login' ? "S'inscrire" : 'Se connecter'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
