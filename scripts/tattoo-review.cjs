const { chromium } = require('playwright');
const assert = require('node:assert/strict');
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
    for(const id of ['claw','battle','lightning','tribal','rune','flame','star','blush']) {
      await select.selectOption(id);
      await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
      await page.screenshot({path:'dist/tattoo-review/'+id+'.png'});
      if(id!=='claw'){
        await page.getByRole('button',{name:'↷ 30°'}).click({clickCount:2});
        await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
        await page.screenshot({path:`dist/tattoo-review/${id}-three-quarter.png`});
        await page.getByRole('button',{name:'↶ 30°'}).click({clickCount:2});
      }
    }
    await select.selectOption('');
    const brows=page.getByLabel('Брови',{exact:true});
    const expression=page.getByLabel('Выражение лица');
    await fs.mkdir('dist/brow-review',{recursive:true});
    for(const pose of ['neutral','angry','smile','curious']) {
      await expression.selectOption(pose);
      await page.waitForFunction(()=>window.__FACE_REVIEW__?.ready,null,{timeout:10000});
      for(const style of ['classic','elegant','rounded','bold_short']) {
        await brows.selectOption(style);
        await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
        await page.screenshot({path:`dist/brow-review/${pose}-${style}.png`});
      }
    }
    await page.goto('http://study.local/?face-v5-game');
    await page.getByRole('button',{name:'Настройки',exact:true}).click({timeout:60000});
    await page.getByRole('button',{name:'Персонаж · настройки лица · брови'}).click();
    await page.getByRole('button',{name:'Изящные'}).click();
    assert.equal(await page.evaluate(()=>localStorage.getItem('sharobesy.browStyle')),'elegant');
    assert.equal(await page.getByRole('button',{name:'Изящные'}).getAttribute('aria-pressed'),'true');
    await page.screenshot({path:'dist/brow-review/game-settings.png'});
  } finally {
    await browser.close();
  }
}
review().catch(error=>{console.error(error);process.exitCode=1;});
