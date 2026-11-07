const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');

async function review() {
  const browser = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:810}});
    await page.route('http://study.local/**', async route => {
      const file = new URL(route.request().url()).pathname.replace(/^\/kolobki\//,'/');
      await route.fulfill({path:path.join('dist',file==='/'?'index.html':file)});
    });
    await page.goto('http://study.local/?cosmetics-study');
    const select = page.getByLabel('Рисунок',{exact:true});
    await fs.mkdir('dist/tattoo-review',{recursive:true});
    for(const id of ['claw','battle','lightning','tribal']) {
      await select.selectOption(id);
      await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
      await page.screenshot({path:'dist/tattoo-review/'+id+'.png'});
    }
  } finally {
    await browser.close();
  }
}
review().catch(error=>{console.error(error);process.exitCode=1;});
