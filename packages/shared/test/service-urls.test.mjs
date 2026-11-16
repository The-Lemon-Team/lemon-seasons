import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  API_PROXY_PREFIX,
  resolveClientApiBaseUrl,
  resolveMediaAssetUrl,
} from '../dist/index.mjs';

function withWindowLocation(hostname, port, fn) {
  const previousWindow = globalThis.window;
  globalThis.window = {
    location: {
      hostname,
      port: String(port),
      protocol: 'http:',
    },
  };
  try {
    return fn();
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
}

test('resolveClientApiBaseUrl returns /_api on Docker container ports and remote LAN hosts', () => {
  for (const port of ['5173', '5174', '5175', '8080', '80', '443']) {
    const base = withWindowLocation('localhost', port, () =>
      resolveClientApiBaseUrl('', true),
    );
    assert.equal(base, API_PROXY_PREFIX);
  }

  const lanBase = withWindowLocation('192.168.1.100', '5173', () =>
    resolveClientApiBaseUrl('http://localhost:3002', true),
  );
  assert.equal(lanBase, '/_api');
});

test('resolveClientApiBaseUrl returns dev backend URL on localhost dev ports', () => {
  const devBase = withWindowLocation('localhost', '5176', () =>
    resolveClientApiBaseUrl(undefined, false, 3002),
  );
  assert.equal(devBase, 'http://localhost:3002');

  const explicitBase = withWindowLocation('localhost', '5176', () =>
    resolveClientApiBaseUrl('http://localhost:3002/', false, 3002),
  );
  assert.equal(explicitBase, 'http://localhost:3002');
});

test('resolveClientApiBaseUrl returns /_api for prod SSR/non-browser builds', () => {
  assert.equal(resolveClientApiBaseUrl('', true), '/_api');
  assert.equal(resolveClientApiBaseUrl('http://localhost:3002', true), '/_api');
});

test('resolveMediaAssetUrl prefixes relative uploads with /_api', () => {
  assert.equal(
    resolveMediaAssetUrl('/uploads/notes/cover.jpg', API_PROXY_PREFIX),
    '/_api/uploads/notes/cover.jpg',
  );
  assert.equal(
    resolveMediaAssetUrl('https://cdn.example.com/img.png', API_PROXY_PREFIX),
    'https://cdn.example.com/img.png',
  );
});
