'use client'
import { useState, useEffect } from 'react'

interface Alerta {
  id: string
  id_tienda: string
  whatsapp_num: string
  nombre_tienda: string
  ip: string
  navegador: string | null
  fecha: string
}

export default function LoginVigiladoModal() {
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const total = alertas.length
  const current = alertas[currentIdx]

  const fetchAlertas = async () => {
    try {
      const res = await fetch('/api/pcc/login-vigilado')
      const json = await res.json()
      if (json.alertas?.length) setAlertas(json.alertas)
    } catch {}
  }

  useEffect(() => {
    fetchAlertas()
    const interval = setInterval(fetchAlertas, 30000)
    return () => clearInterval(interval)
  }, [])

  const marcar = async (action: 'notificar' | 'ignorar') => {
    if (!current) return
    await fetch('/api/pcc/login-vigilado', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: current.id, action }),
    })
    if (action === 'notificar') {
      const msg = encodeURIComponent(
        'Hola, detectamos un inicio de sesión en tu cuenta Nexus desde un nuevo dispositivo. Si no fuiste tú, contacta a soporte inmediatamente.'
      )
      window.open(`https://wa.me/${current.whatsapp_num}?text=${msg}`, '_blank')
    }
    setAlertas(prev => prev.filter(a => a.id !== current.id))
    setCurrentIdx(0)
  }

  if (!current) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => marcar('ignorar')} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md mx-4 p-6 animate-in slide-in-from-top-4 duration-300">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Inicio de sesión inusual</h3>
            <p className="text-xs text-slate-500">Se detectó un nuevo dispositivo</p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 space-y-2 text-sm mb-5">
          <InfoRow label="Tienda" value={current.nombre_tienda} />
          <InfoRow label="WhatsApp" value={current.whatsapp_num} />
          <InfoRow label="IP" value={current.ip} />
          <InfoRow label="Navegador" value={current.navegador || '—'} />
          <InfoRow label="Fecha" value={new Date(current.fecha).toLocaleString('es-MX')} />
        </div>

        {total > 1 && (
          <p className="text-xs text-slate-400 mb-3 text-center">{currentIdx + 1} de {total} alertas pendientes</p>
        )}

        <div className="flex gap-2">
          <button onClick={() => marcar('ignorar')}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
            Ignorar
          </button>
          <button onClick={() => marcar('notificar')}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Notificar socio
          </button>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-700 dark:text-slate-300 text-right max-w-[60%] truncate" title={value}>{value}</span>
    </div>
  )
}
