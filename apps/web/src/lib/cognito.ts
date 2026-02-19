/**
 * Auth helpers using native aws-amplify/auth.
 * Amplify is configured via amplify_outputs.json — see lib/amplify.ts.
 */
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

export interface AuthTokens {
  accessToken: string
  idToken: string
}

export interface CognitoUser {
  userId: string
  username: string
  email: string
  role?: 'admin' | 'customer'
  groups?: string[]
}

export async function cognitoSignIn(
  email: string,
  password: string
): Promise<SignInOutput> {
  return signIn({ username: email, password })
}

export async function cognitoSignUp(
  email: string,
  password: string,
  name: string
): Promise<SignUpOutput> {
  return signUp({
    username: email,
    password,
    options: {
      userAttributes: { email, name },
    },
  })
}

export async function cognitoConfirmSignUp(
  email: string,
  code: string
): Promise<void> {
  await confirmSignUp({ username: email, confirmationCode: code })
}

export async function cognitoSignOut(): Promise<void> {
  await signOut()
}

export async function cognitoResetPassword(email: string): Promise<void> {
  await resetPassword({ username: email })
}

export async function cognitoConfirmResetPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<void> {
  await confirmResetPassword({ username: email, confirmationCode: code, newPassword })
}

export async function cognitoGetCurrentUser(): Promise<CognitoUser | null> {
  try {
    const user = await getCurrentUser()
    const session = await fetchAuthSession()
    const payload = session.tokens?.idToken?.payload

    const groups = (payload?.['cognito:groups'] as string[]) ?? []
    return {
      userId: user.userId,
      username: user.username,
      email: (payload?.email as string) ?? '',
      role: groups.includes('admin') ? 'admin' : 'customer',
      groups,
    }
  } catch {
    return null
  }
}

export async function cognitoIsAuthenticated(): Promise<boolean> {
  try {
    await getCurrentUser()
    return true
  } catch {
    return false
  }
}

export async function cognitoGetAccessToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession()
    return session.tokens?.accessToken.toString() ?? null
  } catch {
    return null
  }
}
