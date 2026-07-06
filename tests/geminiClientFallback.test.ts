import assert from 'node:assert/strict';
import { fetchGeminiWithRetry } from '../lib/geminiClient';

const originalFetch = globalThis.fetch;
const originalPool = process.env.GEMINI_API_KEYS;
const originalGeneric = process.env.GEMINI_API_KEY;

async function run() {
  process.env.GEMINI_API_KEYS = 'pool-valid';
  process.env.GEMINI_API_KEY = '';

  const calls: string[] = [];
  globalThis.fetch = async input => {
    const url = String(input);
    calls.push(url);
    if (url.includes('route-invalid')) {
      return new Response('invalid key', { status: 401 });
    }
    return new Response('{"ok":true}', { status: 200 });
  };

  const response = await fetchGeminiWithRetry(
    'https://example.test/generateContent',
    { test: true },
    1,
    'route-invalid'
  );

  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
  assert.match(calls[0], /route-invalid/);
  assert.match(calls[1], /pool-valid/);

  calls.length = 0;
  globalThis.fetch = async input => {
    const url = String(input);
    calls.push(url);
    if (calls.length === 1) {
      return new Response('temporary overload', { status: 503 });
    }
    return new Response('{"ok":true}', { status: 200 });
  };

  const modelFallbackResponse = await fetchGeminiWithRetry(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
    { test: true },
    3,
    'route-valid'
  );

  assert.equal(modelFallbackResponse.status, 200);
  assert.equal(calls.length, 2);
  assert.match(calls[0], /gemini-2\.5-flash-lite/);
  assert.match(calls[1], /gemini-2\.5-flash:generateContent/);
  console.log('geminiClient fallback tests passed');
}

run()
  .finally(() => {
    globalThis.fetch = originalFetch;
    if (originalPool === undefined) delete process.env.GEMINI_API_KEYS;
    else process.env.GEMINI_API_KEYS = originalPool;
    if (originalGeneric === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeneric;
  });
