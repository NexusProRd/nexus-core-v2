export type PlanTipo = 'emprendedor' | 'pro'
export type PlanStatus = 'trial' | 'active' | 'grace' | 'dashboard_suspended' | 'catalog_suspended' | 'deleted'

const PLAN_LABELS: Record<PlanTipo, string> = {
  emprendedor: 'Emprendedor',
  pro: 'Pro',
}

const STATUS_LABELS: Record<PlanStatus, string> = {
  trial: 'Trial',
  active: 'Activo',
  grace: 'Gracia',
  dashboard_suspended: 'Panel Suspendido',
  catalog_suspended: 'Catálogo Suspendido',
  deleted: 'Eliminado',
}

const STATUS_COLORS: Record<PlanStatus, string> = {
  trial: 'bg-blue-50 text-blue-700 border-blue-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  grace: 'bg-amber-50 text-amber-700 border-amber-200',
  dashboard_suspended: 'bg-rose-50 text-rose-700 border-rose-200',
  catalog_suspended: 'bg-red-50 text-red-700 border-red-200',
  deleted: 'bg-slate-100 text-slate-500 border-slate-200',
}

const PLAN_COLORS: Record<PlanTipo, string> = {
  emprendedor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pro: 'bg-indigo-50 text-indigo-700 border-indigo-200',
}

export function getPlanLabel(tipo: PlanTipo | string): string {
  return PLAN_LABELS[tipo as PlanTipo] || tipo
}

export function getStatusLabel(status: PlanStatus | string): string {
  return STATUS_LABELS[status as PlanStatus] || status
}

export function getStatusColor(status: PlanStatus | string): string {
  return STATUS_COLORS[status as PlanStatus] || 'bg-slate-100 text-slate-700 border-slate-200'
}

export function getPlanColor(tipo: PlanTipo | string): string {
  return PLAN_COLORS[tipo as PlanTipo] || 'bg-slate-100 text-slate-700 border-slate-200'
}

export function getDefaultLimit(planTipo: PlanTipo): number {
  return planTipo === 'pro' ? -1 : 15
}

export function esIlimitado(limit: number | null | undefined): boolean {
  return limit === -1
}

export function formatLimit(limit: number): string {
  if (limit === -1) return 'Ilimitado'
  return `${limit} productos`
}

export async function checkTiendaActiva(
  supabase: { from: (table: string) => any },
  tiendaId: string,
): Promise<{ ok: boolean; error?: string; status?: PlanStatus }> {
  const { data: tienda } = await supabase
    .from('tiendas')
    .select('id, plan_status, plan_tipo, is_founder, esta_activa, soft_deleted_at, fecha_vencimiento, fecha_bloqueo_panel, fecha_suspension_catalogo, fecha_eliminacion_total')
    .eq('id', tiendaId)
    .maybeSingle()

  if (!tienda) return { ok: false, error: 'Tienda no encontrada' }
  if (tienda.is_founder) return { ok: true, status: tienda.plan_status }

  const ahora = new Date()
  const updates: Record<string, any> = {}
  let newStatus: PlanStatus | null = null

  // Staircase: most restrictive first
  // (1) Should be deleted?
  if (tienda.fecha_eliminacion_total && new Date(tienda.fecha_eliminacion_total) <= ahora) {
    if (tienda.plan_status !== 'deleted') {
      updates.plan_status = 'deleted'
      updates.soft_deleted_at = ahora.toISOString()
      updates.esta_activa = false
    }
    newStatus = 'deleted'
  }
  // (2) Should be catalog_suspended?
  else if (tienda.fecha_suspension_catalogo && new Date(tienda.fecha_suspension_catalogo) <= ahora) {
    if (!['catalog_suspended', 'deleted'].includes(tienda.plan_status)) {
      updates.plan_status = 'catalog_suspended'
      updates.esta_activa = false
    }
    newStatus = 'catalog_suspended'
  }
  // (3) Should be dashboard_suspended?
  else if (tienda.fecha_bloqueo_panel && new Date(tienda.fecha_bloqueo_panel) <= ahora) {
    if (!['dashboard_suspended', 'catalog_suspended', 'deleted'].includes(tienda.plan_status)) {
      updates.plan_status = 'dashboard_suspended'
      updates.esta_activa = false
    }
    newStatus = 'dashboard_suspended'
  }
  // (4) Should be in grace? (only for paid subscriptions)
  else if (tienda.plan_status === 'active' && tienda.fecha_vencimiento && new Date(tienda.fecha_vencimiento) <= ahora) {
    updates.plan_status = 'grace'
    newStatus = 'grace'
  }

  const finalStatus = newStatus || tienda.plan_status
  if (Object.keys(updates).length > 0) {
    await supabase.from('tiendas').update(updates).eq('id', tiendaId)
  }

  const blocked: PlanStatus[] = ['dashboard_suspended', 'catalog_suspended', 'deleted']
  return {
    ok: !blocked.includes(finalStatus),
    error: blocked.includes(finalStatus) ? 'Cuenta suspendida' : undefined,
    status: finalStatus,
  }
}
