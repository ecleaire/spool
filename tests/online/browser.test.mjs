import {chromium} from '../../online/node_modules/playwright-core/index.mjs';
import http from 'node:http';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const server=http.createServer((req,res)=>{const files={'/':'index.html','/online.js':'online.js','/online.css':'online.css','/config.json':'config.json'};const name=files[req.url];if(!name){res.writeHead(404).end();return}res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html');res.end(name==='config.json'?JSON.stringify({url:'https://example.supabase.co',key:''}):readFileSync(new URL('../../online-dist/'+name,import.meta.url)))});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 const executablePath=process.env.SPOOL_CHROMIUM_PATH||(process.platform==='linux'?'/usr/bin/chromium':undefined);
 browser=await chromium.launch({...executablePath?{executablePath}:{channel:'chrome'},headless:true,args:process.platform==='linux'?['--no-sandbox']:[]});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('spool-inventory-v1',JSON.stringify([{id:'private-offline-data',name:'Do not upload'}]))});
 await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#cloud-config').waitFor();
 assert.equal(await page.locator('main').isVisible(),false);
 assert.deepEqual(await page.evaluate(()=>window.spoolBridge.snapshot()),{items:[],deleted:[],customColorPresets:[],reservations:[]});
 assert.equal(await page.evaluate(()=>localStorage.getItem('spool-inventory-v1')),JSON.stringify([{id:'private-offline-data',name:'Do not upload'}]));
 await page.locator('[name=url]').fill('https://example.supabase.co');await page.locator('[name=key]').fill('sb_secret_never-use');await page.locator('#cloud-config button').click();
 await page.getByText('秘密キーは使用できません').waitFor();assert.equal(await page.locator('main').isVisible(),false);
 assert.deepEqual(errors,[]);
 // A mocked authenticated transport tests UI wiring; it is not a live OAuth check.
 const authenticated=await browser.newPage();
 const lib='11111111-1111-4111-8111-111111111111',user='22222222-2222-4222-8222-222222222222';
 const claims={sub:user,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600};
 const token='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.test';
 const writes=[];
 await authenticated.route('https://example.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url());let data=[];
  if(url.pathname.endsWith('/auth/v1/logout'))data={};
  else if(url.pathname.endsWith('/rpc/ensure_my_library'))data=lib;
  else if(url.pathname.endsWith('/rpc/save_library_state')){writes.push(req.postDataJSON());data=1;}
  else if(url.pathname.endsWith('/libraries'))data=[{id:lib,name:'テストライブラリ',owner_id:user}];
  else if(url.pathname.endsWith('/library_state'))data={library_id:lib,revision:0,state:{items:[],deleted:[],customColorPresets:[],reservations:[]}};
  else if(url.pathname.endsWith('/library_members'))data=url.searchParams.get('select')==='role'?{role:'owner'}:[{user_id:user,role:'owner'}];
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(data)});
 });
 await authenticated.addInitScript(({token,user})=>{
  sessionStorage.setItem('spool-online-config',JSON.stringify({url:'https://example.supabase.co',key:'sb_publishable_test'}));
  sessionStorage.setItem('sb-example-auth-token',JSON.stringify({access_token:token,refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:user,email:'owner@example.com'}}));
 },{token,user});
 authenticated.on('pageerror',e=>errors.push(e.message));
 await authenticated.goto('http://127.0.0.1:'+server.address().port);
 await authenticated.locator('#cloud-library').waitFor();
 assert.equal(await authenticated.locator('main').isVisible(),true);
 await authenticated.evaluate(()=>window.spoolOnlineChanged());
 await authenticated.waitForFunction(()=>document.querySelector('#cloud-save-status')?.textContent==='オンライン保存済み');
 assert.equal(writes.length,1);assert.equal(writes[0].lib,lib);assert.equal(writes[0].expected_revision,0);
 await authenticated.locator('#cloud-logout').click();
 await authenticated.locator('#cloud-login').waitFor({timeout:5000}).catch(async error=>{console.log(await authenticated.locator('#cloud-panel').innerText(),errors);throw error});assert.equal(await authenticated.locator('main').isVisible(),false);
 assert.deepEqual(await authenticated.evaluate(()=>window.spoolBridge.snapshot()),{items:[],deleted:[],customColorPresets:[],reservations:[]});
 assert.deepEqual(errors,[]);
 console.log('PASS: mocked authenticated library load, revision-aware auto-save and logout data clearing.');
 console.log('PASS: Chromium online configuration UI, locked pre-login state, offline-data isolation, secret-key rejection; no runtime errors.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
