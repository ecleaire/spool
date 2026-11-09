import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {chromium} from '../online/node_modules/playwright-core/index.mjs';
const base={name:'在庫の材料',brand:'QA',material:'PLA',colorName:'青',color:'#2255AA',capacity:1000,remaining:800,image:'',tags:[]};
const stock=[{...base,id:'owned'},{...base,id:'empty',remaining:0,inventoryStatus:'owned'},{...base,id:'plan',name:'購入専用の予定',inventoryStatus:'planned',purchaseIntent:'planned',tags:['購入専用タグ']},{...base,id:'wish',name:'購入専用の希望',inventoryStatus:'planned',purchaseIntent:'wish',tags:['希望専用タグ']},{...base,id:'plan2',name:'A 予定2',inventoryStatus:'planned'},{...base,id:'wish2',name:'B 希望2',inventoryStatus:'planned',purchaseIntent:'wish'}];
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(readFileSync('dist/index.html'))});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.SPOOL_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const shots=process.env.SPOOL_SCREENSHOT_DIR;if(shots)mkdirSync(shots,{recursive:true});
try{
 for(const width of [320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(data=>localStorage.setItem('spool-inventory-v1',JSON.stringify(data)),stock);await page.goto('http://127.0.0.1:'+server.address().port);
  const ids=()=>page.locator('#items [data-row-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.rowId));
  for(const mode of ['list','split','grid','simple']){await page.locator('#'+mode+'View').click();assert.deepEqual(await ids(),['owned','empty']);assert.equal(await page.locator('#totalCount').innerText(),'2');assert.equal(await page.locator('#navCount').innerText(),'2');assert.match(await page.locator('#shown').innerText(),/2 スプール中 2 件/);}
  await page.locator('#inventorySearchTrigger').click();await page.locator('#foregroundSearch').fill('購入専用');assert.equal(await page.locator('#foregroundResultCount').innerText(),'0');await page.locator('#clearSearchQuery').click();await page.locator('#closeSearchPanel').click();
  await page.locator('[data-select=owned]').check();await page.locator('#selectAll').check();assert.deepEqual(await page.evaluate(()=>[...selected].sort()),['empty','owned']);await page.locator('[data-tab=planned]').click();
  assert.equal(await page.locator('#batchActions').isVisible(),false);assert.equal(await page.locator('#purchaseIntentMenu').count(),0);
  for(const mode of ['list','split','grid','simple']){
   await page.locator('#'+mode+'View').click();assert.deepEqual(await ids(),['plan','plan2','wish','wish2']);assert.deepEqual(await page.locator('[data-purchase-section] h2').allTextContents(),['購入予定','購入希望']);assert.deepEqual(await page.locator('[data-purchase-section]>span').allTextContents(),['2件','2件']);
   for(const font of [16,20,24]){await page.evaluate(f=>document.documentElement.style.setProperty('--spool-type-floor',f+'px'),font);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);const headings=await page.locator('[data-purchase-section]').evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect(),p=el.parentElement.getBoundingClientRect();return {width:r.width,parent:p.width,left:r.left,right:r.right}}));assert.ok(headings.every(r=>r.width>r.parent*.8&&r.left>=0&&r.right<=width+1),JSON.stringify({width,mode,font,headings}));}
   await page.evaluate(()=>document.documentElement.style.removeProperty('--spool-type-floor'));if(shots&&mode==='simple')await page.screenshot({path:shots+'/purchases-'+width+'.png',fullPage:true});
  }
  await page.locator('[data-select=plan]').check();await page.locator('#selectAll').check();assert.deepEqual(await page.evaluate(()=>[...selected].sort()),['plan','plan2','wish','wish2']);await page.locator('#clearSelection').click();
  await page.locator('#sort').selectOption('name');assert.deepEqual(await ids(),['plan2','plan','wish2','wish']);await page.locator('#sort').selectOption('manual');await page.locator('#listView').click();
  await page.locator('[data-row-id=plan] [data-search-tag="購入専用タグ"]').click();assert.deepEqual(await ids(),['plan']);assert.deepEqual(await page.locator('[data-purchase-section]>span').allTextContents(),['1件','0件']);assert.equal(await page.locator('.purchase-section-empty').count(),1);await page.locator('#clearSearchQuery').click();await page.locator('#searchFiltersTab').click();await page.locator('#clearSearchFilters').click();await page.locator('#closeSearchPanel').click();
  await page.locator('#inventoryFilters>summary').click();await page.locator('#toggleReorder').click();await page.locator('[data-move-filament=plan2][data-move-direction="-1"]').click();assert.deepEqual(await ids(),['plan2','plan','wish','wish2']);assert.equal(await page.locator('[data-move-filament=wish][data-move-direction="-1"]').isDisabled(),true);assert.equal(await page.evaluate(()=>moveFilament('wish','plan')),false);await page.locator('#toggleReorder').click();
  await page.locator('[data-tab=all]').click();assert.deepEqual(await ids(),['owned','empty']);assert.equal(await page.evaluate(()=>currentOfflineState().items.length),6);
  await page.evaluate(()=>{items=items.filter(isPlanned);selected.clear();setTab('all')});assert.equal(await page.locator('#items [data-row-id]').count(),0);assert.match(await page.locator('#items').innerText(),/購入予定.*タブ/);await page.locator('[data-tab=planned]').click();assert.equal((await ids()).length,4);assert.deepEqual(errors,[]);await page.close();console.log('PASS purchases '+width+'px: owned separation, simultaneous groups in four views/fonts, combined search/bulk selection, scoped sort/reorder, empty groups and retained data.');
 }
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
