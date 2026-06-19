import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

async function checkRateLimit(ip: string): Promise<{ blocked: boolean; minsLeft?: number }> {
  const admin = createAdminClient()
  if (!admin.supabase) return { blocked: false }

  const ipKey = `gc-consulta-${ip}`

  const { data } = await admin.supabase
    .from('nexus_rate_limits')
    .select('intentos, bloqueado_hasta, ultimo_intento')
    .eq('ip', ipKey)
    .maybeSingle()

  if (!data) return { blocked: false }

  if (data.bloqueado_hasta) {
    const blockedUntil = new Date(data.bloqueado_hasta).getTime()
    if (blockedUntil > Date.now()) {
      return { blocked: true, minsLeft: Math.ceil((blockedUntil - Date.now()) / 60000) }
    }
  }

  return { blocked: false }
}

async function recordAttempt(ip: string): Promise<void> {
  const admin = createAdminClient()
  if (!admin.supabase) return

  const now = new Date()
  const windowStart = new Date(now.getTime() - 60 * 1000)
  const ipKey = `gc-consulta-${ip}`

  const { data: existing } = await admin.supabase
    .from('nexus_rate_limits')
    .select('intentos, ultimo_intento')
    .eq('ip', ipKey)
    .maybeSingle()

  if (existing) {
    const isWithinWindow = new Date(existing.ultimo_intento) > windowStart
    const newCount = isWithinWindow ? existing.intentos + 1 : 1
    const bloqueadoHasta = newCount >= 10 ? new Date(now.getTime() + 30 * 60 * 1000) : null

    await admin.supabase.from('nexus_rate_limits').update({
      intentos: newCount,
      ultimo_intento: now.toISOString(),
      bloqueado_hasta: bloqueadoHasta?.toISOString() || null,
    }).eq('ip', ipKey)
  } else {
    await admin.supabase.from('nexus_rate_limits').insert({
      ip: ipKey,
      intentos: 1,
      ultimo_intento: now.toISOString(),
      bloqueado_hasta: null,
    })
  }
}

async function clearRateLimit(ip: string): Promise<void> {
  const admin = createAdminClient()
  if (!admin.supabase) return
  await admin.supabase.from('nexus_rate_limits').delete().eq('ip', `gc-consulta-${ip}`)
}

const GC_CODE_REGEX = /^GC[A-Z0-9]{10}$/

export async function POST(req: Request) {
  const ip = getClientIp(req)

  const { blocked, minsLeft } = await checkRateLimit(ip)
  if (blocked) {
    return NextResponse.json(
      { error: `Demasiadas consultas. Intenta de nuevo en ${minsLeft} minuto(s).` },
      { status: 429 }
    )
  }

  let body: { code?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 })
  }

  const rawCode = (body.code || '').trim().toUpperCase()

  if (!rawCode) {
    return NextResponse.json({ error: 'Código de Gift Card requerido.' }, { status: 400 })
  }

  if (!GC_CODE_REGEX.test(rawCode)) {
    await recordAttempt(ip)
    return NextResponse.json({ error: 'Formato de código inválido.' }, { status: 400 })
  }

  const { supabase, error } = createAdminClient()
  if (error) return NextResponse.json({ error }, { status: 500 })

  const { data, error: queryError } = await supabase!
    .from('gift_cards')
    .select('code, balance, initial_value, status, expires_at')
    .eq('code', rawCode)
    .maybeSingle()

  if (queryError) {
    return NextResponse.json({ error: `Error BD: ${queryError.message}` }, { status: 500 })
  }

  if (!data) {
    await recordAttempt(ip)
    return NextResponse.json({ error: 'Gift Card no encontrada.' }, { status: 404 })
  }

  await clearRateLimit(ip)

  const usable = data.status === 'active'

  return NextResponse.json({
    code: data.code,
    balance: Number(data.balance),
    initial_value: Number(data.initial_value),
    status: data.status,
    expires_at: data.expires_at,
    usable,
  })
}
