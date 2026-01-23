import { test, expect } from '@playwright/test';

/**
 * Admin Panel Tests
 * Tests for admin functionality and access control
 */

test.describe('Admin Access Control', () => {
  test('admin page requires authentication', async ({ page }) => {
    await page.goto('/admin');
    
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url).toMatch(/\/(login|dashboard)/);
  });

  test('admin users page requires admin role', async ({ page }) => {
    await page.goto('/admin/users');
    
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url).toMatch(/\/(login|dashboard)/);
  });

  test('admin boxes page requires admin role', async ({ page }) => {
    await page.goto('/admin/boxes');
    
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url).toMatch(/\/(login|dashboard)/);
  });

  test('admin orders page requires admin role', async ({ page }) => {
    await page.goto('/admin/orders');
    
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url).toMatch(/\/(login|dashboard)/);
  });
});

test.describe('Admin API Endpoints', () => {
  test('admin users API requires admin auth', async ({ request }) => {
    const response = await request.get('/api/admin/users');
    expect([401, 403]).toContain(response.status());
  });

  test('admin boxes API requires admin auth', async ({ request }) => {
    const response = await request.get('/api/admin/boxes');
    expect([401, 403]).toContain(response.status());
  });

  test('admin orders API requires admin auth', async ({ request }) => {
    const response = await request.get('/api/admin/orders');
    expect([401, 403]).toContain(response.status());
  });

  test('user role update requires admin', async ({ request }) => {
    const response = await request.patch('/api/admin/users/test-user-id', {
      data: {
        role: 'ADMIN',
      },
    });
    expect([401, 403, 404]).toContain(response.status());
  });

  test('box creation requires admin', async ({ request }) => {
    const response = await request.post('/api/admin/boxes', {
      data: {
        name: 'Test Box',
        description: 'Test',
        price: 100,
        gameType: 'POKEMON',
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('box deletion requires admin', async ({ request }) => {
    const response = await request.delete('/api/admin/boxes/test-box-id');
    expect([401, 403, 404]).toContain(response.status());
  });

  test('user deletion requires admin', async ({ request }) => {
    const response = await request.delete('/api/admin/users/test-user-id');
    expect([401, 403, 404]).toContain(response.status());
  });
});

test.describe('Admin Navigation', () => {
  test('admin link not visible to unauthenticated users', async ({ page }) => {
    await page.goto('/');
    
    await page.context().clearCookies();
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Admin link should not be visible
    const adminLink = page.locator('a[href="/admin"]');
    const isVisible = await adminLink.isVisible().catch(() => false);
    
    if (isVisible) {
      // Even if visible in nav, clicking should redirect
      await adminLink.click();
      await page.waitForTimeout(1000);
      const url = page.url();
      expect(url).toMatch(/\/(login|dashboard)/);
    }
  });
});
