import { RESERVED_SLUGS, SLUG_MAX_LENGTH } from './reserved-slugs'

export { SLUG_MAX_LENGTH }

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[áàäâã]/g, 'a')
    .replace(/[éèëêẽ]/g, 'e')
    .replace(/[íìïîĩ]/g, 'i')
    .replace(/[óòöôõ]/g, 'o')
    .replace(/[úùüûũ]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
}

export function esSlugReservado(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug)
}

export function validarSlug(slug: string): { valido: boolean; error?: string } {
  if (!slug || slug.length < 1) {
    return { valido: false, error: 'El slug no puede estar vacío' }
  }
  if (slug.length > SLUG_MAX_LENGTH) {
    return { valido: false, error: `El slug debe tener máximo ${SLUG_MAX_LENGTH} caracteres` }
  }
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    return { valido: false, error: 'Solo letras minúsculas, números y guiones medios' }
  }
  if (esSlugReservado(slug)) {
    return { valido: false, error: 'Este slug está reservado y no puede usarse' }
  }
  return { valido: true }
}

export async function slugDisponible(supabase: any, slug: string, tiendaId?: string): Promise<string> {
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

export async function generarSlug(
  nombre: string,
  sku: string | null | undefined,
  supabase: any,
  idTienda: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(nombre)
  const skuPart = (sku || '').toLowerCase().replace(/[^a-z0-9-]/g, '')
  let slug = skuPart ? `${base}-${skuPart}` : base

  const { data: existing } = await supabase
    .from('productos')
    .select('id')
    .eq('slug', slug)
    .eq('id_tienda', idTienda)
    .maybeSingle()

  if (existing && existing.id !== excludeId) {
    slug = `${slug}-${Math.random().toString(36).substring(2, 8)}`
  }

  return slug
}
