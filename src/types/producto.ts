export type ProductoFormMode = 'create' | 'edit'

export interface ProductoVariante {
  talla: string
  stock: number
  precio: number | null
  costo: number | null
  sku?: string
}

export interface ProductoSnapshot {
  id: string
  nombre: string
  descripcion: string | null
  categoria: string | null
  precio: number
  precio_oferta: number | null
  costo_compra: number
  stock: number
  codigo_barra: string | null
  imagen_url: string | null
  tallas: ProductoVariante[]
  tipo_articulo: string | null
  aplica_impuesto: boolean
  porcentaje_impuesto: number | null
}

export interface ProductoFormProps {
  mode: ProductoFormMode
  initialData?: ProductoSnapshot
  tipoNegocio: string
  categorias?: string[]
  onSuccess?: () => void
  onCancel?: () => void
}
