import { useState, useEffect } from 'react'
import { PROFILES } from './lib/profiles'
import Calendrier from './pages/Calendrier'
import Comptes from './pages/Comptes'
import Budget from './pages/Budget'
import Reunion from './pages/Reunion'

const PAGES = [
  { id: 'cal',    label: 'Calendrier', icon: '📅' },
  { id: 'comptes', label: 'Comptes',   icon: '💶' },
  { id: 'budget', label: 'Budget',     icon: '📊' },
  { id: 'reunion', label: 'Réunion',   icon: '📋' },
]

export default function App() {
  const [userId, setUserId] = useState(() => localStorage.getItem('nid_user') || null)
  const [page, setPage] = useState('cal')

  const profile = PROFILES.find(p => p.id === userId)

  function selectUser(id) {
    setUserId(id)
    localStorage.setItem('nid_user', id)
  }

  function logout() {
    setUserId(null)
    localStorage.removeItem('nid_user')
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
           style={{ background: 'linear-gradient(160deg, #F5EDD8 0%, #FAF6F0 50%, #E8F5EE 100%)' }}>
        <div className="text-5xl mb-3">🪺</div>
        <h1 className="text-2xl font-semibold text-nid-warm mb-1">SCI Le Nid</h1>
        <p className="text-sm text-gray-500 mb-8">Qui êtes-vous aujourd'hui ?</p>
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          {PROFILES.map(p => (
            <button key={p.id} onClick={() => selectUser(p.id)}
              className="rounded-2xl p-5 text-center border-2 transition-all active:scale-95"
              style={{ background: p.bg, borderColor: p.color + '40' }}>
              <div className="text-3xl mb-2">{p.petIcon}</div>
              <div className="font-semibold text-gray-800">{p.name}</div>
              <div className="text-xs mt-1" style={{ color: p.color }}>{p.pets}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FAF6F0', maxWidth: 520, margin: '0 auto' }}>
      {/* Topbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-stone-100 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🪺</span>
          <span className="font-semibold text-nid-warm">SCI Le Nid</span>
        </div>
        <button onClick={logout}
          className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border transition"
          style={{ borderColor: profile.color + '60', color: profile.color, background: profile.bg }}>
          <span>{profile.petIcon}</span>
          <span>{profile.name}</span>
        </button>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {page === 'cal'    && <Calendrier userId={userId} />}
        {page === 'comptes' && <Comptes userId={userId} />}
        {page === 'budget' && <Budget userId={userId} />}
        {page === 'reunion' && <Reunion userId={userId} />}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 flex z-10"
           style={{ maxWidth: 520, margin: '0 auto', left: '50%', transform: 'translateX(-50%)', width: '100%' }}>
        {PAGES.map(p => (
          <button key={p.id} onClick={() => setPage(p.id)}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 pb-3 transition-colors text-xs"
            style={{ color: page === p.id ? '#8B5E3C' : '#9CA3AF' }}>
            <span className="text-xl leading-none">{p.icon}</span>
            <span className={page === p.id ? 'font-semibold' : ''}>{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
