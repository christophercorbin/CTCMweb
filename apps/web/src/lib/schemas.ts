import { z } from 'zod'

/**
 * Shared Zod schemas — mirror Cognito / backend constraints and defend
 * against common input-based attacks (homograph, header injection, DoS
 * via oversized payloads). Reuse across Register, Login, CustomerInfo,
 * and any admin-facing customer forms so rules never drift.
 */

/** Cognito password policy, mirrored client-side for fast feedback. */
export const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[a-z]/, 'Must include a lowercase letter')
  .regex(/[A-Z]/, 'Must include an uppercase letter')
  .regex(/[0-9]/, 'Must include a number')

/**
 * Name: Unicode letters + common separators, capped at 50, with
 * zero-width / RTL-override characters rejected (homograph defence).
 */
export const nameSchema = z
  .string()
  .trim()
  .min(2, 'Must be at least 2 characters')
  .max(50, 'Must be 50 characters or fewer')
  .regex(/^[\p{L}\s'\-.]+$/u, 'Letters, spaces, hyphens and apostrophes only')
  .refine((v) => !/[\u200B-\u200F\u202A-\u202E\uFEFF]/.test(v), {
    message: 'Contains invalid invisible characters',
  })

/**
 * Address must contain tokens + a digit or comma — catches stray strings
 * like "etst". Capped to prevent oversized payloads / header injection.
 */
export const addressSchema = z
  .string()
  .trim()
  .min(10, 'Please enter a full address (street, city, parish)')
  .max(200, 'Address is too long')
  .refine((v) => /\d/.test(v) || /,/.test(v), {
    message: 'Address should include a street number or be comma-separated',
  })
  .refine((v) => !/[\r\n]/.test(v), { message: 'Address cannot contain line breaks' })

/** E.164-ish: 8–15 digits after stripping separators. */
export const phoneSchema = z
  .string()
  .trim()
  .max(20, 'Phone number is too long')
  .refine((v) => {
    const d = v.replace(/\D/g, '')
    return d.length >= 8 && d.length <= 15
  }, 'Please enter a valid international phone number (8–15 digits)')

/** Email — lowercase + RFC length cap. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Please enter a valid email address')
  .max(254, 'Email is too long')

/** Company name — optional, but if provided, must look reasonable. */
export const companySchema = z
  .string()
  .trim()
  .max(100, 'Company name is too long')
  .refine((v) => !/[\r\n]/.test(v), { message: 'Company cannot contain line breaks' })
  .optional()
  .or(z.literal(''))

/** Normalise phone to E.164 (prepends + if missing). */
export const normalisePhone = (raw: string): string => {
  const stripped = raw.replace(/[\s\-().]/g, '')
  return stripped.startsWith('+') ? stripped : `+${stripped}`
}
