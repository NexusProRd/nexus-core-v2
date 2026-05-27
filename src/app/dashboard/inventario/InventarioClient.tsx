'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProductoActions from './ProductoActions'
import FloatAddButton from './FloatAddButton'
import { formatearPrecio } from '@/lib/utils'
import { toggleStock } from './actions'
import ImportadorCSV from './ImportadorCSV'
import { getTiendaIdFromCookie } from '@/lib/cookie-utils'
import { usePermisos } from '@/context/PermisosContext'
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

export default function InventarioClient({ tiendaId, tipoNegocio = 'estandar', productos: initial, categorias = [] }: { tiendaId: string; tipoNegocio?: string; productos: Producto[]; categorias?: string[] }) {
  const { permisos } = usePermisos()
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroTalla, setFiltroTalla] = useState('')
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [productos, setProductos] = useState(initial)
  const [importOpen, setImportOpen] = useState(false)
  const [reservados, setReservados] = useState<Set<string>>(new Set())
  const router = useRouter()
  const supabase = createClient()

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
        if (!res.ok) { const e = await res.json(); alert(e.error || 'Error al eliminar') }
        setProductos(prev => prev.filter(p => !ids.includes(p.id)))
      } catch { alert('Error de red al eliminar productos') }
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

  const renderStockCell = (p: Producto) => {
    const objects = Array.isArray(p.tallas) ? p.tallas.filter(t => typeof t === 'object') as TallaVariant[] : []
    if (objects.length === 0) {
      return <span className={`font-semibold ${p.stock <= 5 ? 'text-red-600' : 'text-slate-700'}`}>{p.stock}</span>
    }
    if (filtroTalla) {
      const variant = objects.find(t => t.talla === filtroTalla)
      const sv = variant ? variant.stock : 0
      return (
        <div>
          <span className={`font-semibold ${sv <= 3 ? 'text-red-600' : 'text-slate-700'}`}>
            {filtroTalla}: {sv} unids
          </span>
        </div>
      )
    }
    return (
      <div className="text-xs leading-tight">
        {objects.map(t => (
          <span key={t.talla} className={`mr-1 ${t.stock <= 0 ? 'text-slate-300 line-through' : t.stock <= 3 ? 'text-red-500 font-bold' : 'text-slate-600'}`}>
            {t.talla}({t.stock})
          </span>
        ))}
        <span className="font-semibold text-slate-800">| Total: {p.stock}</span>
      </div>
    )
  }

  const exportarCSV = () => {
    const lista = seleccionados.size > 0 ? productos.filter(p => seleccionados.has(p.id)) : productos
    const cabecera = 'nombre,descripcion,categoria,precio,costo,stock,disponible'
    const filas = lista.map(p =>
      `"${p.nombre}","${p.descripcion || ''}","${p.categoria || ''}",${p.precio},${p.costo_compra || 0},${p.stock},${p.in_stock}`
    ).join('\n')
    const blob = new Blob([`${cabecera}\n${filas}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const sufijo = seleccionados.size > 0 ? `_seleccionados_${seleccionados.size}` : '_todos'
    const a = document.createElement('a'); a.href = url; a.download = `inventario${sufijo}_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="text-[var(--primary)] hover:underline text-sm font-medium">← Volver al Dashboard</Link>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">Inventario</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
        <div className="space-y-4">
          {/* Buscador + filtros */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder="Buscar producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none bg-white dark:bg-slate-800" />
            </div>
            {categorias.length > 0 && (
              <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
                className="px-3 py-2.5 text-sm text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none bg-white dark:bg-slate-800">
                <option value="" className="dark:bg-slate-800 dark:text-white">Todas las categorías</option>
                {categorias.map(c => <option key={c} value={c} className="dark:bg-slate-800 dark:text-white">{c}</option>)}
              </select>
            )}
            {tipoNegocio === 'ropa' && todasLasTallas.length > 0 && (
              <select value={filtroTalla} onChange={e => setFiltroTalla(e.target.value)}
                className="px-3 py-2.5 text-sm text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-[var(--primary)] outline-none bg-white dark:bg-slate-800">
                <option value="" className="dark:bg-slate-800 dark:text-white">Todas las tallas</option>
                {todasLasTallas.map(t => <option key={t} value={t} className="dark:bg-slate-800 dark:text-white">{t}</option>)}
              </select>
            )}
            <div className="flex gap-2">
              {(permisos === null || permisos.productos) && <>
              <button onClick={() => setImportOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                Importar
              </button>
              <button onClick={exportarCSV}
                className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Exportar
              </button>
              </>}
            </div>
          </div>

          {/* Barra flotante */}
          {seleccionados.size > 0 && (permisos === null || permisos.productos) && (
            <div className="flex items-center gap-3 bg-white rounded-xl shadow-md border border-slate-200 px-4 py-3 sticky top-2 z-30">
              <span className="text-sm font-medium text-slate-700">{seleccionados.size} seleccionado(s)</span>
              <button onClick={() => accionMasiva('toggle')}
                className="text-xs font-semibold px-3 py-1.5 bg-[var(--primary)]/5 text-[var(--primary)] rounded-lg hover:bg-[var(--primary)]/10">Cambiar disponibilidad</button>
              <button onClick={() => accionMasiva('delete')}
                className="text-xs font-semibold px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg hover:bg-rose-100">Eliminar</button>
              <button onClick={() => setSeleccionados(new Set())}
                className="text-xs text-slate-400 hover:text-slate-600 ml-auto">Cancelar</button>
            </div>
          )}

          {/* Mobile: Cards */}
          <div className="block md:hidden divide-y divide-slate-100 bg-white rounded-2xl shadow-sm border border-slate-200">
            {filtrados.length > 0 ? filtrados.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <input type="checkbox" checked={seleccionados.has(p.id)} onChange={() => toggleSeleccion(p.id)}
                  className="w-4 h-4 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)] shrink-0" />
                <div className="shrink-0">
                  {p.imagen_url ? <img src={p.imagen_url} alt={p.nombre} className="w-11 h-11 object-cover rounded-xl" />
                  : <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center"><svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">{p.nombre}</p>
                    {p.categoria && <span className="text-[10px] font-medium text-[var(--primary)] bg-[var(--primary)]/5 px-2 py-0.5 rounded-full shrink-0">{p.categoria}</span>}
                    {reservados.has(p.id) && <span className="text-xs" title="Reservado por regalo">🎁</span>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-xs text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis">RD$ {formatearPrecio(p.precio)}</p>
                    {p.precio_oferta && <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full shrink-0">OFERTA</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1">{renderStockCell(p)}
                    <form action={toggleStock.bind(null, p.id, !p.in_stock)}>
                      <button type="submit" className={`relative w-8 h-4 rounded-full transition-colors ${p.in_stock ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${p.in_stock ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                      </button>
                    </form>
                  </div>
                </div>
                <ProductoActions producto={p} categorias={categorias} onDelete={(id) => setProductos(prev => prev.filter(x => x.id !== id))} />
              </div>
            )) : (
              <div className="p-8 text-center text-sm text-slate-400">
                {productos.length === 0 ? 'No hay productos. Agrega uno con el botón +' : 'No se encontraron productos'}
              </div>
            )}
          </div>

          {/* Desktop: Tabla */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left w-10">
                      <input type="checkbox" checked={todosSeleccionados} onChange={toggleTodos}
                        className="w-4 h-4 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Img</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Descripción</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Categoría</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Precio</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Oferta</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Costo</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Margen</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Stock</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase">Disp</th>
                    {(permisos === null || permisos.productos) && <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase">Acción</th>}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filtrados.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={seleccionados.has(p.id)} onChange={() => toggleSeleccion(p.id)}
                          className="w-4 h-4 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]" />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {p.imagen_url ? <img src={p.imagen_url} alt={p.nombre} className="w-9 h-9 object-cover rounded-lg" />
                        : <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center"><svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900 truncate max-w-[160px]">{p.nombre}</td>
                      <td className="px-4 py-3 text-sm text-slate-500 truncate max-w-[160px]">{p.descripcion || '-'}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{p.categoria ? <span className="text-[var(--primary)] font-medium">{p.categoria}</span> : '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">${formatearPrecio(p.precio)}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {p.precio_oferta ? (
                          <span className="font-bold text-rose-600">${formatearPrecio(p.precio_oferta)}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">${formatearPrecio(p.costo_compra || 0)}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <span className={`font-semibold ${parseFloat(margin(p)) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{margin(p)}%</span>
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{renderStockCell(p)}</td>
                      <td className="px-4 py-3 text-center">
                        <form action={toggleStock.bind(null, p.id, !p.in_stock)}>
                          <button type="submit" className={`relative w-9 h-4.5 rounded-full transition-colors ${p.in_stock ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                            <span className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-transform ${p.in_stock ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                          </button>
                        </form>
                      </td>
                      {(permisos === null || permisos.productos) && <td className="px-4 py-3"><ProductoActions producto={p} categorias={categorias} onDelete={(id) => setProductos(prev => prev.filter(x => x.id !== id))} /></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtrados.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-400 py-12">
                {productos.length === 0 ? 'No hay productos todavía' : 'No se encontraron productos'}
              </div>
            )}
          </div>
        </div>
      </main>
      {(permisos === null || permisos.productos) && <FloatAddButton tiendaId={tiendaId} tipoNegocio={tipoNegocio} categorias={categorias} />}
      {(permisos === null || permisos.productos) && importOpen && <ImportadorCSV tiendaId={tiendaId} categorias={categorias} onClose={() => setImportOpen(false)} />}
    </div>
  )
}
