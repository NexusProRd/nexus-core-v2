import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getSessionFromCookieValue } from '@/lib/auth/get-session'
import { PALETTES } from '@/lib/palettes'
import LogoUpload from './LogoUpload'
import { generatePwaIcons } from '@/lib/pwa-icons'
import { getDefaultLimit } from '@/lib/commercial'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const cookieStore = await cookies()
  const rawSession = cookieStore.get('nx_session')?.value
  const session = await getSessionFromCookieValue(rawSession)
  if (!session.valid || !session.tiendaId) redirect('/login')
  const sessionId = session.tiendaId

  const supabase = await createClient()

  const { data: tienda } = await supabase
    .from('tiendas')
    .select('id, onboarding_completo')
    .eq('id', sessionId)
    .maybeSingle()

  async function guardarTienda(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { supabase: adminSupabase, error: adminError } = createAdminClient()
    const cookieStore = await cookies()
    const rawSession = cookieStore.get('nx_session')?.value
    const session = await getSessionFromCookieValue(rawSession)
    if (!session.valid || !session.tiendaId) redirect('/login')
    const sessionId = session.tiendaId

    const nombre_tienda = formData.get('nombre_tienda') as string
    const whatsapp_num = formData.get('whatsapp_num') as string
    const pais_codigo = formData.get('pais_codigo') as string
    const direccion = formData.get('direccion') as string
    const rnc = formData.get('rnc') as string
    const slogan = formData.get('slogan') as string
    const categorias = formData.get('categorias') as string
    const horario = formData.get('horario') as string
    const sobre_nosotros = formData.get('sobre_nosotros') as string
    const tipo_negocio = formData.get('tipo_negocio') as string || 'estandar'
    const palette_name = formData.get('palette_name') as string || 'elegante'
    const logoFile = formData.get('logo') as File | null

    let logoUrl: string | null = null

    if (logoFile && logoFile.size > 0 && logoFile.type.startsWith('image/')) {
      try {
        const ext = logoFile.name.split('.').pop() || 'webp'
        const filePath = `logos_onboarding/${sessionId}/logo.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('img_products')
          .upload(filePath, logoFile, { upsert: true })

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('img_products').getPublicUrl(filePath)
          logoUrl = urlData.publicUrl
        }
      } catch {
        // fallback: logo queda null
      }
    }

    if (logoUrl) {
      await generatePwaIcons(logoUrl, sessionId).catch(() => {})
    }

    const ahora = new Date()
    const fechaVen = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000)
    const fechaSusp = new Date(ahora.getTime() + 14 * 24 * 60 * 60 * 1000)
    const fechaElim = new Date(ahora.getTime() + 30 * 24 * 60 * 60 * 1000)

    const { data: nuevaTienda, error } = await (adminError || !adminSupabase ? supabase : adminSupabase).from('tiendas').upsert({
      id: sessionId,
      nombre_tienda,
      whatsapp_num,
      pais_codigo: pais_codigo || 'DO',
      moneda_simbolo: pais_codigo === 'DO' ? 'RD$' : '$',
      token_productos_limite: getDefaultLimit('emprendedor'),
      tipo_negocio: tipo_negocio as string,
      esta_activa: true,
      tokens_disponibles: 0,
      direccion: direccion || null,
      rnc: rnc || null,
      fecha_vencimiento: fechaVen.toISOString(),
      fecha_bloqueo_panel: fechaVen.toISOString(),
      fecha_suspension_catalogo: fechaSusp.toISOString(),
      fecha_eliminacion_total: fechaElim.toISOString(),
      onboarding_completo: true,
    }).select('id').single()

    if (!error && nuevaTienda) {
      const db = (adminError || !adminSupabase ? supabase : adminSupabase)
      await db.from('perfil_tienda').upsert({
        id_tienda: nuevaTienda.id,
        nombre_comercial: nombre_tienda,
        whatsapp_numero: whatsapp_num,
        logo_url: logoUrl,
        slogan: slogan || null,
        sobre_nosotros: sobre_nosotros || null,
        categorias: categorias || null,
        horario: horario || null,
        theme_config: { palette: palette_name, tipo_negocio },
      })

      const semillas: { nombre: string; precio: number; stock: number }[] = []
      if (tipo_negocio === 'ropa') {
        semillas.push({ nombre: 'Camisa Básica Algodón', precio: 850, stock: 20 }, { nombre: 'Vestido Casual Floral', precio: 1200, stock: 0 })
      } else {
        semillas.push({ nombre: 'Jabón Artesanal', precio: 250, stock: 15 }, { nombre: 'Envío Exprés', precio: 350, stock: 0 })
      }

      if (semillas.length > 0) {
        const productosSemilla = semillas.map(s => ({
          id_tienda: nuevaTienda.id,
          nombre: s.nombre,
          precio: s.precio,
          stock: s.stock,
          costo_compra: Math.round(s.precio * 0.6),
          precio_oferta: null,
          in_stock: true,
          imagen_url: null,
          descripcion: null,
          categoria: null,
        }))
        await db.from('productos').insert(productosSemilla)
      }

      revalidatePath('/dashboard')
      redirect('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 dark:from-slate-900 dark:to-slate-800 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg">N</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white">Configura tu Tienda</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Personaliza la identidad operativa de tu negocio y activa tu catálogo digital</p>
        </div>

        <form action={guardarTienda} className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/80 p-6 sm:p-8 space-y-5">
          <div className="border-b border-slate-200 dark:border-slate-700 pb-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">Información General</h3>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Nombre de la Tienda</label>
            <input type="text" name="nombre_tienda" required
              className="w-full px-3 py-2.5 text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mi Farmacia" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">WhatsApp <span className="font-normal text-slate-400">(donde recibirás los pedidos)</span></label>
              <input type="tel" name="whatsapp_num" required
                className="w-full px-3 py-2.5 text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+1 809 123 4567" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">País</label>
              <select name="pais_codigo" defaultValue="DO"
                className="w-full px-3 py-2.5 text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="DO" className="dark:bg-slate-800 dark:text-white">República Dominicana</option>
                <option value="US" className="dark:bg-slate-800 dark:text-white">Estados Unidos</option>
                <option value="MX" className="dark:bg-slate-800 dark:text-white">México</option>
                <option value="CO" className="dark:bg-slate-800 dark:text-white">Colombia</option>
                <option value="AR" className="dark:bg-slate-800 dark:text-white">Argentina</option>
              </select>
            </div>
          </div>

          <div className="border-b border-slate-200 dark:border-slate-700 pb-1 pt-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">📋 Tipo de Negocio</h3>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 -mt-3">Selecciona el tipo de negocio. Esto determina la configuración de tu inventario.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { value: 'estandar', emoji: '🏪', label: 'Estándar', desc: 'Tecnología, Floristería, Servicios Generales' },
              { value: 'ropa', emoji: '👗', label: 'Boutique / Ropa', desc: 'Tallas y variantes de prendas' },
            ].map(n => (
              <label key={n.value}
                className="flex flex-col gap-2 p-4 rounded-xl border-2 border-slate-200 cursor-pointer transition-all hover:border-violet-300 hover:bg-violet-50/30 has-[:checked]:border-violet-600 has-[:checked]:bg-violet-50 has-[:checked]:ring-2 has-[:checked]:ring-violet-600/20">
                <input type="radio" name="tipo_negocio" value={n.value}
                  defaultChecked={n.value === 'estandar'}
                  className="w-4 h-4 text-violet-600 focus:ring-violet-500 shrink-0" />
                <div className="flex items-center gap-3">
                  <span className="text-lg shrink-0">{n.emoji}</span>
                  <div>
                    <span className="text-sm font-bold text-slate-800 leading-tight">{n.label}</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">{n.desc}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="border-b border-slate-200 dark:border-slate-700 pb-1 pt-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">🖼️ Marca y Logotipo</h3>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Logo de la Tienda <span className="font-normal text-slate-400">(Opcional)</span></label>
            <LogoUpload />
          </div>

          <div className="border-b border-slate-200 dark:border-slate-700 pb-1 pt-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">📍 Datos Fiscales y Ubicación</h3>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Dirección Física</label>
            <input type="text" name="direccion" required
              className="w-full px-3 py-2.5 text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Av. Winston Churchill #10, Distrito Nacional" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">RNC <span className="font-normal text-slate-400">(Opcional)</span></label>
            <input type="text" name="rnc"
              className="w-full px-3 py-2.5 text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: 1-31-XXXXX-X" />
          </div>

          <div className="border-b border-slate-200 dark:border-slate-700 pb-1 pt-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">🏷️ Perfil Comercial</h3>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Categorías Operativas <span className="font-normal text-slate-400">(Separadas por comas)</span></label>
            <input type="text" name="categorias"
              className="w-full px-3 py-2.5 text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Ramos, Cajas, Cumpleaños, Globos" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">✨ Slogan o Lema Comercial <span className="font-normal text-slate-400">(Opcional, máx. 60 caracteres)</span></label>
            <input type="text" name="slogan" maxLength={60}
              className="w-full px-3 py-2.5 text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Calidad y frescura en cada detalle" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">📖 Reseña Corporativa (Sobre Nosotros)</label>
            <textarea name="sobre_nosotros" rows={4}
              className="w-full px-3 py-2.5 text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Cuéntanos la historia y el propósito de tu marca..." />
          </div>

          <div className="border-b border-slate-200 dark:border-slate-700 pb-1 pt-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">🕒 Horarios de Atención</h3>
          </div>

          <div>
            <textarea name="horario" rows={3}
              className="w-full px-3 py-2.5 text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder={"Lunes a Viernes: 9:00 AM - 6:00 PM\nSábado: 9:00 AM - 2:00 PM\nDomingo: Cerrado"} />
          </div>

          <div className="border-b border-slate-200 dark:border-slate-700 pb-1 pt-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">🎨 Apariencia y Estilo del Catálogo</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PALETTES.map(p => (
              <label key={p.name}
                className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  'border-slate-200 hover:border-violet-300 hover:bg-violet-50/30'
                }`}
                style={{ borderLeftColor: p.colors.primary, borderLeftWidth: 4 }}>
                <input type="radio" name="palette_name" value={p.name}
                  defaultChecked={p.name === 'elegante'}
                  className="absolute top-3 right-3 w-4 h-4 text-violet-600 focus:ring-violet-500" />
                <span className="text-sm font-bold text-slate-800">{p.label}</span>
                <span className="text-xs text-slate-500 mt-0.5">{p.description}</span>
                <div className="flex gap-1 mt-2">
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: p.colors.primary }} />
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: p.colors.secondary }} />
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: p.colors.background }} />
                  <span className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: p.colors.surface }} />
                </div>
              </label>
            ))}
          </div>

          <button type="submit"
            className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold py-3 px-4 rounded-xl hover:brightness-110 transition-all shadow-lg shadow-teal-500/25 text-base">
            Guardar y Entrar al Dashboard
          </button>
        </form>
      </div>
    </div>
  )
}
