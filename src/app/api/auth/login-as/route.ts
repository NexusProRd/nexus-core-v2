import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifySessionToken, createSessionToken } from '@/lib/auth/session'

export async function POST(req: NextRequest) {
  try {
    const pccSession = req.cookies.get('nx_pcc_session')?.value
    if (!pccSession) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const session = await verifySessionToken(pccSession)
    if (!session.valid || session.tiendaId !== 'pcc') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { tiendaId, tipo } = body

    if (!tiendaId) {
      return NextResponse.json({ error: 'Falta tiendaId' }, { status: 400 })
    }

    const isLocalhost = req.headers.get('host')?.includes('localhost') || req.headers.get('host')?.includes('127.0.0.1')
    const secure = !isLocalhost
    const maxAge = 60 * 60 * 24 * 30

    let colCookie: string
    if (tipo === 'colaborador') {
      const admin = createAdminClient()
      if (!admin.supabase) {
        return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })
      }
      const { data: col } = await admin.supabase
        .from('colaboradores')
        .select('id, permisos, nombre')
        .eq('id_tienda', tiendaId)
        .eq('activo', true)
        .order('creado_en', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (!col) {
        return NextResponse.json({ error: 'No hay colaboradores activos' }, { status: 404 })
      }
      colCookie = JSON.stringify({ id: col.id, permisos: col.permisos, nombre: col.nombre })
    } else {
      colCookie = JSON.stringify({
        id: 'pcc-admin',
        permisos: { productos: false, pedidos: false, dashboard: true },
        nombre: 'Admin PCC',
      })
    }

    const token = await createSessionToken(tiendaId)
    const res = NextResponse.json({ success: true })
    res.cookies.set('nx_session', token, {
      httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge,
    })
    res.cookies.set('nx_colaborador', encodeURIComponent(colCookie), {
      httpOnly: false, secure, sameSite: 'lax', path: '/', maxAge,
    })
    return res
  } catch (e) {
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}