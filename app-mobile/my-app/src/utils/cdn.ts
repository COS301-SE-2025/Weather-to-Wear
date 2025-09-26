import { API_BASE } from "../config";
import { absolutize } from "./url";

/**
 * Frontend helper to resolve a storage key (e.g., "users/u/closet/a.png")
 * to a public URL. Behaviors:
 * - If already absolute (http/https), return as-is.
 * - If you set REACT_APP_UPLOADS_CDN (absolute URL), prefix with that.
 * - Else fall back to the backend's /uploads base (works in dev).
 */
export function cdnUrlFor(key?: string): string {
  if (!key) return "";
  const s = key.trim();

  // already absolute?
  if (/^https?:\/\//i.test(s)) return s;

  // expose a CDN domain to the client build
  const CDN = process.env.REACT_APP_UPLOADS_CDN?.replace(/\/$/, "");
  if (CDN) return `${CDN}/${s}`;

  // dev/local fallback: serve from backend static /uploads
  return absolutize(s.startsWith("/") ? s : `/uploads/${s}`, API_BASE);
}
