import type { APIGatewayProxyEvent } from 'aws-lambda';
import type { UserContext } from '@ctcm/types';

/**
 * Extracts user context from API Gateway authorizer context
 * API Gateway JWT authorizer populates the authorizer context with claims
 */
export function getUserContext(event: APIGatewayProxyEvent): UserContext {
  const authorizer = event.requestContext.authorizer;

  if (!authorizer || !authorizer.claims) {
    throw new Error('Unauthorized: Missing authorization context');
  }

  const claims = authorizer.claims;

  // Extract user information from JWT claims
  const sub = claims.sub;
  const email = claims.email;
  const groupsString = claims['cognito:groups'] || '';
  const groups = groupsString ? groupsString.split(',') : [];

  if (!sub || !email) {
    throw new Error('Unauthorized: Invalid token claims');
  }

  // Determine role from groups
  const role = groups.includes('admin') ? 'admin' : 'customer';

  // For customer users, tenantId is their customer ID
  // This should be set during customer creation and stored in custom claims
  const tenantId = claims['custom:customerId'] || (role === 'customer' ? sub : undefined);

  return {
    sub,
    email,
    role,
    tenantId,
    groups,
  };
}

/**
 * Validates that the user is authenticated
 */
export function requireAuth(event: APIGatewayProxyEvent): UserContext {
  try {
    return getUserContext(event);
  } catch {
    throw new Error('Authentication required');
  }
}

/**
 * Validates that the user has admin role
 */
export function requireAdmin(event: APIGatewayProxyEvent): UserContext {
  const userContext = requireAuth(event);
  
  if (userContext.role !== 'admin') {
    throw new Error('Admin access required');
  }

  return userContext;
}
