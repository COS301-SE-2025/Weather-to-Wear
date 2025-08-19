// src/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      staleTime: 15 * 60 * 1000, // 15 min “fresh” window
      gcTime: 60 * 60 * 1000,    // keep cached for 1 hour
    },
  },
});
