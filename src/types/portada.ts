export type TipoPortada = 'institucional' | 'producto' | 'oferta'

export type CtaAccion = 'ver_productos' | 'ver_producto'

export interface Portada {
  id: string
  tipo: TipoPortada
  imagen_url: string | null
  titulo: string | null
  descripcion: string | null
  id_producto: string | null
  cta_texto: string | null
  cta_accion: CtaAccion
  duracion_ms: number
}

export interface PortadaDashboard extends Portada {
  activo: boolean
  orden: number
  id_tienda: string
  creado_at: string
  actualizado_at: string
}
