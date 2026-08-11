import crypto from 'crypto';
import { extractJobFromPage } from '../services/aiServiceClient.js';

const FETCH_TIMEOUT_MS = 12000;
const MAX_HTML_BYTES = 2 * 1024 * 1024;

function isBlockedHost(hostname) {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local')) return true;
  if (h === '127.0.0.1' || h === '0.0.0.0' || h === '::1') return true;
  if (/^10\./.test(h) || /^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  return false;
}

function htmlToText(html) {
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1];
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const combined = [ogTitle, body].filter(Boolean).join('\n\n');
  return combined.slice(0, 15000);
}

async function fetchPageText(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    throw Object.assign(new Error('Invalid URL'), { status: 400 });
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw Object.assign(new Error('Only http and https URLs are supported'), { status: 400 });
  }
  if (isBlockedHost(parsed.hostname)) {
    throw Object.assign(new Error('That URL cannot be fetched'), { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(parsed.href, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobHuntAssistant/1.0)',
        Accept: 'text/html,application/xhtml+xml'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      throw Object.assign(new Error(`Could not fetch page (${response.status})`), { status: 502 });
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_HTML_BYTES) {
      throw Object.assign(new Error('Page is too large to import'), { status: 400 });
    }

    const html = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    const pageText = htmlToText(html);
    if (pageText.length < 80) {
      throw Object.assign(new Error('Could not extract enough text from that page. Try pasting the job description manually on the Analysis page.'), { status: 422 });
    }

    return { pageText, finalUrl: response.url || parsed.href };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw Object.assign(new Error('Request timed out fetching that URL'), { status: 504 });
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function sourceIdFromUrl(url) {
  return `url:${crypto.createHash('sha256').update(url).digest('hex').slice(0, 24)}`;
}

export async function importJobFromUrl(url) {
  const { pageText, finalUrl } = await fetchPageText(url);
  const extracted = await extractJobFromPage({ pageText, sourceUrl: finalUrl });

  if (!extracted.title?.trim() || !extracted.description?.trim()) {
    throw Object.assign(new Error('Could not identify a job posting at that URL'), { status: 422 });
  }

  return {
    sourceId: sourceIdFromUrl(finalUrl),
    source: 'url',
    title: extracted.title.trim(),
    company: extracted.company?.trim() || 'Unknown',
    location: extracted.location?.trim() || '',
    url: finalUrl,
    description: extracted.description.trim()
  };
}
