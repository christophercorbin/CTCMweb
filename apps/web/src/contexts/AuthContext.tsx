import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  cognitoSignIn,
  cognitoSignUp,
  cognitoSignOut,
  cognitoResetPassword,
  cognitoConfirmResetPassword,
  cognitoGetCurrentUser,
  cognitoGetAccessToken,
  cognitoIsAuthenticated,
  type CognitoUser,
} from '../lib/cognito'

interface AuthContextType {
  user: CognitoUser | null
  loading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (
    email: string,
    password: string,
    name: string,
    role?: 'admin' | 'customer'
  ) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  confirmResetPassword: (
    email: string,
    code: string,
    newPassword: string
  ) => Promise<void>
  getAccessToken: () => Promise<string | null>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CognitoUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Load user on mount
  useEffect(() => {
    loadUser()
  }, [])

  async function loadUser() {
    try {
      setLoading(true)
      const authenticated = await cognitoIsAuthenticated()
      setIsAuthenticated(authenticated)

      if (authenticated) {
        const currentUser = await cognitoGetCurrentUser()
        setUser(currentUser)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Failed to load user:', error)
      setUser(null)
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email: string, password: string) {
    try {
      await cognitoSignIn(email, password)
      await loadUser()
    } catch (error) {
      console.error('Sign in failed:', error)
      throw error
    }
  }

  async function signUp(
    email: string,
    password: string,
    name: string,
    role: 'admin' | 'customer' = 'customer'
  ) {
    try {
      await cognitoSignUp(email, password, name, role)
      // Note: User needs to confirm email before signing in
    } catch (error) {
      console.error('Sign up failed:', error)
      throw error
    }
  }

  async function signOut() {
    try {
      await cognitoSignOut()
      setUser(null)
      setIsAuthenticated(false)
    } catch (error) {
      console.error('Sign out failed:', error)
      throw error
    }
  }

  async function resetPassword(email: string) {
    try {
      await cognitoResetPassword(email)
    } catch (error) {
      console.error('Reset password failed:', error)
      throw error
    }
  }

  async function confirmResetPassword(
    email: string,
    code: string,
    newPassword: string
  ) {
    try {
      await cognitoConfirmResetPassword(email, code, newPassword)
    } catch (error) {
      console.error('Confirm reset password failed:', error)
      throw error
    }
  }

  async function getAccessToken() {
    return await cognitoGetAccessToken()
  }

  async function refreshUser() {
    await loadUser()
  }

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    resetPassword,
    confirmResetPassword,
    getAccessToken,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
