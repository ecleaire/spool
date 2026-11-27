import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import http from 'node:http';
import {chromium} from '../online/node_modules/playwright-core/index.mjs';
const html=readFileSync(new URL('../dist/index.html',import.meta.url));
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.SPOOL_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const shots=process.env.SPOOL_SCREENSHOT_DIR;if(shots)mkdirSync(shots,{recursive:true});
try{for(const width of [1440,390,320]){
 const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);assert.equal(await page.locator('#search').isVisible(),false);await page.locator('#inventorySearchTrigger').click();await page.locator('#foregroundSearch').fill('test');await page.locator('#applySearchPanel').click();assert.equal(await page.locator('#inventorySearchTrigger').evaluate(el=>el.classList.contains('has-query')),true);
 await page.evaluate(()=>{showBookingView(true);openBooking()});
 // A deadline overrides a legacy weekday in the editor, saved record and both list layouts.
 await page.evaluate(()=>{const f=document.querySelector('#bookingForm').elements;f.registeredDate.value='2026-11-01';f.registeredDate.dispatchEvent(new Event('change',{bubbles:true}));});
 await page.locator('[name=deadline]').fill('2026-11-04');assert.equal(await page.locator('[name=weekday]').inputValue(),'水');
 await page.evaluate(()=>{const f=document.querySelector('#bookingForm').elements;f.registeredDate.value='2026-11-02';f.registeredDate.dispatchEvent(new Event('change',{bubbles:true}));});assert.equal(await page.locator('[name=weekday]').inputValue(),'水');
 await page.locator('#bookingDeadlineUnknown').check();assert.equal(await page.locator('[name=weekday]').inputValue(),'水');await page.locator('#bookingDeadlineUnknown').uncheck();
 await page.locator('[name=deadline]').fill('2026-11-06');assert.equal(await page.locator('[name=weekday]').inputValue(),'金');

 assert.equal(await page.locator('#bookingColorSearch').isVisible(),false);assert.equal(await page.locator('[name=printDuration]').isVisible(),false);
 const nextColor=page.locator('#bookingGoColor');assert.ok(await nextColor.isHidden());
 const order=await page.evaluate(()=>{const nodes=['[name=title]','[name=creator]','#bookingImportPick','#bookingColorChoices','[name=deadline]'].map(s=>document.querySelector('#bookingForm '+s));return nodes.slice(1).every((node,i)=>!!(nodes[i].compareDocumentPosition(node)&Node.DOCUMENT_POSITION_FOLLOWING))});assert.equal(order,true);
 if(shots)await page.screenshot({path:shots+'/registration-'+width+'.png'});
 await page.locator('#saveBookingButton').click();assert.equal(await page.locator('[name=title]').evaluate(el=>el.validity.valueMissing),true);
 await page.locator('[name=title]').fill('必須項目と選択の確認');await page.locator('#bookingReferenceOpen').click();await page.locator('#bookingForm [name=files]').fill('箱の中に保管');await page.locator('#saveBookingButton').click();assert.match(await page.locator('#bookingError').innerText(),/希望色/);assert.equal(await page.evaluate(()=>reservations.length),0);
 const choose=async(files)=>{const chooser=page.waitForEvent('filechooser');await page.locator('#bookingImportPick').click();await (await chooser).setFiles(files);await page.waitForFunction(()=>!bookingReading)};
 const file=name=>({name,mimeType:'application/octet-stream',buffer:Buffer.from('solid test\nendsolid test')});
 await choose([file('one.stl'),file('two.stl'),file('three.stl')]);assert.match(await page.locator('#bookingFileFeedback').innerText(),/添付 3件/);
 assert.ok(await nextColor.isVisible());await nextColor.click();assert.equal(await page.evaluate(()=>document.activeElement.id),'bookingPlanHeading');
 await page.locator('[data-remove-booking-file]').first().click();assert.match(await page.locator('#bookingFileFeedback').innerText(),/添付 2件/);
 await page.locator('[data-remove-booking-file]').first().click();await page.locator('[data-remove-booking-file]').first().click();assert.doesNotMatch(await page.locator('#bookingFileFeedback').innerText(),/添付 [123]件/);
 assert.ok(await nextColor.isHidden());
 // Reopening the native chooser and selecting the same filename must still work.
 await choose([file('one.stl')]);assert.match(await page.locator('#bookingFileFeedback').innerText(),/添付 1件/);await page.locator('#saveBookingButton').click();assert.match(await page.locator('#bookingError').innerText(),/希望色/);
 await page.locator('#bookingColorSearchDetails>summary').click();assert.equal(await page.locator('#bookingColorSearch').isVisible(),true);await page.locator('#bookingColorSearchDetails>summary').click();await page.locator('#bookingNoPreference').click();assert.match(await nextColor.innerText(),/確認・変更/);
 await page.locator('#bookingExtraDetails>summary').click();await page.locator('[name=printDuration]').fill('');await page.locator('#bookingExtraDetails>summary').click();await page.locator('#saveBookingButton').click();assert.equal(await page.locator('#bookingExtraDetails').evaluate(el=>el.open),true);
 await page.locator('[name=printDuration]').fill('1:30');await page.locator('[name=printDuration]').press('Tab');await page.locator('#bookingExtraDetails>summary').click();await page.locator('#saveBookingButton').click();await page.locator('#bookingDialog').waitFor({state:'hidden'});
 const saved=await page.evaluate(()=>reservations[0]);assert.equal(saved.weekday,'金');assert.equal(saved.printMinutes,90);assert.equal(saved.attachments.length,1);assert.equal(saved.colorPreference,'none');assert.equal(saved.files[0],'箱の中に保管');await page.evaluate(()=>{reservations[0].weekday='月';renderBookings();openBooking(reservations[0].id)});assert.equal(await page.locator('[name=weekday]').inputValue(),'金');assert.equal(await page.locator('#bookingRows .booking-weekday').innerText(),'金曜日');assert.equal(await page.locator('#bookingCards .booking-card-weekday').innerText(),'金曜日');assert.deepEqual(errors,[]);
 await page.locator('#cancelBooking').click();
 await page.locator('#addBooking').click();
 await page.locator('[name=title]').fill('モデル準備中');
 await page.locator('#bookingNoPreference').click();
 if(width===390){await page.locator('#bookingReferenceOpen').click();await page.locator('#bookingForm [name=files]').fill('データは後日追加');}
 const prompts=[],answers=[];
 page.on('dialog',async dialog=>{
   prompts.push(dialog.message());
   if(answers.shift())await dialog.accept();else await dialog.dismiss();
 });
 for(const choice of [[false],[true,false],[true,true]]){
   const before=prompts.length;
   answers.push(...choice);
   await page.locator('#saveBookingButton').click();
   assert.equal(prompts.length-before,choice.length);
   assert.match(prompts[before],/ファイルなしで予約を続け/);
   if(choice.length===2)assert.match(prompts[before+1],/「モデル準備中」をファイルなしで保存/);
   if(!choice.at(-1)){
     assert.equal(await page.evaluate(()=>reservations.length),1);
     assert.equal(await page.locator('#bookingTitle').inputValue(),'モデル準備中');
   }
 }
 await page.locator('#bookingDialog').waitFor({state:'hidden'});
 const pending=await page.evaluate(()=>reservations.find(r=>r.title==='モデル準備中'));
 assert.deepEqual(pending.attachments,[]);
 assert.deepEqual(pending.files,width===390?['データは後日追加']:[]);
 await page.evaluate(id=>openBooking(id),pending.id);
 await page.locator('#bookingReferenceOpen').click();
 await page.locator('#bookingForm [name=files]').fill('https://example.com/model.stl');
 await page.locator('#saveBookingButton').click();
 await page.locator('#bookingDialog').waitFor({state:'hidden'});
 assert.equal(prompts.length,5);
 assert.equal(await page.evaluate(()=>reservations.length),2);
 console.log('PASS registration '+width+'px: required title/explicit color, two confirmations for missing files, inert notes, native chooser/reselection, live removal count, color-before-deadline, collapsed duration validation and icon search.');await page.close();
}}finally{await browser.close();await new Promise(r=>server.close(r))}
