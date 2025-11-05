import React from 'react';

interface ProgressBarProps {
  value: number; // 0-100
  showLabel?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'error';
  animated?: boolean;
  striped?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  showLabel = true,
  label,
  size = 'md',
  color = 'primary',
  animated = true,
  striped = false,
}) => {
  // Clamp value between 0 and 100
  const clampedValue = Math.min(Math.max(value, 0), 100);

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const colorClasses = {
    primary: 'bg-primary-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-500',
    error: 'bg-red-600',
  };

  return (
    <div className="w-full">
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            {label || 'Progression'}
          </span>
          <span className="text-sm font-medium text-gray-700">
            {Math.round(clampedValue)}%
          </span>
        </div>
      )}

      <div className={`w-full ${sizeClasses[size]} bg-gray-200 rounded-full overflow-hidden`}>
        <div
          className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full transition-all duration-300 ease-out ${
            animated ? 'animate-pulse' : ''
          } ${
            striped
              ? 'bg-gradient-to-r from-transparent via-white to-transparent bg-[length:200%_100%] animate-shimmer'
              : ''
          }`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;

// Circular progress component
interface CircularProgressProps {
  value: number; // 0-100
  size?: number; // pixels
  strokeWidth?: number;
  color?: 'primary' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  size = 80,
  strokeWidth = 8,
  color = 'primary',
  showLabel = true,
}) => {
  const clampedValue = Math.min(Math.max(value, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (clampedValue / 100) * circumference;

  const colorClasses = {
    primary: '#134a21',
    success: '#16a34a',
    warning: '#eab308',
    error: '#dc2626',
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colorClasses[color]}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-out"
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-semibold text-gray-700">
            {Math.round(clampedValue)}%
          </span>
        </div>
      )}
    </div>
  );
};

// Indeterminate progress bar (for unknown duration)
export const IndeterminateProgress: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'error';
}> = ({ size = 'md', color = 'primary' }) => {
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const colorClasses = {
    primary: 'bg-primary-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-500',
    error: 'bg-red-600',
  };

  return (
    <div className={`w-full ${sizeClasses[size]} bg-gray-200 rounded-full overflow-hidden`}>
      <div
        className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-indeterminate`}
        style={{
          width: '40%',
        }}
      />
    </div>
  );
};
