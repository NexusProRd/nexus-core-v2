import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'

export async function GET(req: Request) {
  try {
    const session = await getSession(req)
    if (!session.valid || !session.tiendaId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const tiendaId = session.tiendaId

    const { supabase, error: adminError } = createAdminClient()
    if (adminError || !supabase) return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })

    const { data, error } = await supabase
      .from('nexus_backups')
      .select('id, tipo, size_bytes, created_at')
      .eq('id_tienda', tiendaId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw new Error(error.message)

    return NextResponse.json(data || [])
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error inesperado' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session.valid || !session.tiendaId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const tiendaId = session.tiendaId

    const { supabase, error: adminError } = createAdminClient()
    if (adminError || !supabase) return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })

    const { backupId } = await req.json()

    if (!backupId) return NextResponse.json({ error: 'ID de backup requerido' }, { status: 400 })

    // Fetch backup and verify it belongs to this store
    const { data: backup, error: fetchError } = await supabase
      .from('nexus_backups')
      .select('*')
      .eq('id', backupId)
      .eq('id_tienda', tiendaId)
      .single()

    if (fetchError || !backup) return NextResponse.json({ error: 'Backup no encontrado' }, { status: 404 })

    const data = backup.data as Record<string, any>
    const errors: string[] = []

    // Restore products
    if (data.productos?.length) {
      for (const prod of data.productos) {
        const { error } = await supabase.from('productos').upsert(prod, { onConflict: 'id' })
        if (error) errors.push(`producto ${prod.id}: ${error.message}`)
      }
    }

    // Restore perfil
    if (data.perfil) {
      const { error } = await supabase.from('perfil_tienda').upsert(data.perfil, { onConflict: 'id' })
      if (error) errors.push(`perfil: ${error.message}`)
    }

    // Restore tienda settings
    if (data.tienda) {
      const { error } = await supabase.from('tiendas').upsert({
        id: data.tienda.id,
        nombre_tienda: data.tienda.nombre_tienda,
        esta_activa: data.tienda.esta_activa,
        plan_nivel: data.tienda.plan_nivel,
        tipo_negocio: data.tienda.tipo_negocio,
        slug: data.tienda.slug,
      }, { onConflict: 'id' })
      if (error) errors.push(`tienda: ${error.message}`)
    }

    if (errors.length) {
      return NextResponse.json({ restored: true, errors })
    }

    return NextResponse.json({ restored: true, errors: [] })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error inesperado' }, { status: 500 })
  }
}
