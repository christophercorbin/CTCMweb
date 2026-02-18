import { useEffect, useState } from 'react';
import { Shipment } from '../types';
import { mockShipments } from '../utils/mockData';

// Temporary hook that returns mock data until Phase 3 (database migration)
export function useRealtimeShipments(customerId?: string) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Phase 3 - Connect to AWS RDS via API Gateway
    console.log('useRealtimeShipments: Using mock data (Phase 2 - database not yet connected)');
    
    // Simulate API delay
    setTimeout(() => {
      // Filter shipments by customer ID if provided
      const filteredShipments = customerId 
        ? mockShipments.filter(s => s.customer_id === parseInt(customerId.replace('demo-customer-', '')))
        : mockShipments;
      
      setShipments(filteredShipments);
      setLoading(false);
    }, 500);
  }, [customerId]);

  return { shipments, loading, error };
}
