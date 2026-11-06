import { defineConfig, devices } from '@playwright/test';
export default defineConfig({ testDir: '.', reporter: 'line', timeout: 10_000, workers: 1, retries: 0, projects: [{ name: 'firefox', use: { ...devices['Desktop Firefox'] } }, { name: 'chromium', use: { ...devices['Desktop Chrome'] } }, { name: 'webkit', use: { ...devices['Desktop Safari'] } }] });
