'use client'

import { useRef, useEffect } from 'react'
import { optimizarImagen } from '@/lib/image'

export default function LogoUpload() {
  const inputRef = useRef<HTMLInputElement>(null)
  const optimizedRef = useRef<File | null>(null)

  useEffect(() => {
    const form = inputRef.current?.closest('form')
    if (!form) return

    const handler = () => {
      if (optimizedRef.current && inputRef.current) {
        const dt = new DataTransfer()
        dt.items.add(optimizedRef.current)
        inputRef.current.files = dt.files
      }
    }

    form.addEventListener('submit', handler)
    return () => form.removeEventListener('submit', handler)
  }, [])

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const optimized = await optimizarImagen(file, 300, 0.9)
      optimizedRef.current = optimized
    } catch {
      // fallback: keep original file
    }
  }

  return (
    <input ref={inputRef} type="file" name="logo" accept="image/*" onChange={handleChange}
      className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 cursor-pointer" />
  )
}
