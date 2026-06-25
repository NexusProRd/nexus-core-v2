import { createPublicClient } from '@/lib/supabase/public'

export async function getPerfilTienda(id_tienda: string) {
  const supabase = createPublicClient()
  const { data } = await supabase
    .from('perfil_tienda')
    .select('logo_url, nombre_comercial')
    .eq('id_tienda', id_tienda)
    .maybeSingle()
  return data
}
