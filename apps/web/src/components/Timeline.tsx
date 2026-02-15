import { TrackingItem } from '../types';
import { MapPin, Clock } from 'lucide-react';

interface TimelineProps {
  items: TrackingItem[];
}

export const Timeline = ({ items }: TimelineProps) => {
  return (
    <div className="space-y-8">
      {items.map((item, index) => (
        <div key={index} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
              <MapPin className="w-5 h-5" />
            </div>
            {index < items.length - 1 && <div className="w-1 h-8 bg-gray-300 mt-2" />}
          </div>
          <div className="flex-1 pb-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">{item.location}</h4>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  {new Date(item.timestamp).toLocaleString()}
                </div>
              </div>
              {item.notes && <p className="text-gray-600 text-sm">{item.notes}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
