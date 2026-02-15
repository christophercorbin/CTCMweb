import { Amplify } from 'aws-amplify'
import {
  signIn,
  signUp,
  signOut,
  confirmSignUp,
  resetPassword,
  confirmResetPassword,
  getCurrentUser,
  fetchAuthSession,
  type SignInOutput,
  type SignUpOutput,
} from 'aws-amplify/auth'

// Log environment variables for debugging
console.log('Cognito Configuration:', {
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
  region: import.meta.env.VITE_AWS_REGION,
})

// Configure Amplify with Cognito settings
try {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
        userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
        loginWith: {
          email: true,
        },
      },
    },
  })
  console.log('Amplify configured successfully')
} catch (error) {
  console.error('Failed to configure Amplify:', error)
}

export interface AuthTokens {
  accessToken: string
  idToken: string
  refreshToken: string
}

export interface UserAttributes {
  email: string
  name?: string
  'custom:role'?: 'admin' | 'customer'
  'custom:tenant_id'?: string
}

export interface CognitoUser {
  userId: string
  username: string
  email: string
  role?: 'admin' | 'customer'
  tenantId?: string
  groups?: string[]
}

/**
 * Sign in with email and password
 */
export async function cognitoSignIn(
  email: string,
  password: string
): Promise<SignInOutput> {
  return await signIn({
    username: email,
    password,
  })
}

/**
 * Sign up a new user
 */
export async function cognitoSignUp(
  email: string,
  password: string,
  name: string,
  role: 'admin' | 'customer' = 'customer'
): Promise<SignUpOutput> {
  return await signUp({
    username: email,
    password,
    options: {
      userAttributes: {
        email,
        name,
        'custom:role': role,
      },
    },
  })
}

/**
 * Confirm sign up with verification code
 */
export async function cognitoConfirmSignUp(
  email: string,
  code: string
): Promise<void> {
  await confirmSignUp({
    username: email,
    confirmationCode: code,
  })
}

/**
 * Sign out the current user
 */
export async function cognitoSignOut(): Promise<void> {
  await signOut()
}

/**
 * Request password reset
 */
export async function cognitoResetPassword(email: string): Promise<void> {
  await resetPassword({
    username: email,
  })
}

/**
 * Confirm password reset with code
 */
export async function cognitoConfirmResetPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<void> {
  await confirmResetPassword({
    username: email,
    confirmationCode: code,
    newPassword,
  })
}

/**
 * Get current authenticated user
 */
export async function cognitoGetCurrentUser(): Promise<CognitoUser | null> {
  try {
    const user = await getCurrentUser()
    const session = await fetchAuthSession()

    // Extract user attributes from ID token
    const idToken = session.tokens?.idToken
    const payload = idToken?.payload

    return {
      userId: user.userId,
      username: user.username,
      email: (payload?.email as string) || '',
      role: (payload?.['custom:role'] as 'admin' | 'customer') || 'customer',
      tenantId: payload?.['custom:tenant_id'] as string | undefined,
      groups: (payload?.['cognito:groups'] as string[]) || [],
    }
  } catch (error) {
    return null
  }
}

/**
 * Get authentication tokens
 */
export async function cognitoGetTokens(): Promise<AuthTokens | null> {
  try {
    const session = await fetchAuthSession()

    if (!session.tokens) {
      return null
    }

    return {
      accessToken: session.tokens.accessToken.toString(),
      idToken: session.tokens.idToken?.toString() || '',
      refreshToken: '', // Refresh token is not directly accessible in Amplify v6
    }
  } catch (error) {
    return null
  }
}

/**
 * Check if user is authenticated
 */
export async function cognitoIsAuthenticated(): Promise<boolean> {
  try {
    await getCurrentUser()
    return true
  } catch {
    return false
  }
}

/**
 * Get access token for API requests
 */
export async function cognitoGetAccessToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession()
    return session.tokens?.accessToken.toString() || null
  } catch {
    return null
  }
}
