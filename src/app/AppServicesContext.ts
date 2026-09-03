import { createContext, useContext } from 'react'

import type { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'

export interface AppServices {
  database: LifeIndexDatabase
}

export const AppServicesContext = createContext<AppServices | undefined>(undefined)

export function useAppServices(): AppServices {
  const services = useContext(AppServicesContext)
  if (!services) throw new Error('App services are unavailable')
  return services
}
