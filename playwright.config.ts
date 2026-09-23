import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/visual",
  timeout: 360000,
  expect: { timeout: 30000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173/birthday-card/",
    headless: true,
    trace: "retain-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
      args: [
        "--no-sandbox",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
  },
  webServer: {
    command:
      "npm run build:review && npm run preview -- --host 127.0.0.1 --port 4173 --outDir .asset-build/visual-site",
    url: "http://127.0.0.1:4173/birthday-card/",
    reuseExistingServer: false,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    {
      name: "mobile-390",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        deviceScaleFactor: 1,
      },
    },
    {
      name: "mobile-430",
      use: {
        viewport: { width: 430, height: 932 },
        isMobile: true,
        deviceScaleFactor: 1,
      },
    },
  ],
});
