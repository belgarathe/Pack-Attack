import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests
 * These tests capture screenshots to detect visual changes across browsers
 */

test.describe('Visual Regression - Desktop', () => {
  test('homepage visual snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for any animations to complete
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.1,
    });
  });

  test('navigation visual snapshot', async ({ page }) => {
    await page.goto('/');
    
    const nav = page.locator('nav');
    await expect(nav).toHaveScreenshot('navigation-desktop.png', {
      maxDiffPixelRatio: 0.1,
    });
  });

  test('boxes page visual snapshot', async ({ page }) => {
    await page.goto('/boxes');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('boxes-page-desktop.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.15, // Allow more variance for dynamic content
    });
  });

  test('battles page visual snapshot', async ({ page }) => {
    await page.goto('/battles');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('battles-page-desktop.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.15,
    });
  });

  test('login page visual snapshot', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('login-page-desktop.png', {
      maxDiffPixelRatio: 0.1,
    });
  });

  test('register page visual snapshot', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('register-page-desktop.png', {
      maxDiffPixelRatio: 0.1,
    });
  });
});

test.describe('Visual Regression - Mobile', () => {
  test('homepage mobile visual snapshot', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test only runs on mobile');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.1,
    });
  });

  test('mobile menu open visual snapshot', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test only runs on mobile');
    
    await page.goto('/');
    
    // Open mobile menu
    const hamburgerButton = page.locator('button[aria-label*="menu" i]');
    await hamburgerButton.click();
    await page.waitForTimeout(400);
    
    await expect(page).toHaveScreenshot('mobile-menu-open.png', {
      maxDiffPixelRatio: 0.1,
    });
  });

  test('boxes page mobile visual snapshot', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test only runs on mobile');
    
    await page.goto('/boxes');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('boxes-page-mobile.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.15,
    });
  });

  test('login page mobile visual snapshot', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test only runs on mobile');
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('login-page-mobile.png', {
      maxDiffPixelRatio: 0.1,
    });
  });
});

test.describe('Component Visual Tests', () => {
  test('button variants visual snapshot', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Component snapshots run on desktop only');
    
    await page.goto('/');
    
    // Find a visible CTA button
    const button = page.locator('a:has-text("Get Started")').first();
    await expect(button).toBeVisible();
    
    await expect(button).toHaveScreenshot('button-component.png', {
      maxDiffPixelRatio: 0.1,
    });
  });

  test('card component visual snapshot', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Component snapshots run on desktop only');
    
    await page.goto('/boxes');
    await page.waitForLoadState('networkidle');
    
    const card = page.locator('[class*="card"]').first();
    const isVisible = await card.isVisible();
    
    if (isVisible) {
      await expect(card).toHaveScreenshot('card-component.png', {
        maxDiffPixelRatio: 0.15,
      });
    }
  });
});

test.describe('Dark Mode Consistency', () => {
  test('dark theme is applied consistently', async ({ page }) => {
    await page.goto('/');
    
    // Check background colors are consistent with dark theme
    const body = page.locator('body');
    const bgColor = await body.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    
    // Should be dark background
    expect(bgColor).toMatch(/rgb\(\s*\d{1,2}\s*,\s*\d{1,2}\s*,\s*\d{1,2}\s*\)/);
  });

  test('text has sufficient contrast on dark background', async ({ page }) => {
    await page.goto('/');
    
    const heading = page.locator('h1').first();
    const color = await heading.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    
    // Should be light text (white or near-white)
    expect(color).toMatch(/rgb\(\s*2[0-5]\d\s*,\s*2[0-5]\d\s*,\s*2[0-5]\d\s*\)/);
  });
});

test.describe('State-Based Visual Tests', () => {
  test('button hover state', async ({ page, browserName, isMobile }) => {
    // Skip on mobile (no hover)
    test.skip(isMobile, 'No hover on mobile');
    
    await page.goto('/');
    
    // Get a visible CTA button, not the mobile menu button
    const button = page.locator('a:has-text("Get Started")').first();
    await expect(button).toBeVisible();
    await button.hover();
    
    await expect(button).toHaveScreenshot('button-hover.png', {
      maxDiffPixelRatio: 0.15,
    });
  });

  test('button focus state', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Focus states differ on mobile');
    
    await page.goto('/');
    
    // Get a visible CTA button
    const button = page.locator('a:has-text("Get Started")').first();
    await expect(button).toBeVisible();
    await button.focus();
    
    await expect(button).toHaveScreenshot('button-focus.png', {
      maxDiffPixelRatio: 0.15,
    });
  });

  test('input focus state', async ({ page }) => {
    await page.goto('/login');
    
    const input = page.locator('input').first();
    await input.focus();
    
    await expect(input).toHaveScreenshot('input-focus.png', {
      maxDiffPixelRatio: 0.15,
    });
  });
});

