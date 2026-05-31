import { NextRequest, NextResponse } from 'next/server'
import { generatePwaIcons } from '@/lib/pwa-icons'

export async function POST(req: NextRequest) {
  const { logoUrl, tiendaId } = await req.json()
  if (!logoUrl || !tiendaId) {
    return NextResponse.json({ error: 'Missing logoUrl or tiendaId' }, { status: 400 })
  }
  const result = await generatePwaIcons(logoUrl, tiendaId)
  if (!result) {
    return NextResponse.json({ error: 'Failed to generate PWA icons' }, { status: 500 })
  }
  return NextResponse.json(result)
}
