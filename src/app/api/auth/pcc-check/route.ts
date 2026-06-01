import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySessionToken } from '@/lib/auth/session'

export async function GET() {
  const cookieStore = await cookies()
  const pccSession = cookieStore.get('nx_pcc_session')?.value
  if (!pccSession) return NextResponse.json({ authenticated: false })
  const result = await verifySessionToken(pccSession)
  return NextResponse.json({ authenticated: result.valid && result.tiendaId === 'pcc' })
}
