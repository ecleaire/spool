import {addLegacySiteNotice} from '../tools/add-legacy-site-notice.mjs';
import {chromium} from '../online/node_modules/playwright-core/index.mjs';
import {readFileSync,mkdirSync} from 'node:fs';import http from 'node:http';import assert from 'node:assert/strict';
const original=readFileSync(new URL('../online-dist/index.html',import.meta.url),'utf8'),html=addLegacySiteNotice(original);
assert.equal(html,addLegacySiteNotice(html));assert.equal((html.match(/id="spool-legacy-site-notice"/g)||[]).length,1);
assert.equal(html.match(/<body\b[^>]*>/i)[0],original.match(/<body\b[^>]*>/i)[0]);
const scripts=value=>[...value.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)].map(x=>x[0]);assert.deepEqual(scripts(html),scripts(original));assert.ok(!original.includes('spool-legacy-site-notice'));
const project=JSON.parse(readFileSync(new URL('../online/config.json',import.meta.url))).url;
const server=http.createServer((req,res)=>{const file=req.url.split('?')[0].split('/').pop()||'index.html';if(!['index.html','online.js','online.css','config.json'].includes(file)){res.writeHead(404).end();return}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/html;charset=utf-8');res.end(file==='index.html'?html:file==='config.json'?JSON.stringify({url:project,key:''}):readFileSync(new URL('../online-dist/'+file,import.meta.url)))});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({executablePath:process.env.SPOOL_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const shots=process.env.SPOOL_SCREENSHOT_DIR;if(shots)mkdirSync(shots,{recursive:true});
try{
 for(const width of [320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.route(project+'/**',route=>route.abort());
  await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.locator('#cloud-config').waitFor();
  const notice=page.locator('#spool-legacy-site-notice');assert.equal(await notice.isVisible(),true);assert.match(await notice.innerText(),/こちらは旧サイトです/);assert.equal(await notice.locator('a').getAttribute('href'),'https://ecleaire.github.io/spool/');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await notice.evaluate(x=>x.scrollWidth<=x.clientWidth),true);assert.ok(await notice.locator('a').evaluate(x=>x.getBoundingClientRect().height>=44));assert.ok(await notice.evaluate(x=>x.getBoundingClientRect().top>=0));
  if(shots)await notice.screenshot({path:shots+'/legacy-notice-'+width+'.png'});assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS: legacy notice on 320/390/1440px, latest-site link, preserved body/scripts/auth screen, repeatable injection and no notice on latest build.');
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
