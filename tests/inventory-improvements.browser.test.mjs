import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import {chromium} from '../online/node_modules/playwright-core/index.mjs';
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url));
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html)});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.SPOOL_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
async function shot(page,name){if(process.env.SPOOL_SCREENSHOT_DIR){fs.mkdirSync(process.env.SPOOL_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:process.env.SPOOL_SCREENSHOT_DIR+'/'+name+'.png',animations:'disabled'})}}
const stock=[{id:'white',name:'PLA',brand:'ELEGOO',material:'PLA',variant:'PLA',colorName:'ホワイト',color:'#FFFFFF',remaining:800,capacity:1000,location:'自宅',tags:[]},{id:'blue',name:'PLA Translucent',brand:'ELEGOO',material:'PLA',variant:'PLA Translucent',colorName:'半透明ライトブルー',color:'#5BC2E7',remaining:990,capacity:1000,location:'自宅',tags:['共有用']},{id:'custom',name:'PLA',brand:'ELEGOO',material:'PLA',variant:'PLA',colorName:'ホワイト',color:'#FFFFFF',remaining:1000,capacity:1000,amazonUrl:'https://example.com/my-link',tags:[]}];
try{
 for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(data=>localStorage.setItem('spool-inventory-v1',JSON.stringify(data)),stock);
  await page.goto('http://127.0.0.1:'+server.address().port);
  assert.equal(await page.locator('[data-row-id=white] .shop-link').getAttribute('href'),'https://www.amazon.co.jp/dp/B0BM4BK4LS');
  assert.equal(await page.locator('[data-row-id=blue] .shop-link').getAttribute('href'),'https://www.amazon.co.jp/dp/B0GZWGJ774');
  assert.equal(await page.locator('[data-row-id=custom] .shop-link').getAttribute('href'),'https://example.com/my-link');
  assert.ok((await page.evaluate(()=>JSON.parse(localStorage.getItem('spool-inventory-v1'))))[0].amazonUrl);
  await page.locator('[data-row-id=blue] [data-search-tag="半透明"]').click();
  assert.equal(await page.locator('#foregroundResults .search-result').count(),1);await page.locator('#closeSearchPanel').click();
  assert.equal(await page.locator('.filament-row').count(),1);assert.equal(await page.locator('#activeInventoryFilters').isVisible(),true);
  await page.locator('[data-clear-filter=all]').click();assert.equal(await page.locator('.filament-row').count(),3);
  await page.locator('[data-row-id=blue] .product-title').click();
  // Reproduce the online library context without using personal account data.
  await page.locator('#filamentDetails .dialog-head').evaluate(el=>{const p=document.createElement('p');p.className='editor-save-destination';p.textContent='表示先：確認用ライブラリ';el.append(p)});
  const close=await page.locator('#closeFilamentDetails').boundingBox(),title=await page.locator('#filamentDetailsTitle').boundingBox();assert.ok(close.x>title.x+title.width-1);assert.ok(Math.abs(close.y-title.y)<10);
  await page.locator('#filamentDetailsBody p').first().click();assert.equal(await page.locator('#filamentDetails').isVisible(),true);await shot(page,'detail-'+width);
  const box=await page.locator('#filamentDetails').boundingBox();await page.mouse.click(Math.max(1,box.x-10),Math.min(990,box.y+20));await page.locator('#filamentDetails').waitFor({state:'hidden'});
  await page.locator('[data-row-id=white] [data-edit]').click();assert.equal(await page.locator('[name=location]').getAttribute('placeholder'),'例：自宅');
  assert.equal(await page.locator('#weightCandidates').isVisible(),false);
  await page.locator('[name=capacity]').click();assert.equal(await page.locator('#weightCandidates').isVisible(),true);await page.locator('[data-spool-capacity="990"]').click();
  assert.equal(await page.locator('[name=capacity]').inputValue(),'990');assert.equal(await page.locator('[name=remaining]').inputValue(),'800');assert.equal(await page.locator('#weightCandidates').isVisible(),false);
  await page.locator('[name=remaining]').click();assert.equal(await page.locator('[data-spool-capacity="1000"]').isVisible(),false);await page.locator('[data-spool-capacity="750"]').click();assert.equal(await page.locator('[name=remaining]').inputValue(),'750');assert.equal(await page.locator('[name=capacity]').inputValue(),'990');
  await page.locator('[name=remaining]').click();await page.locator('#fillRemaining').click();assert.equal(await page.locator('[name=remaining]').inputValue(),'990');
  await page.locator('[name=remaining]').click();await shot(page,'weight-candidates-'+width);await page.locator('[name=remaining]').press('Escape');assert.equal(await page.locator('#weightCandidates').isVisible(),false);assert.equal(await page.locator('#editor').isVisible(),true);
  assert.equal(await page.locator('[data-tag-suggestions=form] [data-suggested-tag="急ぎ"]').count(),0);assert.equal(await page.locator('[data-tag-suggestions=form] [data-suggested-tag="ゆっくり"]').count(),0);
  await page.locator('#cancel').click();if(width>1000)await page.locator('#gridView').click();else assert.equal(await page.locator('.view-switch').isVisible(),false);await shot(page,'inventory-'+width);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);await page.close();
  console.log('PASS '+width+'px: color-specific link enrichment/preservation, derived tag search, clearable filters, right-aligned close/backdrop, contextual weights and legible responsive layout.');
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
