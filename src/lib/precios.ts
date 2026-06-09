export interface CalculoLinea {
  subtotal: number
  impuesto: number
  total: number
}

export interface CalculoTotal {
  subtotalSinImpuesto: number
  totalImpuesto: number
  total: number
  lineas: CalculoLinea[]
}

export interface PrecioConImpuesto {
  precioBase: number
  impuesto: number
  total: number
}

export function calcularPrecioLinea(params: {
  precioUnitario: number
  cantidad: number
  aplicaImpuesto: boolean
  porcentajeImpuesto: number | null
}): CalculoLinea {
  const subtotal = Number(params.precioUnitario) * params.cantidad

  if (params.aplicaImpuesto && params.porcentajeImpuesto != null && params.porcentajeImpuesto > 0) {
    const impuesto = Math.round(subtotal * (params.porcentajeImpuesto / 100) * 100) / 100
    return { subtotal, impuesto, total: subtotal + impuesto }
  }

  return { subtotal, impuesto: 0, total: subtotal }
}

export function calcularTotalPedido(params: {
  lineas: CalculoLinea[]
  descuento?: number
}): CalculoTotal {
  const subtotalSinImpuesto = params.lineas.reduce((s, l) => s + l.subtotal, 0)
  const totalImpuesto = params.lineas.reduce((s, l) => s + l.impuesto, 0)
  let total = params.lineas.reduce((s, l) => s + l.total, 0)

  if (params.descuento && params.descuento > 0) {
    total = Math.round((total - params.descuento) * 100) / 100
  }

  return { subtotalSinImpuesto, totalImpuesto, total, lineas: params.lineas }
}

export function calcularPrecioConImpuesto(
  precio: number,
  aplicaImpuesto: boolean,
  porcentajeImpuesto: number | null
): PrecioConImpuesto {
  const r = calcularPrecioLinea({ precioUnitario: precio, cantidad: 1, aplicaImpuesto, porcentajeImpuesto })
  return { precioBase: precio, impuesto: r.impuesto, total: r.total }
}
