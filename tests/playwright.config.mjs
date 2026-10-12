import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

// No container o Chromium já vem instalado (não baixar outro); em outra máquina o Playwright usa o dele.
const PRE = '/opt/pw-browsers/chromium';
const executablePath = process.env.PW_CHROMIUM ?? (existsSync(PRE) ? PRE : undefined);

export default defineConfig({
  testDir: './e2e',
  outputDir: './out/results',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5199',
    launchOptions: {
      executablePath,
      // GL por software (sem GPU): o Pixi roda em WebGL via SwiftShader
      args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
    },
  },
  webServer: {
    command: 'npx vite --port 5199 --strictPort',
    url: 'http://localhost:5199',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    cwd: '..',
  },
});
