// RECOVERY CENTER
import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { restoreSnapshot } from '@/lib/recovery/restore-snapshot'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session.valid || !session.tiendaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const snapshotId = req.nextUrl.searchParams.get('snapshotId')
    if (!snapshotId) {
      return NextResponse.json({ error: 'snapshotId requerido' }, { status: 400 })
    }

    const result = await restoreSnapshot(snapshotId, session.tiendaId)
    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Error al restaurar snapshot' }, { status: 500 })
    }

    return NextResponse.json({ success: true, safetySnapshotId: result.safetySnapshotId })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error inesperado' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session.valid || !session.tiendaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const snapshotId = body.snapshotId as string | undefined

    if (!snapshotId) {
      return NextResponse.json({ error: 'snapshotId requerido' }, { status: 400 })
    }

    const result = await restoreSnapshot(snapshotId, session.tiendaId)
    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Error al restaurar snapshot' }, { status: 500 })
    }

    return NextResponse.json({ success: true, safetySnapshotId: result.safetySnapshotId })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error inesperado' },
      { status: 500 }
    )
  }
}
