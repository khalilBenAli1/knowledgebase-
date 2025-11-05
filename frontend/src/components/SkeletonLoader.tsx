import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'text' | 'card' | 'avatar' | 'table' | 'chat' | 'document';
  count?: number;
  className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'text',
  count = 1,
  className = '',
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';

  const renderSkeleton = () => {
    switch (variant) {
      case 'text':
        return (
          <div className={`space-y-3 ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className={`h-4 ${baseClasses} w-full`} />
            ))}
          </div>
        );

      case 'card':
        return (
          <div className={`space-y-4 ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 space-y-3">
                <div className={`h-6 ${baseClasses} w-3/4`} />
                <div className={`h-4 ${baseClasses} w-full`} />
                <div className={`h-4 ${baseClasses} w-5/6`} />
                <div className="flex gap-2 mt-4">
                  <div className={`h-8 ${baseClasses} w-20`} />
                  <div className={`h-8 ${baseClasses} w-20`} />
                </div>
              </div>
            ))}
          </div>
        );

      case 'avatar':
        return (
          <div className={`flex items-center gap-3 ${className}`}>
            <div className={`w-12 h-12 rounded-full ${baseClasses}`} />
            <div className="flex-1 space-y-2">
              <div className={`h-4 ${baseClasses} w-32`} />
              <div className={`h-3 ${baseClasses} w-24`} />
            </div>
          </div>
        );

      case 'table':
        return (
          <div className={`space-y-3 ${className}`}>
            {/* Table header */}
            <div className="flex gap-4">
              <div className={`h-10 ${baseClasses} flex-1`} />
              <div className={`h-10 ${baseClasses} flex-1`} />
              <div className={`h-10 ${baseClasses} flex-1`} />
            </div>
            {/* Table rows */}
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className={`h-16 ${baseClasses} flex-1`} />
                <div className={`h-16 ${baseClasses} flex-1`} />
                <div className={`h-16 ${baseClasses} flex-1`} />
              </div>
            ))}
          </div>
        );

      case 'chat':
        return (
          <div className={`space-y-4 ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
              <div
                key={i}
                className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[70%] p-4 rounded-lg space-y-2 ${
                    i % 2 === 0 ? 'bg-gray-100' : 'bg-primary-50'
                  }`}
                >
                  <div className={`h-4 ${baseClasses} w-48`} />
                  <div className={`h-4 ${baseClasses} w-36`} />
                </div>
              </div>
            ))}
          </div>
        );

      case 'document':
        return (
          <div className={`space-y-3 ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-lg shadow">
                <div className={`w-16 h-20 ${baseClasses}`} />
                <div className="flex-1 space-y-2">
                  <div className={`h-5 ${baseClasses} w-3/4`} />
                  <div className={`h-3 ${baseClasses} w-1/2`} />
                  <div className={`h-3 ${baseClasses} w-1/4`} />
                </div>
                <div className={`h-8 w-24 ${baseClasses}`} />
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return <>{renderSkeleton()}</>;
};

export default SkeletonLoader;

// Individual skeleton components for specific use cases
export const TextSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <SkeletonLoader variant="text" count={lines} />
);

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 1 }) => (
  <SkeletonLoader variant="card" count={count} />
);

export const AvatarSkeleton: React.FC = () => (
  <SkeletonLoader variant="avatar" />
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <SkeletonLoader variant="table" count={rows} />
);

export const ChatSkeleton: React.FC<{ messages?: number }> = ({ messages = 3 }) => (
  <SkeletonLoader variant="chat" count={messages} />
);

export const DocumentSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <SkeletonLoader variant="document" count={count} />
);
