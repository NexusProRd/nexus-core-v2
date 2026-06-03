import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { supabase, error: adminError } = createAdminClient()
    if (!supabase) return NextResponse.json({ error: adminError || 'Error de configuración' }, { status: 500 })

    // Fetch the backup
    const { data: backup, error: fetchError } = await supabase
      .from('nexus_backups')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !backup) {
      return NextResponse.json({ error: 'Backup no encontrado' }, { status: 404 })
    }

    if (!backup.id_tienda) {
      return NextResponse.json({ error: 'Este backup no tiene una tienda asociada. Las restauraciones globales ya no están disponibles.' }, { status: 400 })
    }

    const data = backup.data as Record<string, any>
    const errors: string[] = []

    // Restore single store
    if (data.tienda) {
      const { error } = await supabase.from('tiendas').upsert(data.tienda, { onConflict: 'id' })
      if (error) errors.push(`tiendas: ${error.message}`)
    }
    if (data.productos?.length) {
      for (const prod of data.productos) {
        const { error } = await supabase.from('productos').upsert(prod, { onConflict: 'id' })
        if (error) errors.push(`producto ${prod.id}: ${error.message}`)
      }
    }
    if (data.pedidos?.length) {
      for (const pedido of data.pedidos) {
        const detalles = pedido.detalles_pedido || []
        delete pedido.detalles_pedido
        const { error } = await supabase.from('pedidos').upsert(pedido, { onConflict: 'id' })
        if (error) errors.push(`pedido ${pedido.id}: ${error.message}`)
        if (detalles.length) {
          for (const d of detalles) {
            const { error: de } = await supabase.from('detalles_pedido').upsert(d, { onConflict: 'id' })
            if (de) errors.push(`detalle ${d.id}: ${de.message}`)
          }
        }
      }
    }
    if (data.perfil) {
      const { error } = await supabase.from('perfil_tienda').upsert(data.perfil, { onConflict: 'id' })
      if (error) errors.push(`perfil: ${error.message}`)
    }
    if (data.cupones?.length) {
      for (const cupon of data.cupones) {
        const { error } = await supabase.from('coupons').upsert(cupon, { onConflict: 'id' })
        if (error) errors.push(`cupon ${cupon.id}: ${error.message}`)
      }
    }
    if (data.regalos?.length) {
      for (const regalo of data.regalos) {
        const { error } = await supabase.from('gift_experiences').upsert(regalo, { onConflict: 'id' })
        if (error) errors.push(`regalo ${regalo.id}: ${error.message}`)
      }
    }
    if (data.colaboradores?.length) {
      for (const colab of data.colaboradores) {
        const { error } = await supabase.from('colaboradores').upsert(colab, { onConflict: 'id' })
        if (error) errors.push(`colaborador ${colab.id}: ${error.message}`)
      }
    }
    if (data.catalogo_modal?.length) {
      for (const cm of data.catalogo_modal) {
        const { error } = await supabase.from('nexus_catalogo_modal').upsert(cm, { onConflict: 'id' })
        if (error) errors.push(`catalogo_modal ${cm.id}: ${error.message}`)
      }
    }

    // Log the restore action
    await supabase.from('nexus_logs').insert({
      id_tienda: backup.id_tienda,
      modulo: 'backups',
      accion: 'restore',
      detalle: `Restaurado desde backup ${id}`,
      metadata: { backup_id: id, errors: errors.length ? errors : null },
    })

    if (errors.length) {
      return NextResponse.json({ restored: true, errors }, { status: 200 })
    }

    return NextResponse.json({ restored: true, errors: [] })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error inesperado' }, { status: 500 })
  }
}
