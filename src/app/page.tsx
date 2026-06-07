'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useTheme } from '@/context/ThemeContext'
import { PlantillaPreview } from '@/components/catalog/CatalogoModal'
import type { CatalogoModalConfig } from '@/components/catalog/CatalogoModal'

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return { ref, visible }
}

function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useScrollReveal()
  return (
    <div ref={ref} className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}>
      {children}
    </div>
  )
}

export default function HomePage() {
  const [user, setUser] = useState<boolean | null>(null)
  const [landingLogoUrl, setLandingLogoUrl] = useState('')
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()

  const [emprendedorPrice, setEmprendedorPrice] = useState(380)
  const [emprendedorLimit, setEmprendedorLimit] = useState(15)
  const [proPrice, setProPrice] = useState(900)
  const [proLimit, setProLimit] = useState(-1)

  const [vitrinaConfig, setVitrinaConfig] = useState<CatalogoModalConfig | null>(null)
  const [vitrinaActiva, setVitrinaActiva] = useState(false)
  const [whatsappSoporte, setWhatsappSoporte] = useState('')
  const [faqAbierta, setFaqAbierta] = useState<number | null>(null)

  useEffect(() => {
    const hasSession = document.cookie.includes('nx_session=')
    setUser(hasSession)
    const supabase = createClient()
    Promise.all([
      supabase.from('nexus_config').select('valor').eq('clave', 'plan_emprendedor_price').maybeSingle(),
      supabase.from('nexus_config').select('valor').eq('clave', 'plan_emprendedor_limit').maybeSingle(),
      supabase.from('nexus_config').select('valor').eq('clave', 'plan_pro_price').maybeSingle(),
      supabase.from('nexus_config').select('valor').eq('clave', 'plan_pro_limit').maybeSingle(),
      supabase.from('nexus_config').select('valor').eq('clave', 'landing_logo_url').maybeSingle(),
      supabase.from('nexus_config').select('valor').eq('clave', 'whatsapp_soporte').maybeSingle(),
      supabase.from('nexus_landing_vitrina').select('*').eq('clave', 'global').maybeSingle(),
    ]).then(([empPriceRes, empLimitRes, proPriceRes, proLimitRes, logoRes, wspRes, vitrinaRes]) => {
      if (empPriceRes.data?.valor) setEmprendedorPrice(parseInt(empPriceRes.data.valor, 10))
      if (empLimitRes.data?.valor) setEmprendedorLimit(parseInt(empLimitRes.data.valor, 10))
      if (proPriceRes.data?.valor) setProPrice(parseInt(proPriceRes.data.valor, 10))
      if (proLimitRes.data?.valor) setProLimit(parseInt(proLimitRes.data.valor, 10))
      if (logoRes.data?.valor) setLandingLogoUrl(logoRes.data.valor)
      if (wspRes.data?.valor) setWhatsappSoporte(wspRes.data.valor)
      if (vitrinaRes.data?.activo) {
        setVitrinaActiva(true)
        setVitrinaConfig({
          tipo: vitrinaRes.data.tipo || 'plantilla',
          imagen_url: vitrinaRes.data.imagen_url || null,
          url_redireccion: vitrinaRes.data.url_redireccion || null,
          contenido: vitrinaRes.data.contenido || undefined,
          plantilla_id: vitrinaRes.data.plantilla_id || 'elegante',
        })
      }
    })
  }, [])

  if (user === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user) {
    router.replace('/dashboard')
    return null
  }

  const caracteristicas = [
    { icon: '📱', titulo: 'Catálogo en tu Link', desc: 'Subes tus productos desde el celular y compartes tu link. Tus clientes ven todo y te piden por WhatsApp. Sin apps, sin registro.' },
    { icon: '📦', titulo: 'Control de Inventario', desc: 'Cada venta descuenta stock automáticamente. Sabes exactamente qué tienes y qué se vende.' },
    { icon: '🛍️', titulo: 'Pedidos por WhatsApp', desc: 'Recibes la orden completa con productos, cantidades y datos del cliente, lista para despachar. Sin configuración.' },
    { icon: '📊', titulo: 'Dashboard en Vivo', desc: 'Ventas de hoy, productos populares, ingresos del mes. Todo actualizado al instante.' },
    { icon: '🎯', titulo: 'Hecho para ti, no para técnicos', desc: 'Si sabes usar WhatsApp y subir fotos, ya sabes usar Nexus. Interfaz simple, sin complicaciones.' },
    { icon: '🪙', titulo: 'Sin Comisiones', desc: 'Paga solo una tarifa plana mensual. Nada de comisiones por venta.' },
  ]

  return (
    <div className="min-h-screen bg-white">

      {/* ===== HEADER ===== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            {landingLogoUrl ? (
              <img src={landingLogoUrl} alt="Nexus" className="h-7 w-auto" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-xs">N</span>
              </div>
            )}
            <span className="text-sm font-bold text-slate-900">Nexus</span>
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all">
              {theme === 'dark' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
            <Link href="/login" className="hidden sm:inline-flex px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              Iniciar Sesión
            </Link>
            <Link href="/register" className="px-4 py-2 text-sm font-bold bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl hover:brightness-110 transition-all shadow-sm">
              Probar Gratis
            </Link>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="relative min-h-[90vh] flex items-center bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] rounded-full bg-teal-500/10 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-emerald-500/8 blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_rgba(13,148,136,0.06)_0%,_transparent_60%)]" />
        </div>

        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              Hecho en República Dominicana
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight">
              Tus clientes te piden por{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-emerald-300 to-teal-400">
                WhatsApp
              </span>
              {' '}y pierdes los pedidos
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Nexus crea tu catálogo online en minutos. Tus clientes compran desde tu link 
              y cada pedido te llega completo y ordenado directamente a tu WhatsApp.
            </p>
            <p className="mt-3 text-sm text-slate-500 max-w-xl mx-auto">
              Para tiendas de ropa, accesorios, cosméticos, tecnología y más.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold text-base rounded-2xl hover:brightness-110 hover:scale-[1.02] transition-all shadow-lg shadow-teal-500/20">
                Probar 30 Días Gratis
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
              <button onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 border border-slate-600 text-slate-300 font-semibold text-base rounded-2xl hover:bg-slate-800 hover:border-slate-500 transition-all">
                Ver cómo funciona
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== DOLOR / "¿TE SUENA CONOCIDO?" ===== */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200 mb-5">
              ¿Te identificas?
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight">
              Si vendes por redes sociales,<br />
              <span className="text-rose-500">esto te suena conocido</span>
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-10">
            {[
              { icon: '💬', titulo: 'Pedidos perdidos en el chat', desc: 'Tus clientes preguntan, tú respondes, pero entre tanto "buen día" los pedidos se mezclan y algunos se quedan sin respuesta.' },
              { icon: '🌙', titulo: 'Clientes preguntando a deshoras', desc: '—¿Tienes esto? ¿Cuánto cuesta? ¿Estás abierto? Respondes lo mismo 20 veces al día, incluso cuando estás descansando.' },
              { icon: '📉', titulo: 'Sin control de lo que vendes', desc: 'Publicas una oferta, se acaba, y tienes que borrar la foto o editar el pie. No sabes cuánto vendiste este mes ni qué es lo que más se pide.' },
              { icon: '😤', titulo: 'Si no publicas, no existes', desc: 'Tu negocio vive en tus historias de Instagram. Cuando no publicas, los clientes no te encuentran. No tienes un lugar fijo al que puedan ir.' },
            ].map((d, i) => (
              <Reveal key={i}>
                <div className="bg-slate-50 rounded-2xl p-6 sm:p-7 border border-slate-200 h-full hover:border-rose-200 hover:shadow-md transition-all duration-300">
                  <div className="text-2xl sm:text-3xl mb-3">{d.icon}</div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1.5">{d.titulo}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{d.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-3xl p-8 sm:p-10 text-center shadow-xl shadow-teal-500/15">
              <p className="text-white text-xl sm:text-2xl font-bold leading-relaxed max-w-3xl mx-auto">
                La buena noticia: <span className="text-teal-100">no necesitas saber de tecnología</span>.<br />
                Si sabes usar WhatsApp y subir fotos desde tu celular,<br className="hidden sm:block" />
                <span className="text-white/90">ya puedes tener tu tienda online con Nexus.</span>
              </p>
              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-teal-100">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Sin conocimientos técnicos — sin desarrolladores — sin estrés
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== TRUST BAR ===== */}
      <section className="py-10 sm:py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
            {[
              { numero: '100%', label: 'Dominicano' },
              { numero: '5 min', label: 'En línea' },
              { numero: '0%', label: 'Comisiones' },
              { numero: 'Soporte', label: 'por WhatsApp' },
            ].map((s, i) => (
              <Reveal key={i}>
                <div className="text-center">
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{s.numero}</p>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== INDUSTRIAS ===== */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900">Disponible para tu tipo de negocio</h2>
            <p className="text-lg text-slate-500 mt-4 max-w-2xl mx-auto">Da igual lo que vendas — el catálogo se adapta a ti. Sin configuraciones complicadas.</p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 max-w-3xl mx-auto mb-8">
            {[
              { icon: '👕', titulo: 'Ropa y Boutique', desc: 'Carga fotos con tallas y colores. Tus clientes ven disponibilidad al instante y te piden por WhatsApp.', disponible: true },
              { icon: '📦', titulo: 'Estándar', desc: 'Floristerías, gadgets tecnológicos, perfumería, y todo tipo de negocio. Subes tus productos y vendes en minutos.', disponible: true },
            ].map((ind, i) => (
              <Reveal key={i}>
                <div className="relative bg-slate-50 rounded-2xl border-2 border-teal-200 p-6 sm:p-7 h-full shadow-sm">
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-700 border border-teal-200">Disponible</span>
                  <div className="text-2xl mb-3">{ind.icon}</div>
                  <h3 className="text-base font-bold text-slate-900 mb-1.5">{ind.titulo}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{ind.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="text-center mb-8">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200">
              Próximamente
            </span>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 max-w-4xl mx-auto">
            {[
              { icon: '💇', titulo: 'Servicios', desc: 'Barberías, salones de belleza, fotógrafos y profesionales con portafolio y agenda.' },
              { icon: '🛒', titulo: 'Colmado y Tienda Local', desc: 'Inventario con precios por unidad, pedidos para delivery y control de stock diario.' },
              { icon: '🏝️', titulo: 'Tours y Excursiones', desc: 'Paquetes, fechas disponibles, reservas con depósito y gestión de cupos.' },
            ].map((ind, i) => (
              <Reveal key={i}>
                <div className="relative bg-slate-50 rounded-2xl border border-slate-200 p-6 h-full opacity-70 grayscale-[30%]">
                  <div className="text-2xl mb-3">{ind.icon}</div>
                  <h3 className="text-sm font-bold text-slate-700 mb-1.5">{ind.titulo}</h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{ind.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>



      {/* ===== VITRINA ===== */}
      {vitrinaActiva && vitrinaConfig && (
        <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-white">
          <div className="max-w-5xl mx-auto">
            <Reveal className="text-center mb-10">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 uppercase tracking-wider mb-4">Vitrina</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Lo destacado de Nexus</h2>
            </Reveal>
            <Reveal>
              <div className="flex flex-col items-center">
                {vitrinaConfig.tipo === 'personalizado' ? (
                  <div className="w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
                    <img src={vitrinaConfig.imagen_url || ''} alt="" className="w-full object-cover max-h-[500px]" />
                  </div>
                ) : (
                  <div className="relative w-full max-w-[280px]">
                    <div className="relative aspect-[9/16] rounded-[2.5rem] overflow-hidden shadow-2xl border-[4px] border-slate-800 bg-slate-900">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-6 bg-slate-800 rounded-b-2xl z-10 flex items-center justify-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                        <div className="w-8 h-1.5 rounded-full bg-slate-900" />
                      </div>
                      <PlantillaPreview config={vitrinaConfig} tiendaNombre="Nexus" logoUrl={landingLogoUrl || null} />
                    </div>
                    <div className="absolute -inset-2 rounded-[2.5rem] bg-gradient-to-br from-teal-500/10 to-emerald-500/5 blur-xl -z-10 opacity-60" />
                  </div>
                )}
                {vitrinaConfig.tipo === 'plantilla' && vitrinaConfig.url_redireccion && (
                  <a href={vitrinaConfig.url_redireccion} target="_blank" rel="noopener noreferrer"
                    className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold text-sm rounded-xl hover:brightness-110 transition-all shadow-lg shadow-teal-500/25">
                    {vitrinaConfig.contenido?.cta_texto || 'Saber más'}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                )}
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ===== CARACTERÍSTICAS ===== */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900">Todo lo que necesitas para vender</h2>
            <p className="text-lg text-slate-500 mt-4 max-w-2xl mx-auto">Funciones completas, diseñadas para que cualquier persona las use desde el primer día.</p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {caracteristicas.map((c, i) => (
              <Reveal key={i}>
                <div className="group bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:-translate-y-1 hover:border-slate-300 transition-all duration-300">
                  <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">{c.icon}</div>
                  <h3 className="text-base font-bold text-slate-900 mb-1.5">{c.titulo}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{c.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CÓMO FUNCIONA / WHATSAPP FLOW ===== */}
      <section id="como-funciona" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900">Así funciona Nexus</h2>
            <p className="text-lg text-slate-500 mt-4 max-w-2xl mx-auto">De tu catálogo a tu WhatsApp en segundos. Sin que tú hagas nada.</p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { paso: '1', icon: '📱', titulo: 'Compartes tu link', desc: 'Subes tus productos y compartes el enlace de tu catálogo. Tus clientes lo abren sin instalar nada.' },
              { paso: '2', icon: '🛒', titulo: 'Cliente compra', desc: 'Ven precios, tallas y disponibilidad. Eligen productos y cantidades sin que tú respondas una sola vez.' },
              { paso: '3', icon: '💬', titulo: 'Pedido por WhatsApp', desc: 'Al comprar, se abre su WhatsApp con el pedido completo: productos, cantidades, total y sus datos.' },
              { paso: '4', icon: '✅', titulo: 'Tú solo recibes', desc: 'El pedido te llega ordenado a tu WhatsApp. El inventario se descuenta solo. Sin perder ninguno.' },
            ].map((p, i) => (
              <Reveal key={i}>
                <div className="group text-center h-full">
                  <div className="relative w-16 h-16 mx-auto mb-5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-2xl shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform duration-300">
                      {p.icon}
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md">{p.paso}</div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{p.titulo}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{p.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-10 text-center">
            <div className="inline-flex items-center gap-2 px-5 py-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-sm text-slate-700 font-semibold">Tú solo compartes tu link.</span>
              <span className="text-sm text-teal-600 font-bold">Nexus hace todo el trabajo.</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900">Lo que dicen nuestros clientes</h2>
            <p className="text-lg text-slate-500 mt-4">Negocios en República Dominicana que ya digitalizaron su operación.</p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { quote: 'Tenía mi negocio en Instagram pero perdía los pedidos en el chat. Con Nexus todo me llega ordenado, los productos, las cantidades, todo.', name: 'Carlos M.', business: 'Ventas de ropa, Santo Domingo' },
              { quote: 'Lo mejor es que no tuve que pagar a un desarrollador ni nada. En 10 minutos tenía mi catálogo listo y al otro día ya tenía mi primer pedido.', name: 'María F.', business: 'Repostería, Santiago' },
            ].map((t, i) => (
              <Reveal key={i}>
                <div className="relative bg-slate-50 rounded-3xl p-8 border border-slate-200">
                  <svg className="w-8 h-8 text-teal-500/20 mb-3" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" /></svg>
                  <p className="text-sm sm:text-base text-slate-700 leading-relaxed mb-5">{t.quote}</p>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.business}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRECIOS ===== */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900">Planes para tu negocio</h2>
            <p className="text-lg text-slate-500 mt-4">Sin contratos, sin tarjetas amarradas. 30 días de prueba gratuita.</p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* Emprendedor */}
            <Reveal>
              <div className="group relative bg-white rounded-3xl border-2 border-emerald-200 p-8 sm:p-10 hover:shadow-2xl transition-all duration-300 h-full flex flex-col">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-3xl" />
                <div className="text-center mb-6">
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">Emprendedor</span>
                  <div className="mt-4">
                    <span className="text-5xl sm:text-6xl font-extrabold text-slate-900">RD${emprendedorPrice.toLocaleString('en-US')}</span>
                    <span className="text-lg text-slate-400 ml-2">/ mes</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-2">Hasta {emprendedorLimit} productos</p>
                </div>
                <div className="space-y-3 mb-8 flex-1">
                  {['Catálogo online público', 'Pedidos por WhatsApp automáticos', 'Dashboard en vivo', 'Cupones de descuento', 'Regalos con código', 'Control de inventario', 'Soporte por WhatsApp'].map((f, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-slate-600">
                      <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </div>
                  ))}
                </div>
                <Link href="/register"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm rounded-xl hover:brightness-110 hover:scale-[1.01] transition-all shadow-md shadow-emerald-500/20">
                  Probar 30 Días Gratis
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
              </div>
            </Reveal>
            {/* Pro */}
            <Reveal>
              <div className="group relative bg-white rounded-3xl border-2 border-indigo-200 p-8 sm:p-10 hover:shadow-2xl transition-all duration-300 h-full flex flex-col">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-3xl" />
                <div className="text-center mb-6">
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">Pro</span>
                  <div className="mt-4">
                    <span className="text-5xl sm:text-6xl font-extrabold text-slate-900">RD${proPrice.toLocaleString('en-US')}</span>
                    <span className="text-lg text-slate-400 ml-2">/ mes</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-2">{proLimit === -1 ? 'Productos ilimitados' : `Hasta ${proLimit} productos`}</p>
                </div>
                <div className="space-y-3 mb-8 flex-1">
                  {['Todo lo de Emprendedor +', 'Productos ilimitados'].map((f, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-slate-600">
                      <svg className="w-5 h-5 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </div>
                  ))}
                </div>
                <a href={`https://wa.me/${whatsappSoporte || '18299999999'}?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20el%20plan%20Pro`} target="_blank" rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm rounded-xl hover:brightness-110 hover:scale-[1.01] transition-all shadow-md shadow-indigo-500/20">
                  Consultar Plan Pro
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </a>
              </div>
            </Reveal>
          </div>
          <Reveal className="mt-6 text-center">
            <p className="text-xs text-slate-400">Prueba Nexus 30 días gratis con el plan Emprendedor. Sin tarjeta. Sin contratos.</p>
          </Reveal>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <Reveal className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900">Preguntas frecuentes</h2>
            <p className="text-lg text-slate-500 mt-4">Todo lo que necesitas saber antes de empezar.</p>
          </Reveal>
          <div className="space-y-3">
            {[
              { p: '¿Necesito tarjeta de crédito para probar?', r: 'No. Solo registras con tu nombre, WhatsApp y una contraseña. 30 días gratis, sin compromiso, sin tarjeta.' },
              { p: '¿Puedo cancelar cuando quiera?', r: 'Sí. Pagas mes a mes, sin contratos. Si cancelas, tu catálogo se pausa pero no perdemos tu información.' },
              { p: '¿Qué pasa si supero los 15 productos en Emprendedor?', r: 'No podrás agregar más productos hasta que actualices al plan Pro (productos ilimitados) o elimines productos inactivos.' },
              { p: '¿Mis clientes necesitan instalar algo?', r: 'No. Solo abren tu link desde cualquier teléfono. Para hacer un pedido, se abre su WhatsApp automáticamente.' },
              { p: '¿Puedo cambiar de plan después?', r: 'Sí. Puedes solicitar un cambio de plan en cualquier momento. Nuestro equipo realizará la actualización y conservarás toda tu información.' },
              { p: '¿Cómo sé qué productos se venden más?', r: 'El dashboard te muestra ventas del día, productos populares e ingresos del mes en tiempo real.' },
              { p: '¿Qué incluye el período de prueba?', r: 'Los 30 días son con todas las funciones del plan Emprendedor: catálogo online, pedidos por WhatsApp, dashboard en vivo, control de inventario y más. Sin limitaciones durante el trial.' },
            ].map((faq, i) => (
              <Reveal key={i}>
                <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden transition-all duration-300">
                  <button onClick={() => setFaqAbierta(faqAbierta === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left text-sm font-bold text-slate-900 hover:bg-slate-100/50 transition-colors">
                    {faq.p}
                    <svg className={`w-5 h-5 text-slate-400 shrink-0 ml-4 transition-transform duration-300 ${faqAbierta === i ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {faqAbierta === i && (
                    <div className="px-6 pb-4 text-sm text-slate-500 leading-relaxed animate-fade-in-up">
                      {faq.r}
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900 to-slate-800 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-teal-500/8 blur-[120px]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">¿Listo para no perder más pedidos?</h2>
            <p className="text-lg text-slate-400 mt-4">Regístrate gratis y prueba Nexus 30 días sin compromiso. Sin tarjeta, sin contratos.</p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold text-base rounded-2xl hover:brightness-110 hover:scale-[1.02] transition-all shadow-lg shadow-teal-500/20">
                Probar 30 Días Gratis
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
            </div>
            <Reveal className="mt-8">
              <div className="border-t border-slate-700/50 pt-8">
                <p className="text-sm text-slate-500 mb-3">¿Necesitas algo más avanzado?</p>
                <a href={`https://wa.me/${whatsappSoporte || '18299999999'}?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20una%20p%C3%A1gina%20personalizada`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 border border-slate-600 text-slate-300 font-semibold text-sm rounded-xl hover:bg-slate-800 hover:border-slate-500 transition-all">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                  Solicitar Cotización
                </a>
              </div>
            </Reveal>
          </Reveal>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-slate-900 border-t border-slate-800 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {landingLogoUrl ? (
              <img src={landingLogoUrl} alt="Nexus" className="h-5 w-auto" />
            ) : (
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                <span className="text-white font-bold text-[10px]">N</span>
              </div>
            )}
            <span className="text-xs font-semibold text-slate-400">Nexus — {new Date().getFullYear()}</span>
          </div>
          <p className="text-xs text-slate-600">Hecho en República Dominicana 🇩🇴</p>
        </div>
      </footer>
    </div>
  )
}
