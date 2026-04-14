import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { ArrowRight, Check, Eye, EyeOff, KeyRound } from 'lucide-react'
import { Button, Input } from '../components'
import { useAuth } from '../contexts/useAuth'
import { enableDemoMode, enableAdminDemoMode } from '../utils/mockData'
import { redirectAfterLogin } from '../auth/useAuthRedirect'
import { cognitoConfirmNewPassword } from '../lib/cognito'

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address').max(254, 'Email is too long'),
  password: z.string().min(1, 'Password is required'),
})

/** Mirror Cognito's password policy so users see errors client-side. */
const newPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8,  'At least 8 characters')
      .max(128, 'Password is too long')
      .regex(/[a-z]/, 'Must include a lowercase letter')
      .regex(/[A-Z]/, 'Must include an uppercase letter')
      .regex(/[0-9]/, 'Must include a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type LoginFormData = z.infer<typeof loginSchema>
type NewPasswordFormData = z.infer<typeof newPasswordSchema>

/** Live password-rule checklist (shared shape with Register). */
function PasswordRules({ value }: { value: string }) {
  const rules = [
    { label: 'At least 8 characters', ok: value.length >= 8 },
    { label: 'One lowercase letter',  ok: /[a-z]/.test(value) },
    { label: 'One uppercase letter',  ok: /[A-Z]/.test(value) },
    { label: 'One number',            ok: /[0-9]/.test(value) },
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

export const Login = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'login' | 'new-password'>('login')
  const [showPassword, setShowPassword]       = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirm, setShowConfirm]         = useState(false)
  const { signIn, refreshUser } = useAuth()

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  })

  const newPasswordForm = useForm<NewPasswordFormData>({
    resolver: zodResolver(newPasswordSchema),
    mode: 'onBlur',
  })

  const newPasswordValue = newPasswordForm.watch('newPassword') ?? ''

  const handleDemoMode = (isAdmin: boolean) => {
    if (isAdmin) {
      enableAdminDemoMode()
      toast.success('Demo mode: Admin dashboard')
      setTimeout(() => navigate('/admin/dashboard'), 500)
    } else {
      enableDemoMode()
      toast.success('Demo mode: Customer dashboard')
      setTimeout(() => navigate('/dashboard'), 500)
    }
  }

  const onLogin = async (data: LoginFormData) => {
    setLoading(true)
    try {
      await signIn(data.email, data.password)
      toast.success('Logged in successfully')
      await redirectAfterLogin(navigate)
    } catch (err: unknown) {
      console.error('[Login] sign-in error:', err)
      const error = err as { name?: string; message?: string }
      if (error.name === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        setStep('new-password')
      } else if (error.name === 'UserNotConfirmedException') {
        toast.error('Please verify your email before logging in')
        const email = loginForm.getValues('email')
        navigate(`/confirm?email=${encodeURIComponent(email)}`)
      } else if (error.name === 'NotAuthorizedException' || error.name === 'UserNotFoundException') {
        // Generic message — don't leak whether the email is registered.
        toast.error('Incorrect email or password')
      } else if (error.name === 'PasswordResetRequiredException') {
        toast.error('Password reset required — please contact support')
      } else if (error.name === 'UserAlreadyAuthenticatedException') {
        toast.error('Session conflict — please refresh the page and try again')
      } else {
        toast.error(error.message ?? 'Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const onSetNewPassword = async (data: NewPasswordFormData) => {
    setLoading(true)
    try {
      await cognitoConfirmNewPassword(data.newPassword)
      await refreshUser()
      toast.success('Password set! Welcome to CargoLink.')
      await redirectAfterLogin(navigate)
    } catch (err: unknown) {
      console.error('[Login] new password error:', err)
      const error = err as { message?: string }
      toast.error(error.message ?? 'Failed to set password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── New-password step ─────────────────────────────────────────────────────
  if (step === 'new-password') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-brand-gradient">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <Link to="/" aria-label="Back to CargoLink Barbados home">
              <img src="/logos/logo-color-stacked.png" alt="CargoLink Barbados" className="h-28 w-auto hover:opacity-90 transition-opacity" />
            </Link>
          </div>

          <div className="flex items-center justify-center gap-2 mb-1">
            <KeyRound className="w-5 h-5 text-brand-navy" />
            <h2 className="text-2xl font-bold text-brand-navy">Set your password</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6 text-center">
            Welcome! Create a new password to secure your account.
          </p>

          <form onSubmit={newPasswordForm.handleSubmit(onSetNewPassword)} className="space-y-4" noValidate>
            <div className="relative">
              <Input
                label="New Password *"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Create a password"
                autoComplete="new-password"
                autoFocus
                error={newPasswordForm.formState.errors.newPassword?.message}
                {...newPasswordForm.register('newPassword')}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-[38px] text-gray-400 hover:text-brand-navy transition-colors"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <PasswordRules value={newPasswordValue} />
            </div>

            <div className="relative">
              <Input
                label="Confirm Password *"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                error={newPasswordForm.formState.errors.confirmPassword?.message}
                {...newPasswordForm.register('confirmPassword')}
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

            <Button
              type="submit"
              loading={loading}
              className="w-full mt-3 py-3.5 text-base font-bold uppercase tracking-wide rounded-xl
                         bg-brand-gold !text-brand-navy hover:bg-brand-gold-dark
                         shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all
                         ring-1 ring-brand-gold-dark/30"
            >
              <span className="inline-flex items-center gap-2">
                Set Password & Sign In
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </span>
            </Button>
          </form>
        </div>
      </div>
    )
  }

  // ── Login step ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-brand-gradient">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex items-center justify-center mb-6">
          <Link to="/" aria-label="Back to CargoLink Barbados home">
            <img src="/logos/logo-color-stacked.png" alt="CargoLink Barbados" className="h-28 w-auto hover:opacity-90 transition-opacity" />
          </Link>
        </div>

        <h2 className="text-2xl font-bold text-brand-navy mb-1 text-center">Welcome back</h2>
        <p className="text-sm text-gray-500 mb-6 text-center">Sign in to manage your shipments.</p>

        <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4 mb-6" noValidate>
          <Input
            label="Email"
            type="email"
            placeholder="your@email.com"
            autoComplete="email"
            autoFocus
            error={loginForm.formState.errors.email?.message}
            {...loginForm.register('email')}
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              autoComplete="current-password"
              error={loginForm.formState.errors.password?.message}
              {...loginForm.register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-[38px] text-gray-400 hover:text-brand-navy transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <Button
            type="submit"
            loading={loading}
            className="w-full mt-3 py-3.5 text-base font-bold uppercase tracking-wide rounded-xl
                       bg-brand-gold !text-brand-navy hover:bg-brand-gold-dark
                       shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all
                       ring-1 ring-brand-gold-dark/30"
          >
            <span className="inline-flex items-center gap-2">
              Login
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </span>
          </Button>
        </form>

        {import.meta.env.DEV && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-green-600" />
              Preview UI (No Backend Required)
            </h3>
            <div className="space-y-2">
              <Button type="button" variant="secondary" className="w-full" onClick={() => handleDemoMode(false)}>
                View Customer Dashboard
              </Button>
              <Button type="button" variant="secondary" className="w-full" onClick={() => handleDemoMode(true)}>
                View Admin Dashboard
              </Button>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Explore the UI with sample data without connecting to a backend
            </p>
          </div>
        )}

        <div className="text-center space-y-2">
          <p className="text-sm">
            <Link to="/forgot-password" className="text-brand-navy font-semibold hover:underline">
              Forgot your password?
            </Link>
          </p>
          <p className="text-gray-600 text-sm">
            New customer?{' '}
            <Link to="/register" className="text-brand-navy font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
