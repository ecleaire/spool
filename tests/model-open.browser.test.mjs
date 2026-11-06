import {chromium} from '../online/node_modules/playwright-core/index.mjs';
import http from 'node:http';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(readFileSync(new URL('../dist/index.html',import.meta.url)))});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.SPOOL_CHROMIUM_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);
 await page.evaluate(()=>{showBookingView(true);document.querySelector('#bookingRows').innerHTML='<tr><td>'+bookingFileMarkup({files:['C:\\Models\\作品.3mf']})+'</td></tr>';bindModelFileActions()});
 await page.locator('[data-model-path]').click();assert.equal(await page.locator('#modelOpenDialog').isVisible(),true);
 assert.equal(await page.locator('.model-open-link').getAttribute('href'),'spool-open://open/?path='+encodeURIComponent('C:\\Models\\作品.3mf'));
 assert.equal(await page.locator('.model-download-link').count(),0);
 // Exercise fallback UI without invoking any OS application or protocol handler.
 await page.locator('.model-open-link').evaluate(el=>el.addEventListener('click',event=>event.preventDefault()));await page.locator('.model-open-link').click();
 assert.match(await page.locator('.model-open-status').innerText(),/反応がない場合/);assert.equal(await page.locator('.model-helper-help').getAttribute('open'),'');
 await page.locator('#modelOpenDialog button').click();
 await page.evaluate(()=>showModelOpenDialog({name:'作品.3mf',url:'https://example.com/作品.3mf'}));assert.match(await page.locator('.model-open-link').getAttribute('href'),/^spool-open:\/\/open\/\?url=/);
 await page.locator('#modelOpenDialog button').click();await page.evaluate(()=>showModelOpenDialog({name:'作品.3mf',data:'data:application/octet-stream;base64,AAAA'}));assert.match(await page.locator('.model-open-link').getAttribute('href'),/^spool-open:\/\/pick\//);assert.equal(await page.locator('.model-download-link').count(),1);
 assert.deepEqual(errors,[]);console.log('PASS model opener: local-path confirmation, signed/embedded routes and visible first-time setup/fallback. No OS app launched.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
