import {chromium} from '../online/node_modules/playwright-core/index.mjs';
import http from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('../dist/index.html',import.meta.url));
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html)});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.SPOOL_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const shots=process.env.SPOOL_SCREENSHOT_DIR;if(shots)mkdirSync(shots,{recursive:true});
const stock=['白','半透明ライトブルー','赤'].map((colorName,i)=>({id:'simple-'+i,name:'確認材料 '+i,brand:'QA',material:'PLA',colorName,color:['#FFFFFF','#2266AA','#AA4433'][i],remaining:800,capacity:1000,image:''}));
try{
 for(const width of [320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:1000},hasTouch:width<761}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(data=>localStorage.setItem('spool-inventory-v1',JSON.stringify(data)),stock);
  await page.goto('http://127.0.0.1:'+server.address().port);
  assert.equal(await page.locator('#items').getAttribute('class'),'simple-mode');assert.equal(await page.locator('#simpleView').getAttribute('aria-pressed'),'true');const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('spool-inventory-v1')));
  await page.locator('[data-tab=planned]').click();assert.equal(await page.locator('#purchaseIntentFilter').isVisible(),false);const menu=await page.locator('#purchaseIntentMenu').boundingBox();assert.ok(menu.x>=0&&menu.x+menu.width<=width);await page.locator('[data-purchase-intent=wish]').click();assert.equal(await page.locator('#purchaseTabLabel').innerText(),'購入希望');assert.equal(await page.locator('#purchaseIntentMenu').isVisible(),false);await page.locator('[data-tab=planned]').click();await page.keyboard.press('Escape');assert.equal(await page.locator('#purchaseIntentMenu').isVisible(),false);await page.locator('[data-tab=all]').click();await page.locator('#simpleView').click();await page.waitForFunction(()=>document.querySelector('#items').classList.contains('simple-mode'));
  if(width<=1000){const geometry=await page.locator('#items>.filament-row').evaluateAll(rows=>rows.map(row=>{const r=row.getBoundingClientRect(),photo=row.querySelector('.product-photo').getBoundingClientRect(),label=row.querySelector('.color-name').getBoundingClientRect();return {top:r.top,left:r.left,right:r.right,photoBottom:photo.bottom,labelTop:label.top,labelRight:label.right,labelLeft:label.left}}));assert.ok(Math.abs(geometry[0].top-geometry[1].top)<1);assert.ok(geometry[1].left>geometry[0].left);assert.ok(geometry.every(x=>x.labelTop>=x.photoBottom-1&&x.labelLeft>=x.left&&x.labelRight<=x.right));if(shots)await page.locator('#items').screenshot({path:shots+'/simple-gallery-'+width+'.png'});}assert.equal(await page.locator('#batchActions').isVisible(),false);assert.equal(await page.locator('#batchActions>summary').count(),0);if(width>=761){await page.mouse.move(0,0);assert.equal(await page.locator('#items .row-select').first().evaluate(x=>getComputedStyle(x).opacity),'0');await page.locator('.filament-row').first().hover();assert.equal(await page.locator('#items .row-select').first().evaluate(x=>getComputedStyle(x).opacity),'1');}else assert.equal(await page.locator('#items .row-select').first().evaluate(x=>getComputedStyle(x).opacity),'1');
  assert.equal(await page.locator('#items :is(.product-title,.weight,.tag-list,.actions):visible').count(),0);
  await page.locator('.product-photo').first().click();await page.locator('#filamentDetails').waitFor();await page.locator('#closeFilamentDetails').click();
  await page.locator('.filament-row').first().hover();
  await page.locator('[data-select="simple-0"]').check();assert.match(await page.locator('#selectionCount').innerText(),/1 件選択/);
  await page.locator('#clearSelection').click();assert.equal(await page.locator('#batchActions').isVisible(),false);await page.locator('[data-select="simple-1"]').check();await page.locator('#selectAll').check();await page.locator('[data-select="simple-0"]').uncheck();assert.match(await page.locator('#selectionCount').innerText(),/2 件選択/);
  for(const selector of ['#selectionCount','#bulkAdd','#bulkDelete','#clearSelection','.select-all'])assert.ok(await page.locator(selector).evaluate(x=>parseFloat(getComputedStyle(x).fontSize)>=16));
  for(const selector of ['#bulkAdd','#bulkDelete','#clearSelection'])assert.ok(await page.locator(selector).evaluate(x=>x.getBoundingClientRect().height>=44));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(shots)await page.screenshot({path:shots+'/simple-bulk-'+width+'.png',fullPage:true});
  await page.locator('#bulkAdd').click();await page.locator('#confirmBulk').click();assert.equal(await page.locator('#items>.filament-row').count(),5);
  const copies=await page.evaluate(()=>JSON.parse(localStorage.getItem('spool-inventory-v1')).filter(x=>!x.id.startsWith('simple-')).map(x=>x.id));
  for(const id of copies)await page.locator('[data-select="'+id+'"]').check();
  await page.locator('#bulkDelete').click();await page.locator('#confirmBulk').click();assert.equal(await page.locator('#items>.filament-row').count(),3);
  await page.locator('[data-select="simple-1"]').check();await page.locator('#selectAll').check();await page.locator('[data-select="simple-0"]').uncheck();await page.locator('#bulkDelete').click();await page.locator('#confirmBulk').click();assert.equal(await page.locator('#items>.filament-row').count(),1);
  await page.locator('#undoDelete').click();assert.equal(await page.locator('#items>.filament-row').count(),3);
  const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('spool-inventory-v1')));const byId=data=>data.sort((a,b)=>a.id.localeCompare(b.id));assert.deepEqual(byId(restored),byId(before));
  assert.equal(await page.locator('#batchActions').isVisible(),false);assert.equal(await page.locator('#items').getAttribute('data-selecting'),'false');
  await page.reload();await page.waitForFunction(()=>document.querySelector('#items').classList.contains('simple-mode'));assert.equal(await page.locator('#items>.filament-row').count(),3);
  if(shots&&width===1440)await page.locator('.view-switch').screenshot({path:shots+'/view-switch.png'});
  await page.locator('#listView').click();assert.equal(await page.locator('#items .weight:visible').count(),3);await page.reload();await page.waitForFunction(()=>document.querySelector('#items').className==='');assert.equal(await page.locator('#listView').getAttribute('aria-pressed'),'true');assert.deepEqual(errors,[]);await page.close();
  console.log('PASS '+width+'px: simple view details, bulk selection/all/clear, duplicate/delete/undo, readable actions, persistence and unchanged original data.');
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
