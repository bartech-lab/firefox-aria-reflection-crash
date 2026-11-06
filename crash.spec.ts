import { expect, test } from '@playwright/test';

const html = `<span id="l">Save</span><button id="b" aria-labelledby="l"></button>`;
const main = (page) => page.evaluate(() => document.getElementById('b').ariaLabelledByElements?.length);
const utility = (page) => page.getByRole('button', { name: 'Save' }).click({ trial: true });

test('main world, then utility world', async ({ page }) => {
  await page.setContent(html);
  await main(page);
  await utility(page);
});

test('utility world, then main world', async ({ page }) => {
  await page.setContent(html);
  await utility(page);
  await main(page);
});

test('control: main world twice', async ({ page }) => {
  await page.setContent(html);
  await main(page);
  await main(page);
});

test('control: utility world twice', async ({ page }) => {
  await page.setContent(html);
  await utility(page);
  await utility(page);
});

test('control: no aria-labelledby', async ({ page }) => {
  await page.setContent(`<button id="b">Save</button>`);
  await main(page);
  await utility(page);
});
