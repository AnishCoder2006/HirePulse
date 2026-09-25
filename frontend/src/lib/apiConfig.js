let rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();

if (
  !rawApiUrl ||
  (!rawApiUrl.startsWith('http://') && !rawApiUrl.startsWith('https://')) ||
  rawApiUrl.includes('vercel.app')
) {
  rawApiUrl = '';
}

export const BACKEND_URL = rawApiUrl
  ? rawApiUrl.replace(/\/+$/, '').replace(/\/api$/, '')
  : import.meta.env.DEV
    ? 'http://localhost:4000'
    : 'https://hirepulse-1.onrender.com';

export const API_BASE = `${BACKEND_URL}/api`;

export async function safeFetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    let payload = {};
    if (contentType.includes('application/json')) {
      payload = await response.json().catch(() => ({}));
    }
    const message = payload.error || payload.message || (
      contentType.includes('text/html')
        ? (response.status === 404 ? 'Requested resource not found (404)' : 'Backend server is currently waking up or unavailable. Please try again in a few seconds.')
        : `Request failed with status ${response.status}`
    );
    throw new Error(message);
  }

  if (contentType.includes('text/html')) {
    throw new Error('Backend server returned an HTML response. Please try again in a few seconds.');
  }

  return response.json();
}
