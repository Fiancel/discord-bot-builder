import React, { useState, useEffect, useRef } from 'react'
import {
  Bot, Zap, Shield, BarChart3, MessageSquare, Clock, Layers,
  Users, Activity, Reply, Star, ShieldAlert, Ticket, ClipboardList,
  ArrowRight, Check, ChevronRight, Play,
  Sparkles, Globe, Lock, TrendingUp,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────── */
/*  Data                                                   */
/* ─────────────────────────────────────────────────────── */

const FEATURES = [
  { icon: MessageSquare, label: 'Slash Commands',     desc: 'Créez des commandes personnalisées avec réponses dynamiques et variables.',       color: '#5865F2', bg: 'rgba(88,101,242,.15)' },
  { icon: Reply,         label: 'Auto-Répondeur',     desc: 'Répondez automatiquement aux messages selon des déclencheurs configurables.',     color: '#a78bfa', bg: 'rgba(167,139,250,.15)' },
  { icon: Star,          label: 'XP & Niveaux',       desc: 'Motivez vos membres avec un système d\'expérience et des annonces de niveau.',   color: '#FEE75C', bg: 'rgba(254,231,92,.15)' },
  { icon: ShieldAlert,   label: 'Anti-Spam',          desc: 'Détectez et sanctionnez automatiquement le spam avec timeout intelligent.',       color: '#ED4245', bg: 'rgba(237,66,69,.15)' },
  { icon: ClipboardList, label: 'Logs Modération',    desc: 'Archivez bans, suppressions, et modifications dans un salon dédié.',             color: '#F57C00', bg: 'rgba(245,124,0,.15)' },
  { icon: Ticket,        label: 'Tickets Support',    desc: 'Gérez les demandes avec /ticket et des salons privés créés automatiquement.',     color: '#00BCD4', bg: 'rgba(0,188,212,.15)' },
  { icon: Layers,        label: 'Constructeur d\'Embeds', desc: 'Créez de magnifiques embeds avec prévisualisation live et envoi direct.', color: '#9C27B0', bg: 'rgba(156,39,176,.15)' },
  { icon: Users,         label: 'Gestionnaire Rôles', desc: 'Auto-rôle à l\'arrivée et rôles par réaction sur vos messages.',                 color: '#4CAF50', bg: 'rgba(76,175,80,.15)' },
  { icon: Clock,         label: 'Messages Planifiés', desc: 'Programmez des messages récurrents ou uniques dans n\'importe quel salon.',       color: '#57F287', bg: 'rgba(87,242,135,.15)' },
  { icon: BarChart3,     label: 'Sondages',           desc: 'Créez des sondages interactifs avec /poll et collectez les votes par réaction.',  color: '#5865F2', bg: 'rgba(88,101,242,.15)' },
  { icon: Activity,      label: 'Statut Personnalisé',desc: 'Définissez l\'activité de votre bot : joue à, regarde, écoute…',               color: '#E91E63', bg: 'rgba(233,30,99,.15)' },
  { icon: Zap,           label: 'Événements',         desc: 'Messages de bienvenue/au revoir, logs vocaux, filtrage de mots.',                color: '#FF9800', bg: 'rgba(255,152,0,.15)' },
]

const STEPS = [
  { n: '01', title: 'Créez votre compte', desc: 'Inscription gratuite en 30 secondes. Vos données sont isolées — aucun partage entre utilisateurs.', icon: Lock },
  { n: '02', title: 'Connectez votre Bot', desc: 'Créez un bot sur le portail Discord, collez votre token et démarrez en un clic.', icon: Bot },
  { n: '03', title: 'Configurez & Gérez', desc: 'Interface intuitive pour créer des commandes, événements, niveaux XP et plus — sans écrire une ligne de code.', icon: Sparkles },
]

const STATS = [
  { value: '12+', label: 'Fonctionnalités' },
  { value: '100%', label: 'Gratuit' },
  { value: '< 1 min', label: 'Pour démarrer' },
  { value: '∞', label: 'Utilisateurs' },
]

/* ─────────────────────────────────────────────────────── */
/*  App Mockup                                             */
/* ─────────────────────────────────────────────────────── */

const LOG_LINES = [
  { type: 'success', text: '✓ Connecté en tant que MonBot#0042' },
  { type: 'success', text: '✓ 8 commandes synchronisées' },
  { type: 'info',    text: '→ /rank utilisé par Alex#1234' },
  { type: 'success', text: '✓ XP accordé : +15 XP (niv. 7)' },
  { type: 'info',    text: '→ Nouveau membre : Clara#5678' },
  { type: 'success', text: '✓ Rôle "Membre" assigné' },
  { type: 'warn',    text: '⚠ Anti-spam : 5 msgs/5s (User#9)' },
  { type: 'success', text: '✓ Timeout 60s appliqué' },
]

const TYPE_COLORS = { success: '#57F287', info: '#5865F2', warn: '#FEE75C', error: '#ED4245' }

function AppMockup() {
  const [visibleLines, setVisibleLines] = useState(0)
  useEffect(() => {
    if (visibleLines >= LOG_LINES.length) return
    const t = setTimeout(() => setVisibleLines(p => p + 1), 500)
    return () => clearTimeout(t)
  }, [visibleLines])

  return (
    <div className="relative">
      {/* Glow */}
      <div className="absolute inset-0 rounded-2xl blur-3xl opacity-20"
        style={{ background: 'linear-gradient(135deg,#5865F2,#a78bfa)' }} />

      <div className="relative rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#111216', border: '1px solid rgba(255,255,255,.1)' }}>
        {/* Titlebar */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#0d0e11', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <div className="w-3 h-3 rounded-full bg-[#ED4245]" />
          <div className="w-3 h-3 rounded-full bg-[#FEE75C]" />
          <div className="w-3 h-3 rounded-full bg-[#57F287]" />
          <span className="ml-3 text-[#4f5259] text-xs font-medium select-none">Discord Bot Builder</span>
        </div>

        <div className="flex" style={{ height: 320 }}>
          {/* Fake sidebar */}
          <div className="w-44 flex-shrink-0 p-2" style={{ background: '#1a1b1f', borderRight: '1px solid rgba(255,255,255,.05)' }}>
            <div className="px-2 pt-2 pb-1">
              <p className="text-[9px] text-[#4f5259] font-semibold uppercase tracking-wider mb-1">GÉNÉRAL</p>
              {['Dashboard','Configuration','Console'].map((item, i) => (
                <div key={i} className={`text-[11px] px-2 py-1.5 rounded-md mb-0.5 ${i === 0 ? 'text-white font-medium' : 'text-[#4f5259]'}`}
                  style={i === 0 ? { background: '#5865F2' } : {}}>
                  {item}
                </div>
              ))}
              <p className="text-[9px] text-[#4f5259] font-semibold uppercase tracking-wider mb-1 mt-3">COMMANDES</p>
              {['Slash Commands','Auto-Répondeur','XP & Niveaux'].map((item, i) => (
                <div key={i} className="text-[11px] text-[#4f5259] px-2 py-1.5 rounded-md mb-0.5">{item}</div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col p-3 min-w-0">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[['Bot','En ligne','#57F287','#0f2116'],['Commandes','8 actives','#5865F2','#0d0f1f'],['Membres','1 247','#FEE75C','#1e1b08']].map(([label,val,color,bg]) => (
                <div key={label} className="rounded-lg p-2.5" style={{ background: bg, border: `1px solid ${color}25` }}>
                  <p className="text-[10px]" style={{ color: color + 'aa' }}>{label}</p>
                  <p className="text-sm font-bold" style={{ color }}>{val}</p>
                </div>
              ))}
            </div>

            {/* Console */}
            <div className="flex-1 rounded-lg p-3 font-mono overflow-hidden" style={{ background: '#0d0e11', border: '1px solid rgba(255,255,255,.05)' }}>
              <div className="flex items-center gap-2 mb-2 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-[#57F287] animate-pulse" />
                <span className="text-[10px] text-[#4f5259]">Console — MonBot#0042</span>
              </div>
              <div className="space-y-1">
                {LOG_LINES.slice(0, visibleLines).map((line, i) => (
                  <div key={i} className="flex items-start gap-2 animate-fade-in">
                    <span className="text-[9px] text-[#3a3c42] flex-shrink-0 mt-0.5">
                      {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className="text-[10px] leading-relaxed" style={{ color: TYPE_COLORS[line.type] || '#dcddde' }}>{line.text}</span>
                  </div>
                ))}
                {visibleLines < LOG_LINES.length && (
                  <div className="flex items-center gap-1 pt-0.5">
                    <span className="text-[10px] text-[#3a3c42]">▶</span>
                    <span className="w-1.5 h-3 bg-[#5865F2] animate-blink" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────── */
/*  Floating feature badges                               */
/* ─────────────────────────────────────────────────────── */
function FloatingBadge({ label, icon: Icon, color, style }) {
  return (
    <div className="absolute glass rounded-xl px-3 py-2 flex items-center gap-2 shadow-xl text-xs font-medium text-white whitespace-nowrap" style={style}>
      <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: color + '30' }}>
        <Icon size={11} style={{ color }} />
      </div>
      {label}
    </div>
  )
}

/* ─────────────────────────────────────────────────────── */
/*  Main component                                        */
/* ─────────────────────────────────────────────────────── */
export default function LandingPage({ onGetStarted }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div className="min-h-screen text-white" style={{ background: '#0c0d11' }}>

      {/* ── NAVBAR ──────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 transition-all duration-300" style={{
        background:          scrolled ? 'rgba(20,21,24,.8)'          : 'transparent',
        backdropFilter:      scrolled ? 'blur(16px)'                  : 'none',
        WebkitBackdropFilter:scrolled ? 'blur(16px)'                  : 'none',
        borderBottom:        scrolled ? '1px solid rgba(255,255,255,.06)' : '1px solid transparent',
        boxShadow:           scrolled ? '0 4px 24px rgba(0,0,0,.35)'  : 'none',
      }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#5865F2] to-[#a78bfa] flex items-center justify-center shadow-lg">
              <Bot size={20} className="text-white" />
            </div>
            <span className="font-bold text-white text-base">Discord Bot Builder</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-[#96989d]">
            {[
              { label: 'Fonctionnalités',    id: 'features'     },
              { label: 'Comment ça marche',  id: 'how-it-works' },
              { label: 'Gratuit',            id: 'pricing'      },
            ].map(({ label, id }) => (
              <span key={id}
                onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
                className="hover:text-white cursor-pointer transition-colors">{label}</span>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={onGetStarted} className="text-sm text-[#96989d] hover:text-white transition-colors">
              Se connecter
            </button>
            <button onClick={onGetStarted}
              className="btn-glow flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#5865F2,#7c3aed)' }}>
              Commencer <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden dot-grid">
        {/* Background blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none animate-float-slow"
          style={{ background: '#5865F2' }} />
        <div className="absolute top-20 right-1/4 w-64 h-64 rounded-full blur-3xl opacity-8 pointer-events-none"
          style={{ background: '#a78bfa', animationDelay: '2s' }} />

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
              style={{ background: 'rgba(88,101,242,.15)', border: '1px solid rgba(88,101,242,.3)', color: '#a78bfa' }}>
              <Sparkles size={12} />
              12 fonctionnalités — 100% gratuit — No-code
            </div>

            <h1 className="text-5xl lg:text-6xl font-black leading-[1.1] mb-6 tracking-tight">
              Créez votre Bot<br />
              <span className="gradient-text">Discord</span><br />
              sans coder
            </h1>

            <p className="text-lg text-[#72767d] leading-relaxed mb-8 max-w-lg">
              La plateforme tout-en-un pour configurer, gérer et automatiser vos bots Discord.
              Commandes, XP, anti-spam, tickets — tout ça en quelques clics.
            </p>

            <div className="flex flex-wrap gap-3 mb-10">
              <button onClick={onGetStarted}
                className="btn-glow flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#5865F2,#7c3aed)' }}>
                <Play size={16} /> Commencer gratuitement
              </button>
              <button
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-[#dcddde] transition-all hover:bg-white/5"
                style={{ border: '1px solid rgba(255,255,255,.1)' }}
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                Voir les fonctionnalités <ChevronRight size={16} />
              </button>
            </div>

            <div className="flex items-center gap-6">
              {[['✓ Gratuit à vie', '#57F287'], ['✓ Aucun code requis', '#5865F2'], ['✓ Données sécurisées', '#a78bfa']].map(([text, color]) => (
                <span key={text} className="text-xs font-medium" style={{ color }}>{text}</span>
              ))}
            </div>
          </div>

          {/* Right — Mockup */}
          <div className="relative animate-float" style={{ animationDelay: '.3s' }}>
            <AppMockup />

            {/* Floating badges */}
            <FloatingBadge label="XP +15 accordé" icon={Star} color="#FEE75C" style={{ top: -16, right: 24, animationDelay: '1s' }} />
            <FloatingBadge label="Anti-spam actif" icon={ShieldAlert} color="#ED4245" style={{ bottom: 40, left: -20, animationDelay: '1.5s' }} />
            <FloatingBadge label="8 commandes sync" icon={Zap} color="#57F287" style={{ bottom: -14, right: 40, animationDelay: '2s' }} />
          </div>
        </div>
      </section>

      {/* ── STATS BAR ───────────────────────────────────────── */}
      <section id="pricing" className="py-10 px-6" style={{ borderTop: '1px solid rgba(255,255,255,.05)', borderBottom: '1px solid rgba(255,255,255,.05)', background: 'rgba(255,255,255,.02)' }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-3xl font-black gradient-text mb-1">{value}</div>
              <div className="text-sm text-[#72767d]">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-4"
              style={{ background: 'rgba(88,101,242,.1)', border: '1px solid rgba(88,101,242,.2)', color: '#a78bfa' }}>
              <Zap size={12} /> Tout ce dont vous avez besoin
            </div>
            <h2 className="text-4xl font-black mb-4">
              12 fonctionnalités <span className="gradient-text">majeures</span>
            </h2>
            <p className="text-[#72767d] text-lg max-w-xl mx-auto">
              Du système de niveaux aux tickets support en passant par l'anti-spam — tout est intégré et prêt en quelques secondes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {FEATURES.map(({ icon: Icon, label, desc, color, bg }, i) => (
              <div key={i} className="card-hover group rounded-2xl p-5 cursor-default"
                style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ background: bg }}>
                  <Icon size={19} style={{ color }} />
                </div>
                <h3 className="text-white font-semibold text-sm mb-2">{label}</h3>
                <p className="text-[#72767d] text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 relative overflow-hidden" style={{ background: 'rgba(255,255,255,.015)' }}>
        <div className="absolute inset-0 dot-grid opacity-50 pointer-events-none" />
        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-4"
              style={{ background: 'rgba(87,242,135,.1)', border: '1px solid rgba(87,242,135,.2)', color: '#57F287' }}>
              <Check size={12} /> Simple & rapide
            </div>
            <h2 className="text-4xl font-black mb-4">Prêt en <span className="gradient-text">3 étapes</span></h2>
            <p className="text-[#72767d] text-lg">Configurez votre bot Discord en moins d'une minute.</p>
          </div>

          <div className="relative grid md:grid-cols-3 gap-8">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-10 left-1/4 right-1/4 h-px"
              style={{ background: 'linear-gradient(90deg,transparent,rgba(88,101,242,.4),transparent)' }} />

            {STEPS.map(({ n, title, desc, icon: Icon }, i) => (
              <div key={i} className="relative text-center">
                <div className="relative inline-flex w-20 h-20 rounded-2xl items-center justify-center mb-6 gradient-border"
                  style={{ background: 'rgba(88,101,242,.1)' }}>
                  <Icon size={28} className="text-[#5865F2]" />
                  <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full text-xs font-black text-white flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,#5865F2,#7c3aed)' }}>
                    {i + 1}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                <p className="text-[#72767d] text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DETAILS SECTION ─────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          {/* Visual */}
          <div className="relative">
            <div className="rounded-2xl p-6 space-y-3" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)' }}>
              <div className="text-xs text-[#72767d] mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#57F287] animate-pulse" />
                Bot en ligne — Console temps réel
              </div>
              {[
                { time: '14:23:01', type: 'success', msg: 'Bot connecté : MonBot#0042' },
                { time: '14:23:15', type: 'info',    msg: '/rank utilisé par Alex#1234' },
                { time: '14:23:15', type: 'success', msg: 'XP accordé : +15 (total: 1845)' },
                { time: '14:23:22', type: 'info',    msg: 'Nouveau membre : Marie#5679' },
                { time: '14:23:22', type: 'success', msg: 'Rôle "Membre" assigné automatiquement' },
                { time: '14:23:45', type: 'info',    msg: '/poll créé par Admin#0001' },
                { time: '14:23:58', type: 'warn',    msg: 'Anti-spam déclenché pour User#3344' },
                { time: '14:23:59', type: 'success', msg: 'Timeout 60s appliqué' },
              ].map((l, i) => (
                <div key={i} className="log-entry flex items-start gap-3 text-xs px-2 py-0.5 font-mono">
                  <span className="text-[#3a3c42] flex-shrink-0">{l.time}</span>
                  <span className="font-semibold flex-shrink-0" style={{ color: TYPE_COLORS[l.type] }}>
                    {l.type === 'success' ? '✓' : l.type === 'warn' ? '⚠' : '→'}
                  </span>
                  <span style={{ color: TYPE_COLORS[l.type] }}>{l.msg}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Text */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
              style={{ background: 'rgba(88,101,242,.1)', border: '1px solid rgba(88,101,242,.2)', color: '#a78bfa' }}>
              <Globe size={12} /> Console temps réel
            </div>
            <h2 className="text-4xl font-black mb-6">Tout gérer depuis <span className="gradient-text">une interface</span></h2>
            <div className="space-y-5">
              {[
                { icon: Activity, title: 'Logs en direct', desc: 'Visualisez chaque action de votre bot en temps réel via WebSocket — aucun refresh nécessaire.', color: '#5865F2' },
                { icon: Shield,   title: 'Multi-utilisateurs', desc: 'Chaque compte est complètement isolé. Vos tokens et données ne sont jamais partagés.', color: '#57F287' },
                { icon: TrendingUp, title: 'Statistiques précises', desc: 'Suivez commandes utilisées, membres actifs, latence — tout sur le dashboard.', color: '#FEE75C' },
              ].map(({ icon: Icon, title, desc, color }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: color + '15' }}>
                    <Icon size={18} style={{ color }} />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">{title}</h3>
                    <p className="text-[#72767d] text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl p-16 text-center overflow-hidden"
            style={{ background: 'linear-gradient(135deg,rgba(88,101,242,.2),rgba(167,139,250,.1))', border: '1px solid rgba(88,101,242,.3)' }}>
            {/* Glow */}
            <div className="absolute inset-0 blur-3xl opacity-20 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 50% 50%,#5865F2,transparent 70%)' }} />
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#5865F2,#7c3aed)' }}>
                <Bot size={32} className="text-white" />
              </div>
              <h2 className="text-4xl font-black mb-4">
                Prêt à créer votre bot ?
              </h2>
              <p className="text-[#96989d] text-lg mb-8 max-w-md mx-auto">
                Rejoignez des dizaines d'utilisateurs qui gèrent leurs bots Discord sans écrire une ligne de code.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button onClick={onGetStarted}
                  className="btn-glow flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white text-base"
                  style={{ background: 'linear-gradient(135deg,#5865F2,#7c3aed)' }}>
                  <Sparkles size={18} /> Créer mon compte — Gratuit
                </button>
              </div>
              <p className="text-[#4f5259] text-xs mt-6">Aucune carte bancaire requise · Gratuit à vie · Données sécurisées</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="py-10 px-6" style={{ borderTop: '1px solid rgba(255,255,255,.05)' }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5865F2] to-[#a78bfa] flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <span className="text-[#72767d] text-sm">Discord Bot Builder</span>
          </div>
          <p className="text-[#4f5259] text-xs">
            Fait avec ♥ pour la communauté Discord · 100% gratuit
          </p>
          <p className="text-[#3a3c42] text-xs">© {new Date().getFullYear()} Discord Bot Builder · Tous droits réservés</p>
        </div>
      </footer>
    </div>
  )
}
