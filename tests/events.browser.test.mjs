import {chromium} from '../online/node_modules/playwright-core/index.mjs';
import http from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(readFileSync(new URL('../dist/index.html',import.meta.url)))});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.SPOOL_CHROMIUM_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
try{
 for(const width of [320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(()=>showEventView());
  assert.equal(await page.locator('#eventView').isVisible(),true);
  for(const selector of ['#bookingView','.stats','.inventory','#add','#addBooking'])assert.equal(await page.locator(selector).isVisible(),false,selector);
  assert.match(await page.locator('#eventView').innerText(),/2026年12月13日（日）/u);assert.equal(await page.locator('.event-deadline-announcement time').getAttribute('datetime'),'2026-12-13');assert.equal(await page.locator('#eventView h3').filter({hasText:'審査基準（仮）'}).count(),1);assert.equal((await page.locator('#eventView').innerText()).includes('正確な日付は決まり次第'),false);
  assert.equal(await page.locator('.event-details').getAttribute('open'),null);
  await page.locator('.event-details summary').click();assert.equal(await page.locator('.event-details ul').isVisible(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.ok(await page.locator('.event-card p').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=17));
  if(process.env.SPOOL_SCREENSHOT_DIR){mkdirSync(process.env.SPOOL_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:process.env.SPOOL_SCREENSHOT_DIR+'/events-'+width+'.png',fullPage:true})}
  await page.evaluate(()=>showBookingView(true));assert.equal(await page.locator('#eventView').isVisible(),false);assert.equal(await page.locator('#bookingView').isVisible(),true);
  await page.evaluate(()=>showBookingView(false));assert.equal(await page.locator('.inventory').isVisible(),true);assert.equal(await page.locator('#eventView').isVisible(),false);
  assert.deepEqual(errors,[]);await page.close();console.log('PASS events '+width+'px: navigation, disclosure, readable text, no overflow.');
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
