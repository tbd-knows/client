import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'off', screenshot: 'off', video: 'off' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/join',
    reuseExistingServer: false,
    env: {
      VITE_API_URL: 'https://api.example.test',
      VITE_SUPABASE_URL: 'https://auth.example.test',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fake',
    },
  },
});
