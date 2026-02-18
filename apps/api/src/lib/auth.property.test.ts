import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getUserContext } from './auth';
import type { APIGatewayProxyEvent } from 'aws-lambda';

/**
 * Property 2: JWT Token Compatibility
 * Feature: amplify-gen2-migration
 * 
 * Validates: Requirements 3.4
 * 
 * For any authenticated user, the JWT token issued by Amplify Auth should be valid
 * for API Gateway authorization, containing the required claims (sub, email, cognito:groups).
 */

// Arbitrary for generating valid email addresses
const emailArbitrary = fc
  .tuple(
    fc.stringMatching(/^[a-z0-9]{3,10}$/),
    fc.constantFrom('gmail.com', 'yahoo.com', 'example.com', 'test.com')
  )
  .map(([local, domain]) => `${local}@${domain}`);

// Arbitrary for generating Cognito sub (UUID format)
const subArbitrary = fc.uuid();

// Arbitrary for generating user groups
const groupsArbitrary = fc.oneof(
  fc.constant([]), // No groups
  fc.constant(['customer']), // Customer only
  fc.constant(['admin']), // Admin only
  fc.constant(['admin', 'customer']) // Both (edge case)
);

// Arbitrary for generating custom customer ID
const customerIdArbitrary = fc.option(fc.uuid(), { nil: undefined });

// Arbitrary for generating a complete JWT claims object
const jwtClaimsArbitrary = fc.record({
  sub: subArbitrary,
  email: emailArbitrary,
  'cognito:groups': groupsArbitrary.map(groups => groups.join(',')),
  'custom:customerId': customerIdArbitrary,
});

// Arbitrary for generating API Gateway event with JWT claims
const apiGatewayEventWithJWTArbitrary = jwtClaimsArbitrary.map(claims => ({
  requestContext: {
    authorizer: {
      claims,
    },
  },
} as unknown as APIGatewayProxyEvent));

describe('Property 2: JWT Token Compatibility', () => {
  it('should extract required claims (sub, email, cognito:groups) from any valid JWT token', () => {
    fc.assert(
      fc.property(apiGatewayEventWithJWTArbitrary, (event) => {
        // Act: Extract user context from the event
        const userContext = getUserContext(event);

        // Assert: Required claims are present
        expect(userContext.sub).toBeDefined();
        expect(userContext.sub).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        
        expect(userContext.email).toBeDefined();
        expect(userContext.email).toMatch(/^[a-z0-9]+@[a-z0-9.]+$/i);
        
        expect(userContext.groups).toBeDefined();
        expect(Array.isArray(userContext.groups)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should correctly determine role from cognito:groups claim', () => {
    fc.assert(
      fc.property(apiGatewayEventWithJWTArbitrary, (event) => {
        const userContext = getUserContext(event);
        const groups = event.requestContext.authorizer?.claims['cognito:groups'] || '';
        
        // If user is in admin group, role should be admin
        if (groups.includes('admin')) {
          expect(userContext.role).toBe('admin');
        } else {
          // Otherwise, role should be customer
          expect(userContext.role).toBe('customer');
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should handle tenantId correctly based on role and custom claims', () => {
    fc.assert(
      fc.property(apiGatewayEventWithJWTArbitrary, (event) => {
        const userContext = getUserContext(event);
        const customerId = event.requestContext.authorizer?.claims['custom:customerId'];
        
        if (userContext.role === 'customer') {
          // Customer users should have tenantId set to customerId or sub
          expect(userContext.tenantId).toBeDefined();
          if (customerId) {
            expect(userContext.tenantId).toBe(customerId);
          } else {
            expect(userContext.tenantId).toBe(userContext.sub);
          }
        }
        // Admin users may or may not have tenantId
      }),
      { numRuns: 100 }
    );
  });

  it('should reject tokens without required claims', () => {
    // Test missing sub
    fc.assert(
      fc.property(emailArbitrary, (email) => {
        const event = {
          requestContext: {
            authorizer: {
              claims: {
                email,
                'cognito:groups': 'customer',
              },
            },
          },
        } as unknown as APIGatewayProxyEvent;

        expect(() => getUserContext(event)).toThrow('Unauthorized: Invalid token claims');
      }),
      { numRuns: 50 }
    );

    // Test missing email
    fc.assert(
      fc.property(subArbitrary, (sub) => {
        const event = {
          requestContext: {
            authorizer: {
              claims: {
                sub,
                'cognito:groups': 'customer',
              },
            },
          },
        } as unknown as APIGatewayProxyEvent;

        expect(() => getUserContext(event)).toThrow('Unauthorized: Invalid token claims');
      }),
      { numRuns: 50 }
    );
  });

  it('should reject events without authorization context', () => {
    fc.assert(
      fc.property(fc.constant({}), () => {
        const event = {
          requestContext: {},
        } as unknown as APIGatewayProxyEvent;

        expect(() => getUserContext(event)).toThrow('Unauthorized: Missing authorization context');
      }),
      { numRuns: 10 }
    );
  });

  it('should handle empty groups array correctly', () => {
    fc.assert(
      fc.property(subArbitrary, emailArbitrary, (sub, email) => {
        const event = {
          requestContext: {
            authorizer: {
              claims: {
                sub,
                email,
                'cognito:groups': '', // Empty groups
              },
            },
          },
        } as unknown as APIGatewayProxyEvent;

        const userContext = getUserContext(event);
        
        expect(userContext.groups).toEqual([]);
        expect(userContext.role).toBe('customer'); // Default to customer when no groups
      }),
      { numRuns: 50 }
    );
  });

  it('should preserve all claims in the extracted user context', () => {
    fc.assert(
      fc.property(apiGatewayEventWithJWTArbitrary, (event) => {
        const userContext = getUserContext(event);
        const claims = event.requestContext.authorizer?.claims;

        // Verify that extracted values match the original claims
        expect(userContext.sub).toBe(claims.sub);
        expect(userContext.email).toBe(claims.email);
        
        const expectedGroups = claims['cognito:groups'] 
          ? claims['cognito:groups'].split(',') 
          : [];
        expect(userContext.groups).toEqual(expectedGroups);
      }),
      { numRuns: 100 }
    );
  });
});
