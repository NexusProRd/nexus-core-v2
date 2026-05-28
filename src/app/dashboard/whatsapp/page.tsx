// UX EVOLUTION — WhatsApp Experience
// WHATSAPP EXPERIENCE: plantillas de mensajes personalizables por estado del pedido
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type EstadoPlantilla = 'confirmado' | 'preparando' | 'en_camino' | 'entregado'

interface Plantilla {
  id: EstadoPlantilla
  label: string
  icon: string
  color: string
  defaultMsg: string
}

const PLANTILLAS: Plantilla[] = [
  {
    id: 'confirmado',
    label: 'Confirmado',
    icon: 'check',
    color: 'emerald',
    defaultMsg: '¡Hola {cliente}! 🎉 Tu pedido {pedido} ha sido confirmado. En breve comenzaremos a prepararlo.',
  },
  {
    id: 'preparando',
    label: 'Preparando',
    icon: 'clock',
    color: 'amber',
    defaultMsg: '¡Hola {cliente}! 👨‍🍳 Estamos preparando tu pedido {pedido}. Te avisaremos cuando esté listo.',
  },
  {
    id: 'en_camino',
    label: 'En Camino',
    icon: 'truck',
    color: 'blue',
    defaultMsg: '¡Hola {cliente}! 🚴‍♂️ Tu pedido {pedido} va en camino. Pronto lo recibirás.',
  },
  {
    id: 'entregado',
    label: 'Entregado',
    icon: 'gift',
    color: 'purple',
    defaultMsg: '¡Hola {cliente}! ✅ Tu pedido {pedido} ha sido entregado. ¡Gracias por confiar en {tienda}! 🙌',
  },
]

const VARIABLES = [
  { key: '{cliente}', label: 'Cliente', ejemplo: 'Carlos' },
  { key: '{pedido}', label: 'Pedido #', ejemplo: '#1024' },
  { key: '{tienda}', label: 'Tienda', ejemplo: 'Mi Tienda' },
  { key: '{detalles}', label: 'Detalles', ejemplo: '1x Pizza + 2x Refresco' },
  { key: '{total}', label: 'Total', ejemplo: 'RD$1,500' },
]

const STORAGE_PREFIX = 'nexus_whatsapp_template_'

function reemplazarVariables(texto: string): string {
  return texto
    .replace(/{cliente}/g, 'Carlos')
    .replace(/{pedido}/g, '#1024')
    .replace(/{tienda}/g, 'Mi Tienda')
    .replace(/{detalles}/g, '1x Pizza + 2x Refresco')
    .replace(/{total}/g, 'RD$1,500')
}

function iconoEstado(icon: string, className: string) {
  switch (icon) {
    case 'check':
      return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
    case 'clock':
      return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    case 'truck':
      return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-1m8 1l2-1m-2 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4m2-3h4m4 3V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16l-2-1m-4 3l2-1" /></svg>
    case 'gift':
      return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
    default:
      return null
  }
}

function BurbujaPreview({ mensaje, color }: { mensaje: string; color: string }) {
  const preview = reemplazarVariables(mensaje)
  const hora = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
  }

  return (
    <div className="flex items-start gap-2.5 max-w-[85%]">
      <div className={`w-8 h-8 rounded-full ${colorMap[color] || 'bg-emerald-500'} flex items-center justify-center text-white shrink-0 shadow-sm`}>
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
      </div>
      <div className="flex-1">
        <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-slate-200/50 dark:border-slate-700/50">
          <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{preview}</p>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 ml-1">{hora}</p>
      </div>
    </div>
  )
}

function TabButton({ plantilla, activa, onClick }: { plantilla: Plantilla; activa: boolean; onClick: () => void }) {
  const colorMap: Record<string, string> = {
    emerald: activa ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
    amber: activa ? 'text-amber-600 dark:text-amber-400 border-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
    blue: activa ? 'text-blue-600 dark:text-blue-400 border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
    purple: activa ? 'text-purple-600 dark:text-purple-400 border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
  }

  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border-b-2 ${colorMap[plantilla.color]} shrink-0`}
    >
      {iconoEstado(plantilla.icon, 'w-4 h-4')}
      {plantilla.label}
    </button>
  )
}

export default function WhatsAppPage() {
  const [activa, setActiva] = useState<EstadoPlantilla>('confirmado')
  const [mensajes, setMensajes] = useState<Record<string, string>>({})
  const [copiado, setCopiado] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // WHATSAPP EXPERIENCE: cargar plantillas desde localStorage
  useEffect(() => {
    const guardados: Record<string, string> = {}
    for (const p of PLANTILLAS) {
      const val = localStorage.getItem(STORAGE_PREFIX + p.id)
      if (val) guardados[p.id] = val
    }
    setMensajes(guardados)
  }, [])

  // WHATSAPP EXPERIENCE: guardar en localStorage al editar
  const actualizarMensaje = useCallback((id: EstadoPlantilla, texto: string) => {
    setMensajes(prev => {
      const next = { ...prev, [id]: texto }
      localStorage.setItem(STORAGE_PREFIX + id, texto)
      return next
    })
  }, [])

  // WHATSAPP EXPERIENCE: insertar variable en textarea
  const insertarVariable = useCallback((varKey: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const texto = ta.value
    const nuevo = texto.substring(0, start) + varKey + texto.substring(end)
    actualizarMensaje(activa, nuevo)
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + varKey.length
      ta.setSelectionRange(pos, pos)
    })
  }, [activa, actualizarMensaje])

  // WHATSAPP EXPERIENCE: resetear plantilla a default
  const resetear = useCallback(() => {
    const p = PLANTILLAS.find(p => p.id === activa)
    if (!p) return
    actualizarMensaje(activa, p.defaultMsg)
  }, [activa, actualizarMensaje])

  // WHATSAPP EXPERIENCE: copiar preview al portapapeles
  const copiarPreview = useCallback(() => {
    const texto = mensajes[activa] ?? PLANTILLAS.find(p => p.id === activa)?.defaultMsg ?? ''
    const preview = reemplazarVariables(texto)
    navigator.clipboard.writeText(preview).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }, [activa, mensajes])

  const plantillaActiva = PLANTILLAS.find(p => p.id === activa)!
  const mensajeActual = mensajes[activa] ?? plantillaActiva.defaultMsg

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      {/* WHATSAPP EXPERIENCE: Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/30 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/30 p-5 sm:p-7">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-emerald-400/5 blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-md shrink-0">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">WhatsApp</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">Personaliza los mensajes automáticos para cada estado del pedido</p>
          </div>
        </div>
      </div>

      {/* WHATSAPP EXPERIENCE: Tabs de estados */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {PLANTILLAS.map(p => (
          <TabButton key={p.id} plantilla={p} activa={activa === p.id} onClick={() => setActiva(p.id)} />
        ))}
      </div>

      {/* WHATSAPP EXPERIENCE: Editor + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel editor */}
        <div className="space-y-4">
          {/* Textarea */}
          <div className="rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mensaje</span>
              <button onClick={resetear}
                className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                Restaurar default
              </button>
            </div>
            <textarea
              ref={textareaRef}
              value={mensajeActual}
              onChange={e => actualizarMensaje(activa, e.target.value)}
              placeholder={plantillaActiva.defaultMsg}
              rows={6}
              className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 px-4 py-3 resize-none outline-none font-sans leading-relaxed"
            />
          </div>

          {/* WHATSAPP EXPERIENCE: Variables rápidas */}
          <div>
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">Variables rápidas</p>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLES.map(v => (
                <button key={v.key} onClick={() => insertarVariable(v.key)}
                  className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-emerald-300 dark:hover:border-emerald-600 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all"
                  title={`${v.label}: ${v.ejemplo}`}
                >
                  <span className="font-mono text-[10px]">{v.key}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 px-1">
              Haz clic en una variable para insertarla en el mensaje
            </p>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            <button onClick={copiarPreview}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow-sm hover:shadow-md transition-all"
            >
              {copiado ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Copiado
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                  Copiar Preview
                </>
              )}
            </button>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Guardado automáticamente
            </span>
          </div>
        </div>

        {/* WHATSAPP EXPERIENCE: Panel preview estilo WhatsApp */}
        <div>
          <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-[#e5ddd6] dark:bg-[#0b141a] shadow-sm">
            {/* Barra superior fake WhatsApp */}
            <div className="bg-[#075e54] dark:bg-[#1f2c33] px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-400 flex items-center justify-center text-white shrink-0">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{plantillaActiva.label}</p>
                <p className="text-[10px] text-white/60">Nexus WhatsApp</p>
              </div>
              <svg className="w-5 h-5 text-white/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
            </div>

            {/* Burbujas de chat */}
            <div className="px-4 py-5 space-y-4 min-h-[280px]">
              <BurbujaPreview mensaje={mensajeActual} color={plantillaActiva.color} />

              {/* Info de ejemplo */}
              <div className="flex items-start gap-2.5 max-w-[85%] ml-auto">
                <div className="flex-1">
                  <div className="bg-[#d9fdd3] dark:bg-[#005c4b] rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                    <p className="text-sm text-slate-800 dark:text-slate-100">
                      Gracias {plantillaActiva.id === 'entregado' ? '🙏' : '👍'}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 mr-1 text-right">
                    {new Date(Date.now() + 60000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
              </div>

              {/* WHATSAPP EXPERIENCE: datos de ejemplo */}
              <div className="rounded-xl bg-white/60 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 p-3">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Datos de ejemplo</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">{'{cliente}'}</span>
                  <span>→ Carlos</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">{'{pedido}'}</span>
                  <span>→ #1024</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">{'{tienda}'}</span>
                  <span>→ Mi Tienda</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">{'{detalles}'}</span>
                  <span>→ 1x Pizza + 2x Refresco</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">{'{total}'}</span>
                  <span>→ RD$1,500</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WHATSAPP EXPERIENCE: Footer info */}
      <div className="rounded-2xl bg-white/50 dark:bg-slate-800/20 border border-dashed border-slate-200 dark:border-slate-700 p-4 sm:p-5 text-center">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Los mensajes se guardan automáticamente en el navegador. <br className="sm:hidden" />
          La automatización real con WhatsApp API estará disponible próximamente.
        </p>
      </div>
    </div>
  )
}
