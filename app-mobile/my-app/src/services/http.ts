import axios from "axios";
import { logoutAndResetApp } from "./auth";

let redirecting = false;

axios.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
  } catch {}
  return config;
});

axios.interceptors.response.use(
  (res) => res,
  async (error) => {
    const res = error?.response;
    const status = res?.status;
    const code = res?.data?.code;
    const expiredHeader = res?.headers?.["x-session-expired"] === "true";
    const isExpired = expiredHeader || code === "SESSION_EXPIRED";

    if ((status === 401 || status === 403) && (isExpired || code === "INVALID_TOKEN" || code === "NO_TOKEN")) {
      try {
        localStorage.setItem("sessionExpiredNotice", "1");
      } catch {}
      await logoutAndResetApp();
      if (!redirecting) {
        redirecting = true;
        window.location.assign("/login");
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default axios; 