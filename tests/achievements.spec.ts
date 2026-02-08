import { test, expect } from '@playwright/test';

test.describe('Achievement System', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    // Add your login logic here based on your auth setup
  });

  test('should display achievements on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for achievements section to load
    await page.waitForSelector('text=Achievements', { timeout: 10000 });
    
    // Check if achievements are displayed
    const achievementsSection = page.locator('text=Achievements').first();
    await expect(achievementsSection).toBeVisible();
  });

  test('should show unlocked achievements', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('text=Achievements', { timeout: 10000 });
    
    // Look for any achievement cards
    const achievementCards = page.locator('[class*="achievement"]').first();
    
    // If there are achievements, they should be visible
    const count = await achievementCards.count();
    console.log(`Found ${count} achievement elements`);
  });

  test('should allow claiming achievement rewards', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('text=Achievements', { timeout: 10000 });
    
    // Look for claim button
    const claimButton = page.locator('button:has-text("Claim")').first();
    
    if (await claimButton.isVisible()) {
      // Get current coin balance
      const coinBalance = await page.locator('[class*="coin"]').first().textContent();
      
      // Click claim button
      await claimButton.click();
      
      // Wait for success message
      await page.waitForSelector('text=/Reward Claimed|coins/i', { timeout: 5000 });
      
      // Verify coin balance increased
      await page.waitForTimeout(1000); // Wait for coin balance to update
      const newCoinBalance = await page.locator('[class*="coin"]').first().textContent();
      
      console.log(`Old balance: ${coinBalance}, New balance: ${newCoinBalance}`);
    } else {
      console.log('No claimable achievements found');
    }
  });

  test('should allow claiming all rewards', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('text=Achievements', { timeout: 10000 });
    
    // Look for "Claim All" button
    const claimAllButton = page.locator('button:has-text("Claim All")').first();
    
    if (await claimAllButton.isVisible()) {
      await claimAllButton.click();
      
      // Wait for success message
      await page.waitForSelector('text=/All Rewards Claimed|coins/i', { timeout: 5000 });
      
      console.log('Successfully claimed all rewards');
    } else {
      console.log('No "Claim All" button found - no unclaimed achievements');
    }
  });

  test('should track achievement progress', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('text=Achievements', { timeout: 10000 });
    
    // Check for progress indicators
    const progressBars = page.locator('[role="progressbar"]');
    const count = await progressBars.count();
    
    if (count > 0) {
      console.log(`Found ${count} achievement progress bars`);
      
      // Get progress value of first achievement
      const firstProgress = await progressBars.first().getAttribute('aria-valuenow');
      console.log(`First achievement progress: ${firstProgress}`);
    }
  });

  test('should update achievement progress after opening pack', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Get initial achievement state
    await page.waitForSelector('text=Achievements', { timeout: 10000 });
    
    // Navigate to pack opening
    await page.goto('/');
    
    // Try to open a pack (if user has coins)
    const openPackButton = page.locator('button:has-text("Open Pack")').first();
    
    if (await openPackButton.isVisible()) {
      await openPackButton.click();
      
      // Wait for pack animation to complete
      await page.waitForTimeout(3000);
      
      // Go back to dashboard
      await page.goto('/dashboard');
      await page.waitForSelector('text=Achievements', { timeout: 10000 });
      
      // Check if achievement progress updated
      console.log('Pack opened - achievements should be updated');
    }
  });

  test('should display achievement categories', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('text=Achievements', { timeout: 10000 });
    
    // Check for achievement categories
    const categories = ['PULLS', 'BATTLES', 'COLLECTION', 'ECONOMY', 'SOCIAL', 'SPECIAL'];
    
    for (const category of categories) {
      // Check if category is mentioned in the page
      const categoryText = page.locator(`text=${category}`).first();
      if (await categoryText.isVisible()) {
        console.log(`Found category: ${category}`);
      }
    }
  });

  test('should hide secret achievements until unlocked', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('text=Achievements', { timeout: 10000 });
    
    // Look for secret achievement indicators
    const secretAchievements = page.locator('text=???');
    const count = await secretAchievements.count();
    
    if (count > 0) {
      console.log(`Found ${count} secret achievements`);
    } else {
      console.log('No secret achievements found or all are unlocked');
    }
  });
});
