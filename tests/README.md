# Pack Attack Test Suite

This directory contains comprehensive cross-browser and mobile responsiveness tests using Playwright.

## Prerequisites

Before running tests, ensure you have installed the dependencies:

```bash
npm install
npx playwright install
```

## Test Files

| File | Description |
|------|-------------|
| `cross-browser.spec.ts` | Tests for cross-browser compatibility (Chrome, Firefox, Safari, Edge) |
| `mobile-responsive.spec.ts` | Tests for mobile device responsiveness and touch interactions |
| `accessibility.spec.ts` | Accessibility tests (keyboard navigation, ARIA, contrast) |
| `visual-regression.spec.ts` | Visual regression tests with screenshot comparisons |

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests with UI
```bash
npm run test:ui
```

### Run Tests in Headed Mode (see browser)
```bash
npm run test:headed
```

### Run Tests in Debug Mode
```bash
npm run test:debug
```

## Browser-Specific Tests

### Desktop Browsers
```bash
npm run test:chromium    # Chrome/Chromium
npm run test:firefox     # Firefox
npm run test:webkit      # Safari/WebKit
```

### Mobile Devices
```bash
npm run test:mobile      # iPhone & Android devices
npm run test:tablet      # iPad
```

## Test Categories

### Cross-Browser Tests
```bash
npm run test:cross-browser
```
Tests core functionality across all browsers:
- Page loading
- CSS rendering (flexbox, grid, animations)
- JavaScript functionality
- Performance

### Mobile Responsive Tests
```bash
npm run test:mobile-responsive
```
Tests mobile-specific features:
- Hamburger menu
- Touch interactions
- Layout responsiveness
- Safe area handling

### Accessibility Tests
```bash
npm run test:accessibility
```
Tests accessibility compliance:
- Keyboard navigation
- ARIA attributes
- Color contrast
- Screen reader compatibility

### Visual Regression Tests
```bash
npm run test:visual
```
Captures and compares screenshots:
- Desktop layouts
- Mobile layouts
- Component states

## Updating Snapshots

When UI changes are intentional, update the reference screenshots:

```bash
npm run test:update-snapshots
```

## Configuration

Test configuration is in `playwright.config.ts`:

- **Base URL**: `http://localhost:3000` (or `PLAYWRIGHT_BASE_URL` env var)
- **Browsers**: Chromium, Firefox, WebKit, Edge, Chrome
- **Devices**: Pixel 5, iPhone 12, iPad
- **Retries**: 2 on CI, 0 locally
- **Screenshots**: On failure
- **Traces**: On first retry

## CI/CD Integration

Tests are designed to run in CI environments:

```bash
# CI runs with:
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm test
```

The configuration:
- Automatically starts the dev server
- Runs tests sequentially on CI
- Captures traces and screenshots on failure
- Generates HTML report

## Test Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

Reports are saved in `playwright-report/`.

## Writing New Tests

### Test Structure
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page, isMobile }) => {
    // Skip on mobile if desktop-only
    test.skip(isMobile, 'Desktop only');
    
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });
});
```

### Mobile-Only Tests
```typescript
test('mobile menu works', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile only');
  // Test mobile-specific functionality
});
```

### Visual Comparisons
```typescript
test('page looks correct', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('page.png', {
    maxDiffPixelRatio: 0.1,
  });
});
```

## Troubleshooting

### Tests fail on first run
Visual regression tests will fail on first run because no baseline screenshots exist. Run `npm run test:update-snapshots` to create baselines.

### Browser not installed
Run `npx playwright install` to install required browsers.

### Dev server not starting
Ensure port 3000 is available or set `PLAYWRIGHT_BASE_URL` to your dev server URL.

### Flaky tests
- Increase timeouts in `playwright.config.ts`
- Add `await page.waitForLoadState('networkidle')` before assertions
- Use `expect(locator).toBeVisible()` with retries






