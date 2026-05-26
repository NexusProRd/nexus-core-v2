import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function createAdminClient(): { supabase: SupabaseClient | null; error: string | null } {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!key || key.trim() === '' || key === 'pon_aqui_tu_service_role_key') {
    return { supabase: null, error: 'Configuración incompleta: Clave de servicio no válida' }
  }

  return { supabase: createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key), error: null }
}
