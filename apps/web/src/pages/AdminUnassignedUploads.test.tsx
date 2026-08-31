import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const h = vi.hoisted(() => {
  const toastFn = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
  return {
    toastFn,
    navigate: vi.fn(),
    list: vi.fn(),
    getUrl: vi.fn(),
    docList: vi.fn(),
    docCreate: vi.fn(),
    invoiceList: vi.fn(),
    customerList: vi.fn(),
    shipmentList: vi.fn(),
    dismissedList: vi.fn(),
    dismissedCreate: vi.fn(),
  }
})

vi.mock('react-hot-toast', () => ({ default: h.toastFn }))

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => h.navigate,
}))

vi.mock('aws-amplify/storage', () => ({ list: h.list, getUrl: h.getUrl }))

vi.mock('../contexts/useAuth', () => ({
  useAuth: () => ({ user: { email: 'frank.admin@ctcm.test' } }),
}))

vi.mock('aws-amplify/data', () => ({
  generateClient: () => ({
    models: {
      ShipmentDocument: { list: h.docList, create: h.docCreate },
      Invoice: { list: h.invoiceList },
      Customer: { list: h.customerList },
      Shipment: { list: h.shipmentList },
      DismissedUpload: { list: h.dismissedList, create: h.dismissedCreate },
    },
  }),
}))

import { AdminUnassignedUploads } from './AdminUnassignedUploads'

const IDENTITY = 'us-east-1:known-identity'
const ORPHAN = `documents/${IDENTITY}/invoices/1777477485809-Amazon_April_12th.pdf`
const ASSIGNED = `documents/${IDENTITY}/invoices/1777477485000-Already_Assigned.pdf`
const DISMISSED = `documents/us-east-1:junk/invoices/1777477480000-CargoLink_Logo.pdf`
const UNKNOWN = `documents/us-east-1:mystery/invoices/1777477999999-Capacitor_No.2.pdf`
// Correctly-filed upload: has a /shipments/ segment, so it is NOT an orphan.
const PROPER = `documents/${IDENTITY}/shipments/ship-1/1777477485111-Proper.pdf`

const page = (items: string[]) => ({
  items: items.map((path) => ({ path, size: 1234, lastModified: new Date('2026-04-12') })),
  nextToken: undefined,
})

describe('AdminUnassignedUploads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.list.mockResolvedValue(page([ORPHAN, ASSIGNED, DISMISSED, UNKNOWN, PROPER]))

    // ASSIGNED is already linked to a shipment document.
    h.docList.mockResolvedValue({
      data: [{ id: 'doc-1', s3Key: ASSIGNED, customerId: 'cust-1', shipmentId: 'ship-1' }],
      nextToken: null,
    })
    // Invoice rows pair identityId -> customer for the derivation map.
    h.invoiceList.mockResolvedValue({
      data: [{ id: 'inv-1', s3Key: `documents/${IDENTITY}/invoices/old.pdf`, customerId: 'cust-1' }],
      nextToken: null,
    })
    h.customerList.mockResolvedValue({
      data: [
        { id: 'cust-1', name: 'Carol Cumberbatch', email: 'carol@example.com', cognitoSub: 'sub-1' },
        { id: 'cust-2', name: 'Kofi Gilkes', email: 'kofi@example.com', cognitoSub: 'sub-2' },
      ],
      nextToken: null,
    })
    h.shipmentList.mockResolvedValue({
      data: [
        { id: 'ship-1', trackingNumber: 'TBA-111', customerId: 'cust-1', customerCognitoSub: 'sub-1', createdAt: '2026-04-01T00:00:00Z' },
        { id: 'ship-2', trackingNumber: 'TBA-222', customerId: 'cust-1', customerCognitoSub: 'sub-1', createdAt: '2026-04-05T00:00:00Z' },
        { id: 'ship-9', trackingNumber: 'OTHER-9', customerId: 'cust-2', customerCognitoSub: 'sub-2', createdAt: '2026-04-05T00:00:00Z' },
      ],
      nextToken: null,
    })
    h.dismissedList.mockResolvedValue({ data: [{ id: 'd-1', s3Key: DISMISSED }], nextToken: null })
    h.docCreate.mockResolvedValue({ data: { id: 'new-doc' }, errors: undefined })
    h.dismissedCreate.mockResolvedValue({ data: { id: 'new-dismiss' }, errors: undefined })
    h.getUrl.mockResolvedValue({ url: new URL('https://signed.example/file.pdf') })
  })

  it('lists only unresolved orphans, excluding assigned, dismissed and properly-filed files', async () => {
    render(<AdminUnassignedUploads />)

    expect(await screen.findByText('Amazon_April_12th.pdf')).toBeInTheDocument()
    expect(screen.getByText('Capacitor_No.2.pdf')).toBeInTheDocument()

    expect(screen.queryByText('Already_Assigned.pdf')).not.toBeInTheDocument()
    expect(screen.queryByText('CargoLink_Logo.pdf')).not.toBeInTheDocument()
    expect(screen.queryByText('Proper.pdf')).not.toBeInTheDocument()
  })

  it('resolves the customer from the identityId map', async () => {
    render(<AdminUnassignedUploads />)
    await screen.findByText('Amazon_April_12th.pdf')
    expect(screen.getByText('Carol Cumberbatch')).toBeInTheDocument()
    expect(screen.getAllByText(/unknown/i).length).toBeGreaterThan(0)
  })

  it('assigns a resolved file to the chosen shipment', async () => {
    render(<AdminUnassignedUploads />)
    await screen.findByText('Amazon_April_12th.pdf')

    const row = screen.getByTestId(`row-${ORPHAN}`)
    // Only the resolved customer's shipments are offered.
    const shipmentPicker = within$(row, 'shipment')
    expect(shipmentPicker.querySelectorAll('option')).toHaveLength(3) // placeholder + 2

    fireEvent.change(shipmentPicker, { target: { value: 'ship-2' } })
    fireEvent.click(within$(row, 'assign'))

    await waitFor(() => expect(h.docCreate).toHaveBeenCalledTimes(1))
    expect(h.docCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        shipmentId: 'ship-2',
        customerId: 'cust-1',
        customerCognitoSub: 'sub-1',
        s3Key: ORPHAN,
        docType: 'ORDER_RECEIPT',
        uploadedBy: 'CUSTOMER',
      })
    )
    await waitFor(() =>
      expect(screen.queryByText('Amazon_April_12th.pdf')).not.toBeInTheDocument()
    )
  })

  it('requires a customer before an unknown file can be assigned', async () => {
    render(<AdminUnassignedUploads />)
    await screen.findByText('Capacitor_No.2.pdf')

    const row = screen.getByTestId(`row-${UNKNOWN}`)
    expect(within$(row, 'assign')).toBeDisabled()

    // Choosing a customer narrows the shipment list to that customer's.
    fireEvent.change(within$(row, 'customer'), { target: { value: 'cust-2' } })
    const shipmentPicker = within$(row, 'shipment')
    expect(shipmentPicker.querySelectorAll('option')).toHaveLength(2) // placeholder + 1

    fireEvent.change(shipmentPicker, { target: { value: 'ship-9' } })
    expect(within$(row, 'assign')).not.toBeDisabled()
  })

  it('dismisses a file and removes it from the list', async () => {
    render(<AdminUnassignedUploads />)
    await screen.findByText('Capacitor_No.2.pdf')

    fireEvent.click(within$(screen.getByTestId(`row-${UNKNOWN}`), 'dismiss'))

    await waitFor(() => expect(h.dismissedCreate).toHaveBeenCalledTimes(1))
    expect(h.dismissedCreate).toHaveBeenCalledWith(
      expect.objectContaining({ s3Key: UNKNOWN, dismissedBy: 'frank.admin@ctcm.test' })
    )
    await waitFor(() =>
      expect(screen.queryByText('Capacitor_No.2.pdf')).not.toBeInTheDocument()
    )
  })

  it('does not drop the row when the assign write fails', async () => {
    h.docCreate.mockResolvedValue({ data: null, errors: [{ message: 'Unauthorized' }] })
    render(<AdminUnassignedUploads />)
    await screen.findByText('Amazon_April_12th.pdf')

    const row = screen.getByTestId(`row-${ORPHAN}`)
    fireEvent.change(within$(row, 'shipment'), { target: { value: 'ship-1' } })
    fireEvent.click(within$(row, 'assign'))

    await waitFor(() => expect(h.toastFn.error).toHaveBeenCalled())
    expect(screen.getByText('Amazon_April_12th.pdf')).toBeInTheDocument()
    expect(h.toastFn.success).not.toHaveBeenCalled()
  })
})

/** Grab a control inside a row by its data-role attribute. */
function within$(row: HTMLElement, role: string): HTMLElement {
  const el = row.querySelector(`[data-role="${role}"]`)
  if (!el) throw new Error(`no [data-role="${role}"] in row`)
  return el as HTMLElement
}
