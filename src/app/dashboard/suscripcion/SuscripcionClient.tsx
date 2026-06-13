'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { getPlanLabel, getStatusLabel, getStatusColor, getPlanColor } from '@/lib/commercial'
import type { PlanTipo, PlanStatus } from '@/lib/commercial'

interface BankAccount {
  id: string
  banco: string
  titular: string
  tipo_cuenta: string
  numero_cuenta: string
  moneda: string
  activo: boolean
}

interface Props {
  initialPlanData: {
    planTipo: PlanTipo
    planStatus: PlanStatus
    fechaVencimiento: string | null
    currencyCode: string
    isFounder: boolean
  }
  bankAccounts: BankAccount[]
  paypal: { email: string; activo: boolean }
  planPrices: { emprendedor: number; pro: number }
  nombreTienda: string
  whatsappSoporte: string
}

function diasRestantes(fecha: string | null): number {
  if (!fecha) return 0
  const ahora = new Date()
  const vence = new Date(fecha)
  const diff = vence.getTime() - ahora.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export default function SuscripcionClient({ initialPlanData, bankAccounts, paypal, planPrices, nombreTienda, whatsappSoporte }: Props) {
  const { planTipo, planStatus, fechaVencimiento, currencyCode, isFounder } = initialPlanData
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const dias = diasRestantes(fechaVencimiento)
  const precio = planPrices[planTipo]
  const planLabel = getPlanLabel(planTipo)
  const statusLabel = getStatusLabel(planStatus)
  const proximoAVencer = dias > 0 && dias <= 7 && planStatus !== 'trial'

  const copiar = async (label: string, texto: string) => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiedField(label)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {}
  }

  const generarMensajeCompleto = () => {
    if (bankAccounts.length === 0) return ''
    return bankAccounts.map(acc =>
      `Banco: ${acc.banco}\nTitular: ${acc.titular}\nTipo: ${acc.tipo_cuenta}\nCuenta: ${acc.numero_cuenta}`
    ).join('\n\n') +
    `\n\nPlan: ${planLabel}\nMonto: ${formatCurrency(precio, currencyCode)}`
  }

  const generarMensajeWhatsApp = () => {
    const mensaje = `Hola Nexus Core.\n\nHe realizado el pago de mi suscripción.\n\nTienda: ${nombreTienda}\nPlan: ${planLabel}\nMonto: ${formatCurrency(precio, currencyCode)}\n\nAdjunto comprobante.`
    return mensaje
  }

  const enviarWhatsApp = () => {
    const url = `https://wa.me/${whatsappSoporte}?text=${encodeURIComponent(generarMensajeWhatsApp())}`
    window.open(url, '_blank')
  }

  const noPaymentMethods = bankAccounts.length === 0 && !paypal.activo

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-6">
      {/* Warning banner for próximo a vencer */}
      {proximoAVencer && (
        <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-800">Tu suscripción vence en {dias} día{dias !== 1 ? 's' : ''}</p>
            <p className="text-xs text-amber-700 mt-0.5">Realiza el pago a tiempo para evitar la suspensión del panel.</p>
          </div>
        </div>
      )}

      {/* Status Card */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 sm:p-6 border border-slate-200/60 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-4">Estado de Suscripción</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="rounded-xl p-4 bg-slate-50 border border-slate-100">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Plan</p>
            <p className="text-lg font-extrabold text-slate-900">{planLabel}</p>
          </div>
          <div className="rounded-xl p-4 bg-slate-50 border border-slate-100">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Estado</p>
            <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${getStatusColor(planStatus)}`}>
              {statusLabel}
            </span>
          </div>
          <div className="rounded-xl p-4 bg-slate-50 border border-slate-100">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">
              {planStatus === 'trial' ? 'Fin del periodo de prueba' : 'Fecha de vencimiento'}
            </p>
            <p className="text-lg font-extrabold text-slate-900">
              {fechaVencimiento ? new Date(fechaVencimiento).toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
            </p>
            {dias > 0 && (
              <p className="text-xs text-slate-400 mt-0.5">
                {dias} día{dias !== 1 ? 's' : ''} restante{dias !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="rounded-xl p-4 bg-slate-50 border border-slate-100">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Precio mensual</p>
            <p className="text-lg font-extrabold text-slate-900">{formatCurrency(precio, currencyCode)}</p>
          </div>
        </div>
        {planStatus === 'trial' && (
          <div className="bg-blue-50/80 border border-blue-200/60 rounded-xl p-3 text-sm text-blue-700">
            💡 Si realizas tu pago antes del corte, no perderás acceso al panel.
          </div>
        )}
      </div>

      {/* Payment Methods */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 sm:p-6 border border-slate-200/60 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-4">Métodos de Pago</h2>

        {noPaymentMethods ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p className="text-sm text-slate-500 font-medium">No hay métodos de pago disponibles actualmente.</p>
            <p className="text-xs text-slate-400 mt-1">Contacta a soporte para más información.</p>
            <a href={`https://wa.me/${whatsappSoporte}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              Contactar por WhatsApp
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {bankAccounts.map(acc => (
              <div key={acc.id} className="rounded-xl p-4 bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <span className="font-bold text-slate-900">{acc.banco}</span>
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">{acc.moneda}</span>
                </div>
                <p className="text-sm text-slate-500 mb-1">
                  {acc.titular} · {acc.tipo_cuenta}
                </p>
                <p className="text-sm font-mono font-bold text-slate-900 mb-3">{acc.numero_cuenta}</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => copiar('titular_' + acc.id, acc.titular)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {copiedField === 'titular_' + acc.id ? '¡Copiado!' : 'Copiar titular'}
                  </button>
                  <button onClick={() => copiar('cuenta_' + acc.id, acc.numero_cuenta)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {copiedField === 'cuenta_' + acc.id ? '¡Copiado!' : 'Copiar cuenta'}
                  </button>
                </div>
              </div>
            ))}

            {bankAccounts.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button onClick={() => copiar('todo', generarMensajeCompleto())}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {copiedField === 'todo' ? '¡Copiado!' : 'Copiar todo'}
                </button>
                <button onClick={enviarWhatsApp}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-sm">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Enviar comprobante
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Founder badge */}
      {isFounder && (
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50/80 border border-amber-200/60 rounded-2xl p-5 text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-amber-100 flex items-center justify-center">
            <span className="text-lg">👑</span>
          </div>
          <p className="text-sm font-bold text-amber-800">Fundador</p>
          <p className="text-xs text-amber-600 mt-1">Tu cuenta tiene acceso vitalicio como fundador. ¡Gracias por confiar en Nexus Core!</p>
        </div>
      )}
    </div>
  )
}
