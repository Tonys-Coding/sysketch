import { test, expect } from '@playwright/test';

// Proves Playwright can load and measure an inline SVG. Real diagram
// visual checks will replace this once the renderer exists.
test('chromium renders inline svg', async ({ page }) => {
  await page.setContent(
    '<svg id="d" width="120" height="60" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="60" rx="12" fill="#cfe8ff"/></svg>',
  );
  const box = await page.locator('#d').boundingBox();
  expect(box?.width).toBe(120);
});
