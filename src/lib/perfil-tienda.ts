import { createPublicClient } from '@/lib/supabase/public'

export async function getPerfilTienda(id_tienda: string) {
  const supabase = createPublicClient()
  const { data } = await supabase
    .from('perfil_tienda')
    .select('logo_url, nombre_comercial, banner_url, mensaje_bienvenida')
    .eq('id_tienda', id_tienda)
    .maybeSingle()
  return data as { logo_url: string | null; nombre_comercial: string | null; banner_url: string | null; mensaje_bienvenida: string | null } | null
}
