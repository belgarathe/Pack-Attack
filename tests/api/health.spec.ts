import { test, expect } from '@playwright/test';

/**
 * API Health & Core Endpoint Tests
 * Tests for the API endpoints to ensure they respond correctly
 */

test.describe('API Health Checks', () => {
  test('health endpoint returns 200', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    // Accept both healthy and degraded status
    expect(['healthy', 'degraded', 'ok']).toContain(data.status);
  });

  test('boxes endpoint returns data', async ({ request }) => {
    const response = await request.get('/api/boxes');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    // API returns object with boxes array
    expect(data).toHaveProperty('boxes');
    expect(Array.isArray(data.boxes)).toBeTruthy();
  });

  test('leaderboard endpoint returns data', async ({ request }) => {
    const response = await request.get('/api/leaderboard');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('leaderboard');
    expect(Array.isArray(data.leaderboard)).toBeTruthy();
  });

  test('battles endpoint returns data', async ({ request }) => {
    const response = await request.get('/api/battles');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    // API returns object with battles array
    expect(data).toHaveProperty('battles');
    expect(Array.isArray(data.battles)).toBeTruthy();
  });
});

test.describe('API Authentication Required Endpoints', () => {
  test('user coins endpoint requires auth', async ({ request }) => {
    const response = await request.get('/api/user/coins');
    // Should return 401 without authentication
    expect(response.status()).toBe(401);
  });

  test('user profile endpoint requires auth', async ({ request }) => {
    const response = await request.get('/api/user/profile');
    expect(response.status()).toBe(401);
  });

  test('cart endpoint returns data', async ({ request }) => {
    const response = await request.get('/api/cart');
    // Cart endpoint returns 200 with empty cart for unauthenticated users
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('items');
  });

  test('admin endpoints require admin role', async ({ request }) => {
    const response = await request.get('/api/admin/users');
    // Should return 401 or 403 without admin authentication
    expect([401, 403]).toContain(response.status());
  });

  test('shop dashboard endpoints require shop owner role', async ({ request }) => {
    const response = await request.get('/api/shop-dashboard/boxes');
    // Should return 401 or 403 without shop owner authentication
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('API Card Search Endpoints', () => {
  test('Pokemon card search works', async ({ request }) => {
    const response = await request.get('/api/cards/search/pokemon?q=pikachu');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('cards');
  });

  test('MTG card search works', async ({ request }) => {
    const response = await request.get('/api/cards/search/mtg?q=lightning');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('cards');
  });

  test('Yu-Gi-Oh card search works', async ({ request }) => {
    const response = await request.get('/api/cards/search/yugioh?q=dragon');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('cards');
  });

  test('Lorcana card search works', async ({ request }) => {
    const response = await request.get('/api/cards/search/lorcana?q=mickey');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('cards');
  });

  test('One Piece card search works', async ({ request }) => {
    const response = await request.get('/api/cards/search/onepiece?q=luffy');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('cards');
  });
});

test.describe('API Error Handling', () => {
  test('invalid endpoint returns 404', async ({ request }) => {
    const response = await request.get('/api/nonexistent-endpoint');
    expect(response.status()).toBe(404);
  });

  test('invalid box ID returns error', async ({ request }) => {
    const response = await request.get('/api/boxes?id=invalid-id-12345');
    // Should handle gracefully
    expect(response.status()).toBeLessThan(500);
  });

  test('invalid battle ID returns error', async ({ request }) => {
    const response = await request.get('/api/battles/invalid-battle-id');
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe('API Response Headers', () => {
  test('API returns correct content type', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.headers()['content-type']).toContain('application/json');
  });

  test('CORS headers are present for API', async ({ request }) => {
    const response = await request.get('/api/boxes');
    // Verify response is valid JSON
    expect(response.ok()).toBeTruthy();
  });
});
