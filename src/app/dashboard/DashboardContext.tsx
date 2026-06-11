'use client'

import { createContext, useContext } from 'react'

interface DashboardContextType {
  currencyCode: string
}

const DashboardContext = createContext<DashboardContextType>({ currencyCode: 'DOP' })

export function useDashboard() {
  return useContext(DashboardContext)
}

export { DashboardContext }
