const rawApiUrl = import.meta.env.VITE_API_URL;

export const BACKEND_URL = rawApiUrl
  ? rawApiUrl.replace(/\/+$/, '').replace(/\/api$/, '')
  : import.meta.env.DEV
    ? 'http://localhost:4000'
    : 'https://hirepulse-1.onrender.com';

export const API_BASE = `${BACKEND_URL}/api`;

export async function safeFetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('text/html')) {
    throw new Error('Backend server returned an HTML response instead of JSON. The server may be waking up or temporarily unavailable. Please try again in a few seconds.');
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || payload.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}
