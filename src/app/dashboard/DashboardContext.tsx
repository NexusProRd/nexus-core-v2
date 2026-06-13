'use client'

import { createContext, useContext } from 'react'
import type { PlanTipo, PlanStatus } from '@/lib/commercial'

interface DashboardContextType {
  currencyCode: string
  planTipo: PlanTipo
  planStatus: PlanStatus
  fechaVencimiento: string | null
  isFounder: boolean
}

const defaultContext: DashboardContextType = {
  currencyCode: 'DOP',
  planTipo: 'emprendedor',
  planStatus: 'trial',
  fechaVencimiento: null,
  isFounder: false,
}

const DashboardContext = createContext<DashboardContextType>(defaultContext)

export function useDashboard() {
  return useContext(DashboardContext)
}

export { DashboardContext }
