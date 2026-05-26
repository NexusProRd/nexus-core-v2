'use client'

import { PALETTES, type Palette } from '@/lib/palettes'

interface PaletteSelectorProps {
  value: string
  onChange: (paletteName: string) => void
}

export default function PaletteSelector({ value, onChange }: PaletteSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {PALETTES.map((palette: Palette) => {
        const isSelected = value === palette.name
        return (
          <button
            key={palette.name}
            type="button"
            onClick={() => onChange(palette.name)}
            className={`relative p-3 rounded-xl border-2 transition-all text-left ${
              isSelected
                ? 'border-[var(--primary,#7C3AED)] ring-2 ring-[var(--primary,#7C3AED)]/20 bg-violet-50'
                : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-sm'
            }`}
          >
            {isSelected && (
              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[var(--primary,#7C3AED)] flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="w-5 h-5 rounded-full border border-white/50 shadow-sm" style={{ backgroundColor: palette.colors.primary }} />
              <span className="w-5 h-5 rounded-full border border-white/50 shadow-sm" style={{ backgroundColor: palette.colors.secondary }} />
              <span className="w-5 h-5 rounded-full border border-white/50 shadow-sm" style={{ backgroundColor: palette.colors.background }} />
              <span className="w-5 h-5 rounded-full border border-white/50 shadow-sm" style={{ backgroundColor: palette.colors.text }} />
            </div>
            <p className="text-sm font-semibold text-slate-800">{palette.label}</p>
            <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{palette.description}</p>
          </button>
        )
      })}
    </div>
  )
}
