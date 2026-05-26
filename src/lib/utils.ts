export function formatearPrecio(precio: number): string {
  return precio.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function parsearCategorias(cadena?: string | null): string[] {
  if (!cadena || !cadena.trim()) return []
  return cadena.split(',').map(c => c.trim()).filter(Boolean)
}