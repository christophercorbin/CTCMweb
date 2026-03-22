import React, { createContext, useState, useEffect } from 'react'
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
  signUp: (email: string, password: string, firstName: string, lastName: string, phone?: string, address?: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  confirmResetPassword: (email: string, code: string, newPassword: string) => Promise<void>
  getAccessToken: () => Promise<string | null>
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CognitoUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

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
    } catch {
      setUser(null)
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email: string, password: string) {
    try {
      await cognitoSignIn(email, password)
    } catch (err: unknown) {
      const error = err as { name?: string }
      // Amplify v6 throws UserAlreadyAuthenticatedException when a stale
      // in-memory session exists (survives localStorage clears). Sign out
      // to reset state, then retry once. See aws-amplify/amplify-js#13813
      if (error.name === 'UserAlreadyAuthenticatedException') {
        await cognitoSignOut()
        await cognitoSignIn(email, password)
      } else {
        throw err
      }
    }
    await loadUser()
  }

  async function signUp(email: string, password: string, firstName: string, lastName: string, phone?: string, address?: string) {
    await cognitoSignUp(email, password, firstName, lastName, phone, address)
  }

  async function signOut() {
    await cognitoSignOut()
    setUser(null)
    setIsAuthenticated(false)
  }

  async function resetPassword(email: string) {
    await cognitoResetPassword(email)
  }

  async function confirmResetPassword(email: string, code: string, newPassword: string) {
    await cognitoConfirmResetPassword(email, code, newPassword)
  }

  async function getAccessToken() {
    return cognitoGetAccessToken()
  }

  async function refreshUser() {
    await loadUser()
  }

  return (
    <AuthContext.Provider
      value={{
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
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}


