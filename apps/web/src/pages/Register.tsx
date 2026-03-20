import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Button, Input } from '../components'
import { useAuth } from '../contexts/useAuth'

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(7, 'Please enter a valid phone number'),
    address: z.string().min(5, 'Please enter your address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterFormData = z.infer<typeof registerSchema>

export const Register = () => {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [loading, setLoading] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true)
    try {
      // Normalise phone to E.164: strip spaces/dashes, prepend + if missing
      let phone = data.phone.replace(/[\s\-().]/g, '')
      if (!phone.startsWith('+')) phone = `+${phone}`

      await signUp(data.email, data.password, data.name, phone, data.address)
      toast.success('Account created! Check your email for a verification code.')
      navigate(`/confirm?email=${encodeURIComponent(data.email)}`)
    } catch (err: unknown) {
      console.error('Registration error:', err)
      const error = err as { name?: string; message?: string }
      if (error.name === 'UsernameExistsException') {
        toast.error('An account with this email already exists')
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
        <div className="flex items-center justify-center mb-8">
          <img
            src="/logos/logo-color-stacked.png"
            alt="CargoLink Barbados"
            className="h-36 w-auto"
          />
        </div>

        <h2 className="text-xl font-semibold text-gray-700 mb-6 text-center">
          Create Account
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mb-6">
          <Input
            label="Full Name"
            type="text"
            placeholder="Your full name"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="your@email.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Phone Number"
            type="tel"
            placeholder="+1 (246) 555-0100"
            error={errors.phone?.message}
            {...register('phone')}
          />
          <Input
            label="Address"
            type="text"
            placeholder="Street, City, Parish, Barbados"
            error={errors.address?.message}
            {...register('address')}
          />
          <Input
            label="Password"
            type="password"
            placeholder="At least 8 characters"
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            label="Confirm Password"
            type="password"
            placeholder="Confirm your password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          <Button type="submit" loading={loading} className="w-full">
            Register
          </Button>
        </form>

        <div className="text-center">
          <p className="text-gray-600 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-medium hover:text-blue-700">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
