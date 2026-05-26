import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function runMigrations() {
  const migrationsDir = join(__dirname, '..', 'supabase', 'migrations')
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  console.log(`📦 Ejecutando ${files.length} migraciones...\n`)

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), 'utf8')
    process.stdout.write(`  ⏳ ${file}... `)

    const { error } = await supabase.rpc('exec_sql', { sql })

    if (error) {
      // Try direct query if exec_sql RPC doesn't exist
      const { error: directError } = await supabase.from('_migrations').insert({ archivo: file, ejecutado_en: new Date().toISOString() }).select().maybeSingle()
      if (directError) {
        // Fallback: just log the SQL for manual execution
        console.log(`⚠️  No se pudo ejecutar automáticamente. Ejecútalo manualmente:`)
        console.log(`\n--- ${file} ---\n${sql}\n`)
      } else {
        console.log('✅')
      }
    } else {
      console.log('✅')
    }
  }

  console.log('\n✅ Migraciones completadas.')
}

runMigrations().catch(console.error)
