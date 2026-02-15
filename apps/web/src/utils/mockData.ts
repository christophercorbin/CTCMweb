import { Shipment, TrackingItem, BillingInvoice, Customer } from '../types';

export const mockShipments: Shipment[] = [
  {
    id: 1,
    tracking_number: 'CTCM-2024-001',
    customer_id: 1,
    customer_name: 'John Smith',
    shipping_method: 'air',
    delivery_method: 'home_delivery',
    delivery_address: '123 Main Street, Bridgetown, Barbados BB11000',
    origin: 'Miami, FL',
    destination: 'Bridgetown, Barbados',
    status: 'in_the_air',
    weight: 25.5,
    description: 'Electronics and computer equipment',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-16T14:20:00Z',
  },
  {
    id: 2,
    tracking_number: 'CTCM-2024-002',
    customer_id: 1,
    customer_name: 'John Smith',
    shipping_method: 'sea',
    delivery_method: 'pickup',
    origin: 'New York, NY',
    destination: 'Kingston, Jamaica',
    status: 'barbados_customs',
    weight: 150.0,
    description: 'Manufacturing parts and machinery',
    created_at: '2024-01-14T08:15:00Z',
    updated_at: '2024-01-17T09:45:00Z',
  },
  {
    id: 3,
    tracking_number: 'CTCM-2024-003',
    customer_id: 2,
    customer_name: 'Maria Garcia',
    shipping_method: 'air',
    delivery_method: 'pickup',
    origin: 'Los Angeles, CA',
    destination: 'Port of Spain, Trinidad',
    status: 'delivered',
    weight: 45.8,
    description: 'Consumer goods and retail products',
    created_at: '2024-01-10T12:00:00Z',
    updated_at: '2024-01-15T16:30:00Z',
  },
  {
    id: 4,
    tracking_number: 'CTCM-2024-004',
    customer_id: 1,
    customer_name: 'John Smith',
    shipping_method: 'sea',
    delivery_method: 'pickup',
    origin: 'Houston, TX',
    destination: 'Nassau, Bahamas',
    status: 'at_warehouse',
    weight: 89.3,
    description: 'Industrial equipment',
    created_at: '2024-01-18T14:20:00Z',
    updated_at: '2024-01-18T14:20:00Z',
  },
  {
    id: 5,
    tracking_number: 'CTCM-2024-005',
    customer_id: 3,
    customer_name: 'Robert Johnson',
    shipping_method: 'sea',
    delivery_method: 'home_delivery',
    delivery_address: '456 Ocean View, Georgetown, Guyana',
    origin: 'Miami, FL',
    destination: 'Georgetown, Guyana',
    status: 'delayed',
    weight: 200.0,
    description: 'Construction materials',
    created_at: '2024-01-12T09:00:00Z',
    updated_at: '2024-01-17T11:15:00Z',
  },
  {
    id: 6,
    tracking_number: 'CTCM-2024-006',
    customer_id: 2,
    customer_name: 'Maria Garcia',
    shipping_method: 'air',
    delivery_method: 'home_delivery',
    delivery_address: '789 Central Avenue, Havana, Cuba',
    origin: 'Chicago, IL',
    destination: 'Havana, Cuba',
    status: 'out_for_delivery',
    weight: 67.5,
    description: 'Medical supplies and equipment',
    created_at: '2024-01-16T11:30:00Z',
    updated_at: '2024-01-18T08:00:00Z',
  },
];

export const mockTrackingHistory: Record<number, TrackingItem[]> = {
  1: [
    {
      status: 'in_the_air',
      location: 'En route to Barbados',
      timestamp: '2024-01-16T14:20:00Z',
      notes: 'Flight departed Miami International Airport - Estimated arrival 3 hours',
    },
    {
      status: 'miami_warehouse',
      location: 'Miami International Airport',
      timestamp: '2024-01-15T16:45:00Z',
      notes: 'Cleared customs, prepared for air freight',
    },
    {
      status: 'miami_warehouse',
      location: 'Miami, FL Warehouse',
      timestamp: '2024-01-15T10:30:00Z',
      notes: 'Shipment received and logged into system',
    },
  ],
  2: [
    {
      status: 'barbados_customs',
      location: 'Bridgetown Port, Barbados',
      timestamp: '2024-01-17T09:45:00Z',
      notes: 'Undergoing customs inspection and documentation review',
    },
    {
      status: 'in_barbados_sea',
      location: 'Bridgetown Port, Barbados',
      timestamp: '2024-01-16T18:00:00Z',
      notes: 'Vessel arrived at port',
    },
    {
      status: 'on_the_water',
      location: 'Atlantic Ocean',
      timestamp: '2024-01-15T12:00:00Z',
      notes: 'In transit via cargo vessel',
    },
    {
      status: 'at_warehouse',
      location: 'New York, NY Port',
      timestamp: '2024-01-14T08:15:00Z',
      notes: 'Shipment received and prepared for export',
    },
  ],
  3: [
    {
      status: 'delivered',
      location: 'Port of Spain Distribution Center',
      timestamp: '2024-01-15T16:30:00Z',
      notes: 'Successfully delivered to recipient',
    },
    {
      status: 'out_for_delivery',
      location: 'Port of Spain',
      timestamp: '2024-01-15T08:00:00Z',
      notes: 'Out for final delivery',
    },
    {
      status: 'ready_for_pickup',
      location: 'Port of Spain Warehouse',
      timestamp: '2024-01-14T16:00:00Z',
      notes: 'Ready for customer pickup',
    },
    {
      status: 'customs_hold',
      location: 'Port of Spain Customs',
      timestamp: '2024-01-13T14:20:00Z',
      notes: 'Cleared customs inspection',
    },
    {
      status: 'in_barbados',
      location: 'Piarco International Airport',
      timestamp: '2024-01-12T22:30:00Z',
      notes: 'Arrived at destination airport',
    },
    {
      status: 'in_the_air',
      location: 'En route',
      timestamp: '2024-01-11T10:00:00Z',
      notes: 'Departed Los Angeles International',
    },
    {
      status: 'miami_warehouse',
      location: 'Los Angeles, CA',
      timestamp: '2024-01-10T12:00:00Z',
      notes: 'Shipment registered and prepared',
    },
  ],
  4: [
    {
      status: 'at_warehouse',
      location: 'Houston, TX Warehouse',
      timestamp: '2024-01-18T14:20:00Z',
      notes: 'Awaiting vessel assignment',
    },
  ],
  5: [
    {
      status: 'delayed',
      location: 'Port of Georgetown',
      timestamp: '2024-01-17T11:15:00Z',
      notes: 'Delayed due to port congestion. Expected clearance in 2-3 days.',
    },
    {
      status: 'on_the_water',
      location: 'Atlantic Ocean',
      timestamp: '2024-01-14T16:30:00Z',
      notes: 'In transit via cargo vessel',
    },
    {
      status: 'at_warehouse',
      location: 'Miami, FL',
      timestamp: '2024-01-12T09:00:00Z',
      notes: 'Shipment received',
    },
  ],
  6: [
    {
      status: 'out_for_delivery',
      location: 'Havana Distribution Center',
      timestamp: '2024-01-18T08:00:00Z',
      notes: 'Out for delivery to final destination',
    },
    {
      status: 'ready_for_pickup',
      location: 'Havana Warehouse',
      timestamp: '2024-01-17T16:00:00Z',
      notes: 'Package ready for delivery',
    },
    {
      status: 'customs_hold',
      location: 'Havana Customs Office',
      timestamp: '2024-01-17T13:00:00Z',
      notes: 'Cleared customs inspection',
    },
    {
      status: 'in_barbados',
      location: 'Jose Marti International Airport',
      timestamp: '2024-01-17T06:00:00Z',
      notes: 'Arrived at Havana airport',
    },
    {
      status: 'in_the_air',
      location: 'En route to Cuba',
      timestamp: '2024-01-16T18:00:00Z',
      notes: 'Departed Chicago',
    },
    {
      status: 'miami_warehouse',
      location: 'Chicago, IL',
      timestamp: '2024-01-16T11:30:00Z',
      notes: 'Shipment prepared for export',
    },
  ],
};

export const mockCustomer: Customer = {
  id: 1,
  name: 'John Smith',
  email: 'demo@ctcm.com',
  phone: '+1-246-555-0123',
  air_skybox_address: '10250 NW 47th St, Suite 101, Miami, FL 33178, USA',
  sea_skybox_address: '8400 NW 25th St, Suite 205, Miami, FL 33122, USA',
  created_at: '2024-01-10T08:00:00Z',
};

export const enableDemoMode = () => {
  const demoToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJkZW1vQGN0Y20uY29tIiwicm9sZSI6ImN1c3RvbWVyIn0.demo';
  localStorage.setItem('access_token', demoToken);
  localStorage.setItem('user', JSON.stringify({
    id: '1',
    email: 'demo@ctcm.com',
    role: 'customer'
  }));
};

export const enableAdminDemoMode = () => {
  const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJhZG1pbkBjdGNtLmNvbSIsInJvbGUiOiJhZG1pbiJ9.demo';
  localStorage.setItem('access_token', adminToken);
  localStorage.setItem('user', JSON.stringify({
    id: '1',
    email: 'admin@ctcm.com',
    role: 'admin'
  }));
};

export const mockBillingInvoices: BillingInvoice[] = [
  {
    id: 1,
    shipment_id: 1,
    tracking_number: 'CTCM-2024-001',
    invoice_number: 'INV-2024-001',
    type: 'shipping',
    amount: 450.00,
    status: 'paid',
    due_date: '2024-01-20T00:00:00Z',
    paid_date: '2024-01-18T15:30:00Z',
    description: 'Air freight shipping charges - 25.5 kg',
    created_at: '2024-01-15T10:30:00Z',
  },
  {
    id: 2,
    shipment_id: 2,
    tracking_number: 'CTCM-2024-002',
    invoice_number: 'INV-2024-002',
    type: 'customs',
    amount: 320.50,
    status: 'pending',
    due_date: '2024-01-25T00:00:00Z',
    description: 'Customs clearance and processing fees',
    created_at: '2024-01-17T09:45:00Z',
  },
  {
    id: 3,
    shipment_id: 2,
    tracking_number: 'CTCM-2024-002',
    invoice_number: 'INV-2024-003',
    type: 'shipping',
    amount: 890.00,
    status: 'pending',
    due_date: '2024-01-25T00:00:00Z',
    description: 'Sea freight shipping charges - 150 kg',
    created_at: '2024-01-14T08:15:00Z',
  },
  {
    id: 4,
    shipment_id: 4,
    tracking_number: 'CTCM-2024-004',
    invoice_number: 'INV-2024-004',
    type: 'shipping',
    amount: 625.75,
    status: 'pending',
    due_date: '2024-01-28T00:00:00Z',
    description: 'Sea freight shipping charges - 89.3 kg',
    created_at: '2024-01-18T14:20:00Z',
  },
  {
    id: 5,
    shipment_id: 1,
    tracking_number: 'CTCM-2024-001',
    invoice_number: 'INV-2024-005',
    type: 'delivery',
    amount: 75.00,
    status: 'overdue',
    due_date: '2024-01-15T00:00:00Z',
    description: 'Home delivery service',
    created_at: '2024-01-15T10:30:00Z',
  },
];
