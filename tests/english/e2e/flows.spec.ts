import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
let browserErrors: string[] = [];
test.beforeEach(async ({ page }) => {
  browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().includes("Failed to load resource")
    )
      browserErrors.push(message.text());
  });
});
test.afterEach(async () => {
  expect(browserErrors, "Browser runtime / hydration / React errors").toEqual(
    [],
  );
});
async function login(page: Page, name = "learner") {
  await page.goto("/login");
  await page.getByLabel("อีเมล (Email)").fill(`${name}@example.test`);
  await page.getByLabel("รหัสผ่าน (Password)").fill("local-fixture-password");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await page.waitForURL("**/profile");
  await page
    .getByRole("link", { name: /English Mastery$/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your learning path" }),
  ).toBeVisible({ timeout: 15000 });
  await page.getByText("More ways to practise", { exact: true }).click();
}
test("host login → native lesson → practice → remediation → retrieval; @a11y", async ({
  page,
}) => {
  await login(page);
  await expect(
    page.getByRole("link", { name: "สร้างแผนใหม่", exact: true }),
  ).toBeVisible();
  await page.locator('a[href="/english/units/A1-02"]').click();
  await expect(
    page.getByText("A1-02 · Greetings & Introductions", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Mark lesson complete" })
    .first()
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Lesson completion saved",
  );
  await page
    .getByRole("button", { name: /Practise V05\-Q\-A1\-02\-001$/ })
    .click();
  await page.getByLabel(/Your response$/).fill("Goodbye");
  await page.getByRole("button", { name: "Save now" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  await page.reload();
  await expect(page.getByLabel(/Your response$/)).toHaveValue(
    "Goodbye",
  );
  await page.getByRole("button", { name: "Submit final response" }).click();
  await expect(page.getByText("SCORED · Score 0")).toBeVisible();
  await expect(
    page.getByText("Revisit:", { exact: false }).first(),
  ).toBeVisible();
  await page.getByRole("link", { name: /Spaced review$/ }).click();
  await expect(
    page.getByRole("button", { name: "Retrieve again" }).first(),
  ).toBeVisible();
  await expect(page).toHaveTitle(/English Mastery/);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
test("writing autosave survives reload and final submission locks edits", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: /Writing$/ }).click();
  await page
    .locator("article").filter({ hasText: "A1-02" }).getByRole("button", { name: /Start Writing$/ })
    .click();
  await page.getByLabel("Plan your response").fill("Introduce name and home.");
  await page
    .getByLabel(/Your response$/)
    .fill("My name is Mina. I am from Thailand. I am a student.");
  await expect(page.getByRole("status")).toContainText("Saved");
  await page.reload();
  await expect(page.getByLabel(/Your response$/)).toHaveValue(
    "My name is Mina. I am from Thailand. I am a student.",
  );
  await page
    .getByRole("button", { name: "Show saved writing history" })
    .click();
  await expect(page.getByText("Saved ", { exact: false }).last()).toBeVisible();
  await page.getByRole("button", { name: "Submit final response" }).click();
  await expect(page.getByText("PENDING_HUMAN", { exact: true })).toBeVisible();
  await expect(
    page.getByLabel(/Your response$/),
  ).toBeDisabled();
});
test("private speaking upload, playback and explicit owner deletion", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: /Speaking$/ }).click();
  await page
    .locator("article").filter({ hasText: "A1-02" }).getByRole("button", { name: /Start Speaking$/ })
    .click();
  await page.getByRole("checkbox").check();
  const bytes = Buffer.alloc(16044);
  bytes.write("RIFF");
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WAVE", 8);
  bytes.write("fmt ", 12);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(8000, 24);
  bytes.writeUInt32LE(16000, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(16000, 40);
  await page
    .getByLabel("Or choose an audio file")
    .setInputFiles({ name: "test.wav", mimeType: "audio/wav", buffer: bytes });
  await page.getByRole("button", { name: "Upload private recording" }).click();
  await expect(
    page.getByText(/Private recording saved$/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Play saved recording" }).click();
  await expect(page.locator("audio")).toHaveAttribute(
    "src",
    /\/storage\/v1\/object\/sign\//,
  );
  await page.getByRole("button", { name: "Submit final response" }).click();
  await expect(page.getByText("PENDING_HUMAN", { exact: true })).toBeVisible();
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete my recording" }).click();
  await expect(
    page.getByText(/Recording deleted\.$/).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Play saved recording" }),
  ).toHaveCount(0);
});
test("review workflow stays gated; host dashboard and logout remain reachable", async ({
  page,
}) => {
  await login(page, "reviewer");
  await page.getByRole("link", { name: /Human review$/ }).click();
  const review = page
    .locator("details.emh-card")
    .filter({ has: page.locator("summary", { hasText: "A1-02 · 0.6.0" }) })
    .first();
  await review.locator("summary").first().click();
  await expect(
    review.getByRole("button", { name: "Publish eligible version" }),
  ).toBeDisabled();
  await review
    .getByLabel("Review notes / evidence (at least 20 characters)")
    .fill(
      "TEST FIXTURE ONLY: request language revision, not actual human approval.",
    );
  await review.getByRole("checkbox").check();
  await review.getByRole("button", { name: "Record human review" }).click();
  await expect(
    review.getByRole("button", { name: "Publish eligible version" }),
  ).toBeDisabled();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/dashboard/);
  await expect(
    page.getByRole("link", { name: /English Mastery$/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "ออกจากระบบ", exact: true }).click();
  await page.waitForURL("**/login");
  await page.goto("/english");
  await page.waitForURL(/login/);
});
test("mobile layout and access-denied API @a11y", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const result = await page.evaluate(async () => {
    const r = await fetch("/api/english/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionId: "UNIT-A1-02-PILOT@0.6.0" }),
    });
    return { status: r.status, body: await r.json() };
  });
  expect(result.status).toBe(403);
  // A scrolled navigation target must remain clear of the host header on mobile.
  const examLink = page.getByRole("link", {
    name: /Exam simulation$/,
  });
  const targetIsClear = await examLink.evaluate((link) => {
    link.scrollIntoView({ block: "start" });
    const target = link.getBoundingClientRect();
    const header = document.querySelector("header")!.getBoundingClientRect();
    return target.top >= header.bottom || target.bottom <= header.top;
  });
  expect(
    targetIsClear,
    "Mobile navigation must not be hidden by the header",
  ).toBe(true);
  await expect(page).toHaveTitle(/English Mastery/);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/emh-mobile.png",
    fullPage: true,
  });
});

test("author creates a separate pre-human revision without changing prior version", async ({
  page,
}) => {
  await login(page, "author");
  await page.getByRole("link", { name: /Authoring$/ }).click();
  const revision = page
    .locator("details.emh-card")
    .filter({
      has: page.locator("summary", { hasText: "A1-02 · Revise 0.6.0" }),
    })
    .first();
  await revision.locator("summary").click();
  const input = revision.getByLabel("Versioned content JSON"),
    payload = JSON.parse(await input.inputValue());
  payload.version = "0.6.1";
  payload.title += " — browser test only";
  await input.fill(JSON.stringify(payload));
  await revision
    .getByLabel("Change reason / review response")
    .fill("TEST FIXTURE ONLY: new version, never actual human approval.");
  await revision
    .getByRole("button", { name: "Create immutable pre-human revision" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "PRE_HUMAN_CONTENT_COMPLETE",
  );
  await expect(
    page.getByText("A1-02 · Revise 0.6.1", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("A1-02 · Revise 0.6.0", { exact: true }),
  ).toBeVisible();
});

test("draft exam simulation freezes profile and locks sequential navigation", async ({
  page,
}) => {
  await login(page, "author");
  const result = await page.evaluate(async () => {
    async function call(operation: string, body: unknown) {
      const r = await fetch(`/api/english/${operation}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return r.json();
    }
    const content = await call("content", { unitId: "A1-02" }),
      itemIds = content.data.practice.slice(0, 2).map((i: any) => i.stableId);
    return call("createProfile", {
      id: "BROWSER-TEST",
      provider: "CAMBRIDGE",
      name: "TEST ONLY — not official specifications",
      level: "A1",
      version: "1.0.0",
      sourceUrl: "https://www.cambridgeenglish.org/",
      checkedDate: "2026-01-01",
      timeLimitSeconds: 60,
      itemIds,
      sections: [{ name: "TEST ONLY", itemIds }],
      navigation: "SEQUENTIAL",
      replayLimit: 0,
    });
  });
  expect(result.success).toBe(true);
  await page
    .getByRole("link", { name: /Exam simulation$/ })
    .click();
  await page.getByLabel("Exam profile").selectOption("BROWSER-TEST@1.0.0");
  await page
    .locator("article").filter({ hasText: "A1-02" }).getByRole("button", { name: /Start Exam simulation$/ })
    .click();
  await page.getByLabel(/Your response$/).fill("Hello");
  await page
    .getByRole("button", {
      name: "Save and move to next task — previous task locks",
    })
    .click();
  await expect(
    page.getByRole("status"),
  ).toBeVisible();
  await expect(page.getByRole("group", { name: /Task \d/ })).toHaveCount(1);
  await expect(page.getByRole("group", { name: /Task \d/ })).toHaveAccessibleName(/Task 2/);
  await page.getByLabel(/Your response$/).fill("Mina");
  await page.getByRole("button", { name: "Submit final response" }).click();
  await expect(page.getByRole("status")).toContainText("Submitted");
  await expect(page.getByRole("group", { name: /Task \d/ })).toHaveCount(2);
});

test("operator invites and revokes an existing user without changing host role", async ({
  page,
  browser,
}) => {
  await login(page, "author");
  await page.getByRole("link", { name: /Administration$/ }).click();
  await page
    .getByLabel("Existing user UUID")
    .fill("00000000-0000-4000-8000-000000000002");
  await page.getByLabel("Permission").selectOption("english.preview");
  await page.getByLabel("Units (comma-separated IDs, or *)").fill("A1-02");
  await page.getByRole("button", { name: "Grant scoped permission" }).click();
  await expect(page.getByRole("status")).toContainText("english.preview");
  const otherContext = await browser.newContext({
      baseURL: "http://127.0.0.1:3188",
    }),
    other = await otherContext.newPage();
  try {
    await login(other, "other");
    await other.locator('.emh-unit-card a[href="/english/units/A1-02"]').click();
    await expect(other.getByText(/^A1-02 · Greetings & Introductions/)).toBeVisible();
    page.on("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Revoke selected permission" })
      .click();
    await expect(page.getByRole("status")).toContainText("revoked");
    await other.reload();
    await expect(other.locator(".emh").getByRole("alert")).toContainText("ยังไม่เปิดให้บัญชีนี้เรียน");
  } finally {
    await otherContext.close();
  }
});
