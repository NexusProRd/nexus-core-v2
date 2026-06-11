'use client'

import { ReactNode } from 'react'
import { ConfigProvider } from '@/context/ConfigProvider'

interface PerfilTienda {
  nombre_comercial: string | null
  logo_url: string | null
  banner_url: string | null
  slogan?: string | null
  color_primario: string | null
  mensaje_bienvenida: string | null
  whatsapp_numero: string | null
  sobre_nosotros?: string | null
  horario?: string | null
  theme_config?: unknown
}

interface Tienda {
  nombre_tienda: string
  moneda_simbolo: string
  currency_code?: string
  direccion?: string | null
}

interface StoreProviderProps {
  children: ReactNode
  idTienda: string
  perfil: PerfilTienda | null
  tiendaBase: Tienda | null
  tipoNegocio?: string
}

export default function StoreProvider({ children, idTienda, perfil, tiendaBase, tipoNegocio = 'estandar' }: StoreProviderProps) {
  const tienePerfilValido = perfil && (
    perfil.nombre_comercial || 
    perfil.logo_url || 
    perfil.color_primario || 
    perfil.mensaje_bienvenida || 
    perfil.whatsapp_numero
  )

  const initialConfig = tienePerfilValido ? { ...perfil, direccion: tiendaBase?.direccion } : (tiendaBase ? {
    nombre_comercial: tiendaBase.nombre_tienda,
    logo_url: null,
    banner_url: null,
    color_primario: '#3B82F6',
    mensaje_bienvenida: null,
    whatsapp_numero: null,
    direccion: tiendaBase.direccion,
  } : undefined)

  const monedaSimbolo = tiendaBase?.moneda_simbolo || 'RD$'
  const currencyCode = tiendaBase?.currency_code || 'DOP'

  return (
    <ConfigProvider 
      idTienda={idTienda} 
      initialConfig={initialConfig || undefined}
      monedaSimbolo={monedaSimbolo}
      currencyCode={currencyCode}
      tipoNegocio={tipoNegocio}
    >
      {children}
    </ConfigProvider>
  )
}