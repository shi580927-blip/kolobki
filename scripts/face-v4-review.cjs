const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');

async function main() {
  const output = 'dist/face-v4-review';
  await fs.mkdir(output, {recursive:true});
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  try {
    const page = await browser.newPage({ viewport: { width:1280, height:720 } });
    page.setDefaultTimeout(120000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if(message.type()==='error') errors.push(message.text()); });
    await page.route('http://127.0.0.1:4224/**', async route => {
      const pathname=new URL(route.request().url()).pathname;
      await route.fulfill({path:path.join('dist',pathname==='/'?'index.html':pathname)});
    });
    await page.goto('http://127.0.0.1:4224/?skin-study&face-v4');
    await page.waitForFunction(() => window.__SKIN_STUDY__);
    for(const pose of ['base','surprised','happy','angry']) {
      await page.getByLabel('Выражение лица').selectOption(pose);
      for(const angle of [0,30,60,90]) {
        if(angle) await page.getByRole('button',{name:'↷ 30°'}).click();
        await page.waitForFunction(() => window.__FACE_REVIEW__?.ready);
        await page.screenshot({path:path.join(output,pose+'-'+angle+'.png')});
      }
      for(let i=0;i<3;i++) await page.getByRole('button',{name:'↶ 30°'}).click();
    }
    await page.getByRole('button',{name:'Моргание',exact:true}).click();
    await page.waitForFunction(() => window.__FACE_REVIEW__?.closed);
    await page.screenshot({path:path.join(output,'closed.png')});
    if(errors.length) throw new Error(errors.join('\n'));
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
