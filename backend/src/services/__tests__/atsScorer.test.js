import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreAts, checkJobTitleMatch, detectKeywordStuffing } from '../atsScorer.js';

test('scoreAts: no keywords returns 0 with a helpful suggestion', () => {
  const result = scoreAts('some resume text', []);
  assert.equal(result.atsPercentage, 0);
  assert.equal(result.keywordsFound.length, 0);
  assert.match(result.suggestions[0], /No keywords/);
});

test('scoreAts: exact matches score full points', () => {
  const result = scoreAts('Experienced with Python and Kubernetes', ['Python', 'Kubernetes']);
  assert.equal(result.atsPercentage, 100);
  assert.deepEqual(result.keywordsFound, ['Python', 'Kubernetes']);
});

test('scoreAts: multi-word partial match scores half points', () => {
  const result = scoreAts('Uses distributed systems daily, but not the exact phrase', ['systems distributed']);
  assert.equal(result.atsPercentage, 50);
  assert.match(result.keywordsFound[0], /partial match/);
});

test('scoreAts: missing keywords are reported and truncated to 10', () => {
  const keywords = Array.from({ length: 15 }, (_, i) => `skill${i}`);
  const result = scoreAts('irrelevant resume text', keywords);
  assert.equal(result.keywordsMissing.length, 10);
});

test('checkJobTitleMatch: title in header scores 100', () => {
  const resume = 'Jane Doe\nSenior Backend Engineer\nBangalore, India\n\nExperience...';
  const result = checkJobTitleMatch(resume, 'Senior Backend Engineer');
  assert.equal(result.score, 100);
  assert.equal(result.location, 'header');
});

test('checkJobTitleMatch: title only in body scores 50', () => {
  const filler = Array(20).fill('Unrelated header line').join('\n');
  const resume = `${filler}\n...worked as a Senior Backend Engineer for three years...`;
  const result = checkJobTitleMatch(resume, 'Senior Backend Engineer');
  assert.equal(result.score, 50);
  assert.equal(result.location, 'body');
});

test('checkJobTitleMatch: missing title scores 0', () => {
  const result = checkJobTitleMatch('Completely unrelated resume text', 'Senior Backend Engineer');
  assert.equal(result.score, 0);
  assert.equal(result.location, 'not_found');
});

test('checkJobTitleMatch: empty title returns 0 without throwing', () => {
  const result = checkJobTitleMatch('some resume', '');
  assert.equal(result.score, 0);
});

test('detectKeywordStuffing: normal resume is not flagged', () => {
  const resume = 'Built scalable APIs using Python and Django. Led a team of four engineers. '.repeat(3);
  const result = detectKeywordStuffing(resume);
  assert.equal(result.isStuffed, false);
});

test('detectKeywordStuffing: repeated term over threshold is flagged', () => {
  const resume = `${'python '.repeat(20)} ${'built scalable systems for enterprise clients '.repeat(10)}`;
  const result = detectKeywordStuffing(resume);
  assert.equal(result.isStuffed, true);
  assert.equal(result.flaggedTerms[0].term, 'python');
});

test('detectKeywordStuffing: short text is not analyzed', () => {
  const result = detectKeywordStuffing('too short');
  assert.equal(result.isStuffed, false);
  assert.deepEqual(result.flaggedTerms, []);
});

test('scoreAts: exact multi-word phrase is tracked separately', () => {
  const result = scoreAts('Experienced with distributed systems design', ['distributed systems design']);
  assert.deepEqual(result.exactPhraseMatches, ['distributed systems design']);
});
