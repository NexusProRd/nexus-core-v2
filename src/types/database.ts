export type PlanNivel = 'basico' | 'pro' | 'ilimitado';

export interface SocioTienda {
  id: string;
  id_owner: string;
  nombre_tienda: string;
  whatsapp_num: string;
  pais_codigo: string;
  moneda_simbolo: string;
  plan_nivel: PlanNivel;
  token_productos_limite: number;
  tokens_disponibles: number;
  esta_activa: boolean;
  fecha_creacion: string;
  fecha_vencimiento: string | null;
  fecha_bloqueo_panel: string | null;
  fecha_suspension_catalogo: string | null;
  fecha_eliminacion_total: string | null;
  soft_deleted_at: string | null;
}

export interface TallaVariant {
  talla: string
  stock: number
  precio: number | null
}

export type NexusLogModulo = 'Carrito' | 'Inventario' | 'Auth' | 'Logistica' | 'Regalos' | 'Sistema';

export interface NexusLog {
  id: string;
  id_tienda: string | null;
  id_usuario: string | null;
  modulo: NexusLogModulo;
  accion: string;
  detalle: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type NexusAnuncioTipo = 'actualizacion' | 'mantenimiento' | 'aviso_pago';

export interface NexusAnuncio {
  id: string;
  titulo: string;
  contenido: string;
  tipo: NexusAnuncioTipo;
  activo: boolean;
  created_at: string;
  updated_at: string;
}
