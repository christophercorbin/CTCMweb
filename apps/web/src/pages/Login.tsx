import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Button, Input } from '../components'
import { useAuth } from '../contexts/AuthContext'
import { Eye } from 'lucide-react'
import { enableDemoMode, enableAdminDemoMode } from '../utils/mockData'
import { redirectAfterLogin } from '../auth/useAuthRedirect'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

export const Login = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
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

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true)
    try {
      await signIn(data.email, data.password)
      toast.success('Logged in successfully')
      await redirectAfterLogin(navigate)
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string }
      if (error.name === 'UserNotConfirmedException') {
        toast.error('Please verify your email before logging in')
      } else if (error.name === 'NotAuthorizedException') {
        toast.error('Invalid email or password')
      } else if (error.name === 'UserNotFoundException') {
        toast.error('No account found with that email')
      } else if (error.name === 'PasswordResetRequiredException') {
        toast.error('Password reset required — please contact support')
      } else {
        toast.error(error.message ?? 'Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #1B2D78 0%, #243899 60%, #1B2D78 100%)' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <img
            src="/logos/logo-color-stacked.png"
            alt="CargoLink Barbados"
            className="h-36 w-auto"
          />
        </div>

        <h2 className="text-xl font-semibold text-gray-700 mb-6 text-center">Sign in to your account</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mb-6">
          <Input
            label="Email"
            type="email"
            placeholder="your@email.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            error={errors.password?.message}
            {...register('password')}
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
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => handleDemoMode(false)}
            >
              View Customer Dashboard
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => handleDemoMode(true)}
            >
              View Admin Dashboard
            </Button>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Explore the UI with sample data without connecting to a backend
          </p>
        </div>

        <div className="text-center">
          <p className="text-gray-600 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 font-medium hover:text-blue-700">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
