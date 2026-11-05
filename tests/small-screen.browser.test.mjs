import {chromium} from '../online/node_modules/playwright-core/index.mjs';
import http from 'node:http';import {readFileSync,mkdirSync} from 'node:fs';import assert from 'node:assert/strict';
const html=readFileSync(new URL('../dist/index.html',import.meta.url));
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html)});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.SPOOL_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const shots=process.env.SPOOL_SCREENSHOT_DIR;if(shots)mkdirSync(shots,{recursive:true});
async function assertActions(page,label){const violations=await page.locator('#items>.filament-row').evaluateAll(rows=>rows.flatMap(row=>{const bound=row.getBoundingClientRect(),controls=[...row.querySelectorAll('.actions>button,.actions .shop-link')].filter(x=>x.getClientRects().length).map(x=>({text:x.textContent.trim(),r:x.getBoundingClientRect()})),bad=[];for(let i=0;i<controls.length;i++){const a=controls[i];if(a.r.left<bound.left-1||a.r.right>bound.right+1)bad.push(a.text+' outside card');for(let j=i+1;j<controls.length;j++){const b=controls[j];if(Math.min(a.r.right,b.r.right)-Math.max(a.r.left,b.r.left)>1&&Math.min(a.r.bottom,b.r.bottom)-Math.max(a.r.top,b.r.top)>1)bad.push(a.text+' overlaps '+b.text)}}return bad}));assert.deepEqual(violations,[],label);}
try{
 for(const mode of ['grid','split']){
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(mode=>{localStorage.setItem('spool-display-v1:offline',JSON.stringify({version:1,view:mode,sort:'manual'}));const items=['PLA','PLA Silk','PLA Matte'].map((name,i)=>({id:'qa-'+i,name,brand:'ELEGOO',material:'PLA',variant:name,colorName:'テスト用カラー',color:'#607D52',remaining:i?1000:300,capacity:1000,diameter:'1.75',image:'',tags:['よく使う'],amazonUrl:'https://www.amazon.co.jp/',shopUrl:'https://example.com/filament'}));localStorage.setItem('spool-inventory-v1',JSON.stringify(items));},mode);
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(mode=>document.querySelector('#items').classList.contains(mode+'-mode'),mode);
  for(const width of [320,390,600,760,1000]){
   await page.setViewportSize({width,height:844});await page.waitForFunction(()=>!document.querySelector('#items').classList.contains('grid-mode')&&!document.querySelector('#items').classList.contains('split-mode'));
   assert.equal(await page.locator('.view-switch').isVisible(),false);if(width<=760){const sizing=await page.evaluate(()=>{const title=document.querySelector('.page-title').getBoundingClientRect(),toolbar=document.querySelector('.inventory .toolbar').getBoundingClientRect(),search=document.querySelector('.inventory .toolbar>.search').getBoundingClientRect(),stats=document.querySelector('.stats').getBoundingClientRect();return {title:title.height,stats:stats.height,search:search.width,toolbar:toolbar.width}});assert.ok(sizing.title<=68,'Mobile title too tall '+JSON.stringify(sizing));assert.ok(sizing.stats<=175,'Mobile stats too tall '+JSON.stringify(sizing));assert.ok(sizing.search>=sizing.toolbar-28,'Search does not fill width '+JSON.stringify(sizing));}const rows=await page.locator('#items>.filament-row').evaluateAll(nodes=>nodes.map(x=>{const r=x.getBoundingClientRect();return {left:r.left,top:r.top,bottom:r.bottom}}));assert.ok(rows[1].top>=rows[0].bottom-1);assert.ok(Math.abs(rows[0].left-rows[1].left)<1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Overflow '+width);
   await assertActions(page,'Single-column actions at '+width);
   if(width===390&&shots)await page.screenshot({path:shots+'/single-column-'+mode+'-390.png',fullPage:true});
  }
  await page.reload();assert.equal(await page.locator('#items').getAttribute('class'),'');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('spool-display-v1:offline')).view),mode);
  for(const width of [1001,1280,1440,1920]){
   await page.setViewportSize({width,height:1000});await page.waitForFunction(mode=>document.querySelector('#items').classList.contains(mode+'-mode'),mode);assert.equal(await page.locator('.view-switch').isVisible(),true);
   if(mode==='grid'){await assertActions(page,'Grid actions at '+width);}
  }
  if(mode==='grid'&&shots)await page.screenshot({path:shots+'/grid-actions-desktop.png',fullPage:true});assert.deepEqual(errors,[]);await page.close();console.log('PASS '+mode+': saved preference, one column <=1000px, resize/restore, no horizontal overflow, card actions do not overlap.');
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
