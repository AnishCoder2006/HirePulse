// Deterministic resume/JD checks — no LLM call needed, so these cost
// nothing and return instantly regardless of how the AI service is doing.

export function scoreAts(resumeText, keywords = []) {
  if (!keywords.length) {
    return { atsPercentage: 0, keywordsFound: [], keywordsMissing: [], exactPhraseMatches: [], suggestions: ['No keywords supplied for analysis'] };
  }

  const resumeLower = resumeText.toLowerCase();
  const keywordsFound = [];
  const keywordsMissing = [];
  const exactPhraseMatches = [];
  let score = 0;

  for (const keyword of keywords) {
    const lower = keyword.toLowerCase();
    if (resumeLower.includes(lower)) {
      score += 2;
      keywordsFound.push(keyword);
      // Multi-word keyword found verbatim, not just as scattered words -
      // exact phrase matches correlate far more strongly with ATS callbacks
      // than individual keyword hits, so this is tracked separately.
      if (lower.includes(' ')) exactPhraseMatches.push(keyword);
      continue;
    }

    const parts = lower.split(' ');
    if (parts.length > 1 && parts.every((part) => resumeLower.includes(part))) {
      score += 1;
      keywordsFound.push(`${keyword} (partial match)`);
    } else {
      keywordsMissing.push(keyword);
    }
  }

  const atsPercentage = Math.round((score / (keywords.length * 2)) * 1000) / 10;
  const suggestions = [];
  if (atsPercentage < 60) {
    suggestions.push(`Add the ${keywordsMissing.length} missing keywords to improve ATS match rate`);
  }
  if (resumeText.split(/\s+/).length > 800) {
    suggestions.push('Shorten the resume to 1-2 pages');
  }
  if (keywordsMissing.length && exactPhraseMatches.length === 0 && keywords.some((k) => k.includes(' '))) {
    suggestions.push('None of the multi-word phrases from the job description appear verbatim - exact phrase matches matter more to ATS parsers than scattered keywords');
  }

  return { atsPercentage, keywordsFound, keywordsMissing: keywordsMissing.slice(0, 10), exactPhraseMatches, suggestions };
}

// Does the job title show up in the resume, and where? A title in the
// header/summary (top ~20% of the document) is a much stronger signal to
// an ATS parser than one buried mid-document, or absent entirely.
export function checkJobTitleMatch(resumeText, jobTitle) {
  if (!jobTitle?.trim()) return { score: 0, location: 'not_found' };

  const titleLower = jobTitle.toLowerCase().trim();
  const resumeLower = resumeText.toLowerCase();
  const lines = resumeLower.split('\n');
  const headerSection = lines.slice(0, Math.max(5, Math.ceil(lines.length / 5))).join('\n');

  if (headerSection.includes(titleLower)) return { score: 100, location: 'header' };
  if (resumeLower.includes(titleLower)) return { score: 50, location: 'body' };

  const titleWords = titleLower.split(/\s+/).filter((w) => w.length > 2);
  if (titleWords.length && titleWords.every((w) => resumeLower.includes(w))) {
    return { score: 40, location: 'scattered_words' };
  }

  return { score: 0, location: 'not_found' };
}

// Flags a resume that repeats one term suspiciously often relative to
// document length - a common sign of keyword stuffing aimed at gaming ATS
// parsers, and something a human reviewer (or a recruiter's own ATS
// vendor) will also flag.
export function detectKeywordStuffing(resumeText, { repeatThreshold = 8, densityThreshold = 0.02 } = {}) {
  const words = resumeText.toLowerCase().match(/[a-z0-9+.#-]{3,}/g) || [];
  if (words.length < 50) return { isStuffed: false, flaggedTerms: [] };

  const counts = {};
  for (const word of words) counts[word] = (counts[word] || 0) + 1;

  const flaggedTerms = Object.entries(counts)
    .filter(([, count]) => count >= repeatThreshold && count / words.length > densityThreshold)
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { isStuffed: flaggedTerms.length > 0, flaggedTerms };
}
