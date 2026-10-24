const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.CHROMIUM_EXECUTABLE }
      : {}),
    args: [
      "--no-sandbox",
      "--enable-unsafe-swiftshader",
      "--use-angle=swiftshader",
    ],
  });
  const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const base = process.env.FACE_TEST_URL || "http://127.0.0.1:4191";
  await page.goto(base + "/?art-review");
  await page.waitForFunction(() => window.__ART_REVIEW__);
  await page.waitForTimeout(600);
  await page.screenshot({ path: "test-results/face-review.png" });
  const review = await page.evaluate(() => window.__ART_REVIEW__);
  if (review.expressions.length !== 12) throw Error("missing expressions");
  await page.goto(base + "/?art-review&lighting=shadow");
  await page.waitForFunction(() => window.__ART_REVIEW__);
  await page.waitForTimeout(600);
  await page.screenshot({ path: "test-results/face-shadow.png" });
  await page.goto(base + "/?art-review&blink=closed");
  await page.waitForFunction(() => window.__ART_REVIEW__);
  await page.waitForTimeout(200);
  const closed = await page.evaluate(() => window.__ART_REVIEW__);
  if (closed.faces.some((f) => f.eyes.some(Boolean)))
    throw Error("visible iris in closed blink");
  await page.screenshot({ path: "test-results/face-closed.png" });
  await page.goto(base);
  await page.waitForFunction(() => window.__SHAROBESY__);
  await page.keyboard.press("Digit4");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "test-results/face-game.png" });
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    JSON.stringify({
      expressions: review.expressions.length,
      closedEyesHidden: true,
      gameStarted: true,
      errors,
    }),
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
