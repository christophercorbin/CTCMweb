import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'

const h = vi.hoisted(() => {
  const toastFn = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
  return {
    toastFn,
    navigate: vi.fn(),
    shipments: [] as Record<string, unknown>[],
    customerList: vi.fn(),
  }
})

vi.mock('react-hot-toast', () => ({ default: h.toastFn }))

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => h.navigate,
}))

vi.mock('../hooks/useShipments', () => ({
  useShipments: () => ({ shipments: h.shipments, loading: false, error: null }),
}))

vi.mock('aws-amplify/data', () => ({
  generateClient: () => ({
    models: {
      Customer: { list: h.customerList },
      Package: { list: vi.fn() },
      ShipmentEvent: { listShipmentEventByShipmentIdAndEventTimestamp: vi.fn() },
      ShipmentCharge: { list: vi.fn() },
      Invoice: { list: vi.fn() },
      Shipment: { delete: vi.fn(), update: vi.fn() },
    },
  }),
}))

// Heavy children that are irrelevant to the metric-card filtering.
vi.mock('../components/CustomerManagement', () => ({ CustomerManagement: () => null }))
vi.mock('./WarehouseReceiptIntake', () => ({ WarehouseReceiptIntake: () => null }))
vi.mock('./admin/AdminCreateShipmentModal', () => ({ AdminCreateShipmentModal: () => null }))
vi.mock('./admin/ProcessPreAlertModal', () => ({ ProcessPreAlertModal: () => null }))

import { AdminDashboard } from './AdminDashboard'

const ship = (over: Record<string, unknown>) => ({
  id: 'x', trackingNumber: 'T', type: 'AIR', status: 'MIAMI_WAREHOUSE',
  customerId: 'cust-1', shipmentSource: 'ADMIN', customerInstruction: null,
  createdAt: '2026-04-01T00:00:00Z', updatedAt: '2026-04-01T00:00:00Z',
  ...over,
})

describe('AdminDashboard — On Hold metric card', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.customerList.mockResolvedValue({ data: [{ id: 'cust-1', name: 'Carol' }], nextToken: null })
    h.shipments = [
      ship({ id: 's1', trackingNumber: 'HELD-001', customerInstruction: 'HOLD' }),
      ship({ id: 's2', trackingNumber: 'HELD-002', customerInstruction: 'HOLD' }),
      ship({ id: 's3', trackingNumber: 'SHIPPING-1', customerInstruction: 'SHIP' }),
      ship({ id: 's4', trackingNumber: 'PLAIN-1' }),
    ]
  })

  // MetricCard renders <p>title</p><p>value</p><p>subtitle</p> inside one div.
  const card = (title: string) => screen.getByText(title).parentElement!

  it('counts held shipments by customerInstruction', async () => {
    render(<AdminDashboard />)
    await screen.findByText('On Hold')
    // MetricCard is declared inside the component body, so every render remounts
    // the cards — re-query rather than holding a reference across renders.
    await waitFor(() => expect(within(card('On Hold')).getByText('2')).toBeInTheDocument())
  })

  it('filters the table to held shipments when On Hold is clicked', async () => {
    // The reported bug: clicking On Hold did nothing at all. "On hold" lives on
    // customerInstruction, not status, so the status filter cannot express it —
    // wiring it to setStatusFilter('HOLD') would match nothing and blank the table.
    render(<AdminDashboard />)
    await screen.findByText('On Hold')

    fireEvent.click(screen.getByText('On Hold'))

    await waitFor(() => expect(screen.getByText('HELD-001')).toBeInTheDocument())
    expect(screen.getByText('HELD-002')).toBeInTheDocument()
    expect(screen.queryByText('SHIPPING-1')).not.toBeInTheDocument()
    expect(screen.queryByText('PLAIN-1')).not.toBeInTheDocument()
  })

  it('clicking On Hold again clears the filter', async () => {
    render(<AdminDashboard />)
    await screen.findByText('On Hold')

    fireEvent.click(screen.getByText('On Hold'))
    await waitFor(() => expect(screen.queryByText('PLAIN-1')).not.toBeInTheDocument())

    fireEvent.click(screen.getByText('On Hold'))
    await waitFor(() => expect(screen.getByText('PLAIN-1')).toBeInTheDocument())
  })

  it('choosing a status card clears the hold filter so they cannot conflict', async () => {
    render(<AdminDashboard />)
    await screen.findByText('On Hold')

    fireEvent.click(screen.getByText('On Hold'))
    await waitFor(() => expect(screen.queryByText('PLAIN-1')).not.toBeInTheDocument())

    // Click the Delivered *card* — "Delivered" also appears as a status option.
    // It has no matching rows here, so the table should reflect the status
    // filter alone rather than an invisible AND of both filters.
    fireEvent.click(screen.getByText('Successfully delivered'))
    await waitFor(() => expect(screen.queryByText('HELD-001')).not.toBeInTheDocument())
  })

})
