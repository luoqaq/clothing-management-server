export type SystemRole = 'admin' | 'sales' | 'manager' | 'staff';
export type ClientRole = 'admin' | 'sales';

export function normalizeRole(role?: string | null): ClientRole {
  return role === 'admin' ? 'admin' : 'sales';
}

export function isAdminRole(role?: string | null): boolean {
  return normalizeRole(role) === 'admin';
}

export function isSalesLikeRole(role?: string | null): boolean {
  return normalizeRole(role) === 'sales';
}
