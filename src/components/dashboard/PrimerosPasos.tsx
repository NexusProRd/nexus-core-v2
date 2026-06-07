'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface PrimerosPasosProps {
  tiendaId: string
  checklist: Record<string, boolean>
}

const ITEMS = [
  {
    key: 'recuperacion',
    label: 'Configurar recuperación de cuenta',
    desc: 'Protege tu acceso a la tienda',
    cta: 'Configurar ahora',
    href: '/dashboard/configurar#seguridad',
  },
  {
    key: 'logo',
    label: 'Agregar logo',
    desc: 'Tus clientes te reconocerán más fácil',
    cta: 'Subir logo',
    href: '/dashboard/configurar#logo',
  },
  {
    key: 'informacion',
    label: 'Completar información de la tienda',
    desc: 'Horarios, descripción y datos de contacto',
    cta: 'Completar perfil',
    href: '/dashboard/configurar#informacion',
  },
  {
    key: 'productos',
    label: 'Agregar tus propios productos',
    desc: 'Reemplaza los productos genéricos por los tuyos',
    cta: 'Ir al inventario',
    href: '/dashboard/inventario',
  },
]

export default function PrimerosPasos({ tiendaId, checklist }: PrimerosPasosProps) {
  const [oculto, setOculto] = useState(false)
  const storageKey = `nexus_checklist_oculto_${tiendaId}`

  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored === 'true') setOculto(true)
  }, [storageKey])

  const completadas = ITEMS.filter(item => checklist[item.key]).length
  const total = ITEMS.length
  const todoCompleto = completadas === total

  if (oculto || todoCompleto) return null

  const handleOcultar = () => {
    setOculto(true)
    localStorage.setItem(storageKey, 'true')
  }

  return (
    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/10 dark:to-indigo-900/10 border border-violet-200 dark:border-violet-800 rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🎉</span>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">¡Tu tienda está lista!</h2>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 ml-1">
        Completa estos pasos recomendados para que tus clientes te encuentren y compren sin problemas.
      </p>

      <div className="flex items-center gap-2 mb-4 ml-1">
        <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${(completadas / total) * 100}%` }}
          />
        </div>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">{completadas}/{total}</span>
      </div>

      <div className="space-y-2">
        {ITEMS.map(item => {
          const done = checklist[item.key]
          return (
            <div key={item.key} className={`flex items-center justify-between gap-3 px-3 sm:px-4 py-3 rounded-xl transition-colors ${
              done
                ? 'bg-emerald-50/50 dark:bg-emerald-900/10'
                : 'bg-white dark:bg-slate-800/40 hover:bg-violet-50/50 dark:hover:bg-violet-900/10'
            }`}>
              <div className="flex items-center gap-3 min-w-0">
                <span className={`text-base shrink-0 ${done ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {done ? '☑' : '□'}
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${done ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                    {item.label}
                  </p>
                  <p className={`text-xs truncate ${done ? 'text-slate-400' : 'text-slate-500'}`}>
                    {done ? 'Completado' : item.desc}
                  </p>
                </div>
              </div>
              {!done && (
                <Link href={item.href}
                  className="shrink-0 px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg transition-colors">
                  {item.cta}
                </Link>
              )}
            </div>
          )
        })}
      </div>

      <button onClick={handleOcultar}
        className="mt-4 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors ml-1">
        Ocultar esta guía
      </button>
    </div>
  )
}
