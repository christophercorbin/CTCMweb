import { User } from '../types';
import { cognitoGetCurrentUser, cognitoSignOut } from '../lib/cognito';

export const getCurrentUser = (): User | null => {
  // Try Cognito first (synchronous check from localStorage)
  // Note: cognitoGetCurrentUser is async, so we'll use a fallback approach
  
  // Fallback to localStorage for backward compatibility
  const stored = localStorage.getItem('supabase_user');
  if (!stored) {
    return null;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const setCurrentUser = (user: User): void => {
  localStorage.setItem('supabase_user', JSON.stringify(user));
};

export const clearCurrentUser = (): void => {
  localStorage.removeItem('supabase_user');
};

export const isAuthenticated = async (): Promise<boolean> => {
  const user = await cognitoGetCurrentUser();
  return !!user;
};

export const logout = async (): Promise<void> => {
  await cognitoSignOut();
  clearCurrentUser();
  window.location.href = '/login';
};
