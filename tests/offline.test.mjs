import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const html=fs.readFileSync('dist/index.html','utf8');
assert.ok(!/<script\b[^>]*src=|<link\b[^>]*rel="stylesheet"|@import|\bfetch\s*\(/i.test(html),'Offline artifact must not request runtime dependencies');
const scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].filter(x=>!x[1].includes('application/json')).map(x=>x[2]);
assert.equal(scripts.length,6);scripts.forEach(s=>new vm.Script(s));
const initialItem={id:'spool_test',name:'PLA Basic',brand:'Bambu Lab',material:'PLA',colorName:'白',color:'#FFFFFF',remaining:800,capacity:1000,diameter:'1.75',image:'data:image/png;base64,AAAA'};
function boot({cached=[],embedded={},blocked=false}={}){
 const data=new Map(cached),nodes=new Map(),downloads=[];
 function el(){return{value:'',textContent:'',innerHTML:'',style:{},hidden:false,disabled:false,classList:{add(){},remove(){},toggle(){}},addEventListener(){},setAttribute(name,value){(this.attributes||={})[name]=value},removeAttribute(name){if(this.attributes)delete this.attributes[name]},setCustomValidity(message){this.validationMessage=message},showModal(){this.open=true},close(){this.open=false},click(){this.onclick?.()}}}
 const get=s=>{if(!nodes.has(s)){const node=el(),fields=new Map();node.elements={namedItem(key){if(!fields.has(key)){const field=el();field.value=key==='material'?'PLA':key==='color'?'#8cbeb0':'';fields.set(key,field)}return fields.get(key)}};node.reset=()=>fields.clear();nodes.set(s,node)}return nodes.get(s)};
 const localStorage={getItem(k){if(blocked)throw Error('blocked');return data.get(k)??null},setItem(k,v){if(blocked)throw Error('blocked');data.set(k,v)},removeItem:k=>data.delete(k)};
 const context={document:{getElementById:()=>({textContent:JSON.stringify(embedded)}),querySelector:get,querySelectorAll:()=>[],createElement:()=>({click(){downloads.push(this.download)}})},localStorage,crypto:webcrypto,URL:Object.assign(class extends URL {},{createObjectURL:()=> 'blob:test',revokeObjectURL(){}}),TextEncoder,structuredClone,Blob,Intl,Date,setTimeout:()=>1,clearTimeout(){},window:{addEventListener(){}},console,confirm:()=>true,FormData:class{constructor(form){return Object.entries(form.data)}}};
 vm.createContext(context);scripts.forEach(s=>vm.runInContext(s,context));return{run:s=>vm.runInContext(s,context),get,data,context,downloads};
}
function fakeFile(name='SPOOL-data.json'){let text='',writes=0;return{name,queryPermission:async()=> 'granted',requestPermission:async()=> 'granted',getFile:async()=>({text:async()=>text}),createWritable:async()=>{let next='';return{write:async value=>{next=value},close:async()=>{text=next;writes++},abort:async()=>{}}},read:()=>text,externalWrite:value=>{text=value},writes:()=>writes}}
const app=boot({cached:[['spool-inventory-v1',JSON.stringify([initialItem])]]});
assert.equal(app.run('items.length'),1);assert.equal(app.run('normalizeHex("abc")'),'#AABBCC');
app.get('#navBookings').onclick();assert.equal(app.get('#navBookings').attributes['aria-current'],'page');assert.equal(app.get('#addBooking').hidden,false);assert.equal(app.get('#openLibrary').hidden,true);
app.get('#showInventory').onclick();assert.equal(app.get('#navInventory').attributes['aria-current'],'page');assert.equal(app.get('#addBooking').hidden,true);
app.get('#manageData').onclick();assert.equal(app.get('#dataDialog').open,true);app.get('#closeData').onclick();assert.equal(app.get('#dataDialog').open,false);
assert.equal(app.run('ELEGOO_LIBRARY.length'),4);assert.equal(app.run('ELEGOO_LIBRARY.reduce((n,x)=>n+x.colors.length,0)'),46);
assert.ok(app.run('ELEGOO_LIBRARY.every(p=>p.colors.every(x=>/^data:image\\/jpeg;base64,/.test(x.image)&&/^#[0-9A-F]{6}$/.test(x.color)&&x.shopUrl.startsWith("https://jp.elegoo.com/products/")))'));
app.get('#openLibrary').onclick();assert.equal(app.get('#elegooLibrary').open,true);app.run('applyELEGOOProduct("elegoo-translucent")');assert.equal(app.get('#form').elements.namedItem('brand').value,'ELEGOO');assert.equal(app.get('#form').elements.namedItem('variant').value,'PLA Translucent');assert.ok(app.run('photo.startsWith("data:image/jpeg;base64,")'));assert.equal(app.run('paletteFor(colorContext()).official.length'),9);
assert.equal(app.run('bookingDue({deadline:"2026-11-01",printStatus:"印刷済み"},"2026-11-02").tone'),'complete');assert.equal(app.run('bookingDue({deadline:"2026-11-01",printStatus:"印刷予定"},"2026-11-02").label'),'1日超過');assert.equal(app.run('bookingDue({deadline:"2026-11-03",printStatus:"印刷予定"},"2026-11-02").label'),'明日期限');
app.run('showBookingView(true)');assert.equal(app.get('#bookingView').hidden,false);assert.equal(app.get('.inventory').hidden,true);
app.get('#addBooking').onclick();assert.equal(app.get('#bookingDialog').open,true);assert.ok(app.get('#bookingColor').innerHTML.includes('PLA Basic'));
const form=app.get('#bookingForm');form.data={registeredDate:'2026-11-01',deadline:'2026-11-03',title:'作品A',weekday:'日',className:'A3',printStatus:'印刷予定',desiredColor:JSON.stringify({name:'白',color:'#FFFFFF'}),hours:'1',minutes:'30'};
form.onsubmit({target:form,preventDefault(){}});assert.equal(app.run('reservations[0].printMinutes'),90);assert.equal(app.run('reservations[0].printStatus'),'印刷予定');assert.equal(app.get('#bookingDialog').open,false);
assert.ok(app.get('#bookingCards').innerHTML.includes('作品A'));assert.ok(app.get('#bookingCards').innerHTML.includes('予約を編集'));assert.equal(app.get('#bookingPlanned').textContent,1);
app.run('openBooking(reservations[0].id)');assert.equal(form.elements.namedItem('title').value,'作品A');assert.equal(form.elements.namedItem('printStatus').value,'印刷予定');form.data={...form.data,title:'作品A修正',printStatus:'印刷済み'};form.onsubmit({target:form,preventDefault(){}});assert.equal(app.run('reservations.length'),1);assert.equal(app.run('reservations[0].title'),'作品A修正');
app.get('#bookingStatusFilter').value='未定';app.run('renderBookings()');assert.equal(app.get('#bookingRows').innerHTML,'');app.get('#bookingStatusFilter').value='印刷済み';app.run('renderBookings()');assert.ok(app.get('#bookingRows').innerHTML.includes('作品A修正'));assert.ok(app.get('#bookingRows').innerHTML.includes('印刷済み'));
const file=fakeFile();app.context.window.showSaveFilePicker=async()=>file;await app.run('saveDataFileAs()');let saved=JSON.parse(file.read());assert.equal(saved.items[0].remaining,800);assert.equal(saved.items[0].image,initialItem.image);assert.equal(saved.reservations[0].printStatus,'印刷済み');assert.equal(app.run('fileDirty'),false);assert.equal(app.get('#saveStatusSummary').textContent,'ファイル保存済み');
app.run("saveBookings(reservations.map(x=>({...x,printStatus:'未定'})))");await app.run('writeDataFile(true)');saved=JSON.parse(file.read());assert.equal(saved.reservations[0].printStatus,'未定');
const fresh=boot();fresh.context.window.showOpenFilePicker=async()=>[file];await fresh.run('openDataFile()');assert.equal(fresh.run('items.length'),1);assert.equal(fresh.run('reservations[0].title'),'作品A修正');assert.equal(fresh.run('reservations[0].printStatus'),'未定');
const before=file.read();file.externalWrite(before+'\n');fresh.run('saveBookings(reservations.map(x=>({...x,title:"端末の変更"})))');const writes=file.writes();await fresh.run('writeDataFile(true)');assert.equal(file.writes(),writes);assert.equal(fresh.run('fileDirty'),true);assert.ok(fresh.get('#storageDetail').textContent.includes('別の画面'));
const embedded=boot({embedded:saved});assert.equal(embedded.run('items[0].image'),initialItem.image);assert.equal(embedded.run('reservations[0].printStatus'),'未定');
const restricted=boot({embedded:saved,blocked:true});restricted.run('saveBookings(reservations.map(x=>({...x,title:"一時メモリー"})))');assert.equal(restricted.run('reservations[0].title'),'一時メモリー');assert.equal(restricted.run('storage.persistent'),false);assert.ok(restricted.get('#storageStatus').textContent.includes('この画面内'));
const legacy=JSON.stringify({version:1,items:[initialItem]});assert.equal(app.run('decodeData('+JSON.stringify(legacy)+').reservations.length'),0);
const unsupported=boot({embedded:saved});unsupported.context.window.showSaveFilePicker=async()=>{const error=Error('Unavailable');error.name='SecurityError';throw error};await unsupported.run('saveDataFileAs()');assert.equal(unsupported.downloads.length,1);assert.match(unsupported.downloads[0],/^SPOOL-data-.*\.json$/);
app.run('showBookingView(false)');assert.equal(app.get('.inventory').hidden,false);
console.log('Passed: no network runtime, complete inline scripts, legacy cache, booking registration/edit/status/filter, JSON save/load across fresh versions, image retention, overwrite conflict and restricted-storage fallback.');
