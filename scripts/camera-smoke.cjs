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
  const pad=page.locator('#camera-pad'), box=await pad.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await page.mouse.down();await page.mouse.move(box.x+20,box.y+30,{steps:6});await page.mouse.up();
  const rightDrag=await page.evaluate(()=>window.__SHAROBESY__);
  if(!rightDrag.freeOrbit)throw Error('right look pad mouse drag failed');
  await page.keyboard.press('Digit1');
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  const joystick=await page.locator('#stick').boundingBox(),sx=joystick.x+joystick.width/2,sy=joystick.y+joystick.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:sx,y:sy},{id:2,x:box.x+100,y:box.y+150}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:sx,y:sy-45},{id:2,x:box.x+30,y:box.y+110}]});
  await page.waitForTimeout(150);const together=await page.evaluate(()=>window.__SHAROBESY__);
  if(!together.freeOrbit||together.input.z>-.5)throw Error('simultaneous movement/look failed');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(100);const ended=await page.evaluate(()=>window.__SHAROBESY__);
  if(Math.abs(ended.input.z)>.001)throw Error('touch movement stuck');
  await page.screenshot({path:'test-results/camera-right-pad.png'});
  await page.keyboard.press('Digit1');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:2,x:box.x+100,y:box.y+150}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  const canceled=await page.evaluate(()=>window.__SHAROBESY__.orbitYaw);
  await page.waitForTimeout(100);
  if(canceled!==await page.evaluate(()=>window.__SHAROBESY__.orbitYaw))throw Error('cancel leaves dragging');
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    JSON.stringify({
      middleDrag: dragged.freeOrbit,
      orbitYaw: dragged.orbitYaw,
      orbitPitch: dragged.orbitPitch,
      releaseStops: true,
      presetRestored: true,
      leftDragIgnored: true,
      rightPadMouse:true,simultaneousTouchLookAndMove:true,touchRelease:true,
      errors,
    }),
  );
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
