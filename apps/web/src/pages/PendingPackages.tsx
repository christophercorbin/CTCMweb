import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Send, Clock, Box, Scale, Ruler } from 'lucide-react';
import { Card, Button, Badge, LoadingSkeleton, EmptyState, Modal } from '../components';
import { Shipment, Package as PackageType } from '../types';
import toast from 'react-hot-toast';

export const PendingPackages = () => {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<(Shipment & { packages?: PackageType[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [showConsolidateModal, setShowConsolidateModal] = useState(false);
  const [consolidating, setConsolidating] = useState(false);

  useEffect(() => {
    fetchPendingPackages();

    // TODO: Phase 5 - Real-time updates via AppSync subscriptions
    console.log('PendingPackages: Real-time not yet implemented. Using polling.');
  }, []);

  const fetchPendingPackages = async () => {
    try {
      setLoading(true);

      // TODO: Phase 3 - Connect to AWS RDS via API Gateway
      console.log('PendingPackages: Database not yet migrated. Using demo mode.');
      
      // Mock data for now
      setPackages([]);
    } catch (error) {
      console.error('Error fetching pending packages:', error);
      toast.error('Failed to load pending packages');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (shipmentId: string) => {
    setSelectedPackages((prev) =>
      prev.includes(shipmentId)
        ? prev.filter((id) => id !== shipmentId)
        : [...prev, shipmentId]
    );
  };

  const handleShipNow = async (shipmentId: string) => {
    try {
      // TODO: Phase 3 - Update shipment status via API Gateway
      console.log('PendingPackages: API not yet implemented. Using demo mode.');
      toast.success('Coming in Phase 3: Ship package via AWS API');
        event_type: 'miami_warehouse',
        event_description: 'Customer approved shipment - moved to processing',
        location: 'Miami Warehouse',
      });

      toast.success('Package ready for shipment');
      fetchPendingPackages();
    } catch (error: any) {
      console.error('Error updating shipment:', error);
      toast.error(error.message || 'Failed to process shipment');
    }
  };

  const handleConsolidateSelected = async () => {
    if (selectedPackages.length < 2) {
      toast.error('Please select at least 2 packages to consolidate');
      return;
    }

    setConsolidating(true);

    try {
      // TODO: Phase 3 - Consolidate packages via API Gateway
      console.log('PendingPackages: API not yet implemented. Using demo mode.');
      toast.success('Coming in Phase 3: Consolidate packages via AWS API');
      setSelectedPackages([]);
      setShowConsolidateModal(false);
      fetchPendingPackages();
    } catch (error: any) {
      console.error('Error consolidating packages:', error);
      toast.error(error.message || 'Failed to consolidate packages');
    } finally {
      setConsolidating(false);
    }
  };

  const getTotalWeight = (pkgs?: PackageType[]) => {
    if (!pkgs) return 0;
    return pkgs.reduce((sum, pkg) => sum + (pkg.weight || 0), 0);
  };

  const getTotalVolume = (pkgs?: PackageType[]) => {
    if (!pkgs) return 0;
    return pkgs.reduce((sum, pkg) => sum + (pkg.volume || 0), 0);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pending Packages</h1>
            <p className="text-gray-600 mt-1">
              Packages waiting at warehouse - ship now or consolidate for bulk shipping
            </p>
          </div>
          {selectedPackages.length > 0 && (
            <Button onClick={() => setShowConsolidateModal(true)} size="lg">
              <Box className="w-5 h-5 mr-2" />
              Consolidate {selectedPackages.length} Packages
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : packages.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No pending packages"
          description="All your packages have been processed. New arrivals will appear here."
        />
      ) : (
        <div className="space-y-4">
          {packages.map((shipment) => {
            const isSelected = selectedPackages.includes(shipment.id);
            const totalWeight = getTotalWeight(shipment.packages);
            const totalVolume = getTotalVolume(shipment.packages);

            return (
              <Card
                key={shipment.id}
                className={`transition-all ${
                  isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(shipment.id)}
                      className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">
                            {shipment.tracking_number}
                          </h3>
                          {shipment.warehouse_receipt_number && (
                            <p className="text-sm text-gray-600">
                              WR: {shipment.warehouse_receipt_number}
                            </p>
                          )}
                          <Badge status={shipment.status} />
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Received</p>
                          <p className="font-medium text-gray-900">
                            {shipment.received_date
                              ? new Date(shipment.received_date).toLocaleDateString()
                              : 'N/A'}
                          </p>
                          {shipment.received_by && (
                            <p className="text-xs text-gray-500">by {shipment.received_by}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Scale className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Weight:</span>
                          <span className="font-medium text-gray-900">
                            {totalWeight.toFixed(2)} lb ({(totalWeight * 0.453592).toFixed(2)} kg)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Ruler className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Volume:</span>
                          <span className="font-medium text-gray-900">
                            {totalVolume.toFixed(2)} ft³
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Pieces:</span>
                          <span className="font-medium text-gray-900">
                            {shipment.packages?.reduce((sum, pkg) => sum + pkg.pieces_count, 0) || 0}
                          </span>
                        </div>
                      </div>

                      {shipment.description && (
                        <p className="text-sm text-gray-600 mb-4">{shipment.description}</p>
                      )}

                      {shipment.packages && shipment.packages.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-4">
                          <p className="text-xs font-medium text-gray-700 mb-2">Package Details:</p>
                          <div className="space-y-1">
                            {shipment.packages.map((pkg, idx) => (
                              <div key={pkg.id} className="text-xs text-gray-600">
                                #{idx + 1}: {pkg.pieces_count}x {pkg.package_type} -{' '}
                                {pkg.length && pkg.width && pkg.height
                                  ? `${pkg.length}"×${pkg.width}"×${pkg.height}"`
                                  : 'N/A'}{' '}
                                - {pkg.weight || 0} lb
                                {pkg.description && ` - ${pkg.description}`}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleShipNow(shipment.id)}
                          variant="primary"
                          size="sm"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Ship This Package Now
                        </Button>
                        <Button
                          onClick={() => handleToggleSelect(shipment.id)}
                          variant="secondary"
                          size="sm"
                        >
                          <Clock className="w-4 h-4 mr-2" />
                          {isSelected ? 'Remove from Consolidation' : 'Hold for Consolidation'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showConsolidateModal && (
        <Modal
          isOpen={showConsolidateModal}
          onClose={() => setShowConsolidateModal(false)}
          title="Consolidate Packages"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              You are about to consolidate {selectedPackages.length} packages for bulk shipping.
              This will combine them into a single shipment, potentially reducing shipping costs.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-medium">Benefits of consolidation:</p>
              <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
                <li>Lower per-item shipping costs</li>
                <li>Single tracking number for all packages</li>
                <li>Reduced customs processing time</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleConsolidateSelected}
                disabled={consolidating}
                className="flex-1"
              >
                {consolidating ? 'Processing...' : 'Confirm Consolidation'}
              </Button>
              <Button
                onClick={() => setShowConsolidateModal(false)}
                variant="secondary"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
