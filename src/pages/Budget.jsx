import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format, addMonths } from 'date-fns'
import { fr } from 'date-fns/locale'
import { MONTHS_FR } from '../lib/profiles'

export default function Budget({ userId }) {
  const [tab, setTab] = useState(0)
  const [lignes, setLignes] = useState([])
  const [newLine, setNewLine] = useState({ label: '', montant: '', type: 'charge' })
  const [loading, setLoading] = useState(true)

  const moisCourant = format(new Date(), 'yyyy-MM')
  const moisProchain = format(addMonths(new Date(), 1), 'yyyy-MM')
  const moisActif = tab === 0 ? moisCourant : moisProchain

  const moisLabel = (m) => {
    const [y, mo] = m.split('-')
    return `${MONTHS_FR[parseInt(mo) - 1]} ${y}`
  }

  useEffect(() => {
    fetchLignes()
    const ch = supabase.channel('budget-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_lignes' }, fetchLignes)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function fetchLignes() {
    const { data } = await supabase.from('budget_lignes').select('*').order('created_at')
    if (data) setLignes(data)
    setLoading(false)
  }

  async function addLigne() {
    if (!newLine.label || !newLine.montant) return
    await supabase.from('budget_lignes').insert({
      type: newLine.type, mois: moisActif,
      label: newLine.label, montant: parseFloat(newLine.montant)
    })
    setNewLine({ label: '', montant: '', type: 'charge' })
  }

  async function deleteLigne(id) {
    await supabase.from('budget_lignes').delete().eq('id', id)
  }

  async function duplicateToNext() {
    const current = lignes.filter(l => l.mois === moisCourant)
    const nextExisting = lignes.filter(l => l.mois === moisProchain)
    if (nextExisting.length > 0) return
    await supabase.from('budget_lignes').insert(
      current.map(l => ({ type: l.type, mois: moisProchain, label: l.label, montant: l.montant }))
    )
  }

  const charges = lignes.filter(l => l.mois === moisActif && l.type === 'charge')
  const recettes = lignes.filter(l => l.mois === moisActif && l.type === 'recette')
  const totalCharges = charges.reduce((s, l) => s + parseFloat(l.montant), 0)
  const totalRecettes = recettes.reduce((s, l) => s + parseFloat(l.montant), 0)
  const solde = totalRecettes - totalCharges

  const moisPrecedent = format(addMonths(new Date(), -1), 'yyyy-MM')
  const chargesPrec = lignes.filter(l => l.mois === moisPrecedent && l.type === 'charge')
  const recettesPrec = lignes.filter(l => l.mois === moisPrecedent && l.type === 'recette')
  const totalChargesPrec = chargesPrec.reduce((s, l) => s + parseFloat(l.montant), 0)
  const totalRecettesPrec = recettesPrec.reduce((s, l) => s + parseFloat(l.montant), 0)

  if (loading) return <div className="p-6 text-center text-gray-400">Chargement…</div>

  return (
    <div className="p-4 page-enter">
      <div className="flex gap-2 mb-4">
        {[moisLabel(moisCourant), moisLabel(moisProchain)].map((label, i) => (
          <button key={i} onClick={() => setTab(i)}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all"
            style={tab === i
              ? { background: '#8B5E3C', color: 'white', borderColor: '#8B5E3C' }
              : { background: 'white', color: '#6B7280', borderColor: '#E5E7EB' }}>
            {label}
          </button>
        ))}
      </div>
      <div className="rounded-2xl p-4 mb-4 text-center"
        style={{ background: solde >= 0 ? '#E8F5EE' : '#FEF2F2', border: `1px solid ${solde >= 0 ? '#BBE8CC' : '#FECACA'}` }}>
        <div className="text-xs font-semibold uppercase tracking-wide mb-1"
          style={{ color: solde >= 0 ? '#4A7C59' : '#991B1B' }}>Solde prévisionnel</div>
        <div className="text-3xl font-semibold" style={{ color: solde >= 0 ? '#4A7C59' : '#DC2626' }}>
          {solde >= 0 ? '+' : ''}{solde.toFixed(2)} ₼
        </div>
        {tab === 0 && totalChargesPrec > 0 && (
          <div className="text-xs mt-1" style={{ color: solde >= 0 ? '#4A7C59' : '#991B1B', opacity: 0.7 }}>
            Mois précédent : {(totalRecettesPrec - totalChargesPrec).toFixed(2)} ₼
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-red-50 rounded-xl p-3 border border-red-100">
          <div className="text-xs text-red-400 font-medium mb-1">Total charges</div>
          <div className="text-xl font-semibold text-red-700">{totalCharges.toFixed(2)} ₼</div>
        </div>
        <div className="rounded-xl p-3 border" style={{ background: '#E8F5EE', borderColor: '#BBE8CC' }}>
          <div className="text-xs font-medium mb-1" style={{ color: '#4A7C59' }}>Total recettes</div>
          <div className="text-xl font-semibold" style={{ color: '#2D5E3A' }}>{totalRecettes.toFixed(2)} ₼</div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-stone-100 p-4 mb-3">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex justify-between">
          <span>Charges</span><span className="text-red-400">{totalCharges.toFixed(2)} ₼</span>
        </div>
        {charges.map(l => (
          <div key={l.id} className="flex justify-between items-center py-2 border-t border-stone-50 group">
            <span className="text-sm text-gray-700">{l.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-800">{parseFloat(l.montant).toFixed(2)} ₼</span>
              <button onClick={() => deleteLigne(l.id)} className="text-red-300 text-xs opacity-0 group-hover:opacity-100 transition">✕</button>
            </div>
          </div>
        ))}
        {charges.length === 0 && <div className="text-xs text-gray-300 py-2">Aucune charge</div>}
      </div>
      <div className="bg-white rounded-2xl border border-stone-100 p-4 mb-4">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex justify-between">
          <span>Recettes</span><span style={{ color: '#4A7C59' }}>{totalRecettes.toFixed(2)} ₼</span>
        </div>
        {recettes.map(l => (
          <div key={l.id} className="flex justify-between items-center py-2 border-t border-stone-50 group">
            <span className="text-sm text-gray-700">{l.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: '#4A7C59' }}>{parseFloat(l.montant).toFixed(2)} ₼</span>
              <button onClick={() => deleteLigne(l.id)} className="text-red-300 text-xs opacity-0 group-hover:opacity-100 transition">✕</button>
            </div>
          </div>
        ))}
        {recettes.length === 0 && <div className="text-xs text-gray-300 py-2">Aucune recette</div>}
      </div>
      <div className="bg-white rounded-2xl border border-stone-100 p-4 mb-4">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Ajouter une ligne</div>
        <div className="flex gap-2 mb-2">
          {['charge', 'recette'].map(t => (
            <button key={t} onClick={() => setNewLine(n => ({ ...n, type: t }))}
              className="flex-1 py-2 rounded-xl text-sm border transition"
              style={newLine.type === t
                ? { background: t === 'charge' ? '#FEE2E2' : '#E8F5EE', color: t === 'charge' ? '#DC2626' : '#4A7C59', borderColor: t === 'charge' ? '#FECACA' : '#BBE8CC' }
                : { background: 'white', color: '#9CA3AF', borderColor: '#E5E7EB' }}>
              {t === 'charge' ? 'Charge' : 'Recette'}
            </button>
          ))}
        </div>
        <input value={newLine.label} onChange={e => setNewLine(n => ({ ...n, label: e.target.value }))}
          placeholder="Libellé" className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm mb-2 focus:outline-none focus:border-nid-accent" />
        <div className="flex gap-2">
          <input value={newLine.montant} onChange={e => setNewLine(n => ({ ...n, montant: e.target.value }))}
            type="number" placeholder="Montant ₼"
            className="flex-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-nid-accent"
            onKeyDown={e => e.key === 'Enter' && addLigne()} />
          <button onClick={addLigne}
            className="px-5 rounded-xl text-sm font-medium text-white active:scale-95"
            style={{ background: '#8B5E3C' }}>Ajouter</button>
        </div>
      </div>
      {tab === 0 && lignes.filter(l => l.mois === moisProchain).length === 0 && charges.length > 0 && (
        <button onClick={duplicateToNext}
          className="w-full py-3 rounded-xl border border-dashed border-stone-300 text-sm text-gray-400 active:bg-stone-50">
          Dupliquer ce budget pour {moisLabel(moisProchain)} →
        </button>
      )}
    </div>
  )
}
