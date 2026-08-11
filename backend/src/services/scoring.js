// Pure, deterministic math - no LLM calls, so this is fully unit-testable
// and doesn't compete for Gemini rate limits or add latency.

export function cosineSimilarity(a, b) {
  if (a.length !== b.length) {
    throw new Error(`Embedding length mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Cosine similarity is -1..1 in theory, but embedding models in practice
// stay in a much narrower positive band, so a raw percentage would look
// artificially low. Clamping to 0..1 before scaling keeps the number
// intuitive without pretending it's more precise than it is.
export function semanticScoreFromEmbeddings(resumeEmbedding, jobEmbedding) {
  const similarity = cosineSimilarity(resumeEmbedding, jobEmbedding);
  return Math.round(Math.max(0, Math.min(1, similarity)) * 1000) / 10;
}

// Keyword matching is precise but brittle (misses paraphrases); semantic
// similarity catches paraphrases but can overstate loosely related text.
// Weighting them evenly is a starting point, not a tuned constant - it's
// the kind of thing you'd A/B against real user feedback before trusting.
export function combineScores(keywordPercentage, semanticPercentage, weights = { keyword: 0.5, semantic: 0.5 }) {
  const combined = keywordPercentage * weights.keyword + semanticPercentage * weights.semantic;
  return Math.round(combined * 10) / 10;
}
