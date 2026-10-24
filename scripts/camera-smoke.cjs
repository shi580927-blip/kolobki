const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({
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
  const page = await b.newPage({ viewport: { width: 1280, height: 720 } }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.CAMERA_TEST_URL || "http://127.0.0.1:4173");
  await page.waitForFunction(() => window.__SHAROBESY__);
  await page.waitForTimeout(400);
  const start = await page.evaluate(() => window.__SHAROBESY__);
  await page.mouse.move(640, 300);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(900, 200, { steps: 8 });
  await page.mouse.up({ button: "middle" });
  await page.waitForTimeout(250);
  const dragged = await page.evaluate(() => window.__SHAROBESY__);
  if (!dragged.freeOrbit || Math.abs(dragged.orbitYaw - start.orbitYaw) < 0.1)
    throw Error("middle drag failed: "+JSON.stringify({start,dragged}));
  await page.mouse.move(600, 400, { steps: 4 });
  const released = await page.evaluate(() => window.__SHAROBESY__);
  if (released.orbitYaw !== dragged.orbitYaw)
    throw Error("orbit still dragging after release");
  await page.keyboard.press("Digit1");
  const preset = await page.evaluate(() => window.__SHAROBESY__);
  if (preset.freeOrbit || preset.camera !== 0)
    throw Error("preset reset failed");
  await page.mouse.move(640, 300);
  await page.mouse.down({ button: "left" });
  await page.mouse.move(850, 350, { steps: 4 });
  await page.mouse.up({ button: "left" });
  if (await page.evaluate(() => window.__SHAROBESY__.freeOrbit))
    throw Error("left drag must not orbit");
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    JSON.stringify({
      middleDrag: dragged.freeOrbit,
      orbitYaw: dragged.orbitYaw,
      orbitPitch: dragged.orbitPitch,
      releaseStops: true,
      presetRestored: true,
      leftDragIgnored: true,
      errors,
    }),
  );
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
