export function absolutize(url: string, base: string): string {
  if (!url) return url;
  // already absolute? leave it alone
  if (/^https?:\/\//i.test(url)) return url;

  // handle relative paths
  const b = base.replace(/\/$/, '');
  return url.startsWith('/') ? `${b}${url}` : `${b}/${url}`;
}