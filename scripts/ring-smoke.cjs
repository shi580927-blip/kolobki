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
  const page = await b.newPage({
    viewport: { width: 1280, height: 720 },
    hasTouch: true,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.GAME_TEST_URL || "http://127.0.0.1:4173");
  await page.waitForFunction(() => window.__SHAROBESY__);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 110, y: 560 }],
  });
  let state;
  for (let i = 0; i < 80; i++) {
    state = await page.evaluate(() => window.__SHAROBESY__);
    if (state.rings.count > 0) break;
    const dx = -state.position[0] - 0.6 * state.velocity.x,
      dz = -8 - state.position[2] - 0.6 * state.velocity.z;
    const n = Math.max(1, Math.hypot(dx, dz)),
      f = state.viewForward,
      fn = Math.hypot(f[0], f[2]),
      fx = f[0] / fn,
      fz = f[2] / fn;
    const x = (-fz * dx + fx * dz) / n,
      z = -(fx * dx + fz * dz) / n;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 110 + x * 60, y: 560 + z * 60 }],
    });
    await page.waitForTimeout(120);
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  if (state.rings.count < 1)
    throw Error("failed to drive through first ring: " + JSON.stringify(state));
  const counter = await page.locator("#ring-count").textContent();
  if (!counter.includes("1 / 12")) throw Error("counter failed: " + counter);
  await page.screenshot({ path: "test-results/ring-collected.png" });
  await page.click("#reset");
  await page.waitForTimeout(100);
  if ((await page.evaluate(() => window.__SHAROBESY__.rings.count)) !== 0)
    throw Error("reset failed");
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    JSON.stringify({
      ringCount: state.rings.count,
      counter,
      position: state.position,
      resetCount: 0,
      errors,
    }),
  );
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
