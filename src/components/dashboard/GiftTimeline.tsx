'use client'

const STEPS = [
  { key: 'cobro', label: 'Pendiente de cobro', short: 'Pendiente' },
  { key: 'pagado', label: 'Pago confirmado', short: 'Pagado' },
  { key: 'enviado', label: 'Enlace enviado', short: 'Enlace' },
  { key: 'reclamado', label: 'Regalo reclamado', short: 'Reclamado' },
  { key: 'preparando', label: 'Preparando', short: 'Preparando' },
  { key: 'camino', label: 'En camino', short: 'Camino' },
  { key: 'entregado', label: 'Entregado', short: 'Entregado' },
]

const EXPLAINER = [
  { step: 'Pendiente de cobro', desc: 'El comercio está gestionando el cobro.' },
  { step: 'Pago confirmado', desc: 'El comercio confirmó el pago.' },
  { step: 'Enlace enviado', desc: 'Ya puedes compartir el enlace con el destinatario.' },
  { step: 'Regalo reclamado', desc: 'El destinatario aceptó el regalo.' },
  { step: 'Preparando', desc: 'El comercio está preparando el regalo.' },
  { step: 'En camino', desc: 'El regalo va rumbo al destinatario.' },
  { step: 'Entregado', desc: 'El destinatario recibió correctamente el regalo.' },
]

function getGiftStep(status: string, delivery_step?: string | null): number {
  if (status === 'DELIVERED') return 7
  if (status === 'CLAIMED' && delivery_step === 'SHIPPED') return 6
  if (status === 'CLAIMED' && delivery_step === 'CONTACTED') return 5
  if (status === 'CLAIMED') return 4
  if (status === 'RESERVED' || status === 'approved') return 3
  if (status === 'pending') return 1
  return 0
}

function isTerminal(status: string, converted_to_giftcard_at?: string | null): boolean {
  if (status === 'rejected' || status === 'cancelled' || status === 'expired') return true
  if (converted_to_giftcard_at) return true
  return false
}

function getTerminalLabel(status: string, converted_to_giftcard_at?: string | null): string {
  if (converted_to_giftcard_at) return 'Convertido a Gift Card'
  const map: Record<string, string> = {
    rejected: 'Rechazado',
    cancelled: 'Cancelado',
    expired: 'Vencido',
  }
  return map[status] || status
}

function getTerminalIcon(status: string, converted_to_giftcard_at?: string | null): string {
  if (converted_to_giftcard_at) return '🎁'
  const map: Record<string, string> = {
    rejected: '✕',
    cancelled: '—',
    expired: '⏰',
  }
  return map[status] || '•'
}

export default function GiftTimeline({
  status,
  delivery_step,
  converted_to_giftcard_at,
  variant = 'dashboard',
  showExplainer,
}: {
  status: string
  delivery_step?: string | null
  converted_to_giftcard_at?: string | null
  variant?: 'dashboard' | 'tracking'
  showExplainer?: boolean
}) {
  const currentStep = getGiftStep(status, delivery_step)

  if (isTerminal(status, converted_to_giftcard_at)) {
    return (
      <div className="flex items-center justify-center">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
          converted_to_giftcard_at
            ? 'bg-purple-100 text-purple-700'
            : status === 'rejected'
            ? 'bg-red-100 text-red-700'
            : status === 'expired'
            ? 'bg-amber-100 text-amber-700'
            : 'bg-slate-100 text-slate-500'
        }`}>
          <span>{getTerminalIcon(status, converted_to_giftcard_at)}</span>
          <span>{getTerminalLabel(status, converted_to_giftcard_at)}</span>
        </span>
      </div>
    )
  }

  if (variant === 'tracking') {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <h4 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Estado del regalo
        </h4>

        <div className="relative">
          <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-slate-200" />
          <div className="space-y-0">
            {STEPS.map((step, idx) => {
              const stepNumber = idx + 1
              const isCompleted = stepNumber <= currentStep
              const isCurrent = stepNumber === currentStep
              const colors = [
                'text-amber-500 bg-amber-100',
                'text-emerald-500 bg-emerald-100',
                'text-blue-500 bg-blue-100',
                'text-violet-500 bg-violet-100',
                'text-orange-500 bg-orange-100',
                'text-purple-500 bg-purple-100',
                'text-emerald-500 bg-emerald-100',
              ]
              return (
                <div key={step.key} className="relative flex items-start gap-4 pb-8 last:pb-0">
                  <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                    isCompleted ? colors[idx] : 'bg-slate-100 text-slate-300'
                  } ${isCurrent ? 'ring-4 ring-offset-2 ring-offset-white ' + colors[idx] : ''}`}>
                    {isCompleted ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-sm font-bold">{stepNumber}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pt-1.5">
                    <p className={`text-sm font-bold ${isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                      {step.label}
                    </p>
                    {isCurrent && currentStep < 7 && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[11px] font-medium text-emerald-600">En proceso</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {currentStep >= 7 && (
          <div className="mt-4 p-3 bg-emerald-50 rounded-xl text-center">
            <p className="text-sm font-bold text-emerald-700">✅ ¡Regalo entregado con éxito!</p>
          </div>
        )}

        {showExplainer && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">¿Qué significan estas etapas?</h5>
            <div className="space-y-2">
              {EXPLAINER.map((item) => (
                <div key={item.step} className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
                  <div>
                    <span className="text-xs font-semibold text-slate-700">{item.step}</span>
                    <span className="text-xs text-slate-500"> — {item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // dashboard variant — compact dot indicator
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-0.5">
        {STEPS.map((step, idx) => {
          const stepNumber = idx + 1
          const isCompleted = stepNumber <= currentStep
          const isCurrent = stepNumber === currentStep
          return (
            <div
              key={step.key}
              className={`w-2 h-2 rounded-full transition-colors ${
                isCompleted
                  ? 'bg-emerald-500'
                  : isCurrent
                  ? 'bg-[var(--primary)]'
                  : 'bg-slate-200 dark:bg-slate-600'
              }`}
              title={`${stepNumber}. ${step.label}`}
            />
          )
        })}
      </div>
      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
        {currentStep > 0 && currentStep <= 7 ? (
          <>Paso {currentStep} — {STEPS[currentStep - 1].short}</>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </span>
    </div>
  )
}
