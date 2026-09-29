import { createContext, useContext } from 'react'
import type { LifeIndexServices } from '@/core/services'

export const V4ServicesContext = createContext<LifeIndexServices | null>(null)

export function useV4Services(): LifeIndexServices {
  const services = useContext(V4ServicesContext)
  if (!services) throw new Error('ServicesUnavailable')
  return services
}
