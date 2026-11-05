import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import http from 'node:http';
import {chromium} from '../../online/node_modules/playwright-core/index.mjs';
import {rolePermissions} from '../../online/permissions.mjs';
const project=JSON.parse(readFileSync(new URL('../../online/config.json',import.meta.url))).url.replace(/\/$/,'');
const user='22222222-2222-4222-8222-222222222222',lib='11111111-1111-4111-8111-111111111111';
const token='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:user,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.test';
const server=http.createServer((req,res)=>{const name=req.url.split('?')[0].split('/').pop()||'index.html';if(!['index.html','online.js','online.css','config.json','favicon.svg'].includes(name)&&!/^catalog-images-/.test(name)){res.writeHead(404).end();return;}res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.json')?'application/json':'text/html;charset=utf-8');res.end(name==='config.json'?JSON.stringify({url:project,key:'sb_publishable_test'}):readFileSync(new URL('../../online-dist/'+name,import.meta.url)))});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.SPOOL_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{for(const staleError of [false,true]){
 const page=await browser.newPage({viewport:{width:1440,height:1000}});let release,entered;const gate=new Promise(resolve=>release=resolve),started=new Promise(resolve=>entered=resolve);
 await page.route(project+'/**',async route=>{const req=route.request(),url=new URL(req.url()),path=url.pathname;let data=[];
  if(path.endsWith('/rpc/ensure_my_library'))data=lib;
  else if(path.endsWith('/rpc/spool_is_admin'))data=false;
  else if(path.endsWith('/rpc/get_my_library_permissions'))data=rolePermissions('owner');
  else if(path.endsWith('/auth/v1/user'))data={id:user,email:'qa@example.com'};
  else if(path.endsWith('/libraries'))data=[{id:lib,name:'確認用ライブラリ',personal:true,owner_id:user}];
  else if(path.endsWith('/library_members'))data=url.searchParams.get('select')==='role'?{role:'owner'}:[];
  else if(path.endsWith('/library_state'))data={revision:0,state:{items:[],deleted:[],customColorPresets:[],reservations:['a','b'].map(id=>({id,title:'予約'+id,registeredDate:'2026-11-06',weekday:'金',className:'',desiredColor:'希望なし',color:'#808080',colorPreference:'none',printMinutes:60,deadline:''}))}};
  else if(path.endsWith('/library_files')){const booking=url.searchParams.get('booking_id');if(booking==='eq.a'){entered();await gate;if(staleError){await route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({code:'42501',message:'Old booking request denied'})});return;}}data=[{id:booking==='eq.a'?'file-a':'file-b',name:booking==='eq.a'?'A.stl':'B.stl',size:10,object_path:'test/model'}];}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.addInitScript(({project,user,token})=>sessionStorage.setItem('spool-auth-'+new URL(project).hostname.split('.')[0],JSON.stringify({access_token:token,refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user:{id:user,email:'qa@example.com'}})),{project,user,token});
 try{await page.goto('http://127.0.0.1:'+server.address().port+'/spool/');await page.locator('body:not(.cloud-locked)').waitFor();await page.locator('#cloud-account-open').click();await page.locator('#cloud-account-dialog [data-open-tools=data]').click();await page.locator('[data-tool-section=files]>summary').click();await page.locator('#cloud-booking').selectOption('a');await started;await page.locator('#cloud-booking').selectOption('b');await page.locator('#cloud-files').filter({hasText:'B.stl'}).waitFor();release();await page.waitForLoadState('networkidle');assert.match(await page.locator('#cloud-files').innerText(),/B\.stl/);assert.doesNotMatch(await page.locator('#cloud-files').innerText(),/A\.stl/);assert.equal(await page.locator('#cloud-error').textContent(),'');await page.locator('#cloud-booking').selectOption('');assert.equal(await page.locator('#cloud-files').innerText(),'');console.log('PASS file list: delayed '+(staleError?'error':'success')+' cannot overwrite the selected booking.');}finally{release();await page.close()}
}}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
