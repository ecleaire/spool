import {serveEvent} from './event-static-server.mjs';
import {rolePermissions} from '../../online/permissions.mjs';
import {chromium} from '../../online/node_modules/playwright-core/index.mjs';
import http from 'node:http';import {readFileSync,mkdirSync} from 'node:fs';import assert from 'node:assert/strict';
const project=JSON.parse(readFileSync(new URL('../../online/config.json',import.meta.url))).url.replace(/\/$/,'');
const user='22222222-2222-4222-8222-222222222222',personal='11111111-1111-4111-8111-111111111111',team='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='33333333-3333-4333-8333-333333333333';
const token='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:user,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.test';
const server=http.createServer((req,res)=>{if(serveEvent(req,res))return;const file=req.url.split('?')[0].split('/').pop()||'index.html';if(!['index.html','online.js','online.css','config.json','event-christmas-2026.png'].includes(file)&&!/^catalog-images-[a-f0-9]{16}\.json$/.test(file)){res.writeHead(404).end();return}res.setHeader('Content-Type',file.endsWith('.png')?'image/png':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/json');res.end(file==='config.json'?JSON.stringify({url:project,key:'sb_publishable_test'}):readFileSync(new URL('../../online-dist/'+file,import.meta.url)))});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({executablePath:process.env.SPOOL_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const shots=process.env.SPOOL_SCREENSHOT_DIR;if(shots)mkdirSync(shots,{recursive:true});
try{
 const home='http://127.0.0.1:'+server.address().port+'/spool/';
 const eventReleased=!readFileSync(new URL('../../online-dist/event/index.html',import.meta.url),'utf8').includes('src="announcement.js"');
 const guest=await browser.newPage();
 await guest.context().route(project+'/**',route=>route.abort());
 try{
  for(const [width,height] of [[320,568],[390,844],[768,1024],[1440,900]]){
   await guest.setViewportSize({width,height});
   await guest.goto(home);
   const invitation=guest.getByRole('link',{name:eventReleased?/応募作品を見る/:/イベント案内を見る/});
   await invitation.waitFor();
   await invitation.getByRole('img',{name:/オーナメントコンテスト/}).evaluate(img=>img.decode());
   await guest.waitForFunction(()=>performance.getEntriesByType('resource').some(entry=>
    new URL(entry.name).pathname.endsWith('/event/assets/ornament-tree.webp') && entry.encodedBodySize>0));
   const bounds=await invitation.boundingBox(),login=await guest.locator('#cloud-login').boundingBox();
   assert.ok(bounds.y>=0 && bounds.y+bounds.height<=height);
   assert.ok(bounds.x>=0 && bounds.x+bounds.width<=width);
   assert.ok(login && bounds.y+bounds.height<=login.y);
   assert.equal(await guest.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   if(shots)await guest.screenshot({path:shots+'/guest-home-'+width+'.png'});
   await invitation.focus();
   await guest.keyboard.press('Enter');
   await guest.waitForURL(home+'event/index.html'+(eventReleased?'#works':''));
   await guest.locator(eventReleased?'#works-heading':'#eventView').waitFor();
  }
 }finally{await guest.close();}
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
 await page.goto('http://127.0.0.1:'+server.address().port+'/spool/');await page.locator('body:not(.cloud-locked)').waitFor();await page.locator('#cloud-library').selectOption(team);assert.equal(await page.locator('#cloud-shared-settings').count(),0);await page.locator('#cloud-library-more').waitFor({state:'visible'});

 assert.equal(await page.locator('.welcome-event').count(),0);
 for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:1000});
  await page.locator('[data-cloud-nav="events"]').click();
  await page.waitForURL('**/spool/event/index.html');
  assert.equal(await page.locator('#addBooking, #add, #openLibrary').count(),0);
  if(await page.locator('script[src="announcement.js"]').count()){
    if(width<=640)await page.locator('.ornament-poster').waitFor();
    else await page.waitForFunction(()=>document.querySelector('[data-event-banner]').naturalWidth>0);
    await page.getByRole('button',{name:'審査基準へ移動'}).click();
    assert.equal(await page.locator('#eventCriteria').isVisible(),true);
    assert.equal(await page.locator('#works').isVisible(),true);
    await page.locator('[data-open-submission]').first().click();
    await page.locator('#submission[open]').waitFor();
    assert.equal(await page.locator('#post-button').isDisabled(),true);
    await page.locator('[data-close-submission]').first().click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    if(shots)await page.screenshot({path:shots+'/online-events-'+width+'.png',fullPage:true});
  }
  await page.goBack();
  await page.locator('[data-cloud-nav="bookings"]').click();assert.equal(await page.locator('#bookingView').isVisible(),true);assert.equal(await page.locator('#eventView').isVisible(),false);assert.equal(await page.locator('#spool-help-entry').isVisible(),true);assert.equal(await page.locator('#cloud-shared-settings').count(),0);
  await page.locator('[data-cloud-nav="inventory"]').click();assert.equal(await page.locator('.inventory').isVisible(),true);assert.equal(await page.locator('#spool-help-entry').isVisible(),true);assert.equal(await page.locator('#cloud-shared-settings').count(),0);
  console.log('PASS online event navigation '+width+'px');
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
