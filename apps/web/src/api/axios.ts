import axios, { AxiosError, AxiosResponse } from 'axios'
import { toast } from 'react-hot-toast'
import { getAccessToken } from '../lib/auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add Amplify Auth access token
apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch (error) {
    console.error('Failed to get access token:', error)
  }
  return config
})

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const isAuthEndpoint = error.config?.url?.includes('/auth/')

    if (error.response?.status === 401 && !isAuthEndpoint) {
      // Token expired or invalid - redirect to login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }

    if (error.response?.status === 403) {
      toast.error('Access denied')
      return Promise.reject(error)
    }

    if (!error.response && !isAuthEndpoint) {
      toast.error('Network error. Please check your connection.')
    }

    return Promise.reject(error)
  }
)

export default apiClient
