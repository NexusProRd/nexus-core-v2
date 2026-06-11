'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProductoRowActions from './ProductoRowActions'
import ProductoForm from '@/components/inventario/ProductoForm'
import ProductoModal from '@/components/inventario/ProductoModal'
import { formatCurrency } from '@/lib/utils'
import { esIlimitado } from '@/lib/commercial'
import { toggleStock } from './actions'
import ImportadorCSV from './ImportadorCSV'
import { getTiendaIdFromCookie } from '@/lib/cookie-utils'
import { usePermisos } from '@/context/PermisosContext'
import { useToast } from '@/components/Toast'
import { useDashboard } from '../DashboardContext'
import type { TallaVariant } from '@/types/database'

interface Producto {
  id: string
  id_tienda: string
  nombre: string
  descripcion: string | null
  categoria: string | null
  precio: number
  precio_oferta: number | null
  costo_compra: number
  stock: number
  in_stock: boolean
  imagen_url: string | null
  unidad_medida: string | null
  tallas: (string | TallaVariant)[]
  tipo_articulo: string | null
}

export default function InventarioClient({ tiendaId, tipoNegocio = 'estandar', productos: initial, categorias = [], tokenProductosLimite, isFounder }: { tiendaId: string; tipoNegocio?: string; productos: Producto[]; categorias?: string[]; tokenProductosLimite: number | null; isFounder: boolean }) {
  const { permisos } = usePermisos()
  const { toast } = useToast()
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroTalla, setFiltroTalla] = useState('')
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [productos, setProductos] = useState(initial)
  const [importOpen, setImportOpen] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [reservados, setReservados] = useState<Set<string>>(new Set())
  const [whatsappSoporte, setWhatsappSoporte] = useState('')
  const { currencyCode } = useDashboard()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetch('/api/config/whatsapp-soporte').then(r => r.json()).then(d => { if (d.numero) setWhatsappSoporte(d.numero) }).catch(() => {})
  }, [])

  const limiteAlcanzado = !isFounder && tokenProductosLimite !== null && tokenProductosLimite > 0 && productos.length >= tokenProductosLimite

  useEffect(() => {
    const cargarReservados = async () => {
      const sessionId = await getTiendaIdFromCookie()
      if (!sessionId) return
      const { data } = await supabase
        .from('gift_experiences')
        .select('items_list')
        .eq('store_id', sessionId)
        .eq('status', 'approved')
        .not('items_list', 'eq', '[]')
      if (data) {
        const ids = new Set<string>()
        for (const g of data) {
          const items = (g.items_list as { product_id: string }[]) || []
          for (const item of items) {
            ids.add(item.product_id)
          }
        }
        setReservados(ids)
      }
    }
    cargarReservados()
  }, [])

  useEffect(() => {
    const canal = supabase
      .channel('inventario-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos', filter: `id_tienda=eq.${tiendaId}` }, async () => {
        const { data } = await supabase.from('productos').select('*').eq('id_tienda', tiendaId).order('nombre', { ascending: true })
        if (data) setProductos(data as Producto[])
      })
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [tiendaId])

  const todasLasTallas = useMemo(() => {
    const set = new Set<string>()
    for (const p of productos) {
      if (!Array.isArray(p.tallas)) continue
      for (const t of p.tallas) {
        if (typeof t === 'string') set.add(t)
        else if (t && typeof t === 'object' && 'talla' in t) set.add(t.talla)
      }
    }
    return Array.from(set).sort()
  }, [productos])

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    return productos.filter(p => {
      if (q && !p.nombre.toLowerCase().includes(q)) return false
      if (filtroCategoria && p.categoria !== filtroCategoria) return false
      if (filtroTalla) {
        if (!Array.isArray(p.tallas)) return false
        const match = p.tallas.some(t => {
          if (typeof t === 'string') return t === filtroTalla
          return t.talla === filtroTalla && t.stock > 0
        })
        if (!match) return false
      }
      return true
    })
  }, [productos, busqueda, filtroCategoria, filtroTalla])

  const todosSeleccionados = filtrados.length > 0 && seleccionados.size === filtrados.length

  const toggleSeleccion = (id: string) => {
    setSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleTodos = () => {
    if (todosSeleccionados) { setSeleccionados(new Set()); return }
    setSeleccionados(new Set(filtrados.map(p => p.id)))
  }

  const accionMasiva = async (accion: 'toggle' | 'delete') => {
    const ids = Array.from(seleccionados)
    if (!ids.length) return
    if (accion === 'delete' && !confirm(`¿Eliminar ${ids.length} producto(s)?`)) return

    if (accion === 'delete') {
      try {
        const res = await fetch('/api/productos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) })
        if (!res.ok) { const e = await res.json(); toast(e.error || 'Error al eliminar', 'error') }
        setProductos(prev => prev.filter(p => !ids.includes(p.id)))
        toast('Productos eliminados correctamente', 'success')
      } catch { toast('Error de red al eliminar productos', 'error') }
    } else {
      for (const id of ids) {
        const p = productos.find(x => x.id === id)
        if (p) await supabase.from('productos').update({ in_stock: !p.in_stock }).eq('id', id)
      }
    }
    setSeleccionados(new Set())
    router.refresh()
  }

  const margin = (p: Producto) => p.precio > 0 ? ((p.precio - (p.costo_compra || 0)) / p.precio * 100).toFixed(1) : '-'

  const kpiMetrics = useMemo(() => {
    const activos = productos.filter(p => p.in_stock && p.stock > 0)
    const sinStock = productos.filter(p => !p.in_stock || p.stock === 0)
    const valorTotal = productos.reduce((sum, p) => sum + (p.precio * p.stock), 0)
    const margenes = productos.filter(p => p.precio > 0).map(p => ((p.precio - (p.costo_compra || 0)) / p.precio) * 100)
    const margenPromedio = margenes.length > 0 ? margenes.reduce((a, b) => a + b, 0) / margenes.length : 0
    return { activos: activos.length, sinStock: sinStock.length, valorTotal, margenPromedio }
  }, [productos])

  const stockCritico = useMemo(() => {
    return productos.filter(p => p.in_stock && p.stock > 0 && p.stock <= 3).slice(0, 5)
  }, [productos])

  const stockTextColor = (s: number) => {
    if (s > 10) return 'text-emerald-600 dark:text-emerald-400'
    if (s >= 4) return 'text-amber-600 dark:text-amber-400'
    return 'text-rose-600 dark:text-rose-400'
  }

  const renderStockCell = (p: Producto) => {
    const objects = Array.isArray(p.tallas) ? p.tallas.filter(t => typeof t === 'object') as TallaVariant[] : []
    if (objects.length === 0) {
      return <span className={`font-semibold ${stockTextColor(p.stock)}`}>{p.stock}</span>
    }
    if (filtroTalla) {
      const variant = objects.find(t => t.talla === filtroTalla)
      const sv = variant ? variant.stock : 0
      return (
        <div>
          <span className={`font-semibold ${stockTextColor(sv)}`}>
            {filtroTalla}: {sv} unids
          </span>
        </div>
      )
    }
    return (
      <div className="text-xs leading-tight flex flex-wrap gap-x-1.5">
        {objects.map(t => (
          <span key={t.talla} className={`${t.stock <= 0 ? 'text-slate-300 dark:text-slate-600 line-through' : stockTextColor(t.stock)}`}>
            {t.talla}({t.stock})
          </span>
        ))}
        <span className="font-semibold text-slate-800 dark:text-slate-200">| Total: {p.stock}</span>
      </div>
    )
  }

  const exportarCSV = () => {
    const lista = seleccionados.size > 0 ? productos.filter(p => seleccionados.has(p.id)) : productos
    const cabecera = 'nombre,descripcion,categoria,precio,costo,stock,disponible,tallas'
    const filas = lista.map(p => {
      let tallasStr = ''
      if (Array.isArray(p.tallas)) {
        const objects = p.tallas.filter((t): t is TallaVariant => typeof t === 'object' && t !== null)
        if (objects.length > 0) {
          tallasStr = objects.map(t => `${t.talla}(${t.stock})`).join(',')
        }
      }
      return `"${p.nombre}","${p.descripcion || ''}","${p.categoria || ''}",${p.precio},${p.costo_compra || 0},${p.stock},${p.in_stock},"${tallasStr}"`
    }).join('\n')
    const blob = new Blob([`${cabecera}\n${filas}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const sufijo = seleccionados.size > 0 ? `_seleccionados_${seleccionados.size}` : '_todos'
    const a = document.createElement('a'); a.href = url; a.download = `inventario${sufijo}_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const stockColor = (s: number) => {
    if (s > 10) return { dot: 'bg-emerald-500', badge: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50' }
    if (s >= 4) return { dot: 'bg-amber-500', badge: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50' }
    return { dot: 'bg-rose-500', badge: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/50' }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Inventario</h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {productos.length} / {isFounder ? 'Ilimitado (Founder)' : esIlimitado(tokenProductosLimite ?? 0) ? 'Ilimitado' : tokenProductosLimite ?? '—'}
                {limiteAlcanzado && whatsappSoporte && (
                  <a href={`https://wa.me/${whatsappSoporte}?text=${encodeURIComponent('Hola, he alcanzado el límite de productos de mi tienda y me gustaría conocer las opciones para ampliar mi capacidad o actualizar mi plan.')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 ml-2 px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-semibold hover:bg-emerald-700 transition-colors">
                    💬 ¿Necesitas más?
                  </a>
                )}
              </p>
            </div>
          </div>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 shadow-sm">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Productos activos</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{kpiMetrics.activos}</p>
            </div>
            <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 shadow-sm">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sin stock</p>
              <p className={`text-2xl font-bold mt-1 ${kpiMetrics.sinStock > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>{kpiMetrics.sinStock}</p>
            </div>
            <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 shadow-sm">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Valor inventario</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-1">{formatCurrency(kpiMetrics.valorTotal, currencyCode)}</p>
            </div>
            <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 shadow-sm">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Margen promedio</p>
              <p className={`text-2xl font-bold mt-1 ${kpiMetrics.margenPromedio >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{kpiMetrics.margenPromedio.toFixed(1)}%</p>
            </div>
          </div>
          {/* Stock Crítico Alertas */}
          {stockCritico.length > 0 && (
            <div className="mt-3 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/30 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-sm font-bold text-rose-700 dark:text-rose-400">Stock Crítico</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {stockCritico.map(p => (
                  <span key={p.id} className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-white dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800/50">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01" /></svg>
                    {p.nombre} ({p.stock} unid{p.stock !== 1 ? 'ades' : 'ad'})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
        <div className="space-y-4">
          {/* Acciones Rápidas + Buscador + filtros */}
          <div className="flex flex-wrap items-center gap-2">
            {(permisos === null || permisos.productos) && (
              <button onClick={() => {
                if (limiteAlcanzado) {
                  toast(`Límite alcanzado (${productos.length} / ${tokenProductosLimite})`, 'warning')
                  return
                }
                setShowAddModal(true)
              }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 shadow-sm press-scale-sm ${limiteAlcanzado ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-[var(--primary)] text-white hover:brightness-110'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Nuevo Producto
              </button>
            )}
            {(permisos === null || permisos.productos) && (
              <button onClick={() => setImportOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors shrink-0 press-scale-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                Importar
              </button>
            )}
            {(permisos === null || permisos.productos) && (
              <button onClick={exportarCSV}
                className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors shrink-0 press-scale-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Exportar
              </button>
            )}
            <div className="relative flex-1 min-w-[200px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder="Buscar producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none bg-white dark:bg-[#121216]" />
            </div>
            {categorias.length > 0 && (
              <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
                className="px-3 py-2.5 text-sm text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none bg-white dark:bg-[#121216]">
                <option value="" className="dark:bg-[#121216] dark:text-white">Todas las categorías</option>
                {categorias.map(c => <option key={c} value={c} className="dark:bg-[#121216] dark:text-white">{c}</option>)}
              </select>
            )}
            {tipoNegocio === 'ropa' && todasLasTallas.length > 0 && (
              <select value={filtroTalla} onChange={e => setFiltroTalla(e.target.value)}
                className="px-3 py-2.5 text-sm text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none bg-white dark:bg-[#121216]">
                <option value="" className="dark:bg-[#121216] dark:text-white">Todas las tallas</option>
                {todasLasTallas.map(t => <option key={t} value={t} className="dark:bg-[#121216] dark:text-white">{t}</option>)}
              </select>
            )}
          </div>

          {/* Barra flotante */}
          {seleccionados.size > 0 && (permisos === null || permisos.productos) && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-white dark:bg-slate-800/80 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 px-3 sm:px-4 py-3 sticky top-2 z-30">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{seleccionados.size} seleccionado(s)</span>
              <button onClick={() => accionMasiva('toggle')}
                className="text-xs font-semibold px-3 py-1.5 bg-[var(--primary)]/5 text-[var(--primary)] rounded-lg hover:bg-[var(--primary)]/10 transition-all press-scale-sm">Disponibilidad</button>
              <button onClick={() => accionMasiva('delete')}
                className="text-xs font-semibold px-3 py-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all press-scale-sm">Eliminar</button>
              <button onClick={() => setSeleccionados(new Set())}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 ml-auto">Cancelar</button>
            </div>
          )}

          {/* INVENTORY UX PASS: Mobile cards */}
          <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-700/50 bg-white dark:bg-slate-800/40 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            {filtrados.length > 0 ? filtrados.map(p => {
              const agotado = !p.in_stock || p.stock === 0
              const bajoStock = p.in_stock && p.stock > 0 && p.stock <= 5
              const sinImagen = !p.imagen_url
              return (
              <div key={p.id} className="flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-all">
                <input type="checkbox" checked={seleccionados.has(p.id)} onChange={() => toggleSeleccion(p.id)}
                  className="w-4 h-4 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)] shrink-0 mt-1" />
                <div className="shrink-0">
                  {p.imagen_url ? <img src={p.imagen_url} alt={p.nombre} className="w-12 h-12 object-cover rounded-xl ring-1 ring-slate-200 dark:ring-slate-700" />
                  : <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700/50 rounded-xl flex items-center justify-center ring-1 ring-slate-200 dark:ring-slate-700">
                      <svg className="w-5 h-5 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {sinImagen && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-violet-400 border-2 border-white dark:border-slate-800" />}
                    </div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[160px]">{p.nombre}</p>
                    {agotado && <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 rounded-full shrink-0 leading-tight">AGOTADO</span>}
                    {bajoStock && !agotado && <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded-full shrink-0 leading-tight">{p.stock} uds</span>}
                    {p.precio_oferta && <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 rounded-full shrink-0 leading-tight">OFERTA</span>}
                    {reservados.has(p.id) && <span className="text-xs shrink-0 leading-tight" title="Reservado por regalo">🎁</span>}
                    {sinImagen && !agotado && <span className="text-[10px] font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-1.5 py-0.5 rounded-full shrink-0 leading-tight">Sin img</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatCurrency(p.precio, currencyCode)}</p>
                    {p.categoria && <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded-full shrink-0">{p.categoria}</span>}
                  </div>
                  <div className="flex items-start gap-2 mt-1.5">
                    <div className="flex-1 min-w-0">{renderStockCell(p)}</div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <form action={toggleStock.bind(null, p.id, !p.in_stock)}>
                        <button type="submit" className={`relative w-9 h-5 rounded-full transition-colors ${p.in_stock ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${p.in_stock ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
                <ProductoRowActions producto={p} categorias={categorias} tiendaId={tiendaId} tipoNegocio={tipoNegocio} onDelete={(id) => setProductos(prev => prev.filter(x => x.id !== id))} />
              </div>
              )
            }) : (
              <div className="flex flex-col items-center gap-3 py-14 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {productos.length === 0 ? 'No hay productos todavía' : 'No se encontraron productos'}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {productos.length === 0 ? 'Agrega tu primer producto para empezar a vender' : 'Intenta con otros filtros'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white dark:bg-slate-800/40 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-[#1e1e26]">
                <thead className="bg-slate-50 dark:bg-slate-800/80">
                  <tr>
                    <th className="px-4 py-3.5 text-left w-10">
                      <input type="checkbox" checked={todosSeleccionados} onChange={toggleTodos}
                        className="w-4 h-4 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]" />
                    </th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Producto</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Categoría</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Precio</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Costo</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Margen</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Stock</th>
                    <th className="px-4 py-3.5 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estado</th>
                    {(permisos === null || permisos.productos) && <th className="px-4 py-3.5 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Acción</th>}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-transparent divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filtrados.map(p => {
                    const agotado = !p.in_stock || p.stock === 0
                    const activo = p.in_stock && p.stock > 0
                    const sc = activo ? stockColor(p.stock) : null
                    const sinImagen = !p.imagen_url
                    return (
                    <tr key={p.id} className={`hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-all duration-150 ${agotado ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-2.5">
                        <input type="checkbox" checked={seleccionados.has(p.id)} onChange={() => toggleSeleccion(p.id)}
                          className="w-4 h-4 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]" />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="shrink-0 relative">
                            {p.imagen_url ? <img src={p.imagen_url} alt={p.nombre} className="w-9 h-9 object-cover rounded-lg ring-1 ring-slate-200 dark:ring-slate-700" />
                            : <div className="w-9 h-9 bg-slate-100 dark:bg-slate-700/50 rounded-lg flex items-center justify-center ring-1 ring-slate-200 dark:ring-slate-700">
                                <svg className="w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                {sinImagen && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-violet-400 border-2 border-white dark:border-slate-800" />}
                              </div>}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">{p.nombre}</p>
                              {p.precio_oferta && <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 rounded-full shrink-0">OFERTA</span>}
                              {reservados.has(p.id) && <span className="text-xs shrink-0" title="Reservado por regalo">🎁</span>}
                            </div>
                            {p.descripcion && <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[200px] mt-0.5">{p.descripcion}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-sm whitespace-nowrap">
                        {p.categoria
                          ? <span className="inline-block text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-full">{p.categoria}</span>
                          : <span className="text-slate-400 dark:text-slate-500">—</span>}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(p.precio, currencyCode)}</div>
                        {p.precio_oferta && <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">Oferta: {formatCurrency(p.precio_oferta, currencyCode)}</div>}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatCurrency(p.costo_compra || 0, currencyCode)}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={`text-sm font-semibold ${parseFloat(margin(p)) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{margin(p)}%</span>
                      </td>
                      <td className="px-4 py-2.5 text-sm whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {sc && <span className={`w-2 h-2 rounded-full ${sc.dot} shrink-0`} />}
                          {renderStockCell(p)}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {activo && sc && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sc.badge}`}>
                              {p.stock > 10 ? 'Stock OK' : p.stock >= 4 ? 'Stock Medio' : 'Stock Bajo'}
                            </span>
                          )}
                          {agotado && <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-full">Agotado</span>}
                          <form action={toggleStock.bind(null, p.id, !p.in_stock)}>
                            <button type="submit" className={`relative w-9 h-5 rounded-full transition-colors ${p.in_stock ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${p.in_stock ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                            </button>
                          </form>
                        </div>
                      </td>
                      {(permisos === null || permisos.productos) && <td className="px-4 py-2.5 text-center"><ProductoRowActions producto={p} categorias={categorias} tiendaId={tiendaId} tipoNegocio={tipoNegocio} onDelete={(id) => setProductos(prev => prev.filter(x => x.id !== id))} /></td>}
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {filtrados.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-14 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {productos.length === 0 ? 'No hay productos todavía' : 'No se encontraron productos'}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {productos.length === 0 ? 'Agrega tu primer producto para empezar a vender' : 'Intenta con otros filtros'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      {showAddModal && (permisos === null || permisos.productos) && (
        <ProductoModal open={showAddModal} title="Nuevo Producto" onClose={() => setShowAddModal(false)}>
          <ProductoForm
            mode="create"
            tiendaId={tiendaId}
            tipoNegocio={tipoNegocio}
            categorias={categorias}
            onSuccess={() => setShowAddModal(false)}
            onCancel={() => setShowAddModal(false)}
            whatsappSoporte={whatsappSoporte}
          />
        </ProductoModal>
      )}
      {(permisos === null || permisos.productos) && importOpen && <ImportadorCSV tiendaId={tiendaId} categorias={categorias} onClose={() => setImportOpen(false)} whatsappSoporte={whatsappSoporte} />}
    </div>
  )
}
