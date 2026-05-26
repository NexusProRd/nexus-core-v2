import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const cookies = req.headers.get('cookie') || ''
  const match = cookies.match(/(?:^|;\s*)nx_session=([^;]*)/)
  const tiendaId = match?.[1] || null
  return NextResponse.json({ tiendaId })
}
