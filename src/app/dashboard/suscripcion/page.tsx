import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getSessionFromCookieValue } from '@/lib/auth/get-session'
import { getPlanLabel, getStatusLabel } from '@/lib/commercial'
import SuscripcionClient from './SuscripcionClient'
import type { PlanTipo, PlanStatus } from '@/lib/commercial'

interface BankAccount {
  id: string
  banco: string
  titular: string
  tipo_cuenta: string
  numero_cuenta: string
  moneda: string
  activo: boolean
}

const DEFAULT_PRICES = { emprendedor: 380, pro: 900 }

export default async function SuscripcionPage() {
  const { supabase } = createAdminClient()
  if (!supabase) redirect('/login')
  const cookieStore = await cookies()
  const rawSession = cookieStore.get('nx_session')?.value
  const session = await getSessionFromCookieValue(rawSession)
  if (!session.valid || !session.tiendaId) redirect('/login')
  const sessionId = session.tiendaId

  const { data: tienda } = await supabase
    .from('tiendas')
    .select('id, nombre_tienda, currency_code, plan_tipo, plan_status, fecha_vencimiento, is_founder')
    .eq('id', sessionId)
    .single()
  if (!tienda) redirect('/login')

  const claves = ['bank_accounts', 'paypal_email', 'paypal_activo', 'plan_emprendedor_price', 'plan_pro_price']
  const { data: configRows } = await supabase
    .from('nexus_config')
    .select('clave, valor')
    .in('clave', claves)

  const configMap = new Map(configRows?.map(r => [r.clave, r.valor]) ?? [])

  let bankAccounts: BankAccount[] = []
  const raw = configMap.get('bank_accounts')
  if (raw) { try { bankAccounts = JSON.parse(raw) } catch {} }

  const paypalEmail = configMap.get('paypal_email') || ''
  const paypalActivo = configMap.get('paypal_activo') === 'true'

  const planPrices = {
    emprendedor: Number(configMap.get('plan_emprendedor_price')) || DEFAULT_PRICES.emprendedor,
    pro: Number(configMap.get('plan_pro_price')) || DEFAULT_PRICES.pro,
  }

  const planTipo = (tienda.plan_tipo || 'emprendedor') as PlanTipo
  const planStatus = (tienda.plan_status || 'trial') as PlanStatus

  // Load whatsapp_soporte for the WhatsApp button
  const { data: waCfg } = await supabase
    .from('nexus_config')
    .select('valor')
    .eq('clave', 'whatsapp_soporte')
    .maybeSingle()
  const whatsappSoporte = waCfg?.valor || '18299999999'

  return (
    <SuscripcionClient
      initialPlanData={{
        planTipo,
        planStatus,
        fechaVencimiento: tienda.fecha_vencimiento || null,
        currencyCode: tienda.currency_code || 'DOP',
        isFounder: tienda.is_founder || false,
      }}
      bankAccounts={bankAccounts.filter(a => a.activo)}
      paypal={{ email: paypalEmail, activo: paypalActivo }}
      planPrices={planPrices}
      nombreTienda={tienda.nombre_tienda || 'Mi Tienda'}
      whatsappSoporte={whatsappSoporte}
    />
  )
}
