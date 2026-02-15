import { Check } from 'lucide-react';
import { ShipmentStatus, ShippingMethod } from '../types';

interface ShipmentProgressProps {
  status: ShipmentStatus;
  shippingMethod: ShippingMethod;
}

interface ProgressStep {
  key: ShipmentStatus;
  label: string;
}

const airSteps: ProgressStep[] = [
  { key: 'miami_warehouse', label: 'Miami Warehouse' },
  { key: 'in_the_air', label: 'In the Air' },
  { key: 'in_barbados', label: 'In Barbados' },
  { key: 'customs_hold', label: 'Customs Hold' },
  { key: 'ready_for_pickup', label: 'Ready for Pickup' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
];

const seaSteps: ProgressStep[] = [
  { key: 'at_warehouse', label: 'At Warehouse' },
  { key: 'on_the_water', label: 'On the Water' },
  { key: 'in_barbados_sea', label: 'In Barbados' },
  { key: 'barbados_customs', label: 'Barbados Customs' },
  { key: 'ready_for_pickup', label: 'Ready for Pickup' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
];

export const ShipmentProgress = ({ status, shippingMethod }: ShipmentProgressProps) => {
  const steps = shippingMethod === 'air' ? airSteps : seaSteps;

  const currentStepIndex = steps.findIndex(step => step.key === status);
  const isDelayed = status === 'delayed';

  return (
    <div className="w-full">
      {isDelayed ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium text-center">
            Shipment Delayed - Check tracking history for details
          </p>
        </div>
      ) : (
        <>
          <div className="relative">
            <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-200">
              <div
                className="h-full bg-blue-600 transition-all duration-500"
                style={{
                  width: `${(currentStepIndex / (steps.length - 1)) * 100}%`,
                }}
              />
            </div>

            <div className="relative flex justify-between">
              {steps.map((step, index) => {
                const isComplete = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const isUpcoming = index > currentStepIndex;

                return (
                  <div key={step.key} className="flex flex-col items-center" style={{ flex: 1 }}>
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        isComplete
                          ? 'bg-blue-600 border-blue-600'
                          : isCurrent
                          ? 'bg-blue-600 border-blue-600 ring-4 ring-blue-100'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      {isComplete ? (
                        <Check className="w-5 h-5 text-white" />
                      ) : (
                        <div
                          className={`w-3 h-3 rounded-full ${
                            isCurrent ? 'bg-white' : 'bg-gray-300'
                          }`}
                        />
                      )}
                    </div>
                    <p
                      className={`mt-2 text-xs text-center font-medium max-w-[80px] ${
                        isComplete || isCurrent ? 'text-blue-600' : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </p>
                    {isCurrent && (
                      <span className="mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                        Current
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 bg-blue-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">
                  {steps[currentStepIndex]?.label}
                </p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Step {currentStepIndex + 1} of {steps.length}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-blue-900">
                  {Math.round(((currentStepIndex + 1) / steps.length) * 100)}%
                </p>
                <p className="text-xs text-blue-700">Complete</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
