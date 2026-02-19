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
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  confirmResetPassword: (email: string, code: string, newPassword: string) => Promise<void>
  getAccessToken: () => Promise<string | null>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

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
    await cognitoSignIn(email, password)
    await loadUser()
  }

  async function signUp(email: string, password: string, name: string) {
    await cognitoSignUp(email, password, name)
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

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
