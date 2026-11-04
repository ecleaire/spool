import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const html=fs.readFileSync('dist/index.html','utf8');
assert.ok(!/<script\b[^>]*src=|<link\b[^>]*rel="stylesheet"|@import|\bfetch\s*\(/i.test(html),'Offline artifact must not request runtime dependencies');
const scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].filter(x=>!x[1].includes('application/json')).map(x=>x[2]);
assert.equal(scripts.length,10);scripts.forEach(s=>new vm.Script(s));
const initialItem={id:'spool_test',name:'PLA Basic',brand:'Bambu Lab',material:'PLA',colorName:'白',color:'#FFFFFF',remaining:800,capacity:1000,diameter:'1.75',image:'data:image/png;base64,AAAA'};
function boot({cached=[],embedded={},blocked=false}={}){
 const data=new Map(cached),nodes=new Map(),downloads=[];
 function el(){return{value:'',textContent:'',innerHTML:'',style:{},hidden:false,disabled:false,classList:{add(){},remove(){},toggle(){}},addEventListener(){},setAttribute(name,value){(this.attributes||={})[name]=value},removeAttribute(name){if(this.attributes)delete this.attributes[name]},setCustomValidity(message){this.validationMessage=message},showModal(){this.open=true},close(){this.open=false},click(){this.onclick?.()}}}
 const get=s=>{if(!nodes.has(s)){const node=el(),fields=new Map();node.elements={namedItem(key){if(!fields.has(key)){const field=el();field.value=key==='material'?'PLA':key==='color'?'#8cbeb0':'';fields.set(key,field)}return fields.get(key)}};node.reset=()=>{for(const [key,field]of fields){field.value=key==='material'?'PLA':key==='color'?'#8cbeb0':'';field.checked=false;field.disabled=false}};nodes.set(s,node)}return nodes.get(s)};
 const localStorage={getItem(k){if(blocked)throw Error('blocked');return data.get(k)??null},setItem(k,v){if(blocked)throw Error('blocked');data.set(k,v)},removeItem:k=>data.delete(k)};
 const context={document:{body:{classList:{contains:()=>false}},getElementById:()=>({textContent:JSON.stringify(embedded)}),querySelector:get,querySelectorAll:()=>[],createElement:()=>({click(){downloads.push(this.download)}})},localStorage,crypto:webcrypto,URL:Object.assign(class extends URL {},{createObjectURL:()=> 'blob:test',revokeObjectURL(){}}),TextEncoder,structuredClone,Blob,Intl,Date,setTimeout:()=>1,clearTimeout(){},window:{addEventListener(){}},console,confirm:()=>true,FormData:class{constructor(form){return Object.entries(form.data)}}};
 vm.createContext(context);scripts.forEach(s=>vm.runInContext(s,context));return{run:s=>vm.runInContext(s,context),get,data,context,downloads};
}
function fakeFile(name='SPOOL-data.json'){let text='',writes=0;return{name,queryPermission:async()=> 'granted',requestPermission:async()=> 'granted',getFile:async()=>({text:async()=>text}),createWritable:async()=>{let next='';return{write:async value=>{next=value},close:async()=>{text=next;writes++},abort:async()=>{}}},read:()=>text,externalWrite:value=>{text=value},writes:()=>writes}}
const app=boot({cached:[['spool-inventory-v1',JSON.stringify([initialItem])]]});
assert.equal(app.run('items.length'),1);assert.equal(app.run('normalizeHex("abc")'),'#AABBCC');
app.get('#navBookings').onclick();assert.equal(app.get('#navBookings').attributes['aria-current'],'page');assert.equal(app.get('#addBooking').hidden,false);assert.equal(app.get('#openLibrary').hidden,true);
app.get('#showInventory').onclick();assert.equal(app.get('#navInventory').attributes['aria-current'],'page');assert.equal(app.get('#addBooking').hidden,true);
app.get('#manageData').onclick();assert.equal(app.get('#dataDialog').open,true);app.get('#closeData').onclick();assert.equal(app.get('#dataDialog').open,false);
assert.equal(app.run('ELEGOO_LIBRARY.length'),5);assert.equal(app.run('ELEGOO_LIBRARY.reduce((n,x)=>n+x.colors.length,0)'),46);
assert.ok(app.run('ELEGOO_LIBRARY.every(p=>p.colors.every(x=>/^data:image\\/jpeg;base64,/.test(x.image)&&/^#[0-9A-F]{6}$/.test(x.color)&&x.shopUrl.startsWith("https://jp.elegoo.com/products/")))'));
assert.equal(app.run('BBAMBOO_LIBRARY.length'),2);assert.ok(app.run('BBAMBOO_LIBRARY[1].colors[0].image').startsWith('data:image/png;base64,'));assert.equal(app.run('BBAMBOO_LIBRARY[1].colors[0].name'), '蓄光ブルー');assert.equal(app.run('BAMBU_LIBRARY.length'),2);assert.equal(app.run('PRODUCT_LIBRARY.reduce((n,p)=>n+p.colors.length,0)'),63);
for(const [id,brand,variant,count]of [['elegoo-plus','ELEGOO','PLA+',6],['bambu-basic','Bambu Lab','PLA Basic',7],['bambu-matte','Bambu Lab','PLA Matte',8]]){app.run('applyELEGOOProduct('+JSON.stringify(id)+')');assert.equal(app.get('#productInfoDetails').open,false);assert.equal(app.get('#colorInfoDetails').open,false);assert.equal(app.get('#form').elements.namedItem('brand').value,brand);assert.equal(app.get('#form').elements.namedItem('variant').value,variant);assert.equal(app.run('paletteFor(colorContext()).official.length'),count);assert.ok(app.run('photo.startsWith("data:image/jpeg;base64,")'));}
app.get('#openLibrary').onclick();assert.equal(app.get('#elegooLibrary').open,true);app.run('applyELEGOOProduct("elegoo-translucent")');assert.equal(app.get('#form').elements.namedItem('brand').value,'ELEGOO');assert.equal(app.get('#form').elements.namedItem('variant').value,'PLA Translucent');assert.ok(app.run('photo.startsWith("data:image/jpeg;base64,")'));assert.equal(app.run('paletteFor(colorContext()).official.length'),8);
// Explicit product selection fills known facts while existing stock and manual corrections survive.
const autofill=boot({cached:[['spool-inventory-v1',JSON.stringify([initialItem])]]});autofill.run('openEditor("spool_test")');autofill.get('#editorProduct').value='elegoo-plus';autofill.get('#editorProduct').onchange();const af=autofill.get('#form').elements;
assert.equal(af.namedItem('brand').value,'ELEGOO');assert.equal(Number(af.namedItem('remaining').value),800);assert.equal(Number(af.namedItem('capacity').value),1000);assert.equal(autofill.get('#presetDetails').open,true);
af.namedItem('name').value='自分の商品名';af.namedItem('colorName').value='調整した色';af.namedItem('color').value='#112233';af.namedItem('capacity').value='750';af.namedItem('remaining').value='600';af.namedItem('location').value='保管棚';autofill.run('updateDraftSummary()');assert.equal(autofill.get('#editorProduct').value,'');assert.equal(af.namedItem('name').value,'自分の商品名');assert.equal(af.namedItem('color').value,'#112233');assert.equal(af.namedItem('remaining').value,'600');assert.equal(af.namedItem('location').value,'保管棚');
// Reuse inventory as an editable new spool, then continue registration without mutating its source.
const repeated=boot({cached:[['spool-inventory-v1',JSON.stringify([initialItem])]]});repeated.run('openEditor()');repeated.get('#stockTemplate').value='spool_test';repeated.get('#stockTemplate').onchange();assert.equal(Number(repeated.get('#form').elements.namedItem('remaining').value),1000);assert.equal(repeated.run('items[0].remaining'),800);assert.equal(repeated.run('photo'),initialItem.image);
const repeatForm=repeated.get('#form');repeatForm.data={...initialItem,name:'複製して変更',remaining:'640',copies:'1',variant:'PLA Basic',colorHex:'#FFFFFF',amazonUrl:'',shopUrl:'',location:'棚A',note:''};repeatForm.onsubmit({target:repeatForm,submitter:{id:'saveAndContinue'},preventDefault(){}});assert.equal(repeated.run('items.length'),2);assert.equal(repeated.run('items.find(x=>x.id==="spool_test").remaining'),800);assert.equal(repeated.run('items.find(x=>x.id!=="spool_test").remaining'),640);assert.equal(repeated.get('#editor').open,true);assert.equal(repeated.run('editId'),null);assert.equal(Number(repeatForm.elements.namedItem('remaining').value),1000);assert.equal(Number(repeatForm.elements.namedItem('copies').value),1);assert.equal(repeatForm.elements.namedItem('location').value,'棚A');
repeated.run('openEditor("spool_test")');assert.equal(repeated.get('#saveAndContinue').hidden,true);assert.equal(repeated.get('#stockTemplateDetails').hidden,true);assert.equal(repeated.run('matchesPresetSearch({name:"ブラック",color:"#000000",code:"10101"},"１０１０１")'),true);assert.equal(repeated.run('matchesPresetSearch({name:"ブラック",color:"#000000"},"ffffff")'),false);
// Editing must retain fields that are absent from the current form/schema version.
const metadata=boot({cached:[['spool-inventory-v1',JSON.stringify([{...initialItem,importedMeta:{batch:'lot-123'},purchasedAt:'2026-10-01'}])]]});metadata.run('openEditor("spool_test")');const metadataForm=metadata.get('#form');metadataForm.data={...initialItem,name:'編集後',variant:'PLA Basic',colorHex:'#FFFFFF',amazonUrl:'',shopUrl:'',location:'',note:''};metadataForm.onsubmit({target:metadataForm,preventDefault(){}});assert.equal(metadata.run('items[0].importedMeta.batch'),'lot-123');assert.equal(metadata.run('items[0].purchasedAt'),'2026-10-01');assert.equal(metadata.run('items[0].name'),'編集後');
// A slow image decode must not overwrite a subsequently selected official color photo.
const race=boot();race.run('openEditor()');let finishDecode;race.context.createImageBitmap=()=>new Promise(resolve=>finishDecode=resolve);const createElement=race.context.document.createElement;race.context.document.createElement=tag=>tag==='canvas'?{getContext:()=>({fillStyle:'',fillRect(){},drawImage(){}}),toDataURL:()=> 'data:image/jpeg;base64,AAAA'}:createElement(tag);race.run('applyELEGOOProduct("elegoo-plus")');const decodingAfterProduct=race.run('attachImage({size:100})');race.run('applyColorPreset(PRODUCT_LIBRARY.find(x=>x.id==="elegoo-plus").colors[1])');const chosenPhoto=race.run('photo');finishDecode({width:10,height:10,close(){}});await decodingAfterProduct;assert.equal(race.run('photo'),chosenPhoto);
assert.equal(app.run('bookingDue({deadline:"2026-11-01",printStatus:"印刷済み"},"2026-11-02").tone'),'complete');assert.equal(app.run('bookingDue({deadline:"2026-11-01",printStatus:"印刷予定"},"2026-11-02").label'),'1日超過');assert.equal(app.run('bookingDue({deadline:"2026-11-03",printStatus:"印刷予定"},"2026-11-02").label'),'明日期限');
app.run('showBookingView(true)');assert.equal(app.get('#bookingView').hidden,false);assert.equal(app.get('.inventory').hidden,true);
app.get('#addBooking').onclick();assert.equal(app.get('#bookingDialog').open,true);assert.ok(app.get('#bookingColorChoices').innerHTML.includes('PLA Basic'));
const form=app.get('#bookingForm');form.data={registeredDate:'2026-11-01',deadline:'2026-11-03',title:'作品A',weekday:'日',className:'A3',printStatus:'印刷予定',desiredColor:JSON.stringify({name:'白',color:'#FFFFFF'}),printDuration:'1:30'};
await form.onsubmit({target:form,preventDefault(){}});assert.equal(app.run('reservations[0].printMinutes'),90);assert.equal(app.run('reservations[0].printStatus'),'印刷予定');assert.equal(app.get('#bookingDialog').open,false);
assert.ok(app.get('#bookingCards').innerHTML.includes('作品A'));assert.ok(app.get('#bookingCards').innerHTML.includes('予約を編集'));assert.equal(app.get('#bookingPlanned').textContent,1);
app.run("reservations[0].creator='テスト製作者'");app.run('openBooking(reservations[0].id)');assert.equal(form.elements.namedItem('title').value,'作品A');assert.equal(form.elements.namedItem('printStatus').value,'印刷予定');form.data={...form.data,title:'作品A修正',printStatus:'印刷済み'};form.onsubmit({target:form,preventDefault(){}});assert.equal(app.run('reservations.length'),1);assert.equal(app.run('reservations[0].title'),'作品A修正');assert.equal(app.run('reservations[0].creator'),'テスト製作者');
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
// Related-file references survive JSON roundtrips without embedding model contents.
const modelPath=String.raw`C:\Models\日本語の作品.3mf`,uncPath=String.raw`\\server\prints\part.stl`;
assert.equal(app.run('validBookingFile('+JSON.stringify(modelPath)+')'),true);
assert.equal(app.run('validBookingFile('+JSON.stringify(uncPath)+')'),true);
for(const path of ['javascript:alert(1)','https://user:secret@example.com/part.stl',String.raw`\\?\C:\part.stl`,'C:\\part.exe','C:\\part.stl:stream'])assert.equal(app.run('validBookingFile('+JSON.stringify(path)+')'),false);
app.run('reservations[0].files='+JSON.stringify([modelPath,uncPath]));
assert.equal(app.run('validBookings(reservations)'),true);
assert.equal(app.run('decodeData(serializeData()).reservations[0].files[0]'),modelPath);
assert.ok(app.run('bookingFileMarkup(reservations[0])').includes('spool-bambu://open/?path='+encodeURIComponent(modelPath)));
app.run('openBooking(reservations[0].id)');assert.equal(form.elements.namedItem('files').value,[modelPath,uncPath].join('\n'));
console.log('Passed: local/UNC model references, unsafe path rejection, JSON preservation and edit prefill.');

// Manual order is saved on each item; registration order and filtered-out slots stay intact.
const ordered=boot({cached:[['spool-inventory-v1',JSON.stringify(['a','b','c','d'].map((id,i)=>({...initialItem,id,name:['Part 10','Part 2','Part 30','Part 1'][i],remaining:[900,50,100,0][i],capacity:[1000,100,1000,1000][i]})))]]});
ordered.run("reorderMode=true;$('#sort').value='manual';render();visibleIds=['a','c']");
assert.equal(ordered.run("moveFilament('c','a')"),true);
assert.equal(ordered.run("sortFilaments(items,'manual').map(x=>x.id).join(',')"),'c,b,a,d');
assert.equal(ordered.run("sortFilaments(items,'new').map(x=>x.id).join(',')"),'a,b,c,d');
assert.equal(ordered.run("sortFilaments(items,'name').map(x=>x.id).join(',')"),'d,b,a,c');
assert.equal(ordered.run("sortFilaments(items,'remaining-desc').map(x=>x.id).join(',')"),'a,c,b,d');
assert.equal(ordered.run("sortFilaments(items,'ratio').map(x=>x.id).join(',')"),'d,c,b,a');
ordered.run("$('#sort').value='name'");assert.equal(ordered.run("moveFilament('a','b')"),false);
const restoredOrder=boot({cached:[...ordered.data]});assert.equal(restoredOrder.run("sortFilaments(items,'manual').map(x=>x.id).join(',')"),'c,b,a,d');
const orderFile=fakeFile();ordered.context.window.showSaveFilePicker=async()=>orderFile;await ordered.run('saveDataFileAs()');const orderJson=JSON.parse(orderFile.read());assert.equal(orderJson.items.find(x=>x.id==='c').manualOrder,0);
const orderVersion=boot({embedded:orderJson});assert.equal(orderVersion.run("sortFilaments(items,'manual').map(x=>x.id).join(',')"),'c,b,a,d');
console.log('Passed: product brand/color/photo selection, manual order, filtered moves, numeric sorting and JSON version persistence.');

const choices=boot();choices.get('#editorBrand').value='ELEGOO';choices.get('#editorBrand').onchange();assert.equal(choices.get('#form').elements.namedItem('brand').value,'ELEGOO');assert.ok(choices.get('#editorVariant').innerHTML.includes('PLA+'));assert.ok(!choices.get('#editorVariant').innerHTML.includes('PLA Wood'));choices.get('#editorBrand').value='Bambu Lab';choices.get('#editorBrand').onchange();assert.ok(choices.get('#editorVariant').innerHTML.includes('PLA Basic'));assert.ok(choices.get('#editorVariant').innerHTML.includes('PLA Matte'));choices.get('#editorBrand').value='__custom__';choices.get('#editorBrand').onchange();assert.equal(choices.get('#customBrand').hidden,false);choices.get('#customBrand').value='Custom maker';choices.get('#customBrand').oninput();assert.equal(choices.get('#form').elements.namedItem('brand').value,'Custom maker');choices.get('#editorVariant').value='__custom__';choices.get('#editorVariant').onchange();choices.get('#customVariant').value='Special PLA';choices.get('#customVariant').oninput();assert.equal(choices.get('#form').elements.namedItem('variant').value,'Special PLA');console.log('Passed: native brand/type choices, brand-dependent variants and custom-entry synchronization.');

// Reservation fields keep the old schema while supporting unknown deadlines and files.
const bookingUi=boot({cached:[['spool-inventory-v1',JSON.stringify([initialItem])]]});
assert.equal(bookingUi.run("parsePrintDuration('1:30')"),90);assert.equal(bookingUi.run("parsePrintDuration('90分')"),90);assert.equal(bookingUi.run("parsePrintDuration('1時間30分')"),90);assert.equal(bookingUi.run("parsePrintDuration('1:75')"),null);assert.equal(bookingUi.run("parsePrintDuration('0:00')"),null);
assert.equal(bookingUi.run("bookingDue({deadline:''}).days"),Infinity);assert.ok(bookingUi.run("deadlineMarkup({deadline:''})").includes('未定'));assert.equal(bookingUi.run('bookingColors(null).flatMap(x=>x[1]).length'),1);
bookingUi.run('openBooking()');const bookingForm=bookingUi.get('#bookingForm');bookingForm.elements.namedItem('registeredDate').value='2026-11-03';bookingForm.elements.namedItem('registeredDate').onchange();assert.equal(bookingForm.elements.namedItem('weekday').value,'火');
bookingUi.get('#bookingDeadlineUnknown').checked=true;bookingUi.get('#bookingDeadlineUnknown').onchange();assert.equal(bookingForm.elements.namedItem('deadline').disabled,true);
bookingForm.data={registeredDate:'2026-11-03',title:'期限未定の作品',weekday:'火',className:'',printStatus:'未定',desiredColor:JSON.stringify({name:'白 / PLA Basic (Bambu Lab)',color:'#FFFFFF'}),printDuration:'2:15'};
const smallModel=Object.assign(new Blob(['abc'],{type:'application/octet-stream'}),{name:'model.stl',lastModified:1});bookingUi.context.modelFile=smallModel;bookingUi.run('stageBookingFiles([modelFile,modelFile])');assert.equal(bookingUi.run('bookingPendingFiles.length'),1);
bookingUi.context.FileReader=class{readAsDataURL(blob){blob.arrayBuffer().then(bytes=>{this.result='data:application/octet-stream;base64,'+Buffer.from(bytes).toString('base64');this.onload()})}};
await bookingForm.onsubmit({target:bookingForm,preventDefault(){}});assert.equal(bookingUi.run('reservations[0].deadline'),'');assert.equal(bookingUi.run('reservations[0].className'),'');assert.equal(bookingUi.run('reservations[0].printMinutes'),135);assert.equal(bookingUi.run('reservations[0].attachments[0].data'),'data:application/octet-stream;base64,YWJj');assert.equal(bookingUi.get('#bookingUrgent').textContent,0);
const modelData=JSON.parse(bookingUi.run('serializeData()'));const modelRestored=boot({embedded:modelData});assert.equal(modelRestored.run('reservations[0].attachments[0].name'),'model.stl');assert.ok(modelRestored.get('#bookingCards').innerHTML.includes('model.stl'));assert.equal(modelRestored.run('validBookings(reservations)'),true);console.log('Passed: weekday defaults, unknown deadlines, blank class, stock-only visual colors, combined duration, file staging and embedded-file JSON restore.');

// Duration shortcuts keep the same persisted minute schema and respect limits.
const ergonomic=boot({cached:[['spool-inventory-v1',JSON.stringify([initialItem])]]});
const duration=ergonomic.get('#bookingForm').elements.namedItem('printDuration');
for(const [input,minutes]of [['１：３０',90],['90分',90],['1時間30分',90],['1000:00',60000],['0:01',1],['1:60',null],['0:00',null],['1000:01',null],['-15',null]])assert.equal(ergonomic.run('parsePrintDuration('+JSON.stringify(input)+')'),minutes);
ergonomic.run('setPrintDuration(90)');assert.equal(duration.value,'1:30');
ergonomic.get('#durationPlus').onclick();assert.equal(duration.value,'1:45');ergonomic.get('#durationMinus').onclick();assert.equal(duration.value,'1:30');
ergonomic.run('setPrintDuration(1)');ergonomic.get('#durationMinus').onclick();assert.equal(duration.value,'0:01');
ergonomic.run('setPrintDuration(60000)');ergonomic.get('#durationPlus').onclick();assert.equal(duration.value,'1000:00');
duration.setCustomValidity('old error');ergonomic.run('openBooking()');assert.equal(duration.validationMessage,'');assert.equal(duration.value,'1:00');
ergonomic.get('#bookingNoPreference').onclick();assert.equal(JSON.parse(ergonomic.get('#bookingColor').value).preference,'none');
const random=ergonomic.run('chooseRandomBookingColor()');assert.equal(random.color,initialItem.color);assert.equal(JSON.parse(ergonomic.get('#bookingColor').value).preference,'random');
assert.equal(ergonomic.run('isTranslucentFilament({variant:"PLA Translucent"})'),true);assert.equal(ergonomic.run('isTranslucentFilament({variant:"PLA Matte"})'),false);
const ergonomicForm=ergonomic.get('#bookingForm');ergonomicForm.data={registeredDate:'2026-11-03',deadline:'2026-11-04',title:'キーホルダー',creator:'作者A',weekday:'火',className:'',printStatus:'印刷予定',desiredColor:ergonomic.get('#bookingColor').value,printDuration:'90分'};
await ergonomicForm.onsubmit({target:ergonomicForm,preventDefault(){}});assert.equal(ergonomic.run('reservations[0].creator'),'作者A');assert.equal(ergonomic.run('reservations[0].colorPreference'),'random');assert.equal(ergonomic.run('reservations[0].printMinutes'),90);
ergonomic.run('openBooking(reservations[0].id)');assert.equal(JSON.parse(ergonomic.get('#bookingColor').value).preference,'random');
ergonomic.get('#bookingNoPreference').onclick();ergonomicForm.data={...ergonomicForm.data,creator:'',desiredColor:ergonomic.get('#bookingColor').value};await ergonomicForm.onsubmit({target:ergonomicForm,preventDefault(){}});assert.equal(ergonomic.run('reservations[0].creator'),'');assert.equal(ergonomic.run('reservations[0].colorPreference'),'none');
ergonomic.run('openBooking(reservations[0].id)');assert.equal(JSON.parse(ergonomic.get('#bookingColor').value).preference,'none');
console.log('Passed: duration formats, fifteen-minute shortcuts, bounds, validation reset, optional creator, no preference/random persistence and translucent detection.');

assert.equal(app.run('valid({...items[0],image:"data:image/svg+xml;base64,AAAA"})'),false);assert.equal(app.run('valid({...items[0],image:"data:image/png;base64,AAAA\\" onerror=alert(1)"})'),false);

const tagTest=boot();assert.equal(tagTest.run('JSON.stringify(parseTags("教室, #試作、教室"))'),'["教室","試作"]');assert.equal(tagTest.run('validTags(["a".repeat(31)])'),false);assert.equal(tagTest.run('tagsMarkup(["<img src=x>"]).includes("<img")'),false);

// Purchase plans survive file transfer without being counted as available stock.
const planItem={...initialItem,id:'plan_test',inventoryStatus:'planned',tags:['よく使う','独自タグ']};
const plans=boot({cached:[['spool-inventory-v1',JSON.stringify([initialItem,planItem])]]});
assert.equal(plans.run('valid({...items[0],inventoryStatus:"unknown"})'),false);
assert.equal(plans.get('#statCount').textContent,1);
assert.equal(plans.get('#statWeight').textContent,'0.80');
plans.run('setTab("planned")');assert.ok(plans.get('#items').innerHTML.includes('購入予定'));assert.ok(!plans.get('#items').innerHTML.includes('data-row-id="spool_test"'));
plans.run('openUsage("plan_test")');assert.ok(plans.get('#toast').textContent.includes('購入予定'));assert.ok(!plans.get('#usage').open);
assert.equal(plans.run('bookingColors(null).flatMap(x=>x[1]).length'),1);
const planFile=fakeFile();plans.context.window.showSaveFilePicker=async()=>planFile;await plans.run('saveDataFileAs()');
const restoredPlan=boot({embedded:JSON.parse(planFile.read())});assert.equal(restoredPlan.run('items[1].inventoryStatus'),'planned');assert.equal(restoredPlan.run('items[1].tags.join(",")'),'よく使う,独自タグ');
restoredPlan.run('save(items.map(x=>({...x,inventoryStatus:"owned"})))');assert.equal(restoredPlan.get('#statCount').textContent,2);assert.equal(restoredPlan.get('#statWeight').textContent,'1.60');
plans.run('save([{...items[1],remaining:0}]);setTab("empty")');assert.ok(!plans.get('#items').innerHTML.includes('data-row-id="plan_test"'));
assert.ok(plans.run('DEFAULT_TAGS.includes("よく使う")'));
console.log('Passed: purchase-plan stock exclusion, usage guard, filters, JSON/tag retention, conversion and legacy compatibility.');

// Verified catalog links follow the color choice and do not replace user URLs.
app.run('applyELEGOOProduct("elegoo-translucent")');assert.equal(app.get('#form').elements.namedItem('amazonUrl').value,'https://www.amazon.co.jp/dp/B0GZWJRNL8');app.run('applyColorPreset(PRODUCT_LIBRARY.find(p=>p.id==="elegoo-translucent").colors[2])');assert.equal(app.get('#form').elements.namedItem('amazonUrl').value,'https://www.amazon.co.jp/dp/B0GZWC4TD9');assert.equal(app.run('catalogAmazonUrl({...items[0],brand:"ELEGOO",material:"PLA",variant:"PLA Silk",colorName:"ホワイト"})'),'');assert.equal(app.run('enrichAmazonLinks([{...items[0],amazonUrl:"https://example.com/user"}])[0].amazonUrl'),'https://example.com/user');

// Remove only the confirmed wrong glow link, preserving original stock and custom URLs.
assert.equal(app.run('BBAMBOO_LIBRARY.find(p=>p.id==="bbamboo-glow").sourceUrl'),'');assert.equal(app.run('BBAMBOO_LIBRARY.find(p=>p.id==="bbamboo-glow").colors[0].shopUrl'),'');
const repaired=JSON.parse(app.run('JSON.stringify(enrichAmazonLinks([{...items[0],brand:"B.BAMBOO",name:"PLA Glow",variant:"PLA Glow",colorName:"蓄光ブルー",amazonUrl:"https://www.amazon.co.jp/dp/B0H99CBS67?ref=share",shopUrl:"https://www.amazon.jp/dp/B0H99CBS67"}])[0])'));assert.equal(repaired.amazonUrl,'');assert.equal(repaired.shopUrl,'');assert.equal(repaired.remaining,800);assert.equal(repaired.image,initialItem.image);assert.equal(app.run('enrichAmazonLinks([{...items[0],brand:"B.BAMBOO",name:"PLA Glow",amazonUrl:"https://example.com/custom"}])[0].amazonUrl'),'https://example.com/custom');
