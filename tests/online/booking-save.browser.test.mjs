import {addBookingReference} from '../booking-test-helpers.mjs';
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import http from 'node:http';import {chromium} from '../../online/node_modules/playwright-core/index.mjs';import {rolePermissions} from '../../online/permissions.mjs';
const project=JSON.parse(readFileSync(new URL('../../online/config.json',import.meta.url))).url.replace(/\/$/,'');const user='22222222-2222-4222-8222-222222222222',lib='11111111-1111-4111-8111-111111111111';const token='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:user,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.test';
const server=http.createServer((req,res)=>{const name=req.url.split('?')[0].split('/').pop()||'index.html';if(!['index.html','online.js','online.css','config.json'].includes(name)&&!/^catalog-images-[a-f0-9]{16}\.json$/.test(name)){res.writeHead(404).end();return}res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/json');res.end(name==='config.json'?JSON.stringify({url:project,key:'sb_publishable_test'}):readFileSync(new URL('../../online-dist/'+name,import.meta.url)))});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({executablePath:process.env.SPOOL_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{const page=await browser.newPage({viewport:{width:390,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));let release,hold=false,deny=false,writes=0,revision=0,state={items:[],deleted:[],customColorPresets:[],reservations:[]};
 const metadata=new Map(),objects=new Map(),storedNames=[];
 let failName='';
 await page.route(project+'/**',async route=>{const req=route.request(),path=new URL(req.url()).pathname;let data=[];
 if(path.endsWith('/rpc/ensure_my_library'))data=lib;else if(path.endsWith('/libraries'))data=[{id:lib,name:'個人の予約',personal:true,owner_id:user}];else if(path.endsWith('/library_state'))data={state,revision};else if(path.endsWith('/library_members'))data={role:'owner'};else if(path.endsWith('/rpc/get_my_library_permissions'))data={...rolePermissions('owner'),_admin:true};

 else if(path.endsWith('/library_files')){
  const id=new URL(req.url()).searchParams.get('id')?.slice(3);
  if(req.method()==='POST'){const record=req.postDataJSON();metadata.set(record.id,record);}
  else if(req.method()==='DELETE'){metadata.delete(id);}
  else data=metadata.get(id);
 }else if(path.startsWith('/storage/v1/object/')){
  const key=path.split('/spool-models/')[1];
  const record=[...metadata.values()].find(file=>file.object_path===key);
  assert.ok(record,'metadata must exist before accessing the object');
  if(req.method()==='POST'){
   const form=await new Response(req.postDataBuffer(),{headers:{'Content-Type':req.headers()['content-type']}}).formData();
   const part=form.get('');
   if(!['application/octet-stream','model/stl','application/sla','model/obj','text/plain','application/zip','model/3mf','application/vnd.ms-package.3dmanufacturing-3dmodel+xml'].includes(part.type)){
    return route.fulfill({status:400,json:{message:'mime type '+part.type+' is not supported'}});
   }
   if(record.name===failName)return route.fulfill({status:400,json:{message:'simulated storage failure'}});
   objects.set(key,Buffer.from(await part.arrayBuffer()));storedNames.push(record.name);data={Key:key};
  }else return route.fulfill({status:200,contentType:'application/octet-stream',body:objects.get(key)});
 }
 else if(path.endsWith('/rpc/save_library_state')){writes++;if(hold)await new Promise(resolve=>release=resolve);if(deny){await route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({code:'42501',message:'Permission denied'})});return}state=req.postDataJSON().next_state;data=++revision;}
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});});
 await page.addInitScript(({user,token,project})=>sessionStorage.setItem('spool-auth-'+new URL(project).hostname.split('.')[0],JSON.stringify({access_token:token,refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user:{id:user,email:'test@example.com'}})),{user,token,project});
 await page.goto('http://127.0.0.1:'+server.address().port+'/spool/');await page.locator('body:not(.cloud-locked)').waitFor();await page.locator('[data-cloud-nav=bookings]').click();await page.locator('#addBooking').click();await page.locator('#bookingForm [name=title]').fill('オンライン保存待ち');await page.locator('#bookingNoPreference').click();await addBookingReference(page);hold=true;await page.locator('#saveBookingButton').click();await page.locator('#bookingSavingDialog').waitFor({state:'visible'});for(let i=0;!release&&i<250;i++)await new Promise(resolve=>setTimeout(resolve,20));assert.equal(typeof release,'function');await page.keyboard.press('Escape');assert.equal(await page.locator('#bookingSavingDialog').isVisible(),true);assert.equal(writes,1);release();await page.locator('#bookingSavingDialog').waitFor({state:'hidden'});await page.locator('#bookingDialog').waitFor({state:'hidden'});assert.equal(state.reservations.length,1);assert.equal(state.reservations[0].title,'オンライン保存待ち');
 hold=false;deny=true;await page.locator('[data-edit-booking]:visible').click();await page.locator('#bookingForm [name=title]').fill('失敗しても入力を保持');await page.locator('#saveBookingButton').click();await page.locator('#bookingSavingDialog').waitFor({state:'hidden'});assert.equal(await page.locator('#bookingDialog').isVisible(),true);assert.equal(await page.locator('#bookingForm [name=title]').inputValue(),'失敗しても入力を保持');assert.ok((await page.locator('#bookingError').innerText()).includes('保持'));assert.equal(await page.locator('#saveBookingButton').isEnabled(),true);deny=false;await page.locator('#saveBookingButton').click();await page.locator('#bookingDialog').waitFor({state:'hidden'});assert.equal(state.reservations[0].title,'失敗しても入力を保持');assert.deepEqual(errors,[]);console.log('PASS: central modal waits for acknowledged online save, rejects Escape, does not duplicate writes, retains input and releases UI after failure, and allows retry.');
 const files=[
  {name:'模型.stl',mimeType:'application/vnd.ms-pki.stl',buffer:Buffer.from('solid spool\nendsolid spool')},
  {name:'印刷.gcode',mimeType:'text/x-gcode',buffer:Buffer.from(';TIME:60\nG1 X10 Y10')}
 ];
 await page.locator('#addBooking').click();
 await page.locator('#bookingForm [name=title]').fill('添付の確認');
 await page.locator('#bookingNoPreference').click();
 await page.locator('#bookingFileInput').setInputFiles(files);
 failName=files[1].name;
 await page.locator('#saveBookingButton').click();
 await page.locator('#bookingError').filter({hasText:'保持'}).waitFor();
 const uploadError=await page.locator('#bookingError').innerText();
 assert.deepEqual(storedNames,[files[0].name],uploadError);
 assert.ok(uploadError.includes(files[1].name),uploadError);
 failName='';
 await page.locator('#saveBookingButton').click();
 await page.locator('#bookingDialog').waitFor({state:'hidden'});
 assert.deepEqual(storedNames,files.map(file=>file.name));
 const booking=state.reservations.find(b=>b.title==='添付の確認');
 assert.deepEqual(booking.attachments.map(file=>file.name),storedNames);
 await page.reload();
 await page.locator('[data-cloud-nav=bookings]').click();
 const details=page.locator('[data-booking-details="'+booking.id+'"]:visible');
 await details.locator('summary').click();
 for(const [index,file] of files.entries()){
  const download=page.waitForEvent('download');
  await details.locator('[data-booking-attachment="'+booking.attachments[index].id+'"]').click();
  const completed=await download;
  assert.equal(completed.suggestedFilename(),file.name);
  assert.deepEqual(readFileSync(await completed.path()),file.buffer);
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: binary models and print files survive a partial upload, retry and reload with original names and bytes.');

}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
