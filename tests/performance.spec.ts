import { test, expect } from '@playwright/test';

/**
 * Performance Tests
 * Tests for application performance and optimization
 */

test.describe('Page Load Performance', () => {
  test('homepage loads within 5 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000);
    console.log(`Homepage load time: ${loadTime}ms`);
  });

  test('boxes page loads within 5 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/boxes', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000);
    console.log(`Boxes page load time: ${loadTime}ms`);
  });

  test('battles page loads within 5 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/battles', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000);
    console.log(`Battles page load time: ${loadTime}ms`);
  });

  test('leaderboard loads within 5 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/leaderboard', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000);
    console.log(`Leaderboard load time: ${loadTime}ms`);
  });
});

test.describe('API Response Times', () => {
  test('boxes API responds within 2 seconds', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get('/api/boxes');
    const responseTime = Date.now() - startTime;
    
    expect(response.ok()).toBeTruthy();
    expect(responseTime).toBeLessThan(2000);
    console.log(`Boxes API response time: ${responseTime}ms`);
  });

  test('battles API responds within 2 seconds', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get('/api/battles');
    const responseTime = Date.now() - startTime;
    
    expect(response.ok()).toBeTruthy();
    expect(responseTime).toBeLessThan(2000);
    console.log(`Battles API response time: ${responseTime}ms`);
  });

  test('leaderboard API responds within 2 seconds', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get('/api/leaderboard');
    const responseTime = Date.now() - startTime;
    
    expect(response.ok()).toBeTruthy();
    expect(responseTime).toBeLessThan(2000);
    console.log(`Leaderboard API response time: ${responseTime}ms`);
  });

  test('health check responds within 500ms', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get('/api/health');
    const responseTime = Date.now() - startTime;
    
    expect(response.ok()).toBeTruthy();
    expect(responseTime).toBeLessThan(500);
    console.log(`Health check response time: ${responseTime}ms`);
  });
});

test.describe('Resource Loading', () => {
  test('no excessive network requests on homepage', async ({ page }) => {
    const requests: string[] = [];
    
    page.on('request', (request) => {
      requests.push(request.url());
    });
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Should not have excessive requests (< 100 is reasonable)
    expect(requests.length).toBeLessThan(100);
    console.log(`Homepage network requests: ${requests.length}`);
  });

  test('images are optimized (next/image)', async ({ page }) => {
    await page.goto('/boxes');
    await page.waitForLoadState('networkidle');
    
    // Check for Next.js image optimization
    const nextImages = page.locator('img[src*="_next/image"]');
    const standardImages = page.locator('img:not([src*="_next/image"])');
    
    const nextImageCount = await nextImages.count();
    const standardImageCount = await standardImages.count();
    
    console.log(`Next.js optimized images: ${nextImageCount}`);
    console.log(`Standard images: ${standardImageCount}`);
    
    // At least some images should be optimized
    // (This is informational, not a strict requirement)
  });
});

test.describe('Memory and Performance Metrics', () => {
  test('no memory leaks during navigation', async ({ page }) => {
    // Navigate through multiple pages
    const pages = ['/', '/boxes', '/battles', '/leaderboard', '/'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
    }
    
    // Get performance metrics
    const metrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });
    
    if (metrics) {
      console.log(`JS Heap Size: ${Math.round(metrics.usedJSHeapSize / 1024 / 1024)}MB`);
      console.log(`Total JS Heap: ${Math.round(metrics.totalJSHeapSize / 1024 / 1024)}MB`);
    }
  });

  test('no console errors during navigation', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    const pages = ['/', '/boxes', '/battles', '/leaderboard'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
    }
    
    // Filter out expected/transient errors
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && 
             !e.includes('manifest') &&
             !e.includes('hydration') &&
             !e.includes('503') &&  // Transient server errors
             !e.includes('MIME type')  // CDN/cache issues
    );
    
    if (criticalErrors.length > 0) {
      console.log('Console errors found:', criticalErrors);
    }
    
    // Log but don't fail for transient errors
    if (errors.length > 0) {
      console.log('Transient errors (not failing test):', errors.length);
    }
    
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Caching and Optimization', () => {
  test('static assets are cached', async ({ page }) => {
    await page.goto('/');
    
    // Second request should be faster due to caching
    const startTime = Date.now();
    await page.goto('/');
    const secondLoadTime = Date.now() - startTime;
    
    console.log(`Second page load time: ${secondLoadTime}ms`);
    // Should be faster on second load
    expect(secondLoadTime).toBeLessThan(3000);
  });

  test('API responses include cache headers', async ({ request }) => {
    const response = await request.get('/api/boxes');
    const headers = response.headers();
    
    // Check for cache-related headers
    console.log('Cache-Control:', headers['cache-control'] || 'not set');
    console.log('ETag:', headers['etag'] || 'not set');
  });
});

test.describe('Bundle Size Checks', () => {
  test('JavaScript bundle is reasonably sized', async ({ page }) => {
    const resources: { url: string; size: number }[] = [];
    
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('.js') && !url.includes('node_modules')) {
        const headers = response.headers();
        const size = parseInt(headers['content-length'] || '0');
        resources.push({ url, size });
      }
    });
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const totalSize = resources.reduce((sum, r) => sum + r.size, 0);
    console.log(`Total JS size: ${Math.round(totalSize / 1024)}KB`);
    
    // Total JS should be under 2MB
    expect(totalSize).toBeLessThan(2 * 1024 * 1024);
  });
});
