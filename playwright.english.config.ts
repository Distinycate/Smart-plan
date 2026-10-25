import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/english/e2e",
  workers: 1,
  timeout: 90000,
  use: {
    baseURL: "http://127.0.0.1:3188",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  reporter: "list",
});
