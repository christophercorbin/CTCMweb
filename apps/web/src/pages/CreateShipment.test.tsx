import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ── Mocks (hoisted so the module-scope generateClient() picks them up) ──────
const h = vi.hoisted(() => {
  const toastFn = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return {
    toastFn,
    navigate: vi.fn(),
    shipmentCreate: vi.fn(),
    shipmentDocCreate: vi.fn(),
    customerList: vi.fn(),
    uploadData: vi.fn(),
    fetchUserAttributes: vi.fn(),
  };
});

vi.mock('react-hot-toast', () => ({ default: h.toastFn }));

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => h.navigate,
}));

vi.mock('aws-amplify/data', () => ({
  generateClient: () => ({
    models: {
      Shipment: { create: h.shipmentCreate },
      ShipmentDocument: { create: h.shipmentDocCreate },
      Customer: { list: h.customerList },
    },
  }),
}));

vi.mock('aws-amplify/storage', () => ({ uploadData: h.uploadData }));
vi.mock('aws-amplify/auth', () => ({ fetchUserAttributes: h.fetchUserAttributes }));

import { CreateShipment } from './CreateShipment';

const fillValidForm = () => {
  fireEvent.change(screen.getByPlaceholderText('e.g., CL-2026-001'), {
    target: { value: 'CL-2026-777' },
  });
  fireEvent.change(screen.getByPlaceholderText('Describe the shipment contents...'), {
    target: { value: 'A box of electronics' },
  });
  // Shipping type <select> defaults to the first option (AIR) — valid already.
};

describe('CreateShipment — submit feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Self-registered user path: custom:customerId resolves immediately.
    h.fetchUserAttributes.mockResolvedValue({
      sub: 'sub-1',
      'custom:customerId': 'cust-1',
    });
    h.shipmentCreate.mockResolvedValue({ data: { id: 'ship-1' }, errors: null });
  });

  it('shows a success state on the button and a success toast after submitting', async () => {
    render(<CreateShipment />);

    // Wait until the customer record loads and the button is ready.
    const submitBtn = await screen.findByRole('button', { name: /submit pre-alert/i });
    expect(submitBtn).toBeEnabled();

    fillValidForm();
    fireEvent.click(submitBtn);

    // Button flips to the confirmed state...
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /pre-alert submitted/i })).toBeInTheDocument()
    );
    // ...and a success toast fired.
    expect(h.toastFn.success).toHaveBeenCalledWith('Pre-alert submitted successfully');

    // The confirmed button is disabled to prevent a duplicate shipment.
    expect(screen.getByRole('button', { name: /pre-alert submitted/i })).toBeDisabled();

    // Shipment was created with the expected payload.
    expect(h.shipmentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        trackingNumber: 'CL-2026-777',
        type: 'AIR',
        status: 'PENDING',
        description: 'A box of electronics',
        customerId: 'cust-1',
        shipmentSource: 'CUSTOMER',
      })
    );

    // Consume the pending redirect timer so it can't fire during a later test.
    await waitFor(() => expect(h.navigate).toHaveBeenCalledWith('/dashboard'), {
      timeout: 2500,
    });
  });

  it('navigates to the dashboard after the confirmation delay', async () => {
    render(<CreateShipment />);
    const submitBtn = await screen.findByRole('button', { name: /submit pre-alert/i });
    fillValidForm();
    fireEvent.click(submitBtn);

    await waitFor(() => expect(h.navigate).toHaveBeenCalledWith('/dashboard'), {
      timeout: 2500,
    });
  });

  it('returns to idle and shows an error toast when creation fails', async () => {
    h.shipmentCreate.mockResolvedValue({ data: null, errors: [{ message: 'boom' }] });
    render(<CreateShipment />);
    const submitBtn = await screen.findByRole('button', { name: /submit pre-alert/i });
    fillValidForm();
    fireEvent.click(submitBtn);

    await waitFor(() =>
      expect(h.toastFn.error).toHaveBeenCalledWith('Failed to submit pre-alert')
    );
    // Button is back to its idle label so the user can retry.
    expect(screen.getByRole('button', { name: /submit pre-alert/i })).toBeInTheDocument();
    expect(h.navigate).not.toHaveBeenCalled();
  });

  it('warns instead of claiming success when an invoice row fails to persist', async () => {
    // A customer attaches an Amazon invoice to the pre-alert. The S3 upload
    // succeeds but the ShipmentDocument write is denied. The Amplify Data client
    // RESOLVES on GraphQL errors, so Promise.allSettled counts this as fulfilled
    // unless the errors array is inspected — leaving the file orphaned in S3 and
    // invisible to admins while the customer is told it uploaded fine.
    h.uploadData.mockReturnValue({
      result: Promise.resolve({ path: 'documents/id/shipments/ship-1/1-amazon.pdf' }),
    });
    h.shipmentDocCreate.mockResolvedValue({
      data: null,
      errors: [{ message: 'Unauthorized' }],
    });

    const { container } = render(<CreateShipment />);
    const submitBtn = await screen.findByRole('button', { name: /submit pre-alert/i });
    fillValidForm();

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['dummy'], 'amazon.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(submitBtn);

    await waitFor(() => expect(h.shipmentDocCreate).toHaveBeenCalled());
    expect(h.toastFn.success).not.toHaveBeenCalledWith(
      'Pre-alert submitted — invoice(s) uploaded successfully'
    );
    expect(h.toastFn).toHaveBeenCalledWith(
      expect.stringMatching(/some invoices failed to upload/i),
      expect.anything()
    );

    await waitFor(() => expect(h.navigate).toHaveBeenCalledWith('/dashboard'), {
      timeout: 2500,
    });
  });
});
