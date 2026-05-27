'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { generarSlug } from '@/lib/slug'

interface FilaImportacion {
  id: number
  nombre: string
  descripcion: string
  categoria: string
  precio: string
  costo: string
  stock: string
  codigo_barra: string
  talla: string
  imagenFile: File | null
  imagenPreview: string | null
}

export default function ImportadorCSV({ tiendaId, categorias = [], onClose }: { tiendaId: string; categorias?: string[]; onClose: () => void }) {
  const [filas, setFilas] = useState<FilaImportacion[]>([])
  const [publicando, setPublicando] = useState(false)
  const router = useRouter()

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      const lines = text.split('\n').filter(l => l.trim())
      const parsed: FilaImportacion[] = []
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
        if (cols[0]) {
          parsed.push({
            id: i,
            nombre: cols[0] || '',
            descripcion: cols[1] || '',
            categoria: cols[2] || '',
            precio: cols[3] || '0',
            costo: cols[4] || '0',
            stock: cols[5] || '0',
            codigo_barra: cols[6] || '',
            talla: cols[7] || '',
            imagenFile: null,
            imagenPreview: null,
          })
        }
      }
      setFilas(parsed)
    }
    reader.readAsText(file)
  }

  const updateCell = (id: number, field: keyof FilaImportacion, value: string) => {
    setFilas(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f))
  }

  const handleImage = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setFilas(prev => prev.map(f => f.id === id ? { ...f, imagenFile: file, imagenPreview: reader.result as string } : f))
    }
    reader.readAsDataURL(file)
  }

  const publicarTodo = async () => {
    setPublicando(true)
    const supabase = createClient()
    // Group rows by codigo_barra for variant consolidation
    const groups = new Map<string, FilaImportacion[]>()
    for (const f of filas) {
      const key = f.codigo_barra || `__nosku_${f.id}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(f)
    }
    for (const [, rows] of groups) {
      const f = rows[0]
      let imagenUrl: string | null = null
      if (f.imagenFile) {
        const fileName = `${tiendaId}/${Date.now()}-${Math.random().toString(36).substring(7)}.webp`
        const { error } = await supabase.storage.from('img_products').upload(fileName, f.imagenFile)
        if (!error) {
          const { data } = supabase.storage.from('img_products').getPublicUrl(fileName)
          imagenUrl = data.publicUrl
        }
      }
      const usaVariantes = rows.length > 1 || (rows.length === 1 && f.talla)
      const tallas = usaVariantes ? rows.map(r => ({
        talla: r.talla || 'Único',
        stock: parseInt(r.stock) || 0,
        precio: parseFloat(r.precio) || null,
        costo: parseFloat(r.costo) || null,
        sku: r.codigo_barra || undefined,
      })) : []
      const stockTotal = usaVariantes ? tallas.reduce((s: number, v: any) => s + (v.stock || 0), 0) : (parseInt(f.stock) || 0)
      const slug = await generarSlug(f.nombre, f.codigo_barra, supabase, tiendaId)
      await supabase.from('productos').insert({
        id_tienda: tiendaId,
        nombre: f.nombre,
        slug,
        descripcion: f.descripcion || null,
        categoria: f.categoria || null,
        precio: parseFloat(f.precio) || 0,
        costo_compra: parseFloat(f.costo) || 0,
        stock: stockTotal,
        in_stock: true,
        imagen_url: imagenUrl,
        tallas: usaVariantes ? tallas : [],
      })
    }
    setPublicando(false)
    router.refresh()
    onClose()
  }

  const descargarPlantilla = () => {
    const cabecera = 'nombre,descripcion,categoria,precio,costo,stock,codigo_barra,talla'
    const ejemplo = '"Producto A","Descripción","Flores","100","50","10","NXS-ABC123","M"'
    const blob = new Blob([`${cabecera}\n${ejemplo}`], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'plantilla_importacion.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 shrink-0">
          <h3 className="text-lg font-bold text-slate-900">Importar Productos</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {filas.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-sm text-slate-600 font-medium">Sube un archivo CSV con tus productos</p>
              <p className="text-xs text-slate-400">Formato: nombre, descripción, categoría, precio, costo, stock, codigo_barra, talla</p>
              <div className="flex justify-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white rounded-xl hover:brightness-110 transition-colors text-sm font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  Seleccionar CSV
                  <input type="file" accept=".csv" onChange={handleCSV} className="hidden" />
                </label>
                <button onClick={descargarPlantilla}
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium text-slate-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Plantilla
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">{filas.length} producto(s) cargados. Puedes asignar una imagen a cada fila antes de publicar.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-3 py-2 text-left text-xs font-bold text-slate-600 uppercase">Imagen</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-slate-600 uppercase">Nombre</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-slate-600 uppercase">Descripción</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-slate-600 uppercase">Categoría</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-slate-600 uppercase">Precio</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-slate-600 uppercase">Costo</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-slate-600 uppercase">Stock</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-slate-600 uppercase">Código</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-slate-600 uppercase">Talla</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filas.map(f => (
                      <tr key={f.id}>
                        <td className="px-3 py-2">
                          <div className="flex flex-col items-center gap-1.5">
                            {f.imagenPreview ? (
                              <img src={f.imagenPreview} alt="" className="w-12 h-12 rounded-lg object-cover border" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              </div>
                            )}
                            <label className="text-[10px] text-[var(--primary)] cursor-pointer hover:underline text-center">
                              {f.imagenPreview ? 'Cambiar' : 'Subir foto'}
                              <input type="file" accept="image/*" onChange={e => handleImage(f.id, e)} className="hidden" />
                            </label>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <input value={f.nombre} onChange={e => updateCell(f.id, 'nombre', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-[var(--primary)] outline-none" />
                        </td>
                        <td className="px-3 py-2">
                          <input value={f.descripcion} onChange={e => updateCell(f.id, 'descripcion', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-[var(--primary)] outline-none" />
                        </td>
                        <td className="px-3 py-2">
                          <select value={f.categoria} onChange={e => updateCell(f.id, 'categoria', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[var(--primary)] outline-none">
                            <option value="" className="dark:bg-slate-800 dark:text-white">Sin categoría</option>
                            {categorias.map(c => <option key={c} value={c} className="dark:bg-slate-800 dark:text-white">{c}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input value={f.precio} onChange={e => updateCell(f.id, 'precio', e.target.value)}
                            className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-[var(--primary)] outline-none" />
                        </td>
                        <td className="px-3 py-2">
                          <input value={f.costo} onChange={e => updateCell(f.id, 'costo', e.target.value)}
                            className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-[var(--primary)] outline-none" />
                        </td>
                        <td className="px-3 py-2">
                          <input value={f.stock} onChange={e => updateCell(f.id, 'stock', e.target.value)}
                            className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-[var(--primary)] outline-none" />
                        </td>
                        <td className="px-3 py-2">
                          <input value={f.codigo_barra} onChange={e => updateCell(f.id, 'codigo_barra', e.target.value)}
                            className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-[var(--primary)] outline-none" />
                        </td>
                        <td className="px-3 py-2">
                          <input value={f.talla} onChange={e => updateCell(f.id, 'talla', e.target.value)}
                            className="w-14 px-2 py-1 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-[var(--primary)] outline-none" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {filas.length > 0 && (
          <div className="flex gap-3 p-5 border-t border-slate-200 shrink-0">
            <button onClick={() => setFilas([])} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button onClick={publicarTodo} disabled={publicando}
              className="flex-1 px-5 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-medium hover:brightness-110 transition-colors disabled:opacity-50">
              {publicando ? 'Publicando...' : `Publicar Todo (${filas.length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
