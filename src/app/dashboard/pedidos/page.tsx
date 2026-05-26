import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
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
  const supabase = await createClient()
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('nx_session')?.value

  if (!sessionId) return { pedidos: [], tiendaId: '' }

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

  return (
    <div className="min-h-screen">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto py-5 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/dashboard" className="text-[var(--primary)] hover:brightness-110 text-sm font-medium transition-colors">
                ← Volver al Dashboard
              </Link>
              <div className="flex items-center gap-3 mt-1">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Pedidos</h1>
                <ClearAllButton />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-5 px-4 sm:px-6 lg:px-8">
        <PedidosLista pedidos={pedidos} tiendaId={tiendaId} />
      </main>
    </div>
  )
}