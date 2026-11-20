import { defineConfig, devices } from '@playwright/test';

const chromiumArgs = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'];
const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: false, hasTouch: true };
const desktop = { viewport: { width: 1280, height: 800 } };

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  globalSetup: './e2e/global-setup.ts',
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: 4,
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'off',
    permissions: ['camera', 'clipboard-read', 'clipboard-write'],
    launchOptions: { args: chromiumArgs },
    acceptDownloads: true,
  },
  webServer: {
    command: 'npm run build:demo && npx vite preview --outDir dist-demo --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: 'mobile-light', use: { ...devices['Desktop Chrome'], ...mobile, colorScheme: 'light' }, testIgnore: /coverage\.spec/ },
    { name: 'desktop-dark', use: { ...devices['Desktop Chrome'], ...desktop, colorScheme: 'dark' }, testIgnore: /coverage\.spec/ },
    { name: 'mobile-dark', use: { ...devices['Desktop Chrome'], ...mobile, colorScheme: 'dark' }, testMatch: /(a11y|screens)\.spec/ },
    { name: 'desktop-light', use: { ...devices['Desktop Chrome'], ...desktop, colorScheme: 'light' }, testMatch: /(a11y|screens)\.spec/ },
    { name: 'coverage', testMatch: /coverage\.spec/, dependencies: ['mobile-light', 'desktop-dark', 'mobile-dark', 'desktop-light'] },
  ],
});
