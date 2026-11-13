import {rolePermissions} from '../../online/permissions.mjs';
import {chromium} from '../../online/node_modules/playwright-core/index.mjs';
import http from 'node:http';import {readFileSync,mkdirSync} from 'node:fs';import assert from 'node:assert/strict';
const project=JSON.parse(readFileSync(new URL('../../online/config.json',import.meta.url))).url.replace(/\/$/,'');
const user='22222222-2222-4222-8222-222222222222',personal='11111111-1111-4111-8111-111111111111',team='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='33333333-3333-4333-8333-333333333333';
const token='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:user,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.test';
const server=http.createServer((req,res)=>{const file=req.url.split('?')[0].split('/').pop()||'index.html';if(!['index.html','online.js','online.css','config.json','event-christmas-2026.png'].includes(file)&&!/^catalog-images-[a-f0-9]{16}\.json$/.test(file)){res.writeHead(404).end();return}res.setHeader('Content-Type',file.endsWith('.png')?'image/png':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/json');res.end(file==='config.json'?JSON.stringify({url:project,key:'sb_publishable_test'}):readFileSync(new URL('../../online-dist/'+file,import.meta.url)))});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({executablePath:process.env.SPOOL_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const shots=process.env.SPOOL_SCREENSHOT_DIR;if(shots)mkdirSync(shots,{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:900}}),errors=[],invites=[];let narrow='',admin=true,removeFailure=true,removes=0,includeMember=true,holdInvite=true,releaseInvite;
 const inviteGate=new Promise(resolve=>{releaseInvite=resolve});page.on('pageerror',error=>errors.push(error.message));
 await page.route(project+'/**',async route=>{const req=route.request(),url=new URL(req.url()),path=url.pathname,body=req.method()==='POST'?req.postDataJSON():{};let data=[];
  if(path.endsWith('/rpc/ensure_my_library'))data=personal;
  else if(path.endsWith('/rpc/spool_is_admin'))data=admin;
  else if(path.endsWith('/libraries'))data=[{id:personal,personal:true,owner_id:user,name:'自分の材料'},{id:team,personal:false,owner_id:user,name:'みんなの材料'}];
  else if(path.endsWith('/library_members'))data={role:'owner'};
  else if(path.endsWith('/library_state'))data={revision:0,state:{items:[],deleted:[],customColorPresets:[],reservations:[]}};
  else if(path.endsWith('/rpc/get_my_library_permissions'))data=narrow?{...rolePermissions('viewer'),purchase_create:narrow!=='wish',wishlist_create:narrow!=='plan',bookings_create:true,_admin:false,_manage_members:false}:{...rolePermissions('owner'),_admin:true};
  else if(path.endsWith('/rpc/get_library_member_profiles'))data=[{user_id:user,display_name:'ホスト',display_id:'host',role:'owner'},...includeMember?[{user_id:other,display_name:'メンバー',display_id:'maker',role:'editor'}]:[]];
  else if(path.endsWith('/rpc/invite_library_member')){invites.push(body);if(holdInvite)await inviteGate;data=null;}
  else if(path.endsWith('/rpc/remove_library_member')){removes++;if(removeFailure){await route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({code:'42501',message:'Permission denied'})});return}includeMember=false;data=null;}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.addInitScript(({user,token,project})=>sessionStorage.setItem('spool-auth-'+new URL(project).hostname.split('.')[0],JSON.stringify({access_token:token,refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user:{id:user,email:'test@example.com'}})),{user,token,project});
 await page.goto('http://127.0.0.1:'+server.address().port+'/spool/');await page.locator('body:not(.cloud-locked)').waitFor();await page.locator('#cloud-library').selectOption(team);await page.locator('#cloud-shared-settings').waitFor({state:'visible'});

 for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:1000});
  await page.locator('[data-cloud-nav="events"]').click();
  assert.equal(await page.locator('#eventView').isVisible(),true);assert.equal(await page.locator('#spool-help-entry').isVisible(),false);assert.equal(await page.locator('#cloud-shared-settings').isVisible(),false);assert.ok((await page.locator('#eventView').innerText()).includes('2026年12月13日（日）'));assert.ok((await page.locator('#eventView').textContent()).includes('内容は予告なく変更となる場合があります。'));assert.equal((await page.locator('#eventView').textContent()).includes('応募方法やルールは確定後'),false);if(!await page.locator('.event-poster-preview').evaluate(el=>el.open))await page.locator('.event-poster-preview>summary').click();await page.locator('[data-event-banner]').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('[data-event-banner]').naturalWidth>0);
  assert.equal(await page.locator('[data-cloud-nav="events"]').getAttribute('aria-current'),'page');
  assert.equal(await page.locator('#add').isVisible(),false);assert.equal(await page.locator('#addBooking').isVisible(),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const nav=await page.locator('.cloud-topbar').evaluate(el=>{const nodes=[...el.querySelectorAll('.cloud-brand,.cloud-navigation,.cloud-account-trigger')];return nodes.map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right}})});
  assert.ok(nav.every(n=>n.left>=0&&n.right<=width));
  for(let i=1;i<nav.length;i++)assert.ok(nav[i].left>=nav[i-1].right-1,'navigation must not overlap');
  if(shots)await page.screenshot({path:shots+'/online-events-'+width+'.png',fullPage:true});
  await page.locator('[data-cloud-nav="bookings"]').click();assert.equal(await page.locator('#bookingView').isVisible(),true);assert.equal(await page.locator('#eventView').isVisible(),false);assert.equal(await page.locator('#spool-help-entry').isVisible(),true);assert.equal(await page.locator('#cloud-shared-settings').isVisible(),true);
  await page.locator('[data-cloud-nav="inventory"]').click();assert.equal(await page.locator('.inventory').isVisible(),true);assert.equal(await page.locator('#spool-help-entry').isVisible(),true);assert.equal(await page.locator('#cloud-shared-settings').isVisible(),true);
  console.log('PASS online event navigation '+width+'px');
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
