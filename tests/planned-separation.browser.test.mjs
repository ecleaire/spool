import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync} from 'node:fs';
import {chromium} from '../online/node_modules/playwright-core/index.mjs';
const base={name:'在庫の材料',brand:'QA',material:'PLA',colorName:'青',color:'#2255AA',capacity:1000,remaining:800,image:'',tags:[]};
const stock=[{...base,id:'owned'},{...base,id:'empty',remaining:0,inventoryStatus:'owned'},{...base,id:'plan',name:'購入専用の予定',inventoryStatus:'planned',purchaseIntent:'planned',tags:['購入専用タグ']},{...base,id:'wish',name:'購入専用の希望',inventoryStatus:'planned',purchaseIntent:'wish',tags:['希望専用タグ']}];
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(readFileSync('dist/index.html'))});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.SPOOL_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 for(const width of [320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(data=>localStorage.setItem('spool-inventory-v1',JSON.stringify(data)),stock);await page.goto('http://127.0.0.1:'+server.address().port);
  const ids=()=>page.locator('#items [data-row-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.rowId).sort());
  for(const mode of ['list','split','grid','simple']){await page.locator('#'+mode+'View').click();assert.deepEqual(await ids(),['empty','owned']);assert.equal(await page.locator('#totalCount').innerText(),'2');assert.equal(await page.locator('#navCount').innerText(),'2');assert.match(await page.locator('#shown').innerText(),/2 スプール中 2 件/);}
  await page.locator('#search').click();await page.locator('#foregroundSearch').fill('購入専用');assert.equal(await page.locator('#foregroundResultCount').innerText(),'0');await page.locator('#clearSearchQuery').click();await page.locator('#closeSearchPanel').click();
  await page.locator('[data-select=owned]').check();await page.locator('#selectAll').check();assert.deepEqual(await page.evaluate(()=>[...selected].sort()),['empty','owned']);
  await page.locator('[data-tab=planned]').click();await page.locator('[data-purchase-intent=""]').click();assert.deepEqual(await ids(),['plan','wish']);assert.equal(await page.locator('#batchActions').isVisible(),false);assert.match(await page.locator('#shown').innerText(),/2 スプール中 2 件/);
  await page.locator('#listView').click();await page.locator('[data-row-id=plan] [data-search-tag="購入専用タグ"]').click();assert.deepEqual(await ids(),['plan']);assert.equal(await page.locator('#foregroundResultCount').innerText(),'1');await page.locator('#clearSearchQuery').click();await page.locator('#searchFiltersTab').click();await page.locator('#clearSearchFilters').click();await page.locator('#closeSearchPanel').click();
  await page.locator('[data-tab=planned]').click();await page.locator('[data-purchase-intent=wish]').click();assert.deepEqual(await ids(),['wish']);await page.locator('[data-tab=all]').click();assert.deepEqual(await ids(),['empty','owned']);assert.equal(await page.evaluate(()=>currentOfflineState().items.length),4);
  await page.evaluate(()=>{items=items.filter(isPlanned);selected.clear();setTab('all')});assert.equal(await page.locator('#items [data-row-id]').count(),0);assert.match(await page.locator('#items').innerText(),/購入予定.*タブ/);await page.locator('[data-tab=planned]').click();await page.locator('[data-purchase-intent=""]').click();assert.deepEqual(await ids(),['plan','wish']);assert.deepEqual(errors,[]);await page.close();console.log('PASS planned separation '+width+'px: four views, owned/empty totals, search, bulk scope, planned tags, wish filtering, retained data and plans-only guidance.');
 }
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
