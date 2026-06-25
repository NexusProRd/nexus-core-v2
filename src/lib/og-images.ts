export const NEXUS_OG_FALLBACK = '/pwa-icon-512.png'

export function resolveOgImage(
  storeImages: { banner_url?: string | null; logo_url?: string | null } | null,
  overrideImage?: string | null,
): string {
  return overrideImage || storeImages?.banner_url || storeImages?.logo_url || NEXUS_OG_FALLBACK
}

export function storeDescription(perfil: { mensaje_bienvenida?: string | null } | null, nombre: string): string {
  return perfil?.mensaje_bienvenida || `Visita el catálogo de ${nombre} en Nexus. Productos, precios y pedidos por WhatsApp.`
}
