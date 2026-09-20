import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const h = vi.hoisted(() => {
  const toastFn = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
  return {
    toastFn,
    navigate: vi.fn(),
    invoiceList: vi.fn(),
    invoiceDelete: vi.fn(),
    customerList: vi.fn(),
    customerUpdate: vi.fn(),
    shipmentDelete: vi.fn(),
    docCreate: vi.fn(),
    docByShipment: vi.fn(),
    docDelete: vi.fn(),
    docList: vi.fn(),
    uploadData: vi.fn(),
    fetchAuthSession: vi.fn(),
    shipments: [] as unknown[],
  }
})

vi.mock('react-hot-toast', () => ({ default: h.toastFn }))

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => h.navigate,
}))

vi.mock('aws-amplify/data', () => ({
  generateClient: () => ({
    models: {
      Invoice: { list: h.invoiceList, delete: h.invoiceDelete },
      Customer: { list: h.customerList, update: h.customerUpdate },
      Shipment: { delete: h.shipmentDelete },
      ShipmentDocument: {
        create: h.docCreate,
        list: h.docList,
        listShipmentDocumentByShipmentId: h.docByShipment,
        delete: h.docDelete,
      },
    },
  }),
}))

vi.mock('aws-amplify/storage', () => ({ uploadData: h.uploadData }))
vi.mock('aws-amplify/auth', () => ({ fetchAuthSession: h.fetchAuthSession }))

vi.mock('../contexts/useAuth', () => ({
  useAuth: () => ({ user: { firstName: 'Frank', email: 'frank.customer@ctcm.test' } }),
}))

vi.mock('../hooks/useShipments', () => ({
  useShipments: () => ({ shipments: h.shipments, loading: false, error: null }),
}))

import { CustomerDashboard } from './CustomerDashboard'

const SHIPMENT = {
  id: 'ship-1',
  trackingNumber: 'CL-2026-777',
  type: 'AIR',
  status: 'MIAMI_WAREHOUSE',
  description: 'A box of electronics',
  customerId: 'cust-1',
  customerCognitoSub: 'sub-1',
  customerInstruction: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const openUploadModal = () => {
  fireEvent.click(screen.getByText('Upload Invoice'))
}

const selectFile = () => {
  const file = new File(['%PDF-1.4'], 'amazon-order.pdf', { type: 'application/pdf' })
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
  return file
}

describe('CustomerDashboard — invoice upload is persisted, not orphaned in S3', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.shipments = [SHIPMENT]
    h.invoiceList.mockResolvedValue({ data: [], nextToken: null })
    h.docList.mockResolvedValue({ data: [], nextToken: null })
    h.customerList.mockResolvedValue({ data: [] })
    h.docByShipment.mockResolvedValue({ data: [], nextToken: null })
    h.docDelete.mockResolvedValue({ data: null })
    h.invoiceDelete.mockResolvedValue({ data: null })
    h.shipmentDelete.mockResolvedValue({ data: null })
    h.fetchAuthSession.mockResolvedValue({ identityId: 'us-east-1:abc' })
    h.uploadData.mockReturnValue({
      result: Promise.resolve({
        path: 'documents/us-east-1:abc/shipments/ship-1/1-amazon-order.pdf',
      }),
    })
    h.docCreate.mockResolvedValue({ data: { id: 'doc-1' }, errors: undefined })
  })

  it('creates a ShipmentDocument row linked to the chosen shipment', async () => {
    render(<CustomerDashboard />)
    openUploadModal()

    // Customer must be able to say which shipment the invoice belongs to.
    const picker = await screen.findByLabelText(/which shipment/i)
    fireEvent.change(picker, { target: { value: 'ship-1' } })

    selectFile()
    fireEvent.click(screen.getByRole('button', { name: /^Upload$/ }))

    await waitFor(() => expect(h.docCreate).toHaveBeenCalledTimes(1))

    expect(h.docCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        shipmentId: 'ship-1',
        customerId: 'cust-1',
        customerCognitoSub: 'sub-1',
        docType: 'ORDER_RECEIPT',
        uploadedBy: 'CUSTOMER',
        fileName: 'amazon-order.pdf',
        s3Key: 'documents/us-east-1:abc/shipments/ship-1/1-amazon-order.pdf',
      })
    )
  })

  it('does not report success when the database write fails', async () => {
    h.docCreate.mockResolvedValue({ data: null, errors: [{ message: 'Unauthorized' }] })

    render(<CustomerDashboard />)
    openUploadModal()

    const picker = await screen.findByLabelText(/which shipment/i)
    fireEvent.change(picker, { target: { value: 'ship-1' } })

    selectFile()
    fireEvent.click(screen.getByRole('button', { name: /^Upload$/ }))

    await waitFor(() => expect(h.toastFn.error).toHaveBeenCalled())
    expect(h.toastFn.success).not.toHaveBeenCalled()
  })

  it('blocks upload until a shipment is chosen, so no file can be orphaned', async () => {
    render(<CustomerDashboard />)
    openUploadModal()

    await screen.findByLabelText(/which shipment/i)
    selectFile()

    // No shipment selected yet -> Upload must stay disabled.
    expect(screen.getByRole('button', { name: /^Upload$/ })).toBeDisabled()
    expect(h.uploadData).not.toHaveBeenCalled()
  })

  it('deletes uploaded documents along with the pre-alert, leaving no orphan rows', async () => {
    // Deleting a pre-alert used to remove only Invoice rows, so the
    // ShipmentDocument rows customers now upload against survived their parent
    // shipment and became unreachable.
    h.docByShipment.mockResolvedValue({
      data: [{ id: 'doc-1' }, { id: 'doc-2' }],
      nextToken: null,
    })
    h.invoiceList.mockResolvedValue({ data: [{ id: 'inv-1' }], nextToken: null })
    // The delete control only renders for customer-created pre-alerts.
    h.shipments = [{ ...SHIPMENT, shipmentSource: 'CUSTOMER' }]

    render(<CustomerDashboard />)

    fireEvent.click(await screen.findByTitle(/delete pre-alert/i))
    fireEvent.click(await screen.findByRole('button', { name: /yes, delete/i }))

    await waitFor(() => expect(h.shipmentDelete).toHaveBeenCalledWith({ id: 'ship-1' }))
    expect(h.docDelete).toHaveBeenCalledWith({ id: 'doc-1' })
    expect(h.docDelete).toHaveBeenCalledWith({ id: 'doc-2' })
    expect(h.invoiceDelete).toHaveBeenCalledWith({ id: 'inv-1' })
  })
})
