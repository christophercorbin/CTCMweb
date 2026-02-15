import { useEffect, useState } from 'react';
import { Shipment } from '../types';

// Temporary hook that returns empty data until Phase 3 (database migration)
export function useRealtimeShipments(_customerId?: string) {
  const [shipments] = useState<Shipment[]>([]);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Phase 3 - Connect to AWS RDS via API Gateway
    console.log('useRealtimeShipments: Database not yet migrated. Returning empty data.');
  }, [_customerId]);

  return { shipments, loading, error };
}
