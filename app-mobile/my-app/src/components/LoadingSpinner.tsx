import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Loading...</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Please wait while we check your authentication status.</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
