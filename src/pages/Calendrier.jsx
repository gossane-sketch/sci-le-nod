import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { PROFILES, MONTHS_FR, DAYS_FR } from '../lib/profiles'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function Calendrier({ userId }) {
  const [calDate, setCalDate] = useState(new Date())
  const [presence, setPresence] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPresence()
    const ch = supabase.channel('presence-ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presence' }, fetchPresence)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [calDate])

  async function fetchPresence() {
    const start = format(startOfMonth(calDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(calDate), 'yyyy-MM-dd')
    const { data } = await supabase.from('presence').select('*').gte('date', start).lte('date', end)
    if (data) setPresence(data)
  }

  async function toggleField(date, profId, field) {
    setSaving(true)
    const dateStr = format(date, 'yyyy-MM-dd')
    const existing = presence.find(p => p.date === dateStr && p.user_id === profId)
    const current = existing ? existing[field] : false
    await supabase.from('presence').upsert({
      ...(existing ? { id: existing.id } : {}),
      user_id: profId, date: dateStr,
      present: existing?.present ?? false,
      animaux: existing?.animaux ?? false,
      invites: existing?.invites ?? false,
      [field]: !current,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,date' })
    setSaving(false)
  }

  const days = eachDayOfInterval({ start: startOfMonth(calDate), end: endOfMonth(calDate) })
  const firstDow = (getDay(days[0]) + 6) % 7

  function getDayPresence(date) {
    const ds = format(date, 'yyyy-MM-dd')
    return presence.filter(p => p.date === ds)
  }

  function getUserPresence(date, profId) {
    const ds = format(date, 'yyyy-MM-dd')
    return presence.find(p => p.date === ds && p.user_id === profId)
  }

  const monthCounts = PROFILES.map(p => ({
    profile: p,
    count: days.filter(d => getUserPresence(d, p.id)?.present).length
  }))

  return (
    <div className="p-4 page-enter">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth()-1, 1))}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-stone-200 text-lg text-gray-500">‹</button>
        <h2 className="text-base font-semibold text-gray-800">{MONTHS_FR[calDate.getMonth()]} {calDate.getFullYear()}</h2>
        <button onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth()+1, 1))}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-stone-200 text-lg text-gray-500">›</button>
      </div>
      <div className="grid grid-cols-7 mb-1">{DAYS_FR.map(d => <div key={d} className="text-center text-xs text-gray-400 py-1">{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-px mb-5">
        {Array.from({length: firstDow}).map((_,i) => <div key={'e'+i} />)}
        {days.map(day => {
          const dp = getDayPresence(day)
          const pp = PROFILES.filter(p => dp.find(r => r.user_id === p.id && r.present))
          const isSel = selectedDate && isSameDay(day, selectedDate)
          const today = isToday(day)
          return (
            <button key={day.toISOString()} onClick={() => setSelectedDate(isSel ? null : day)}
              className="aspect-square flex flex-col items-center justify-center rounded-xl transition-all"
              style={{ background: isSel?'#8B5E3C':today?'#F5EDD8':'white', border: isSel?'2px solid #8B5E3C':today?'1.5px solid #C4873B':'1px solid #E8E0D5' }}>
              <span className="text-xs font-medium" style={{color: isSel?'white':'#374151'}}>{day.getDate()}</span>
              {pp.length > 0 && <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center max-w-5">{pp.map(p => <div key={p.id} className="w-1.5 h-1.5 rounded-full" style={{background: isSel?'rgba(255,255,255,0.8)':p.color}} />)}</div>}
            </button>
          )
        })}
      </div>
      {selectedDate && (
        <div className="bg-white rounded-2xl border border-stone-100 p-4 mb-5">
          <div className="text-sm font-semibold text-gray-700 mb-3">{format(selectedDate, 'EEEE d MMMM', {locale: fr})}{saving && <span className="ml-2 text-xs text-gray-400">Enregistrement…</span>}</div>
          {PROFILES.map(p => {
            const rec = getUserPresence(selectedDate, p.id)
            return (
              <div key={p.id} className="flex items-center justify-between py-2.5 border-t border-stone-50">
                <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full flex items-center justify-center text-sm" style={{background:p.bg}}>{p.petIcon}</div><span className="text-sm font-medium text-gray-700">{p.name}</span></div>
                <div className="flex items-center gap-3">
                  {[{field:'present',label:'Présent·e'},{field:'animaux',label:p.petIcon},{field:'invites',label:'👥'}].map(({field,label}) => (
                    <div key={field} className="flex flex-col items-center gap-0.5">
                      <button onClick={() => toggleField(selectedDate, p.id, field)} className={`toggle-switch ${rec?.[field]?'on':''}`} />
                      <span className="text-xs text-gray-400">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div className="bg-white rounded-2xl border border-stone-100 p-4">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Présences ce mois</div>
        {monthCounts.map(({profile:p, count}) => (
          <div key={p.id} className="flex items-center gap-3 mb-2">
            <div className="w-20 text-sm text-gray-600 flex items-center gap-1.5"><span>{p.petIcon}</span><span>{p.short}</span></div>
            <div className="flex-1 h-5 bg-stone-50 rounded-full overflow-hidden">
              <div className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                style={{width:`${Math.round(count/days.length*100)}%`,background:p.color,minWidth:count>0?'2rem':0}}>
                {count>0 && <span className="text-white text-xs">{count}j</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
