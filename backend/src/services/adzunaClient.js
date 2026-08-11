import { redis } from '../config/redis.js';

const BASE_URL = 'https://api.adzuna.com/v1/api/jobs';
const CACHE_TTL_SECONDS = 60 * 15;

export async function searchJobs({ keyword, location, page = 1 }) {
  const cacheKey = `adzuna:${keyword}:${location}:${page}`.toLowerCase();
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const url = new URL(`${BASE_URL}/in/search/${page}`);
  url.searchParams.set('app_id', process.env.ADZUNA_APP_ID);
  url.searchParams.set('app_key', process.env.ADZUNA_APP_KEY);
  url.searchParams.set('what', keyword);
  if (location) url.searchParams.set('where', location);
  url.searchParams.set('results_per_page', '20');
  url.searchParams.set('content-type', 'application/json');

  const response = await fetch(url);
  if (!response.ok) {
    throw Object.assign(new Error(`Adzuna request failed: ${response.status}`), { status: 502 });
  }

  const data = await response.json();
  const jobs = (data.results || []).map(normalizeJob);

  await redis.set(cacheKey, JSON.stringify(jobs), 'EX', CACHE_TTL_SECONDS);
  return jobs;
}

function normalizeJob(raw) {
  return {
    sourceId: String(raw.id),
    title: raw.title,
    company: raw.company?.display_name || 'Unknown',
    location: raw.location?.display_name || '',
    url: raw.redirect_url,
    description: raw.description || '',
    salaryMin: raw.salary_min,
    salaryMax: raw.salary_max,
    postedAt: raw.created
  };
}
