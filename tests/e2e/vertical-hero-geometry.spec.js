import { test, expect } from '@playwright/test';

test('vertical hero search controls stay inside the form from tablet through desktop', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');

  for (const width of [768, 820, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/motor');
    const form = page.getByTestId('vertical-hero-search-form');
    await expect(form).toBeVisible();

    const geometry = await form.evaluate(element => {
      const formRect = element.getBoundingClientRect();
      return {
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        left: formRect.left,
        right: formRect.right,
        children: [...element.children].map(child => {
          const rect = child.getBoundingClientRect();
          return { left: rect.left, right: rect.right, width: rect.width };
        }),
      };
    });

    expect(geometry.scrollWidth, `form scroll width at ${width}px`).toBeLessThanOrEqual(geometry.clientWidth + 1);
    for (const child of geometry.children) {
      expect(child.left, `child left edge at ${width}px`).toBeGreaterThanOrEqual(geometry.left - 1);
      expect(child.right, `child right edge at ${width}px`).toBeLessThanOrEqual(geometry.right + 1);
      expect(child.width, `child width at ${width}px`).toBeGreaterThan(0);
    }
  }
});
