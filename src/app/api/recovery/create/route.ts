// RECOVERY CENTER
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { createSnapshot } from '@/lib/recovery/create-snapshot'

async function handleCreate(req: Request) {
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const result = await createSnapshot(session.tiendaId)
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || 'Error al crear snapshot' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, snapshotId: result.id })
}

export async function GET(req: Request) {
  try {
    return await handleCreate(req)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error inesperado' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    return await handleCreate(req)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error inesperado' },
      { status: 500 }
    )
  }
}
