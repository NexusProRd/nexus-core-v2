'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import type { SocioTienda } from '@/types/database'
import { getPlanLabel, getPlanColor, getStatusLabel, getStatusColor } from '@/lib/commercial'
import { ModalBokeh } from '@/components/pcc/BokehBackground'

function diasRestantes(fecha: string | null): number | null {
  if (!fecha) return null
  const diff = new Date(fecha).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatearDinero(valor: number): string {
  return `RD$ ${valor.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface TokenModalState {
  abierto: boolean
  tiendaId: string
  nombreTienda: string
}

export default function PccTiendasPage() {
  const [tiendas, setTiendas] = useState<SocioTienda[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [filtroPlan, setFiltroPlan] = useState<string>('')
  const [filtroStatus, setFiltroStatus] = useState<string>('')
  const [mostrarEliminadas, setMostrarEliminadas] = useState(false)
  const [tokenModal, setTokenModal] = useState<TokenModalState>({ abierto: false, tiendaId: '', nombreTienda: '' })
  const [tokenInput, setTokenInput] = useState(1)
  const [enviandoTokens, setEnviandoTokens] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string | null>(null)

  const [eliminarModal, setEliminarModal] = useState<{ abierto: boolean; id: string; nombre: string }>({ abierto: false, id: '', nombre: '' })
  const [eliminando, setEliminando] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [metricsMap, setMetricsMap] = useState<Record<string, { ventas: number; ganancia: number; pedidos: number }>>({})
  const [detalleModal, setDetalleModal] = useState<{ abierto: boolean; tiendaId: string }>({ abierto: false, tiendaId: '' })
  const [detalleData, setDetalleData] = useState<any>(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchAccion, setBatchAccion] = useState<string | null>(null)
  const [batchDias, setBatchDias] = useState(30)
  const [batchTokens, setBatchTokens] = useState(5)
  const [accionAbierta, setAccionAbierta] = useState<string | null>(null)
  const [accionRect, setAccionRect] = useState<{ top: number; right: number } | null>(null)
  const [restaurarModal, setRestaurarModal] = useState<{ abierto: boolean; tiendaId: string; nombre: string }>({ abierto: false, tiendaId: '', nombre: '' })
  const [backupsDisponibles, setBackupsDisponibles] = useState<any[]>([])
  const [cargandoBackups, setCargandoBackups] = useState(false)
  const [restaurandoBackup, setRestaurandoBackup] = useState<string | null>(null)
  const [recuperacionModal, setRecuperacionModal] = useState<{ abierto: boolean; tienda: SocioTienda | null }>({ abierto: false, tienda: null })
  const [limiteModal, setLimiteModal] = useState<{ abierto: boolean; tiendaId: string; nombreTienda: string; limiteActual: number }>({ abierto: false, tiendaId: '', nombreTienda: '', limiteActual: 50 })
  const [limiteInput, setLimiteInput] = useState(50)
  const [guardandoLimite, setGuardandoLimite] = useState(false)
  const [generandoEnlace, setGenerandoEnlace] = useState(false)
  const [enlaceGenerado, setEnlaceGenerado] = useState('')
  const [regenerandoCodigo, setRegenerandoCodigo] = useState(false)
  const [nuevoCodigo, setNuevoCodigo] = useState('')
  const supabase = createClient()

  const cargar = async (showLoading = false) => {
    if (showLoading) setCargando(true)
    const { data } = await supabase.from('tiendas').select('*')
    if (data) setTiendas(data as SocioTienda[])

    const { data: pedidos } = await supabase
      .from('pedidos')
      .select('id_tienda, total, ganancia_neta')
      .in('estado', ['entregado', 'confirmado'])
    const m: Record<string, { ventas: number; ganancia: number; pedidos: number }> = {}
    for (const p of pedidos || []) {
      if (!m[p.id_tienda]) m[p.id_tienda] = { ventas: 0, ganancia: 0, pedidos: 0 }
      m[p.id_tienda].ventas += Number(p.total ?? 0)
      m[p.id_tienda].ganancia += Number(p.ganancia_neta ?? 0)
      m[p.id_tienda].pedidos++
    }
    setMetricsMap(m)

    setUltimaActualizacion(new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
    if (showLoading) setCargando(false)
  }

  useEffect(() => {
    ;(async () => {
      await cargar(true)
    })()
    const interval = setInterval(() => cargar(), 30000)
    return () => clearInterval(interval)
  }, [])

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return tiendas.filter(t => {
      if (!mostrarEliminadas && t.soft_deleted_at) return false
      if (q && !t.nombre_tienda.toLowerCase().includes(q) && !(t.nombre_socio || '').toLowerCase().includes(q) && !t.whatsapp_num?.includes(q)) return false
      if (filtroPlan && t.plan_tipo !== filtroPlan) return false
      if (filtroStatus && t.plan_status !== filtroStatus) return false
      return true
    })
  }, [tiendas, busqueda, filtroPlan, filtroStatus, mostrarEliminadas])

  async function logError(modulo: string, accion: string, detalle: string, metadata: Record<string, unknown>) {
    try { await supabase.from('nexus_logs').insert({ modulo, accion, detalle, metadata }) } catch {}
  }

  const abrirRestaurarBackup = async (idTienda: string, nombre: string) => {
    setRestaurarModal({ abierto: true, tiendaId: idTienda, nombre })
    setCargandoBackups(true)
    setBackupsDisponibles([])
    try {
      const { data } = await supabase
        .from('nexus_backups')
        .select('id, tipo, size_bytes, created_at')
        .eq('id_tienda', idTienda)
        .order('created_at', { ascending: false })
        .limit(10)
      if (data) setBackupsDisponibles(data)
    } catch {}
    setCargandoBackups(false)
  }

  const ejecutarRestauracion = async (backupId: string) => {
    if (!confirm('¿Restaurar este backup? Los datos actuales de la tienda se sobrescribirán.')) return
    setRestaurandoBackup(backupId)
    try {
      const res = await fetch(`/api/pcc/backups/${backupId}/restore`, { method: 'POST' })
      const j = await res.json()
      if (j.restored) {
        alert('Backup restaurado exitosamente' + (j.errors?.length ? ` (${j.errors.length} errores)` : ''))
        setRestaurarModal({ abierto: false, tiendaId: '', nombre: '' })
      } else {
        alert(j.error || 'Error al restaurar')
      }
    } catch { alert('Error de conexión') }
    setRestaurandoBackup(null)
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleEliminarTienda = async () => {
    const id = eliminarModal.id
    if (!id) return
    setEliminando(true)
    const { error } = await supabase
      .from('tiendas')
      .update({ soft_deleted_at: new Date().toISOString(), esta_activa: false })
      .eq('id', id)
    if (error) {
      setDeleteError(`Error al eliminar: ${error.message}`)
    } else {
      setTiendas(prev => prev.map(t => t.id === id ? { ...t, soft_deleted_at: new Date().toISOString(), esta_activa: false } : t))
      await supabase.from('nexus_logs').insert({
        modulo: 'Logistica', accion: 'Tienda eliminada (soft)',
        detalle: `Tienda: ${eliminarModal.nombre}`,
        metadata: { id_tienda: id },
      })
    }
    setEliminando(false)
    setEliminarModal({ abierto: false, id: '', nombre: '' })
  }

  const handleEliminarPermanente = async (id: string, nombre: string) => {
    if (!window.confirm(`⚠️ ¿Eliminar PERMANENTEMENTE "${nombre}"?\n\nSe borrarán TODOS sus datos: productos, pedidos, perfil, cupones, etc. Esta acción NO se puede deshacer.`)) return
    const { error } = await supabase.rpc('eliminar_tienda_completa', { tienda_id: id })
    if (error) {
      await logError('Logistica', 'Eliminación permanente fallida', error.message, { tiendaId: id })
      return
    }
    setTiendas(prev => prev.filter(t => t.id !== id))
    await supabase.from('nexus_logs').insert({
      modulo: 'Logistica', accion: 'Tienda eliminada permanentemente',
      detalle: `Tienda: ${nombre}`,
      metadata: { id_tienda: id },
    })
  }

  function sumarMeses(fecha: string | null, meses: number): string | null {
    if (!fecha) return null
    const d = new Date(fecha)
    d.setMonth(d.getMonth() + meses)
    return d.toISOString()
  }

  const handleRecargarTokens = async () => {
    if (tokenInput <= 0) return
    setEnviandoTokens(true)
    const tienda = tiendas.find(t => t.id === tokenModal.tiendaId)
    if (!tienda) { setEnviandoTokens(false); return }
    const nuevos = (tienda.tokens_disponibles || 0) + tokenInput
    const meses = tokenInput
    const updates: Record<string, string | number | null> = {
      tokens_disponibles: nuevos,
      fecha_vencimiento: sumarMeses(tienda.fecha_vencimiento, meses),
      fecha_bloqueo_panel: sumarMeses(tienda.fecha_bloqueo_panel, meses),
      fecha_suspension_catalogo: sumarMeses(tienda.fecha_suspension_catalogo, meses),
      fecha_eliminacion_total: sumarMeses(tienda.fecha_eliminacion_total, meses),
    }
    const { error } = await supabase.from('tiendas').update(updates).eq('id', tokenModal.tiendaId)
    if (error) {
      await logError('Sistema', 'Recarga de tokens fallida', error.message, { tiendaId: tokenModal.tiendaId, tokensIntentados: tokenInput })
      setEnviandoTokens(false); return
    }
    setTiendas(prev => prev.map(t => t.id === tokenModal.tiendaId ? {
      ...t, tokens_disponibles: nuevos,
      fecha_vencimiento: sumarMeses(t.fecha_vencimiento, meses),
      fecha_bloqueo_panel: sumarMeses(t.fecha_bloqueo_panel, meses),
      fecha_suspension_catalogo: sumarMeses(t.fecha_suspension_catalogo, meses),
      fecha_eliminacion_total: sumarMeses(t.fecha_eliminacion_total, meses),
    } : t))
    setEnviandoTokens(false)
    setTokenModal({ abierto: false, tiendaId: '', nombreTienda: '' })
    setTokenInput(1)
  }

  const handleCambiarLimite = async () => {
    if (limiteInput < 1 || limiteInput > 99999) return
    setGuardandoLimite(true)
    const { error } = await supabase.from('tiendas').update({ token_productos_limite: limiteInput }).eq('id', limiteModal.tiendaId)
    if (!error) {
      setTiendas(prev => prev.map(t => t.id === limiteModal.tiendaId ? { ...t, token_productos_limite: limiteInput } : t))
    }
    setGuardandoLimite(false)
    setLimiteModal({ abierto: false, tiendaId: '', nombreTienda: '', limiteActual: 50 })
  }

  const handleLoginAs = (t: SocioTienda) => {
    fetch('/api/auth/login-as', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tiendaId: t.id, tipo: 'pcc-admin' }),
    }).then(() => window.open('/dashboard', '_blank'))
  }

  const handleLoginAsColaborador = async (t: SocioTienda) => {
    setCargando(true)
    const res = await fetch(`/api/colaboradores/primer?id_tienda=${t.id}`)
    if (res.ok) {
      const col = await res.json()
      await fetch('/api/auth/login-as', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiendaId: t.id, tipo: 'colaborador' }),
      })
      window.open('/dashboard', '_blank')
    }
    setCargando(false)
  }

  const handleGenerarEnlace = async (tienda: SocioTienda) => {
    setGenerandoEnlace(true)
    const res = await fetch('/api/pcc/recuperacion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tienda.id, action: 'generar-enlace' }),
    })
    const data = await res.json()
    if (res.ok) {
      setEnlaceGenerado(data.link)
    }
    setGenerandoEnlace(false)
  }

  const handleRegenerarCodigo = async (tienda: SocioTienda) => {
    if (!confirm(`¿Regenerar código de verificación para ${tienda.nombre_tienda}? El código anterior dejará de funcionar.`)) return
    setRegenerandoCodigo(true)
    const res = await fetch('/api/pcc/recuperacion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tienda.id, action: 'regenerar-codigo' }),
    })
    const data = await res.json()
    if (res.ok) {
      setNuevoCodigo(data.codigo)
    }
    setRegenerandoCodigo(false)
  }

  const handleMarcarResuelto = async (id: string) => {
    await fetch('/api/pcc/recuperacion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'marcar-resuelto' }),
    })
    setTiendas(prev => prev.map(t => t.id === id ? { ...t, solicita_cambio: false } : t))
    setRecuperacionModal({ abierto: false, tienda: null })
    setEnlaceGenerado('')
    setNuevoCodigo('')
  }

  const abrirDetalle = async (tiendaId: string) => {
    setDetalleModal({ abierto: true, tiendaId })
    setCargandoDetalle(true)
    setDetalleData(null)
    const res = await fetch(`/api/pcc/tiendas/${tiendaId}/detalle`)
    if (res.ok) {
      const json = await res.json()
      setDetalleData(json)
    }
    setCargandoDetalle(false)
  }

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

  const ejecutarBatch = async (accion: string) => {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    setBatchAccion(accion)
    const supabase = createClient()

    for (const id of ids) {
      switch (accion) {
        case 'activar': {
          await supabase.from('tiendas').update({ esta_activa: true, fecha_bloqueo_panel: null }).eq('id', id)
          break
        }
        case 'suspender': {
          await supabase.from('tiendas').update({ fecha_bloqueo_panel: new Date().toISOString() }).eq('id', id)
          break
        }
        case 'extender': {
          const { data: t } = await supabase.from('tiendas').select('fecha_vencimiento').eq('id', id).single()
          const actual = t?.fecha_vencimiento ? new Date(t.fecha_vencimiento) : new Date()
          actual.setDate(actual.getDate() + batchDias)
          await supabase.from('tiendas').update({ fecha_vencimiento: actual.toISOString() }).eq('id', id)
          break
        }
        case 'recargar': {
          const { data: t } = await supabase.from('tiendas').select('tokens_disponibles, fecha_vencimiento').eq('id', id).single()
          const nuevosTokens = (t?.tokens_disponibles || 0) + batchTokens
          const nuevaFecha = t?.fecha_vencimiento ? new Date(t.fecha_vencimiento) : new Date()
          nuevaFecha.setMonth(nuevaFecha.getMonth() + 1)
          await supabase.from('tiendas').update({
            tokens_disponibles: nuevosTokens,
            fecha_vencimiento: nuevaFecha.toISOString(),
          }).eq('id', id)
          break
        }
        case 'eliminar': {
          await supabase.from('tiendas').update({ soft_deleted_at: new Date().toISOString(), esta_activa: false }).eq('id', id)
          break
        }
      }
    }

    setBatchAccion(null)
    setSelectedIds(new Set())
    cargar()
  }

  const handleAprobar = async (t: SocioTienda) => {
    const { error } = await supabase.from('tiendas').update({ esta_activa: true }).eq('id', t.id)
    if (error) { await logError('Logistica', 'Aprobación fallida', error.message, { tiendaId: t.id }); return }
    setTiendas(prev => prev.map(s => s.id === t.id ? { ...s, esta_activa: true } : s))
    const msg = encodeURIComponent(
      `¡Hola ${t.nombre_tienda}! Nos complace indicarte que fue aprobado tu registro y puedes comenzar a configurar tu tienda y publicar tus productos. 🎉\n\n💡 Recuerda que tienes 7 días para probar el servicio gratis. Si estás interesado en adquirir más tokens para extender tu plan, estaremos para servirte.\n\nAquí tienes los enlaces de tu negocio:\n🔐 Panel de Configuración (Dashboard): http://localhost:3000/login\n🏪 Tu Catálogo Público: http://localhost:3000/catalogo/${t.id}\n\n¡Mucho éxito con tus ventas! Estamos aquí para lo que necesites. 🚀`
    )
    window.open(`https://wa.me/${t.whatsapp_num.replace(/\D/g, '')}?text=${msg}`, '_blank')
  }

  const handleRestaurar = async (id: string) => {
    const tienda = tiendas.find(t => t.id === id) as any
    if (!tienda) return

    const { data: conflictosWhatsapp } = await supabase
      .from('tiendas')
      .select('id, nombre_tienda')
      .eq('whatsapp_num', tienda.whatsapp_num)
      .is('soft_deleted_at', null)
      .neq('id', id)
      .maybeSingle()

    const { data: conflictosSlug } = await supabase
      .from('tiendas')
      .select('id, nombre_tienda')
      .eq('slug', tienda.slug)
      .is('soft_deleted_at', null)
      .neq('id', id)
      .maybeSingle()

    const updates: Record<string, any> = { soft_deleted_at: null, esta_activa: true }
    const advertencias: string[] = []

    if (conflictosWhatsapp) {
      updates.whatsapp_num = ''
      advertencias.push(`El WhatsApp (${tienda.whatsapp_num}) ya lo usa ${conflictosWhatsapp.nombre_tienda}. Se limpió el número.`)
    }
    if (conflictosSlug) {
      const nuevoSlug = `${tienda.slug}-restaurada-${Date.now().toString(36)}`
      updates.slug = nuevoSlug
      advertencias.push(`El slug (${tienda.slug}) ya lo usa ${conflictosSlug.nombre_tienda}. Slug cambiado a "${nuevoSlug}".`)
    }

    const confirmar = advertencias.length > 0
      ? window.confirm(`⚠️ Conflictos detectados:\n\n${advertencias.join('\n')}\n\n¿Restaurar de todas formas?`)
      : true

    if (!confirmar) return

    const { error } = await supabase.from('tiendas').update(updates).eq('id', id)
    if (error) { await logError('Logistica', 'Restauración fallida', error.message, { tiendaId: id }); return }
    setTiendas(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  const handleToggleSuspender = async (t: SocioTienda) => {
    if (t.esta_activa && (!t.fecha_bloqueo_panel || diasRestantes(t.fecha_bloqueo_panel)! > 0)) {
      const { error } = await supabase.from('tiendas').update({
        esta_activa: false,
        fecha_bloqueo_panel: new Date().toISOString(),
      }).eq('id', t.id)
      if (!error) setTiendas(prev => prev.map(s => s.id === t.id ? { ...s, esta_activa: false, fecha_bloqueo_panel: new Date().toISOString() } : s))
    } else {
      const { error } = await supabase.from('tiendas').update({
        esta_activa: true,
        fecha_bloqueo_panel: null,
      }).eq('id', t.id)
      if (!error) setTiendas(prev => prev.map(s => s.id === t.id ? { ...s, esta_activa: true, fecha_bloqueo_panel: null } : s))
    }
  }

  const enhanced = useMemo(() => filtradas.map(t => ({
    ...t,
    _dv: diasRestantes(t.fecha_vencimiento),
    _db: diasRestantes(t.fecha_bloqueo_panel),
    _ds: diasRestantes(t.fecha_suspension_catalogo),
    _ma: accionAbierta === t.id,
  })), [filtradas, accionAbierta])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">Gestión de Tiendas</h1>
            <p className="text-sm text-gray-500 mt-1">
              {tiendas.length} socio(s) registrados
              {ultimaActualizacion && <span className="text-gray-400 font-normal ml-1">· Actualizado {ultimaActualizacion}</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => cargar(true)} disabled={cargando}
              className="px-3 py-2 text-sm font-bold bg-white text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm">
              {cargando ? '🔄' : '🔄 Refrescar'}
            </button>
            <div className="relative w-full sm:w-56 min-w-[200px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o WhatsApp..."
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-gray-400 shadow-sm" />
            </div>
            <select value={filtroPlan} onChange={e => setFiltroPlan(e.target.value)}
              className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm">
              <option value="">Todos los planes</option>
              <option value="emprendedor">Emprendedor</option>
              <option value="pro">Pro</option>
            </select>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
              className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm">
              <option value="">Todos los estados</option>
              <option value="trial">Trial</option>
              <option value="active">Activo</option>
              <option value="grace">Gracia</option>
              <option value="dashboard_suspended">Panel Suspendido</option>
              <option value="catalog_suspended">Catálogo Suspendido</option>
              <option value="deleted">Eliminado</option>
            </select>
            <button onClick={() => setMostrarEliminadas(!mostrarEliminadas)}
              className={`px-3 py-2.5 text-sm font-bold rounded-xl border transition-colors shadow-sm ${
                mostrarEliminadas
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}>
              🗑️ {mostrarEliminadas ? 'Ocultar eliminadas' : 'Ver eliminadas'}
            </button>
          </div>
        </div>
        </header>

        {/* Batch actions bar */}
        {selectedIds.size > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-indigo-700 mr-2">{selectedIds.size} seleccionada(s)</span>
            <button onClick={() => ejecutarBatch('activar')} disabled={batchAccion !== null}
              className="px-3 py-1.5 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 disabled:opacity-50 transition-colors">✅ Activar</button>
            <button onClick={() => ejecutarBatch('suspender')} disabled={batchAccion !== null}
              className="px-3 py-1.5 text-xs font-bold bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors">⛔ Suspender</button>
            <div className="flex items-center gap-1">
              <button onClick={() => ejecutarBatch('extender')} disabled={batchAccion !== null}
                className="px-3 py-1.5 text-xs font-bold bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 transition-colors">📅 Extender</button>
              <input type="number" value={batchDias} onChange={e => setBatchDias(Math.max(1, parseInt(e.target.value) || 30))}
                className="w-14 px-1.5 py-1 text-xs border border-blue-200 rounded-lg bg-white text-center font-bold text-blue-700" />
              <span className="text-xs text-blue-600">días</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => ejecutarBatch('recargar')} disabled={batchAccion !== null}
                className="px-3 py-1.5 text-xs font-bold bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 disabled:opacity-50 transition-colors">🪙 Recargar</button>
              <input type="number" value={batchTokens} onChange={e => setBatchTokens(Math.max(1, parseInt(e.target.value) || 5))}
                className="w-14 px-1.5 py-1 text-xs border border-amber-200 rounded-lg bg-white text-center font-bold text-amber-700" />
              <span className="text-xs text-amber-600">tokens</span>
            </div>
            <button onClick={() => ejecutarBatch('eliminar')} disabled={batchAccion !== null}
              className="px-3 py-1.5 text-xs font-bold bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 disabled:opacity-50 transition-colors">🗑️ Eliminar</button>
            <button onClick={() => setSelectedIds(new Set())} disabled={batchAccion !== null}
              className="px-3 py-1.5 text-xs font-bold bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors ml-auto">Deseleccionar</button>
            {batchAccion && <span className="text-xs text-indigo-600 ml-2">Procesando...</span>}
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden lg:block bg-white shadow-md rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4 w-10">
                    <input type="checkbox" checked={selectedIds.size === filtradas.length && filtradas.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                  </th>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tienda / WhatsApp</th>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="p-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Ventas</th>
                  <th className="p-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Ganancia Neta</th>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Vencimiento</th>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cascada</th>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Recuperación</th>
                  <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
              {true ? enhanced.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <input type="checkbox" checked={selectedIds.has(t.id)}
                      onChange={() => toggleSelect(t.id)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                  </td>
                  <td className="p-4">
                    <button onClick={() => abrirDetalle(t.id)} className="text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors text-left">{t.nombre_tienda}</button>
                    <p className="text-[11px] text-gray-400 mt-0.5">👤 {t.nombre_socio || 'Sin nombre'}</p>
                    {t.whatsapp_num && (
                      <a href={`https://wa.me/${t.whatsapp_num.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                        className="block text-xs text-emerald-600 hover:text-emerald-700 font-medium mt-1.5">📱 {t.whatsapp_num}</a>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getPlanColor(t.plan_tipo)}`}>{getPlanLabel(t.plan_tipo)}</span>
                      {t.is_founder && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">🌟 Fundador</span>
                      )}
                      {t.tokens_disponibles > 0 && (
                        <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">🪙 {t.tokens_disponibles}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <p className="text-sm font-bold text-gray-900">{formatearDinero(metricsMap[t.id]?.ventas ?? 0)}</p>
                    <p className="text-[11px] text-gray-400">{metricsMap[t.id]?.pedidos ?? 0} pedido(s)</p>
                  </td>
                  <td className="p-4 text-right">
                    <p className={`text-sm font-bold ${(metricsMap[t.id]?.ganancia ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatearDinero(metricsMap[t.id]?.ganancia ?? 0)}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-gray-700">{formatearFecha(t.fecha_vencimiento)}</p>
                    {t._dv !== null && (
                      <span className={`text-[11px] font-semibold ${t._dv <= 3 ? 'text-red-600' : t._dv <= 7 ? 'text-amber-600' : 'text-gray-400'}`}>
                        {t._dv <= 0 ? `${Math.abs(t._dv)} dia(s) vencido` : `${t._dv} dia(s)`}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      {t.fecha_bloqueo_panel && (
                        <p className={`text-[11px] font-medium ${t._db !== null && t._db <= 0 ? 'text-red-600' : 'text-amber-600'}`}>
                          {t._db !== null && t._db <= 0 ? '🔴 Panel bloqueado' : `🟡 Panel: ${formatearFecha(t.fecha_bloqueo_panel)}`}
                        </p>
                      )}
                      {t.fecha_suspension_catalogo && (
                        <p className={`text-[11px] font-medium ${t._ds !== null && t._ds <= 0 ? 'text-red-600' : 'text-amber-600'}`}>
                          {t._ds !== null && t._ds <= 0 ? '🔴 Catalogo suspendido' : `🟡 Catalogo: ${formatearFecha(t.fecha_suspension_catalogo)}`}
                        </p>
                      )}
                      {!t.fecha_bloqueo_panel && !t.fecha_suspension_catalogo && (
                        <span className="text-[11px] text-gray-400">Sin restricciones</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full ${getStatusColor(t.plan_status)}`}>{getStatusLabel(t.plan_status)}</span>
                  </td>
                  <td className="p-4 text-center">
                    {(t as any).solicita_cambio ? (
                      <button onClick={() => setRecuperacionModal({ abierto: true, tienda: t })}
                        className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg hover:bg-amber-100 transition-colors whitespace-nowrap">
                        🔴 Solicitó cambio
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="p-4">
                    <button onClick={e => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      if (accionAbierta === t.id) {
                        setAccionAbierta(null)
                        setAccionRect(null)
                      } else {
                        setAccionAbierta(t.id)
                        setAccionRect({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                      }
                    }}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                    {accionAbierta === t.id && accionRect && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => { setAccionAbierta(null); setAccionRect(null) }} />
                        <div className="fixed z-50 w-48 bg-white rounded-xl shadow-xl border border-slate-200/80 py-1.5 animate-fade-in"
                          style={{ top: accionRect.top, right: accionRect.right }}>
                          {!t.esta_activa && !t.soft_deleted_at && (
                            <button onClick={() => (handleAprobar(t), setAccionAbierta(null), setAccionRect(null))}
                              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors">
                              ✅ Aprobar tienda
                            </button>
                          )}
                          <button onClick={() => (setTokenModal({ abierto: true, tiendaId: t.id, nombreTienda: t.nombre_tienda }), setAccionAbierta(null), setAccionRect(null))}
                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors">
                            🪙 Recargar tokens
                          </button>
                          <button onClick={() => (abrirRestaurarBackup(t.id, t.nombre_tienda), setAccionAbierta(null), setAccionRect(null))}
                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium text-sky-700 hover:bg-sky-50 transition-colors">
                            📦 Restaurar backup
                          </button>
                          {t.soft_deleted_at && (
                            <>
                              <button onClick={() => (handleRestaurar(t.id), setAccionAbierta(null), setAccionRect(null))}
                                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors">
                                🔄 Restaurar tienda
                              </button>
                              <button onClick={() => (handleEliminarPermanente(t.id, t.nombre_tienda), setAccionAbierta(null), setAccionRect(null))}
                                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50 transition-colors">
                                🗑️ Eliminar permanentemente
                              </button>
                            </>
                          )}
                          <button onClick={() => (handleLoginAs(t), setAccionAbierta(null), setAccionRect(null))}
                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 transition-colors">
                            🕵️ Entrar como socio
                          </button>
                          <button onClick={() => (setLimiteModal({ abierto: true, tiendaId: t.id, nombreTienda: t.nombre_tienda, limiteActual: t.token_productos_limite || 50 }), setLimiteInput(t.token_productos_limite || 50), setAccionAbierta(null), setAccionRect(null))}
                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors">
                            📦 Límite productos
                          </button>
                          <button onClick={() => (setRecuperacionModal({ abierto: true, tienda: t }), setAccionAbierta(null), setAccionRect(null))}
                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors">
                            🔑 Recuperación
                          </button>
                          <div className="h-px bg-slate-100 my-1" />
                          <button onClick={() => (handleToggleSuspender(t), setAccionAbierta(null), setAccionRect(null))}
                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium text-orange-700 hover:bg-orange-50 transition-colors">
                            {t.esta_activa ? '⛔ Suspender tienda' : '✅ Activar tienda'}
                          </button>
                          <button onClick={() => (setEliminarModal({ abierto: true, id: t.id, nombre: t.nombre_tienda }), setDeleteError(''), setAccionAbierta(null), setAccionRect(null))}
                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50 transition-colors">
                            🗑️ Eliminar tienda
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              )) : null}
              </tbody>
            </table>
          </div>
          {filtradas.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-400">No se encontraron tiendas</div>
          )}
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden space-y-3">
          {true ? enhanced.map(t => (
            <div key={t.id} className="bg-white shadow-md rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={selectedIds.has(t.id)}
                  onChange={() => toggleSelect(t.id)}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <button onClick={() => abrirDetalle(t.id)} className="text-sm font-bold text-gray-900 hover:text-indigo-600 transition-colors text-left">{t.nombre_tienda}</button>
                      <p className="text-[11px] text-gray-400 mt-0.5">👤 {t.nombre_socio || 'Sin nombre'}</p>
                      {t.whatsapp_num && (
                        <a href={`https://wa.me/${t.whatsapp_num.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                          className="block text-xs text-emerald-600 font-medium mt-1">📱 {t.whatsapp_num}</a>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full ${getStatusColor(t.plan_status)}`}>{getStatusLabel(t.plan_status)}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPlanColor(t.plan_tipo)}`}>{getPlanLabel(t.plan_tipo)}</span>
                      {t.is_founder && (
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-50 text-purple-700 border border-purple-200">🌟 Fundador</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 rounded-xl p-2.5">
                      <p className="text-gray-400">Ventas</p>
                      <p className="font-bold text-gray-900">{formatearDinero(metricsMap[t.id]?.ventas ?? 0)}</p>
                      <p className="text-gray-400">{metricsMap[t.id]?.pedidos ?? 0} pedido(s)</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2.5">
                      <p className="text-gray-400">Ganancia Neta</p>
                      <p className={`font-bold ${(metricsMap[t.id]?.ganancia ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatearDinero(metricsMap[t.id]?.ganancia ?? 0)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Vence: {formatearFecha(t.fecha_vencimiento)}</span>
                    {t._dv !== null && (
                      <span className={`font-semibold ${t._dv <= 3 ? 'text-red-600' : t._dv <= 7 ? 'text-amber-600' : 'text-gray-400'}`}>
                        {t._dv <= 0 ? `-${Math.abs(t._dv)}d` : `${t._dv}d`}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <button onClick={() => setAccionAbierta(t._ma ? null : t.id)}
                      className="w-full py-2.5 text-xs font-bold bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors">
                      ... Acciones
                    </button>
                    {t._ma && (
                      <div>
                        <div className="fixed inset-0 z-40" onClick={() => setAccionAbierta(null)} />
                        <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-white rounded-xl shadow-xl border border-slate-200/80 py-1.5 animate-fade-in">
                          {!t.esta_activa && !t.soft_deleted_at && (
                            <button onClick={() => (handleAprobar(t), setAccionAbierta(null))}
                              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors">✅ Aprobar tienda</button>
                          )}
                          <button onClick={() => (setTokenModal({ abierto: true, tiendaId: t.id, nombreTienda: t.nombre_tienda }), setAccionAbierta(null))}
                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors">🪙 Recargar tokens</button>
                          <button onClick={() => (abrirRestaurarBackup(t.id, t.nombre_tienda), setAccionAbierta(null))}
                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium text-sky-700 hover:bg-sky-50 transition-colors">📦 Restaurar backup</button>
                          {t.soft_deleted_at && (
                            <>
                              <button onClick={() => (handleRestaurar(t.id), setAccionAbierta(null))}
                                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors">🔄 Restaurar tienda</button>
                              <button onClick={() => (handleEliminarPermanente(t.id, t.nombre_tienda), setAccionAbierta(null))}
                                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50 transition-colors">🗑️ Eliminar permanentemente</button>
                            </>
                          )}
                          <button onClick={() => (handleLoginAs(t), setAccionAbierta(null))}
                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 transition-colors">🕵️ Entrar como socio</button>
                          <button onClick={() => (setLimiteModal({ abierto: true, tiendaId: t.id, nombreTienda: t.nombre_tienda, limiteActual: t.token_productos_limite || 50 }), setLimiteInput(t.token_productos_limite || 50), setAccionAbierta(null))}
                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors">📦 Límite productos</button>
                          <div className="h-px bg-slate-100 my-1" />
                          <button onClick={() => (handleToggleSuspender(t), setAccionAbierta(null))}
                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium text-orange-700 hover:bg-orange-50 transition-colors">
                            {t.esta_activa ? '⛔ Suspender tienda' : '✅ Activar tienda'}
                          </button>
                          <button onClick={() => (setEliminarModal({ abierto: true, id: t.id, nombre: t.nombre_tienda }), setDeleteError(''), setAccionAbierta(null))}
                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50 transition-colors">🗑️ Eliminar tienda</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )) : null}
          {filtradas.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-400">No se encontraron tiendas</div>
          )}
        </div>

        {/* Eliminar Modal */}
        {eliminarModal.abierto && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => (setEliminarModal({ abierto: false, id: '', nombre: '' }), setDeleteError(''))}>
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200/80 relative overflow-hidden" onClick={e => e.stopPropagation()}>
              <ModalBokeh />
              <div className="text-center mb-5">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-rose-100 flex items-center justify-center">
                  <span className="text-3xl">⚠️</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Eliminar Tienda</h3>
                <p className="text-sm text-gray-500 mt-2">¿Eliminar <strong className="text-gray-700">{eliminarModal.nombre}</strong>?</p>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 mt-4">
                  <p className="text-xs font-bold text-rose-700 uppercase tracking-wide">⚠️ Esta acción no se puede deshacer</p>
                  <p className="text-xs text-rose-600 mt-2 leading-relaxed">
                    Se borrarán <strong>todos</strong> los datos de esta tienda de forma permanente: productos, pedidos, perfil, regalos, tickets, cupones, colaboradores, logs, backups y la tienda misma. <strong className="text-rose-800">No hay recuperación posible.</strong>
                  </p>
                </div>
                {deleteError && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 mt-2">{deleteError}</p>}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEliminarModal({ abierto: false, id: '', nombre: '' })}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
                <button onClick={handleEliminarTienda} disabled={eliminando}
                  className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-sm">
                  {eliminando ? 'Eliminando...' : '🗑️ Eliminar permanentemente'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Límite Productos Modal */}
        {limiteModal.abierto && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
            onClick={() => setLimiteModal({ abierto: false, tiendaId: '', nombreTienda: '', limiteActual: 50 })}>
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200/80 relative overflow-hidden" onClick={e => e.stopPropagation()}>
              <ModalBokeh />
              <div className="text-center mb-5">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-2xl">📦</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Límite de Productos</h3>
                <p className="text-sm text-gray-500 mt-1">{limiteModal.nombreTienda}</p>
                <p className="text-xs text-gray-400 mt-1">Actual: {limiteModal.limiteActual} productos</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nuevo límite máximo</label>
                  <input type="number" min={1} max={99999} value={limiteInput}
                    onChange={e => setLimiteInput(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-3 text-center text-2xl font-extrabold text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setLimiteModal({ abierto: false, tiendaId: '', nombreTienda: '', limiteActual: 50 })}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
                  <button onClick={handleCambiarLimite} disabled={guardandoLimite || limiteInput < 1 || limiteInput > 99999}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
                    {guardandoLimite ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Token Recarga Modal */}
        {tokenModal.abierto && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
            onClick={() => setTokenModal({ abierto: false, tiendaId: '', nombreTienda: '' })}>
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200/80 relative overflow-hidden" onClick={e => e.stopPropagation()}>
              <ModalBokeh />
              <div className="text-center mb-5">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-amber-100 flex items-center justify-center">
                  <span className="text-2xl">🪙</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Recargar Tokens</h3>
                <p className="text-sm text-gray-500 mt-1">{tokenModal.nombreTienda}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cantidad de tokens (meses)</label>
                  <input type="number" min={1} value={tokenInput}
                    onChange={e => setTokenInput(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-3 text-center text-2xl font-extrabold text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setTokenModal({ abierto: false, tiendaId: '', nombreTienda: '' })}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
                  <button onClick={handleRecargarTokens} disabled={enviandoTokens || tokenInput <= 0}
                    className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-sm">
                    {enviandoTokens ? 'Recargando...' : '🪙 Recargar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recuperación Modal */}
        {recuperacionModal.abierto && recuperacionModal.tienda && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
            onClick={() => { setRecuperacionModal({ abierto: false, tienda: null }); setEnlaceGenerado(''); setNuevoCodigo('') }}>
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200/80 relative overflow-hidden" onClick={e => e.stopPropagation()}>
              <ModalBokeh />
              <div className="text-center mb-5">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-amber-100 flex items-center justify-center">
                  <span className="text-2xl">🔑</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Recuperación de contraseña</h3>
                <p className="text-sm text-gray-500 mt-1">{recuperacionModal.tienda.nombre_tienda}</p>
              </div>

              {/* Preguntas de seguridad */}
              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <p className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wide">Preguntas de seguridad del socio</p>
                {(recuperacionModal.tienda as any).preguntas_recuperacion?.length > 0 ? (
                  <div className="space-y-3">
                    {(recuperacionModal.tienda as any).preguntas_recuperacion.map((p: any, i: number) => (
                      <div key={i} className="bg-white rounded-lg p-3 border border-slate-200">
                        <p className="text-sm font-semibold text-slate-700">{p.pregunta}</p>
                        <p className="text-sm text-emerald-700 font-bold mt-1">→ {p.respuesta}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Sin preguntas registradas</p>
                )}
              </div>

              {/* Generar enlace */}
              <div className="space-y-3">
                {!enlaceGenerado ? (
                  <button onClick={() => handleGenerarEnlace(recuperacionModal.tienda!)}
                    disabled={generandoEnlace}
                    className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
                    {generandoEnlace ? 'Generando...' : '🔗 Generar enlace de recuperación'}
                  </button>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-blue-700 uppercase">Enlace generado (15 min)</p>
                    <div className="bg-white rounded-lg px-3 py-2 border border-blue-200">
                      <p className="text-sm text-blue-900 break-all font-medium">{enlaceGenerado}</p>
                    </div>
                    <button onClick={() => {
                      navigator.clipboard.writeText(enlaceGenerado)
                      const waMsg = encodeURIComponent(`Aquí tienes tu enlace para restablecer tu contraseña (válido por 15 minutos): ${enlaceGenerado}`)
                      window.open(`https://wa.me/${(recuperacionModal.tienda as any).whatsapp_num}?text=${waMsg}`, '_blank')
                    }}
                      className="w-full py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors shadow-sm flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                      Enviar al socio por WhatsApp
                    </button>
                  </div>
                )}

                {/* Regenerar código */}
                <div className="border-t border-slate-200 pt-3">
                  {!nuevoCodigo ? (
                    <button onClick={() => handleRegenerarCodigo(recuperacionModal.tienda!)}
                      disabled={regenerandoCodigo}
                      className="w-full py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-sm">
                      {regenerandoCodigo ? 'Generando...' : '🔄 Regenerar código de verificación'}
                    </button>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                      <p className="text-xs font-bold text-amber-700 uppercase mb-2">Nuevo código de verificación</p>
                      <p className="text-2xl font-bold text-amber-800 tracking-widest">{nuevoCodigo}</p>
                      <p className="text-xs text-amber-600 mt-2">Comparte este código con el socio por WhatsApp.</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button onClick={() => { setRecuperacionModal({ abierto: false, tienda: null }); setEnlaceGenerado(''); setNuevoCodigo('') }}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                    Cerrar
                  </button>
                  <button onClick={() => handleMarcarResuelto(recuperacionModal.tienda!.id)}
                    className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-colors shadow-sm">
                    ✅ Marcar como resuelto
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
