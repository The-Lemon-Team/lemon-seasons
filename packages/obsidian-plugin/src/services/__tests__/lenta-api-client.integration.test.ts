import { describe, it, expect } from 'vitest';
import { LentaApiClient } from '../lenta-api-client';

describe('LentaApiClient - Real Backend Integration Tests', () => {
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:4000/api';
  const containerBaseUrl = process.env.CONTAINER_SERVER_URL || 'http://localhost:3000';
  const authToken = process.env.AUTH_TOKEN || 'lenta_obs_integration_test_token';

  it('should fetch the whole list of containers directly from backend without mocks', async () => {
    const client = new LentaApiClient(
      () => baseUrl,
      () => authToken,
      () => containerBaseUrl,
      () => 'test-api-key',
      () => 'test-container-key'
    );

    // Test real network health reachability first
    let backendReachable = false;
    try {
      const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/feeds`);
      if (res.status < 500) {
        backendReachable = true;
      }
    } catch {
      backendReachable = false;
    }

    if (!backendReachable) {
      console.warn(
        `[Integration Test] Backend server is not running at ${baseUrl}. ` +
        `Skipping live server assertion. Start backend with 'pnpm backend:dev' to execute live tests.`
      );
      return;
    }

    console.log(`[Integration Test] Connecting to live backend at ${baseUrl} & ${containerBaseUrl}`);

    const containers = await client.listContainers();

    // Verify returning whole list
    expect(Array.isArray(containers)).toBe(true);
    expect(containers.length).toBeGreaterThan(0);

    // Ensure every container has mandatory DTO properties
    for (const container of containers) {
      expect(container).toHaveProperty('id');
      expect(typeof container.id).toBe('string');
      expect(container).toHaveProperty('name');
      expect(typeof container.name).toBe('string');
      expect(container).toHaveProperty('type');
      expect(['git', 'simple']).toContain(container.type);
      expect(container).toHaveProperty('isPublic');
      expect(typeof container.isPublic).toBe('boolean');
      expect(container).toHaveProperty('visibility');
      expect(['public', 'private']).toContain(container.visibility);
    }

    // Verify master feed or default private vault present in real container list
    const masterFeed = containers.find((c) => c.id === 'feed-all');
    const userVault = containers.find((c) => c.id === 'cont-private-user-vault');

    expect(masterFeed || userVault).toBeDefined();
    console.log(`[Integration Test] Successfully loaded ${containers.length} containers from real backend.`);
  });
});
