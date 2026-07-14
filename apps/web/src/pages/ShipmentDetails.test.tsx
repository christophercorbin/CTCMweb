import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => {
  const toastFn = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return {
    toastFn,
    navigate: vi.fn(),
    shipmentGet: vi.fn(),
    eventList: vi.fn(),
    invoiceList: vi.fn(),
    docList: vi.fn(),
    docCreate: vi.fn(),
    onUpdate: vi.fn(),
    uploadData: vi.fn(),
    getUrl: vi.fn(),
    remove: vi.fn(),
  };
});

vi.mock('react-hot-toast', () => ({ default: h.toastFn }));

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => h.navigate,
  useParams: () => ({ id: 'ship-1' }),
}));

vi.mock('aws-amplify/data', () => ({
  generateClient: () => ({
    models: {
      Shipment: { get: h.shipmentGet, onUpdate: h.onUpdate },
      ShipmentEvent: { list: h.eventList },
      Invoice: { list: h.invoiceList },
      ShipmentDocument: { list: h.docList, create: h.docCreate },
    },
  }),
}));

vi.mock('aws-amplify/storage', () => ({
  uploadData: h.uploadData,
  getUrl: h.getUrl,
  remove: h.remove,
}));

import { ShipmentDetails } from './ShipmentDetails';

describe('ShipmentDetails — receipt upload feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.shipmentGet.mockResolvedValue({
      data: {
        id: 'ship-1',
        trackingNumber: 'CL-2026-777',
        type: 'AIR',
        status: 'PENDING',
        description: 'A box of electronics',
        customerId: 'cust-1',
        customerCognitoSub: 'sub-1',
        customerInstruction: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    });
    h.eventList.mockResolvedValue({ data: [] });
    h.invoiceList.mockResolvedValue({ data: [] });
    h.docList.mockResolvedValue({ data: [] });
    h.onUpdate.mockReturnValue({ subscribe: () => ({ unsubscribe: vi.fn() }) });
    h.uploadData.mockReturnValue({
      result: Promise.resolve({ path: 'documents/id/shipments/ship-1/1-test.pdf' }),
    });
    h.docCreate.mockResolvedValue({
      data: {
        id: 'doc-1',
        fileName: 'test.pdf',
        contentType: 'application/pdf',
        createdAt: '2026-01-02T00:00:00.000Z',
        s3Key: 'documents/id/shipments/ship-1/1-test.pdf',
      },
    });
  });

  const uploadFile = (container: HTMLElement) => {
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });
  };

  it('shows a success state on the upload button and a success toast', async () => {
    const { container } = render(<ShipmentDetails />);

    // Wait for the shipment to load and the upload control to render.
    await waitFor(() =>
      expect(container.querySelector('input[type="file"]')).toBeInTheDocument()
    );

    uploadFile(container);

    await waitFor(() =>
      expect(h.toastFn.success).toHaveBeenCalledWith('Receipt uploaded successfully')
    );
    expect(screen.getByText(/uploaded successfully/i)).toBeInTheDocument();
    expect(h.docCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        shipmentId: 'ship-1',
        customerId: 'cust-1',
        docType: 'ORDER_RECEIPT',
        uploadedBy: 'CUSTOMER',
        fileName: 'test.pdf',
      })
    );
  });

  it('shows an error toast and no success state when the upload fails', async () => {
    // Build the rejected promise lazily (only when uploadData is called and
    // immediately awaited) so it never sits rejected-but-unhandled.
    h.uploadData.mockImplementation(() => ({
      result: Promise.reject(new Error('network')),
    }));
    const { container } = render(<ShipmentDetails />);
    await waitFor(() =>
      expect(container.querySelector('input[type="file"]')).toBeInTheDocument()
    );

    uploadFile(container);

    await waitFor(() =>
      expect(h.toastFn.error).toHaveBeenCalledWith('Failed to upload receipt')
    );
    expect(screen.queryByText(/uploaded successfully/i)).not.toBeInTheDocument();
  });
});
