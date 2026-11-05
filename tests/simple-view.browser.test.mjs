import {chromium} from '../online/node_modules/playwright-core/index.mjs';
import http from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('../dist/index.html',import.meta.url));
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html)});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.SPOOL_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const shots=process.env.SPOOL_SCREENSHOT_DIR;if(shots)mkdirSync(shots,{recursive:true});
const stock=['白','青','赤'].map((colorName,i)=>({id:'simple-'+i,name:'確認材料 '+i,brand:'QA',material:'PLA',colorName,color:['#FFFFFF','#2266AA','#AA4433'][i],remaining:800,capacity:1000,image:''}));
try{
 for(const width of [320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(data=>localStorage.setItem('spool-inventory-v1',JSON.stringify(data)),stock);
  await page.goto('http://127.0.0.1:'+server.address().port);
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('spool-inventory-v1')));
  await page.locator('#simpleView').click();await page.waitForFunction(()=>document.querySelector('#items').classList.contains('simple-mode'));
  assert.equal(await page.locator('#batchActions').isVisible(),true);assert.equal(await page.locator('#items .row-select:visible').count(),0);
  assert.equal(await page.locator('#items :is(.product-title,.weight,.tag-list,.actions):visible').count(),0);
  await page.locator('.product-photo').first().click();await page.locator('#filamentDetails').waitFor();await page.locator('#closeFilamentDetails').click();
  await page.locator('#batchActions>summary').click();await page.locator('#items .row-select').first().waitFor();
  await page.locator('[data-select="simple-0"]').check();assert.match(await page.locator('#selectionCount').innerText(),/1 件選択/);
  await page.locator('#clearSelection').click();await page.locator('#selectAll').check();await page.locator('[data-select="simple-0"]').uncheck();assert.match(await page.locator('#selectionCount').innerText(),/2 件選択/);
  for(const selector of ['#selectionCount','#bulkAdd','#bulkDelete','#clearSelection','.select-all'])assert.ok(await page.locator(selector).evaluate(x=>parseFloat(getComputedStyle(x).fontSize)>=16));
  for(const selector of ['#bulkAdd','#bulkDelete','#clearSelection'])assert.ok(await page.locator(selector).evaluate(x=>x.getBoundingClientRect().height>=44));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(shots)await page.screenshot({path:shots+'/simple-bulk-'+width+'.png',fullPage:true});
  await page.locator('#bulkAdd').click();await page.locator('#confirmBulk').click();assert.equal(await page.locator('#items>.filament-row').count(),5);
  const copies=await page.evaluate(()=>JSON.parse(localStorage.getItem('spool-inventory-v1')).filter(x=>!x.id.startsWith('simple-')).map(x=>x.id));
  for(const id of copies)await page.locator('[data-select="'+id+'"]').check();
  await page.locator('#bulkDelete').click();await page.locator('#confirmBulk').click();assert.equal(await page.locator('#items>.filament-row').count(),3);
  await page.locator('#selectAll').check();await page.locator('[data-select="simple-0"]').uncheck();await page.locator('#bulkDelete').click();await page.locator('#confirmBulk').click();assert.equal(await page.locator('#items>.filament-row').count(),1);
  await page.locator('#undoDelete').click();assert.equal(await page.locator('#items>.filament-row').count(),3);
  const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('spool-inventory-v1')));const byId=data=>data.sort((a,b)=>a.id.localeCompare(b.id));assert.deepEqual(byId(restored),byId(before));
  await page.locator('#batchActions>summary').click();await page.waitForFunction(()=>document.querySelector('#items').dataset.selecting==='false');assert.equal(await page.locator('#items .row-select:visible').count(),0);
  await page.reload();await page.waitForFunction(()=>document.querySelector('#items').classList.contains('simple-mode'));assert.equal(await page.locator('#items>.filament-row').count(),3);
  if(shots&&width===1440)await page.locator('.view-switch').screenshot({path:shots+'/view-switch.png'});
  await page.locator('#listView').click();assert.equal(await page.locator('#items .weight:visible').count(),3);assert.deepEqual(errors,[]);await page.close();
  console.log('PASS '+width+'px: simple view details, bulk selection/all/clear, duplicate/delete/undo, readable actions, persistence and unchanged original data.');
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
