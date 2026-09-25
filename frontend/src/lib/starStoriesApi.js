import { getAuthHeaders } from './auth';

import { API_BASE, safeFetchJson } from './apiConfig';

async function apiRequest(path, options = {}) {
  return safeFetchJson(`${API_BASE}${path}`, {
    cache: 'no-store',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers
    }
  });
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
