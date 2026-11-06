import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import http from 'node:http';
import {chromium} from '../online/node_modules/playwright-core/index.mjs';
const html=readFileSync(new URL('../dist/index.html',import.meta.url));
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html)});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.SPOOL_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const booking={id:'quick-status',title:'キーホルダー',creator:'作者',tags:['急ぎ'],registeredDate:'2026-11-06',registeredTime:'14:35',weekday:'金',className:'',desiredColor:'希望なし',color:'#808080',colorPreference:'none',printMinutes:90,deadline:'',printStatus:'印刷予定',quality:'fine',files:['C:\\Models\\作品.3mf'],attachments:[]};
try{
 for(const width of [1920,1440,1024,390,320]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(value=>{if(!localStorage.getItem('spool-inventory-v1-reservations'))localStorage.setItem('spool-inventory-v1-reservations',JSON.stringify([value]))},booking);
  await page.goto('http://127.0.0.1:'+server.address().port);
  const navigate=()=>page.locator(width>760?'#navBookings':'#showBookings').click();
  const trigger=()=>page.locator('[data-quick-booking-status]:visible');
  await navigate();const registered=page.locator(width>=1200?'#bookingRows .booking-registered':'#bookingCards .booking-card-registration');assert.equal(await registered.isVisible(),true);assert.ok((await registered.innerText()).includes('2026/11/06'));assert.ok(!(await registered.innerText()).includes('14:35'));
  assert.ok(Number(await registered.locator('time').evaluate(x=>parseFloat(getComputedStyle(x).fontSize)))>=17);
  if(process.env.SPOOL_SCREENSHOT_DIR){mkdirSync(process.env.SPOOL_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:process.env.SPOOL_SCREENSHOT_DIR+'/booking-list-'+width+'.png',fullPage:true});}
  await trigger().click();
  const dialog=page.locator('#bookingStatusDialog');await dialog.waitFor({state:'visible'});
  const rect=await dialog.boundingBox();assert.ok(rect.x>=15&&rect.x+rect.width<=width-15&&rect.y>=15&&rect.y+rect.height<=885);
  assert.equal(await dialog.getByRole('button',{name:'印刷予定',exact:true}).getAttribute('aria-pressed'),'true');
  if(process.env.SPOOL_SCREENSHOT_DIR){mkdirSync(process.env.SPOOL_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:process.env.SPOOL_SCREENSHOT_DIR+'/booking-status-'+width+'.png'});}
  await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),false);assert.equal(await trigger().evaluate(x=>x===document.activeElement),true);
  await trigger().click();await page.mouse.click(2,2);assert.equal(await dialog.isVisible(),false);
  await trigger().click();await dialog.getByRole('button',{name:'未定',exact:true}).click();await dialog.waitFor({state:'hidden'});
  assert.deepEqual(await page.evaluate(()=>reservations[0]),{...booking,printStatus:'未定'});
  await page.reload();await navigate();assert.ok((await trigger().innerText()).includes('未定'));
  await page.locator('[data-booking-status="未定"]').click();await trigger().click();await dialog.getByRole('button',{name:'印刷済み',exact:true}).click();
  assert.equal(await dialog.isVisible(),false);assert.equal(await trigger().count(),0);assert.equal(await page.locator('#bookingTabCompleted').innerText(),'1');
  await page.locator('[data-booking-status=""]').click();await trigger().click();
  await page.evaluate(()=>{window.spoolAuthorizeChange=()=>false});await dialog.getByRole('button',{name:'印刷予定',exact:true}).click();assert.equal(await dialog.isVisible(),true);assert.ok((await page.locator('#bookingStatusError').innerText()).includes('保存できません'));assert.equal(await page.evaluate(()=>reservations[0].printStatus),'印刷済み');
  await page.keyboard.press('Escape');await page.evaluate(()=>{delete window.spoolAuthorizeChange;window.spoolCan=()=>false;renderBookings()});assert.equal(await trigger().count(),0);assert.ok((await page.locator('[data-readonly-booking-status]:visible').innerText()).includes('印刷済み'));
  await page.evaluate(()=>{delete window.spoolCan;const {registeredTime,...legacy}=reservations[0];saveBookings([legacy])});assert.equal(await registered.locator('.booking-registered-time').count(),0);assert.ok((await registered.innerText()).includes('2026/11/06'));
  await page.locator('#addBooking').click();await page.locator('#bookingForm [name=title]').fill('新しい予約');await page.locator('#bookingNoPreference').click();await page.locator('#saveBookingButton').click();await page.locator('#bookingDialog').waitFor({state:'hidden'});assert.match(await page.evaluate(()=>reservations.find(x=>x.title==='新しい予約').registeredTime),/^([01]\d|2[0-3]):[0-5]\d$/);
  assert.deepEqual(errors,[]);await page.close();console.log('PASS '+width+'px: anchored status editor, all states, light dismiss, focus, filtered rows, persistence, unrelated fields, denied writes, date-only registration display and legacy dates.');
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
