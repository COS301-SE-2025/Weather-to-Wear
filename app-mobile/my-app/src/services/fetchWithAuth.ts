// src/services/fetchWithAuth.ts

export async function fetchWithAuth(input: RequestInfo, init: RequestInit = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    ...(init.headers || {}),
    Authorization: token ? `Bearer ${token}` : "",
  };

  try {
    const response = await fetch(input, { ...init, headers });

    // Token expired or invalid
    if (response.status === 401 || response.status === 403) {
      console.warn("Token invalid or expired, logging out...");
      localStorage.removeItem("token");
      window.location.href = "/login";
      return Promise.reject(new Error("Session expired"));
    }

    return response;
  } catch (err) {
    console.error("Fetch error:", err);
    throw err;
  }
}
