export type PlanTipo = 'emprendedor' | 'pro';
export type PlanStatus = 'trial' | 'active' | 'grace' | 'dashboard_suspended' | 'catalog_suspended' | 'deleted';

export type CurrencyCode = 'DOP' | 'USD';

export interface SocioTienda {
  id: string;
  id_owner: string;
  nombre_socio: string | null;
  nombre_tienda: string;
  whatsapp_num: string;
  pais_codigo: string;
  moneda_simbolo: string;
  currency_code: CurrencyCode;
  plan_tipo: PlanTipo;
  plan_status: PlanStatus;
  is_founder: boolean;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  token_productos_limite: number;
  tokens_disponibles: number;
  esta_activa: boolean;
  fecha_creacion: string;
  fecha_vencimiento: string | null;
  fecha_bloqueo_panel: string | null;
  fecha_suspension_catalogo: string | null;
  fecha_eliminacion_total: string | null;
  soft_deleted_at: string | null;
  fecha_acepto_terminos: string | null;
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
