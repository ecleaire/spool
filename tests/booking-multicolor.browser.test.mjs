import {addBookingReference} from './booking-test-helpers.mjs';
import {chromium} from '../online/node_modules/playwright-core/index.mjs';
import http from 'node:http';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const html=readFileSync(new URL('../dist/index.html',import.meta.url));
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.SPOOL_CHROMIUM_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
try{for(const width of [320,390,1440]){
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{if(!localStorage.getItem('spool-inventory-v1'))localStorage.setItem('spool-inventory-v1',JSON.stringify([{id:'red',name:'PLA Translucent',brand:'ELEGOO',material:'PLA',colorName:'半透明レッド',color:'#DD2255',remaining:800,capacity:1000,image:''},{id:'blue',name:'PLA',brand:'ELEGOO',material:'PLA',colorName:'ブルー',color:'#2244DD',remaining:800,capacity:1000,image:''}]))});
 await page.goto('http://127.0.0.1:'+server.address().port);assert.match(await page.locator('#items').innerText(),/クリア/);
 await page.evaluate(()=>{showBookingView(true);openBooking()});await page.locator('#bookingForm [name=title]').fill('複数色のキーホルダー');
 const choice=color=>page.locator('[data-booking-color]').filter({has:page.locator('strong',{hasText:color})});
 await choice('クリアレッド').click();await choice('ブルー').click();assert.equal(await page.locator('[data-booking-color][aria-pressed=true]').count(),2);
 if(!await page.locator('#bookingColorSearchDetails').evaluate(x=>x.open))await page.locator('#bookingColorSearchDetails>summary').click();await page.locator('#bookingColorSearch').fill('クリア');assert.equal(await page.locator('[data-booking-color][aria-pressed=true]').count(),1);if(!await page.locator('#bookingColorSearchDetails').evaluate(x=>x.open))await page.locator('#bookingColorSearchDetails>summary').click();await page.locator('#bookingColorSearch').fill('');assert.equal(await page.locator('[data-booking-color][aria-pressed=true]').count(),2);
 await choice('ブルー').click();assert.equal(await page.locator('[data-booking-color][aria-pressed=true]').count(),1);await choice('ブルー').click();await addBookingReference(page);await page.locator('#saveBookingButton').click();await page.locator('#bookingDialog').waitFor({state:'hidden'});
 const saved=await page.evaluate(()=>reservations[0]);assert.equal(saved.requestedFilaments.length,2);assert.match(saved.desiredColor,/クリアレッド.*ブルー/);assert.equal(saved.requestedFilaments[0].translucent,true);assert.equal(saved.requestedFilaments[1].translucent,false);
 const colors=page.locator(width<761?'#bookingCards .booking-color-samples':'#bookingRows .booking-color-samples');assert.equal(await colors.locator('i').count(),2);assert.equal(await colors.locator('.swatch-translucent').count(),1);
 await page.reload();await page.evaluate(id=>{showBookingView(true);openBooking(id)},saved.id);assert.equal(await page.locator('[data-booking-color][aria-pressed=true]').count(),2);
 await page.locator('#bookingNoPreference').click();assert.equal(await page.locator('[data-booking-color][aria-pressed=true]').count(),0);await page.locator('#bookingRandom').click();assert.equal(await page.locator('[data-booking-color][aria-pressed=true]').count(),1);
 await page.evaluate(()=>{items=items.filter(x=>x.id==='blue');renderBookingColors()});await page.locator('#cancelBooking').click();await page.evaluate(id=>openBooking(id),saved.id);assert.equal(await page.locator('[data-booking-color][aria-pressed=true]').count(),2,'removed library colors remain editable');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);await page.close();console.log('PASS '+width+'px: multiple colors, toggle/search, save/reload, individual transparency, no-preference/random and missing stock preservation.');
}}finally{await browser.close();await new Promise(r=>server.close(r))}
