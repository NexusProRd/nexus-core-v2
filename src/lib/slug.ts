function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[áàäâã]/g, 'a')
    .replace(/[éèëêẽ]/g, 'e')
    .replace(/[íìïîĩ]/g, 'i')
    .replace(/[óòöôõ]/g, 'o')
    .replace(/[úùüûũ]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
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
