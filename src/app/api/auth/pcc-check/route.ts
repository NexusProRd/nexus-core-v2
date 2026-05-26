import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const pccSession = cookieStore.get('nx_pcc_session')?.value
  return NextResponse.json({ authenticated: pccSession === 'authenticated' })
}
