import React from 'react'; 

export default function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-black text-white text-sm px-6 py-3 rounded-full shadow-lg z-50">
      {message}
    </div>
  );
}