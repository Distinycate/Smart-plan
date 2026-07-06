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

