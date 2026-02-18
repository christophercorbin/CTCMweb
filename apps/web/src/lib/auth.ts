/**
 * Authentication module using AWS Amplify Auth
 * 
 * This module provides a clean interface for authentication operations
 * using the Amplify Auth SDK with the existing Cognito User Pool.
 * 
 * All authentication functions are re-exported from cognito.ts for
 * backward compatibility during the migration.
 */

export {
  cognitoSignIn as signIn,
  cognitoSignUp as signUp,
  cognitoSignOut as signOut,
  cognitoConfirmSignUp as confirmSignUp,
  cognitoResetPassword as resetPassword,
  cognitoConfirmResetPassword as confirmResetPassword,
  cognitoGetCurrentUser as getCurrentUser,
  cognitoGetTokens as getTokens,
  cognitoIsAuthenticated as isAuthenticated,
  cognitoGetAccessToken as getAccessToken,
  type AuthTokens,
  type UserAttributes,
  type CognitoUser,
} from './cognito';
