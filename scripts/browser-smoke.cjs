const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
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
    acceptDownloads: true,
    hasTouch: true,
  });
  page.setDefaultTimeout(120000);
  require("fs").mkdirSync("test-results", { recursive: true });
  const errors = [],
    requests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => requests.push(r.url()));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(process.env.GAME_TEST_URL || "http://127.0.0.1:4173");
  await page.waitForFunction(() => window.__SHAROBESY__, { timeout: 30000 });
  if(await page.locator("#menu-free").isVisible())await page.locator("#menu-free").click();
  await page.waitForFunction(() => window.__SHAROBESY__.physicsTime > .2);
  const initial = await page.evaluate(() => window.__SHAROBESY__);
  await page.screenshot({ path: "test-results/01-rear.png" });
  await page.keyboard.press("Digit4");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "test-results/02-front.png" });
  await page.keyboard.press("Digit1");
  await page.waitForFunction(() => window.__SHAROBESY__.camera === 0);
  await page.keyboard.down("KeyW");
  await page.waitForFunction(p => Math.hypot(...window.__SHAROBESY__.position.map((v,i) => v-p[i])) > 1.25, initial.position);
  await page.keyboard.up("KeyW");
  await page.waitForFunction(() => window.__SHAROBESY__.input.z === 0);
  const moved = await page.evaluate(() => window.__SHAROBESY__);
  await page.keyboard.press("Space");
  await page.waitForFunction(y => window.__SHAROBESY__.position[1] > y+.2, moved.position[1]);
  const jumping = await page.evaluate(() => window.__SHAROBESY__);
  await page.keyboard.press("Shift");
  await page.waitForTimeout(400);
  await page.screenshot({ path: "test-results/03-moving.png" });
  for (let n = 1; n <= 4; n++) {
    await page.keyboard.press("Digit" + n);
    await page.waitForFunction(n => window.__SHAROBESY__.camera === n-1, n);
    const camera = await page.evaluate(() => window.__SHAROBESY__.camera);
    if (camera !== n - 1) throw Error("camera mismatch");
  }
  const download = page.waitForEvent("download");
  await page.click("#snapshot");
  const d = await download;
  await d.saveAs("test-results/snapshot.png");
  await page.reload();
  await page.waitForFunction(() => window.__SHAROBESY__);
  const reloaded = await page.evaluate(() => window.__SHAROBESY__);
  if(await page.locator("#menu-free").isVisible())await page.locator("#menu-free").click();
  if (initial.skin.seed !== reloaded.skin.seed) throw Error("seed changed");
  await page.setViewportSize({ width: 2400, height: 1080 });
  await page.waitForFunction(() => Math.abs(document.querySelector('#stick').getBoundingClientRect().width - 240) < .1);
  const wide = await page.locator("#stage").boundingBox();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => Math.abs(document.querySelector('#stick').getBoundingClientRect().width - 48.75) < .1);
  const portrait = await page.locator("#stage").boundingBox();
  await page.screenshot({ path: "test-results/04-portrait-letterbox.png" });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForFunction(() => Math.abs(document.querySelector('#stick').getBoundingClientRect().width - 160) < .1);
  const cdp = await page.context().newCDPSession(page);
  const stickBox=await page.locator("#stick").boundingBox(),stickX=stickBox.x+stickBox.width/2,stickY=stickBox.y+stickBox.height/2;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: stickX, y: stickY }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: stickX, y: stickY-stickBox.height*.43 }],
  });
  await page.waitForFunction(()=>window.__SHAROBESY__.input.z<-.5);
  const touch = await page.evaluate(() => window.__SHAROBESY__);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForFunction(()=>Math.abs(window.__SHAROBESY__.input.z)<.001);
  const released = await page.evaluate(() => window.__SHAROBESY__);
  if (touch.input.z > -0.5 || Math.abs(released.input.z) > 0.001)
    throw Error("touch joystick did not engage/release: "+JSON.stringify({touch:touch.input,released:released.input,menu:released.menu,phase:released.match?.phase,stickBox}));
  const report = {
    touchInput: touch.input,
    releasedInput: released.input,
    initial,
    moved,
    jumping,
    reloaded,
    wide,
    portrait,
    errors,
    externalRequests: requests.filter(
      (u) =>
        !u.startsWith("http://127.0.0.1") &&
        !u.startsWith("ws://127.0.0.1") &&
        !u.startsWith("data:") &&
        !u.startsWith("blob:"),
    ),
  };
  require("fs").writeFileSync(
    "test-results/browser.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  if (errors.length || report.externalRequests.length)
    throw Error("console errors or external requests");
  if (Math.abs(portrait.width / portrait.height - 16 / 9) > 0.001)
    throw Error("portrait crop");
  if (Math.hypot(...moved.position.map((v, i) => v - initial.position[i])) < 1)
    throw Error("no movement");
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
