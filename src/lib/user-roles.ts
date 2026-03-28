export type DatabaseUserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN'
export type UserRole = 'USER' | 'SUPER_ADMIN'

export function normalizeUserRole(role: DatabaseUserRole | UserRole): UserRole {
  return role === 'ADMIN' ? 'SUPER_ADMIN' : role
}

export function isAdminRole(role: DatabaseUserRole | UserRole) {
  return normalizeUserRole(role) === 'SUPER_ADMIN'
}

export function isSuperAdminRole(role: DatabaseUserRole | UserRole) {
  return normalizeUserRole(role) === 'SUPER_ADMIN'
}
