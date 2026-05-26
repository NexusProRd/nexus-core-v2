'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import type { NexusAnuncio, NexusAnuncioTipo } from '@/types/database'

const TIPOS: { value: NexusAnuncioTipo; label: string; icon: string; color: string }[] = [
  { value: 'actualizacion', label: 'Actualización', icon: '🚀', color: 'purple' },
  { value: 'mantenimiento', label: 'Mantenimiento', icon: '🔧', color: 'amber' },
  { value: 'aviso_pago', label: 'Aviso de Pago', icon: '⚠️', color: 'rose' },
]

export default function PccAnunciosPage() {
  const [anuncios, setAnuncios] = useState<NexusAnuncio[]>([])
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [tipo, setTipo] = useState<NexusAnuncioTipo>('actualizacion')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    const { data } = await supabase.from('nexus_anuncios').select('*').order('created_at', { ascending: false })
    if (data) setAnuncios(data as NexusAnuncio[])
  }

  const handlePublicar = async () => {
    if (!titulo.trim()) return
    setEnviando(true)
    setError('')
    const { error: insertError } = await supabase.from('nexus_anuncios').insert({
      titulo: titulo.trim(),
      contenido: contenido.trim() || '',
      tipo,
      activo: true,
    })
    if (insertError) {
      setError(insertError.message)
    } else {
      setTitulo('')
      setContenido('')
      setTipo('actualizacion')
      await cargar()
    }
    setEnviando(false)
  }

  const toggleActivo = async (a: NexusAnuncio) => {
    const { error: updateError } = await supabase.from('nexus_anuncios').update({ activo: !a.activo }).eq('id', a.id)
    if (!updateError) await cargar()
  }

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar este anuncio permanentemente?')) return
    const { error: deleteError } = await supabase.from('nexus_anuncios').delete().eq('id', id)
    if (!deleteError) await cargar()
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
        <header>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Publicar Anuncios Masivos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Los anuncios activos aparecen en la barra lateral del dashboard de todos los socios.
          </p>
        </header>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Nuevo Anuncio</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TIPOS.map(t => (
              <button key={t.value} onClick={() => setTipo(t.value)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  tipo === t.value
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}>
                <span className="text-lg">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Título</label>
            <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej: Nueva actualación de plataforma"
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:ring-2 focus:ring-violet-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Contenido (opcional)</label>
            <textarea value={contenido} onChange={e => setContenido(e.target.value)} rows={3} placeholder="Explica los detalles del anuncio..."
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:ring-2 focus:ring-violet-500 outline-none resize-none" />
          </div>
          <button onClick={handlePublicar} disabled={enviando || !titulo.trim()}
            className="w-full sm:w-auto px-6 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-bold hover:brightness-110 disabled:opacity-50 transition-all shadow-sm">
            {enviando ? 'Publicando...' : '📢 Publicar Anuncio'}
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  {['Tipo', 'Título', 'Estado', 'Creado', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {anuncios.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="px-4 py-3.5">
                      {(() => {
                        const t = TIPOS.find(t => t.value === a.tipo)
                        return (
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                            t?.color === 'purple' ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300' :
                            t?.color === 'amber' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' :
                            'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300'
                          }`}>
                            {t?.icon} {t?.label || a.tipo}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{a.titulo}</p>
                      {a.contenido && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{a.contenido}</p>}
                    </td>
                    <td className="px-4 py-3.5">
                      <button onClick={() => toggleActivo(a)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-colors ${
                          a.activo
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}>
                        {a.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-400">
                      {new Date(a.created_at).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3.5">
                      <button onClick={() => eliminar(a.id)}
                        className="px-3 py-1.5 text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors">
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {anuncios.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-400">No hay anuncios publicados aún</div>
          )}
        </div>

        <div className="lg:hidden space-y-3">
          {anuncios.map(a => (
            <div key={a.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
              {(() => {
                const t = TIPOS.find(t => t.value === a.tipo)
                return <p className="text-xs font-bold">{t?.icon} {t?.label || a.tipo}</p>
              })()}
              <p className="text-sm font-bold text-slate-900 dark:text-white">{a.titulo}</p>
              {a.contenido && <p className="text-xs text-slate-400">{a.contenido}</p>}
              <div className="flex items-center justify-between pt-1">
                <button onClick={() => toggleActivo(a)}
                  className={`text-xs font-bold px-2.5 py-1 rounded-full border ${a.activo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {a.activo ? 'Activo' : 'Inactivo'}
                </button>
                <button onClick={() => eliminar(a.id)} className="text-xs text-rose-600 font-semibold">Eliminar</button>
              </div>
            </div>
          ))}
          {anuncios.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-400">No hay anuncios</div>
          )}
        </div>
      </div>
    </div>
  )
}
