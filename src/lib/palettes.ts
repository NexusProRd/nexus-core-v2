export interface PaletteColors {
  primary: string
  secondary: string
  background: string
  surface: string
  text: string
  textSecondary: string
  border: string
}

export interface Palette {
  name: string
  label: string
  description: string
  colors: PaletteColors
}

export const PALETTES: Palette[] = [
  {
    name: 'elegante',
    label: 'Elegante',
    description: 'Tonos violeta y neutros — ideal para marcas sofisticadas',
    colors: {
      primary: '#7C3AED',
      secondary: '#6D28D9',
      background: '#FAFAFA',
      surface: '#FFFFFF',
      text: '#1E293B',
      textSecondary: '#64748B',
      border: '#E2E8F0',
    },
  },
  {
    name: 'fresco',
    label: 'Fresco',
    description: 'Verde esmeralda — perfecto para naturaleza y bienestar',
    colors: {
      primary: '#059669',
      secondary: '#047857',
      background: '#F0FDF4',
      surface: '#FFFFFF',
      text: '#1E293B',
      textSecondary: '#64748B',
      border: '#E2E8F0',
    },
  },
  {
    name: 'pastel',
    label: 'Pastel',
    description: 'Rosa suave — cálido y acogedor para regalos y detalles',
    colors: {
      primary: '#E11D48',
      secondary: '#BE123C',
      background: '#FFF1F2',
      surface: '#FFFFFF',
      text: '#1E293B',
      textSecondary: '#64748B',
      border: '#E2E8F0',
    },
  },
  {
    name: 'moderno',
    label: 'Moderno',
    description: 'Azul corporativo — profesional y confiable',
    colors: {
      primary: '#2563EB',
      secondary: '#1D4ED8',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      text: '#0F172A',
      textSecondary: '#475569',
      border: '#CBD5E1',
    },
  },
  {
    name: 'dark',
    label: 'Dark Mode',
    description: 'Fondo oscuro con acento índigo — vibrante y moderno',
    colors: {
      primary: '#818CF8',
      secondary: '#6366F1',
      background: '#0F172A',
      surface: '#1E293B',
      text: '#F1F5F9',
      textSecondary: '#94A3B8',
      border: '#334155',
    },
  },
]

export function getPalette(name: string): Palette {
  return PALETTES.find(p => p.name === name) || PALETTES[0]
}

export function applyPalette(palette: Palette): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const c = palette.colors
  root.style.setProperty('--primary', c.primary)
  root.style.setProperty('--secondary', c.secondary)
  root.style.setProperty('--bg-color', c.background)
  root.style.setProperty('--surface-color', c.surface)
  root.style.setProperty('--text-color', c.text)
  root.style.setProperty('--text-secondary', c.textSecondary)
  root.style.setProperty('--border-color', c.border)
}

export function getPaletteFromConfig(themeConfig: unknown): Palette {
  if (!themeConfig) return PALETTES[0]
  if (typeof themeConfig === 'string') return getPalette(themeConfig)
  if (typeof themeConfig === 'object') {
    const config = themeConfig as Record<string, unknown>
    if (typeof config.palette === 'string') return getPalette(config.palette)
  }
  return PALETTES[0]
}
