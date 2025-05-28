// src/components/ImageContext.tsx

import React, { createContext, useState, useContext, ReactNode } from "react";

interface ImageContextType {
  image: string | null;
  setImage: (image: string | null) => void;
}

const ImageContext = createContext<ImageContextType | undefined>(undefined);

export const useImage = () => {
  const context = useContext(ImageContext);
  if (!context) throw new Error("useImage must be used within ImageProvider");
  return context;
};

export const ImageProvider = ({ children }: { children: ReactNode }) => {
  const [image, setImage] = useState<string | null>(null);
  return (
    <ImageContext.Provider value={{ image, setImage }}>
      {children}
    </ImageContext.Provider>
  );
};
