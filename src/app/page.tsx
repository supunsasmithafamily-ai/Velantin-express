/* eslint-disable react-hooks/static-components */
'use client'

import { useState, useEffect, useRef, useMemo, Component, type ReactNode } from 'react'
import { authFetch, setToken, clearToken, getToken } from '@/lib/auth-client'
import { uploadImageDirect } from '@/lib/firebase-storage-client'
import { requestNotificationPermission, listenForForegroundMessages } from '@/lib/push-notifications'
import {
  Home as LucideHome,
  MessageCircle as LucideMessageCircle,
  Radio as LucideRadio,
  Wallet as LucideWallet,
  ShieldCheck as LucideShieldCheck,
  UserRound as LucideUserRound,
  Shield as LucideShield,
  LogOut as LucideLogOut,
  Crown as LucideCrown,
  Search as LucideSearch,
  Bell as LucideBell,
  Heart as LucideHeart,
  BarChart3 as LucideBarChart3,
  Gift as LucideGift,
  Users as LucideUsers,
  PlayCircle as LucidePlayCircle,
  Copy as LucideCopy,
  Languages as LucideLanguages,
  Mic as LucideMic,
  Video as LucideVideo,
  Wifi as LucideWifi,
  Film as LucideFilm,
} from 'lucide-react'
import { SUBSCRIPTION_PLANS } from '@/lib/monetization'

// ============ TURN SERVER (from env via NEXT_PUBLIC) ============
const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    ...(process.env.NEXT_PUBLIC_TURN_URL
      ? [{
          urls: process.env.NEXT_PUBLIC_TURN_URL,
          username: process.env.NEXT_PUBLIC_TURN_USER || '',
          credential: process.env.NEXT_PUBLIC_TURN_PASS || '',
        }]
      : []),
  ],
}

// ============ CONSTANTS ============

const BRAND = { name: 'Valentine Express Live Stream', short: 'Valentine Express', tagline: 'Live. Gift. Connect.' }

const GIFT_CATALOG = [
  { id: 'rose', name: 'Rose', coins: 10, icon: '🌹' },
  { id: 'heart', name: 'Heart', coins: 25, icon: '💖' },
  { id: 'kiss', name: 'Kiss', coins: 40, icon: '💋' },
  { id: 'letter', name: 'Love Letter', coins: 60, icon: '💌' },
  { id: 'bouquet', name: 'Bouquet', coins: 120, icon: '💐' },
  { id: 'teddy', name: 'Teddy Bear', coins: 180, icon: '🧸' },
  { id: 'chocolate', name: 'Chocolate Box', coins: 220, icon: '🍫' },
  { id: 'spotlight', name: 'Spotlight', coins: 300, icon: '✨' },
  { id: 'fireworks', name: 'Fireworks', coins: 500, icon: '🎆' },
  { id: 'ring', name: 'Diamond Ring', coins: 700, icon: '💍' },
  { id: 'crown', name: 'Crown', coins: 900, icon: '👑' },
]

const COIN_PACKS = [
  { id: 'starter', coins: 100, price: 0.99, priceLabel: '$0.99' },
  { id: 'basic', coins: 250, price: 2.49, priceLabel: '$2.49' },
  { id: 'plus', coins: 500, price: 4.99, priceLabel: '$4.99' },
  { id: 'value', coins: 800, price: 7.49, priceLabel: '$7.49' },
  { id: 'pro', coins: 1200, price: 9.99, priceLabel: '$9.99' },
  { id: 'mega', coins: 2500, price: 19.99, priceLabel: '$19.99' },
  { id: 'ultimate', coins: 6500, price: 49.99, priceLabel: '$49.99' },
]

const DIAMONDS_PER_USD = 200
const PLATFORM_FEE = 0.3
const CASHOUT_MIN = 3000

function coinsToDiamonds(coins: number) {
  return Math.max(0, Math.floor(coins * (1 - PLATFORM_FEE)))
}

function diamondsToUsd(diamonds: number) {
  return Math.floor((diamonds / DIAMONDS_PER_USD) * 100) / 100
}

// ============ TYPES ============

type Page = 'landing' | 'register' | 'home' | 'discover' | 'analytics' | 'referrals' | 'replays' | 'chats' | 'thread' | 'live' | 'liveStage' | 'status' | 'wallet' | 'subscriptions' | 'verify' | 'admin' | 'profile' | 'publicProfile'

type NetUser = { id: string; name: string; email: string }
type NetChat = { id: string; name: string; group: boolean; last: string; time: string; memberIds?: string[] }
type NetMsg = { id: string; fromId?: string; from: string; text: string; at: string }
type NetLive = { id: string; hostId: string; host: string; title: string; viewers: number; accessType?: 'public' | 'paid' | 'subscribers'; entryPriceCoins?: number }
type NetComment = { user: string; text: string }
type NetSubscription = { id: string; creatorId: string; creatorName: string; planId: string; expiresAt: string | Date }
type RoomAccess = 'public' | 'paid' | 'subscribers'

// ============ AUTH CONTEXT ============

type AuthUser = {
  id: string; name: string; email: string; role: string
  coins: number; diamonds: number; lifetimeEarned: number
  avatarUrl?: string; paypalEmail?: string
  kycStatus: string
  subscriptions?: NetSubscription[]
  bio?: string; birthday?: string; city?: string; gender?: string; age?: number
}

// ============ COMPONENTS ============

function LandingPage({ onLogin, onGoRegister, wsError }: {
  onLogin: (email: string, password: string) => void
  onGoRegister: () => void
  wsError: string | null
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required')
      return
    }
    onLogin(email.trim(), password.trim())
  }

  return (
    <div className="ve-hero">
      <form className="ve-hero-card ve-panel" onSubmit={handleSubmit}>
        <img className="ve-logo" src="/icon.jpg" alt="Valentine Express" />
        <div className="ve-tag">{BRAND.tagline}</div>
        <h1>{BRAND.short}</h1>
        <p>Real-time live streaming with gifts, chat, and creator payouts.</p>
        <input className="ve-field" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="ve-field" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        {error && <p className="ve-err" style={{ marginTop: 8 }}>{error}</p>}
        {wsError && <p className="ve-err" style={{ marginTop: 8 }}>{wsError}</p>}
        <button className="ve-btn ve-btn-primary" style={{ width: '100%', marginTop: 14 }} type="submit">
          Sign in
        </button>
        <p className="ve-muted" style={{ marginTop: 14 }}>
          Don&apos;t have an account? <button type="button" className="ve-btn-ghost" style={{ color: 'var(--ve-rose-2)' }} onClick={onGoRegister}>Register</button>
        </p>
      </form>
    </div>
  )
}

function RegisterPage({ onRegister, onGoLogin }: {
  onRegister: (name: string, email: string, password: string) => void
  onGoLogin: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    onRegister(name.trim(), email.trim(), password.trim())
  }

  return (
    <div className="ve-hero">
      <form className="ve-hero-card ve-panel" onSubmit={handleSubmit}>
        <img className="ve-logo" src="/icon.jpg" alt="Valentine Express" />
        <h1>Create Account</h1>
        <p className="ve-muted">Join Valentine Express</p>
        <input className="ve-field" placeholder="Display name" value={name} onChange={e => setName(e.target.value)} />
        <input className="ve-field" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="ve-field" type="password" placeholder="Password (6+ chars)" value={password} onChange={e => setPassword(e.target.value)} />
        <input className="ve-field" type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} />
        {error && <p className="ve-err" style={{ marginTop: 8 }}>{error}</p>}
        <button className="ve-btn ve-btn-primary" style={{ width: '100%', marginTop: 14 }} type="submit">
          Create Account
        </button>
        <p className="ve-muted" style={{ marginTop: 14 }}>
          Already have an account? <button type="button" className="ve-btn-ghost" style={{ color: 'var(--ve-rose-2)' }} onClick={onGoLogin}>Sign in</button>
        </p>
      </form>
    </div>
  )
}

function Shell({ page, setPage, threadChatId, setThreadChatId, user, setUser, netState, setStatusMsg, onLogout, goToLive, goToProfile, viewingProfile, registerLive, refreshUser }: {
  page: Page; setPage: (p: Page) => void
  threadChatId: string | null; setThreadChatId: (id: string | null) => void
  user: AuthUser; setUser: (u: AuthUser) => void; netState: NetState; setStatusMsg: (m: string) => void; onLogout: () => void
  goToLive: (liveId: string) => void
  goToProfile: (u: { id: string; name: string; avatarUrl: string | null; city: string | null }) => void
  viewingProfile: { id: string; name: string; avatarUrl: string | null; city: string | null } | null
  registerLive: (live: NetLive) => void
  refreshUser: (msg: string) => void
}) {
  const navItems = [
    { to: 'home' as Page, label: 'Home', Icon: LucideHome },
    { to: 'discover' as Page, label: 'Discover', Icon: LucideSearch },
    { to: 'analytics' as Page, label: 'Analytics', Icon: LucideBarChart3 },
    { to: 'referrals' as Page, label: 'Referrals', Icon: LucideUsers },
    { to: 'replays' as Page, label: 'Replays', Icon: LucideFilm },
    { to: 'chats' as Page, label: 'Chats', Icon: LucideMessageCircle },
    { to: 'live' as Page, label: 'Live', Icon: LucideRadio },
    { to: 'wallet' as Page, label: 'Wallet', Icon: LucideWallet },
    { to: 'subscriptions' as Page, label: 'Subscriptions', Icon: LucideCrown },
    { to: 'verify' as Page, label: 'Verify', Icon: LucideShieldCheck },
    { to: 'profile' as Page, label: 'Profile', Icon: LucideUserRound },
  ]

  function navTo(p: Page) {
    setThreadChatId(null)
    setPage(p)
  }

  return (
    <div className="ve-shell">
      {/* Rail */}
      <aside className="ve-rail">
        <img className="ve-brand-mark" src="/icon.jpg" alt="Valentine Express" />
        {navItems.map(i => (
          <button
            key={i.to}
            className={`ve-nav-btn${page === i.to ? ' active' : ''}`}
            title={i.label}
            aria-label={i.label}
            onClick={() => navTo(i.to)}
          >
            <i.Icon size={19} strokeWidth={2} />
          </button>
        ))}
        {user.role === 'admin' && (
          <button
            className={`ve-nav-btn${page === 'admin' ? ' active' : ''}`}
            title="Admin"
            aria-label="Admin"
            onClick={() => navTo('admin')}
          >
            <LucideShield size={19} strokeWidth={2} />
          </button>
        )}
        <div style={{ flex: 1 }} />
        <div className="ve-muted" style={{ fontSize: 10, textAlign: 'center' }}>
          Live video via Agora
        </div>
        {/* User avatar in rail */}
        <div
          className="ve-rail-avatar"
          title={user.name}
          style={{ backgroundImage: user.avatarUrl ? `url(${user.avatarUrl})` : undefined }}
          onClick={() => navTo('profile')}
        >
          {user.avatarUrl ? '' : user.name[0]}
        </div>
        <button className="ve-nav-btn ve-logout-btn" title="Sign out" aria-label="Sign out" onClick={onLogout}>
          <LucideLogOut size={18} strokeWidth={2} />
        </button>
      </aside>

      {/* Sidebar (chats) */}
      {(page === 'chats' || page === 'thread') && (
        <aside className="ve-sidebar">
          <div className="ve-side-head">
            <div>
              <h1>Chats</h1>
              <p>{netState.users.length - 1} others online</p>
            </div>
          </div>
          <div className="ve-list ve-scroll">
            {netState.chats.map(c => (
              <button
                key={c.id}
                className={`ve-row${threadChatId === c.id ? ' active' : ''}`}
                onClick={() => { setThreadChatId(c.id); setPage('thread') }}
              >
                <div className="ve-avatar">{c.name[0]}</div>
                <div>
                  <strong>{c.name}</strong>
                  <span>{c.last} · {c.time}</span>
                </div>
              </button>
            ))}
            <div style={{ padding: 12 }} className="ve-muted">Online</div>
            {netState.users.filter(u => u.id !== user.id).map(u => (
              <button key={u.id} className="ve-row" disabled title="Realtime chat requires Firebase migration">
                <div className="ve-avatar">{u.name[0]}</div>
                <div>
                  <strong>{u.name}</strong>
                  <span>Direct message</span>
                </div>
              </button>
            ))}
          </div>
        </aside>
      )}

      {/* Main stage */}
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {page === 'home' && <HomePage netState={netState} user={user} goToLive={goToLive} goToProfile={goToProfile} />}
        {page === 'discover' && <DiscoverPage netState={netState} user={user} goToLive={goToLive} />}
        {page === 'analytics' && <AnalyticsPage user={user} />}
        {page === 'referrals' && <ReferralsPage user={user} />}
        {page === 'replays' && <ReplaysPage />}
        {page === 'publicProfile' && <PublicProfilePage basicUser={viewingProfile} setPage={setPage} />}
        {page === 'chats' && <ChatsPage netState={netState} user={user} setThreadChatId={setThreadChatId} setPage={setPage} />}
        {page === 'thread' && threadChatId && <ThreadPage chatId={threadChatId} netState={netState} user={user} />}
        {page === 'live' && <LivePage netState={netState} user={user} setPage={setPage} setThreadChatId={setThreadChatId} goToLive={goToLive} registerLive={registerLive} />}
        {page === 'liveStage' && <LiveStagePage netState={netState} user={user} setPage={setPage} refreshUser={refreshUser} />}
        {page === 'subscriptions' && <SubscriptionsPage user={user} refreshUser={refreshUser} />}
        {page === 'wallet' && <WalletPage user={user} setUser={setStatusMsg} />}
        {page === 'verify' && <VerifyPage user={user} setUser={setStatusMsg} />}
        {page === 'status' && <StatusPage netState={netState} user={user} />}
        {page === 'admin' && user.role === 'admin' && <AdminPage user={user} />}
        {page === 'profile' && <ProfilePage user={user} setUser={setUser} onLogout={onLogout} />}
      </main>

      {/* Mobile tabs */}
      <nav className="ve-mobile-tabs">
        {navItems.map(i => (
          <button key={i.to} className={`ve-mobile-tab${page === i.to ? ' active' : ''}`} aria-label={i.label} onClick={() => navTo(i.to)}>
            <i.Icon size={22} strokeWidth={2} />
          </button>
        ))}
      </nav>
    </div>
  )
}

function ChatsPage({ netState, user, setThreadChatId, setPage }: {
  netState: NetState; user: AuthUser
  setThreadChatId: (id: string | null) => void; setPage: (p: Page) => void
}) {
  const others = netState.users.filter(u => u.id !== user.id)
  return (
    <section className="ve-stage">
      <div className="ve-topbar">
        <strong>Chats</strong>
        <span className="ve-muted">{others.length} online</span>
      </div>
      <div className="ve-list ve-scroll" style={{ padding: 12 }}>
        {netState.chats.length === 0 && others.length === 0 && (
          <div className="ve-muted" style={{ padding: 16 }}>No chats yet — online users will show up here.</div>
        )}
        {netState.chats.map(c => (
          <button
            key={c.id}
            className="ve-row"
            onClick={() => { setThreadChatId(c.id); setPage('thread') }}
          >
            <div className="ve-avatar">{c.name[0]}</div>
            <div>
              <strong>{c.name}</strong>
              <span>{c.last} · {c.time}</span>
            </div>
          </button>
        ))}
        {others.length > 0 && <div style={{ padding: 12 }} className="ve-muted">Online</div>}
        {others.map(u => (
          <button
            key={u.id}
            className="ve-row"
            disabled title="Realtime chat requires Firebase migration"
          >
            <div className="ve-avatar">{u.name[0]}</div>
            <div>
              <strong>{u.name}</strong>
              <span className="ve-online-indicator"><span className="ve-online-heart">❤</span> Online</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

function ThreadPage({ chatId, netState, user }: {
  chatId: string; netState: NetState; user: AuthUser
}) {
  const [text, setText] = useState('')
  const chat = netState.chats.find(c => c.id === chatId)
  const messages = netState.messages[chatId] ?? []
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [messages.length])

  if (!chat) {
    return (
      <section className="ve-stage">
        <div className="ve-topbar">Chat not found</div>
      </section>
    )
  }

  return (
    <section className="ve-stage">
      <div className="ve-topbar">
        <div>
          <strong>{chat.name}</strong>
          <div className="ve-muted">{chat.group ? 'Shared room' : 'Direct'}</div>
        </div>
      </div>
      <div className="ve-chat-log ve-scroll" ref={logRef}>
        {messages.map(m => (
          <div key={m.id} className={`ve-bubble${m.fromId === user.id ? ' ve-bubble-me' : ''}`}>
            {chat.group && m.fromId !== user.id && <div className="ve-muted">{m.from}</div>}
            {m.text}
            <div className="ve-muted">{m.at}</div>
          </div>
        ))}
      </div>
      <p className="ve-muted" style={{ padding: '0 20px' }}>Realtime chat requires Firebase migration.</p>
      <form className="ve-composer" onSubmit={e => {
        e.preventDefault()
        if (!text.trim()) return
        setText('')
      }}>
        <input className="ve-field" style={{ marginTop: 0 }} value={text} onChange={e => setText(e.target.value)} placeholder="Chat migration pending" disabled />
        <button className="ve-btn ve-btn-primary" type="submit" disabled>Send</button>
      </form>
    </section>
  )
}

function HomePage({ netState, user, goToLive, goToProfile }: {
  netState: NetState; user: AuthUser
  goToLive: (liveId: string) => void
  goToProfile: (u: { id: string; name: string; avatarUrl: string | null; city: string | null }) => void
}) {
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; avatarUrl: string | null; city: string | null }>>([])
  const [text, setText] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    authFetch('/api/users').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setAllUsers(data)
    }).catch(() => {})
  }, [])

  const onlineIds = new Set(netState.users.map(u => u.id))
  const liveByHost = new Map(netState.lives.map(l => [l.hostId, l.id]))

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImageDirect(file, 'status')
      setImageUrl(url)
    } catch { /* ignore */ }
    setUploading(false)
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    await authFetch('/api/statuses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim(), imageUrl }),
    }).catch(() => {})
    setText('')
    setImageUrl(null)
  }

  return (
    <section className="ve-stage">
      <div className="ve-topbar">
        <strong>Valentine Express</strong>
        <span className="ve-muted">{netState.users.length} online</span>
      </div>
      <div style={{ padding: 20, display: 'grid', gap: 20 }}>
        <div>
          <h3 style={{ marginTop: 0 }}>People</h3>
          <div className="ve-user-grid">
            {allUsers.filter(u => u.id !== user.id).map(u => {
              const online = onlineIds.has(u.id)
              const liveId = liveByHost.get(u.id)
              return (
                <button
                  key={u.id}
                  className="ve-user-card"
                  onClick={() => liveId ? goToLive(liveId) : goToProfile(u)}
                >
                  <div className="ve-user-card-avatar" style={{ backgroundImage: u.avatarUrl ? `url(${u.avatarUrl})` : undefined }}>
                    {!u.avatarUrl && u.name[0]}
                    {online && <span className="ve-online-heart ve-online-heart-badge">❤</span>}
                  </div>
                  <strong>{u.name}</strong>
                  {liveId ? <span className="ve-badge" style={{ marginTop: 4 }}><span className="ve-live-dot" /> LIVE</span> : (u.city && <span className="ve-muted">{u.city}</span>)}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <h3 style={{ marginTop: 0 }}>Status updates</h3>
          <form className="ve-panel" onSubmit={handlePost}>
            <input className="ve-field" style={{ marginTop: 0 }} value={text} onChange={e => setText(e.target.value)} placeholder="Share an update" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <input type="file" accept="image/*" onChange={handleImagePick} disabled={uploading} />
              {uploading && <span className="ve-muted">Uploading…</span>}
              {imageUrl && <span className="ve-ok">✓ Image attached</span>}
            </div>
            <button className="ve-btn ve-btn-primary" style={{ marginTop: 10 }} type="submit" disabled={uploading}>Post</button>
          </form>
          <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            {netState.statuses.map(s => (
              <div key={s.id} className="ve-panel">
                <strong>{s.userName}</strong>
                <p>{s.text}</p>
                {s.imageUrl && <img src={s.imageUrl} alt="" style={{ maxWidth: '100%', borderRadius: 8, marginTop: 6 }} />}
                <span className="ve-muted">{s.age}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}


const FEATURED_CREATORS = [
  { id: 'maya', name: 'Maya Rose', handle: '@mayarose', category: 'Music', viewers: 18420, color: '#d946ef', avatar: 'M', title: 'Acoustic sunset sessions', tags: ['music', 'acoustic'], live: true },
  { id: 'kavi', name: 'Kavi Kitchen', handle: '@kavikitchen', category: 'Food', viewers: 8920, color: '#f97316', avatar: 'K', title: 'Spicy street food tour', tags: ['food', 'travel'], live: true },
  { id: 'nadi', name: 'Nadiya Fit', handle: '@nadiyafit', category: 'Fitness', viewers: 5210, color: '#14b8a6', avatar: 'N', title: '30 min no-equipment workout', tags: ['fitness', 'wellness'], live: false },
  { id: 'sahan', name: 'Sahan Plays', handle: '@sahanplays', category: 'Gaming', viewers: 4130, color: '#6366f1', avatar: 'S', title: 'Rank push with the squad', tags: ['gaming', 'esports'], live: false },
]

function DiscoverPage({ netState, user, goToLive }: { netState: NetState; user: AuthUser; goToLive: (liveId: string) => void }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [language, setLanguage] = useState<'EN' | 'සිං' | 'தமி'>('EN')
  const [following, setFollowing] = useState<string[]>(['maya'])
  const [favorites, setFavorites] = useState<string[]>(['maya', 'nadi'])
  const [notifications, setNotifications] = useState<string[]>(['maya'])
  const [lowData, setLowData] = useState(false)
  const [relationshipTab, setRelationshipTab] = useState<'all' | 'following' | 'favorites'>('all')
  const [showNotifications, setShowNotifications] = useState(false)
  const [recentlyWatched] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = JSON.parse(window.localStorage.getItem('ve-recently-watched') || '[]')
      return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : []
    } catch { return [] }
  })
  useEffect(() => {
    authFetch('/api/creators/relationships').then(r => r.ok ? r.json() : null).then(data => {
      const rows = Array.isArray(data?.relationships) ? data.relationships : []
      setFollowing(rows.filter((row: { following?: boolean }) => row.following).map((row: { creatorId: string }) => row.creatorId))
      setFavorites(rows.filter((row: { favorite?: boolean }) => row.favorite).map((row: { creatorId: string }) => row.creatorId))
      setNotifications(rows.filter((row: { notify?: boolean }) => row.notify).map((row: { creatorId: string }) => row.creatorId))
    }).catch(() => {})
  }, [])
  const categories = ['All', 'Music', 'Gaming', 'Food', 'Fitness', 'Travel']
  const liveCards = FEATURED_CREATORS.filter(c => c.live || netState.lives.length === 0)
  const filtered = FEATURED_CREATORS.filter(c => (category === 'All' || c.category === category) && (relationshipTab === 'all' || (relationshipTab === 'following' ? following.includes(c.id) : favorites.includes(c.id))) && (!query || `${c.name} ${c.title} ${c.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())))
  const toggle = async (list: string[], setList: (next: string[]) => void, id: string, action: string) => {
    const active = list.includes(id)
    setList(active ? list.filter(x => x !== id) : [...list, id])
    await authFetch('/api/creators/relationships', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ creatorId: id, action: active ? `un${action}` : action }) }).catch(() => {})
  }
  return (
    <section className="ve-stage">
      <div className="ve-topbar ve-discover-topbar">
        <div><strong>{language === 'සිං' ? 'සොයන්න' : language === 'தமி' ? 'கண்டறியுங்கள்' : 'Discover'}</strong><span className="ve-muted"> · {netState.lives.length || 4} live now</span></div>
        <div className="ve-discover-actions"><button className={`ve-icon-btn ve-light-icon${lowData ? ' active' : ''}`} title="Low-data mode" onClick={() => setLowData(!lowData)}><LucideWifi size={17} /></button><button className="ve-icon-btn ve-light-icon" title="Language" onClick={() => setLanguage(language === 'EN' ? 'සිං' : language === 'සිං' ? 'தமி' : 'EN')}><LucideLanguages size={17} /></button><div style={{ position: 'relative' }}><button className={`ve-icon-btn ve-light-icon${showNotifications ? ' active' : ''}`} title="Notifications" onClick={() => setShowNotifications(!showNotifications)}><LucideBell size={17} /><span className="ve-notification-dot" /></button>{showNotifications && <div className="ve-panel" style={{ position: 'absolute', right: 0, top: 44, width: 280, zIndex: 10, padding: 14 }}><strong>Live notifications</strong><p className="ve-muted" style={{ margin: '8px 0 0' }}>{notifications.length ? `${notifications.length} creator alert${notifications.length === 1 ? '' : 's'} enabled.` : 'Follow a creator and enable alerts to see them here.'}</p>{notifications.map(id => { const creator = FEATURED_CREATORS.find(c => c.id === id); return creator ? <div key={id} className="ve-mini-settings"><span><span className="ve-live-dot" /> {creator.name}</span><small>Live alerts on</small></div> : null })}</div>}</div></div>
      </div>
      <div className="ve-discover-content">
        <div className="ve-discover-hero ve-panel"><div><span className="ve-kicker">{lowData ? 'Low-data mode on' : 'For you'}</span><h1>Find your next <em>favorite</em> creator.</h1><p>Live conversations, real people, and moments worth sharing.</p></div><div className="ve-hero-orb"><LucidePlayCircle size={30} /></div></div>
        <div className="ve-search-wrap"><LucideSearch size={18} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search creators, streams, tags…" /></div>
        <div className="ve-chip-row">{categories.map(c => <button key={c} className={`ve-chip${category === c ? ' active' : ''}`} onClick={() => setCategory(c)}>{c}</button>)}</div>
        <div className="ve-section-heading"><div><span className="ve-kicker">Right now</span><h2>Trending live</h2></div><span className="ve-muted">Updated just now</span></div>
        <div className="ve-trending-grid">{liveCards.slice(0, 4).map((c, index) => <div key={c.id} className="ve-stream-card" style={{ '--card-accent': c.color } as React.CSSProperties} onClick={() => netState.lives[index] && goToLive(netState.lives[index].id)}><div className="ve-stream-art"><span className="ve-stream-avatar" style={{ background: c.color }}>{c.avatar}</span><span className="ve-badge ve-live-badge"><span className="ve-live-dot" /> LIVE</span><span className="ve-viewer-count">{c.viewers.toLocaleString()} watching</span></div><div className="ve-stream-copy"><strong>{c.title}</strong><span>{c.name} · {c.category}</span><div className="ve-tag-row">{c.tags.map(t => <small key={t}>#{t}</small>)}</div></div></div>)}</div>
        <div className="ve-section-heading"><div><span className="ve-kicker">Your circle</span><h2>Creators to follow</h2></div></div>
        <div className="ve-chip-row"><button className={`ve-chip${relationshipTab === 'all' ? ' active' : ''}`} onClick={() => setRelationshipTab('all')}>All creators</button><button className={`ve-chip${relationshipTab === 'following' ? ' active' : ''}`} onClick={() => setRelationshipTab('following')}><LucideUsers size={14} /> Following ({following.length})</button><button className={`ve-chip${relationshipTab === 'favorites' ? ' active' : ''}`} onClick={() => setRelationshipTab('favorites')}><LucideHeart size={14} /> Favorites ({favorites.length})</button></div>
        <div className="ve-creator-list">{filtered.map(c => <div key={c.id} className="ve-creator-row"><div className="ve-stream-avatar" style={{ background: c.color }}>{c.avatar}</div><div className="ve-creator-meta"><strong>{c.name} <span className="ve-verified">✓</span></strong><span>{c.handle} · {c.category}</span></div><button className={`ve-icon-btn ve-light-icon${favorites.includes(c.id) ? ' liked' : ''}`} title="Favorite creator" onClick={() => toggle(favorites, setFavorites, c.id, 'favorite')}><LucideHeart size={17} fill={favorites.includes(c.id) ? 'currentColor' : 'none'} /></button><button className={`ve-btn ${following.includes(c.id) ? 've-btn-following' : 've-btn-primary'}`} onClick={() => { toggle(following, setFollowing, c.id, 'follow'); if (!following.includes(c.id) && !notifications.includes(c.id)) { setNotifications([...notifications, c.id]); authFetch('/api/creators/relationships', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ creatorId: c.id, action: 'notify' }) }).catch(() => {}) } }}>{following.includes(c.id) ? 'Following' : 'Follow'}</button><button className={`ve-icon-btn ve-light-icon${notifications.includes(c.id) ? ' active' : ''}`} title="Notify when live" onClick={() => toggle(notifications, setNotifications, c.id, 'notify')}><LucideBell size={17} /></button></div>)}</div>
        <div className="ve-two-col"><div className="ve-panel"><span className="ve-kicker">Keep watching</span><h3>Recently watched</h3>{(recentlyWatched.length ? recentlyWatched : ['maya', 'kavi']).map((id, index) => { const creator = FEATURED_CREATORS.find(c => c.id === id) || FEATURED_CREATORS[index]; return <div className="ve-history-item" key={`${creator.id}-${index}`}><div className={`ve-history-thumb${index ? ' orange' : ''}`} /><div><strong>{creator.title}</strong><span>{index ? '8 min watched · 2 days ago' : '12 min watched · yesterday'}</span></div><LucidePlayCircle size={18} /></div> })}</div><div className="ve-panel"><span className="ve-kicker">Personalized for you</span><h3>Favorites & recommendations</h3><p className="ve-muted">You are following <strong>{following.length}</strong> creators and getting live alerts for <strong>{notifications.length}</strong>. Recommendations adapt to your watch history and favorite categories.</p><div className="ve-mini-settings"><span><LucideVideo size={16} /> Mobile video quality</span><strong>{lowData ? 'Data saver' : 'Auto HD'}</strong></div><div className="ve-mini-settings"><span><LucideMic size={16} /> Background audio</span><strong className="ve-ok">Ready</strong></div></div></div>
      </div>
    </section>
  )
}

function AnalyticsPage({ user }: { user: AuthUser }) {
  const [range, setRange] = useState('This week')
  const [report, setReport] = useState<{ totalViewers: number; peakViewers: number; watchTimeSeconds: number; giftCoins: number } | null>(null)
  useEffect(() => { authFetch(`/api/creators/analytics?range=${range.toLowerCase().replace(' ', '-')}`).then(r => r.ok ? r.json() : null).then(data => setReport(data?.report ?? null)).catch(() => {}) }, [range])
  const metrics = [{ label: 'Total viewers', value: report ? report.totalViewers.toLocaleString() : '—', change: 'Live data', icon: LucideUsers }, { label: 'Peak viewers', value: report ? report.peakViewers.toLocaleString() : '—', change: 'Live data', icon: LucideBarChart3 }, { label: 'Watch time', value: report ? `${Math.floor(report.watchTimeSeconds / 3600)}h ${Math.floor(report.watchTimeSeconds / 60) % 60}m` : '—', change: 'Live data', icon: LucidePlayCircle }, { label: 'Gift income', value: report ? report.giftCoins.toLocaleString() : '—', change: 'Coins', icon: LucideGift }]
  return <section className="ve-stage"><div className="ve-topbar"><div><strong>Creator Analytics</strong><span className="ve-muted"> · {user.name}</span></div><select className="ve-select" value={range} onChange={e => setRange(e.target.value)}><option>This week</option><option>This month</option><option>Last 90 days</option></select></div><div className="ve-analytics-content"><div className="ve-analytics-kicker"><div><span className="ve-kicker">Creator studio</span><h1>Your audience is growing.</h1><p className="ve-muted">Track performance, income, and community health in one place.</p></div><button className="ve-btn ve-btn-primary">Download report</button></div><div className="ve-metric-grid">{metrics.map(m => <div className="ve-panel ve-metric-card" key={m.label}><div className="ve-metric-icon"><m.icon size={18} /></div><span>{m.label}</span><strong>{m.value}</strong><small className="ve-ok">{m.change} vs previous</small></div>)}</div><div className="ve-analytics-grid"><div className="ve-panel"><div className="ve-card-title"><div><span className="ve-kicker">Audience</span><h3>Viewers & watch time</h3></div><span className="ve-muted">{range}</span></div><div className="ve-chart"><div className="ve-chart-grid" /><svg viewBox="0 0 640 220" preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#fb7185" stopOpacity=".35" /><stop offset="1" stopColor="#fb7185" stopOpacity="0" /></linearGradient></defs><path d="M0 180 C70 170 85 100 150 125 S230 180 285 110 S370 95 420 120 S510 40 560 70 S610 55 640 25 V220 H0Z" fill="url(#area)" /><path d="M0 180 C70 170 85 100 150 125 S230 180 285 110 S370 95 420 120 S510 40 560 70 S610 55 640 25" fill="none" stroke="#fb7185" strokeWidth="4" /></svg></div><div className="ve-chart-labels"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div><div className="ve-panel"><span className="ve-kicker">Community</span><h3>Follower growth</h3><div className="ve-growth-number">+1,248</div><p className="ve-muted">New followers this period</p><div className="ve-progress"><span style={{ width: '72%' }} /></div><div className="ve-mini-settings"><span>Followers</span><strong>12,840</strong></div><div className="ve-mini-settings"><span>Returning viewers</span><strong>68%</strong></div><div className="ve-mini-settings"><span>Avg. session</span><strong>24m 18s</strong></div></div></div><div className="ve-panel"><div className="ve-card-title"><div><span className="ve-kicker">Monetization</span><h3>Income breakdown</h3></div><span className="ve-muted">Coins</span></div><div className="ve-income-row"><span><i className="ve-income-dot gifts" /> Gifts</span><strong>12,920</strong><b>70%</b></div><div className="ve-income-row"><span><i className="ve-income-dot subs" /> Subscriptions</span><strong>4,180</strong><b>23%</b></div><div className="ve-income-row"><span><i className="ve-income-dot referral" /> Referral commission</span><strong>1,360</strong><b>7%</b></div></div></div></section>
}

function ReferralsPage({ user }: { user: AuthUser }) {
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState('Overview')
  const [referral, setReferral] = useState<{ code?: string; successfulReferrals?: number; coinsEarned?: number; commissionCoins?: number } | null>(null)
  useEffect(() => { authFetch('/api/referrals').then(r => r.ok ? r.json() : null).then(data => setReferral(data?.referral ?? null)).catch(() => {}) }, [])
  const invite = `velantin.live/invite/${referral?.code ?? (user.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'creator')}`
  const copyInvite = async () => { try { await navigator.clipboard.writeText(`https://${invite}`) } catch {} setCopied(true); setTimeout(() => setCopied(false), 1600) }
  return <section className="ve-stage"><div className="ve-topbar"><div><strong>Referral Center</strong><span className="ve-muted"> · Grow together</span></div><span className="ve-badge">{referral?.coinsEarned ?? 0} coins earned</span></div><div className="ve-referral-content"><div className="ve-referral-hero ve-panel"><div><span className="ve-kicker">Invite friends, earn together</span><h1>Turn your community into momentum.</h1><p>Give new creators a warm welcome and earn coins for every successful referral.</p></div><div className="ve-referral-illustration"><LucideUsers size={42} /></div></div><div className="ve-invite-card ve-panel"><div><span className="ve-kicker">Your invite link</span><h3>{invite}</h3></div><button className="ve-btn ve-btn-primary" onClick={copyInvite}><LucideCopy size={16} /> {copied ? 'Copied!' : 'Copy link'}</button></div><div className="ve-referral-tabs">{['Overview', 'Your invites', 'Creator commission'].map(t => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>)}</div><div className="ve-referral-stats"><div className="ve-panel"><span>Successful referrals</span><strong>{referral?.successfulReferrals ?? 0}</strong><small className="ve-ok">Tracked automatically</small></div><div className="ve-panel"><span>Coins earned</span><strong>{referral?.coinsEarned ?? 0}</strong><small>56 coins per referral</small></div><div className="ve-panel"><span>Creator commission</span><strong>{referral?.commissionCoins ?? 0}</strong><small>Commission coins</small></div></div><div className="ve-panel ve-steps"><h3>How it works</h3><div><b>01</b><span><strong>Share your link</strong><small>Send your invite to friends or your social community.</small></span></div><div><b>02</b><span><strong>They go live</strong><small>Your referral joins, completes their profile, and starts streaming.</small></span></div><div><b>03</b><span><strong>You both win</strong><small>Coins land in your wallet and creator commission starts automatically.</small></span></div></div></div></section>
}

function ReplaysPage() {
  const [replays, setReplays] = useState<Array<{ id: string; title: string; views: number; durationSeconds: number; moments: number; clips: number; videoUrl?: string; createdAt?: string }>>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<{ id: string; title: string; videoUrl?: string; moments: number; clips: number } | null>(null)
  useEffect(() => {
    authFetch('/api/live/replays').then(r => r.ok ? r.json() : null).then(data => setReplays(Array.isArray(data?.replays) ? data.replays : [])).catch(() => {}).finally(() => setLoading(false))
  }, [])
  return <section className="ve-stage"><div className="ve-topbar"><div><strong>Replay library</strong><span className="ve-muted"> · Gift moments & short clips</span></div><span className="ve-badge"><LucideFilm size={14} /> Watch anytime</span></div><div className="ve-discover-content"><div className="ve-discover-hero ve-panel"><div><span className="ve-kicker">Your live memories</span><h1>Replay the moments that <em>moved</em> you.</h1><p>Every completed stream becomes a replay, with gift-sent moments ready to revisit and turn into clips.</p></div><div className="ve-hero-orb"><LucidePlayCircle size={30} /></div></div>{loading && <div className="ve-panel ve-muted">Loading replays…</div>}{!loading && replays.length === 0 && <div className="ve-panel"><h3>No replays yet</h3><p className="ve-muted">Start and finish a live stream to build your replay library.</p></div>}<div className="ve-trending-grid">{replays.map(replay => <article className="ve-stream-card" key={replay.id}><div className="ve-stream-art"><span className="ve-stream-avatar" style={{ background: '#be123c' }}><LucidePlayCircle size={24} /></span><span className="ve-badge ve-live-badge">REPLAY</span><span className="ve-viewer-count">{replay.views.toLocaleString()} views</span></div><div className="ve-stream-copy"><strong>{replay.title}</strong><span>{replay.durationSeconds ? `${Math.round(replay.durationSeconds / 60)} min` : 'Full live replay'}</span><div className="ve-tag-row"><small><LucideGift size={13} /> {replay.moments} gift moments</small><small><LucideFilm size={13} /> {replay.clips} clips</small></div><button className="ve-btn ve-btn-primary" style={{ marginTop: 12 }} onClick={() => setSelected(replay)}><LucidePlayCircle size={15} /> Play replay</button></div></article>)}</div></div>{selected && <div style={{ position: 'fixed', inset: 0, zIndex: 20, background: 'rgba(0,0,0,.8)', display: 'grid', placeItems: 'center', padding: 20 }} onClick={() => setSelected(null)}><div className="ve-panel" style={{ width: 'min(860px, 100%)' }} onClick={e => e.stopPropagation()}><div className="ve-card-title"><div><span className="ve-kicker">Replay</span><h3>{selected.title}</h3></div><button className="ve-btn" onClick={() => setSelected(null)}>Close</button></div>{selected.videoUrl ? <video src={selected.videoUrl} controls autoPlay style={{ width: '100%', borderRadius: 14, background: '#000', maxHeight: '65vh' }} /> : <div className="ve-panel" style={{ marginTop: 12, textAlign: 'center' }}><LucideFilm size={36} /><p className="ve-muted">This replay has no video asset attached yet. Gift moments: {selected.moments} · Short clips: {selected.clips}.</p></div>}</div></div>}</section>
}

function PublicProfilePage({ basicUser, setPage }: {
  basicUser: { id: string; name: string; avatarUrl: string | null; city: string | null } | null
  setPage: (p: Page) => void
}) {
  const [extra, setExtra] = useState<{ bio?: string | null; gender?: string | null; age?: number | null } | null>(null)

  useEffect(() => {
    if (!basicUser) return
    authFetch(`/api/profile?userId=${basicUser.id}`).then(r => r.ok ? r.json() : null).then(data => {
      if (data?.profile) setExtra(data.profile)
    }).catch(() => {})
  }, [basicUser?.id])

  if (!basicUser) {
    return (
      <section className="ve-stage">
        <div className="ve-topbar">Profile</div>
        <div style={{ padding: 20 }}><button className="ve-btn" onClick={() => setPage('home')}>Back to Home</button></div>
      </section>
    )
  }

  return (
    <section className="ve-stage">
      <div className="ve-topbar">
        <strong>{basicUser.name}</strong>
        <button className="ve-btn" onClick={() => setPage('home')}>← Back</button>
      </div>
      <div style={{ padding: 20, maxWidth: 480 }}>
        <div className="ve-panel" style={{ textAlign: 'center' }}>
          <div className="ve-user-card-avatar" style={{ margin: '0 auto', width: 88, height: 88, fontSize: 32, backgroundImage: basicUser.avatarUrl ? `url(${basicUser.avatarUrl})` : undefined }}>
            {!basicUser.avatarUrl && basicUser.name[0]}
          </div>
          <h2 style={{ marginBottom: 4 }}>{basicUser.name}</h2>
          {basicUser.city && <p className="ve-muted">{basicUser.city}</p>}
          {extra?.age && <p className="ve-muted">{extra.age} years old</p>}
          {extra?.bio && <p style={{ marginTop: 12 }}>{extra.bio}</p>}
          <button
            className="ve-btn ve-btn-primary"
            style={{ marginTop: 16 }}
            disabled title="Realtime chat requires Firebase migration"
          >
            Message
          </button>
        </div>
      </div>
    </section>
  )
}

function LivePage({ netState, user, setPage, setThreadChatId, goToLive, registerLive }: {
  netState: NetState; user: AuthUser
  setPage: (p: Page) => void; setThreadChatId: (id: string | null) => void
  goToLive: (liveId: string) => void; registerLive: (live: NetLive) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const previewStreamRef = useRef<MediaStream | null>(null)
  const [camStatus, setCamStatus] = useState<'loading' | 'ready' | 'blocked'>('loading')
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [accessType, setAccessType] = useState<RoomAccess>('public')
  const [entryPriceCoins, setEntryPriceCoins] = useState(100)

  // Start the camera preview immediately (full screen), before the user
  // even taps "Go live" — no title screen, no extra step in between.
  useEffect(() => {
    let stop = false
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        })
        if (stop) { stream.getTracks().forEach(t => t.stop()); return }
        previewStreamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.muted = true
          await videoRef.current.play().catch(() => {})
        }
        setCamStatus('ready')
      } catch {
        setCamStatus('blocked')
      }
    })()
    return () => {
      stop = true
      previewStreamRef.current?.getTracks().forEach(t => t.stop())
      previewStreamRef.current = null
    }
  }, [])

  async function handleGoLive() {
    setStarting(true)
    setStartError(null)
    try {
      const res = await authFetch('/api/live/start', {
        method: 'POST',
        body: JSON.stringify({ title: `${user.name} live`, accessType, entryPriceCoins }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not start the live stream')
      // Stop the local preview stream — LiveStagePage's Agora publish
      // takes over the camera from here.
      previewStreamRef.current?.getTracks().forEach(t => t.stop())
      previewStreamRef.current = null
      registerLive({ id: data.id, hostId: data.hostId, host: data.host, title: data.title, viewers: 0, accessType: data.accessType, entryPriceCoins: data.entryPriceCoins })
      setThreadChatId(null)
      goToLive(data.id)
    } catch (err) {
      setStarting(false)
      setStartError(err instanceof Error ? err.message : 'Could not start the live stream')
    }
  }

  return (
    <section className="ve-stage ve-live-fullscreen">
      <div className="ve-live-frame ve-live-frame-full">
        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000' }} />
        <div className="ve-live-overlay">
          <div className="ve-live-top">
            <button className="ve-icon-btn" aria-label="Back" onClick={() => setPage('home')}>←</button>
            <div className="ve-badge">
              {camStatus === 'loading' && 'Starting camera…'}
              {camStatus === 'ready' && 'Camera ready'}
              {camStatus === 'blocked' && 'Camera blocked — check permissions'}
            </div>
            <div />
          </div>

          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 28, display: 'grid', placeItems: 'center', gap: 14 }}>
            <div className="ve-panel" style={{ width: 'min(92vw, 420px)', background: 'rgba(42, 10, 18, .82)', color: 'white' }}>
              <p style={{ margin: 0, fontWeight: 700 }}>Room access</p>
              <select className="ve-field" value={accessType} onChange={e => setAccessType(e.target.value as RoomAccess)} style={{ marginTop: 8 }}>
                <option value="public">Public — anyone can join</option>
                <option value="paid">Paid private — one-time entry</option>
                <option value="subscribers">Subscribers only — membership required</option>
              </select>
              {accessType === 'paid' && (
                <input
                  className="ve-field"
                  type="number"
                  min={25}
                  max={10000}
                  step={1}
                  value={entryPriceCoins}
                  onChange={e => setEntryPriceCoins(Math.max(25, Math.min(10000, Number(e.target.value) || 25)))}
                  placeholder="Entry price in coins"
                  aria-label="Private room entry price in coins"
                />
              )}
            </div>
            <button
              className="ve-btn ve-btn-primary"
              style={{ padding: '16px 40px', fontSize: 16, borderRadius: 999 }}
              disabled={starting}
              onClick={handleGoLive}
            >
              {starting ? 'Going live…' : '🔴 Go Live'}
            </button>
            {startError && (
              <div className="ve-badge" style={{ color: '#ff6b6b', maxWidth: '85vw', textAlign: 'center' }}>{startError}</div>
            )}

            {netState.lives.length > 0 && (
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', maxWidth: '92vw', padding: '0 12px' }}>
                {netState.lives.map(l => (
                  <button key={l.id} className="ve-badge" style={{ whiteSpace: 'nowrap' }} onClick={() => goToLive(l.id)}>
                    <span className="ve-live-dot" /> {l.host} · {l.viewers} watching {l.accessType === 'paid' ? `· 🔒 ${l.entryPriceCoins} coins` : l.accessType === 'subscribers' ? '· ♛ Subscribers' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

type LiveMsg =
  | { type: 'comment'; user: string; text: string }
  | { type: 'gift'; user: string; giftName: string; icon: string }

function LiveStagePage({ netState, user, setPage, refreshUser }: {
  netState: NetState; user: AuthUser
  setPage: (p: Page) => void; refreshUser: (msg: string) => void
}) {
  const liveId = netState.currentLiveId
  const live = netState.lives.find(l => l.id === liveId)
  const isHost = live?.hostId === user.id
  const videoRef = useRef<HTMLVideoElement>(null)
  const [text, setText] = useState('')
  const [status, setStatus] = useState('Connecting…')
  const [comments, setComments] = useState<{ user: string; text: string }[]>([])
  const [giftFlash, setGiftFlash] = useState<string | null>(null)
  const [sendingGift, setSendingGift] = useState<string | null>(null)
  const [unlockedRoomId, setUnlockedRoomId] = useState<string | null>(null)
  const [accessError, setAccessError] = useState<string | null>(null)
  const [unlocking, setUnlocking] = useState(false)
  const [micEnabled, setMicEnabled] = useState(true)
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [lowDataMode, setLowDataMode] = useState(false)
  const [backgroundAudio, setBackgroundAudio] = useState(false)
  const accessReady = Boolean(live && (isHost || (live.accessType ?? 'public') === 'public' || unlockedRoomId === liveId))

  // Agora RTC (video) + RTM (chat/gifts) clients live in refs so they
  // survive re-renders without re-triggering the join effect.
  const clientRef = useRef<import('agora-rtc-sdk-ng').IAgoraRTCClient | null>(null)
  const localTracksRef = useRef<[import('agora-rtc-sdk-ng').IMicrophoneAudioTrack, import('agora-rtc-sdk-ng').ICameraVideoTrack] | null>(null)
  const rtmRef = useRef<InstanceType<typeof import('agora-rtm-sdk').default.RTM> | null>(null)
  const giftFlashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!liveId || !accessReady) return
    let cancelled = false

    ;(async () => {
      const [AgoraRTC, AgoraRTMModule] = await Promise.all([
        import('agora-rtc-sdk-ng').then(m => m.default),
        import('agora-rtm-sdk').then(m => m.default),
      ])
      const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' })
      clientRef.current = client
      await client.setClientRole(isHost ? 'host' : 'audience')

      client.on('user-published', async (remoteUser, mediaType) => {
        await client.subscribe(remoteUser, mediaType)
        if (mediaType === 'video' && videoRef.current) {
          remoteUser.videoTrack?.play(videoRef.current)
          setStatus('Watching live')
        }
        if (mediaType === 'audio') remoteUser.audioTrack?.play()
      })

      try {
        const res = await authFetch('/api/agora/token', {
          method: 'POST',
          body: JSON.stringify({ channelName: liveId, role: isHost ? 'host' : 'audience' }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Could not get a live token')
        if (cancelled) return

        // --- Video (RTC) ---
        await client.join(data.appId, data.channelName, data.rtcToken, data.uid)
        if (cancelled) return

        if (isHost) {
          const [micTrack, camTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
            {},
            { encoderConfig: '720p_2' },
          )
          if (cancelled) { micTrack.close(); camTrack.close(); return }
          localTracksRef.current = [micTrack, camTrack]
          if (videoRef.current) camTrack.play(videoRef.current)
          await client.publish([micTrack, camTrack])
          setStatus('You are live')
        } else {
          setStatus('Waiting for host…')
        }

        // --- Chat/gifts (RTM) ---
        const rtm = new AgoraRTMModule.RTM(data.appId, user.id, { logLevel: 'error' })
        rtmRef.current = rtm
        rtm.addEventListener('message', (event) => {
          if (event.channelName !== liveId) return
          try {
            const rawMessage = typeof event.message === 'string' ? event.message : new TextDecoder().decode(event.message)
            const msg = JSON.parse(rawMessage) as LiveMsg
            if (msg.type === 'comment') {
              setComments(c => [...c.slice(-40), { user: msg.user, text: msg.text }])
            } else if (msg.type === 'gift') {
              if (giftFlashTimeout.current) clearTimeout(giftFlashTimeout.current)
              setGiftFlash(`${msg.user} sent ${msg.icon} ${msg.giftName}`)
              setComments(c => [...c.slice(-40), { user: msg.user, text: `sent ${msg.giftName}` }])
              giftFlashTimeout.current = setTimeout(() => setGiftFlash(null), 4000)
            }
          } catch { /* ignore malformed messages */ }
        })
        await rtm.login({ token: data.rtmToken })
        await rtm.subscribe(liveId)
      } catch (err) {
        setStatus(err instanceof Error ? err.message : 'Camera/mic blocked — check permissions')
      }
    })()

    return () => {
      cancelled = true
      localTracksRef.current?.forEach(t => t.close())
      localTracksRef.current = null
      clientRef.current?.leave().catch(() => {})
      clientRef.current = null
      if (giftFlashTimeout.current) clearTimeout(giftFlashTimeout.current)
      const rtm = rtmRef.current
      rtmRef.current = null
      if (rtm) {
        rtm.unsubscribe(liveId).catch(() => {})
        rtm.logout().catch(() => {})
      }
    }
  }, [liveId, isHost, accessReady])

  function sendComment() {
    const trimmed = text.trim()
    if (!trimmed || !rtmRef.current || !liveId) return
    const msg: LiveMsg = { type: 'comment', user: user.name, text: trimmed.slice(0, 240) }
    rtmRef.current.publish(liveId, JSON.stringify(msg)).catch(() => {})
    setComments(c => [...c.slice(-40), { user: msg.user, text: msg.text }])
    setText('')
  }

  async function toggleMedia(kind: 'mic' | 'camera') {
    const track = kind === 'mic' ? localTracksRef.current?.[0] : localTracksRef.current?.[1]
    if (!track) return
    const next = kind === 'mic' ? !micEnabled : !cameraEnabled
    await track.setEnabled(next)
    if (kind === 'mic') setMicEnabled(next)
    else setCameraEnabled(next)
  }

  async function sendGift(g: { id: string; name: string; coins: number; icon: string }) {
    if (!liveId || sendingGift) return
    setSendingGift(g.id)
    try {
      const res = await authFetch('/api/live/gift', {
        method: 'POST',
        body: JSON.stringify({ liveId, giftId: g.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gift failed')
      refreshUser('refresh') // pulls the updated coin balance
      const msg: LiveMsg = { type: 'gift', user: user.name, giftName: g.name, icon: g.icon }
      rtmRef.current?.publish(liveId, JSON.stringify(msg)).catch(() => {})
      setGiftFlash(`You sent ${g.icon} ${g.name}`)
      if (giftFlashTimeout.current) clearTimeout(giftFlashTimeout.current)
      giftFlashTimeout.current = setTimeout(() => setGiftFlash(null), 4000)
    } catch (err) {
      setGiftFlash(err instanceof Error ? err.message : 'Gift failed')
      if (giftFlashTimeout.current) clearTimeout(giftFlashTimeout.current)
      giftFlashTimeout.current = setTimeout(() => setGiftFlash(null), 4000)
    } finally {
      setSendingGift(null)
    }
  }

  async function unlockPaidRoom() {
    if (!liveId || unlocking) return
    setUnlocking(true)
    setAccessError(null)
    try {
      const res = await authFetch('/api/live/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liveId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not unlock this room')
      setUnlockedRoomId(liveId)
      refreshUser('refresh')
    } catch (error) {
      setAccessError(error instanceof Error ? error.message : 'Could not unlock this room')
    } finally {
      setUnlocking(false)
    }
  }

  async function subscribeToRoom(planId: string) {
    if (!live || unlocking) return
    setUnlocking(true)
    setAccessError(null)
    try {
      const res = await authFetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId: live.hostId, planId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not activate subscription')
      setUnlockedRoomId(liveId)
      refreshUser('refresh')
    } catch (error) {
      setAccessError(error instanceof Error ? error.message : 'Could not activate subscription')
    } finally {
      setUnlocking(false)
    }
  }

  if (!live) {
    return (
      <section className="ve-stage" style={{ gridColumn: '2 / -1' }}>
        <div className="ve-topbar">This live has ended.</div>
        <div style={{ padding: 20 }}>
          <button className="ve-btn" onClick={() => setPage('live')}>Back to Live</button>
        </div>
      </section>
    )
  }

  if (!accessReady) {
    const accessType = live.accessType ?? 'public'
    return (
      <section className="ve-stage" style={{ gridColumn: '2 / -1' }}>
        <div className="ve-topbar"><strong>{live.host}&apos;s private room</strong><button className="ve-btn" onClick={() => setPage('live')}>← Back</button></div>
        <div style={{ padding: 20, maxWidth: 760 }}>
          <div className="ve-panel">
            <span className="ve-badge">{accessType === 'paid' ? '🔒 Paid private room' : '♛ Subscribers only'}</span>
            <h2 style={{ marginBottom: 6 }}>{live.title}</h2>
            <p className="ve-muted">{accessType === 'paid' ? `Unlock this live for ${live.entryPriceCoins ?? 0} coins. The pass is valid for this room while it is live.` : 'Choose a 30-day membership to join this creator\'s subscriber-only live rooms.'}</p>
            {accessError && <p className="ve-err" style={{ marginTop: 12 }}>{accessError}</p>}
            {accessType === 'paid' ? (
              <button className="ve-btn ve-btn-primary" style={{ marginTop: 16 }} disabled={unlocking} onClick={unlockPaidRoom}>
                {unlocking ? 'Unlocking…' : `Unlock for ${live.entryPriceCoins ?? 0} coins`}
              </button>
            ) : (
              <div className="ve-grid-3" style={{ marginTop: 16 }}>
                {SUBSCRIPTION_PLANS.map(plan => (
                  <div key={plan.id} className="ve-panel" style={{ padding: 14 }}>
                    <strong>{plan.name}</strong>
                    <p className="ve-stat" style={{ fontSize: 24, margin: '10px 0 4px' }}>{plan.priceCoins.toLocaleString()} coins</p>
                    <p className="ve-muted" style={{ minHeight: 48 }}>{plan.description}</p>
                    <button className="ve-btn ve-btn-primary" disabled={unlocking} onClick={() => subscribeToRoom(plan.id)}>Subscribe</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="ve-stage ve-live-fullscreen">
      <div className="ve-live-frame ve-live-frame-full">
        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000', display: backgroundAudio ? 'none' : 'block' }} />
        <div className="ve-live-overlay">
          <div className="ve-live-top">
            <button className="ve-icon-btn" aria-label="Back" onClick={() => setPage('live')}>←</button>
            <div className="ve-badge"><span className="ve-live-dot" /> {live.host} · {status}</div>
            <form className="ve-live-chat-top" onSubmit={e => { e.preventDefault(); sendComment() }}>
              <input value={text} onChange={e => setText(e.target.value)} placeholder="Say something…" />
              <button className="ve-icon-btn ve-icon-btn-primary" type="submit" aria-label="Send">➤</button>
            </form>
            {isHost && (
              <><button className="ve-icon-btn" aria-label="Toggle microphone" title={micEnabled ? 'Mute microphone' : 'Unmute microphone'} onClick={() => toggleMedia('mic')}>{micEnabled ? <LucideMic size={16} /> : '🔇'}</button><button className="ve-icon-btn" aria-label="Toggle camera" title={cameraEnabled ? 'Turn camera off' : 'Turn camera on'} onClick={() => toggleMedia('camera')}>{cameraEnabled ? <LucideVideo size={16} /> : '📵'}</button><button className={`ve-icon-btn${lowDataMode ? ' active' : ''}`} aria-label="Low-data mode" title="Low-data streaming mode" onClick={() => setLowDataMode(!lowDataMode)}><LucideWifi size={16} /></button><button className="ve-icon-btn ve-icon-btn-danger" aria-label="End live" onClick={() => {
                authFetch('/api/live/end', { method: 'POST', body: JSON.stringify({ liveId: live.id }) }).catch(() => {})
                setPage('live')
              }}>✕</button></>
            )}
            {!isHost && <button className={`ve-icon-btn${backgroundAudio ? ' active' : ''}`} aria-label="Background audio" title="Background audio" onClick={() => setBackgroundAudio(!backgroundAudio)}><LucideMic size={16} /></button>}
          </div>

          <div className="ve-live-comments">
            {comments.slice(-6).map((c, i) => (
              <div key={i} className="ve-badge" style={{ display: 'block' }}>
                <b>{c.user}</b> {c.text}
              </div>
            ))}
            {giftFlash && <div className="ve-badge">{giftFlash}</div>}
          </div>

          {!isHost && (
            <div className="ve-gifts-3d">
              {GIFT_CATALOG.map(g => (
                <button
                  key={g.id}
                  className="ve-gift-3d"
                  title={`${g.name} · ${g.coins} coins`}
                  disabled={sendingGift === g.id}
                  onClick={() => sendGift(g)}
                >
                  <span className="ve-gift-emoji">{g.icon}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// VAST (Video Ad Serving Template) support for the rewarded-ad flow.
// Fetches a VAST tag URL (e.g. from HilltopAds' Video VAST ad format),
// resolves Wrapper redirects, extracts the media file + tracking pixel
// URLs, and reports back once the video actually plays to the end.
// ---------------------------------------------------------------------------

interface VastResult {
  mediaUrl: string
  impressions: string[]
  trackers: Record<string, string[]>
}

async function fetchVast(url: string, depth = 0): Promise<VastResult | null> {
  if (depth > 3) return null // guard against wrapper redirect loops
  let text: string
  try {
    const res = await fetch(url)
    text = await res.text()
  } catch {
    return null
  }

  let doc: Document
  try {
    doc = new DOMParser().parseFromString(text, 'text/xml')
    if (doc.querySelector('parsererror')) return null
  } catch {
    return null
  }

  // Wrapper VAST points to another VAST tag — follow it.
  const wrapperUri = doc.querySelector('VASTAdTagURI')?.textContent?.trim()
  if (wrapperUri) {
    return fetchVast(wrapperUri, depth + 1)
  }

  const mediaUrl = doc.querySelector('MediaFile')?.textContent?.trim()
  if (!mediaUrl) return null

  const trackers: Record<string, string[]> = {}
  doc.querySelectorAll('Tracking').forEach(el => {
    const event = el.getAttribute('event') || 'other'
    const trackUrl = el.textContent?.trim()
    if (trackUrl) {
      trackers[event] = trackers[event] || []
      trackers[event].push(trackUrl)
    }
  })

  const impressions = Array.from(doc.querySelectorAll('Impression'))
    .map(el => el.textContent?.trim())
    .filter((u): u is string => !!u)

  return { mediaUrl, impressions, trackers }
}

function fireTrackingPixels(urls?: string[]) {
  for (const u of urls || []) {
    try { new Image().src = u } catch { /* ignore */ }
  }
}

function PushToast({ toasts, onDismiss }: { toasts: Array<{ id: number; title: string; body: string }>; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null
  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 900, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320 }}>
      {toasts.map(t => (
        <div key={t.id} className="ve-panel" style={{ cursor: 'pointer' }} onClick={() => onDismiss(t.id)}>
          <strong>{t.title}</strong>
          {t.body && <p style={{ margin: '4px 0 0' }} className="ve-muted">{t.body}</p>}
        </div>
      ))}
    </div>
  )
}

function DailyBonusModal({ onClaimed }: { onClaimed: () => void }) {
  const [status, setStatus] = useState<{ available: boolean; streak: number; coinsOnClaim: number } | null>(null)
  const [claimed, setClaimed] = useState<{ coinsAwarded: number; streak: number } | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [showAd, setShowAd] = useState(false)

  useEffect(() => {
    authFetch('/api/wallet/daily-claim').then(r => r.ok ? r.json() : null).then(data => {
      if (data?.available) setStatus(data)
    }).catch(() => {})
  }, [])

  if (dismissed || (!status && !claimed)) return null

  async function performClaim() {
    setClaiming(true)
    try {
      const res = await authFetch('/api/wallet/daily-claim', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setClaimed({ coinsAwarded: data.coinsAwarded, streak: data.streak })
        onClaimed()
      } else {
        setDismissed(true)
      }
    } catch {
      setDismissed(true)
    }
    setClaiming(false)
  }

  // Tapping "Claim" shows a HilltopAds video first — the actual coin
  // credit only happens once the ad reports completion (see handleAdComplete).
  function handleClaimClick() {
    if (process.env.NEXT_PUBLIC_HILLTOP_VAST_URL) {
      setShowAd(true)
    } else {
      // No ad configured yet — don't block the free daily bonus on a
      // missing env var, just grant it directly.
      performClaim()
    }
  }

  function handleAdComplete() {
    setShowAd(false)
    performClaim()
  }

  function handleAdError() {
    setShowAd(false)
    // Ad failed to load (network hiccup, adblock, etc.) — still grant the
    // bonus rather than let a third-party outage block a free daily
    // reward. If you'd rather enforce watching strictly, call
    // setDismissed(true) here instead of performClaim().
    performClaim()
  }

  const streak = claimed?.streak ?? status?.streak ?? 0
  const displayStreak = claimed ? streak : streak + 1 // the streak this claim would reach

  return (
    <div className="ve-modal-backdrop" onClick={() => !claiming && !showAd && setDismissed(true)}>
      {showAd && process.env.NEXT_PUBLIC_HILLTOP_VAST_URL && (
        <RewardedVastAd
          vastUrl={process.env.NEXT_PUBLIC_HILLTOP_VAST_URL}
          onComplete={handleAdComplete}
          onError={handleAdError}
        />
      )}
      <div className="ve-bonus-modal" onClick={e => e.stopPropagation()}>
        <div className="ve-bonus-icon">{claimed ? '🎉' : '🎁'}</div>
        <h2 style={{ margin: '10px 0 4px' }}>{claimed ? 'Bonus claimed!' : 'Daily Bonus'}</h2>
        <p className="ve-muted">
          {claimed ? `+${claimed.coinsAwarded} coins added to your wallet` : 'Come back every day to grow your streak'}
        </p>
        <div className="ve-bonus-streak-row">
          {Array.from({ length: 7 }).map((_, i) => {
            const dayNum = i + 1
            const filled = dayNum <= (displayStreak % 7 === 0 && displayStreak > 0 ? 7 : displayStreak % 7 || (displayStreak > 0 ? 7 : 0))
            return <div key={i} className={`ve-bonus-streak-day${filled ? ' filled' : ''}`}>{dayNum}</div>
          })}
        </div>
        {claimed ? (
          <button className="ve-btn ve-btn-primary" style={{ width: '100%' }} onClick={() => setDismissed(true)}>Nice!</button>
        ) : (
          <button className="ve-btn ve-btn-primary" style={{ width: '100%' }} onClick={handleClaimClick} disabled={claiming}>
            {claiming ? 'Claiming…' : `Watch ad & claim +${status?.coinsOnClaim ?? 0} coins`}
          </button>
        )}
      </div>
    </div>
  )
}

function RewardedVastAd({ vastUrl, onComplete, onError }: {
  vastUrl: string
  onComplete: () => void
  onError: (msg: string) => void
}) {
  const [ad, setAd] = useState<VastResult | null>(null)
  const [failed, setFailed] = useState(false)
  const firedComplete = useRef(false)

  useEffect(() => {
    let cancelled = false
    fetchVast(vastUrl).then(result => {
      if (cancelled) return
      if (!result) {
        setFailed(true)
        onError('Ad failed to load — try again later.')
        return
      }
      setAd(result)
      fireTrackingPixels(result.impressions)
    })
    return () => { cancelled = true }
  }, [vastUrl])

  function handleEnded() {
    if (firedComplete.current) return
    firedComplete.current = true
    fireTrackingPixels(ad?.trackers['complete'])
    onComplete()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 640, width: '90%' }}>
        {failed ? (
          <p style={{ color: '#fff', textAlign: 'center' }}>Ad failed to load. Please try again later.</p>
        ) : ad ? (
          <video
            src={ad.mediaUrl}
            autoPlay
            playsInline
            controls={false}
            style={{ width: '100%', borderRadius: 8, background: '#000' }}
            onEnded={handleEnded}
            onError={() => { setFailed(true); onError('Ad playback failed.') }}
          />
        ) : (
          <p style={{ color: '#fff', textAlign: 'center' }}>Loading ad…</p>
        )}
        <p style={{ color: '#aaa', textAlign: 'center', marginTop: 8, fontSize: 13 }}>
          Watch to the end to earn coins
        </p>
      </div>
    </div>
  )
}

function WalletPage({ user, setUser }: { user: AuthUser; setUser: (msg: string) => void }) {
  const [diamonds, setDiamonds] = useState(CASHOUT_MIN)
  const [email, setEmail] = useState(user.paypalEmail ?? user.email)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingOrder, setPendingOrder] = useState<{ orderId: string; providerRef: string } | null>(null)

  async function handleBuy(packId: string) {
    setLoading(true)
    setMsg('')
    try {
      const res = await authFetch('/api/payments/create-coin-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
      })
      const data = await res.json()
      if (data.approvalUrl) {
        window.open(data.approvalUrl, '_blank')
        if (data.provider === 'oxapay') {
          setMsg('OxaPay payment page opened. Complete the crypto payment; coins will be credited automatically after confirmation.')
        } else {
          setPendingOrder({ orderId: data.orderId, providerRef: data.providerRef })
          setMsg('Approve the payment in the PayPal window, then come back and tap "I\'ve completed payment".')
        }
      } else {
        setMsg(data.error || 'Failed to create order')
      }
    } catch {
      setMsg('Network error')
    }
    setLoading(false)
  }

  async function handleCapture() {
    if (!pendingOrder) return
    setLoading(true)
    setMsg('')
    try {
      const res = await authFetch('/api/payments/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingOrder),
      })
      const data = await res.json()
      if (data.ok) {
        setMsg(`Payment confirmed — coins credited.`)
        setPendingOrder(null)
        setUser('refresh')
      } else {
        setMsg(data.error || 'Payment not yet approved — try again after approving in the PayPal window.')
      }
    } catch {
      setMsg('Network error')
    }
    setLoading(false)
  }

  async function handleCashout() {
    setLoading(true)
    setMsg('')
    try {
      const res = await authFetch('/api/cashout/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diamonds, paypalEmail: email }),
      })
      const data = await res.json()
      if (data.id) {
        setMsg(`Request ${data.id.slice(0, 8)} submitted.`)
        setUser('refresh')
      } else {
        setMsg(data.error || 'Failed')
      }
    } catch {
      setMsg('Network error')
    }
    setLoading(false)
  }

  const [bonusMsg, setBonusMsg] = useState('')
  const [watchingAd, setWatchingAd] = useState(false)
  const [adToken, setAdToken] = useState<string | null>(null)
  const [adStatus, setAdStatus] = useState<{ claimedToday: number; dailyCap: number; coinsPerAd: number; cooldownUntil: string | null } | null>(null)

  useEffect(() => {
    authFetch('/api/wallet/ad-reward/status').then(r => r.ok ? r.json() : null).then(data => {
      if (data) setAdStatus(data)
    }).catch(() => {})
  }, [])

  async function handleWatchAd() {
    const vastUrl = process.env.NEXT_PUBLIC_HILLTOP_VAST_URL
    if (!vastUrl) {
      setBonusMsg('Ad not configured yet — try again later.')
      return
    }
    setWatchingAd(true)
    setBonusMsg('')
    try {
      const startRes = await authFetch('/api/wallet/ad-reward/start', { method: 'POST' })
      const startData = await startRes.json()
      if (!startRes.ok) {
        setBonusMsg(startData.error || 'Ad not available right now')
        setWatchingAd(false)
        return
      }
      setAdToken(startData.token)
    } catch {
      setBonusMsg('Network error')
      setWatchingAd(false)
    }
  }

  async function handleAdComplete() {
    const token = adToken
    setAdToken(null)
    if (!token) { setWatchingAd(false); return }
    try {
      const claimRes = await authFetch('/api/wallet/ad-reward/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const claimData = await claimRes.json()
      if (claimData.ok) {
        setBonusMsg(`+${claimData.coinsAwarded} coins for watching!`)
        setAdStatus(s => s ? { ...s, claimedToday: claimData.claimedToday } : s)
        setUser('refresh')
      } else {
        setBonusMsg(claimData.error || 'Could not credit reward')
      }
    } catch {
      setBonusMsg('Network error')
    }
    setWatchingAd(false)
  }

  function handleAdError(msg: string) {
    setAdToken(null)
    setBonusMsg(msg)
    setWatchingAd(false)
  }

  return (
    <section className="ve-stage" style={{ gridColumn: '2 / -1' }}>
      {adToken && process.env.NEXT_PUBLIC_HILLTOP_VAST_URL && (
        <RewardedVastAd
          vastUrl={process.env.NEXT_PUBLIC_HILLTOP_VAST_URL}
          onComplete={handleAdComplete}
          onError={handleAdError}
        />
      )}
      <div className="ve-topbar">
        <strong>Wallet</strong>
        <span className="ve-muted">{DIAMONDS_PER_USD} diamonds = $1</span>
      </div>
      <div style={{ padding: 20 }} className="ve-grid-2">
        <div className="ve-panel">
          <p className="ve-muted">Spendable coins</p>
          <p className="ve-stat">{user.coins.toLocaleString()}</p>
          <p className="ve-muted" style={{ marginTop: 16 }}>Earned diamonds</p>
          <p className="ve-stat">{user.diamonds.toLocaleString()}</p>
          <p className="ve-muted">≈ ${diamondsToUsd(user.diamonds).toFixed(2)}</p>
        </div>
        <div className="ve-panel">
          <h3 style={{ marginTop: 0 }}>Watch ads for coins</h3>
          {adStatus && (
            <>
              <p className="ve-muted" style={{ marginBottom: 10 }}>
                {adStatus.claimedToday} / {adStatus.dailyCap} watched today · +{adStatus.coinsPerAd} coins each
              </p>
              <div className="ve-ad-grid">
                {Array.from({ length: adStatus.dailyCap }).map((_, i) => {
                  const claimed = i < adStatus.claimedToday
                  const isNext = i === adStatus.claimedToday
                  const onCooldown = !!adStatus.cooldownUntil && new Date(adStatus.cooldownUntil).getTime() > Date.now()
                  return (
                    <button
                      key={i}
                      className={`ve-ad-slot${claimed ? ' claimed' : ''}${isNext && !onCooldown ? ' next' : ''}`}
                      disabled={!isNext || watchingAd || onCooldown}
                      onClick={handleWatchAd}
                      title={claimed ? 'Watched' : isNext ? 'Watch ad' : 'Locked'}
                    >
                      {claimed ? '✓' : isNext ? (watchingAd ? '…' : '▶') : '🔒'}
                    </button>
                  )
                })}
              </div>
            </>
          )}
          {bonusMsg && <p className="ve-muted" style={{ marginTop: 10 }}>{bonusMsg}</p>}
        </div>
        <div className="ve-panel">
          <h3 style={{ marginTop: 0 }}>Coin packs</h3>
          <p className="ve-warn">Checkout provider: {process.env.NEXT_PUBLIC_PAYMENT_PROVIDER || 'PayPal'} — real payment required.</p>
          {COIN_PACKS.map(p => (
            <button key={p.id} className="ve-btn" style={{ marginRight: 8, marginTop: 8 }} onClick={() => handleBuy(p.id)} disabled={loading}>
              {p.coins} coins · {p.priceLabel}
            </button>
          ))}
          {pendingOrder && (
            <button className="ve-btn ve-btn-primary" style={{ marginTop: 12 }} onClick={handleCapture} disabled={loading}>
              I've completed payment
            </button>
          )}
        </div>
        <div className="ve-panel">
          <h3 style={{ marginTop: 0 }}>Cash out to PayPal</h3>
          <p className="ve-muted">Minimum {CASHOUT_MIN} diamonds. KYC must be approved.</p>
          <input className="ve-field" type="number" value={diamonds} onChange={e => setDiamonds(Number(e.target.value))} />
          <input className="ve-field" type="email" placeholder="PayPal email" value={email} onChange={e => setEmail(e.target.value)} />
          <p className="ve-ok">You would receive ≈ ${diamondsToUsd(diamonds).toFixed(2)}</p>
          {msg && <p className="ve-muted">{msg}</p>}
          <button className="ve-btn ve-btn-primary" style={{ marginTop: 10 }} onClick={handleCashout} disabled={loading}>
            Request cash-out
          </button>
        </div>
      </div>
    </section>
  )
}

function SubscriptionsPage({ user, refreshUser }: { user: AuthUser; refreshUser: (msg: string) => void }) {
  const [subscriptions, setSubscriptions] = useState<NetSubscription[]>(user.subscriptions ?? [])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authFetch('/api/subscriptions').then(r => r.ok ? r.json() : null).then(data => {
      if (data?.subscriptions) setSubscriptions(data.subscriptions)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <section className="ve-stage" style={{ gridColumn: '2 / -1' }}>
      <div className="ve-topbar"><strong>Subscriptions</strong><span className="ve-muted">Use coins to support creators</span></div>
      <div style={{ padding: 20 }}>
        <div className="ve-panel" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: 0 }}>Creator memberships</h2>
              <p className="ve-muted" style={{ marginBottom: 0 }}>Subscribe from a subscriber-only live room to unlock that creator&apos;s private lives for 30 days.</p>
            </div>
            <button className="ve-btn" onClick={() => refreshUser('refresh')}>Refresh balance</button>
          </div>
        </div>
        <div className="ve-grid-3">
          {SUBSCRIPTION_PLANS.map(plan => (
            <div className="ve-panel" key={plan.id}>
              <span className="ve-badge"><LucideCrown size={14} /> {plan.name}</span>
              <p className="ve-stat" style={{ marginTop: 14 }}>{plan.priceCoins.toLocaleString()} coins</p>
              <p className="ve-muted">{plan.description}</p>
              <p className="ve-muted" style={{ fontSize: 12 }}>30-day access · renews manually</p>
            </div>
          ))}
        </div>
        <div className="ve-panel" style={{ marginTop: 14 }}>
          <h3 style={{ marginTop: 0 }}>Your active subscriptions</h3>
          {loading ? <p className="ve-muted">Loading…</p> : subscriptions.length === 0 ? (
            <p className="ve-muted">No active memberships yet. Join a subscriber-only live room to get started.</p>
          ) : (
            <div className="ve-list" style={{ maxHeight: 280 }}>
              {subscriptions.map(subscription => (
                <div className="ve-row" key={subscription.id} style={{ cursor: 'default' }}>
                  <div className="ve-avatar"><LucideCrown size={18} /></div>
                  <div style={{ flex: 1 }}><strong>{subscription.creatorName}</strong><span>{subscription.planId} · active until {new Date(subscription.expiresAt).toLocaleDateString()}</span></div>
                  <span className="ve-ok">Active</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function VerifyPage({ user, setUser }: { user: AuthUser; setUser: (msg: string) => void }) {
  const [msg, setMsg] = useState('')
  const [uploading, setUploading] = useState<string | null>(null)
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null)
  const [nicFrontUrl, setNicFrontUrl] = useState<string | null>(null)
  const [nicBackUrl, setNicBackUrl] = useState<string | null>(null)

  async function handleFileUpload(
    kind: 'kyc_selfie' | 'kyc_nic_front' | 'kyc_nic_back',
    setUrl: (url: string) => void,
    file: File,
  ) {
    setUploading(kind)
    setMsg('')
    try {
      const url = await uploadImageDirect(file, kind)
      setUrl(url)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Upload failed')
    }
    setUploading(null)
  }

  async function handleSubmit() {
    if (!selfieUrl) {
      setMsg('A selfie photo is required.')
      return
    }
    try {
      const res = await authFetch('/api/kyc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selfieUrl, nicFrontUrl, nicBackUrl }),
      })
      const data = await res.json()
      if (data.ok) {
        setMsg('KYC submitted for review.')
        setUser('refresh')
      } else {
        setMsg(data.error || 'Failed to submit')
      }
    } catch {
      setMsg('Network error')
    }
  }

  // This row needs access to VerifyPage's upload state and handler.
  function FileRow({ label, kind, url, setUrl }: {
    label: string
    kind: 'kyc_selfie' | 'kyc_nic_front' | 'kyc_nic_back'
    url: string | null
    setUrl: (url: string) => void
  }) {
    return (
      <div style={{ marginTop: 12 }}>
        <label className="ve-muted" style={{ display: 'block', marginBottom: 4 }}>{label}</label>
        <input
          type="file"
          accept="image/*"
          disabled={uploading === kind}
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleFileUpload(kind, setUrl, file)
          }}
        />
        {uploading === kind && <span className="ve-muted" style={{ marginLeft: 8 }}>Uploading…</span>}
        {url && <p className="ve-ok" style={{ marginTop: 4 }}>✓ Uploaded</p>}
      </div>
    )
  }

  return (
    <section className="ve-stage" style={{ gridColumn: '2 / -1' }}>
      <div className="ve-topbar">
        <strong>Identity check</strong>
        <span className="ve-muted">Status: {user.kycStatus}</span>
      </div>
      <div style={{ padding: 20, maxWidth: 560 }}>
        <div className="ve-panel">
          <p>
            KYC verification is required before going live and cashing out.
            Upload your selfie and NIC photos.
          </p>
          <p className="ve-muted">This is not a government NIC database check.</p>

          <FileRow label="Selfie (required)" kind="kyc_selfie" url={selfieUrl} setUrl={setSelfieUrl} />
          <FileRow label="NIC — front" kind="kyc_nic_front" url={nicFrontUrl} setUrl={setNicFrontUrl} />
          <FileRow label="NIC — back" kind="kyc_nic_back" url={nicBackUrl} setUrl={setNicBackUrl} />

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="ve-btn" onClick={handleSubmit} disabled={!selfieUrl || !!uploading}>Submit for review</button>
          </div>
          {msg && <p className="ve-muted" style={{ marginTop: 12 }}>{msg}</p>}
        </div>
      </div>
    </section>
  )
}

function StatusPage({ netState, user }: { netState: NetState; user: AuthUser }) {
  const [text, setText] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImageDirect(file, 'status')
      setImageUrl(url)
    } catch { /* ignore */ }
    setUploading(false)
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    await authFetch('/api/statuses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim(), imageUrl }),
    }).catch(() => {})
    setText('')
    setImageUrl(null)
  }

  return (
    <section className="ve-stage" style={{ gridColumn: '2 / -1' }}>
      <div className="ve-topbar">
        <strong>Status</strong>
        <span className="ve-muted">Share updates with everyone</span>
      </div>
      <div style={{ padding: 20, display: 'grid', gap: 12 }}>
        <form className="ve-panel" onSubmit={handlePost}>
          <input className="ve-field" style={{ marginTop: 0 }} value={text} onChange={e => setText(e.target.value)} placeholder="Share an update" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <input type="file" accept="image/*" onChange={handleImagePick} disabled={uploading} />
            {uploading && <span className="ve-muted">Uploading…</span>}
            {imageUrl && <span className="ve-ok">✓ Image attached</span>}
          </div>
          <button className="ve-btn ve-btn-primary" style={{ marginTop: 10 }} type="submit" disabled={uploading}>Post</button>
        </form>
        {netState.statuses.map(s => (
          <div key={s.id} className="ve-panel">
            <strong>{s.userName}</strong>
            <p>{s.text}</p>
            {s.imageUrl && (
              <img src={s.imageUrl} alt="" style={{ maxWidth: '100%', borderRadius: 8, marginTop: 6 }} />
            )}
            <span className="ve-muted">{s.age}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function ProfilePage({ user, setUser, onLogout }: { user: AuthUser; setUser: (u: AuthUser) => void; onLogout: () => void }) {
  const [bio, setBio] = useState(user.bio || '')
  const [birthday, setBirthday] = useState(user.birthday || '')
  const [city, setCity] = useState(user.city || '')
  const [gender, setGender] = useState(user.gender || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [notifStatus, setNotifStatus] = useState<'idle' | 'requesting' | 'enabled' | 'error'>('idle')
  const [notifMsg, setNotifMsg] = useState('')

  async function handleEnableNotifications() {
    setNotifStatus('requesting')
    setNotifMsg('')
    const result = await requestNotificationPermission()
    if (result.ok) {
      setNotifStatus('enabled')
    } else {
      setNotifStatus('error')
      setNotifMsg(result.message)
    }
  }

  const GENDER_LABELS: Record<string, string> = { male: 'පිරිමි', female: 'ගැහැනු', other: 'වෙනත්' }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    try {
      const res = await authFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: bio || null,
          birthday: birthday || null,
          city: city || null,
          gender: gender || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setMsg(data.error || 'Failed to save'); setSaving(false); return }
      // Refresh user data
      const meRes = await authFetch(`/api/auth/me`)
      const meData = await meRes.json()
      if (meData.profile) {
        setUser({
          ...user,
          bio: meData.profile.bio,
          birthday: meData.profile.birthday,
          city: meData.profile.city,
          gender: meData.profile.gender,
          age: meData.profile.age,
          avatarUrl: meData.profile.avatarUrl,
        })
      }
      setMsg('Profile updated!')
      setTimeout(() => setMsg(''), 2000)
    } catch {
      setMsg('Network error')
    }
    setSaving(false)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImageDirect(file, 'avatar')

      const profileRes = await authFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: url }),
      })
      if (!profileRes.ok) { setMsg('Upload succeeded but saving to profile failed'); setUploading(false); return }

      setUser({ ...user, avatarUrl: url })
      setMsg('Photo updated!')
      setTimeout(() => setMsg(''), 2000)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Upload error')
    }
    setUploading(false)
  }

  return (
    <section className="ve-stage">
      <div className="ve-topbar">
        <h1>Profile</h1>
        <button className="ve-btn ve-btn-ghost" style={{ color: 'var(--ve-rose-2)' }} onClick={onLogout}>Logout</button>
      </div>

      <div className="ve-profile-container">
        {/* Avatar section */}
        <div className="ve-profile-avatar-section">
          <div
            className="ve-profile-avatar"
            style={{ backgroundImage: user.avatarUrl ? `url(${user.avatarUrl})` : undefined }}
            onClick={() => fileRef.current?.click()}
            title="Click to change photo"
          >
            {user.avatarUrl ? '' : <span className="ve-profile-avatar-fallback">{user.name[0]}</span>}
            <div className="ve-profile-avatar-overlay">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
          {uploading && <p className="ve-muted" style={{ marginTop: 8 }}>Uploading...</p>}
          <h2 style={{ margin: '12px 0 2px' }}>{user.name}</h2>
          <p className="ve-muted">{user.email}</p>
          {user.age && <p className="ve-muted">{user.age} years old</p>}
          {user.city && <p className="ve-muted">{user.city}</p>}
          {user.gender && <p className="ve-muted">{GENDER_LABELS[user.gender] || user.gender}</p>}
        </div>

        {/* Edit form */}
        <form className="ve-panel ve-profile-form" onSubmit={handleSave}>
          <h3 style={{ margin: '0 0 16px' }}>Edit Profile</h3>

          <label className="ve-profile-label">Bio</label>
          <textarea
            className="ve-field ve-profile-bio"
            placeholder="Tell us about yourself..."
            value={bio}
            onChange={e => setBio(e.target.value)}
            maxLength={300}
            rows={3}
          />

          <label className="ve-profile-label">Birthday</label>
          <input
            className="ve-field"
            type="date"
            value={birthday}
            onChange={e => setBirthday(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />

          <label className="ve-profile-label">City</label>
          <input
            className="ve-field"
            placeholder="e.g. Colombo"
            value={city}
            onChange={e => setCity(e.target.value)}
            maxLength={100}
          />

          <label className="ve-profile-label">Gender</label>
          <select className="ve-field" value={gender} onChange={e => setGender(e.target.value)}>
            <option value="">Select</option>
            <option value="male">පිරිමි (Male)</option>
            <option value="female">ගැහැනු (Female)</option>
            <option value="other">වෙනත් (Other)</option>
          </select>

          {msg && <p style={{ marginTop: 12, textAlign: 'center' }} className={msg.includes('updated') ? 've-ok' : 've-err'}>{msg}</p>}

          <button className="ve-btn ve-btn-primary" style={{ width: '100%', marginTop: 16 }} type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>

        <div className="ve-panel" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Notifications</h3>
          {notifStatus === 'enabled' ? (
            <p className="ve-ok">✓ Push notifications enabled on this device</p>
          ) : (
            <>
              <p className="ve-muted" style={{ marginBottom: 10 }}>Get notified about gifts, messages, and live alerts.</p>
              <button className="ve-btn" onClick={handleEnableNotifications} disabled={notifStatus === 'requesting'}>
                {notifStatus === 'requesting' ? 'Requesting…' : 'Enable notifications'}
              </button>
              {notifStatus === 'error' && <p className="ve-err" style={{ marginTop: 8 }}>{notifMsg}</p>}
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function AdminPage({ user }: { user: AuthUser }) {
  const [cashouts, setCashouts] = useState<Array<Record<string, unknown>>>([])
  const [kycList, setKycList] = useState<Array<Record<string, unknown>>>([])
  const [tab, setTab] = useState<'payouts' | 'kyc'>('payouts')

  useEffect(() => {
    authFetch(`/api/admin/cashout`).then(r => r.json()).then(setCashouts).catch(() => {})
    authFetch('/api/admin/kyc').then(r => r.json()).then(setKycList).catch(() => {})
  }, [])

  async function handleApprove(id: string) {
    await authFetch(`/api/admin/cashout/${id}/approve`, { method: 'POST' })
    authFetch(`/api/admin/cashout`).then(r => r.json()).then(setCashouts).catch(() => {})
  }

  async function handleReject(id: string) {
    await authFetch(`/api/admin/cashout/${id}/reject`, { method: 'POST' })
    authFetch(`/api/admin/cashout`).then(r => r.json()).then(setCashouts).catch(() => {})
  }

  async function handleKyc(id: string, action: 'approve' | 'reject') {
    await authFetch(`/api/admin/kyc/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
    authFetch('/api/admin/kyc').then(r => r.json()).then(setKycList).catch(() => {})
  }

  if (user.role !== 'admin') {
    return <section className="ve-stage" style={{ gridColumn: '2 / -1' }}><div className="ve-topbar">Admin only</div></section>
  }

  return (
    <section className="ve-stage" style={{ gridColumn: '2 / -1' }}>
      <div className="ve-topbar">
        <strong>Admin desk</strong>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`ve-btn${tab === 'payouts' ? ' ve-btn-primary' : ''}`} onClick={() => setTab('payouts')}>Payouts</button>
          <button className={`ve-btn${tab === 'kyc' ? ' ve-btn-primary' : ''}`} onClick={() => setTab('kyc')}>KYC</button>
        </div>
      </div>
      <div style={{ padding: 20 }}>
        {tab === 'payouts' && (
          <div className="ve-panel">
            <h3 style={{ marginTop: 0 }}>Payouts</h3>
            <table className="ve-table">
              <thead>
                <tr><th>User</th><th>Diamonds</th><th>USD</th><th>PayPal</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {cashouts.length === 0 && <tr><td colSpan={6} className="ve-muted">No requests</td></tr>}
                {cashouts.map((c: any) => (
                  <tr key={c.id}>
                    <td>{c.userName || c.userId?.slice(0, 8)}</td>
                    <td>{c.diamonds}</td>
                    <td>${c.amount?.toFixed(2)}</td>
                    <td>{c.paypalEmail || '-'}</td>
                    <td>{c.status}</td>
                    <td>
                      {c.status === 'pending' && (
                        <>
                          <button className="ve-btn ve-btn-primary" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => handleApprove(c.id)}>Pay</button>{' '}
                          <button className="ve-btn" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => handleReject(c.id)}>Reject</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === 'kyc' && (
          <div className="ve-panel">
            <h3 style={{ marginTop: 0 }}>KYC Submissions</h3>
            <table className="ve-table">
              <thead><tr><th>User</th><th>Email</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {(kycList as any[]).length === 0 && <tr><td colSpan={4} className="ve-muted">No submissions</td></tr>}
                {(kycList as any[]).map((k: any) => (
                  <tr key={k.id}>
                    <td>{k.userName || k.userId?.slice(0, 8)}</td>
                    <td>{k.userEmail}</td>
                    <td>{k.status}</td>
                    <td>
                      {k.status === 'pending' && (
                        <>
                          <button className="ve-btn ve-btn-primary" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => handleKyc(k.id, 'approve')}>Approve</button>{' '}
                          <button className="ve-btn" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => handleKyc(k.id, 'reject')}>Reject</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

// ============ NET STATE ============

type NetState = {
  connected: boolean
  error: string | null
  me: NetUser | null
  users: NetUser[]
  chats: NetChat[]
  messages: Record<string, NetMsg[]>
  lives: NetLive[]
  comments: Record<string, NetComment[]>
  openChatId: string | null
  rtcNeedOffer: { liveId: string; viewerId: string; viewerName: string } | null
  rtcFromHost: { type: string; from: string; liveId: string; sdp?: unknown; candidate?: unknown } | null
  giftFlash: string | null
  currentLiveId: string | null
  statuses: Array<{ id: string; userName: string; text: string; age: string; imageUrl?: string | null }>
}

// ============ MAIN APP ============

// Catches render/runtime crashes anywhere in the app and shows the exact
// error message + component stack on-screen instead of a blank "Application
// error" page — makes bugs debuggable on a phone with no devtools access.
class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null; info: string }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null, info: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: { componentStack: string }) {
    this.setState({ info: info.componentStack })
    console.error('[AppErrorBoundary]', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 20, background: '#2a0a12', color: '#fdeef1', minHeight: '100vh', fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap' }}>
          <h2 style={{ color: '#ff6b6b' }}>App crashed — copy this and send it back:</h2>
          <p><strong>{this.state.error.name}: {this.state.error.message}</strong></p>
          <p style={{ opacity: 0.8 }}>{this.state.error.stack}</p>
          <p style={{ opacity: 0.6, marginTop: 16 }}>Component stack:{this.state.info}</p>
          <button
            style={{ marginTop: 16, padding: '10px 20px', background: '#e11d48', color: '#fff', border: 'none', borderRadius: 8 }}
            onClick={() => { this.setState({ error: null, info: '' }); window.location.reload() }}
          >
            Reload app
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function HomeInner() {
  const [page, setPage] = useState<Page>('landing')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authError, setAuthError] = useState('')
  const [threadChatId, setThreadChatId] = useState<string | null>(null)
  const [netState, setNetState] = useState<NetState>({
    connected: false, error: null, me: null, users: [], chats: [], messages: {},
    lives: [], comments: {}, openChatId: null, rtcNeedOffer: null, rtcFromHost: null,
    giftFlash: null, currentLiveId: null, statuses: [],
  })

  // Reliably navigate into a live stream (host's own, or joining someone
  // else's). Previously, clicking another user's live tile only set
  // threadChatId — which LiveStagePage never actually reads — so viewers
  // joining a live they didn't start would silently fail to connect.
  function goToLive(liveId: string) {
    setNetState(n => ({ ...n, currentLiveId: liveId }))
    setThreadChatId(null)
    setPage('liveStage')
  }

  // Immediately add a just-started live to local state so the host lands
  // in LiveStagePage without waiting for the next poll cycle below.
  function registerLive(live: NetLive) {
    setNetState(n => ({ ...n, lives: [live, ...n.lives.filter(l => l.id !== live.id)] }))
  }

  // Live discovery is now plain polling against Firestore on
  // Vercel) instead of a WebSocket "presence" push from the Cloudflare
  // Worker — simpler, and works with zero extra infrastructure.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    const poll = async () => {
      try {
        const res = await authFetch('/api/live/list')
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (cancelled) return
        setNetState(n => ({ ...n, lives: data.lives ?? [] }))
      } catch { /* transient network errors are fine — next poll retries */ }
    }
    poll()
    const id = setInterval(poll, 6000)
    return () => { cancelled = true; clearInterval(id) }
  }, [user?.id])

  const [viewingProfile, setViewingProfile] = useState<{ id: string; name: string; avatarUrl: string | null; city: string | null } | null>(null)
  function goToProfile(u: { id: string; name: string; avatarUrl: string | null; city: string | null }) {
    setViewingProfile(u)
    setPage('publicProfile')
  }

  const [showDailyBonus, setShowDailyBonus] = useState(false)
  const [pushToasts, setPushToasts] = useState<Array<{ id: number; title: string; body: string }>>([])

  // Foreground push notifications (background ones are handled by the
  // service worker instead — see public/firebase-messaging-sw.js).
  useEffect(() => {
    if (!user) return
    let unsubscribe: (() => void) | undefined
    listenForForegroundMessages(payload => {
      const id = Date.now()
      setPushToasts(t => [...t, {
        id,
        title: payload.notification?.title || 'Notification',
        body: payload.notification?.body || '',
      }])
      setTimeout(() => setPushToasts(t => t.filter(x => x.id !== id)), 6000)
    }).then(unsub => { unsubscribe = unsub })
    return () => { unsubscribe?.() }
  }, [user?.id])

  // Restore an existing HTTP session without opening a websocket.
  useEffect(() => {
    const existingToken = getToken()
    if (!existingToken) return
    authFetch('/api/auth/me').then(r => r.ok ? r.json() : Promise.reject())
      .then((meData: any) => {
        setUser({
          id: meData.user.id, name: meData.user.name, email: meData.user.email, role: meData.user.role,
          coins: meData.wallet?.coins ?? 0, diamonds: meData.wallet?.diamonds ?? 0, lifetimeEarned: meData.wallet?.lifetimeEarned ?? 0,
          avatarUrl: meData.profile?.avatarUrl, paypalEmail: meData.profile?.paypalEmail, kycStatus: meData.kyc?.status ?? 'none',
          subscriptions: meData.subscriptions ?? [],
          bio: meData.profile?.bio, birthday: meData.profile?.birthday, city: meData.profile?.city, gender: meData.profile?.gender, age: meData.profile?.age,
        })
        setShowDailyBonus(true)
        setPage(p => p === 'landing' || p === 'register' ? 'home' : p)
      })
      .catch(() => { clearToken() })
  }, [])

  // Load statuses on mount
  useEffect(() => {
    fetch('/api/statuses').then(r => r.json()).then((data: any[]) => {
      setNetState(n => ({
        ...n,
        statuses: (Array.isArray(data) ? data : []).map(s => ({
          id: s.id, userName: s.userName, text: s.text, imageUrl: s.imageUrl, age: new Date(s.createdAt).toLocaleString(),
        })),
      }))
    }).catch(() => {})
  }, [])

  async function completeAuthSuccess(data: any) {
    setToken(data.token)

    const meRes = await authFetch(`/api/auth/me`)
    const meData = await meRes.json()
    const fullUser: AuthUser = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role || 'user',
      coins: meData.wallet?.coins ?? 0,
      diamonds: meData.wallet?.diamonds ?? 0,
      lifetimeEarned: meData.wallet?.lifetimeEarned ?? 0,
      avatarUrl: meData.profile?.avatarUrl,
      paypalEmail: meData.profile?.paypalEmail,
      kycStatus: meData.kyc?.status ?? 'none',
      subscriptions: meData.subscriptions ?? [],
      bio: meData.profile?.bio,
      birthday: meData.profile?.birthday,
      city: meData.profile?.city,
      gender: meData.profile?.gender,
      age: meData.profile?.age,
    }
    setUser(fullUser)
    setShowDailyBonus(true)

    setPage('home')
  }

  // Pure login — only ever calls /api/auth/login. Does NOT fall back to
  // registration on failure; a login failure (wrong password, unknown
  // email) should show as a login error, never as a confusing
  // "account already exists" message.
  async function handleLogin(email: string, password: string) {
    setAuthError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAuthError(data.error || 'Invalid email or password')
        return
      }
      await completeAuthSuccess(data)
    } catch {
      setAuthError('Network error')
    }
  }

  // Pure registration — only ever calls /api/auth/register. Duplicate-email
  // validation lives here (and server-side in the register route) — login
  // never touches this path.
  async function handleRegister(name: string, email: string, password: string) {
    setAuthError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAuthError(data.error || 'Registration failed')
        return
      }
      await completeAuthSuccess(data)
    } catch {
      setAuthError('Network error')
    }
  }

  function handleSetUser(msg: string) {
    if (msg === 'refresh' && user) {
      authFetch(`/api/auth/me`).then(r => r.json()).then(meData => {
        setUser(u => u ? {
          ...u,
          coins: meData.wallet?.coins ?? u.coins,
          diamonds: meData.wallet?.diamonds ?? u.diamonds,
          kycStatus: meData.kyc?.status ?? u.kycStatus,
          avatarUrl: meData.profile?.avatarUrl ?? u.avatarUrl,
          bio: meData.profile?.bio ?? u.bio,
          birthday: meData.profile?.birthday ?? u.birthday,
          city: meData.profile?.city ?? u.city,
          gender: meData.profile?.gender ?? u.gender,
          age: meData.profile?.age ?? u.age,
          subscriptions: meData.subscriptions ?? u.subscriptions,
        } : u)
      }).catch(() => {})
    }
  }

  function handleLogout() {
    clearToken()
    setUser(null as any)
    setShowDailyBonus(false)
    setNetState(n => ({
      ...n,
      connected: false,
      users: [],
      chats: [],
      messages: {},
      lives: [],
      comments: {},
      statuses: [],
      openChatId: null,
      currentLiveId: null,
      giftFlash: null,
    }))
    setPage('landing')
  }

  if (page === 'register') {
    return (
      <div className="ve-app-bg">
        <RegisterPage onRegister={handleRegister} onGoLogin={() => setPage('landing')} />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="ve-app-bg">
        <LandingPage onLogin={handleLogin} onGoRegister={() => setPage('register')} wsError={authError || null} />
      </div>
    )
  }

  return (
    <div className="ve-app-bg">
      <Shell
        page={page} setPage={setPage}
        threadChatId={threadChatId} setThreadChatId={setThreadChatId}
        user={user} setUser={setUser} netState={netState}
        setStatusMsg={handleSetUser} onLogout={handleLogout}
        goToLive={goToLive} goToProfile={goToProfile} viewingProfile={viewingProfile}
        registerLive={registerLive} refreshUser={handleSetUser}
      />
      {showDailyBonus && <DailyBonusModal onClaimed={() => handleSetUser('refresh')} />}
      <PushToast toasts={pushToasts} onDismiss={id => setPushToasts(t => t.filter(x => x.id !== id))} />
    </div>
  )
}

export default function Home() {
  return (
    <AppErrorBoundary>
      <HomeInner />
    </AppErrorBoundary>
  )
}
