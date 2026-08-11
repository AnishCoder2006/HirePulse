import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cosineSimilarity, semanticScoreFromEmbeddings, combineScores } from '../scoring.js';

test('cosineSimilarity: identical vectors return 1', () => {
  assert.equal(cosineSimilarity([1, 0, 0], [1, 0, 0]), 1);
});

test('cosineSimilarity: orthogonal vectors return 0', () => {
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
});

test('cosineSimilarity: opposite vectors return -1', () => {
  assert.equal(cosineSimilarity([1, 0], [-1, 0]), -1);
});

test('cosineSimilarity: throws on mismatched lengths', () => {
  assert.throws(() => cosineSimilarity([1, 0], [1, 0, 0]), /length mismatch/);
});

test('cosineSimilarity: zero vector returns 0 instead of NaN', () => {
  assert.equal(cosineSimilarity([0, 0], [1, 1]), 0);
});

test('semanticScoreFromEmbeddings: identical embeddings score 100', () => {
  assert.equal(semanticScoreFromEmbeddings([1, 2, 3], [1, 2, 3]), 100);
});

test('semanticScoreFromEmbeddings: negative similarity clamps to 0', () => {
  assert.equal(semanticScoreFromEmbeddings([1, 0], [-1, 0]), 0);
});

test('combineScores: equal inputs return the same value', () => {
  assert.equal(combineScores(80, 80), 80);
});

test('combineScores: default weights average the two scores', () => {
  assert.equal(combineScores(100, 0), 50);
});

test('combineScores: custom weights are respected', () => {
  assert.equal(combineScores(100, 0, { keyword: 0.9, semantic: 0.1 }), 90);
});
