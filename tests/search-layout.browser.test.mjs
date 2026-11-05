import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import {chromium} from '../online/node_modules/playwright-core/index.mjs';

const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url));
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html)});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.SPOOL_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const stock=['Matte A','Silk B','Plain C','Literal D'].map((name,i)=>({id:'search-'+i,name,brand:'Bambu Lab',material:'PLA',variant:'PLA Basic',colorName:['白','青','黒','緑'][i],color:['#FFFFFF','#2255AA','#000000','#287A45'][i],remaining:800,capacity:1000,diameter:'1.75',location:['棚 A','棚 B','','none'][i],amazonUrl:'https://www.amazon.co.jp/dp/B012345678',shopUrl:'https://jp.elegoo.com/products/pla-translucent',tags:[['マット','授業'],['シルク'],[],['none','<script>bad</script>']][i],image:''}));
const bookings=['予約マット','予約タグなし'].map((title,i)=>({id:'booking-search-'+i,title,registeredDate:'2026-11-05',deadline:'2026-11-09',weekday:'木',className:'A2',desiredColor:'白',color:'#FFFFFF',printStatus:'印刷予定',printMinutes:90,tags:i?[]:['マット']}));
const shots=process.env.SPOOL_SCREENSHOT_DIR;if(shots)fs.mkdirSync(shots,{recursive:true});
try{
 for(const width of [1440,390,320,768]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+(process.env.SPOOL_TEST_BASE_PATH||'/'));
  await page.evaluate(({stock,bookings})=>{localStorage.setItem('spool-inventory-v1',JSON.stringify(stock));localStorage.setItem('spool-inventory-v1-reservations',JSON.stringify(bookings))},{stock,bookings});await page.reload();
  if(width>1000){await page.locator('#splitView').click();assert.equal(await page.locator('#splitView').getAttribute('aria-pressed'),'true')}else assert.equal(await page.locator('#gridView').isVisible(),false);
  assert.equal(await page.locator('#items').evaluate(x=>getComputedStyle(x).gridTemplateColumns.split(' ').length),width>1000?2:1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await page.locator('.filament-row').first().evaluate(x=>x.scrollWidth<=x.clientWidth),true);
  const row=page.locator('#items .filament-row').first();
  const pairs=await row.evaluate(el=>{const links=[...el.querySelectorAll('.shop-link')].map(x=>x.getBoundingClientRect()),use=el.querySelector('[data-use]').getBoundingClientRect(),edit=el.querySelector('[data-edit]').getBoundingClientRect();return {links:Math.abs(links[0].top-links[1].top),buttons:Math.abs(use.top-edit.top),linkRects:links.map(x=>({x:x.x,y:x.y,w:x.width,h:x.height}))}});assert.ok(pairs.links<2&&pairs.buttons<2,'Paired links and buttons stay in their rows at '+width+' '+JSON.stringify(pairs));
  for(const mode of (width>1000?['list','grid','split']:['list'])){if(width>1000)await page.locator('#'+mode+'View').click();const pos=await row.evaluate(el=>{const r=el.getBoundingClientRect(),c=el.querySelector('.row-select').getBoundingClientRect();return {x:c.left-r.left,y:c.top-r.top}});assert.ok(pos.x>=10&&pos.x<=14&&pos.y>=10&&pos.y<=14,'Corner checkbox in '+mode+' at '+width);}
  if(shots&&width===390)await page.screenshot({path:shots+'/paired-actions-390.png',fullPage:true,animations:'disabled'});
  if(shots&&width===1440)await page.screenshot({path:shots+'/two-columns-1440.png',fullPage:true,animations:'disabled'});
  await page.locator('#inventoryFilters>summary').click();
  await page.locator('#locationFilter').selectOption('v:棚 A');await page.locator('#tagFilter').selectOption('v:マット');assert.equal(await page.locator('#items .filament-row').count(),1);assert.equal(await page.locator('#filterCount').textContent(),'2');
  await page.locator('#resetInventoryFilters').click();assert.equal(await page.locator('#items .filament-row').count(),4);
  await page.locator('#locationFilter').selectOption('none');assert.equal(await page.locator('#items .filament-row').getAttribute('data-row-id'),'search-2');
  await page.locator('#locationFilter').selectOption('v:none');assert.equal(await page.locator('#items .filament-row').getAttribute('data-row-id'),'search-3');
  await page.locator('#resetInventoryFilters').click();await page.locator('#tagFilter').selectOption('none');assert.equal(await page.locator('#items .filament-row').getAttribute('data-row-id'),'search-2');await page.locator('#resetInventoryFilters').click();
  await page.locator('#search').fill('#シルク');assert.equal(await page.locator('#items .filament-row').getAttribute('data-row-id'),'search-1');
  await page.locator('#search').click();await page.locator('#searchDialog').waitFor();assert.equal(await page.locator('#foregroundResultCount').textContent(),'1');await page.locator('[data-search-result="0"]').click();await page.locator('#filamentDetails').waitFor();assert.equal(await page.locator('#inventoryFilters #tagFilter').count(),1);await page.locator('#closeFilamentDetails').click();
  await page.locator('#search').click();await page.locator('#clearSearchQuery').click();await page.locator('#searchFiltersTab').click();
  assert.equal(await page.locator('#inventoryFilters .filter-fields').count(),0);assert.equal(await page.locator('#tagFilter').count(),1);
  await page.locator('#foregroundFilters #locationFilter').selectOption('v:棚 A');await page.locator('#foregroundFilters #tagFilter').selectOption('v:マット');
  assert.equal(await page.locator('#foregroundFilterCount').textContent(),'2');assert.equal(await page.locator('#foregroundResultCount').textContent(),'1');
  assert.equal(await page.locator('#searchDialog').evaluate(x=>x.scrollWidth<=x.clientWidth&&x.getBoundingClientRect().bottom<=innerHeight+1),true);
  await page.locator('#searchQueryTab').click();await page.locator('#foregroundSearch').fill('#マット');
  if(shots&&width===390)await page.screenshot({path:shots+'/foreground-search-390.png',animations:'disabled'});
  await page.keyboard.press('Escape');await page.locator('#searchDialog').waitFor({state:'hidden'});assert.equal(await page.locator('#inventoryFilters #tagFilter').count(),1);assert.equal(await page.locator('#search').inputValue(),'#マット');
  await page.locator('#resetInventoryFilters').click();await page.locator('#search').fill('');await page.keyboard.press('Control+k');await page.locator('#searchDialog').waitFor();await page.locator('#applySearchPanel').click();assert.equal(await page.locator('#items .filament-row').count(),4);
  await page.locator(await page.locator('#navBookings').isVisible()?'#navBookings':'#showBookings').click();await page.locator('#bookingFilters>summary').click();await page.locator('#bookingTagFilter').selectOption('v:マット');assert.equal(await page.locator('#bookingRows tr').count(),1);assert.equal(await page.locator('#bookingFilterCount').textContent(),'1');await page.locator('#resetBookingFilters').click();
  await page.locator('#bookingSearch').click();await page.locator('#foregroundSearch').fill('#マット');assert.equal(await page.locator('#foregroundResultCount').textContent(),'1');await page.locator('#searchFiltersTab').click();await page.locator('#foregroundFilters #bookingTagFilter').selectOption('v:マット');await page.locator('#searchQueryTab').click();await page.locator('[data-search-result="0"]').click();assert.equal(await page.locator('#bookingDialog').isVisible(),false);assert.equal(await page.locator('#bookingView .search-result-highlight').count(),1);assert.equal(await page.locator('#bookingFilters #bookingTagFilter').count(),1);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('spool-inventory-v1'))),stock);assert.deepEqual(errors,[]);await page.close();
  console.log('PASS '+width+'px: responsive inventory layout, location/tag combinations and unset values, hashtag search, foreground result/filter tabs, Escape restoration, shortcut, booking search and original data preservation.');
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
