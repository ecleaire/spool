import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import http from 'node:http';
import {chromium} from '../online/node_modules/playwright-core/index.mjs';
const html=readFileSync(new URL('../dist/index.html',import.meta.url));
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html)});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.SPOOL_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{for(const width of [1440,390,320]){
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.locator('#add').click();await page.locator('#editorProduct').selectOption('bambu-basic');
 const draft=page.locator('#form .tag-entry-input');
 await draft.fill('夙川');await draft.press('Enter');assert.equal(await draft.inputValue(),'');
 assert.equal(await page.locator('#editor').isVisible(),true);
 await draft.fill('よく使う');await page.locator('#form .tag-entry-add').click();assert.equal(await draft.inputValue(),'');
 await draft.fill('夙川');await draft.press('Enter');assert.equal(await page.locator('#form .selected-tag').count(),2);
 await page.locator('#form [data-remove-tag="夙川"]').click();assert.equal(await page.locator('#form .selected-tag').count(),1);
 await draft.fill('青系');await page.locator('#form .dialog-actions .primary').click();
 await page.locator('#editor').waitFor({state:'hidden'});
 const tags=await page.evaluate(()=>items[0].tags);assert.deepEqual(tags,['よく使う','青系']);
 assert.deepEqual(await page.evaluate(()=>sortTags(['夙川','よく使う','ノーマル','PLA','青系'])),['PLA','ノーマル','青系','よく使う','夙川']);
 await page.locator('#add').click();await page.locator('#editorProduct').selectOption('bambu-basic');assert.equal(await draft.inputValue(),'');assert.equal(await page.locator('#form .selected-tag').count(),0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('#cancel').click();await page.locator(width>760?'#navBookings':'#showBookings').click();await page.locator('#addBooking').click();
 await page.locator('#bookingExtraDetails>summary').click();await page.locator('#bookingTagDetails>summary').click();
 const bookingDraft=page.locator('#bookingForm .tag-entry-input');await bookingDraft.fill('急ぎ');await bookingDraft.press('Enter');assert.equal(await bookingDraft.inputValue(),'');assert.equal(await page.locator('#bookingForm .selected-tag').count(),1);
 assert.deepEqual(errors,[]);await page.close();console.log('PASS '+width+'px: tag entry clears, chip removal, duplicate guard, submit draft, sorted display, reset and booking entry.');
}}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
