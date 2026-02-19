interface LoadingSkeletonProps {
  count?: number;
}

export const LoadingSkeleton = ({ count = 5 }: LoadingSkeletonProps) => {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-gray-200 h-12 rounded animate-pulse" />
      ))}
    </div>
  );
};

export const CardSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse" />
      <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
      <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse" />
    </div>
  );
};
