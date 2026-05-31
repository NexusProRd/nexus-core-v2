import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const bucket = supabase.storage.from('img_products')

interface PerfilRow {
  id_tienda: string
  logo_url: string | null
}

async function pngsAlreadyExist(tiendaId: string): Promise<boolean> {
  const { data, error } = await bucket.list(`logos_pwa/${tiendaId}`)
  if (error || !data) return false
  const names = data.map(f => f.name)
  return names.includes('192.png') && names.includes('512.png')
}

async function generatePngs(logoUrl: string, tiendaId: string): Promise<boolean> {
  try {
    const res = await fetch(logoUrl)
    if (!res.ok) return false
    const buffer = Buffer.from(await res.arrayBuffer())

    for (const size of [192, 512]) {
      const png = await sharp(buffer)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()

      const { error: upErr } = await bucket.upload(
        `logos_pwa/${tiendaId}/${size}.png`,
        png,
        { upsert: true, contentType: 'image/png' }
      )
      if (upErr) return false
    }
    return true
  } catch {
    return false
  }
}

async function verifyPng(tiendaId: string, size: number): Promise<boolean> {
  try {
    const { data } = await bucket.download(`logos_pwa/${tiendaId}/${size}.png`)
    return !!data
  } catch {
    return false
  }
}

async function main() {
  console.log('=== BACKFILL PWA ICONS ===\n')

  const { data: perfiles, error } = await supabase
    .from('perfil_tienda')
    .select('id_tienda, logo_url')
    .not('logo_url', 'is', null)
    .neq('logo_url', '')

  if (error) {
    console.error('Query error:', error.message)
    process.exit(1)
  }

  if (!perfiles || perfiles.length === 0) {
    console.log('No stores with logos found.')
    return
  }

  console.log(`Found ${perfiles.length} stores with logos.\n`)

  const total = { processed: 0, generated: 0, skipped: 0, errors: 0 }

  for (const perfil of perfiles as PerfilRow[]) {
    const { id_tienda, logo_url } = perfil
    if (!logo_url) { total.errors++; continue }

    total.processed++

    const already = await pngsAlreadyExist(id_tienda)
    if (already) {
      total.skipped++
      console.log(`  [SKIP] ${id_tienda} — PNGs already exist`)
      continue
    }

    const ok = await generatePngs(logo_url, id_tienda)
    if (ok) {
      total.generated++
      console.log(`  [OK]   ${id_tienda} — 192.png + 512.png generated`)

      const v192 = await verifyPng(id_tienda, 192)
      const v512 = await verifyPng(id_tienda, 512)
      if (!v192 || !v512) {
        console.log(`         ⚠ Verification failed: 192=${v192} 512=${v512}`)
      }
    } else {
      total.errors++
      console.log(`  [FAIL] ${id_tienda} — generation error`)
    }
  }

  console.log('\n=== RESUMEN ===')
  console.log(`  Procesadas: ${total.processed}`)
  console.log(`  Generadas:  ${total.generated}`)
  console.log(`  Omitidas:   ${total.skipped}`)
  console.log(`  Errores:    ${total.errors}`)
}

main()
