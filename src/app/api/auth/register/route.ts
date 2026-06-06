import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { randomBytes, scryptSync } from 'crypto'
import bcrypt from 'bcryptjs'

interface PreguntaRecuperacion {
  pregunta: string
  respuesta: string
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derivedKey}`
}

function generarSlug(texto: string): string {
  return texto
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'tienda'
}

async function slugDisponible(supabase: any, slug: string, tiendaId?: string): Promise<string> {
  let candidate = slug
  let intento = 0
  while (intento < 50) {
    const { data: existing } = await supabase
      .from('tiendas')
      .select('id')
      .eq('slug', candidate)
      .is('soft_deleted_at', null)
      .maybeSingle()
    if (!existing || (tiendaId && existing.id === tiendaId)) return candidate
    intento++
    candidate = `${slug}-${intento}`
  }
  return `${slug}-${Date.now()}`
}

export async function POST(req: Request) {
  try {
    const { nombre_socio, nombre_tienda, slug: slugInput, whatsapp, password, preguntas } = await req.json()

    if (!nombre_socio?.trim() || !nombre_tienda?.trim() || !whatsapp?.trim() || !password?.trim()) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios.' }, { status: 400 })
    }

    if (!preguntas || !Array.isArray(preguntas) || preguntas.length !== 3) {
      return NextResponse.json({ error: 'Las 3 preguntas de seguridad son obligatorias.' }, { status: 400 })
    }

    for (const p of preguntas) {
      if (!p.pregunta?.trim() || !p.respuesta?.trim()) {
        return NextResponse.json({ error: 'Cada pregunta debe tener su respuesta.' }, { status: 400 })
      }
    }

    const digits = (whatsapp as string).replace(/\D/g, '')
    if (digits.length < 10) {
      return NextResponse.json({ error: 'WhatsApp inválido.' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 })
    }

    const { supabase, error } = createAdminClient()
    if (error) return NextResponse.json({ error }, { status: 500 })

    const { data: existente } = await supabase!
      .from('tiendas')
      .select('id')
      .eq('whatsapp_num', whatsapp.trim())
      .is('soft_deleted_at', null)
      .maybeSingle()

    if (existente) {
      return NextResponse.json({ error: 'Este WhatsApp ya está registrado.' }, { status: 409 })
    }

    const slugBase = slugInput?.trim() ? generarSlug(slugInput) : generarSlug(nombre_tienda)
    const slug = await slugDisponible(supabase, slugBase)

    const password_hash = hashPassword(password)
    const codigoVerificacion = `${randomBytes(3).toString('hex').toUpperCase()}`
    const codigoHash = await bcrypt.hash(codigoVerificacion, 10)
    const ipReal = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'desconocida'

    const ahora = new Date()
    const trialEnd = new Date(ahora.getTime() + 30 * 24 * 60 * 60 * 1000)

    const { error: insertError } = await supabase!.from('tiendas').insert({
      nombre_socio: nombre_socio.trim(),
      nombre_tienda: nombre_tienda.trim(),
      slug,
      whatsapp_num: whatsapp.trim(),
      id_owner: crypto.randomUUID(),
      esta_activa: true,
      plan_nivel: 'basico',
      plan_tipo: 'emprendedor',
      plan_status: 'trial',
      is_founder: false,
      trial_started_at: ahora.toISOString(),
      trial_ends_at: trialEnd.toISOString(),
      tokens_disponibles: 0,
      password_hash,
      preguntas_recuperacion: preguntas,
      codigo_verificacion_hash: codigoHash,
      ultima_ip: ipReal,
    })

    if (insertError) {
      return NextResponse.json({ error: `Error al guardar: ${insertError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, slug, codigo_verificacion: codigoVerificacion })
  } catch (err: any) {
    return NextResponse.json({ error: `Error interno: ${err.message}` }, { status: 500 })
  }
}
