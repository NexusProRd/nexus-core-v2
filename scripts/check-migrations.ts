import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function query(sql: string) {
  const { data, error } = await supabase.rpc('exec_sql', { sql_text: sql })
  if (error) {
    // Try direct REST approach
    console.log(`  ERROR: ${error.message}`)
    return null
  }
  return data
}

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!

  // Check by fetching from the REST API directly (bypasses RPC requirement)
  // Use Supabase's pg_dump-like introspection endpoint
  console.log('=== MIGRATION VERIFICATION ===\n')

  // Strategy: use supabase REST API to query information_schema via a direct fetch
  // This requires the service_role key which has full access
  
  const headers = {
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }

  async function sqlQuery(sql: string) {
    const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sql_text: sql }),
    })
    if (!res.ok) {
      const text = await res.text()
      return { error: text }
    }
    const data = await res.json()
    return { data }
  }

  // 058: commercial columns
  console.log('--- Migration 058: Commercial Infrastructure ---')
  let r = await sqlQuery(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='tiendas' AND column_name IN ('plan_tipo','plan_status','is_founder','trial_started_at','trial_ends_at')`)
  console.log('  plan_tipo/plan_status/is_founder/trial columns:', JSON.stringify(r))

  // 059: plan_nivel drop
  console.log('\n--- Migration 059: Drop plan_nivel ---')
  r = await sqlQuery(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='tiendas' AND column_name='plan_nivel'`)
  console.log('  plan_nivel column still exists:', JSON.stringify(r))

  // 060: disable legacy cron
  console.log('\n--- Migration 060: Disable Legacy Cron ---')
  r = await sqlQuery(`SELECT COUNT(*)::int as cnt FROM cron.job WHERE jobname='automatizar-suscripciones'`)
  console.log('  Legacy cron "automatizar-suscripciones" scheduled:', JSON.stringify(r))

  // 061: v2 function + schedule
  console.log('\n--- Migration 061: Commercial Timeline v2 ---')
  r = await sqlQuery(`SELECT COUNT(*)::int as cnt FROM information_schema.routines WHERE routine_schema='public' AND routine_name='automatizar_suscripciones_v2' AND routine_type='FUNCTION'`)
  console.log('  automatizar_suscripciones_v2 function exists:', JSON.stringify(r))
  
  r = await sqlQuery(`SELECT COUNT(*)::int as cnt FROM cron.job WHERE jobname='automatizar-suscripciones-v2'`)
  console.log('  Cron v2 scheduled:', JSON.stringify(r))

  // 062: new onboarding types
  console.log('\n--- Migration 062: Onboarding Types ---')
  r = await sqlQuery(`SELECT pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'tiendas'::regclass AND contype='c' AND connamespace = 'public'::regnamespace`)
  console.log('  CHECK constraint definition:', JSON.stringify(r))

  // 063: RPCs
  console.log('\n--- Migration 063: Fix Pedidos RLS ---')
  r = await sqlQuery(`SELECT COUNT(*)::int as cnt FROM information_schema.routines WHERE routine_schema='public' AND routine_name='track_pedido' AND routine_type='FUNCTION'`)
  console.log('  track_pedido RPC exists:', JSON.stringify(r))

  r = await sqlQuery(`SELECT COUNT(*)::int as cnt FROM information_schema.routines WHERE routine_schema='public' AND routine_name='obtener_id_pedido_por_order' AND routine_type='FUNCTION'`)
  console.log('  obtener_id_pedido_por_order RPC exists:', JSON.stringify(r))

  // Check RLS policies on pedidos
  console.log('\n--- Current RLS Policies on pedidos ---')
  r = await sqlQuery(`SELECT policyname, permissive, cmd, roles FROM pg_policies WHERE tablename='pedidos' AND schemaname='public'`)
  console.log('  Policies:', JSON.stringify(r))

  // Commerce columns check
  console.log('\n--- Commercial columns values ---')
  r = await sqlQuery(`SELECT COUNT(*)::int as cnt FROM tiendas WHERE plan_tipo IS NULL`)
  console.log('  Tiendas with plan_tipo=NULL:', JSON.stringify(r))

  r = await sqlQuery(`SELECT tipo_negocio, COUNT(*)::int as cnt FROM tiendas WHERE tipo_negocio NOT IN ('estandar','ropa') GROUP BY tipo_negocio`)
  console.log('  Non-standard tipo_negocio values:', JSON.stringify(r))

  console.log('\n=== VERIFICATION COMPLETE ===')
}

run().catch(console.error)
