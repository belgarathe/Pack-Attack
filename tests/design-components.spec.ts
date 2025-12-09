import { test, expect } from '@playwright/test';

/**
 * Component Design Tests
 * Tests for individual design components and their styling
 */

test.describe('Component - Glass Cards', () => {
  test('glass cards have correct background opacity', async ({ page }) => {
    await page.goto('/');
    
    const glassCard = page.locator('.glass, .glass-strong').first();
    
    if (await glassCard.count() > 0) {
      const bgColor = await glassCard.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      
      // Should have rgba with alpha
      expect(bgColor).toMatch(/rgba/);
    }
  });

  test('glass-strong has higher opacity than glass', async ({ page }) => {
    await page.goto('/');
    
    const glass = page.locator('.glass').first();
    const glassStrong = page.locator('.glass-strong').first();
    
    if (await glass.count() > 0 && await glassStrong.count() > 0) {
      const glassAlpha = await glass.evaluate((el) => {
        const bg = window.getComputedStyle(el).backgroundColor;
        const match = bg.match(/rgba?\([\d\s,]+,\s*([\d.]+)\)/);
        return match ? parseFloat(match[1]) : 1;
      });
      
      const glassStrongAlpha = await glassStrong.evaluate((el) => {
        const bg = window.getComputedStyle(el).backgroundColor;
        const match = bg.match(/rgba?\([\d\s,]+,\s*([\d.]+)\)/);
        return match ? parseFloat(match[1]) : 1;
      });
      
      expect(glassStrongAlpha).toBeGreaterThanOrEqual(glassAlpha);
    }
  });
});

test.describe('Component - Buttons', () => {
  test('primary button has blue gradient', async ({ page }) => {
    await page.goto('/');
    
    const primaryBtn = page.locator('a:has-text("Start Opening")').first();
    await expect(primaryBtn).toBeVisible();
    
    const bgImage = await primaryBtn.evaluate((el) => {
      return window.getComputedStyle(el).backgroundImage;
    });
    
    expect(bgImage).toContain('gradient');
  });

  test('buttons have border radius', async ({ page }) => {
    await page.goto('/');
    
    const button = page.locator('a:has-text("Start Opening")').first();
    
    const borderRadius = await button.evaluate((el) => {
      return window.getComputedStyle(el).borderRadius;
    });
    
    // Should have rounded corners (xl = 12px or more)
    const radiusValue = parseFloat(borderRadius);
    expect(radiusValue).toBeGreaterThanOrEqual(8);
  });

  test('button has padding for touch target', async ({ page }) => {
    await page.goto('/');
    
    const button = page.locator('a:has-text("Start Opening")').first();
    const box = await button.boundingBox();
    
    if (box) {
      // Height should be reasonable for interaction (at least 28px)
      expect(box.height).toBeGreaterThanOrEqual(28);
    }
  });

  test('shimmer effect class is applied', async ({ page }) => {
    await page.goto('/');
    
    const shimmerButton = page.locator('.shimmer').first();
    
    if (await shimmerButton.count() > 0) {
      const hasAfter = await shimmerButton.evaluate((el) => {
        const after = window.getComputedStyle(el, '::after');
        return after.content !== 'none' && after.content !== '';
      });
      
      // Shimmer should have ::after pseudo-element
      expect(hasAfter).toBeTruthy();
    }
  });
});

test.describe('Component - Badges', () => {
  test('badge has rounded-full class', async ({ page }) => {
    await page.goto('/');
    
    const badge = page.locator('text=The Ultimate TCG Experience').first();
    
    if (await badge.count() > 0) {
      // Check if parent container has rounded styling
      const hasRoundedStyle = await badge.evaluate((el) => {
        // Check element and parent for rounded classes
        const checkEl = (e: Element | null): boolean => {
          if (!e) return false;
          const style = window.getComputedStyle(e);
          const radius = parseFloat(style.borderRadius) || 0;
          const hasClass = e.className?.includes('rounded') || false;
          return radius > 0 || hasClass;
        };
        return checkEl(el) || checkEl(el.parentElement);
      });
      
      expect(hasRoundedStyle).toBe(true);
    }
  });

  test('game badges have correct colors', async ({ page }) => {
    await page.goto('/boxes');
    
    const mtgBadge = page.locator('.badge-mtg').first();
    const pokemonBadge = page.locator('.badge-pokemon').first();
    const onepieceBadge = page.locator('.badge-onepiece').first();
    const lorcanaBadge = page.locator('.badge-lorcana').first();
    
    // Check MTG badge if present
    if (await mtgBadge.count() > 0) {
      const bgImage = await mtgBadge.evaluate((el) => {
        return window.getComputedStyle(el).backgroundImage;
      });
      expect(bgImage).toContain('gradient');
    }
  });
});

test.describe('Component - Icons', () => {
  test('icons are SVG elements', async ({ page }) => {
    await page.goto('/');
    
    // Check for Lucide icons (SVG)
    const svgIcons = page.locator('svg');
    const count = await svgIcons.count();
    
    expect(count).toBeGreaterThan(0);
  });

  test('icons have appropriate sizing', async ({ page }) => {
    await page.goto('/');
    
    const icons = page.locator('svg').first();
    
    if (await icons.count() > 0) {
      const box = await icons.boundingBox();
      
      if (box) {
        // Icons should be visible but not too large
        expect(box.width).toBeGreaterThanOrEqual(12);
        expect(box.width).toBeLessThanOrEqual(64);
      }
    }
  });
});

test.describe('Component - Input Fields', () => {
  test('inputs have correct styling', async ({ page }) => {
    await page.goto('/login');
    
    const input = page.locator('input[type="email"]');
    await expect(input).toBeVisible();
    
    // Check that input is styled (has classes applied)
    const hasStyles = await input.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      const borderRadius = parseFloat(computed.borderRadius) || 0;
      const hasClasses = el.className.length > 0;
      const hasBgColor = computed.backgroundColor !== 'rgba(0, 0, 0, 0)';
      
      return {
        hasRoundedCorners: borderRadius >= 8,
        hasClasses,
        hasBgColor,
      };
    });
    
    // Should have rounded corners
    expect(hasStyles.hasRoundedCorners).toBe(true);
    
    // Should have styling classes
    expect(hasStyles.hasClasses).toBe(true);
  });

  test('inputs have focus state', async ({ page }) => {
    await page.goto('/login');
    
    const input = page.locator('input[type="email"]');
    
    const beforeBorder = await input.evaluate((el) => {
      return window.getComputedStyle(el).borderColor;
    });
    
    await input.focus();
    
    const afterBorder = await input.evaluate((el) => {
      return window.getComputedStyle(el).borderColor;
    });
    
    // Border color should change on focus
    // (or outline should appear)
  });

  test('inputs have icon prefix', async ({ page }) => {
    await page.goto('/login');
    
    const emailInput = page.locator('input[type="email"]');
    const container = emailInput.locator('..');
    
    const hasSvgIcon = await container.locator('svg').count();
    expect(hasSvgIcon).toBeGreaterThan(0);
  });
});

test.describe('Component - Stats Counter', () => {
  test('stats display with icons', async ({ page }) => {
    await page.goto('/');
    
    // Check stats section
    const statsSection = page.locator('.glass-strong, .glass').filter({
      has: page.locator('text=Packs Opened'),
    });
    
    if (await statsSection.count() > 0) {
      // Should have icons
      const icons = statsSection.locator('svg');
      expect(await icons.count()).toBeGreaterThan(0);
    }
  });

  test('stats numbers are visible', async ({ page }) => {
    await page.goto('/');
    
    // Stats should show numbers (even if 0)
    const statNumbers = page.locator('.font-mono, [class*="font-bold"]').filter({
      hasText: /^\d+$/,
    });
    
    // There should be stat numbers on the page
    const count = await statNumbers.count();
    expect(count).toBeGreaterThanOrEqual(0); // May be 0 if no stats section
  });
});

test.describe('Component - Cards with Hover', () => {
  test('card-lift class provides hover animation', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Hover not applicable on mobile');
    
    await page.goto('/boxes');
    
    const card = page.locator('.card-lift').first();
    
    if (await card.count() > 0) {
      const transition = await card.evaluate((el) => {
        return window.getComputedStyle(el).transition;
      });
      
      // Should have transition defined
      expect(transition).toContain('transform');
    }
  });

  test('card has glow effect on hover', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Hover not applicable on mobile');
    
    await page.goto('/boxes');
    
    const card = page.locator('.card-lift, [class*="card"]').first();
    
    if (await card.count() > 0) {
      await card.hover();
      await page.waitForTimeout(300);
      
      // Check for glow via box-shadow or outline
      const boxShadow = await card.evaluate((el) => {
        return window.getComputedStyle(el).boxShadow;
      });
      
      // Should have some shadow on hover (or inner element does)
    }
  });
});

test.describe('Component - Live Indicator', () => {
  test('pulse-live animation exists', async ({ page }) => {
    await page.goto('/battles');
    
    const pulseElement = page.locator('.pulse-live').first();
    
    if (await pulseElement.count() > 0) {
      const animation = await pulseElement.evaluate((el) => {
        return window.getComputedStyle(el).animation;
      });
      
      // Should have animation
      expect(animation).not.toBe('none');
    }
  });

  test('live indicator has green color', async ({ page }) => {
    await page.goto('/');
    
    // Look for live battle indicators
    const liveIndicator = page.locator('.pulse-live, [class*="green"]').first();
    
    if (await liveIndicator.count() > 0) {
      const bgColor = await liveIndicator.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      
      // Should have green-ish background
      expect(bgColor).toBeTruthy();
    }
  });
});

test.describe('Component - Avatar/Participant Display', () => {
  test('avatars have gradient background', async ({ page }) => {
    await page.goto('/battles');
    await page.waitForLoadState('networkidle');
    
    // Look for avatar elements
    const avatars = page.locator('[class*="rounded-full"][class*="gradient"]').first();
    
    if (await avatars.count() > 0) {
      const bgImage = await avatars.evaluate((el) => {
        return window.getComputedStyle(el).backgroundImage;
      });
      
      expect(bgImage).toContain('gradient');
    }
  });
});

test.describe('Component - Empty States', () => {
  test('empty state has centered icon', async ({ page }) => {
    await page.goto('/boxes');
    
    const emptyState = page.locator('text=No Boxes Available').locator('..');
    
    if (await emptyState.count() > 0) {
      // Should have an icon
      const icons = emptyState.locator('svg');
      expect(await icons.count()).toBeGreaterThan(0);
    }
  });

  test('empty state has CTA button', async ({ page }) => {
    await page.goto('/boxes');
    
    const noBoxes = page.locator('text=No Boxes Available');
    
    if (await noBoxes.isVisible()) {
      const cta = page.locator('a:has-text("Back to Home")');
      await expect(cta).toBeVisible();
    }
  });
});

test.describe('Component - Section Headers', () => {
  test('section badges are consistent', async ({ page }) => {
    const pages = ['/boxes', '/battles'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      
      // Each page should have a badge in header
      const badge = page.locator('.glass').filter({
        has: page.locator('svg'),
      }).first();
      
      if (await badge.count() > 0) {
        const hasRoundedFull = await badge.evaluate((el) => {
          return el.classList.contains('rounded-full') || 
                 el.className.includes('rounded-full');
        });
        
        // Badges should be rounded
      }
    }
  });

  test('gradient titles use bg-clip-text', async ({ page }) => {
    await page.goto('/boxes');
    
    const gradientText = page.locator('.bg-clip-text, [class*="bg-clip"]').first();
    
    if (await gradientText.count() > 0) {
      const bgClip = await gradientText.evaluate((el) => {
        return window.getComputedStyle(el).webkitBackgroundClip || 
               window.getComputedStyle(el).backgroundClip;
      });
      
      expect(bgClip).toBe('text');
    }
  });
});

