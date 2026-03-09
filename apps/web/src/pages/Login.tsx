import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Button, Input } from '../components'
import { useAuth } from '../contexts/AuthContext'
import { Eye, KeyRound } from 'lucide-react'
import { enableDemoMode, enableAdminDemoMode } from '../utils/mockData'
import { redirectAfterLogin } from '../auth/useAuthRedirect'
import { cognitoConfirmNewPassword } from '../lib/cognito'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

const newPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type LoginFormData = z.infer<typeof loginSchema>
type NewPasswordFormData = z.infer<typeof newPasswordSchema>

export const Login = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'login' | 'new-password'>('login')
  const { signIn, refreshUser } = useAuth()

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const newPasswordForm = useForm<NewPasswordFormData>({
    resolver: zodResolver(newPasswordSchema),
  })

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
        // Admin-created account — Amplify holds the challenge in memory
        setStep('new-password')
      } else if (error.name === 'UserNotConfirmedException') {
        toast.error('Please verify your email before logging in')
        const email = loginForm.getValues('email')
        navigate(`/confirm?email=${encodeURIComponent(email)}`)
      } else if (error.name === 'NotAuthorizedException') {
        toast.error('Incorrect email or password')
      } else if (error.name === 'UserNotFoundException') {
        toast.error('No account found with that email')
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
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #1B2D78 0%, #243899 60%, #1B2D78 100%)' }}>
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <img src="/logos/logo-color-stacked.png" alt="CargoLink Barbados" className="h-36 w-auto" />
          </div>

          <div className="flex items-center justify-center gap-2 mb-2">
            <KeyRound className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-700">Set Your Password</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6 text-center">
            Welcome! Please create a new password to secure your account.
          </p>

          <form onSubmit={newPasswordForm.handleSubmit(onSetNewPassword)} className="space-y-4">
            <Input
              label="New Password"
              type="password"
              placeholder="At least 8 characters"
              error={newPasswordForm.formState.errors.newPassword?.message}
              {...newPasswordForm.register('newPassword')}
            />
            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Confirm your password"
              error={newPasswordForm.formState.errors.confirmPassword?.message}
              {...newPasswordForm.register('confirmPassword')}
            />
            <Button type="submit" loading={loading} className="w-full">
              Set Password & Sign In
            </Button>
          </form>
        </div>
      </div>
    )
  }

  // ── Login step ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #1B2D78 0%, #243899 60%, #1B2D78 100%)' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <img src="/logos/logo-color-stacked.png" alt="CargoLink Barbados" className="h-36 w-auto" />
        </div>

        <h2 className="text-xl font-semibold text-gray-700 mb-6 text-center">Sign in to your account</h2>

        <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4 mb-6">
          <Input
            label="Email"
            type="email"
            placeholder="your@email.com"
            error={loginForm.formState.errors.email?.message}
            {...loginForm.register('email')}
          />
          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            error={loginForm.formState.errors.password?.message}
            {...loginForm.register('password')}
          />
          <Button type="submit" loading={loading} className="w-full">
            Login
          </Button>
        </form>

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

        <div className="text-center">
          <p className="text-gray-600 text-sm">
            New customer?{' '}
            <Link to="/register" className="text-blue-600 font-medium hover:text-blue-700">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
