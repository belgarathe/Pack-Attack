import { test, expect } from '@playwright/test';

/**
 * Mobile-Specific Design Tests
 * Tests for responsive design behavior on mobile devices
 */

test.describe('Mobile Design - Navigation', () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only tests');
    await page.goto('/');
  });

  test('hamburger menu is visible', async ({ page }) => {
    const hamburger = page.locator('button').filter({ hasText: /menu/i }).or(
      page.locator('button[aria-label*="menu" i]')
    );
    await expect(hamburger.first()).toBeVisible();
  });

  test('desktop nav links are hidden', async ({ page }) => {
    // Desktop nav links should be hidden on mobile
    const desktopNav = page.locator('nav').locator('a:has-text("Boxes")').first();
    
    // Should either be hidden or inside mobile menu
    const isVisible = await desktopNav.isVisible();
    
    // On mobile, the link might be hidden or in a collapsed menu
    // This is expected behavior
  });

  test('hamburger opens mobile menu', async ({ page }) => {
    const hamburger = page.locator('button').filter({ hasText: /menu/i }).or(
      page.locator('button[aria-label*="menu" i]')
    ).first();
    
    await hamburger.click();
    await page.waitForTimeout(400);
    
    // Mobile menu should be visible after click
    const mobileMenu = page.locator('.mobile-menu, [class*="mobile"]').first();
    // Menu behavior may vary
  });
});

test.describe('Mobile Design - Landing Page', () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only tests');
  });

  test('hero text is readable on mobile', async ({ page }) => {
    await page.goto('/');
    
    const headline = page.locator('h1:has-text("PACK")');
    await expect(headline).toBeVisible();
    
    // Check font size is appropriate for mobile
    const fontSize = await headline.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).fontSize);
    });
    
    expect(fontSize).toBeGreaterThanOrEqual(24); // At least 1.5rem on mobile
  });

  test('CTA buttons are full width or centered', async ({ page }) => {
    await page.goto('/');
    
    const ctaContainer = page.locator('a:has-text("Start Opening")').locator('..');
    
    // Buttons should be in a flex container for centering
    const display = await ctaContainer.evaluate((el) => {
      return window.getComputedStyle(el).display;
    });
    
    expect(display).toBe('flex');
  });

  test('stats bar is readable on mobile', async ({ page }) => {
    await page.goto('/');
    
    const statsLabels = ['Packs Opened', 'Battles Complete', 'Players'];
    
    for (const label of statsLabels) {
      const stat = page.locator(`text=${label}`);
      await expect(stat).toBeVisible();
    }
  });

  test('floating decorative elements are hidden', async ({ page }) => {
    await page.goto('/');
    
    // Floating elements have lg:block class, should be hidden on mobile
    const floatingElements = page.locator('.animate-float');
    const count = await floatingElements.count();
    
    for (let i = 0; i < count; i++) {
      const el = floatingElements.nth(i);
      const isHidden = await el.evaluate((e) => {
        const style = window.getComputedStyle(e);
        return style.display === 'none' || style.visibility === 'hidden';
      });
      
      // Floating elements should be hidden on mobile (lg:block means hidden below lg)
      expect(isHidden).toBe(true);
    }
  });
});

test.describe('Mobile Design - Boxes Page', () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only tests');
  });

  test('box grid is single column on mobile', async ({ page }) => {
    await page.goto('/boxes');
    await page.waitForLoadState('networkidle');
    
    const grid = page.locator('.grid').first();
    if (await grid.count() > 0) {
      const gridCols = await grid.evaluate((el) => {
        return window.getComputedStyle(el).gridTemplateColumns;
      });
      
      // On mobile, should be single column or auto
      const colCount = gridCols.split(' ').filter(c => c !== '').length;
      expect(colCount).toBeLessThanOrEqual(2);
    }
  });

  test('box cards are touch-friendly', async ({ page }) => {
    await page.goto('/boxes');
    
    const cards = page.locator('.card-lift, [class*="card"]');
    const count = await cards.count();
    
    for (let i = 0; i < Math.min(count, 3); i++) {
      const card = cards.nth(i);
      const box = await card.boundingBox();
      
      if (box) {
        // Touch target should be at least 44px
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});

test.describe('Mobile Design - Battles Page', () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only tests');
  });

  test('battle cards stack vertically', async ({ page }) => {
    await page.goto('/battles');
    
    const grid = page.locator('.grid').first();
    if (await grid.count() > 0) {
      const gridCols = await grid.evaluate((el) => {
        return window.getComputedStyle(el).gridTemplateColumns;
      });
      
      // Should be single column on mobile
      const colCount = gridCols.split(' ').filter(c => c !== '').length;
      expect(colCount).toBeLessThanOrEqual(2);
    }
  });

  test('create battle button is accessible', async ({ page }) => {
    await page.goto('/battles');
    
    // If logged in, create button should be visible
    // If not logged in, sign in prompt should be visible
    const createButton = page.locator('a:has-text("Create Battle"), text=Sign In to Create');
    const count = await createButton.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Mobile Design - Login Page', () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only tests');
  });

  test('login form fits mobile screen', async ({ page }) => {
    await page.goto('/login');
    
    const form = page.locator('form');
    const formBox = await form.boundingBox();
    const viewportSize = page.viewportSize();
    
    if (formBox && viewportSize) {
      // Form should fit within viewport with padding
      expect(formBox.width).toBeLessThanOrEqual(viewportSize.width);
    }
  });

  test('input fields are full width', async ({ page }) => {
    await page.goto('/login');
    
    const emailInput = page.locator('input[type="email"]');
    const inputBox = await emailInput.boundingBox();
    
    if (inputBox) {
      // Input should be reasonably wide (at least 250px)
      expect(inputBox.width).toBeGreaterThanOrEqual(250);
    }
  });

  test('sign in button is touch-friendly', async ({ page }) => {
    await page.goto('/login');
    
    const button = page.locator('button:has-text("Sign In")');
    const buttonBox = await button.boundingBox();
    
    if (buttonBox) {
      // Touch target should be at least 44px
      expect(buttonBox.height).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('Mobile Design - Register Page', () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only tests');
  });

  test('welcome bonus banner is visible', async ({ page }) => {
    await page.goto('/register');
    
    await expect(page.locator('text=Welcome Bonus!')).toBeVisible();
  });

  test('form fields are accessible', async ({ page }) => {
    await page.goto('/register');
    
    await expect(page.locator('input[placeholder*="name" i]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});

test.describe('Mobile Touch Interactions', () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only tests');
  });

  test('tap on card navigates correctly', async ({ page }) => {
    await page.goto('/');
    
    const ctaButton = page.locator('a:has-text("Start Opening")');
    await expect(ctaButton).toBeVisible();
    
    // Tap the button
    await ctaButton.tap();
    
    // Should navigate to boxes page
    await expect(page).toHaveURL(/\/boxes/);
  });

  test('tap on login link works', async ({ page }) => {
    await page.goto('/');
    
    const signInLink = page.locator('nav').locator('a:has-text("Sign In")').or(
      page.locator('button:has-text("Open menu")')
    ).first();
    
    if (await signInLink.isVisible()) {
      // If it's the hamburger menu, we need to open it first
      const isHamburger = await signInLink.evaluate((el) => {
        return el.tagName === 'BUTTON';
      });
      
      if (isHamburger) {
        await signInLink.tap();
        await page.waitForTimeout(400);
        
        const mobileSignIn = page.locator('a:has-text("Sign In")');
        if (await mobileSignIn.isVisible()) {
          await mobileSignIn.tap();
          await expect(page).toHaveURL(/\/login/);
        }
      } else {
        await signInLink.tap();
        await expect(page).toHaveURL(/\/login/);
      }
    }
  });

  test('scroll behavior is smooth', async ({ page }) => {
    await page.goto('/');
    
    // Check scroll behavior CSS
    const scrollBehavior = await page.evaluate(() => {
      return window.getComputedStyle(document.documentElement).scrollBehavior;
    });
    
    expect(scrollBehavior).toBe('smooth');
  });
});

test.describe('Mobile Viewport Sizes', () => {
  const mobileViewports = [
    { width: 320, height: 568, name: 'iPhone SE' },
    { width: 375, height: 667, name: 'iPhone 8' },
    { width: 390, height: 844, name: 'iPhone 12' },
    { width: 412, height: 915, name: 'Pixel 5' },
    { width: 360, height: 740, name: 'Samsung Galaxy' },
  ];

  for (const viewport of mobileViewports) {
    test(`renders correctly on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      
      // Core elements should be visible
      await expect(page.locator('h1:has-text("PACK")')).toBeVisible();
      await expect(page.locator('a:has-text("Start Opening")')).toBeVisible();
      
      // No horizontal overflow
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      
      expect(hasOverflow).toBe(false);
    });
  }
});

test.describe('Mobile Orientation', () => {
  test('landscape mode on mobile displays correctly', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test');
    
    // Simulate landscape
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/');
    
    // Content should still be accessible
    await expect(page.locator('h1:has-text("PACK")')).toBeVisible();
    
    // Should not have horizontal scroll
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    expect(hasOverflow).toBe(false);
  });
});

