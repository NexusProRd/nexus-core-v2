export function formatearPrecio(precio: number): string {
  return precio.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function parsearCategorias(cadena?: string | null): string[] {
  if (!cadena || !cadena.trim()) return []
  return cadena.split(',').map(c => c.trim()).filter(Boolean)
}

export interface VarsWhatsApp {
  cliente: string
  pedido: string
  tienda: string
  detalles: string
  total: string
  fecha: string
}

export function reemplazarVars(texto: string, datos: VarsWhatsApp): string {
  return texto
    .replace(/{cliente}/g, datos.cliente)
    .replace(/{pedido}/g, datos.pedido)
    .replace(/{tienda}/g, datos.tienda)
    .replace(/{detalles}/g, datos.detalles)
    .replace(/{productos}/g, datos.detalles)
    .replace(/{total}/g, datos.total)
    .replace(/{fecha}/g, datos.fecha)
}

export function generarMensaje(
  plantillas: Record<string, string>,
  templateKey: string,
  defaultMsg: string,
  vars: VarsWhatsApp
): string {
  const raw = plantillas[templateKey] || defaultMsg
  return reemplazarVars(raw, vars)
}