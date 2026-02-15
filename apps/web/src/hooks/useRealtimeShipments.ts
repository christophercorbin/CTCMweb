import { useEffect, useState } from 'react';
import { Shipment } from '../types';

// Temporary hook that returns empty data until Phase 3 (database migration)
export function useRealtimeShipments(customerId?: string) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Phase 3 - Connect to AWS RDS via API Gateway
    console.log('useRealtimeShipments: Database not yet migrated. Returning empty data.');
    setLoading(false);
  }, [customerId]);

  return { shipments, loading, error };
}
