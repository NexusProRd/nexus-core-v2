'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import type { SocioTienda } from '@/types/database'

const PLANTILLA_DEFAULT = `Hola *{nombre_tienda}* 👋

Te escribimos desde Nexus para recordarte que tu suscripción *{plan}* está activa. 

Si necesitas asistencia, responde este mensaje.

Saludos,
Equipo Nexus`

export default function WhatsAppBroadcastPage() {
  const [tiendas, setTiendas] = useState<SocioTienda[]>([])
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState(PLANTILLA_DEFAULT)
  const [filtroPlan, setFiltroPlan] = useState<string>('')
  const [busqueda, setBusqueda] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [enviando, setEnviando] = useState(false)
  const [enviados, setEnviados] = useState(0)
  const supabase = createClient()

  const cargar = useCallback(async () => {
    const { data } = await supabase.from('tiendas').select('*').order('nombre_tienda')
    if (data) setTiendas(data as SocioTienda[])
    setCargando(false)
  }, [supabase])

  useEffect(() => { cargar() }, [cargar])

  const filtradas = useMemo(() => {
    return tiendas.filter(t => {
      const matchBusq = !busqueda || t.nombre_tienda.toLowerCase().includes(busqueda.toLowerCase()) || t.whatsapp_num?.includes(busqueda)
      const matchPlan = !filtroPlan || t.plan_tipo === filtroPlan
      return matchBusq && matchPlan && t.whatsapp_num
    })
  }, [tiendas, busqueda, filtroPlan])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtradas.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtradas.map(t => t.id)))
    }
  }

  const reemplazarVariables = (texto: string, t: SocioTienda): string => {
    return texto
      .replace(/{nombre_tienda}/g, t.nombre_tienda)
      .replace(/{plan}/g, t.plan_tipo || 'Sin plan')
      .replace(/{whatsapp}/g, t.whatsapp_num || '')
      .replace(/{vencimiento}/g, t.fecha_vencimiento ? new Date(t.fecha_vencimiento).toLocaleDateString('es-DO') : 'N/A')
  }

  const enviarBroadcast = async () => {
    setEnviando(true)
    setEnviados(0)
    const targets = filtradas.filter(t => selectedIds.has(t.id) && t.whatsapp_num)

    for (const t of targets) {
      const texto = reemplazarVariables(mensaje, t)
      const url = `https://wa.me/${t.whatsapp_num.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`
      window.open(url, '_blank')
      setEnviados(prev => prev + 1)
      await new Promise(r => setTimeout(r, 800))
    }

    setEnviando(false)
  }

  const plantillasRapidas = [
    { label: 'Recordatorio suscripción', texto: PLANTILLA_DEFAULT },
    { label: 'Promoción', texto: '¡Hola *{nombre_tienda}*! Tenemos una promoción especial para ti. Contáctanos para más detalles.' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">WhatsApp Broadcast</h1>
          <p className="text-sm text-gray-500">Envía mensajes masivos a tus tiendas vía WhatsApp</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Message editor */}
          <div className="lg:col-span-3 space-y-4">
            {/* Templates rápidas */}
            <div className="bg-white shadow-md rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Plantillas rápidas</p>
              <div className="flex gap-2 flex-wrap">
                {plantillasRapidas.map(p => (
                  <button key={p.label} onClick={() => setMensaje(p.texto)}
                    className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors">
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message editor */}
            <div className="bg-white shadow-md rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Mensaje</p>
              <p className="text-[10px] text-gray-400 mb-2">Variables disponibles: {'{nombre_tienda}'}, {'{plan}'}, {'{whatsapp}'}, {'{vencimiento}'}</p>
              <textarea value={mensaje} onChange={e => setMensaje(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-y font-mono" />
            </div>

            {/* Preview */}
            {selectedIds.size === 1 && (
              <div className="bg-white shadow-md rounded-2xl p-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Vista previa</p>
                <div className="bg-emerald-50 rounded-xl p-4 text-sm text-gray-800 whitespace-pre-wrap font-mono">
                  {reemplazarVariables(mensaje, filtradas.find(t => t.id === [...selectedIds][0]) || filtradas[0])}
                </div>
              </div>
            )}

            {/* Send button */}
            <button onClick={enviarBroadcast} disabled={enviando || selectedIds.size === 0 || !mensaje.trim()}
              className="w-full py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2">
              {enviando ? (
                <>Enviando {enviados}/{selectedIds.size}...</>
              ) : (
                <>📤 Enviar Broadcast a {selectedIds.size} tienda(s)</>
              )}
            </button>
          </div>

          {/* Right: Store selector */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white shadow-md rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Seleccionar tiendas</p>

              <div className="flex gap-2 mb-3">
                <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar..."
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-gray-400" />
                <select value={filtroPlan} onChange={e => setFiltroPlan(e.target.value)}
                  className="px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Todos</option>
                  <option value="emprendedor">Emprendedor</option>
                  <option value="pro">Pro</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs text-gray-600 mb-2 cursor-pointer">
                <input type="checkbox" checked={selectedIds.size === filtradas.length && filtradas.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                Seleccionar todos ({filtradas.length})
              </label>

              <div className="space-y-1 max-h-96 overflow-y-auto">
                {filtradas.map(t => (
                  <label key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={selectedIds.has(t.id)}
                      onChange={() => toggleSelect(t.id)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{t.nombre_tienda}</p>
                      <p className="text-[10px] text-gray-400 truncate">{t.whatsapp_num || 'Sin WhatsApp'}</p>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase shrink-0">{t.plan_tipo}</span>
                  </label>
                ))}
                {filtradas.length === 0 && (
                  <p className="text-xs text-gray-400 py-4 text-center">No hay tiendas con WhatsApp</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
