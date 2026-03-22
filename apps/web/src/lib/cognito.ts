/**
 * Auth helpers using native aws-amplify/auth.
 * Amplify is configured via amplify_outputs.json — see lib/amplify.ts.
 */
import {
  signIn,
  signUp,
  signOut,
  confirmSignUp,
  confirmSignIn,
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
  firstName?: string
  lastName?: string
  role?: 'admin' | 'customer'
  groups?: string[]
}

export async function cognitoSignIn(
  email: string,
  password: string
): Promise<SignInOutput> {
  const result = await signIn({ username: email, password, options: { authFlowType: 'USER_PASSWORD_AUTH' } })

  if (!result.isSignedIn) {
    // Surface the challenge step as a readable error so the caller can handle it
    const step = result.nextStep?.signInStep ?? 'UNKNOWN'
    const err = new Error(`Sign-in requires additional step: ${step}`)
    err.name = step
    throw err
  }

  return result
}

export async function cognitoSignUp(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  phone?: string,
  address?: string
): Promise<SignUpOutput> {
  const userAttributes: Record<string, string> = {
    email,
    given_name:  firstName,
    family_name: lastName,
    name:        `${firstName} ${lastName}`,
  }
  if (phone)   userAttributes['phone_number'] = phone
  if (address) userAttributes['address']      = address
  return signUp({ username: email, password, options: { userAttributes } })
}

export async function cognitoConfirmSignUp(
  email: string,
  code: string
): Promise<void> {
  await confirmSignUp({ username: email, confirmationCode: code })
}

/**
 * Called after signIn returns CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED.
 * Amplify holds the challenge in memory so this must run in the same session.
 */
export async function cognitoConfirmNewPassword(newPassword: string): Promise<void> {
  const result = await confirmSignIn({ challengeResponse: newPassword })
  if (!result.isSignedIn) {
    const step = result.nextStep?.signInStep ?? 'UNKNOWN'
    const err = new Error(`Unexpected step after new password: ${step}`)
    err.name = step
    throw err
  }
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
      userId:    user.userId,
      username:  user.username,
      email:     (payload?.email       as string) ?? '',
      firstName: (payload?.given_name  as string) ?? '',
      lastName:  (payload?.family_name as string) ?? '',
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

export async function cognitoGetTokens(): Promise<AuthTokens | null> {
  try {
    const session = await fetchAuthSession()
    const accessToken = session.tokens?.accessToken.toString()
    const idToken = session.tokens?.idToken?.toString()
    
    if (!accessToken || !idToken) return null
    
    return { accessToken, idToken }
  } catch {
    return null
  }
}

export type UserAttributes = {
  email?: string
  name?: string
  [key: string]: string | undefined
}
