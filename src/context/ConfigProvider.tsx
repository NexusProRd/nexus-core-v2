'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getPalette, getPaletteFromConfig, applyPalette, type Palette } from '@/lib/palettes'

interface ConfigContextType {
  colorPrimario: string
  colorSecundario: string
  logoUrl: string | null
  bannerUrl: string | null
  slogan: string
  nombreTienda: string
  mensajeBienvenida: string
  whatsappNumber: string
  monedaSimbolo: string
  isLoading: boolean
  palette: Palette
  paletteName: string
  idTienda: string
  instagramUrl: string | null
  facebookUrl: string | null
  tiktokUrl: string | null
  mapsUrl: string | null
  tipoNegocio: string
  sobreNosotros: string
  horario: string
  direccion: string
}

const ConfigContext = createContext<ConfigContextType | null>(null)

export function useConfig() {
  const context = useContext(ConfigContext)
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider')
  }
  return context
}

interface ConfigProviderProps {
  children: ReactNode
  idTienda: string
  initialConfig?: {
    nombre_comercial: string | null
    logo_url: string | null
    banner_url: string | null
    slogan?: string | null
    color_primario: string | null
    mensaje_bienvenida: string | null
    whatsapp_numero: string | null
    sobre_nosotros?: string | null
    horario?: string | null
    direccion?: string | null
    instagram?: string | null
    facebook?: string | null
    tiktok?: string | null
    google_maps?: string | null
    theme_config?: unknown
  }
  monedaSimbolo?: string
  tipoNegocio?: string
}

export function ConfigProvider({ children, idTienda, initialConfig, monedaSimbolo = 'RD$', tipoNegocio = 'estandar' }: ConfigProviderProps) {
  const [mounted, setMounted] = useState(false)
  const [colorPrimario, setColorPrimario] = useState('#3B82F6')
  const [colorSecundario, setColorSecundario] = useState('#8B5CF6')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [slogan, setSlogan] = useState('')
  const [nombreTienda, setNombreTienda] = useState('Mi Tienda')
  const [mensajeBienvenida, setMensajeBienvenida] = useState('¡Bienvenido a nuestra tienda!')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [sobreNosotros, setSobreNosotros] = useState('')
  const [horario, setHorario] = useState('')
  const [direccion, setDireccion] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [palette, setPalette] = useState<Palette>(() => getPalette('elegante'))

  useEffect(() => {
    setMounted(true)

    const savedConfig = localStorage.getItem(`nexus-config-${idTienda}`)
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig)
        if (parsed.colorPrimario) setColorPrimario(parsed.colorPrimario)
        if (parsed.colorSecundario) setColorSecundario(parsed.colorSecundario)
        if (parsed.logoUrl) setLogoUrl(parsed.logoUrl)
        if (parsed.bannerUrl) setBannerUrl(parsed.bannerUrl)
        if (parsed.nombreTienda) setNombreTienda(parsed.nombreTienda)
        if (parsed.mensajeBienvenida) setMensajeBienvenida(parsed.mensajeBienvenida)
        if (parsed.whatsappNumber) setWhatsappNumber(parsed.whatsappNumber)
        if (parsed.paletteName) setPalette(getPalette(parsed.paletteName))
      } catch {
        localStorage.removeItem(`nexus-config-${idTienda}`)
      }
    }

    if (initialConfig) {
      if (initialConfig.color_primario) {
        setColorPrimario(initialConfig.color_primario)
      }
      if (initialConfig.nombre_comercial) {
        setNombreTienda(initialConfig.nombre_comercial)
      }
      if (initialConfig.logo_url) {
        setLogoUrl(initialConfig.logo_url)
      }
      if (initialConfig.banner_url) {
        setBannerUrl(initialConfig.banner_url)
      }
      if (initialConfig.slogan) {
        setSlogan(initialConfig.slogan)
      }
      if (initialConfig.mensaje_bienvenida) {
        setMensajeBienvenida(initialConfig.mensaje_bienvenida)
      }
      if (initialConfig.whatsapp_numero) {
        setWhatsappNumber(initialConfig.whatsapp_numero)
      }
      if (initialConfig.sobre_nosotros) {
        setSobreNosotros(initialConfig.sobre_nosotros)
      }
      if (initialConfig.horario) {
        setHorario(initialConfig.horario)
      }
      if (initialConfig.direccion) {
        setDireccion(initialConfig.direccion)
      }

      const loadedPalette = getPaletteFromConfig(initialConfig.theme_config)
      setPalette(loadedPalette)

      localStorage.setItem(`nexus-config-${idTienda}`, JSON.stringify({
        colorPrimario: initialConfig.color_primario || '#3B82F6',
        nombreTienda: initialConfig.nombre_comercial || 'Mi Tienda',
        logoUrl: initialConfig.logo_url,
        bannerUrl: initialConfig.banner_url,
        mensajeBienvenida: initialConfig.mensaje_bienvenida || '¡Bienvenido!',
        whatsappNumber: initialConfig.whatsapp_numero || '',
        paletteName: loadedPalette.name,
      }))
    }

    setIsLoading(false)
  }, [idTienda, initialConfig])

  useEffect(() => {
    if (mounted) {
      applyPalette(palette)
    }
  }, [mounted, palette])

  const value: ConfigContextType = {
    colorPrimario: mounted ? colorPrimario : '#3B82F6',
    colorSecundario: mounted ? colorSecundario : '#8B5CF6',
    logoUrl: mounted ? logoUrl : null,
    bannerUrl: mounted ? bannerUrl : null,
    slogan: mounted ? slogan : '',
    nombreTienda: mounted ? nombreTienda : 'Mi Tienda',
    mensajeBienvenida: mounted ? mensajeBienvenida : '¡Bienvenido!',
    whatsappNumber: mounted ? whatsappNumber : '',
    monedaSimbolo,
    isLoading: mounted && isLoading,
    palette: mounted ? palette : getPalette('elegante'),
    paletteName: mounted ? palette.name : 'elegante',
    idTienda,
    instagramUrl: initialConfig?.instagram || null,
    facebookUrl: initialConfig?.facebook || null,
    tiktokUrl: initialConfig?.tiktok || null,
    mapsUrl: initialConfig?.google_maps || null,
    tipoNegocio,
    sobreNosotros: mounted ? sobreNosotros : '',
    horario: mounted ? horario : '',
    direccion: mounted ? direccion : '',
  }

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  )
}