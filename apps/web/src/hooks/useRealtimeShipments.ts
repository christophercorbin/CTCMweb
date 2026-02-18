import { useEffect, useState } from 'react';
import { Shipment } from '../types';
import { shipmentApi } from '../api/services';

/**
 * Hook to fetch and manage shipments with real-time updates
 * Connects to AWS API Gateway + Lambda + RDS
 */
export function useRealtimeShipments(customerId?: string | null) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShipments = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch shipments from API Gateway
        // If customerId is provided, filter by it; otherwise get all (admin view)
        const filters = customerId ? { customerId } : undefined;
        const data = await shipmentApi.getAll(filters);
        
        setShipments(data);
      } catch (err) {
        console.error('Error fetching shipments:', err);
        setError(err instanceof Error ? err.message : 'Failed to load shipments');
      } finally {
        setLoading(false);
      }
    };

    fetchShipments();

    // TODO: Phase 4 - Add real-time updates via EventBridge + polling
    // For now, poll every 30 seconds for updates
    const interval = setInterval(fetchShipments, 30000);

    return () => clearInterval(interval);
  }, [customerId]);

  return { shipments, loading, error };
}
