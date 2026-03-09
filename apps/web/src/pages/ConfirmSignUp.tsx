import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Button, Input } from '../components'
import { cognitoConfirmSignUp } from '../lib/cognito'

const confirmSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().min(6, 'Confirmation code must be 6 digits').max(6),
})

type ConfirmFormData = z.infer<typeof confirmSchema>

export const ConfirmSignUp = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const emailFromQuery = searchParams.get('email') ?? ''
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ConfirmFormData>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { email: emailFromQuery, code: '' },
  })

  const onSubmit = async (data: ConfirmFormData) => {
    setLoading(true)
    try {
      await cognitoConfirmSignUp(data.email, data.code)
      toast.success('Email verified! You can now sign in.')
      navigate('/login')
    } catch (err: unknown) {
      console.error('Confirmation error:', err)
      const error = err as { name?: string; message?: string }
      if (error.name === 'CodeMismatchException') {
        toast.error('Invalid code. Please check and try again.')
      } else if (error.name === 'ExpiredCodeException') {
        toast.error('Code expired. Use "Resend Code" to get a new one.')
      } else if (
        error.name === 'NotAuthorizedException' ||
        error.message?.includes('Current status is CONFIRMED')
      ) {
        toast.success('Account already confirmed. Please sign in.')
        navigate('/login')
      } else {
        toast.error(error.message ?? 'Verification failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    const email = getValues('email')
    if (!email) {
      toast.error('Enter your email first')
      return
    }

    setResending(true)
    try {
      const { resendSignUpCode } = await import('aws-amplify/auth')
      await resendSignUpCode({ username: email })
      toast.success('New code sent! Check your email.')
    } catch (err: unknown) {
      console.error('Resend error:', err)
      const error = err as { message?: string }
      toast.error(error.message ?? 'Failed to resend code.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          'linear-gradient(135deg, #1B2D78 0%, #243899 60%, #1B2D78 100%)',
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <img
            src="/logos/logo-color-stacked.png"
            alt="CargoLink Barbados"
            className="h-36 w-auto"
          />
        </div>

        <h2 className="text-xl font-semibold text-gray-700 mb-2 text-center">
          Verify Your Email
        </h2>
        <p className="text-sm text-gray-500 mb-6 text-center">
          Enter the 6-digit code we sent to your email
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mb-4">
          <Input
            label="Email"
            type="email"
            placeholder="your@email.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Confirmation Code"
            type="text"
            inputMode="numeric"
            placeholder="123456"
            autoComplete="one-time-code"
            error={errors.code?.message}
            {...register('code')}
          />
          <Button type="submit" loading={loading} className="w-full">
            Verify Email
          </Button>
        </form>

        <div className="text-center mb-4">
          <button
            type="button"
            onClick={handleResendCode}
            disabled={resending}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
          >
            {resending ? 'Sending...' : "Didn't get a code? Resend"}
          </button>
        </div>

        <div className="text-center space-y-2">
          <p className="text-gray-600 text-sm">
            Already verified?{' '}
            <Link
              to="/login"
              className="text-blue-600 font-medium hover:text-blue-700"
            >
              Sign in
            </Link>
          </p>
          <p className="text-gray-600 text-sm">
            Wrong email?{' '}
            <Link
              to="/register"
              className="text-blue-600 font-medium hover:text-blue-700"
            >
              Register again
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
