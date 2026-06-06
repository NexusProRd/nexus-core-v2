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

export function esIlimitado(limit: number): boolean {
  return limit === -1
}

export function formatLimit(limit: number): string {
  if (limit === -1) return 'Ilimitado'
  return `${limit} productos`
}
