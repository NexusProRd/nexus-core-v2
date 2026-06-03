import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const { supabase, error: adminError } = createAdminClient()
    if (!supabase) return NextResponse.json({ error: adminError || 'Error de configuración' }, { status: 500 })

    const { data, error } = await supabase
      .from('nexus_backups')
      .select('id, id_tienda, tipo, size_bytes, tokens_cost, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw new Error(error.message)

    const tiendaIds = [...new Set(data.filter(b => b.id_tienda).map(b => b.id_tienda))]
    const { data: tiendas } = tiendaIds.length ? await supabase
      .from('tiendas')
      .select('id, nombre_tienda')
      .in('id', tiendaIds) : { data: [] }

    const tiendaMap = Object.fromEntries((tiendas || []).map(t => [t.id, t.nombre_tienda]))

    const backups = data.map(b => ({
      ...b,
      nombre_tienda: b.id_tienda ? tiendaMap[b.id_tienda] || 'Desconocida' : 'Todas las tiendas',
    }))

    return NextResponse.json(backups)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error inesperado' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, error: adminError } = createAdminClient()
    if (!supabase) return NextResponse.json({ error: adminError || 'Error de configuración' }, { status: 500 })

    const body = await req.json().catch(() => ({}))
    const idTienda: string | null = body.id_tienda || null

    // Fetch token cost from config
    const { data: configRow } = await supabase
      .from('nexus_config')
      .select('valor')
      .eq('clave', 'backup_tokens_cost')
      .single()
    const tokensCost = parseInt(configRow?.valor || '5', 10)

    // Gather data to backup
    let backupData: any = {}

    if (idTienda) {
      // Single store backup
      const [tiendaR, prodR, pedidosR, perfilR, cuponesR, regalosR, colabR, catalogoR] = await Promise.all([
        supabase.from('tiendas').select('*').eq('id', idTienda).single(),
        supabase.from('productos').select('*').eq('id_tienda', idTienda),
        supabase.from('pedidos').select('*, detalles_pedido(*)').eq('id_tienda', idTienda),
        supabase.from('perfil_tienda').select('*').eq('id_tienda', idTienda).maybeSingle(),
        supabase.from('coupons').select('*').eq('store_id', idTienda),
        supabase.from('gift_experiences').select('*').eq('store_id', idTienda),
        supabase.from('colaboradores').select('*').eq('id_tienda', idTienda),
        supabase.from('nexus_catalogo_modal').select('*').eq('id_tienda', idTienda).maybeSingle(),
      ])
      if (tiendaR.error) throw new Error(tiendaR.error.message)

      const urls: string[] = []
      if (prodR.data) {
        for (const p of prodR.data) { if (p.imagen_url) urls.push(p.imagen_url) }
      }
      if (perfilR.data) {
        if (perfilR.data.logo_url) urls.push(perfilR.data.logo_url)
        if (perfilR.data.banner_url) urls.push(perfilR.data.banner_url)
      }

      backupData = {
        version: 2,
        tienda: tiendaR.data,
        productos: prodR.data || [],
        pedidos: pedidosR.data || [],
        perfil: perfilR.data || null,
        cupones: cuponesR.data || [],
        regalos: regalosR.data || [],
        colaboradores: colabR.data || [],
        catalogo_modal: catalogoR.data ? [catalogoR.data] : [],
        storage_files: urls,
      }
    } else {
      // All stores backup — incluye TODO
      const [
        tiendasR, prodR, pedidosR, perfilesR,
        cuponesR, regalosR, colabR, catalogoR,
      ] = await Promise.all([
        supabase.from('tiendas').select('*'),
        supabase.from('productos').select('*'),
        supabase.from('pedidos').select('*, detalles_pedido(*)'),
        supabase.from('perfil_tienda').select('*'),
        supabase.from('coupons').select('*'),
        supabase.from('gift_experiences').select('*'),
        supabase.from('colaboradores').select('*'),
        supabase.from('nexus_catalogo_modal').select('*'),
      ])

      const urls: string[] = []
      if (prodR.data) {
        for (const p of prodR.data) { if (p.imagen_url) urls.push(p.imagen_url) }
      }
      if (perfilesR.data) {
        for (const pf of perfilesR.data) {
          if (pf.logo_url) urls.push(pf.logo_url)
          if (pf.banner_url) urls.push(pf.banner_url)
        }
      }

      backupData = {
        version: 2,
        tiendas: tiendasR.data || [],
        productos: prodR.data || [],
        pedidos: pedidosR.data || [],
        perfiles: perfilesR.data || [],
        cupones: cuponesR.data || [],
        regalos: regalosR.data || [],
        colaboradores: colabR.data || [],
        catalogo_modal: catalogoR.data || [],
        storage_files: urls,
      }
    }

    const jsonStr = JSON.stringify(backupData)
    const sizeBytes = new TextEncoder().encode(jsonStr).length

    const { data, error } = await supabase
      .from('nexus_backups')
      .insert({
        id_tienda: idTienda || null,
        tipo: 'manual',
        data: backupData,
        size_bytes: sizeBytes,
        tokens_cost: tokensCost,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    // Deduct tokens from the backup cost — deduct from global config or skip for now
    // (tokens are per-store, so deducting globally doesn't make sense;
    //  the cost is informational for now)

    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error inesperado' }, { status: 500 })
  }
}
