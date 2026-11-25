const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

async function review() {
  const browser = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:810}});
    page.setDefaultTimeout(120000);
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
    await select.selectOption('skull');
    await page.getByLabel('Выражение лица').selectOption('attack');
    await page.getByRole('button',{name:'Моргание',exact:true}).click();
    await page.screenshot({path:'dist/tattoo-review/skull-blink.png'});
    await page.getByLabel('База «Черепушка»',{exact:true}).check();
    await select.selectOption('star');
    for(const label of ['Румянец под рисунком','Веснушки','Тени','Стрелки','Ресницы']){
      await page.getByLabel(label,{exact:true}).check();
    }
    await page.screenshot({path:'dist/tattoo-review/layers-closed.png'});
    await page.getByRole('button',{name:'Моргание',exact:true}).click();
    await page.screenshot({path:'dist/tattoo-review/layers-open.png'});
    await select.selectOption('');
    await page.goto('http://study.local/?face-v5-game');
    await page.getByRole('button',{name:'Настройки',exact:true}).click({timeout:60000});
    await page.getByRole('button',{name:'Персонаж · настройки лица · брови'}).click();
    await page.getByRole('button',{name:'Изящные'}).click();
    assert.equal(await page.evaluate(()=>localStorage.getItem('sharobesy.browStyle')),'elegant');
    assert.equal(await page.getByRole('button',{name:'Изящные'}).getAttribute('aria-pressed'),'true');
    await fs.mkdir('dist/brow-review',{recursive:true});
    await page.screenshot({path:'dist/brow-review/game-settings.png'});
    await page.goto('http://study.local/?cosmetics-study');
    await page.getByLabel('Рисунок',{exact:true}).selectOption('');
    await page.getByLabel('Брови',{exact:true}).selectOption('bold_short');
    await page.getByLabel('Выражение лица').selectOption('curious');
    await page.waitForTimeout(5000);
    await page.screenshot({path:'dist/brow-review/curious-bold_short.png'});
    await page.goto('http://study.local/?skin=skull');
    await page.waitForFunction(()=>window.__SHAROBESY__?.fps>0);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sharobesy.wardrobe.v1')).skull),true);
    await page.keyboard.press('Digit4');
    await page.screenshot({path:'dist/tattoo-review/skull-game.png'});
    if(!await page.locator('#game-menu').isVisible())await page.locator('#menu-open').click();
    await page.locator('#menu-profile').click();
    await page.locator('.wardrobe-card img').first().waitFor();
    assert.equal(await page.locator('.outfit-summary').isVisible(),true);
    assert.equal(await page.locator('#game-menu-title').textContent(),'Примерка образа');
    const backdrop=await page.locator('#game-menu').evaluate(async element=>{
      const url=getComputedStyle(element).backgroundImage.match(/url\([\"']?(.*?)[\"']?\)/)?.[1];
      if(!url)return {loaded:false,url:''};
      const image=new Image();image.src=url;try{await image.decode();return {loaded:image.naturalWidth>1000,url};}catch{return {loaded:false,url};}
    });
    assert.match(backdrop.url,/fitting-clearing/);assert.equal(backdrop.loaded,true,'new illustrated backdrop must load');
    assert.ok(await page.locator('.wardrobe-card img').evaluateAll(images=>images.every(img=>img.complete&&img.naturalWidth>0)),'item previews must render');
    const portrait=await page.locator('#portrait').boundingBox();
    assert.ok(portrait&&portrait.width>300,'fitting room has a large live hero');
    await page.getByRole('button',{name:'Повернуть вправо',exact:true}).click();
    await page.screenshot({path:'dist/tattoo-review/fitting-room.png'});
    await page.getByRole('button',{name:'ϟ Рисунки',exact:true}).click();
    assert.equal(await page.locator('.wardrobe-card').count(),4);
    await page.locator('#menu-back').click();
    await page.locator('#menu-help').click();
    assert.equal(await page.locator('.shop-card').count(),6);
    const balance=await page.evaluate(()=>JSON.parse(localStorage.getItem('sharobesy.wardrobe.v1')).coins??0);
    await page.locator('.shop-card[data-item=crown]').click();
    assert.match(await page.locator('.shop-detail').textContent(),/Королевская корона/);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sharobesy.wardrobe.v1')).coins??0),balance,'preview must not spend coins');
    await page.screenshot({path:'dist/tattoo-review/shop.png'});
    await page.getByRole('button',{name:'Головные уборы',exact:true}).click();
    assert.equal(await page.locator('.shop-card').count(),3);
    await page.locator('#menu-back').click();
    await page.locator('#menu-map').click();
    await page.locator('[data-location=winter]').click();
    assert.match(await page.locator('.world-map-details').textContent(),/ещё создаётся/);
    assert.equal(await page.locator('#map-match').count(),0);
    await page.locator('[data-location=sunny]').click();
    await page.screenshot({path:'dist/tattoo-review/world-map.png'});
    await page.locator('#map-explore').click();
    assert.equal(await page.locator('#game-menu').isVisible(),false);
    await page.locator('#menu-open').click();
    await page.locator('#menu-play').click();
    assert.equal(await page.locator('#menu-free').isVisible(),true);
    assert.equal(await page.locator('#menu-match').isVisible(),true);
    await page.screenshot({path:'dist/tattoo-review/mode-selection.png'});
    await page.locator('#menu-match').click();
    await page.locator('#match-start').click();
    await page.waitForFunction(()=>['countdown','running'].includes(window.__SHAROBESY__.match.phase));
    assert.equal(await page.locator('#match-entry').isVisible(),false);
    assert.equal(await page.evaluate(()=>window.__SHAROBESY__.match.visual.visible),true);
    assert.equal(await page.locator('#match-result').isVisible(),false);
    await page.locator('#reset').click();
    assert.equal(await page.locator('#match-result').isVisible(),false);



  } finally {
    await browser.close();
  }
}
review().catch(error=>{console.error(error);process.exitCode=1;});
