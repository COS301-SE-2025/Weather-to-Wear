import React from 'react'; 

export default function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-4 left-0 right-0 mx-2 sm:mx-auto sm:max-w-md bg-[#3F978F] text-white text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3 rounded-full shadow-lg z-50 text-center">
      {message}
    </div>
  );
}