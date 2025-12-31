import { signInWithDialog, getCurrentUser, signOut } from './dialogAuth';

export interface AuthUser {
  userId: string;
  email: string;
  tenantId: string;
}

let currentUser: AuthUser | null = null;

export async function initializeAuth(): Promise<AuthUser | null> {
  currentUser = await getCurrentUser();
  return currentUser;
}

export async function signIn(): Promise<AuthUser> {
  const result = await signInWithDialog();
  
  if (!result.success || !result.userId || !result.email || !result.tenantId) {
    throw new Error(result.error || 'Sign-in failed');
  }
  
  currentUser = {
    userId: result.userId,
    email: result.email,
    tenantId: result.tenantId
  };
  
  return currentUser;
}

export async function logout(): Promise<void> {
  await signOut();
  currentUser = null;
}

export function getAuthUser(): AuthUser | null {
  return currentUser;
}

export function isAuthenticated(): boolean {
  return currentUser !== null;
}
