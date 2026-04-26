import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getProfile, PROFILES } from '../lib/profiles'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function Reunion({ userId }) {
  const [reunionDate, setReunionDate] = useState('')
  const [points, setPoints] = useState([])
  const [newPoint, setNewPoint] = useState('')
  const [convoc, setConvoc] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [gouvId, setGouvId] = useState(null)

  useEffect(() => {
    fetchAll()
    const ch1 = supabase.channel('gouv').on('postgres_changes', { event: '*', schema: 'public', table: 'gouvernance' }, fetchAll).subscribe()
    const ch2 = supabase.channel('oj').on('postgres_changes', { event: '*', schema: 'public', table: 'ordre_du_jour' }, fetchAll).subscribe()
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2) }
  }, [])

  async function fetchAll() {
    const { data: g } = await supabase.from('gouvernance').select('*').limit(1).single()
    if (g) { setReunionDate(g.reunion_date || ''); setGouvId(g.id) }
    const { data: oj } = await supabase.from('ordre_du_jour').select('*').order('created_at')
    if (oj) setPoints(oj)
    setLoading(false)
  }

  async function saveDate(val) {
    setReunionDate(val)
    if (gouvId) {
      await supabase.from('gouvernance').update({ reunion_date: val || null, updated_at: new Date().toISOString() }).eq('id', gouvId)
    } else {
      await supabase.from('gouvernance').insert({ reunion_date: val || null })
    }
  }

  async function addPoint() {
    if (!newPoint.trim()) return
    await supabase.from('ordre_du_jour').insert({
      par: userId, texte: newPoint.trim(), reunion_date: reunionDate || null
    })
    setNewPoint('')
  }

  async function deletePoint(id) {
    await supabase.from('ordre_du_jour').delete().eq('id', id)
  }

  function generateConvoc() {
    const dateLabel = reunionDate
      ? format(parseISO(reunionDate), "EEEE d MMMM yyyy", { locale: fr })
      : '(date à définir)'
    const ojItems = ['Analyse du budget (point fixe)', ...points.map(p => p.texte)]
      .map((item, i) => `   ${i + 1}. ${item}`).join('\n')
    const text = `CONVOCATION — ASSEMBLÉE SCI LE NID
${'═'.repeat(38)}

Date : ${dateLabel}
Membres convoqués : Frédérique, Raphaël, José, Virginia

ORDRE DU JOUR
${ojItems}

${'─'.repeat(38)}
Points proposés par :
${PROFILES.map(p => {
  const mine = points.filter(pt => pt.user_id === p.id || pt.par === p.id)
  return mine.length > 0 ? `  ${p.name} : ${mine.map(m => m.texte).join(', ')}` : null
}).filter(Boolean).join('\n') || '  (aucun point attribué)'}
${'─'.repeat(38)}

Merci de confirmer votre présence.

La gérance — SCI Le Nid`
    setConvoc(text)
  }

  async function copyConvoc() {
    await navigator.clipboard.writeText(convoc)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const grouped = PROFILES.map(p => ({
    profile: p,
    points: points.filter(pt => pt.par === p.id)
  }))

  if (loading) return <div className="p-6 text-center text-gray-400">Chargement…</div>

  return (
    <div className="p-4 page-enter">
      <div className="bg-white rounded-2xl border border-stone-100 p-4 mb-4">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Prochaine réunion</div>
        <input type="date" value={reunionDate} onChange={e => saveDate(e.target.value)}
          className="w-full border border-stone-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:border-nid-accent" />
        {reunionDate && (
          <div className="mt-2 text-sm text-nid-warm font-medium">
            📅 {format(parseISO(reunionDate), "EEEE d MMMM yyyy", { locale: fr })}
          </div>
        )}
      </div>
      <div className="bg-white rounded-2xl border border-stone-100 p-4 mb-4">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Proposer un point</div>
        <div className="flex gap-2">
          <input value={newPoint} onChange={e => setNewPoint(e.target.value)}
            placeholder="Votre idée pour l'ordre du jour..."
            className="flex-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-nid-accent"
            onKeyDown={e => e.key === 'Enter' && addPoint()} />
          <button onClick={addPoint}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-white active:scale-95"
            style={{ background: '#8B5E3C' }}>+</button>
        </div>
      </div>
      <div className="mb-4">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contributions de chacun</div>
        <div className="bg-stone-50 rounded-xl border border-dashed border-stone-200 px-4 py-3 mb-2 flex items-center gap-2">
          <span className="text-sm text-gray-400 italic">📌 Analyse du budget (point fixe)</span>
        </div>
        {grouped.map(({ profile: p, points: pts }) => (
          <div key={p.id} className="mb-2">
            {pts.length > 0 && (
              <div className="rounded-xl border border-stone-100 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2" style={{ background: p.bg }}>
                  <span className="text-sm">{p.petIcon}</span>
                  <span className="text-sm font-medium" style={{ color: p.color }}>{p.name}</span>
                  <span className="text-xs" style={{ color: p.color, opacity: 0.6 }}>{pts.length} point{pts.length > 1 ? 's' : ''}</span>
                </div>
                {pts.map(pt => (
                  <div key={pt.id} className="flex items-center justify-between px-3 py-2.5 bg-white border-t border-stone-50 group">
                    <span className="text-sm text-gray-700">{pt.texte}</span>
                    <button onClick={() => deletePoint(pt.id)} className="text-red-300 text-xs ml-2 opacity-0 group-hover:opacity-100 transition">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {points.length === 0 && (
          <div className="text-center text-gray-300 text-sm py-4">Personne n'a encore proposé de points</div>
        )}
      </div>
      {points.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 p-4 mb-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Ordre du jour complet</div>
          <div className="space-y-1.5">
            <div className="flex items-start gap-3">
              <span className="text-xs font-semibold text-gray-300 mt-0.5 w-4">1</span>
              <span className="text-sm text-gray-500 italic">Analyse du budget</span>
            </div>
            {points.map((pt, i) => {
              const prof = getProfile(pt.par)
              return (
                <div key={pt.id} className="flex items-start gap-3">
                  <span className="text-xs font-semibold text-gray-300 mt-0.5 w-4">{i + 2}</span>
                  <div className="flex-1">
                    <span className="text-sm text-gray-700">{pt.texte}</span>
                    <span className="text-xs ml-2" style={{ color: prof.color }}>({prof.short})</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      <button onClick={generateConvoc}
        className="w-full py-4 rounded-2xl text-base font-semibold text-white mb-4 active:scale-95 transition"
        style={{ background: '#4A7C59' }}>
        Générer la convocation
      </button>
      {convoc && (
        <div className="bg-white rounded-2xl border border-stone-100 p-4">
          <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">{convoc}</pre>
          <button onClick={copyConvoc}
            className="mt-3 w-full py-2.5 rounded-xl border text-sm transition active:scale-95"
            style={copied
              ? { background: '#E8F5EE', color: '#4A7C59', borderColor: '#BBE8CC' }
              : { background: 'white', color: '#6B7280', borderColor: '#E5E7EB' }}>
            {copied ? '✓ Copié !' : 'Copier la convocation'}
          </button>
        </div>
      )}
    </div>
    )
}
