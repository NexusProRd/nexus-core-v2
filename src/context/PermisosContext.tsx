'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export interface Permisos {
  productos: boolean
  pedidos: boolean
  dashboard: boolean
  configuracion: boolean
}

interface SessionInfo {
  permisos: Permisos | null
  esDueno: boolean
  nombreColaborador: string | null
}

const SessionContext = createContext<SessionInfo>({ permisos: null, esDueno: true, nombreColaborador: null })

function parseColCookie(): { permisos?: Permisos; nombre?: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = document.cookie.replace(/(?:(?:^|.*;\s*)nx_colaborador\s*=\s*([^;]*).*$)|^.*$/, '$1')
    if (!raw) return null
    const parsed = JSON.parse(decodeURIComponent(raw))
    return parsed
  } catch {
    return null
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<SessionInfo>(() => {
    const col = parseColCookie()
    if (col?.permisos) {
      return {
        permisos: col.permisos as Permisos,
        esDueno: false,
        nombreColaborador: col.nombre || null,
      }
    }
    return { permisos: null, esDueno: true, nombreColaborador: null }
  })

  useEffect(() => {
    const col = parseColCookie()
    if (col?.permisos) {
      setInfo({
        permisos: col.permisos as Permisos,
        esDueno: false,
        nombreColaborador: col.nombre || null,
      })
    } else {
      setInfo({ permisos: null, esDueno: true, nombreColaborador: null })
    }
  }, [])

  return (
    <SessionContext.Provider value={info}>
      {children}
    </SessionContext.Provider>
  )
}

export function usePermisos() {
  return useContext(SessionContext)
}
