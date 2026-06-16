export type TipoPortada = 'institucional' | 'producto' | 'oferta' | 'personalizado'

export type CtaAccion = 'ver_productos' | 'ver_producto' | 'ir_a_pestana' | 'ir_a_categoria' | 'url_externa'

export interface Portada {
  id: string
  tipo: TipoPortada
  imagen_url: string | null
  titulo: string | null
  descripcion: string | null
  id_producto: string | null
  cta_texto: string | null
  cta_accion: CtaAccion
  cta_url: string | null
  cta_pestana: string | null
  cta_categoria: string | null
  duracion_ms: number
}

export interface PortadaDashboard extends Portada {
  activo: boolean
  orden: number
  id_tienda: string
  creado_at: string
  actualizado_at: string
}
