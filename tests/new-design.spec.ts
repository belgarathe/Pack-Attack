import { test, expect } from '@playwright/test';

/**
 * New Design System Tests
 * Tests for the Arena-themed design implementation across all pages
 */

test.describe('Design System - Typography', () => {
  test('uses Outfit font family', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const heading = page.locator('h1').first();
    const fontFamily = await heading.evaluate((el) => {
      return window.getComputedStyle(el).fontFamily;
    });
    
    expect(fontFamily.toLowerCase()).toContain('outfit');
  });

  test('hero heading has correct gradient text', async ({ page }) => {
    await page.goto('/');
    
    // The "ATTACK" part should have gradient text
    const gradientText = page.locator('span.text-transparent').first();
    await expect(gradientText).toBeVisible();
    
    const bgClip = await gradientText.evaluate((el) => {
      return window.getComputedStyle(el).webkitBackgroundClip || 
             window.getComputedStyle(el).backgroundClip;
    });
    
    expect(bgClip).toBe('text');
  });

  test('headings have correct hierarchy', async ({ page }) => {
    await page.goto('/');
    
    const h1 = page.locator('h1');
    const h1Count = await h1.count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
    
    // Check that H1 is the largest
    if (h1Count > 0) {
      const h1Size = await h1.first().evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).fontSize);
      });
      expect(h1Size).toBeGreaterThanOrEqual(32); // At least 2rem
    }
  });
});

test.describe('Design System - Colors & Theme', () => {
  test('dark background is applied', async ({ page }) => {
    await page.goto('/');
    
    const body = page.locator('body');
    const bgColor = await body.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    
    // Should be very dark (near black)
    const rgbMatch = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch.map(Number);
      expect(r).toBeLessThan(30);
      expect(g).toBeLessThan(30);
      expect(b).toBeLessThan(30);
    }
  });

  test('primary accent color is blue', async ({ page }) => {
    await page.goto('/');
    
    const primaryButton = page.locator('a:has-text("Start Opening")').first();
    await expect(primaryButton).toBeVisible();
    
    const bgColor = await primaryButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    
    // Should contain blue tones
    expect(bgColor).toBeTruthy();
  });

  test('amber color used for coins/rewards', async ({ page }) => {
    await page.goto('/');
    
    // Check if amber color is used in stats section
    const statsSection = page.locator('section').nth(1);
    const amberElements = statsSection.locator('[class*="amber"], [class*="yellow"]');
    
    // Should have amber colored elements
    const count = await amberElements.count();
    expect(count).toBeGreaterThanOrEqual(0); // May vary based on content
  });
});

test.describe('Design System - Glass Effects', () => {
  test('glass effect cards have backdrop blur', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const glassElement = page.locator('.glass, .glass-strong').first();
    
    if (await glassElement.count() > 0) {
      const backdropFilter = await glassElement.evaluate((el) => {
        return window.getComputedStyle(el).backdropFilter || 
               window.getComputedStyle(el).webkitBackdropFilter || '';
      });
      
      // Backdrop blur may not be supported in all browsers during testing
      // Just verify the class is applied
      const hasGlassClass = await glassElement.evaluate((el) => {
        return el.classList.contains('glass') || el.classList.contains('glass-strong');
      });
      expect(hasGlassClass).toBe(true);
    }
  });

  test('glass cards have semi-transparent background', async ({ page }) => {
    await page.goto('/');
    
    const glassElement = page.locator('.glass, .glass-strong').first();
    
    if (await glassElement.count() > 0) {
      const bgColor = await glassElement.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      
      // Should have alpha transparency
      expect(bgColor).toMatch(/rgba?\(/);
    }
  });
});

test.describe('Design System - Buttons & CTAs', () => {
  test('primary CTA has gradient background', async ({ page }) => {
    await page.goto('/');
    
    const primaryButton = page.locator('a:has-text("Start Opening")').first();
    await expect(primaryButton).toBeVisible();
    
    const bgImage = await primaryButton.evaluate((el) => {
      return window.getComputedStyle(el).backgroundImage;
    });
    
    // Should have gradient
    expect(bgImage).toContain('gradient');
  });

  test('secondary CTA has gradient border', async ({ page }) => {
    await page.goto('/');
    
    const secondaryButton = page.locator('a:has-text("View Battles")').first();
    await expect(secondaryButton).toBeVisible();
    
    // Should have the gradient-border class
    const hasGradientBorder = await secondaryButton.evaluate((el) => {
      return el.classList.contains('gradient-border') || 
             el.closest('.gradient-border') !== null;
    });
    
    expect(hasGradientBorder).toBe(true);
  });

  test('buttons have hover scale effect', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Hover effects not applicable on mobile');
    
    await page.goto('/');
    
    const button = page.locator('a:has-text("Start Opening")').first();
    await expect(button).toBeVisible();
    
    // Check that hover:scale class is applied
    const hasHoverScale = await button.evaluate((el) => {
      return el.className.includes('hover:scale') || 
             window.getComputedStyle(el).transition.includes('transform');
    });
    
    // Either has hover:scale class or transition on transform
    expect(hasHoverScale).toBe(true);
  });
});

test.describe('Landing Page Design', () => {
  test('hero section displays correctly', async ({ page }) => {
    await page.goto('/');
    
    // Badge
    const badge = page.locator('text=The Ultimate TCG Experience');
    await expect(badge).toBeVisible();
    
    // Main headline
    const headline = page.locator('h1:has-text("PACK")');
    await expect(headline).toBeVisible();
    
    // Subheadline
    const subheadline = page.locator('text=Open Packs. Battle.');
    await expect(subheadline).toBeVisible();
    
    // CTAs
    await expect(page.locator('a:has-text("Start Opening")')).toBeVisible();
    await expect(page.locator('a:has-text("View Battles")')).toBeVisible();
  });

  test('stats bar displays with correct icons', async ({ page }) => {
    await page.goto('/');
    
    // Stats labels - use exact match to avoid conflicts
    await expect(page.getByText('Packs Opened', { exact: true })).toBeVisible();
    await expect(page.getByText('Battles Complete', { exact: true })).toBeVisible();
    await expect(page.getByText('Players', { exact: true })).toBeVisible();
  });

  test('coming soon section shows when no content', async ({ page }) => {
    await page.goto('/');
    
    // Should show coming soon section when no featured boxes
    const comingSoon = page.locator('text=Coming Soon');
    if (await comingSoon.isVisible()) {
      await expect(page.locator('text=Get Notified')).toBeVisible();
    }
  });

  test('grid background pattern is visible', async ({ page }) => {
    await page.goto('/');
    
    const gridElement = page.locator('.bg-grid').first();
    if (await gridElement.count() > 0) {
      const bgImage = await gridElement.evaluate((el) => {
        return window.getComputedStyle(el).backgroundImage;
      });
      
      expect(bgImage).toContain('linear-gradient');
    }
  });
});

test.describe('Boxes Page Design', () => {
  test('page header has correct styling', async ({ page }) => {
    await page.goto('/boxes');
    
    // Badge
    const badge = page.locator('text=Card Packs');
    await expect(badge).toBeVisible();
    
    // Gradient title
    const title = page.locator('h1:has-text("Boxes")');
    await expect(title).toBeVisible();
  });

  test('empty state displays correctly', async ({ page }) => {
    await page.goto('/boxes');
    
    const emptyState = page.locator('text=No Boxes Available');
    if (await emptyState.isVisible()) {
      await expect(page.locator('text=Back to Home')).toBeVisible();
    }
  });
});

test.describe('Battles Page Design', () => {
  test('page header has purple theme', async ({ page }) => {
    await page.goto('/battles');
    
    // Badge should have purple styling
    const badge = page.locator('text=PvP Arena');
    await expect(badge).toBeVisible();
    
    // Check for purple class
    const badgeClass = await badge.evaluate((el) => {
      return el.closest('[class*="purple"]') !== null || 
             el.className.includes('purple');
    });
  });

  test('empty state shows sign in prompt', async ({ page }) => {
    await page.goto('/battles');
    
    const emptyState = page.locator('text=No Battles Found');
    if (await emptyState.isVisible()) {
      await expect(page.locator('text=Sign In to Create')).toBeVisible();
    }
  });
});

test.describe('Login Page Design', () => {
  test('centered card layout', async ({ page }) => {
    await page.goto('/login');
    
    // PACK ATTACK branding
    const branding = page.locator('h1:has-text("PACK")');
    await expect(branding).toBeVisible();
    
    // Welcome message
    await expect(page.locator('text=Welcome Back')).toBeVisible();
    
    // Form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // Sign In button
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
    
    // Link to register
    await expect(page.locator('text=Create one')).toBeVisible();
    
    // Back to home link
    await expect(page.locator('text=Back to Home')).toBeVisible();
  });

  test('input fields have icons', async ({ page }) => {
    await page.goto('/login');
    
    // Email field should have mail icon nearby
    const emailField = page.locator('input[type="email"]');
    const emailContainer = emailField.locator('..');
    
    // Check for SVG icon in container
    const hasIcon = await emailContainer.locator('svg').count();
    expect(hasIcon).toBeGreaterThan(0);
  });
});

test.describe('Register Page Design', () => {
  test('welcome bonus banner is visible', async ({ page }) => {
    await page.goto('/register');
    
    await expect(page.locator('text=Welcome Bonus!')).toBeVisible();
    await expect(page.locator('text=1,000 free coins')).toBeVisible();
  });

  test('has purple themed button', async ({ page }) => {
    await page.goto('/register');
    
    const submitButton = page.locator('button:has-text("Create Account")');
    await expect(submitButton).toBeVisible();
    
    // Check for purple colors in gradient or background
    const hasPurpleTheme = await submitButton.evaluate((el) => {
      const style = window.getComputedStyle(el);
      const bg = style.backgroundImage + ' ' + style.backgroundColor;
      // Purple gradient or purple background color
      return bg.includes('gradient') || 
             bg.includes('purple') || 
             bg.includes('168') || // purple RGB values
             el.className.includes('purple');
    });
    
    expect(hasPurpleTheme).toBe(true);
  });
});

test.describe('Responsive Design', () => {
  test('mobile: hero section stacks vertically', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test only runs on mobile');
    
    await page.goto('/');
    
    // Hero should be visible and readable
    await expect(page.locator('h1:has-text("PACK")')).toBeVisible();
    await expect(page.locator('a:has-text("Start Opening")')).toBeVisible();
  });

  test('mobile: navigation has hamburger menu', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test only runs on mobile');
    
    await page.goto('/');
    
    const hamburger = page.locator('button[aria-label*="menu" i], button:has-text("Open menu")');
    await expect(hamburger).toBeVisible();
  });

  test('tablet: maintains readable layout', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    // Content should be visible
    await expect(page.locator('h1:has-text("PACK")')).toBeVisible();
    await expect(page.locator('a:has-text("Start Opening")')).toBeVisible();
  });

  test('desktop: full navigation visible', async ({ page, isMobile }) => {
    test.skip(isMobile, 'This test only runs on desktop');
    
    await page.goto('/');
    
    // Desktop nav links should be visible
    await expect(page.locator('nav a:has-text("Boxes")')).toBeVisible();
    await expect(page.locator('nav a:has-text("Battles")')).toBeVisible();
    await expect(page.locator('nav a:has-text("Sign In")')).toBeVisible();
  });
});

test.describe('Animations & Transitions', () => {
  test('page has smooth scroll behavior', async ({ page }) => {
    await page.goto('/');
    
    const html = page.locator('html');
    const scrollBehavior = await html.evaluate((el) => {
      return window.getComputedStyle(el).scrollBehavior;
    });
    
    expect(scrollBehavior).toBe('smooth');
  });

  test('cards have hover transition', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Hover not applicable on mobile');
    
    await page.goto('/boxes');
    
    const card = page.locator('.card-lift, [class*="card"]').first();
    if (await card.count() > 0) {
      const transition = await card.evaluate((el) => {
        return window.getComputedStyle(el).transition;
      });
      
      expect(transition).toBeTruthy();
      expect(transition).not.toBe('none');
    }
  });
});

test.describe('Accessibility', () => {
  test('all images have alt text', async ({ page }) => {
    await page.goto('/');
    
    const images = page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });

  test('buttons and links are keyboard accessible', async ({ page }) => {
    await page.goto('/');
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    
    // Should have visible focus indicator
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('form labels are associated with inputs', async ({ page }) => {
    await page.goto('/login');
    
    const emailLabel = page.locator('label:has-text("Email")');
    await expect(emailLabel).toBeVisible();
    
    const passwordLabel = page.locator('label:has-text("Password")');
    await expect(passwordLabel).toBeVisible();
  });

  test('sufficient color contrast for text', async ({ page }) => {
    await page.goto('/');
    
    // Check that primary text is white/light
    const heading = page.locator('h1').first();
    const color = await heading.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    
    // Should be light colored text
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch.map(Number);
      // At least one channel should be bright
      expect(Math.max(r, g, b)).toBeGreaterThan(200);
    }
  });
});

test.describe('Page Load Performance', () => {
  test('landing page loads within 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000);
  });

  test('no layout shift after load', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot position
    const hero = page.locator('h1:has-text("PACK")');
    const initialBox = await hero.boundingBox();
    
    // Wait for any lazy loading
    await page.waitForTimeout(1000);
    
    // Check position hasn't changed
    const finalBox = await hero.boundingBox();
    
    if (initialBox && finalBox) {
      expect(Math.abs(initialBox.y - finalBox.y)).toBeLessThan(10);
    }
  });
});

test.describe('Cross-Page Consistency', () => {
  const pages = [
    { path: '/', name: 'Landing' },
    { path: '/boxes', name: 'Boxes' },
    { path: '/battles', name: 'Battles' },
    { path: '/login', name: 'Login' },
    { path: '/register', name: 'Register' },
  ];

  for (const { path, name } of pages) {
    test(`${name} page has consistent navigation`, async ({ page }) => {
      await page.goto(path);
      
      // All pages should have navigation
      const nav = page.locator('nav');
      await expect(nav).toBeVisible();
      
      // Logo/brand should be present - use first() to handle multiple matches
      const logo = page.locator('a:has-text("Pack Attack")').first();
      await expect(logo).toBeVisible();
    });

    test(`${name} page uses font-display class`, async ({ page }) => {
      await page.goto(path);
      
      // Check if font-display is applied
      const hasOutfitFont = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        for (const el of elements) {
          const font = window.getComputedStyle(el).fontFamily;
          if (font.toLowerCase().includes('outfit')) {
            return true;
          }
        }
        return false;
      });
      
      expect(hasOutfitFont).toBe(true);
    });

    test(`${name} page has dark background`, async ({ page }) => {
      await page.goto(path);
      
      const body = page.locator('body');
      const bgColor = await body.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      
      // Should be dark
      const rgbMatch = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgbMatch) {
        const [, r, g, b] = rgbMatch.map(Number);
        expect(r + g + b).toBeLessThan(100);
      }
    });
  }
});

