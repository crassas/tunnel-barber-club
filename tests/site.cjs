const { chromium } = require(
  process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
    ? process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + "/playwright"
    : "playwright",
);
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.BROWSER_EXECUTABLE || undefined,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:8765");
  await page.locator(".service-details").first().focus();
  await page.keyboard.press("Enter");
  assert.equal(
    await page.locator("dialog").evaluate((x) => x.open),
    true,
    "Keyboard opens service details",
  );
  assert.match(await page.locator("#modalTitle").textContent(), /Cabelo/);
  assert.match(await page.locator("#modalPrice").textContent(), /25/);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("dialog").evaluate((x) => x.open), false);
  await page.locator(".menu-toggle").click();
  assert.equal(
    await page.locator(".menu-toggle").getAttribute("aria-expanded"),
    "true",
  );
  await page.keyboard.press("Escape");
  assert.equal(
    await page.locator(".menu-toggle").getAttribute("aria-expanded"),
    "false",
  );
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `No overflow at ${width}`,
    );
  }
  assert.equal(await page.locator(".service-details").count(), 7);
  const expected = ["25€", "10€", "17,5€", "10€", "12,5€", "55€", "65€"];
  for (let i = 0; i < 7; i++) {
    await page.locator(".service-details").nth(i).click();
    assert.equal(await page.locator("#modalPrice").textContent(), expected[i]);
    await page.locator(".modal-book").click();
    assert.equal(await page.locator("dialog").evaluate((x) => x.open), false);
    assert.equal(new URL(page.url()).hash, "#contactos");
  }

  assert.equal(await page.locator(".brand svg").count(), 0, "No invented logo");
  assert.equal(
    await page.locator(".modal-book").getAttribute("href"),
    "#contactos",
  );
  assert.match(await page.locator(".modal-book").textContent(), /contacto/i);
  await browser.close();
  console.log(
    "PASS: keyboard service dialogs, Escape, mobile menu, 4 viewport sizes, 7 services, honest CTA, no invented logo",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
