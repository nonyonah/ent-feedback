export const productionApplicationOrigin = 'https://ent.riftlabs.xyz';

export function applicationOrigin(configured: string | undefined, production: boolean): string {
  const fallback = production ? productionApplicationOrigin : 'http://localhost:3000';
  if (!configured) return fallback;
  const url = new URL(configured);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname.toLowerCase()) || url.hostname.endsWith('.localhost');
  return production && loopback ? productionApplicationOrigin : url.origin;
}

/** Repair queued development links without changing their destination path. */
export function applicationEmailUrl(value: string, origin: string, production: boolean): string {
  const url = new URL(value);
  if (production && applicationOrigin(url.origin, true) !== url.origin) {
    return new URL(url.pathname + url.search + url.hash, origin).href;
  }
  return url.href;
}
