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
