import React from "react";

const UnderConstruction = () => {
  return (
    <div className="min-h-screen bg-black flex flex-col">

      {/* Content */}
      <main className="flex-grow flex flex-col justify-center items-center px-4 text-center">
        <h2 className="text-[#3F978F] text-4xl font-livvic font-semibold mb-4">
          Under Construction
        </h2>
        <p className="text-white text-lg font-livvic max-w-md">
          Sorry for the inconvenience. We're working hard to bring you a great experience. Please check back soon!
        </p>
      </main>
    </div>
  );
};

export default UnderConstruction;
