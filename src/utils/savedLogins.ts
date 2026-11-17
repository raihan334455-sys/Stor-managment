import { Employee, User, UserRole } from '../types';

export const SAVED_LOGINS_KEY = 'pos_saved_login_accounts';

export interface SavedLoginAccount {
  userId: string;
  name: string;
  role: UserRole;
  appId: string;
  employeeId?: string;
  shiftLabel?: string;
  lastLoginAt: string;
}

export function findLinkedEmployee(userId: string, employees: Employee[]): Employee | undefined {
  return (
    employees.find((e) => e.linked_user_id === userId && e.active) ||
    employees.find((e) => e.linked_user_id === userId)
  );
}

export function getSavedLoginAccounts(): SavedLoginAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SAVED_LOGINS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is SavedLoginAccount =>
          Boolean(item) &&
          typeof item.userId === 'string' &&
          typeof item.name === 'string' &&
          typeof item.appId === 'string' &&
          typeof item.role === 'string'
      )
      .map((item) => ({
        userId: item.userId,
        name: item.name,
        role: item.role,
        appId: item.appId,
        employeeId: typeof item.employeeId === 'string' ? item.employeeId : undefined,
        shiftLabel: typeof item.shiftLabel === 'string' ? item.shiftLabel : undefined,
        lastLoginAt: typeof item.lastLoginAt === 'string' ? item.lastLoginAt : new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

export function saveLoggedInAccount(user: User, employees: Employee[]): SavedLoginAccount[] {
  if (typeof window === 'undefined') return [];
  const linkedEmp = findLinkedEmployee(user.id, employees);
  const nextEntry: SavedLoginAccount = {
    userId: user.id,
    name: user.name,
    role: user.role,
    appId: user.username,
    employeeId: linkedEmp?.employee_code,
    shiftLabel: linkedEmp?.shift_label,
    lastLoginAt: new Date().toISOString(),
  };

  const existing = getSavedLoginAccounts().filter(
    (acc) => acc.userId !== user.id && acc.appId.toLowerCase() !== user.username.toLowerCase()
  );
  const updated = [nextEntry, ...existing].slice(0, 20);
  try {
    window.localStorage.setItem(SAVED_LOGINS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors
  }
  return updated;
}

export function removeSavedLoginAccount(userId: string): SavedLoginAccount[] {
  if (typeof window === 'undefined') return [];
  const updated = getSavedLoginAccounts().filter((acc) => acc.userId !== userId);
  try {
    window.localStorage.setItem(SAVED_LOGINS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
  return updated;
}
