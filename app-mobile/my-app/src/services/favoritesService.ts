// src/services/favoritesService.ts
export interface FavoriteItem {
  id: string;
  tab: "items" | "outfits";
  [key: string]: any; // other item properties
}

export const getFavoritesKey = (token: string) => `closet-favs-${token}`;

export const loadFavorites = (token: string | null): FavoriteItem[] => {
  if (!token) return [];
  try {
    const favs = localStorage.getItem(getFavoritesKey(token));
    return favs ? JSON.parse(favs) : [];
  } catch (error) {
    console.error("Error loading favorites:", error);
    return [];
  }
};

export const saveFavorites = (token: string | null, favorites: FavoriteItem[]) => {
  if (token) {
    try {
      localStorage.setItem(getFavoritesKey(token), JSON.stringify(favorites));
    } catch (error) {
      console.error("Error saving favorites:", error);
    }
  }
};

export const clearUserFavorites = (token: string | null) => {
  if (token) {
    localStorage.removeItem(getFavoritesKey(token));
  }
};

export const migrateOldFavorites = () => {
  const token = localStorage.getItem('token');
  if (!token) return;

  const oldFavs = localStorage.getItem('closet-favs');
  if (oldFavs) {
    try {
      const parsedFavs = JSON.parse(oldFavs);
      saveFavorites(token, parsedFavs);
      localStorage.removeItem('closet-favs');
    } catch (e) {
      console.error('Failed to migrate old favorites', e);
    }
  }
};