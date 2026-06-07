import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getSessionFromCookieValue } from '@/lib/auth/get-session'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const cookieStore = await cookies()
  const rawSession = cookieStore.get('nx_session')?.value
  const session = await getSessionFromCookieValue(rawSession)
  if (!session.valid || !session.tiendaId) redirect('/login')
  const sessionId = session.tiendaId

  async function guardarTienda(formData: FormData) {
    'use server'
    const { supabase: adminSupabase, error: adminError } = createAdminClient()
    const cookieStore = await cookies()
    const rawSession = cookieStore.get('nx_session')?.value
    const session = await getSessionFromCookieValue(rawSession)
    if (!session.valid || !session.tiendaId) redirect('/login')
    const sessionId = session.tiendaId
    if (adminError || !adminSupabase) redirect('/login')

    const pais_codigo = formData.get('pais_codigo') as string || 'DO'
    const tipo_negocio = formData.get('tipo_negocio') as string || 'estandar'

    const { error } = await adminSupabase.from('tiendas').upsert({
      id: sessionId,
      pais_codigo,
      moneda_simbolo: pais_codigo === 'DO' ? 'RD$' : '$',
      tipo_negocio,
      onboarding_completo: true,
    })

    if (!error) {
      revalidatePath('/dashboard')
      redirect('/dashboard')
    }
  }

  async function omitirOnboarding() {
    'use server'
    const { supabase: adminSupabase, error: adminError } = createAdminClient()
    const cookieStore = await cookies()
    const rawSession = cookieStore.get('nx_session')?.value
    const session = await getSessionFromCookieValue(rawSession)
    if (!session.valid || !session.tiendaId) redirect('/login')
    const sessionId = session.tiendaId
    if (adminError || !adminSupabase) redirect('/login')

    await adminSupabase.from('tiendas').upsert({
      id: sessionId,
      pais_codigo: 'DO',
      moneda_simbolo: 'RD$',
      tipo_negocio: 'estandar',
      onboarding_completo: true,
    })

    revalidatePath('/dashboard')
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 dark:from-slate-900 dark:to-slate-800 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg">N</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white">Completa tu tienda</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Puedes personalizar el resto más adelante desde Configuración.</p>
        </div>

        <form action={guardarTienda} className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/80 p-6 sm:p-8 space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">País</label>
            <select name="pais_codigo" defaultValue="DO"
              className="w-full px-3 py-2.5 text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="DO" className="dark:bg-slate-800 dark:text-white">República Dominicana</option>
              <option value="US" className="dark:bg-slate-800 dark:text-white">Estados Unidos</option>
              <option value="MX" className="dark:bg-slate-800 dark:text-white">México</option>
              <option value="CO" className="dark:bg-slate-800 dark:text-white">Colombia</option>
              <option value="AR" className="dark:bg-slate-800 dark:text-white">Argentina</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Tipo de Negocio</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { value: 'estandar', emoji: '🏪', label: 'Estándar', desc: 'Tecnología, Floristería, Servicios Generales' },
                { value: 'ropa', emoji: '👗', label: 'Boutique / Ropa', desc: 'Tallas y variantes de prendas' },
              ].map(n => (
                <label key={n.value}
                  className="flex flex-col gap-2 p-4 rounded-xl border-2 border-slate-200 cursor-pointer transition-all hover:border-violet-300 hover:bg-violet-50/30 has-[:checked]:border-violet-600 has-[:checked]:bg-violet-50 has-[:checked]:ring-2 has-[:checked]:ring-violet-600/20">
                  <input type="radio" name="tipo_negocio" value={n.value}
                    defaultChecked={n.value === 'estandar'}
                    className="w-4 h-4 text-violet-600 focus:ring-violet-500 shrink-0" />
                  <div className="flex items-center gap-3">
                    <span className="text-lg shrink-0">{n.emoji}</span>
                    <div>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{n.label}</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">{n.desc}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button type="submit"
            className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold py-3 px-4 rounded-xl hover:brightness-110 transition-all shadow-lg shadow-teal-500/25 text-base">
            Guardar y entrar al Dashboard
          </button>
        </form>

        <form action={omitirOnboarding} className="mt-3 text-center">
          <button type="submit"
            className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline underline-offset-2 transition-colors">
            Omitir por ahora
          </button>
        </form>
      </div>
    </div>
  )
}
