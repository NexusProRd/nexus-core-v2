'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function PccConfiguracionPage() {
  const supabase = createClient()
  const [whatsappSoporte, setWhatsappSoporte] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [landingLogo, setLandingLogo] = useState<File | null>(null)
  const [landingLogoPreview, setLandingLogoPreview] = useState<string | null>(null)
  const [landingLogoUrl, setLandingLogoUrl] = useState('')
  const [subiendoLogo, setSubiendoLogo] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('nexus_config').select('valor').eq('clave', 'whatsapp_soporte').maybeSingle(),
      supabase.from('nexus_config').select('valor').eq('clave', 'landing_logo_url').maybeSingle(),
    ]).then(([whatsRes, logoRes]) => {
      if (whatsRes.data?.valor) setWhatsappSoporte(whatsRes.data.valor)
      if (logoRes.data?.valor) setLandingLogoUrl(logoRes.data.valor)
    })
  }, [])

  async function optimizarImagen(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const max = 512
        let w = img.width, h = img.height
        if (w > max || h > max) {
          const ratio = Math.min(max / w, max / h)
          w = Math.round(w * ratio)
          h = Math.round(h * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('No se pudo crear el canvas')); return }
        ctx.drawImage(img, 0, 0, w, h)
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Error al comprimir')), 'image/webp', 80)
      }
      img.onerror = () => reject(new Error('Error al cargar imagen'))
      img.src = url
    })
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLandingLogo(file)
    setLandingLogoPreview(URL.createObjectURL(file))
  }

  const handleGuardar = async () => {
    if (!whatsappSoporte.trim()) return
    setGuardando(true)
    setGuardado(false)

    let logoFinalUrl = landingLogoUrl

    if (landingLogo) {
      setSubiendoLogo(true)
      try {
        const blob = await optimizarImagen(landingLogo)
        const fileName = `landing/logo.webp`
        const { error: uploadError } = await supabase.storage
          .from('img_products')
          .upload(fileName, blob, { upsert: true, contentType: 'image/webp' })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('img_products').getPublicUrl(fileName)
          logoFinalUrl = urlData.publicUrl
        }
      } catch {}
      setSubiendoLogo(false)
    }

    const ops = [
      supabase.from('nexus_config').upsert({ clave: 'whatsapp_soporte', valor: whatsappSoporte.trim() }, { onConflict: 'clave' }),
    ]

    if (logoFinalUrl) {
      ops.push(supabase.from('nexus_config').upsert({ clave: 'landing_logo_url', valor: logoFinalUrl }, { onConflict: 'clave' }))
    }

    const results = await Promise.all(ops)
    if (!results.some(r => r.error)) {
      if (landingLogo && logoFinalUrl) {
        fetch('/api/pwa-icons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logoUrl: logoFinalUrl, tiendaId: 'pcc' }),
        }).catch(() => {})
      }

      setGuardado(true)
      setLandingLogoUrl(logoFinalUrl)
      setLandingLogo(null)
      setLandingLogoPreview(null)
    }

    setGuardando(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">Configuración Global</h1>
        <p className="text-sm text-gray-500 mt-1">Ajustes generales de la plataforma Nexus</p>
      </div>

      <div className="bg-white shadow-md rounded-2xl p-6 sm:p-8 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">WhatsApp de Soporte</label>
          <p className="text-xs text-gray-400 mb-2">Número que recibe los mensajes de nuevos registros y consultas de socios.</p>
          <input type="tel" value={whatsappSoporte} onChange={e => setWhatsappSoporte(e.target.value)}
            placeholder="Ej: 18299999999"
            className="w-full px-4 py-3 text-center text-lg font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
        </div>

        <div className="border-t border-gray-100 pt-6">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Logo del Landing y Favicon</label>
          <p className="text-xs text-gray-400 mb-3">Se convertirá a WebP (máx 512px). Aparece en la página principal, footer y como favicon del navegador.</p>

          <div className="flex items-center gap-4">
            {(landingLogoPreview || landingLogoUrl) && (
              <div className="w-16 h-16 rounded-xl border border-gray-200 overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center">
                <img src={landingLogoPreview || landingLogoUrl} alt="Logo"
                  className="w-full h-full object-contain" />
              </div>
            )}
            <label className="flex-1 cursor-pointer">
              <div className="px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-center hover:border-violet-400 transition-colors">
                <span className="text-sm font-medium text-gray-500">
                  {landingLogo ? landingLogo.name : (landingLogoUrl ? 'Cambiar logo' : 'Seleccionar imagen')}
                </span>
              </div>
              <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
            </label>
          </div>
        </div>

        {guardado && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-semibold text-center">
            ✅ Configuración guardada correctamente
          </div>
        )}

        <div className="flex justify-end">
          <button onClick={handleGuardar} disabled={guardando || !whatsappSoporte.trim()}
            className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 disabled:opacity-50 transition-colors shadow-sm">
            {subiendoLogo ? 'Comprimiendo logo...' : guardando ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </div>
      </div>
    </div>
  )
}
