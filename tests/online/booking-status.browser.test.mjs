import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import http from 'node:http';
import {chromium} from '../../online/node_modules/playwright-core/index.mjs';
import {rolePermissions} from '../../online/permissions.mjs';
const project=JSON.parse(readFileSync(new URL('../../online/config.json',import.meta.url))).url.replace(/\/$/,'');
const user='22222222-2222-4222-8222-222222222222',lib='11111111-1111-4111-8111-111111111111';
const token='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:user,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.test';
const server=http.createServer((req,res)=>{const name=req.url.split('?')[0].split('/').pop()||'index.html';if(!['index.html','online.js','online.css','config.json'].includes(name)){res.writeHead(404).end();return;}res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.json')?'application/json':'text/html;charset=utf-8');res.end(name==='config.json'?JSON.stringify({url:project,key:'sb_publishable_test'}):readFileSync(new URL('../../online-dist/'+name,import.meta.url)))});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.SPOOL_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 for(const width of [1920,1440,1024,390,320]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[],writes=[];let role='owner',revision=0;
  let state={items:[],deleted:[],customColorPresets:[],reservations:[{id:'booking',title:'キーホルダー',creator:'作者',tags:['A2'],registeredDate:'2026-11-06',registeredTime:'14:35',weekday:'金',className:'',desiredColor:'希望なし',color:'#808080',colorPreference:'none',printMinutes:90,deadline:'',printStatus:'印刷予定',quality:'standard',attachments:[]}]};
  page.on('pageerror',e=>errors.push(e.message));
  await page.route(project+'/**',async route=>{const req=route.request(),path=new URL(req.url()).pathname;let data=[];
   if(path.endsWith('/auth/v1/user'))data={id:user,email:'test@example.com',user_metadata:{name:'確認利用者'}};
   else if(path.endsWith('/rpc/ensure_my_library'))data=lib;
   else if(path.endsWith('/rpc/spool_is_admin'))data=false;
   else if(path.endsWith('/libraries'))data=[{id:lib,name:'マイライブラリ',personal:true,owner_id:user}];
   else if(path.endsWith('/library_state'))data={state,revision};
   else if(path.endsWith('/library_members'))data={role};
   else if(path.endsWith('/rpc/get_my_library_permissions'))data={...rolePermissions(role),_admin:role==='owner'};
   else if(path.endsWith('/rpc/save_library_state')){const body=req.postDataJSON();writes.push(body);state=body.next_state;data=++revision;}
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.addInitScript(({user,token,project})=>sessionStorage.setItem('spool-auth-'+new URL(project).hostname.split('.')[0],JSON.stringify({access_token:token,refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user:{id:user,email:'test@example.com'}})),{user,token,project});
  await page.goto('http://127.0.0.1:'+server.address().port+'/spool/');await page.locator('body:not(.cloud-locked)').waitFor();await page.locator('[data-cloud-nav=bookings]').click();
  const registration=page.locator(width>=1200?'#bookingRows .booking-registered':'#bookingCards .booking-card-registration');assert.equal(await registration.isVisible(),true);assert.ok((await registration.innerText()).includes('2026/11/06'));assert.ok(!(await registration.innerText()).includes('14:35'));
  assert.equal(await page.locator('.sidebar').isVisible(),false,'Online layout keeps the top navigation');
  const trigger=page.locator('[data-quick-booking-status]:visible');assert.equal(await trigger.isEnabled(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(process.env.SPOOL_SCREENSHOT_DIR){mkdirSync(process.env.SPOOL_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:process.env.SPOOL_SCREENSHOT_DIR+'/online-booking-list-'+width+'.png',fullPage:true});}
  await trigger.click();const dialog=page.locator('#bookingStatusDialog');await dialog.waitFor({state:'visible'});const rect=await dialog.boundingBox();assert.ok(rect.x>=15&&rect.x+rect.width<=width-15&&rect.y>=15&&rect.y+rect.height<=985);
  if(process.env.SPOOL_SCREENSHOT_DIR)await page.screenshot({path:process.env.SPOOL_SCREENSHOT_DIR+'/online-booking-status-'+width+'.png'});
  await dialog.getByRole('button',{name:'印刷済み',exact:true}).click();await dialog.waitFor({state:'hidden'});await page.locator('#cloud-save-status[data-state=saved]').waitFor();assert.equal(writes.at(-1).next_state.reservations[0].printStatus,'印刷済み');assert.equal(writes.at(-1).next_state.reservations[0].registeredTime,'14:35');
  await page.reload();await page.locator('body:not(.cloud-locked)').waitFor();await page.locator('[data-cloud-nav=bookings]').click();assert.ok((await trigger.innerText()).includes('印刷済み'));
  role='viewer';await page.reload();await page.locator('body:not(.cloud-locked)').waitFor();await page.locator('[data-cloud-nav=bookings]').click();assert.equal(await trigger.count(),0);assert.ok((await page.locator('[data-readonly-booking-status]:visible').innerText()).includes('印刷済み'));
  assert.deepEqual(errors,[]);await page.close();console.log('PASS online '+width+'px: top-navigation layout, registration date/time, quick status editing, cloud save/reload and viewer protection.');
 }
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
