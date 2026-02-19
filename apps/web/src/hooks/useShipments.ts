import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../../../amplify/data/resource";

const client = generateClient<Schema>();

/**
 * Hook to list and manage shipments via Amplify Data (AppSync + DynamoDB).
 *
 * - For customers: owner filter is injected automatically by Amplify auth rules;
 *   only the caller's own shipments are returned.
 * - For admins: all shipments are returned (allow.group("admin") bypass).
 *
 * Includes real-time subscription via observeQuery — the component rerenders
 * whenever a shipment is created or updated.
 */
export function useShipments() {
  const [shipments, setShipments] = useState<Schema["Shipment"]["type"][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);

    // observeQuery streams the initial list and live updates via subscription
    const sub = client.models.Shipment.observeQuery().subscribe({
      next: ({ items, isSynced }) => {
        setShipments([...items]);
        if (isSynced) setLoading(false);
      },
      error: (err: unknown) => {
        console.error("Shipment observeQuery error:", err);
        setError(err instanceof Error ? err.message : "Failed to load shipments");
        setLoading(false);
      },
    });

    return () => sub.unsubscribe();
  }, []);

  async function createShipment(
    input: Schema["Shipment"]["createType"]
  ) {
    return client.models.Shipment.create(input);
  }

  async function updateShipmentStatus(
    id: string,
    status: Schema["ShipmentStatus"]["type"]
  ) {
    return client.models.Shipment.update({ id, status });
  }

  return { shipments, loading, error, createShipment, updateShipmentStatus };
}
