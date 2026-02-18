import { defineAuth } from '@aws-amplify/backend';

/**
 * Amplify Auth Configuration for CTCM
 * 
 * This configuration references the existing Cognito User Pool
 * to maintain compatibility with existing users and avoid migration.
 * 
 * Existing Resources:
 * - User Pool ID: us-east-1_n8pWlYcSS
 * - Client ID: 7fotk98fhtt003lf9d1728d49g
 * - Region: us-east-1
 * 
 * User Groups:
 * - admin: Full access to all resources
 * - customer: Limited access to tenant-specific resources
 * 
 * Custom Attributes:
 * - custom:role: User role (admin | customer)
 * - custom:tenant_id: Tenant identifier for data isolation
 */

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
    name: {
      required: false,
      mutable: true,
    },
    // Custom attributes for role-based access control
    'custom:role': {
      dataType: 'String',
      mutable: true,
    },
    'custom:tenant_id': {
      dataType: 'String',
      mutable: true,
    },
  },
  groups: ['admin', 'customer'],
  multifactor: {
    mode: 'OPTIONAL',
    totp: true,
    sms: false,
  },
});
