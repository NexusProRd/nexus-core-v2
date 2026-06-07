'use client'

import { useFormStatus } from 'react-dom'

export default function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending}
      className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold py-3 px-4 rounded-xl hover:brightness-110 transition-all shadow-lg shadow-teal-500/25 text-base disabled:opacity-60 disabled:cursor-not-allowed">
      {pending ? 'Guardando...' : 'Guardar y entrar al Dashboard'}
    </button>
  )
}
