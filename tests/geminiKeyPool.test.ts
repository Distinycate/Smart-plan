import assert from 'node:assert/strict';
import {
  buildGeminiKeyPool,
  geminiAttemptLimit,
  shouldRotateGeminiKey,
} from '../lib/geminiKeyPool';

const pool = buildGeminiKeyPool('route-valid', {
  GEMINI_API_KEYS: 'pool-old,route-valid,pool-second',
  GEMINI_API_KEY: 'generic-key',
});
assert.deepEqual(pool, ['route-valid', 'pool-old', 'pool-second', 'generic-key']);

const placeholdersRemoved = buildGeminiKeyPool(undefined, {
  GEMINI_API_KEYS: 'your-api-key,undefined,real-key',
  GEMINI_API_KEY: 'real-key',
});
assert.deepEqual(placeholdersRemoved, ['real-key']);

assert.equal(geminiAttemptLimit(3, 6), 6);
assert.equal(geminiAttemptLimit(20, 10), 8);
assert.equal(shouldRotateGeminiKey(401, 2), true);
assert.equal(shouldRotateGeminiKey(403, 1), true);
assert.equal(shouldRotateGeminiKey(401, 0), false);
assert.equal(shouldRotateGeminiKey(400, 2), false);

console.log('geminiKeyPool tests passed');

