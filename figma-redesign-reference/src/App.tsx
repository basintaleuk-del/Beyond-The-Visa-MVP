import { useState } from 'react'

// ─── Photo assets (Unsplash CDN) ──────────────────────────────────────────────
const NURSE_HERO  = 'https://images.unsplash.com/photo-1678695972687-033fa0bdbac9?w=900&h=600&fit=crop&auto=format&q=80'
const MENTOR_BG   = 'https://images.unsplash.com/photo-1741707039536-113e200f9e0d?w=700&h=800&fit=crop&auto=format&q=80'
const SUCCESS_BG  = 'https://images.unsplash.com/photo-1677195063105-276fd4b95b21?w=700&h=800&fit=crop&auto=format&q=80'

// ─── Icon factory ─────────────────────────────────────────────────────────────
type IP = { className?: string }
const mk = (...ds: string[]) =>
  ({ className = 'w-5 h-5' }: IP) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {ds.map((d, i) => <path key={i} d={d} />)}
    </svg>
  )
const mkF = (...ds: string[]) =>
  ({ className = 'w-5 h-5' }: IP) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      {ds.map((d, i) => <path key={i} d={d} />)}
    </svg>
  )

const Ic = {
  Home:       mkF('M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z'),
  Journey:    mk('M8 6h13','M8 12h13','M8 18h13','M3 6h.01M3 12h.01M3 18h.01'),
  Sparkle:    mkF('M12 1.5l2.6 7.9H23l-6.7 4.9 2.6 7.9L12 17.3l-6.9 4.9 2.6-7.9L1 9.4h8.4z'),
  Learn:      mk('M4 19.5A2.5 2.5 0 0 1 6.5 17H20','M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'),
  Costs:      mk('M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z','M12 6v2m0 8v2m-3.5-8H14a2.5 2.5 0 0 1 0 5h-4a2.5 2.5 0 0 0 0 5H15'),
  Grid:       mk('M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z'),
  Checklist:  mk('M9 11l3 3L22 4','M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'),
  Folder:     mk('M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'),
  Mic:        mk('M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z','M19 10v2a7 7 0 0 1-14 0v-2','M12 19v4','M8 23h8'),
  Search:     mk('M11 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12z','M21 21l-4.35-4.35'),
  People:     mk('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2','M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z','M23 21v-2a4 4 0 0 0-3-3.87','M16 3.13a4 4 0 0 1 0 7.75'),
  Globe:      mk('M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z','M2 12h20','M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'),
  Star:       mkF('M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'),
  StarO:      mk('M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'),
  Bell:       mk('M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9','M13.73 21a2 2 0 0 1-3.46 0'),
  Moon:       mkF('M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'),
  Menu:       mk('M3 12h18','M3 6h18','M3 18h18'),
  Arrow:      mk('M5 12h14','M12 5l7 7-7 7'),
  Chevron:    mk('M9 18l6-6-6-6'),
  X:          mk('M18 6L6 18','M6 6l12 12'),
  Passport:   mk('M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z','M12 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'),
  Settings:   mk('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z','M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'),
  Logout:     mk('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4','M16 17l5-5-5-5','M21 12H9'),
  Plus:       mk('M12 5v14','M5 12h14'),
  Coin:       mkF('M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z'),
  HomeAlt:    mk('M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z'),
}

// ─── Circular progress ────────────────────────────────────────────────────────
function CircleProgress({ pct, size, stroke, track, fill, label, labelColor = 'white', fontSize = 13 }:
  { pct: number; size: number; stroke: number; track: string; fill: string; label?: string; labelColor?: string; fontSize?: number }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c * (1 - pct / 100)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={fill} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s ease' }}/>
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fill={labelColor} fontSize={fontSize} fontWeight="700" fontFamily="'Plus Jakarta Sans', sans-serif">
        {pct}%
      </text>
      {label && (
        <text x="50%" y={size/2 + fontSize + 2} dominantBaseline="middle" textAnchor="middle"
          fill={labelColor} fontSize={8} fontFamily="'Plus Jakarta Sans', sans-serif" opacity="0.6">
          {label}
        </text>
      )}
    </svg>
  )
}

// ─── Nav config ───────────────────────────────────────────────────────────────
const mobileNav = [
  { id: 'home',     label: 'Home',      Icon: Ic.HomeAlt },
  { id: 'journey',  label: 'Journey',   Icon: Ic.Journey },
  { id: 'askzibur', label: 'Ask Zibur', Icon: Ic.Sparkle },
  { id: 'learn',    label: 'Learn',     Icon: Ic.Learn },
  { id: 'costs',    label: 'Costs',     Icon: Ic.Costs },
]

const sidebarNav = [
  { id: 'home',     label: 'Home',               Icon: Ic.Home },
  { id: 'journey',  label: 'Journey',             Icon: Ic.Journey },
  { id: 'askzibur', label: 'Ask Zibur',           Icon: Ic.Sparkle },
  { id: 'learn',    label: 'Learning',             Icon: Ic.Learn },
  { id: 'costs',    label: 'Cost Planner',         Icon: Ic.Costs },
  { id: 'jobs',     label: 'Job Search',           Icon: Ic.Search },
  { id: 'community',label: 'Community',            Icon: Ic.People },
  { id: 'mentor',   label: 'Mentor Marketplace',   Icon: Ic.People },
]

const quickActions = [
  { id: 'cbt',       label: 'CBT learning',      sub: 'Questions, explanations and mock tests', Icon: Ic.Grid },
  { id: 'checklist', label: 'Journey checklist', sub: 'Complete your registration and visa steps', Icon: Ic.Checklist },
  { id: 'cost',      label: 'Cost planner',      sub: 'Plan fees and relocation expenses', Icon: Ic.Costs },
  { id: 'zibur',     label: 'Ask Zibur',         sub: 'Get guidance based on your saved journey', Icon: Ic.Sparkle },
  { id: 'docs',      label: 'My documents',      sub: 'Certificates, passport, visa and CV files', Icon: Ic.Folder },
]

const featureTiles = [
  { id: 'learning',   label: 'Learning',           sub: 'Build confidence',                        Icon: Ic.Learn,    color: '#2a7a5c', bg: '#d4ede4' },
  { id: 'zibur',      label: 'Ask Zibur',          sub: 'Relocation guide',                        Icon: Ic.Sparkle,  color: '#5b4fcf', bg: '#eeecfb' },
  { id: 'interview',  label: 'Interview coaching', sub: 'Trial and live preparation',              Icon: Ic.Mic,      color: '#b85c2a', bg: '#fde8da' },
  { id: 'jobs',       label: 'Job search',         sub: 'Track jobs and saved searches',           Icon: Ic.Search,   color: '#1e6b8a', bg: '#daf0f8' },
  { id: 'community',  label: 'Community',          sub: 'Connect and learn together',              Icon: Ic.People,   color: '#7a5c2a', bg: '#f5ecd4' },
  { id: 'life',       label: 'Life guide',         sub: 'Immigration, money and settling in',     Icon: Ic.Globe,    color: '#2a5c3a', bg: '#d8eedd' },
]

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]       = useState('home')
  const [darkMode, setDarkMode] = useState(false)
  const [askOpen, setAskOpen]  = useState(false)
  const [askMsg, setAskMsg]    = useState('')

  const dm = darkMode

  return (
    <div className={`min-h-screen font-sans flex ${dm ? 'bg-[#0a1510] text-white' : 'bg-[#f3f5f0] text-[#162b22]'}`}
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>

      {/* ── Desktop sidebar ──────────────────────────────────────────────── */}
      <aside className={`hidden lg:flex flex-col w-64 shrink-0 min-h-screen fixed inset-y-0 left-0 z-30 shadow-2xl
        ${dm ? 'bg-[#061009]' : 'bg-[#0e2318]'}`}>
        {/* Brand */}
        <div className="px-5 pt-6 pb-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#c9a840,#e8c94a)' }}>
              <span className="font-extrabold text-[11px] text-[#0e2318] tracking-tight">BTV</span>
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-tight">Beyond The Visa</div>
              <div className="text-white/40 text-[9px] uppercase tracking-widest mt-0.5">Nursing Platform</div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 pt-5 space-y-0.5 overflow-y-auto">
          <p className="text-white/25 text-[9px] uppercase tracking-widest px-3 mb-2">Dashboard</p>
          {sidebarNav.slice(0,5).map(({ id, label, Icon }) => {
            const active = page === id
            return (
              <button key={id} onClick={() => setPage(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group
                  ${active ? 'bg-[#2a7a5c] text-white shadow-lg shadow-[#2a7a5c]/30'
                           : 'text-white/55 hover:text-white hover:bg-white/8'}`}>
                <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                <span className="text-[13px] font-medium truncate">{label}</span>
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#c9a840]" />}
              </button>
            )
          })}
          <p className="text-white/25 text-[9px] uppercase tracking-widest px-3 mt-5 mb-2">Explore</p>
          {sidebarNav.slice(5).map(({ id, label, Icon }) => {
            const active = page === id
            return (
              <button key={id} onClick={() => setPage(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150
                  ${active ? 'bg-[#2a7a5c] text-white' : 'text-white/55 hover:text-white hover:bg-white/8'}`}>
                <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                <span className="text-[13px] font-medium truncate">{label}</span>
              </button>
            )
          })}
          <button onClick={() => setPage('settings')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-white/55 hover:text-white hover:bg-white/8 transition-all mt-1">
            <Ic.Settings className="w-4.5 h-4.5 flex-shrink-0" />
            <span className="text-[13px] font-medium">Settings</span>
          </button>
        </nav>

        {/* Beyond Coins + dark mode */}
        <div className="px-3 py-3 border-t border-white/10">
          <div className="flex items-center gap-2 px-2 py-2 bg-[#c9a840]/10 rounded-xl border border-[#c9a840]/20 mb-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#c9a840,#e8c94a)' }}>
              <Ic.Coin className="w-3.5 h-3.5 text-[#0e2318]" />
            </div>
            <div>
              <p className="text-[#c9a840] text-xs font-bold leading-tight">150 BC</p>
              <p className="text-white/30 text-[9px]">Beyond Coins</p>
            </div>
          </div>
          {/* User */}
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/8 transition-colors cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-[#2a7a5c] flex items-center justify-center text-white font-bold text-sm border-2 border-white/20">M</div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[13px] font-semibold truncate">MR</p>
              <p className="text-white/40 text-[10px]">Nurse · United States</p>
            </div>
            <button onClick={() => setDarkMode(!dm)} className="text-white/40 hover:text-white transition-colors p-1">
              <Ic.Moon className="w-4 h-4" />
            </button>
          </div>
          <button className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/8 transition-colors text-[12px]">
            <Ic.Logout className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">

        {/* Mobile top nav */}
        <header className={`lg:hidden flex h-14 items-center justify-between px-4 sticky top-0 z-20 border-b
          ${dm ? 'bg-[#0a1510] border-white/10' : 'bg-white border-[#e0eae3]'}`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#c9a840,#e8c94a)' }}>
              <span className="font-extrabold text-[9px] text-[#0e2318]">BTV</span>
            </div>
            <span className={`text-[13px] font-bold ${dm ? 'text-white' : 'text-[#0e2318]'}`}>Beyond The Visa</span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* 150 BC coin */}
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border" style={{ borderColor:'#c9a840', background:'rgba(201,168,64,0.1)' }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background:'linear-gradient(135deg,#c9a840,#e8c94a)' }}>
                <Ic.Coin className="w-3 h-3 text-[#0e2318]" />
              </div>
              <span className="text-[11px] font-bold" style={{ color:'#c9a840' }}>150 BC</span>
            </button>
            {/* User avatar */}
            <button className="w-8 h-8 rounded-full bg-[#2a7a5c] flex items-center justify-center text-white font-bold text-sm border-2 border-[#2a7a5c]/30 relative">
              M
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 rounded-full border border-white" />
            </button>
            {/* Menu */}
            <button className={`relative p-2 rounded-lg transition-colors ${dm ? 'text-white/70 hover:bg-white/10' : 'text-[#162b22] hover:bg-[#f0f4f1]'}`}>
              <Ic.Menu className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#c9a840] rounded-full" />
            </button>
            {/* Dark mode */}
            <button onClick={() => setDarkMode(!dm)} className={`p-2 rounded-lg transition-colors ${dm ? 'text-[#c9a840] bg-white/10' : 'text-[#162b22] hover:bg-[#f0f4f1]'}`}>
              <Ic.Moon className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Desktop top bar */}
        <header className={`hidden lg:flex h-16 items-center justify-between px-8 sticky top-0 z-20 border-b shadow-sm
          ${dm ? 'bg-[#061009] border-white/10' : 'bg-white border-[#e0eae3]'}`}>
          <div>
            <p className={`text-[10px] uppercase tracking-widest ${dm ? 'text-white/40' : 'text-[#8aa89c]'}`}>Wednesday, 22 July 2025</p>
            <h1 className={`text-base font-bold leading-tight ${dm ? 'text-white' : 'text-[#0e2318]'}`}>Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input placeholder="Search resources…"
                className={`pl-9 pr-4 py-2 rounded-xl text-sm w-56 border focus:outline-none focus:border-[#2a7a5c] focus:ring-2 focus:ring-[#2a7a5c]/20 transition-all
                  ${dm ? 'bg-white/8 border-white/15 text-white placeholder:text-white/30' : 'bg-[#f3f5f0] border-[#e0eae3] text-[#162b22] placeholder:text-[#8aa89c]'}`}/>
              <Ic.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8aa89c]" />
            </div>
            <button className={`relative p-2.5 rounded-xl transition-colors ${dm ? 'text-white/60 hover:bg-white/10' : 'text-[#4a6358] hover:bg-[#f0f4f1]'}`}>
              <Ic.Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#c9a840] rounded-full border-2 border-white" />
            </button>
            <button onClick={() => setDarkMode(!dm)} className={`p-2.5 rounded-xl transition-colors ${dm ? 'text-[#c9a840] bg-white/10' : 'text-[#4a6358] hover:bg-[#f0f4f1]'}`}>
              <Ic.Moon className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-full bg-[#2a7a5c] flex items-center justify-center text-white font-bold text-sm border-2 border-[#2a7a5c]/30">M</div>
          </div>
        </header>

        {/* ── Scrollable content ──────────────────────────────────────────── */}
        <main className="flex-1 pb-28 lg:pb-12 overflow-y-auto">
          <div className="max-w-[1440px] mx-auto px-4 pt-5 lg:px-8 lg:pt-7 space-y-4 lg:space-y-6">

            {/* ── Hero card ────────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-2xl lg:rounded-3xl min-h-[260px] lg:min-h-[300px]"
              style={{ background: 'linear-gradient(120deg,#061912 0%,#0e2318 45%,#163020 100%)', border:'1px solid rgba(201,168,64,0.35)' }}>

              {/* Nurse photo — right side, fading in */}
              <div className="absolute inset-y-0 right-0 w-[55%] lg:w-[45%] pointer-events-none">
                <img src={NURSE_HERO} alt="Healthcare professional" className="w-full h-full object-cover object-top" />
                <div className="absolute inset-0" style={{ background:'linear-gradient(to right,#0e2318 0%,rgba(14,35,24,0.75) 35%,rgba(14,35,24,0.2) 100%)' }} />
              </div>

              {/* Gold flowing line SVG overlay */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 800 300">
                <path d="M600,20 C650,80 500,140 550,200 S650,260 700,300" stroke="#c9a840" strokeWidth="1.5" fill="none" opacity="0.35"/>
                <path d="M500,0 C560,60 420,100 480,180 S580,240 620,300" stroke="#c9a840" strokeWidth="0.8" fill="none" opacity="0.2"/>
                <path d="M650,60 C620,100 680,140 640,190 S580,230 620,280" stroke="#c9a840" strokeWidth="1" fill="none" opacity="0.25"/>
                <ellipse cx="620" cy="150" rx="90" ry="90" stroke="#c9a840" strokeWidth="0.6" fill="none" opacity="0.12"/>
                <ellipse cx="620" cy="150" rx="130" ry="130" stroke="#c9a840" strokeWidth="0.4" fill="none" opacity="0.08"/>
                {/* World map dots — subtle */}
                {[...Array(30)].map((_, i) => (
                  <circle key={i} cx={350 + (i % 10) * 40} cy={40 + Math.floor(i / 10) * 80}
                    r="1.2" fill="#c9a840" opacity="0.06"/>
                ))}
              </svg>

              {/* Content */}
              <div className="relative z-10 p-6 lg:p-10">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color:'#c9a840' }}>
                    Wednesday 22 July
                  </p>
                  <span className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-semibold uppercase tracking-widest"
                    style={{ borderColor:'rgba(201,168,64,0.4)', background:'rgba(201,168,64,0.12)', color:'#c9a840' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c9a840]" />
                    Premium Plan
                  </span>
                </div>

                <h2 className="text-white text-3xl lg:text-5xl font-extrabold leading-tight mt-1 mb-1">
                  Welcome back, MR
                </h2>
                <p className="text-white/60 text-sm lg:text-base mb-5 lg:mb-8 flex items-center gap-2">
                  Nurse pathway · United States
                  <span className="text-base">🇺🇸</span>
                </p>

                {/* Career readiness row */}
                <div className="flex items-center gap-4 lg:gap-6">
                  {/* Progress circle */}
                  <div className="flex-shrink-0">
                    <CircleProgress pct={8} size={88} stroke={8} track="rgba(255,255,255,0.12)" fill="#c9a840" labelColor="white" fontSize={14} />
                  </div>
                  {/* Text */}
                  <div className="bg-white/8 backdrop-blur-sm rounded-xl px-4 py-3.5 border border-white/12 max-w-xs">
                    <p className="text-white font-bold text-sm lg:text-base">Your career readiness</p>
                    <p className="text-white/55 text-xs lg:text-sm mt-0.5 leading-relaxed">
                      Your personalised plan is ready. Start with one manageable step today.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 4 stats ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              {[
                { label:'Journey',      value:'0%',  sub:'0 of 7 steps' },
                { label:'CBT accuracy', value:'—',   sub:'0 questions answered' },
                { label:'Saved jobs',   value:'0',   sub:'Career opportunities' },
                { label:'Study streak', value:'0',   sub:'days active' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl lg:rounded-2xl p-4 lg:p-5 border shadow-sm hover:shadow-md transition-shadow cursor-pointer
                  ${dm ? 'bg-[#0d1f14] border-white/10 hover:border-white/20' : 'bg-white border-[#e0eae3]'}`}>
                  <p className={`text-xs mb-3 ${dm ? 'text-white/50' : 'text-[#8aa89c]'}`}>{s.label}</p>
                  <p className={`text-2xl lg:text-3xl font-extrabold mb-0.5 font-mono ${dm ? 'text-white' : 'text-[#0e2318]'}`}
                    style={{ fontFamily:"'DM Mono', monospace" }}>{s.value}</p>
                  <p className={`text-xs mb-3 ${dm ? 'text-white/40' : 'text-[#8aa89c]'}`}>{s.sub}</p>
                  <button className="flex items-center gap-1 text-[12px] font-semibold text-[#2a7a5c] hover:gap-1.5 transition-all">
                    Open guidance <Ic.Arrow className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* ── Recommended next step + Learning focus ────────────────── */}
            <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
              {/* Recommended next step */}
              <div className={`rounded-xl lg:rounded-2xl border shadow-sm overflow-hidden
                ${dm ? 'bg-[#0d1f14] border-white/10' : 'bg-white border-[#e0eae3]'}`}>
                <div className={`flex items-center justify-between px-5 py-4 border-b ${dm ? 'border-white/10' : 'border-[#e8ede9]'}`}>
                  <h3 className={`font-bold text-sm ${dm ? 'text-white' : 'text-[#0e2318]'}`}>Recommended next step</h3>
                  <button className="text-[#2a7a5c] text-sm font-bold hover:underline flex items-center gap-1">
                    View plan <Ic.Arrow className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="p-5">
                  <div className={`flex items-start gap-4 p-4 rounded-xl border mb-4
                    ${dm ? 'bg-[#c9a840]/8 border-[#c9a840]/20' : 'bg-[#faf3dc] border-[#e8c94a]/40'}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background:'linear-gradient(135deg,#c9a840,#e8c94a)' }}>
                      <Ic.Arrow className="w-5 h-5 text-[#0e2318]" />
                    </div>
                    <div>
                      <p className={`font-bold text-sm mb-0.5 ${dm ? 'text-white' : 'text-[#0e2318]'}`}>Passport</p>
                      <p className={`text-xs leading-relaxed ${dm ? 'text-white/50' : 'text-[#4a6358]'}`}>
                        Just researching · Your dashboard updates as you complete tasks and learning activities.
                      </p>
                    </div>
                  </div>
                  <button className="w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 shadow-lg"
                    style={{ background:'linear-gradient(135deg,#0e2318,#163020)', boxShadow:'0 4px 20px rgba(14,35,24,0.3)' }}>
                    Continue now <Ic.Arrow className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Learning focus */}
              <div className={`rounded-xl lg:rounded-2xl border shadow-sm overflow-hidden
                ${dm ? 'bg-[#0d1f14] border-white/10' : 'bg-white border-[#e0eae3]'}`}>
                <div className={`flex items-center justify-between px-5 py-4 border-b ${dm ? 'border-white/10' : 'border-[#e8ede9]'}`}>
                  <h3 className={`font-bold text-sm ${dm ? 'text-white' : 'text-[#0e2318]'}`}>Learning focus</h3>
                  <button className="text-[#2a7a5c] text-xs font-semibold hover:underline">See all</button>
                </div>
                <div className={`divide-y ${dm ? 'divide-white/8' : 'divide-[#e8ede9]'}`}>
                  {['Start CBT practice', 'Patient safety', 'Professional practice'].map(item => (
                    <button key={item} className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors group
                      ${dm ? 'hover:bg-white/5' : 'hover:bg-[#f3f5f0]'}`}>
                      <span className={`text-sm font-medium group-hover:text-[#2a7a5c] transition-colors
                        ${dm ? 'text-white/80' : 'text-[#162b22]'}`}>{item}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                          style={{ background:'rgba(42,122,92,0.12)', color:'#2a7a5c' }}>New</span>
                        <Ic.Chevron className={`w-4 h-4 ${dm ? 'text-white/30' : 'text-[#8aa89c]'} group-hover:text-[#2a7a5c] transition-colors`} />
                      </div>
                    </button>
                  ))}
                </div>
                <div className={`px-5 py-4 border-t ${dm ? 'bg-white/3 border-white/8' : 'bg-[#f3f5f0] border-[#e8ede9]'}`}>
                  <button className="flex items-center gap-2 text-[#2a7a5c] text-sm font-semibold hover:text-[#3a9a72] transition-colors">
                    <Ic.Plus className="w-4 h-4" /> Start a new topic
                  </button>
                </div>
              </div>
            </div>

            {/* ── Quick actions ─────────────────────────────────────────── */}
            <div className={`rounded-xl lg:rounded-2xl border shadow-sm overflow-hidden
              ${dm ? 'bg-[#0d1f14] border-white/10' : 'bg-white border-[#e0eae3]'}`}>
              <div className={`px-5 py-4 border-b ${dm ? 'border-white/10' : 'border-[#e8ede9]'}`}>
                <h3 className={`font-bold text-sm ${dm ? 'text-white' : 'text-[#0e2318]'}`}>Quick actions</h3>
              </div>
              <div className="p-4 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {quickActions.map(({ id, label, sub, Icon }) => (
                  <button key={id} className={`flex flex-col items-start gap-3 p-4 rounded-xl border text-left transition-all hover:shadow-md hover:-translate-y-0.5 group
                    ${dm ? 'bg-[#0a1510] border-white/8 hover:border-white/20' : 'bg-[#f3f5f0] border-[#e0eae3] hover:border-[#2a7a5c]/30 hover:bg-white'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors
                      ${dm ? 'bg-white/10 text-white/70 group-hover:bg-[#2a7a5c]/30 group-hover:text-[#2a7a5c]'
                            : 'bg-white text-[#2a7a5c] border border-[#e0eae3] group-hover:bg-[#d4ede4] group-hover:border-[#2a7a5c]/30'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className={`text-sm font-bold leading-tight ${dm ? 'text-white' : 'text-[#0e2318]'}`}>{label}</p>
                      <p className={`text-xs mt-1 leading-snug ${dm ? 'text-white/40' : 'text-[#8aa89c]'}`}>{sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Journey section ────────────────────────────────────────── */}
            <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
              <div className="space-y-3 lg:space-y-4">
                {/* Inspirational banner */}
                <div className="rounded-xl lg:rounded-2xl p-4 flex items-center gap-4"
                  style={{ background:'linear-gradient(135deg,#d4ede4 0%,#edf6f1 100%)', border:'1px solid rgba(42,122,92,0.2)' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background:'linear-gradient(135deg,#0e2318,#2a7a5c)' }}>
                    <Ic.Sparkle className="w-6 h-6 text-[#c9a840]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#2a7a5c] mb-0.5">Your future is moving</p>
                    <p className="text-[#0e2318] font-bold text-sm leading-snug">
                      Every completed step brings your international career closer.
                    </p>
                  </div>
                </div>

                {/* Journey card */}
                <div className="rounded-xl lg:rounded-2xl p-5" style={{ background:'linear-gradient(135deg,#0e2318,#163020)', border:'1px solid rgba(201,168,64,0.2)' }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-white/50 text-xs mb-1">Your journey to</p>
                      <p className="text-white font-bold text-lg flex items-center gap-2">
                        United States <span className="text-lg">🇺🇸</span>
                      </p>
                    </div>
                    <p className="text-white font-extrabold text-2xl" style={{ fontFamily:"'DM Mono', monospace" }}>0%</p>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 mb-3">
                    <div className="h-1.5 rounded-full bg-[#c9a840]" style={{ width:'0%' }} />
                  </div>
                  <p className="text-white/50 text-xs">0 of 7 steps completed</p>
                </div>
              </div>

              <div className="space-y-3 lg:space-y-4">
                {/* Next step card */}
                <div className={`rounded-xl lg:rounded-2xl border shadow-sm p-5
                  ${dm ? 'bg-[#0d1f14] border-white/10' : 'bg-white border-[#e0eae3]'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#2a7a5c] mb-3">Next step</p>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background:'linear-gradient(135deg,#c9a840,#e8c94a)' }}>
                      <Ic.Arrow className="w-5 h-5 text-[#0e2318]" />
                    </div>
                    <div>
                      <p className={`font-bold text-base ${dm ? 'text-white' : 'text-[#0e2318]'}`}>Passport</p>
                      <p className={`text-xs ${dm ? 'text-white/50' : 'text-[#8aa89c]'}`}>Check validity and save copies.</p>
                    </div>
                  </div>
                  <button className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 shadow-lg"
                    style={{ background:'linear-gradient(135deg,#0e2318,#163020)', boxShadow:'0 4px 16px rgba(14,35,24,0.25)' }}>
                    Continue journey
                  </button>
                </div>

                {/* Explore: Destination + Cost planner */}
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${dm ? 'text-white/40' : 'text-[#8aa89c]'}`}>Explore</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label:'Destination', sub:'United States 🇺🇸', Icon: Ic.Globe, color:'#1e6b8a', bg:'#daf0f8' },
                      { label:'Cost planner', sub:'US$0 planned', Icon: Ic.Costs, color:'#7a5c2a', bg:'#f5ecd4' },
                    ].map(({ label, sub, Icon, color, bg }) => (
                      <button key={label} className={`flex flex-col gap-3 p-4 rounded-xl border text-left hover:-translate-y-0.5 transition-all hover:shadow-md
                        ${dm ? 'bg-[#0d1f14] border-white/10' : 'bg-white border-[#e0eae3]'}`}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:bg, color }}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className={`font-bold text-sm ${dm ? 'text-white' : 'text-[#0e2318]'}`}>{label}</p>
                          <p className={`text-xs mt-0.5 ${dm ? 'text-white/45' : 'text-[#8aa89c]'}`}>{sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Feature tiles ─────────────────────────────────────────── */}
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                {featureTiles.map(({ id, label, sub, Icon, color, bg }) => (
                  <button key={id} className={`flex flex-col items-start gap-4 p-5 rounded-xl lg:rounded-2xl border text-left transition-all hover:shadow-lg hover:-translate-y-0.5 group
                    ${dm ? 'bg-[#0d1f14] border-white/10 hover:border-white/20' : 'bg-white border-[#e0eae3] hover:border-transparent'}`}
                    style={{ boxShadow: dm ? undefined : undefined }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-all group-hover:scale-110"
                      style={{ background:bg, color }}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className={`font-bold text-[15px] leading-tight ${dm ? 'text-white' : 'text-[#0e2318]'}`}>{label}</p>
                      <p className={`text-xs mt-1 leading-snug ${dm ? 'text-white/45' : 'text-[#8aa89c]'}`}>{sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Mentor marketplace + Success stories ────────────────── */}
            <div className="grid grid-cols-2 gap-3 lg:gap-5">
              {/* Mentor marketplace */}
              <div className="relative rounded-xl lg:rounded-2xl overflow-hidden min-h-[220px] lg:min-h-[280px] group cursor-pointer">
                <img src={MENTOR_BG} alt="Mentor marketplace" className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background:'linear-gradient(160deg,rgba(10,25,15,0.7) 0%,rgba(10,30,18,0.88) 70%,rgba(14,35,24,0.95) 100%)' }} />
                {/* Gold line overlay */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 300 280" preserveAspectRatio="none">
                  <path d="M200,20 C240,80 180,130 220,190 S280,240 300,280" stroke="#c9a840" strokeWidth="1.5" fill="none" opacity="0.3"/>
                  <path d="M250,0 C220,60 280,100 240,170" stroke="#c9a840" strokeWidth="0.8" fill="none" opacity="0.2"/>
                </svg>
                <div className="relative z-10 p-5 h-full flex flex-col justify-end">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 shadow-lg"
                    style={{ background:'linear-gradient(135deg,#c9a840,#e8c94a)' }}>
                    <Ic.People className="w-5 h-5 text-[#0e2318]" />
                  </div>
                  <p className="text-white font-extrabold text-base lg:text-xl leading-tight mb-2">Mentor marketplace</p>
                  <p className="text-white/65 text-xs lg:text-sm leading-relaxed">
                    Find experienced, approved professionals for focused career guidance.
                  </p>
                </div>
              </div>

              {/* Success stories */}
              <div className="relative rounded-xl lg:rounded-2xl overflow-hidden min-h-[220px] lg:min-h-[280px] group cursor-pointer">
                <img src={SUCCESS_BG} alt="Success stories" className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background:'linear-gradient(160deg,rgba(10,25,30,0.65) 0%,rgba(10,30,35,0.85) 70%,rgba(12,30,38,0.95) 100%)' }} />
                <div className="relative z-10 p-5 h-full flex flex-col justify-end">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 shadow-lg"
                    style={{ background:'linear-gradient(135deg,#c9a840,#e8c94a)' }}>
                    <Ic.Star className="w-5 h-5 text-[#0e2318]" />
                  </div>
                  <p className="text-white font-extrabold text-base lg:text-xl leading-tight mb-2">Success stories</p>
                  <p className="text-white/65 text-xs lg:text-sm leading-relaxed">
                    Real nurses and midwives share practical lessons from their journeys.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Profile footer ────────────────────────────────────────── */}
            <div className={`rounded-xl lg:rounded-2xl border shadow-sm p-4 lg:p-5 flex items-center justify-between
              ${dm ? 'bg-[#0d1f14] border-white/10' : 'bg-white border-[#e0eae3]'}`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#2a7a5c] flex items-center justify-center text-white font-bold border-2 border-[#2a7a5c]/30">M</div>
                <div>
                  <p className={`font-bold text-sm ${dm ? 'text-white' : 'text-[#0e2318]'}`}>Nurse · United States 🇺🇸</p>
                  <p className={`text-xs ${dm ? 'text-white/45' : 'text-[#8aa89c]'}`}>Just researching</p>
                </div>
              </div>
              <button className="flex items-center gap-1.5 text-sm font-bold text-[#2a7a5c] hover:underline">
                Edit profile <Ic.Arrow className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>{/* end max-w container */}
        </main>

        {/* ── Mobile bottom nav ────────────────────────────────────────── */}
        <nav className={`lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t
          ${dm ? 'bg-[#061009] border-white/10' : 'bg-white border-[#e0eae3]'}`}>
          <div className="flex items-center justify-around px-2 py-2">
            {mobileNav.map(({ id, label, Icon }) => {
              const active = page === id
              return (
                <button key={id} onClick={() => setPage(id)}
                  className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all
                    ${active ? 'bg-[#2a7a5c] shadow-md shadow-[#2a7a5c]/30' : ''}`}>
                    <Icon className={`w-[18px] h-[18px] ${active ? 'text-white' : dm ? 'text-white/40' : 'text-[#8aa89c]'}`} />
                  </div>
                  <span className={`text-[9px] font-medium ${active ? 'text-[#2a7a5c]' : dm ? 'text-white/35' : 'text-[#8aa89c]'}`}>
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>

      {/* ── Ask Zibur FAB (mobile) ──────────────────────────────────────── */}
      <button onClick={() => setAskOpen(true)}
        className="lg:hidden fixed bottom-20 right-4 z-40 flex items-center gap-2 pl-4 pr-5 py-3 rounded-full text-white font-bold text-sm shadow-xl transition-all active:scale-95"
        style={{ background:'linear-gradient(135deg,#0e2318,#163020)', boxShadow:'0 8px 32px rgba(14,35,24,0.4)' }}>
        <Ic.Sparkle className="w-4 h-4 text-[#c9a840]" />
        Ask Zibur
        <span className="w-5 h-5 rounded-full bg-[#c9a840] flex items-center justify-center">
          <Ic.Plus className="w-3 h-3 text-[#0e2318]" />
        </span>
      </button>

      {/* ── Ask Zibur modal ─────────────────────────────────────────────── */}
      {askOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end lg:items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setAskOpen(false)}>
          <div className={`w-full max-w-lg rounded-2xl lg:rounded-3xl overflow-hidden shadow-2xl`}
            style={{ background: dm ? '#0d1f14' : 'white', border:'1px solid rgba(201,168,64,0.25)' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5" style={{ background:'linear-gradient(135deg,#0e2318,#163020)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:'linear-gradient(135deg,#c9a840,#e8c94a)' }}>
                  <Ic.Sparkle className="w-5 h-5 text-[#0e2318]" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Ask Zibur</p>
                  <p className="text-white/50 text-xs">AI-powered visa & career guidance</p>
                </div>
              </div>
              <button onClick={() => setAskOpen(false)} className="text-white/50 hover:text-white text-2xl leading-none p-1">×</button>
            </div>
            {/* Body */}
            <div className="p-5">
              <div className={`rounded-xl p-4 mb-4 text-sm leading-relaxed border ${dm ? 'bg-white/5 border-white/10 text-white/75' : 'bg-[#f3f5f0] border-[#e0eae3] text-[#4a6358]'}`}>
                👋 Hi MR! I'm Zibur, your AI guide for your nursing career and visa journey to the United States. What can I help with today?
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {['NMC registration steps', 'Passport requirements', 'CBT practice tips', 'Job search advice', 'Cost planning'].map(q => (
                  <button key={q} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors hover:border-[#2a7a5c] hover:text-[#2a7a5c]
                    ${dm ? 'bg-white/5 border-white/15 text-white/60' : 'bg-[#f3f5f0] border-[#e0eae3] text-[#4a6358]'}`}>
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={askMsg} onChange={e => setAskMsg(e.target.value)}
                  placeholder="Type your question…"
                  className={`flex-1 px-4 py-3 rounded-xl text-sm border focus:outline-none focus:border-[#2a7a5c] focus:ring-2 focus:ring-[#2a7a5c]/20 transition-all
                    ${dm ? 'bg-white/8 border-white/15 text-white placeholder:text-white/30' : 'bg-[#f3f5f0] border-[#e0eae3] text-[#162b22] placeholder:text-[#8aa89c]'}`}/>
                <button className="px-4 py-3 rounded-xl text-white font-semibold transition-all hover:opacity-90"
                  style={{ background:'linear-gradient(135deg,#0e2318,#2a7a5c)' }}>
                  <Ic.Arrow className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
