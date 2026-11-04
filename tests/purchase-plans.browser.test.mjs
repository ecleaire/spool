import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import {chromium} from '../online/node_modules/playwright-core/index.mjs';
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url));
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html)});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.SPOOL_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const seed={id:'qa-stock',name:'QA spool',brand:'Bambu Lab',material:'PLA',variant:'PLA Basic',colorName:'白',color:'#FFFFFF',remaining:800,capacity:1000,diameter:'1.75',image:'',tags:['独自タグ'],location:'棚 A'};
const screenshots=process.env.SPOOL_SCREENSHOT_DIR;if(screenshots)fs.mkdirSync(screenshots,{recursive:true});
try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(seed=>localStorage.setItem('spool-inventory-v1',JSON.stringify([seed])),seed);await page.reload();
  await page.locator('#inventoryFilters>summary').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);if(width<761)assert.ok(await page.locator('#inventoryFilters select').first().evaluate(x=>x.getBoundingClientRect().width)>200);await page.locator('#inventoryFilters>summary').click();
  await page.locator('[data-edit="qa-stock"]').first().click();
  assert.equal(await page.locator('#editor').evaluate(x=>x.scrollWidth>x.clientWidth),false);assert.ok(await page.locator('#editor .dialog-actions').evaluate(x=>x.getBoundingClientRect().height)<(width<761?140:90));assert.equal(await page.evaluate(()=>!!(document.querySelector('.editor-fields').compareDocumentPosition(document.querySelector('.editor-visual'))&Node.DOCUMENT_POSITION_FOLLOWING)),true);await page.locator('#inventoryStatus').selectOption('planned');
  await page.locator('#filamentTagDetails summary').click();const tags=page.locator('[data-tag-suggestions="form"]');
  assert.equal(await page.locator('#locationSuggestions option[value="棚 A"]').count(),1);
  await page.locator('#form [name=capacity]').fill('1000');await page.locator('#form [name=remaining]').fill('1000');
  await page.locator('[data-spool-capacity="990"]').click();assert.equal(await page.locator('#form [name=remaining]').inputValue(),'990');
  await page.locator('#form [name=remaining]').fill('800');await page.locator('[data-spool-capacity="1000"]').click();assert.equal(await page.locator('#form [name=remaining]').inputValue(),'800');
  assert.equal(await tags.getByRole('button',{name:'#独自タグ',exact:true}).count(),1);
  assert.equal(await tags.getByRole('button',{name:'#試作用',exact:true}).count(),0);
  await tags.getByRole('button',{name:'#よく使う',exact:true}).click();
  await tags.getByRole('button',{name:'#マット',exact:true}).click();
  await tags.getByRole('button',{name:'#マット',exact:true}).click();
  assert.equal(await page.locator('#form [name=tags]').inputValue(),'独自タグ, よく使う');
  if(screenshots)await page.screenshot({path:screenshots+'/purchase-form-'+width+'.png'});
  await page.locator('#form button.primary[type=submit]').click();await page.reload();
  assert.equal(await page.locator('#statCount').textContent(),'0');assert.equal(await page.locator('#statWeight').textContent(),'0.00');
  await page.locator('[data-tab=planned]').click();assert.equal(await page.locator('[data-row-id="qa-stock"] .purchase-badge').first().textContent(),'購入予定');assert.equal(await page.locator('[data-use="qa-stock"]').isDisabled(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(screenshots)await page.screenshot({path:screenshots+'/purchase-list-'+width+'.png'});
  await page.locator('[data-edit="qa-stock"]').first().click();await page.locator('#filamentTagDetails summary').click();assert.equal(await tags.getByRole('button',{name:'#よく使う',exact:true}).getAttribute('aria-pressed'),'true');
  await page.locator('#inventoryStatus').selectOption('owned');await page.locator('#form button.primary[type=submit]').click();await page.locator('[data-tab=all]').click();assert.equal(await page.locator('#statCount').textContent(),'1');assert.equal(await page.locator('#statWeight').textContent(),'0.80');
  await page.locator('#add').click();await page.locator('#editorProduct').selectOption('bambu-basic');await page.locator('#inventoryStatus').selectOption('planned');await page.locator('#form button.primary[type=submit]').click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('spool-inventory-v1')).filter(x=>x.inventoryStatus==='planned').length),1);
  await page.locator(width<761?'#showBookings':'#navBookings').click();await page.locator('#addBooking').click();await page.locator('#bookingForm [name=title]').fill('QA予約');await page.locator('#bookingNoPreference').click();await page.locator('#bookingDeadlineUnknown').check();
  await page.locator('#bookingTagDetails summary').click();const bookingTags=page.locator('[data-tag-suggestions="bookingForm"]');await bookingTags.getByRole('button',{name:'#ノーマル',exact:true}).click();await page.locator('#saveBookingButton').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('spool-inventory-v1-reservations'))[0].tags[0]),'ノーマル');
  await page.locator(width<761?'#showInventory':'#navInventory').click();await page.locator('#add').click();await page.locator('#editorProduct').selectOption('bbamboo-silk');assert.equal(await page.locator('#form [name=brand]').inputValue(),'B.BAMBOO');assert.equal(await page.locator('#form [name=colorName]').inputValue(),'ホワイト');assert.equal(await page.locator('#form [name=capacity]').inputValue(),'1000');await page.locator('#saveAndContinue').click();await page.waitForFunction(()=>document.querySelector('#editor').open&&document.querySelector('#editor').scrollTop===0&&document.querySelector('#form').scrollTop===0);await page.locator('#editorProduct').selectOption('bbamboo-glow');assert.equal(await page.locator('#form [name=colorName]').inputValue(),'蓄光ブルー');assert.equal(await page.locator('#form [name=capacity]').inputValue(),'1000');assert.ok((await page.locator('#imageStatus').textContent()).includes('ユーザー提供'));await page.locator('#cancel').click();assert.deepEqual(errors,[]);await page.close();console.log('PASS '+width+'px: purchase registration/edit/restore, stock exclusion, tag toggles/custom tags and reservation tags.');
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
