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
    docDelete: vi.fn(),
    invoiceDelete: vi.fn(),
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
      ShipmentEvent: { listShipmentEventByShipmentIdAndEventTimestamp: h.eventList },
      Invoice: { list: h.invoiceList, delete: h.invoiceDelete },
      ShipmentDocument: {
        listShipmentDocumentByShipmentId: h.docList,
        create: h.docCreate,
        delete: h.docDelete,
      },
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
    h.docDelete.mockResolvedValue({ data: null });
    h.remove.mockResolvedValue({});
    h.invoiceDelete.mockResolvedValue({ data: null });
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

  it('does not report success when the database write fails', async () => {
    // The Amplify Data client resolves (does not throw) on GraphQL errors, so
    // an auth/validation denial here leaves the S3 object orphaned and invisible
    // to admins. The customer must not be told the receipt was uploaded.
    h.docCreate.mockResolvedValue({ data: null, errors: [{ message: 'Unauthorized' }] });

    const { container } = render(<ShipmentDetails />);
    await waitFor(() =>
      expect(container.querySelector('input[type="file"]')).toBeInTheDocument()
    );

    uploadFile(container);

    await waitFor(() =>
      expect(h.toastFn.error).toHaveBeenCalledWith('Failed to upload receipt')
    );
    expect(h.toastFn.success).not.toHaveBeenCalled();
    expect(screen.queryByText(/uploaded successfully/i)).not.toBeInTheDocument();
    // The S3 object is cleaned up, so no file is left that no admin view lists.
    expect(h.remove).toHaveBeenCalledWith({
      path: 'documents/id/shipments/ship-1/1-test.pdf',
    });
  });

  it('loads the shipment without falling into the error path', async () => {
    // Guards the mocks against drifting away from the queries the component
    // actually calls: when they diverge the fetch throws, the catch swallows
    // it, and every other test in this file passes while asserting nothing.
    const { container } = render(<ShipmentDetails />);
    await waitFor(() =>
      expect(container.querySelector('input[type="file"]')).toBeInTheDocument()
    );
    expect(h.toastFn.error).not.toHaveBeenCalledWith('Failed to load shipment details');
    expect(h.eventList).toHaveBeenCalled();
    expect(h.docList).toHaveBeenCalled();
  });

  it('renders documents from every page, not just the first', async () => {
    // The reported bug: a single page was read and the rest silently dropped.
    h.docList
      .mockResolvedValueOnce({
        data: [{ id: 'd1', fileName: 'page-one.pdf', s3Key: 'k1', createdAt: '2026-01-01T00:00:00.000Z' }],
        nextToken: 'cursor-1',
      })
      .mockResolvedValueOnce({
        data: [{ id: 'd2', fileName: 'page-two.pdf', s3Key: 'k2', createdAt: '2026-01-02T00:00:00.000Z' }],
        nextToken: null,
      });

    render(<ShipmentDetails />);

    expect(await screen.findByText('page-one.pdf')).toBeInTheDocument();
    expect(await screen.findByText('page-two.pdf')).toBeInTheDocument();
    expect(h.docList).toHaveBeenCalledTimes(2);
  });
});
