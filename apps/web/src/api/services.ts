import apiClient from './axios'
import type {
  Customer,
  Shipment,
  Invoice,
  Document,
  ShipmentDetails,
} from '../types'

// Response wrapper type
interface ApiResponse<T> {
  success: boolean
  data: T
  metadata?: {
    timestamp: string
    requestId: string
  }
}

// Pagination params
interface PaginationParams {
  page?: number
  limit?: number
}

// Customer API
export const customerApi = {
  async getAll(): Promise<Customer[]> {
    const response = await apiClient.get<ApiResponse<Customer[]>>('/customers')
    return response.data.data
  },

  async getById(id: string): Promise<Customer> {
    const response = await apiClient.get<ApiResponse<Customer>>(`/customers/${id}`)
    return response.data.data
  },

  async create(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    const response = await apiClient.post<ApiResponse<Customer>>('/customers', data)
    return response.data.data
  },

  async update(id: string, data: Partial<Customer>): Promise<Customer> {
    const response = await apiClient.put<ApiResponse<Customer>>(`/customers/${id}`, data)
    return response.data.data
  },
}

// Shipment API
export const shipmentApi = {
  async getAll(filters?: {
    status?: string
    customerId?: string
    startDate?: string
    endDate?: string
  }): Promise<Shipment[]> {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.customerId) params.append('customerId', filters.customerId)
    if (filters?.startDate) params.append('startDate', filters.startDate)
    if (filters?.endDate) params.append('endDate', filters.endDate)

    const url = `/shipments${params.toString() ? `?${params.toString()}` : ''}`
    const response = await apiClient.get<ApiResponse<Shipment[]>>(url)
    return response.data.data
  },

  async getById(id: string): Promise<ShipmentDetails> {
    const response = await apiClient.get<ApiResponse<ShipmentDetails>>(`/shipments/${id}`)
    return response.data.data
  },

  async create(data: Omit<Shipment, 'id' | 'trackingNumber' | 'createdAt' | 'updatedAt'>): Promise<Shipment> {
    const response = await apiClient.post<ApiResponse<Shipment>>('/shipments', data)
    return response.data.data
  },

  async update(id: string, data: Partial<Shipment>): Promise<Shipment> {
    const response = await apiClient.put<ApiResponse<Shipment>>(`/shipments/${id}`, data)
    return response.data.data
  },
}

// Search API
export const searchApi = {
  async search(query: string, pagination?: PaginationParams): Promise<Shipment[]> {
    const params = new URLSearchParams({ q: query })
    if (pagination?.page) params.append('page', pagination.page.toString())
    if (pagination?.limit) params.append('limit', pagination.limit.toString())

    const response = await apiClient.get<ApiResponse<Shipment[]>>(`/search?${params.toString()}`)
    return response.data.data
  },
}

// Document API
export const documentApi = {
  async getAll(filters?: { customerId?: string; shipmentId?: string }): Promise<Document[]> {
    const params = new URLSearchParams()
    if (filters?.customerId) params.append('customerId', filters.customerId)
    if (filters?.shipmentId) params.append('shipmentId', filters.shipmentId)

    const url = `/documents${params.toString() ? `?${params.toString()}` : ''}`
    const response = await apiClient.get<ApiResponse<Document[]>>(url)
    return response.data.data
  },

  async getById(id: string): Promise<string> {
    // Returns presigned URL
    const response = await apiClient.get<ApiResponse<{ url: string }>>(`/documents/${id}`)
    return response.data.data.url
  },

  async upload(file: File, metadata: {
    customerId: string
    shipmentId?: string
    documentType: string
  }): Promise<Document> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('customerId', metadata.customerId)
    if (metadata.shipmentId) formData.append('shipmentId', metadata.shipmentId)
    formData.append('documentType', metadata.documentType)

    const response = await apiClient.post<ApiResponse<Document>>('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data.data
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/documents/${id}`)
  },
}

// Invoice API
export const invoiceApi = {
  async getAll(filters?: { customerId?: string; status?: string }): Promise<Invoice[]> {
    const params = new URLSearchParams()
    if (filters?.customerId) params.append('customerId', filters.customerId)
    if (filters?.status) params.append('status', filters.status)

    const url = `/invoices${params.toString() ? `?${params.toString()}` : ''}`
    const response = await apiClient.get<ApiResponse<Invoice[]>>(url)
    return response.data.data
  },

  async getById(id: string): Promise<Invoice> {
    const response = await apiClient.get<ApiResponse<Invoice>>(`/invoices/${id}`)
    return response.data.data
  },

  async create(data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> {
    const response = await apiClient.post<ApiResponse<Invoice>>('/invoices', data)
    return response.data.data
  },

  async update(id: string, data: Partial<Invoice>): Promise<Invoice> {
    const response = await apiClient.put<ApiResponse<Invoice>>(`/invoices/${id}`, data)
    return response.data.data
  },
}
