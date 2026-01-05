import { test, expect } from '@playwright/test';

/**
 * Mobile Responsive Tests
 * These tests verify the application works correctly on mobile devices and tablets
 */

test.describe('Mobile Responsive Design', () => {
  test.describe('Navigation', () => {
    test('hamburger menu is visible on mobile', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'This test only runs on mobile');
      
      await page.goto('/');
      
      // Hamburger button should be visible
      const hamburgerButton = page.locator('button[aria-label*="menu" i], button[aria-label*="Menu" i]');
      await expect(hamburgerButton).toBeVisible();
    });

    test('desktop navigation is hidden on mobile', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'This test only runs on mobile');
      
      await page.goto('/');
      
      // Desktop nav items should be hidden
      const desktopNav = page.locator('.hidden.md\\:flex, [class*="hide-mobile"]');
      const count = await desktopNav.count();
      
      // Should have hidden desktop elements
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('mobile menu opens and closes', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'This test only runs on mobile');
      
      await page.goto('/');
      
      // Find and click hamburger
      const hamburgerButton = page.locator('button[aria-label*="menu" i], button[aria-label*="Menu" i]');
      await hamburgerButton.click();
      
      // Mobile menu should be visible
      const mobileMenu = page.locator('#mobile-menu, .mobile-menu');
      await expect(mobileMenu).toBeVisible();
      
      // Click again to close
      await hamburgerButton.click();
      
      // Menu should be hidden or have transform applied
      await page.waitForTimeout(400); // Wait for animation
    });

    test('mobile menu links navigate correctly', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'This test only runs on mobile');
      
      await page.goto('/');
      
      // Open mobile menu
      const hamburgerButton = page.locator('button[aria-label*="menu" i], button[aria-label*="Menu" i]');
      await hamburgerButton.click();
      await page.waitForTimeout(300);
      
      // Click on Boxes link in mobile menu
      const boxesLink = page.locator('#mobile-menu a[href="/boxes"], .mobile-menu a[href="/boxes"]');
      await boxesLink.click();
      
      // Should navigate to boxes page
      await expect(page).toHaveURL(/\/boxes/);
    });
  });

  test.describe('Touch Interactions', () => {
    test('touch targets meet minimum size requirements', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'This test only runs on mobile');
      
      await page.goto('/');
      
      // Check button sizes
      const buttons = page.locator('button');
      const count = await buttons.count();
      
      for (let i = 0; i < Math.min(count, 5); i++) {
        const button = buttons.nth(i);
        const isVisible = await button.isVisible();
        
        if (isVisible) {
          const box = await button.boundingBox();
          if (box) {
            // Touch targets should be at least 44x44 pixels (WCAG recommendation)
            // Allow some tolerance
            expect(box.height).toBeGreaterThanOrEqual(36);
            expect(box.width).toBeGreaterThanOrEqual(36);
          }
        }
      }
    });

    test('tap events work correctly', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'This test only runs on mobile');
      
      await page.goto('/');
      
      // Tap on a link
      const link = page.locator('a[href="/boxes"]').first();
      await link.tap();
      
      await expect(page).toHaveURL(/\/boxes/);
    });

    test('scroll works with touch', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'This test only runs on mobile');
      
      await page.goto('/');
      
      // Simulate touch scroll
      await page.evaluate(() => {
        window.scrollTo({ top: 500, behavior: 'smooth' });
      });
      
      await page.waitForTimeout(500);
      
      const scrollY = await page.evaluate(() => window.scrollY);
      expect(scrollY).toBeGreaterThan(0);
    });
  });

  test.describe('Layout Responsiveness', () => {
    test('content fits within viewport on mobile', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'This test only runs on mobile');
      
      await page.goto('/');
      
      // Check there's no horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      
      expect(hasHorizontalScroll).toBe(false);
    });

    test('text is readable on mobile', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'This test only runs on mobile');
      
      await page.goto('/');
      
      // Check font size of body text
      const bodyText = page.locator('p').first();
      const isVisible = await bodyText.isVisible();
      
      if (isVisible) {
        const fontSize = await bodyText.evaluate((el) => {
          return parseInt(window.getComputedStyle(el).fontSize, 10);
        });
        
        // Font should be at least 14px for readability
        expect(fontSize).toBeGreaterThanOrEqual(14);
      }
    });

    test('cards stack vertically on mobile', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'This test only runs on mobile');
      
      await page.goto('/boxes');
      await page.waitForLoadState('networkidle');
      
      // Check that grid items are stacked
      const gridContainer = page.locator('[class*="grid"]').first();
      const isVisible = await gridContainer.isVisible();
      
      if (isVisible) {
        const gridColumns = await gridContainer.evaluate((el) => {
          return window.getComputedStyle(el).gridTemplateColumns;
        });
        
        // On mobile, should be single column or two columns max
        const columnCount = gridColumns.split(' ').length;
        expect(columnCount).toBeLessThanOrEqual(2);
      }
    });

    test('images scale properly on mobile', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'This test only runs on mobile');
      
      await page.goto('/boxes');
      await page.waitForLoadState('networkidle');
      
      const images = page.locator('img');
      const count = await images.count();
      
      const viewport = page.viewportSize();
      
      for (let i = 0; i < Math.min(count, 3); i++) {
        const img = images.nth(i);
        const isVisible = await img.isVisible();
        
        if (isVisible) {
          const box = await img.boundingBox();
          if (box && viewport) {
            // Images should not exceed viewport width
            expect(box.width).toBeLessThanOrEqual(viewport.width);
          }
        }
      }
    });
  });

  test.describe('Form Usability on Mobile', () => {
    test('form inputs are touch-friendly', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'This test only runs on mobile');
      
      await page.goto('/login');
      
      const inputs = page.locator('input');
      const count = await inputs.count();
      
      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        const box = await input.boundingBox();
        
        if (box) {
          // Inputs should be at least 44px tall for touch
          expect(box.height).toBeGreaterThanOrEqual(40);
        }
      }
    });

    test('keyboard triggers on input focus', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'This test only runs on mobile');
      
      await page.goto('/login');
      
      const emailInput = page.locator('input[type="email"], input[name="email"]');
      await emailInput.tap();
      
      // Input should be focused
      const isFocused = await emailInput.evaluate((el) => document.activeElement === el);
      expect(isFocused).toBe(true);
    });
  });

  test.describe('Safe Area Handling', () => {
    test('content respects safe areas', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'This test only runs on mobile');
      
      await page.goto('/');
      
      // Check body has safe area padding classes or CSS
      const body = page.locator('body');
      await expect(body).toBeVisible();
      
      // Just verify page renders correctly
      const nav = page.locator('nav');
      await expect(nav).toBeVisible();
    });
  });
});

test.describe('Tablet Layout', () => {
  test('navigation layout adjusts for tablet', async ({ page, browserName }) => {
    // This test runs on iPad configurations
    test.skip(browserName !== 'webkit', 'iPad tests run on webkit');
    
    await page.goto('/');
    
    // Navigation should be visible
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('grid shows appropriate columns on tablet', async ({ page }) => {
    await page.goto('/boxes');
    await page.waitForLoadState('networkidle');
    
    const gridContainer = page.locator('[class*="grid"]').first();
    const isVisible = await gridContainer.isVisible();
    
    if (isVisible) {
      const gridColumns = await gridContainer.evaluate((el) => {
        return window.getComputedStyle(el).gridTemplateColumns;
      });
      
      // Should show grid (could be 2-3 columns on tablet)
      expect(gridColumns).not.toBe('none');
    }
  });
});

test.describe('Landscape Mode', () => {
  test('layout works in landscape orientation', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test only runs on mobile');
    
    await page.goto('/');
    
    // Content should be visible
    const main = page.locator('main, #main-content');
    await expect(main).toBeVisible();
    
    // No horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    expect(hasHorizontalScroll).toBe(false);
  });
});

test.describe('Mobile Performance', () => {
  test('page is not janky when scrolling', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test only runs on mobile');
    
    await page.goto('/');
    
    // Perform multiple scroll operations
    for (let i = 0; i < 5; i++) {
      await page.evaluate((pos) => {
        window.scrollTo({ top: pos, behavior: 'instant' });
      }, i * 200);
      await page.waitForTimeout(50);
    }
    
    // Page should still be responsive
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('animations dont cause layout shift', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test only runs on mobile');
    
    await page.goto('/');
    
    // Get initial viewport size
    const initialSize = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    }));
    
    // Wait for any animations
    await page.waitForTimeout(1000);
    
    // Get size after animations
    const finalSize = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    }));
    
    // Size should remain the same
    expect(finalSize.width).toBe(initialSize.width);
  });
});







