import { mockShipments, mockTrackingHistory, mockBillingInvoices, mockCustomer } from './mockData';

export const isDemoMode = (): boolean => {
  const token = localStorage.getItem('access_token');
  return token?.endsWith('.demo') || false;
};

export const getMockShipments = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockShipments);
    }, 500);
  });
};

export const getMockShipment = (id: string) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const shipment = mockShipments.find((s) => s.id === id);
      if (shipment) {
        resolve(shipment);
      } else {
        reject(new Error('Shipment not found'));
      }
    }, 300);
  });
};

export const getMockTracking = (id: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockTrackingHistory[id] || []);
    }, 300);
  });
};

export const getMockInvoices = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockBillingInvoices);
    }, 400);
  });
};

export const getMockCustomer = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockCustomer);
    }, 300);
  });
};
