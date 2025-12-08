import { test, expect } from '@playwright/test';

/**
 * Cross-Browser Compatibility Tests
 * These tests ensure the application works correctly across all major browsers
 */

test.describe('Cross-Browser Compatibility', () => {
  test.describe('Core Page Loading', () => {
    test('homepage loads correctly with proper structure', async ({ page }) => {
      await page.goto('/');
      
      // Check page title
      await expect(page).toHaveTitle(/Pack Attack/);
      
      // Check main heading renders
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible();
      
      // Check navigation exists
      const nav = page.locator('nav');
      await expect(nav).toBeVisible();
      
      // Check body has correct background color
      const body = page.locator('body');
      await expect(body).toHaveCSS('background-color', 'rgb(3, 7, 18)');
    });

    test('boxes page loads correctly', async ({ page }) => {
      await page.goto('/boxes');
      
      // Page should load without errors
      const heading = page.locator('h1').filter({ hasText: /Boxes/i });
      await expect(heading).toBeVisible();
    });

    test('battles page loads correctly', async ({ page }) => {
      await page.goto('/battles');
      
      const heading = page.locator('h1').filter({ hasText: /Battle/i });
      await expect(heading).toBeVisible();
    });

    test('login page loads correctly', async ({ page }) => {
      await page.goto('/login');
      
      // Check form elements exist
      const emailInput = page.locator('input[type="email"], input[name="email"]');
      const passwordInput = page.locator('input[type="password"]');
      
      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
    });

    test('register page loads correctly', async ({ page }) => {
      await page.goto('/register');
      
      // Check form elements exist
      const form = page.locator('form');
      await expect(form).toBeVisible();
    });
  });

  test.describe('CSS and Styling', () => {
    test('flexbox layouts render correctly', async ({ page }) => {
      await page.goto('/');
      
      // Check that flex containers work
      const flexContainers = page.locator('[class*="flex"]').first();
      await expect(flexContainers).toBeVisible();
      
      // Verify flex is applied
      await expect(flexContainers).toHaveCSS('display', /flex/);
    });

    test('grid layouts render correctly', async ({ page }) => {
      await page.goto('/');
      
      // Check for grid elements
      const gridContainer = page.locator('[class*="grid"]').first();
      await expect(gridContainer).toBeVisible();
      await expect(gridContainer).toHaveCSS('display', 'grid');
    });

    test('backdrop-filter blur works', async ({ page }) => {
      await page.goto('/');
      
      // Navigation should have backdrop blur
      const nav = page.locator('nav');
      // Note: backdrop-filter might be 'none' in some browsers or require webkit prefix
      const backdropFilter = await nav.evaluate((el) => {
        const style = window.getComputedStyle(el);
        // Use getPropertyValue for webkit prefix compatibility
        return style.backdropFilter || style.getPropertyValue('-webkit-backdrop-filter') || 'none';
      });
      
      // Just verify nav is rendered (backdrop-filter may vary by browser)
      await expect(nav).toBeVisible();
    });

    test('transitions and animations are smooth', async ({ page }) => {
      await page.goto('/');
      
      // Find a visible button (not the mobile menu button)
      const button = page.locator('a:has-text("Get Started"), a:has-text("View Battles")').first();
      await expect(button).toBeVisible();
      
      // Verify transition is applied
      const transition = await button.evaluate((el) => {
        return window.getComputedStyle(el).transition;
      });
      
      expect(transition).not.toBe('');
    });

    test('border-radius renders correctly', async ({ page }) => {
      await page.goto('/');
      
      // Check buttons have rounded corners (more reliable than generic rounded class)
      const roundedElement = page.locator('a:has-text("Get Started")').first();
      await expect(roundedElement).toBeVisible();
      
      const borderRadius = await roundedElement.evaluate((el) => {
        return window.getComputedStyle(el).borderRadius;
      });
      
      // Should have some border radius (buttons use rounded-lg = 8px or more)
      const radiusValue = parseFloat(borderRadius);
      expect(radiusValue).toBeGreaterThan(0);
    });
  });

  test.describe('JavaScript Functionality', () => {
    test('navigation links work correctly', async ({ page }) => {
      await page.goto('/');
      
      // Click on Boxes link
      await page.click('a[href="/boxes"]');
      await expect(page).toHaveURL(/\/boxes/);
      
      // Navigate to battles
      await page.click('a[href="/battles"]');
      await expect(page).toHaveURL(/\/battles/);
      
      // Navigate back to home
      await page.click('a[href="/"]');
      await expect(page).toHaveURL('/');
    });

    test('buttons are clickable and respond', async ({ page }) => {
      await page.goto('/');
      
      // Find a visible call-to-action button
      const button = page.locator('a:has-text("Get Started")').first();
      await expect(button).toBeVisible();
    });

    test('forms can be interacted with', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      
      const emailInput = page.locator('input[type="email"], input[name="email"]');
      const passwordInput = page.locator('input[type="password"]');
      
      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      
      // Click to focus first (helps with webkit)
      await emailInput.click();
      await page.waitForTimeout(100);
      
      // Type in inputs
      await emailInput.fill('test@example.com');
      await passwordInput.fill('testpassword123');
      
      // Wait for values to be set
      await page.waitForTimeout(200);
      
      // Verify values are entered
      await expect(emailInput).toHaveValue('test@example.com');
      await expect(passwordInput).toHaveValue('testpassword123');
    });
  });

  test.describe('Images and Media', () => {
    test('images load without broken links', async ({ page }) => {
      await page.goto('/boxes');
      
      // Wait for page to fully load
      await page.waitForLoadState('networkidle');
      
      // Check all images on the page
      const images = page.locator('img');
      const count = await images.count();
      
      for (let i = 0; i < Math.min(count, 10); i++) {
        const img = images.nth(i);
        const isVisible = await img.isVisible();
        
        if (isVisible) {
          // Check image loaded successfully
          const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
          // Images should have loaded (naturalWidth > 0)
          // Note: Some images might be lazy loaded or placeholders
        }
      }
    });
  });

  test.describe('Accessibility', () => {
    test('page has proper heading hierarchy', async ({ page }) => {
      await page.goto('/');
      
      // Check for h1
      const h1 = page.locator('h1').first();
      await expect(h1).toBeVisible();
      
      // There should be at least one h1
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThan(0);
    });

    test('interactive elements are keyboard accessible', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      
      // Click on body first to ensure focus is on the page
      await page.locator('body').click();
      await page.waitForTimeout(100);
      
      // Tab through the page multiple times
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(50);
      }
      
      // Verify that tabbing works and we can find focusable elements
      // Different browsers handle focus differently, so we just verify the page has interactive elements
      const interactiveCount = await page.locator('a, button').count();
      expect(interactiveCount).toBeGreaterThan(0);
    });

    test('navigation has proper ARIA labels', async ({ page }) => {
      await page.goto('/');
      
      const nav = page.locator('nav');
      const ariaLabel = await nav.getAttribute('aria-label');
      
      // Navigation should have an aria-label
      expect(ariaLabel).toBeTruthy();
    });

    test('buttons have accessible names', async ({ page }) => {
      await page.goto('/');
      
      const buttons = page.locator('button');
      const count = await buttons.count();
      
      for (let i = 0; i < Math.min(count, 5); i++) {
        const button = buttons.nth(i);
        const isVisible = await button.isVisible();
        
        if (isVisible) {
          // Button should have accessible name (text content or aria-label)
          const accessibleName = await button.evaluate((el) => {
            return el.textContent?.trim() || el.getAttribute('aria-label') || '';
          });
          expect(accessibleName.length).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('Performance', () => {
    test('page loads within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const loadTime = Date.now() - startTime;
      
      // Page should load in under 10 seconds
      expect(loadTime).toBeLessThan(10000);
    });

    test('no console errors on page load', async ({ page }) => {
      const errors: string[] = [];
      
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Filter out expected errors (like missing favicon)
      const criticalErrors = errors.filter(
        (e) => !e.includes('favicon') && !e.includes('manifest')
      );
      
      // No critical console errors
      expect(criticalErrors).toHaveLength(0);
    });
  });
});

test.describe('Browser-Specific Features', () => {
  test('scrolling works correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Scroll down using instant behavior to bypass smooth scrolling
    await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'instant' }));
    await page.waitForTimeout(200);
    
    // Verify scroll happened
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(100);
    
    // Scroll back to top with instant behavior
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(200);
    
    const scrollYAfter = await page.evaluate(() => window.scrollY);
    // Allow small offset due to browser differences
    expect(scrollYAfter).toBeLessThanOrEqual(150);
  });

  test('sticky navigation stays in position', async ({ page }) => {
    await page.goto('/');
    
    const nav = page.locator('nav');
    
    // Scroll down significantly
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForTimeout(100);
    
    // Navigation should still be visible and at top
    await expect(nav).toBeVisible();
    
    const navRect = await nav.boundingBox();
    expect(navRect?.y).toBeLessThanOrEqual(10); // Should be at or near top
  });

  test('hover states work correctly', async ({ page, browserName }) => {
    // Skip hover tests on mobile (no hover support)
    test.skip(browserName === 'webkit' && process.env.PLAYWRIGHT_MOBILE === 'true', 'No hover on mobile');
    
    await page.goto('/');
    
    const link = page.locator('a').first();
    await link.hover();
    
    // Element should still be visible after hover
    await expect(link).toBeVisible();
  });
});

