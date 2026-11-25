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
  await page.addInitScript(()=>{if(!localStorage.getItem('sharobesy.wardrobe.v1'))localStorage.setItem('sharobesy.wardrobe.v1',JSON.stringify({coins:100,owned:[],outfit:{head:'none',mark:'none'}}));});
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
  assert.equal(await page.locator('.shop-card').count(),14);
  assert.equal(await page.locator('.shop-detail>img').evaluate(im=>im.naturalWidth),384);
  const bannerClear=await page.locator('.shop-showcase').evaluate(el=>{
    const text=el.querySelector('h3').getBoundingClientRect();
    return [...el.querySelectorAll('img')].every(im=>im.getBoundingClientRect().left>=text.right);
  });
  assert.equal(bannerClear,true,'banner artwork must not cover its heading');
  assert.equal(await page.locator('.shop-tabs button').count(),6);
  for(const [name,count]of [['Головные уборы',5],['Очки',2],['Маски',1],['Украшения',3],['Рисунки',3],['Все',14]]){
   await page.getByRole('button',{name,exact:true}).click();assert.equal(await page.locator('.shop-card').count(),count);
  }
  assert.ok(await page.locator('.shop-tabs').evaluate(el=>[...el.querySelectorAll('button')].every(b=>b.scrollWidth<=b.clientWidth&&b.getBoundingClientRect().right<=1280)),'shop category labels fit the 16:9 screen');
  for(const id of ['cap','roundGlasses','goggles','catEars','headphones','viking','horns','ninja','knight']){
   await page.locator('.shop-card[data-item="'+id+'"]').click();await page.locator('#shop-buy').click();
   assert.equal(await page.evaluate(()=>window.__SHAROBESY__.decorations.head),id,'selected accessory must reach the real game hero');
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sharobesy.wardrobe.v1')).outfit.head),id);
  }
  await page.locator('.shop-card[data-item="headphones"]').click();await page.locator('#shop-buy').click();
  await page.screenshot({path:'dist/deploy-review/shop.png'});
  await page.locator('#shop-wardrobe').click();assert.equal(await page.locator('#wear-headphones').getAttribute('aria-pressed'),'true');
  await page.screenshot({path:'dist/deploy-review/fitting.png'});
  await page.locator('#menu-back').click();await page.reload();await page.waitForFunction(()=>window.__SHAROBESY__?.fps>0);
  assert.equal(await page.evaluate(()=>window.__SHAROBESY__.decorations.head),'headphones','equipment survives a full game reload');
  await page.locator('#menu-play').click();await page.locator('#menu-free').click();
  assert.equal(await page.locator('#game-menu').isVisible(),false);
  await page.screenshot({path:'dist/deploy-review/valley.png'});
  await page.waitForFunction(()=>window.__SHAROBESY__?.npcs?.length===15);
  const before=await page.evaluate(()=>window.__SHAROBESY__.physicsTime);
  await page.waitForFunction(t=>window.__SHAROBESY__.physicsTime>t+1,before);
  assert.deepEqual(await page.evaluate(()=>window.__SHAROBESY__.npcTrains),[],'free-roaming NPCs must never form autonomous trains');
  assert.equal(await page.evaluate(()=>window.__SHAROBESY__.berries.total),36);
  assert.equal(await page.evaluate(()=>window.__SHAROBESY__.gardens.length),3);
  const roles=await page.evaluate(()=>window.__SHAROBESY__.npcs.map(n=>n.personality));
  for(const role of ['grazer','dreamer','dancer','brawler','wanderer'])assert.ok(roles.includes(role));
  await page.waitForFunction(()=>window.__SHAROBESY__.npcs.some(n=>n.activity==='sleep'||n.activity==='dance'||n.activity==='eat'));
  await page.screenshot({path:'dist/deploy-review/npc-life.png'});
  await page.locator('#menu-open').click();await page.locator('#menu-play').click();await page.locator('#menu-match').click();await page.locator('#match-start').click();
  await page.locator('#race-hud:not([hidden])').waitFor();
  assert.equal(await page.locator('.power-belt button').count(),3);
  await page.screenshot({path:'dist/deploy-review/race.png'});
  await page.locator('#reset').click();
  assert.equal(await page.locator('#race-hud').isVisible(),false);
  assert.deepEqual(await page.evaluate(()=>window.__SHAROBESY__.npcTrains),[],'reset restores free grazing without NPC collectors');
  assert.deepEqual(errors,[]);console.log('Live V5, illustrated background, fitting tabs, shop and free ride PASS');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
