import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { ArrowRight, Check, Eye, EyeOff } from 'lucide-react'
import { Button, Input } from '../components'
import { useAuth } from '../contexts/useAuth'
import {
  nameSchema,
  emailSchema,
  phoneSchema,
  addressSchema,
  passwordSchema,
  normalisePhone,
} from '../lib/schemas'

const registerSchema = z
  .object({
    firstName: nameSchema,
    lastName:  nameSchema,
    email:     emailSchema,
    phone:     phoneSchema,
    address:   addressSchema,
    password:  passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      message: 'You must accept the Terms to continue',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterFormData = z.infer<typeof registerSchema>

/** Live password-rule checklist. */
function PasswordRules({ value }: { value: string }) {
  const rules = [
    { label: 'At least 8 characters',    ok: value.length >= 8 },
    { label: 'One lowercase letter',     ok: /[a-z]/.test(value) },
    { label: 'One uppercase letter',     ok: /[A-Z]/.test(value) },
    { label: 'One number',               ok: /[0-9]/.test(value) },
  ]
  return (
    <ul className="mt-1.5 space-y-1 text-xs">
      {rules.map((r) => (
        <li key={r.label} className={`flex items-center gap-1.5 ${r.ok ? 'text-green-600' : 'text-gray-400'}`}>
          <Check className={`w-3.5 h-3.5 ${r.ok ? 'opacity-100' : 'opacity-40'}`} />
          {r.label}
        </li>
      ))}
    </ul>
  )
}

export const Register = () => {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
  })

  const passwordValue = watch('password') ?? ''

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true)
    try {
      const phone = normalisePhone(data.phone)

      await signUp(data.email, data.password, data.firstName, data.lastName, phone, data.address)
      toast.success('Account created! Check your email for a verification code.')
      navigate(`/confirm?email=${encodeURIComponent(data.email)}`)
    } catch (err: unknown) {
      console.error('Registration error:', err)
      const error = err as { name?: string; message?: string }
      if (error.name === 'UsernameExistsException') {
        toast.error('An account with this email already exists')
      } else if (error.name === 'InvalidPasswordException') {
        toast.error('Password does not meet the requirements')
      } else {
        toast.error(error.message ?? 'Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-brand-gradient">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Logo → back to landing */}
        <div className="flex items-center justify-center mb-6">
          <Link to="/" aria-label="Back to CargoLink Barbados home">
            <img
              src="/logos/logo-color-stacked.png"
              alt="CargoLink Barbados"
              className="h-28 w-auto hover:opacity-90 transition-opacity"
            />
          </Link>
        </div>

        <h2 className="text-2xl font-bold text-brand-navy mb-1 text-center">
          Create your account
        </h2>
        <p className="text-sm text-gray-500 mb-6 text-center">
          Get your free US shipping address and start shopping.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mb-6" noValidate>
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name *"
              type="text"
              placeholder="Jane"
              autoFocus
              autoComplete="given-name"
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <Input
              label="Last Name *"
              type="text"
              placeholder="Smith"
              autoComplete="family-name"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </div>

          <Input
            label="Email Address *"
            type="email"
            placeholder="your@email.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Phone Number *"
            type="tel"
            placeholder="+1 (246) 555-0100"
            autoComplete="tel"
            error={errors.phone?.message}
            {...register('phone')}
          />

          <Input
            label="Address *"
            type="text"
            placeholder="Street, City, Parish, Barbados"
            autoComplete="street-address"
            error={errors.address?.message}
            {...register('address')}
          />

          {/* Password with show/hide */}
          <div className="relative">
            <Input
              label="Password *"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a password"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-[38px] text-gray-400 hover:text-brand-navy transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <PasswordRules value={passwordValue} />
          </div>

          {/* Confirm password with show/hide */}
          <div className="relative">
            <Input
              label="Confirm Password *"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-[38px] text-gray-400 hover:text-brand-navy transition-colors"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Terms acceptance */}
          <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none">
            <input
              type="checkbox"
              {...register('acceptTerms')}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-navy focus:ring-brand-navy cursor-pointer"
            />
            <span className="text-xs text-gray-600 leading-relaxed">
              I agree to the{' '}
              <Link to="/terms" className="text-brand-navy font-medium hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-brand-navy font-medium hover:underline">Privacy Policy</Link>.
            </span>
          </label>
          {errors.acceptTerms && (
            <p className="text-xs text-red-600 -mt-2">{errors.acceptTerms.message}</p>
          )}

          <Button
            type="submit"
            variant="gold"
            loading={loading}
            className="w-full mt-3 py-3.5 text-base font-bold uppercase tracking-wide rounded-xl
                       shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all
                       ring-1 ring-brand-gold-dark/30"
          >
            <span className="inline-flex items-center gap-2">
              Create Account
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </span>
          </Button>
        </form>

        <div className="text-center">
          <p className="text-gray-600 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-navy font-semibold hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
