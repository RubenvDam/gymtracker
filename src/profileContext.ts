import { createContext, useContext } from 'react'
import type { Profile } from './db/db'

export interface ProfileCtx {
  profiles: Profile[]
  active: Profile | undefined
  setActiveId: (id: number) => void
}

export const ProfileContext = createContext<ProfileCtx | null>(null)

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider')
  return ctx
}
