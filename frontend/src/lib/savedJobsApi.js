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
        // keep status code as message
      }
    }
    throw new Error(errorMsg);
  }
  if (response.status === 204) return null;
  return response.json();
}

// GET /api/saved-jobs — fetch all saved jobs for the logged-in user.
export async function fetchSavedJobs(status) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const { savedJobs } = await apiRequest(`/saved-jobs${qs}`);
  return savedJobs || [];
}

// GET /api/saved-jobs/stats — pipeline counts + conversion rates
export async function fetchSavedJobStats() {
  return apiRequest('/saved-jobs/stats');
}

// POST /api/saved-jobs — persist a job bookmark server-side.
export async function saveJob(job) {
  const { savedJob } = await apiRequest('/saved-jobs', {
    method: 'POST',
    body: JSON.stringify({
      sourceId: job.sourceId,
      source: job.source || 'adzuna',
      title: job.title,
      company: job.company,
      location: job.location,
      url: job.url,
      description: job.description,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      postedAt: job.postedAt,
      status: job.status,
      notes: job.notes
    })
  });
  return savedJob;
}

// PATCH /api/saved-jobs/:id — update tracker fields
export async function updateSavedJob(id, updates) {
  const { savedJob } = await apiRequest(`/saved-jobs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
  return savedJob;
}

// DELETE /api/saved-jobs?sourceId=... — remove a bookmark by its external id.
export async function unsaveJob(sourceId) {
  await apiRequest(`/saved-jobs?sourceId=${encodeURIComponent(sourceId)}`, {
    method: 'DELETE'
  });
}

// DELETE /api/saved-jobs/:id — remove by Mongo id
export async function deleteSavedJob(id) {
  await apiRequest(`/saved-jobs/${id}`, { method: 'DELETE' });
}

// POST /api/jobs/import-url — scrape + extract a job from any URL
export async function importJobFromUrl(url) {
  const { job } = await apiRequest('/jobs/import-url', {
    method: 'POST',
    body: JSON.stringify({ url })
  });
  return job;
}
