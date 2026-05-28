// RECOVERY CENTER
import { createAdminClient } from '@/lib/supabase/admin'

export type SnapshotData = {
  productos: unknown[]
  perfil: unknown | null
  tienda: unknown | null
  config: unknown | null
}

export async function createSnapshot(
  tiendaId: string
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { supabase, error: adminError } = createAdminClient()
  if (adminError || !supabase) {
    return { ok: false, error: adminError || 'Error de configuración' }
  }

  const { data: productos, error: prodError } = await supabase
    .from('productos')
    .select('*')
    .eq('id_tienda', tiendaId)

  if (prodError) {
    return { ok: false, error: prodError.message }
  }

  const { data: perfil } = await supabase
    .from('perfil_tienda')
    .select('*')
    .eq('id_tienda', tiendaId)
    .maybeSingle()

  const { data: tienda } = await supabase
    .from('tiendas')
    .select('*')
    .eq('id', tiendaId)
    .maybeSingle()

  const { data: config } = await supabase
    .from('nexus_config')
    .select('*')

  const snapshotJson: SnapshotData = {
    productos: productos || [],
    perfil: perfil || null,
    tienda: tienda || null,
    config: config || null,
  }

  const { data: inserted, error: insertError } = await supabase
    .from('nexus_snapshots')
    .insert({
      tienda_id: tiendaId,
      tipo: 'manual',
      snapshot_json: snapshotJson,
      created_by: tiendaId,
    })
    .select('id')
    .single()

  if (insertError) {
    return { ok: false, error: insertError.message }
  }

  return { ok: true, id: inserted.id }
}
