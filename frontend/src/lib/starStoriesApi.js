import { getAuthHeaders } from './auth';

const rawApiUrl = import.meta.env.VITE_API_URL;
const normalizedApiUrl = rawApiUrl?.replace(/\/+$/, '');
const API_BASE = rawApiUrl
  ? `${normalizedApiUrl.replace(/\/api$/, '')}/api`
  : import.meta.env.DEV
    ? 'http://localhost:4000/api'
    : '/api';

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers
    }
  });
  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    let errorMsg = `HTTP ${response.status}`;
    if (contentType.includes('application/json')) {
      try {
        const payload = await response.json();
        errorMsg = payload.error || payload.message || errorMsg;
      } catch {
        // keep status
      }
    }
    throw new Error(errorMsg);
  }
  if (response.status === 204) return null;
  return response.json();
}

export async function fetchStarStories({ starred, analysisId } = {}) {
  const params = new URLSearchParams();
  if (starred) params.set('starred', 'true');
  if (analysisId) params.set('analysisId', analysisId);
  const qs = params.toString() ? `?${params}` : '';
  const { stories } = await apiRequest(`/star-stories${qs}`);
  return stories || [];
}

export async function generateStarStories(analysisId) {
  const { stories } = await apiRequest('/star-stories/generate', {
    method: 'POST',
    body: JSON.stringify({ analysisId })
  });
  return stories || [];
}

export async function createStarStory(payload) {
  const { story } = await apiRequest('/star-stories', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return story;
}

export async function updateStarStory(id, updates) {
  const { story } = await apiRequest(`/star-stories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
  return story;
}

export async function deleteStarStory(id) {
  await apiRequest(`/star-stories/${id}`, { method: 'DELETE' });
}
