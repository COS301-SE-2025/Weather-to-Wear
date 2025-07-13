import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchAllItems } from "../services/closetApi";

export interface ClosetItem {
  id: string;
  category: string;
  imageUrl: string;
  layerCategory?: string;
}

interface ClothingContextType {
  clothingItems: ClosetItem[];
  setClothingItems: React.Dispatch<React.SetStateAction<ClosetItem[]>>;
  refreshCloset: () => void;
}

const ClothingContext = createContext<ClothingContextType | undefined>(undefined);

export const ClothingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clothingItems, setClothingItems] = useState<ClosetItem[]>([]);

  const refreshCloset = () => {
    fetchAllItems()
      .then(res => setClothingItems(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    refreshCloset();
  }, []);

  return (
    <ClothingContext.Provider value={{ clothingItems, setClothingItems, refreshCloset }}>
      {children}
    </ClothingContext.Provider>
  );
};

export const useClothing = () => {
  const ctx = useContext(ClothingContext);
  if (!ctx) throw new Error("useClothing must be used within a ClothingProvider");
  return ctx;
};
