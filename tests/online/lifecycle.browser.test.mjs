import {rolePermissions} from '../../online/permissions.mjs';
import {chromium} from '../../online/node_modules/playwright-core/index.mjs';
import http from 'node:http';import {readFileSync,mkdirSync} from 'node:fs';import assert from 'node:assert/strict';
const project=JSON.parse(readFileSync(new URL('../../online/config.json',import.meta.url))).url.replace(/\/$/,'');
const user='22222222-2222-4222-8222-222222222222',personal='11111111-1111-4111-8111-111111111111',team='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='33333333-3333-4333-8333-333333333333';
const original={id:personal,name:'自分の材料',personal:true,owner_id:user},shared=()=>({id:team,name:'削除確認',personal:false,owner_id:host?user:other});let host=true,libraries=[original,shared()],missing=true,storageFailure=true,storageCalls=0,deletes=0,leaves=0;
const token='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:user,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.test';
const server=http.createServer((req,res)=>{const name=req.url.split('?')[0].split('/').pop()||'index.html';if(!['index.html','online.js','online.css','config.json'].includes(name)&&!/^catalog-images-[a-f0-9]{16}\.json$/.test(name)){res.writeHead(404).end();return}res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/json');res.end(name==='config.json'?JSON.stringify({url:project,key:'sb_publishable_test'}):readFileSync(new URL('../../online-dist/'+name,import.meta.url)))});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({executablePath:process.env.SPOOL_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const shots=process.env.SPOOL_SCREENSHOT_DIR;if(shots)mkdirSync(shots,{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(project+'/**',async route=>{const req=route.request(),url=new URL(req.url()),path=url.pathname,body=req.method()==='POST'?req.postDataJSON():{};let data=[];
  if(path.endsWith('/rpc/get_shared_library_deletion_info')&&missing){await route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({code:'PGRST202',message:'Missing function'})});return;}
  if(path.includes('/storage/v1/object/')&&req.method()==='DELETE'){storageCalls++;await route.fulfill({status:storageFailure?503:200,contentType:'application/json',body:JSON.stringify(storageFailure?{message:'Storage unavailable'}:[])});return;}
  if(path.endsWith('/rpc/ensure_my_library'))data=personal;
  else if(path.endsWith('/rpc/spool_is_admin'))data=false;
  else if(path.endsWith('/libraries'))data=libraries;
  else if(path.endsWith('/library_members'))data={role:url.searchParams.get('library_id')==='eq.'+personal||host?'owner':'viewer'};
  else if(path.endsWith('/library_state'))data={revision:0,state:{items:[],deleted:[],customColorPresets:[],reservations:[]}};
  else if(path.endsWith('/rpc/get_my_library_permissions'))data=rolePermissions(body.lib===personal||host?'owner':'viewer');
  else if(path.endsWith('/rpc/get_shared_library_deletion_info'))data={name:'削除確認',revision:0,object_paths:[team+'/88888888-8888-4888-8888-888888888888/model']};
  else if(path.endsWith('/rpc/delete_shared_library')){assert.equal(body.confirmation_name,'削除確認');assert.equal(body.confirmed,true);deletes++;libraries=[original];data=null;}
  else if(path.endsWith('/rpc/leave_shared_library')){leaves++;libraries=[original];data=null;}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.addInitScript(({user,token,project})=>sessionStorage.setItem('spool-auth-'+new URL(project).hostname.split('.')[0],JSON.stringify({access_token:token,refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user:{id:user,email:'test@example.com'}})),{user,token,project});
 const enter=async()=>{await page.goto('http://127.0.0.1:'+server.address().port+'/spool/');await page.locator('body:not(.cloud-locked)').waitFor();await page.locator('#cloud-library').selectOption(team);await page.locator('#cloud-library-lifecycle').waitFor({state:'attached'});if(await page.locator('#cloud-library-more').isVisible()){if(!await page.locator('#cloud-library-details').evaluate(x=>x.open))await page.locator('#cloud-library-more').click();}else await page.locator('#cloud-account-open').click();await page.locator('#cloud-library-lifecycle').click()};
 await enter();await page.locator('#lifecycle-result').filter({hasText:'DB更新'}).waitFor();assert.equal(storageCalls,0);assert.equal(await page.locator('#lifecycle-submit').isDisabled(),true);missing=false;await page.locator('#lifecycle-retry').click();await page.locator('#lifecycle-result').filter({hasText:'オンライン添付 1 件'}).waitFor();
 await page.locator('#lifecycle-name').fill('違う名前');assert.equal(await page.locator('#lifecycle-submit').isDisabled(),true);await page.locator('#lifecycle-name').fill('削除確認');
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:844});assert.equal(await page.locator('#library-lifecycle-dialog').evaluate(x=>x.scrollWidth<=x.clientWidth),true);if(shots)await page.screenshot({path:shots+'/library-delete-'+width+'.png'});}
 page.once('dialog',d=>d.dismiss());await page.locator('#lifecycle-submit').click();assert.equal(storageCalls,0);assert.equal(deletes,0);
 page.once('dialog',d=>d.accept());await page.locator('#lifecycle-submit').click();await page.locator('#lifecycle-result').filter({hasText:'ライブラリの削除は完了していません'}).waitFor();assert.equal(deletes,0);assert.equal(libraries.length,2);
 storageFailure=false;page.once('dialog',d=>d.accept());await page.locator('#lifecycle-submit').click();await page.waitForFunction(id=>document.querySelector('#cloud-library')?.value===id,personal);assert.equal(deletes,1);assert.equal(libraries.length,1);
 host=false;libraries=[original,shared()];await enter();assert.match(await page.locator('#lifecycleTitle').innerText(),/退出/);assert.equal(await page.locator('#lifecycle-name').count(),0);page.once('dialog',d=>d.dismiss());await page.locator('#lifecycle-submit').click();assert.equal(leaves,0);page.once('dialog',d=>d.accept());await page.locator('#lifecycle-submit').click();await page.waitForFunction(id=>document.querySelector('#cloud-library')?.value===id,personal);assert.equal(leaves,1);assert.deepEqual(libraries,[original]);assert.deepEqual(errors,[]);
 console.log('PASS: deletion migration gate, exact name plus final confirmation, Storage failure keeps library, successful cleanup/delete, self-leave, personal-library return and 320/390/1440px layout.');
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
