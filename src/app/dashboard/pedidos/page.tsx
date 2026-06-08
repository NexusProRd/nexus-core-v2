import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { getSessionFromCookieValue } from '@/lib/auth/get-session'
import PedidosLista from './PedidosLista'
import ClearAllButton from './ClearAllButton'

interface Pedido {
  id: string
  order_id?: string
  cliente_nombre: string
  cliente_telefono?: string | null
  total: number
  estado: string
  creado_at: string
  detalles_pedido: any
  is_gift?: boolean
  id_tienda?: string
  notas?: string | null
}

export const dynamic = 'force-dynamic'

async function getPedidos(): Promise<{ pedidos: Pedido[]; tiendaId: string }> {
  const admin = createAdminClient()
  const supabase = admin.supabase || await createClient()
  const cookieStore = await cookies()
  const rawSession = cookieStore.get('nx_session')?.value
  const session = await getSessionFromCookieValue(rawSession)

  if (!session.valid || !session.tiendaId) return { pedidos: [], tiendaId: '' }
  const sessionId = session.tiendaId

  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('*')
    .eq('id_tienda', sessionId)
    .order('creado_at', { ascending: false })

  return {
    pedidos: (pedidos || []) as Pedido[],
    tiendaId: sessionId,
  }
}

export default async function PedidosPage() {
  const { pedidos, tiendaId } = await getPedidos()

  const hoy = new Date().toISOString().slice(0, 10)
  const pedidosHoy = pedidos.filter(p => p.creado_at?.slice(0, 10) === hoy)
  const pendientes = pedidos.filter(p => p.estado === 'pendiente')
  const enCamino = pedidos.filter(p => p.estado === 'en_camino')
  const totalVentas = pedidos.reduce((s, p) => s + Number(p.total || 0), 0)

  return (
    <div className="min-h-screen">
      <header className="bg-white dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Pedidos</h1>
                <ClearAllButton />
              </div>
            </div>
          </div>

          {/* ORDERS UX PASS: Mini stats row */}
          {pedidos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl px-3.5 py-2.5 border border-amber-200 dark:border-amber-800/50">
                <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Recibidos hoy</p>
                <p className="text-lg font-bold text-amber-800 dark:text-amber-300 mt-0.5">{pedidosHoy.filter(p => p.estado === 'pendiente').length}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl px-3.5 py-2.5 border border-blue-200 dark:border-blue-800/50">
                <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Preparando</p>
                <p className="text-lg font-bold text-blue-800 dark:text-blue-300 mt-0.5">{pedidos.filter(p => p.estado === 'en_proceso').length}</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-500/10 rounded-xl px-3.5 py-2.5 border border-purple-200 dark:border-purple-800/50">
                <p className="text-[10px] font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">En Camino</p>
                <p className="text-lg font-bold text-purple-800 dark:text-purple-300 mt-0.5">{enCamino.length}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl px-3.5 py-2.5 border border-emerald-200 dark:border-emerald-800/50">
                <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Ventas hoy</p>
                <p className="text-lg font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">RD${new Intl.NumberFormat('es-DO').format(pedidosHoy.reduce((s, p) => s + Number(p.total || 0), 0))}</p>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-5 px-4 sm:px-6 lg:px-8">
        <PedidosLista pedidos={pedidos} tiendaId={tiendaId} />
      </main>
    </div>
  )
}
