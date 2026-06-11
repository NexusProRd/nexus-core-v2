// RECOVERY CENTER
import { createAdminClient } from '@/lib/supabase/admin'
import { createSnapshot } from './create-snapshot'

const SAFE_TIENDA_FIELDS = [
  'nombre_tienda',
  'whatsapp_num',
  'pais_codigo',
  'moneda_simbolo',
  'currency_code',
  'direccion',
  'rnc',
  'tipo_negocio',
  'slug',
  'onboarding_completo',
  'esta_activa',
  'fecha_vencimiento',
  'nombre_socio',
  'telefono_socio',
  'email',
]

export async function restoreSnapshot(
  snapshotId: string,
  tiendaId: string
): Promise<{ ok: boolean; safetySnapshotId?: string; error?: string }> {
  const { supabase, error: adminError } = createAdminClient()
  if (adminError || !supabase) {
    return { ok: false, error: adminError || 'Error de configuración' }
  }

  // Look up snapshot and validate ownership
  const { data: snapshot, error: fetchError } = await supabase
    .from('nexus_snapshots')
    .select('*')
    .eq('id', snapshotId)
    .single()

  if (fetchError || !snapshot) {
    return { ok: false, error: 'Snapshot no encontrado' }
  }

  if (snapshot.tienda_id !== tiendaId) {
    return { ok: false, error: 'La snapshot no pertenece a esta tienda' }
  }

  // Create automatic safety snapshot before restore
  const safety = await createSnapshot(tiendaId)
  if (!safety.ok) {
    return { ok: false, error: 'Error al crear snapshot de seguridad previo al restore' }
  }

  const data = snapshot.snapshot_json as {
    productos: Record<string, unknown>[]
    perfil: Record<string, unknown> | null
    tienda: Record<string, unknown> | null
  }

  // Restore productos
  if (Array.isArray(data.productos) && data.productos.length > 0) {
    const productosConTienda = data.productos.map((p: Record<string, unknown>) => ({
      ...p,
      id_tienda: tiendaId,
    }))

    const { error: upsertError } = await supabase
      .from('productos')
      .upsert(productosConTienda, { onConflict: 'id', ignoreDuplicates: false })

    if (upsertError) {
      return { ok: false, error: `Error al restaurar productos: ${upsertError.message}` }
    }
  }

  // Restore perfil_tienda
  if (data.perfil) {
    const { error: perfilError } = await supabase
      .from('perfil_tienda')
      .upsert({ ...data.perfil, id_tienda: tiendaId }, { onConflict: 'id_tienda', ignoreDuplicates: false })

    if (perfilError) {
      return { ok: false, error: `Error al restaurar perfil: ${perfilError.message}` }
    }
  }

  // Restore safe tienda fields
  if (data.tienda) {
    const updateData: Record<string, unknown> = {}
    for (const field of SAFE_TIENDA_FIELDS) {
      if (field in data.tienda) {
        updateData[field] = data.tienda[field]
      }
    }

    if (Object.keys(updateData).length > 0) {
      const { error: tiendaError } = await supabase
        .from('tiendas')
        .update(updateData)
        .eq('id', tiendaId)

      if (tiendaError) {
        return { ok: false, error: `Error al restaurar tienda: ${tiendaError.message}` }
      }
    }
  }

  return { ok: true, safetySnapshotId: safety.id }
}
