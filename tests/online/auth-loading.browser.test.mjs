import {chromium} from '../../online/node_modules/playwright-core/index.mjs';
import http from 'node:http';
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const projectUrl=JSON.parse(readFileSync(new URL('../../online/config.json',import.meta.url))).url.replace(/\/$/,'');
const user='22222222-2222-4222-8222-222222222222',lib='11111111-1111-4111-8111-111111111111';
const token='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:user,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.test';
const server=http.createServer((req,res)=>{const name=req.url.split('?')[0].split('/').pop()||'index.html';if(!['index.html','online.js','online.css','config.json'].includes(name)&&!/^catalog-images-[a-f0-9]{16}\.json$/.test(name)){res.writeHead(404).end();return}res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/json');res.end(name==='config.json'?JSON.stringify({url:projectUrl,key:'sb_publishable_test'}):readFileSync(new URL('../../online-dist/'+name,import.meta.url)))});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.SPOOL_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 for(const scenario of ['slow-success','failure-retry','logout-during-load']){
  const page=await browser.newPage(),errors=[];let ensureCalls=0,otherCalls=0,entered,release;
  const requestStarted=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>release=resolve);
  page.on('pageerror',error=>errors.push(error.message));
  await page.route(projectUrl+'/**',async route=>{const url=new URL(route.request().url());let data=[];
   if(url.pathname.endsWith('/auth/v1/user'))data={id:user,email:'qa@example.com'};
   else if(url.pathname.endsWith('/auth/v1/logout'))data={};
   else if(url.pathname.endsWith('/rpc/ensure_my_library')){ensureCalls++;if(ensureCalls===1){entered();await gate;if(scenario==='failure-retry'){await route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({code:'42501',message:'permission denied'})});return}}data=lib;}
   else {if(!url.pathname.endsWith('/rpc/spool_is_admin'))otherCalls++;if(url.pathname.endsWith('/libraries'))data=[{id:lib,name:'QA library',personal:true,owner_id:user}];else if(url.pathname.endsWith('/rpc/spool_is_admin'))data=false;else if(url.pathname.endsWith('/library_state'))data={revision:0,state:{items:[],reservations:[],deleted:[],customColorPresets:[]}};else if(url.pathname.endsWith('/library_members'))data=url.searchParams.get('select')==='role'?{role:'owner'}:[];}
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.addInitScript(({projectUrl,user,token})=>{sessionStorage.setItem('spool-auth-'+new URL(projectUrl).hostname.split('.')[0],JSON.stringify({access_token:token,refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:user,email:'qa@example.com'}}));window.__loadFailures=[];new MutationObserver(()=>{const text=document.querySelector('#cloud-panel')?.textContent||'';if(text.includes('ライブラリを読み込めませんでした'))window.__loadFailures.push(text)}).observe(document,{childList:true,subtree:true});},{projectUrl,user,token});
  await page.goto('http://127.0.0.1:'+server.address().port+'/spool/');await requestStarted;
  try{
   await page.locator('#cloud-loading').waitFor({timeout:3000});assert.equal(await page.locator('#cloud-retry').count(),0);assert.equal(await page.locator('main').isVisible(),false);assert.deepEqual(await page.evaluate(()=>window.__loadFailures),[]);
   if(scenario==='logout-during-load'){await page.locator('#cloud-account-open').click();await page.locator('#cloud-logout').click();await page.locator('#cloud-login').waitFor();release();await page.waitForTimeout(250);assert.equal(otherCalls,0);assert.equal(await page.locator('main').isVisible(),false);assert.equal(await page.locator('#cloud-library').count(),0);}
   else{release();if(scenario==='failure-retry'){await page.locator('#cloud-retry').waitFor();assert.equal(await page.locator('#cloud-loading').count(),0);await page.locator('#cloud-retry').click();}await page.locator('#cloud-library').waitFor();assert.equal(await page.locator('main').isVisible(),true);assert.equal(await page.locator('#cloud-error').textContent(),'');assert.equal(ensureCalls,scenario==='failure-retry'?2:1);if(scenario==='slow-success')assert.deepEqual(await page.evaluate(()=>window.__loadFailures),[]);}
   assert.deepEqual(errors,[]);console.log('PASS auth loading: '+scenario);
  }finally{release();await page.close()}
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
