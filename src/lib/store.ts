import { create } from 'zustand'
import type { UserRole } from '@/lib/user-roles'

type View = 'landing' | 'login' | 'signup' | 'home' | 'gallery' | 'music' | 'messages' | 'profile' | 'admin' | 'admin-photos' | 'admin-music' | 'admin-users' | 'admin-comments' | 'admin-content' | 'admin-settings'

interface User {
  id: string
  email: string
  name: string | null
  role: UserRole
  isActive?: boolean
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
  avatarUrl?: string | null
  authProvider?: 'password' | 'google'
}

interface AppState {
  currentView: View
  user: User | null
  setCurrentView: (view: View) => void
  setUser: (user: User | null) => void
  logout: () => void
  isAdmin: () => boolean
  isSuperAdmin: () => boolean
}

export const useAppStore = create<AppState>((set, get) => ({
  currentView: 'landing',
  user: null,
  setCurrentView: (view) => set({ currentView: view }),
  setUser: (user) => set({ user }),
  logout: () => set({ user: null, currentView: 'landing' }),
  isAdmin: () => {
    const { user } = get()
    return user?.role === 'SUPER_ADMIN'
  },
  isSuperAdmin: () => {
    const { user } = get()
    return user?.role === 'SUPER_ADMIN'
  },
}))
