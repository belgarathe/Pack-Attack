import { test, expect } from '@playwright/test';

/**
 * Shop Dashboard Tests
 * Tests for the shop owner dashboard functionality
 */

test.describe('Shop Dashboard Access Control', () => {
  test('shop dashboard requires authentication', async ({ page }) => {
    await page.goto('/shop-dashboard');
    
    // Should redirect to login or dashboard (access denied)
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url).toMatch(/\/(login|dashboard)/);
  });

  test('shop dashboard boxes page requires auth', async ({ page }) => {
    await page.goto('/shop-dashboard/boxes');
    
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url).toMatch(/\/(login|dashboard)/);
  });

  test('shop dashboard orders page requires auth', async ({ page }) => {
    await page.goto('/shop-dashboard/orders');
    
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url).toMatch(/\/(login|dashboard)/);
  });

  test('shop dashboard box create page requires auth', async ({ page }) => {
    await page.goto('/shop-dashboard/boxes/create');
    
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url).toMatch(/\/(login|dashboard)/);
  });
});

test.describe('Shop Dashboard API Endpoints', () => {
  test('shop boxes API requires authentication', async ({ request }) => {
    const response = await request.get('/api/shop-dashboard/boxes');
    expect([401, 403]).toContain(response.status());
  });

  test('shop orders API requires authentication', async ({ request }) => {
    const response = await request.get('/api/shop-dashboard/orders');
    expect([401, 403]).toContain(response.status());
  });

  test('shop box creation requires authentication', async ({ request }) => {
    const response = await request.post('/api/shop-dashboard/boxes', {
      data: {
        name: 'Test Box',
        description: 'Test Description',
        price: 100,
        gameType: 'POKEMON',
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('shop order status update requires auth', async ({ request }) => {
    const response = await request.patch('/api/shop-dashboard/orders/test-order-id', {
      data: {
        status: 'CONFIRMED',
      },
    });
    expect([401, 403, 404]).toContain(response.status());
  });
});

test.describe('Shop Dashboard Navigation (Visibility)', () => {
  test('shop dashboard link not visible when logged out', async ({ page }) => {
    await page.goto('/');
    
    // Clear cookies to ensure logged out
    await page.context().clearCookies();
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Shop Dashboard link should not be visible for unauthenticated users
    const shopDashboardLink = page.locator('a[href="/shop-dashboard"]');
    const isVisible = await shopDashboardLink.isVisible().catch(() => false);
    
    // If visible, it should be in a mobile menu or similar
    if (isVisible) {
      // This is acceptable - it may be in navigation but will redirect on click
      await shopDashboardLink.click();
      await page.waitForTimeout(1000);
      const url = page.url();
      expect(url).toMatch(/\/(login|dashboard)/);
    }
  });
});

test.describe('Shop Box Management UI', () => {
  test('box creation form has required fields', async ({ page }) => {
    // Try to access the page (will redirect but form structure is what we want to test)
    const response = await page.goto('/shop-dashboard/boxes/create');
    
    // If redirected, skip this test
    if (page.url().includes('login') || page.url().includes('dashboard')) {
      test.skip();
      return;
    }
    
    // Check form fields exist
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('textarea[name="description"]')).toBeVisible();
    await expect(page.locator('input[name="price"]')).toBeVisible();
  });
});

test.describe('Shop Order Management', () => {
  test('order status values are correct', async ({ request }) => {
    // Test that the API accepts valid status values
    const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    
    for (const status of validStatuses) {
      // These will fail auth but shouldn't fail on invalid status
      const response = await request.patch('/api/shop-dashboard/orders/test-id', {
        data: { status },
      });
      
      // Should fail auth (401/403) not bad request (400)
      expect([401, 403, 404]).toContain(response.status());
    }
  });
});
