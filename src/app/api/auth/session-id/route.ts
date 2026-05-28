import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'

export async function GET(req: Request) {
  const session = await getSession(req)
  return NextResponse.json({ tiendaId: session.tiendaId || null })
}
