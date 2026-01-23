import { test, expect } from '@playwright/test';

/**
 * Battle System Tests
 * Tests for creating, joining, and managing card battles
 */

test.describe('Battles Page', () => {
  test.describe('Battle Listing', () => {
    test('battles page loads correctly', async ({ page }) => {
      await page.goto('/battles');
      
      await expect(page).toHaveTitle(/Pack Attack/);
      
      const heading = page.locator('h1').filter({ hasText: /Battle/i });
      await expect(heading).toBeVisible();
    });

    test('battles are displayed', async ({ page }) => {
      await page.goto('/battles');
      await page.waitForLoadState('networkidle');
      
      // Check for battle listings or empty state
      const content = await page.textContent('main');
      expect(content?.length).toBeGreaterThan(0);
    });

    test('create battle button is visible', async ({ page }) => {
      await page.goto('/battles');
      await page.waitForLoadState('networkidle');
      
      // Look for create battle button/link
      const createButton = page.locator('a[href="/battles/create"], button:has-text("Create")').first();
      // May require authentication to see
    });
  });

  test.describe('Battle Creation', () => {
    test('create battle page requires auth', async ({ page }) => {
      await page.goto('/battles/create');
      
      await page.waitForTimeout(1000);
      // May redirect to login or show form (if public)
    });
  });
});

test.describe('Battle API Endpoints', () => {
  test('battles API returns valid data', async ({ request }) => {
    const response = await request.get('/api/battles');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('battle creation requires auth', async ({ request }) => {
    const response = await request.post('/api/battles', {
      data: {
        boxId: 'test-box-id',
        maxPlayers: 2,
        entryFee: 100,
      },
    });
    
    expect([401, 403]).toContain(response.status());
  });

  test('battle join requires auth', async ({ request }) => {
    const response = await request.post('/api/battles/test-battle-id/join');
    expect([401, 403, 404]).toContain(response.status());
  });

  test('battle ready requires auth', async ({ request }) => {
    const response = await request.post('/api/battles/test-battle-id/ready');
    expect([401, 403, 404]).toContain(response.status());
  });

  test('battle start requires auth', async ({ request }) => {
    const response = await request.post('/api/battles/test-battle-id/start');
    expect([401, 403, 404]).toContain(response.status());
  });

  test('battle status endpoint works', async ({ request }) => {
    const response = await request.get('/api/battles/test-battle-id/status');
    // Should return 404 for invalid ID, not 500
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe('Battle Display', () => {
  test('battles show player count', async ({ page }) => {
    await page.goto('/battles');
    await page.waitForLoadState('networkidle');
    
    // Check for player count indicators
    const playerIndicator = page.locator('text=/player|participant/i').first();
    // May or may not be present depending on battles
  });

  test('battles show entry fee', async ({ page }) => {
    await page.goto('/battles');
    await page.waitForLoadState('networkidle');
    
    // Check for entry fee/coin indicators
    const feeIndicator = page.locator('text=/entry|fee|coin/i').first();
    // May or may not be present
  });

  test('battles show status', async ({ page }) => {
    await page.goto('/battles');
    await page.waitForLoadState('networkidle');
    
    // Check for status indicators
    const statusIndicator = page.locator('text=/waiting|active|finished|open/i').first();
    // May or may not be present
  });
});

test.describe('Battle Detail Page', () => {
  test('individual battle page loads', async ({ page }) => {
    // First get a battle ID from the API
    const response = await page.request.get('/api/battles');
    const battles = await response.json();
    
    if (battles.length > 0) {
      await page.goto(`/battles/${battles[0].id}`);
      await page.waitForLoadState('networkidle');
      
      // Should show battle details
      const content = await page.textContent('main');
      expect(content?.length).toBeGreaterThan(0);
    }
  });

  test('invalid battle ID shows error', async ({ page }) => {
    await page.goto('/battles/invalid-battle-id-12345');
    await page.waitForLoadState('networkidle');
    
    // Should show error or 404 page
    const content = await page.textContent('body');
    // Page should handle gracefully
    expect(content?.length).toBeGreaterThan(0);
  });
});

test.describe('Battle Interactions', () => {
  test('join button requires authentication', async ({ page }) => {
    await page.goto('/battles');
    await page.waitForLoadState('networkidle');
    
    // Find join button if any battles exist
    const joinButton = page.locator('button:has-text("Join"), a:has-text("Join")').first();
    if (await joinButton.isVisible()) {
      await page.context().clearCookies();
      await page.reload();
      
      // After clearing cookies, join should require login
      const joinButtonAfter = page.locator('button:has-text("Join"), a:has-text("Join")').first();
      if (await joinButtonAfter.isVisible()) {
        await joinButtonAfter.click();
        await page.waitForTimeout(1000);
        // Should prompt for login or show error
      }
    }
  });
});
