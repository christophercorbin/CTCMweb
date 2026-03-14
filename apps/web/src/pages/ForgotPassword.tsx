import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Button, Input } from '../components'
import { cognitoResetPassword, cognitoConfirmResetPassword } from '../lib/cognito'

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
})

const confirmSchema = z
  .object({
    code: z.string().min(6, 'Code must be 6 digits').max(6, 'Code must be 6 digits'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type EmailForm = z.infer<typeof emailSchema>
type ConfirmForm = z.infer<typeof confirmSchema>

export const ForgotPassword = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState<'email' | 'confirm'>('email')
  const [sentEmail, setSentEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema) })
  const confirmForm = useForm<ConfirmForm>({ resolver: zodResolver(confirmSchema) })

  const handleRequestCode = async (data: EmailForm) => {
    setLoading(true)
    try {
      await cognitoResetPassword(data.email)
      setSentEmail(data.email)
      setStep('confirm')
      toast.success('Reset code sent — check your email')
    } catch (err) {
      const e = err as { message?: string }
      toast.error(e.message ?? 'Failed to send reset code')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (data: ConfirmForm) => {
    setLoading(true)
    try {
      await cognitoConfirmResetPassword(sentEmail, data.code, data.password)
      toast.success('Password reset successfully — please sign in')
      navigate('/login')
    } catch (err) {
      const e = err as { name?: string; message?: string }
      if (e.name === 'CodeMismatchException') {
        confirmForm.setError('code', { message: 'Invalid code — check your email and try again' })
      } else if (e.name === 'ExpiredCodeException') {
        confirmForm.setError('code', { message: 'Code expired — please request a new one' })
      } else {
        toast.error(e.message ?? 'Failed to reset password')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-200">
            <img
              src="/logos/logo-color-horizontal.png"
              alt="CargoLink Barbados"
              className="h-12 w-auto"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {step === 'email' ? 'Reset your password' : 'Set a new password'}
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            {step === 'email'
              ? "Enter your email and we'll send a reset code."
              : `We sent a 6-digit code to ${sentEmail}`}
          </p>

          {step === 'email' ? (
            <form onSubmit={emailForm.handleSubmit(handleRequestCode)} className="space-y-4">
              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                error={emailForm.formState.errors.email?.message}
                {...emailForm.register('email')}
              />
              <Button type="submit" loading={loading} className="w-full">
                Send reset code
              </Button>
            </form>
          ) : (
            <form onSubmit={confirmForm.handleSubmit(handleConfirm)} className="space-y-4">
              <Input
                label="Reset code"
                type="text"
                inputMode="numeric"
                placeholder="123456"
                maxLength={6}
                error={confirmForm.formState.errors.code?.message}
                {...confirmForm.register('code')}
              />
              <Input
                label="New password"
                type="password"
                placeholder="At least 8 characters"
                error={confirmForm.formState.errors.password?.message}
                {...confirmForm.register('password')}
              />
              <Input
                label="Confirm new password"
                type="password"
                placeholder="Repeat your new password"
                error={confirmForm.formState.errors.confirmPassword?.message}
                {...confirmForm.register('confirmPassword')}
              />
              <Button type="submit" loading={loading} className="w-full">
                Reset password
              </Button>
              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  confirmForm.reset()
                }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 underline"
              >
                ← Back to email entry
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-blue-600 font-medium hover:text-blue-700">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
