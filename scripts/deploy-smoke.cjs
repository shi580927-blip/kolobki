const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
  page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://game.local/**',route=>{const file=new URL(route.request().url()).pathname.replace(/^\/kolobki\//,'/');return route.fulfill({path:path.join('dist',file==='/'?'index.html':file)});});
  await page.goto('http://game.local/');
  await page.waitForFunction(()=>window.__SHAROBESY__?.fps>0);
  assert.equal(await page.evaluate(()=>window.__SHAROBESY__.faceArt),'v5');
  await page.locator('#menu-profile').click();
  await page.locator('.outfit-summary').waitFor();
  const background=await page.locator('#game-menu').evaluate(async el=>{const url=getComputedStyle(el).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];if(!url)return '';const im=new Image();im.src=url;await im.decode();return im.naturalWidth>1000?url:'';});
  assert.match(background,/fitting-clearing/);
  await fs.mkdir('dist/deploy-review',{recursive:true});
  await page.screenshot({path:'dist/deploy-review/fitting.png'});
  await page.getByRole('button',{name:'Повернуть вправо',exact:true}).click({clickCount:3});
  await page.getByRole('button',{name:'ϟ Рисунки',exact:true}).click();
  assert.equal(await page.locator('.wardrobe-card').count(),4);
  await page.locator('#fitting-shop').click();
  assert.equal(await page.locator('.shop-card').count(),6);
  assert.equal(await page.locator('.shop-detail>img').evaluate(im=>im.naturalWidth),384);
  const bannerClear=await page.locator('.shop-showcase').evaluate(el=>{
    const text=el.querySelector('h3').getBoundingClientRect();
    return [...el.querySelectorAll('img')].every(im=>im.getBoundingClientRect().left>=text.right);
  });
  assert.equal(bannerClear,true,'banner artwork must not cover its heading');
  await page.screenshot({path:'dist/deploy-review/shop.png'});
  await page.locator('#menu-back').click();
  await page.locator('#menu-play').click();await page.locator('#menu-free').click();
  assert.equal(await page.locator('#game-menu').isVisible(),false);
  await page.screenshot({path:'dist/deploy-review/valley.png'});
  await page.waitForFunction(()=>window.__SHAROBESY__?.npcs?.length===15);
  await page.waitForFunction(()=>window.__SHAROBESY__?.npcTrains?.length===3);
  await page.locator('#menu-open').click();await page.locator('#menu-play').click();await page.locator('#menu-match').click();await page.locator('#match-start').click();
  await page.locator('#race-hud:not([hidden])').waitFor();
  assert.equal(await page.locator('.power-belt button').count(),3);
  await page.screenshot({path:'dist/deploy-review/race.png'});
  await page.locator('#reset').click();
  assert.equal(await page.locator('#race-hud').isVisible(),false);
  assert.deepEqual(errors,[]);console.log('Live V5, illustrated background, fitting tabs, shop and free ride PASS');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
