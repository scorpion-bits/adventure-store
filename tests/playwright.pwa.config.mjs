import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

// Testes do app instalável (PWA): constrói a versão autossuficiente e a serve com `vite preview` (é nela que o service worker existe).
const PRE = '/opt/pw-browsers/chromium';
const executablePath = process.env.PW_CHROMIUM ?? (existsSync(PRE) ? PRE : undefined);

export default defineConfig({
  testDir: './pwa',
  outputDir: './out/results-pwa',
  timeout: process.env.CI ? 60_000 : 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5198',
    launchOptions: {
      executablePath,
      args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 5198 --strictPort',
    url: 'http://localhost:5198',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    cwd: '..',
  },
});
