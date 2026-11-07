// Read slicer metadata only. Uploaded machine instructions are never executed.
const PRINT_METADATA_LIMIT=16*1024*1024;
function slicerSeconds(value){
 const s=String(value||'').trim();if(/^\d+(?:\.\d+)?$/.test(s))return Number(s);
 const parts=[...s.matchAll(/(\d+(?:\.\d+)?)\s*([dhms])/gi)];if(!parts.length)return null;
 return parts.reduce((n,m)=>n+Number(m[1])*({d:86400,h:3600,m:60,s:1}[m[2].toLowerCase()]),0);
}
function printUsageNumber(value,scale=1){if(value===null||value===undefined||String(value).trim()==='')return null;const number=Number(value)*scale;return Number.isFinite(number)&&number>=0&&number<=1000000000?Math.round(number*1000)/1000:null}
function validFilamentUsage(value){const number=x=>x===null||(typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1000000000);return value===null||!!value&&typeof value==='object'&&!Array.isArray(value)&&number(value.grams)&&number(value.millimeters)&&(value.plates===undefined||validPrintPlates(value.plates))&&Array.isArray(value.filaments)&&value.filaments.length<=64&&value.filaments.every(f=>f&&typeof f.type==='string'&&f.type.length<=40&&typeof f.color==='string'&&(f.color===''||/^#[0-9a-f]{6}$/i.test(f.color))&&number(f.grams)&&number(f.millimeters))}
function cleanPrintUsage(value){
 const filaments=(value.usageFilaments||value.filaments||[]).slice(0,64).map(f=>({color:/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(f.color||'')?f.color.slice(0,7).toUpperCase():'',type:String(f.type||'').replace(/[<>]/g,'').slice(0,40),grams:printUsageNumber(f.grams),millimeters:printUsageNumber(f.millimeters)}));
 const sum=key=>filaments.length&&filaments.every(f=>f[key]!==null)?printUsageNumber(filaments.reduce((n,f)=>n+f[key],0)):null;
 const grams=printUsageNumber(value.grams)??sum('grams'),millimeters=printUsageNumber(value.millimeters)??sum('millimeters');
 return grams!==null||millimeters!==null||filaments.some(f=>f.grams!==null||f.millimeters!==null)?{grams,millimeters,filaments}:null;
}
function cleanPrintMetadata(value){
 const seconds=Number(value.seconds),layer=Number(value.layerHeight),seen=new Set();
 return {...value,filamentUsage:validFilamentUsage(value.filamentUsage)&&value.filamentUsage?value.filamentUsage:cleanPrintUsage(value),seconds:Number.isFinite(seconds)&&seconds>0&&seconds<=3600000?seconds:null,layerHeight:Number.isFinite(layer)&&layer>=0.02&&layer<=2?layer:null,filaments:(value.filaments||[]).slice(0,64).map(x=>({color:/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(x.color||'')?x.color.slice(0,7).toUpperCase():'',type:String(x.type||'').replace(/[<>]/g,'').slice(0,40)})).filter(x=>{const k=x.color+x.type;if(!x.color||seen.has(k))return false;seen.add(k);return true})};
}
function parseGcodeMetadata(text){
 const field=key=>text.match(new RegExp('^;\\s*'+key+'\\s*(?:=|:)\\s*([^\\r\\n]+)','mi'))?.[1]||'';
 const values=value=>value?value.split(/[;,]/).map(x=>x.trim().replace(/^"|"$/g,'')):[];
 const colors=values(field('filament_colou?r')),types=values(field('filament_type'));
 const weights=values(field('filament used \\[g\\]')),lengths=values(field('filament used \\[mm\\]')),meters=values(field('filament used \\[m\\]'));
 const count=Math.max(colors.filter(Boolean).length,weights.filter(Boolean).length,lengths.filter(Boolean).length,meters.filter(Boolean).length),usage=Array.from({length:count},(_,i)=>({color:colors[i]||'',type:types[i]||types[0],grams:weights.length===count?weights[i]:null,millimeters:lengths.length===count?printUsageNumber(lengths[i]):meters.length===count?printUsageNumber(meters[i],1000):null}));
 const generic=text.match(/^;\s*filament used\s*:\s*(\d+(?:\.\d+)?)\s*(mm|m|g)\s*$/mi),totalGrams=field('total filament (?:used |weight )?\\[g\\]')||(weights.length===1?weights[0]:generic?.[2]?.toLowerCase()==='g'?generic[1]:null),totalMm=field('total filament length \\[mm\\]')||field('total filament used \\[mm\\]')||(lengths.length===1?lengths[0]:meters.length===1?printUsageNumber(meters[0],1000):generic&&generic[2].toLowerCase()!=='g'?printUsageNumber(generic[1],generic[2].toLowerCase()==='m'?1000:1):null);
 if(count===1){usage[0].grams=usage[0].grams??totalGrams;usage[0].millimeters=usage[0].millimeters??printUsageNumber(totalMm);}
 const duration=text.match(/total estimated time\s*:\s*([^;\r\n]+)/i)?.[1]||text.match(/estimated printing time\s*(?:\([^)]*\))?\s*=\s*([^\r\n]+)/i)?.[1]||field('TIME')||text.match(/model printing time\s*:\s*([^;\r\n]+)/i)?.[1];
 return cleanPrintMetadata({seconds:slicerSeconds(duration),layerHeight:field('layer_height'),grams:totalGrams,millimeters:totalMm,usageFilaments:usage,filaments:colors.map((color,i)=>({color,type:types[i]||types[0],usage:usage[i]})).filter(f=>!f.usage||!(printUsageNumber(f.usage.grams)===0&&(f.usage.millimeters===null||f.usage.millimeters===0)||f.usage.millimeters===0&&(printUsageNumber(f.usage.grams)===null||printUsageNumber(f.usage.grams)===0)))});
}
async function readZipMetadata(file){
 // Central directory inspection avoids reading or expanding model meshes/images.
 const tail=new Uint8Array(await file.slice(Math.max(0,file.size-65557)).arrayBuffer()),tv=new DataView(tail.buffer);let end=-1;
 for(let p=tail.length-22;p>=0;p--)if(tv.getUint32(p,true)===0x06054b50&&p+22+tv.getUint16(p+20,true)===tail.length){end=p;break}
 if(end<0)throw Error('3MFのZIP構造を読み取れません。');
 const count=tv.getUint16(end+10,true),size=tv.getUint32(end+12,true),offset=tv.getUint32(end+16,true);
 if(tv.getUint16(end+4,true)||tv.getUint16(end+6,true)||count>4096||size>2*1024*1024||offset+size>file.size)throw Error('この3MFのアーカイブ形式には対応していません。');
 const bytes=new Uint8Array(await file.slice(offset,offset+size).arrayBuffer()),v=new DataView(bytes.buffer),entries=[];let p=0,total=0;
 for(let i=0;i<count;i++){
  if(p+46>bytes.length||v.getUint32(p,true)!==0x02014b50)throw Error('3MFのファイル一覧が破損しています。');
  const n=v.getUint16(p+28,true),extra=v.getUint16(p+30,true),comment=v.getUint16(p+32,true);if(p+46+n+extra+comment>bytes.length)throw Error('3MFのファイル一覧が不完全です。');
  const name=new TextDecoder().decode(bytes.subarray(p+46,p+46+n));
  if(/^Metadata\/(?:slice_info\.config|project_settings\.config|plate_\d+\.(?:json|gcode))$/i.test(name))entries.push({name,flags:v.getUint16(p+8,true),method:v.getUint16(p+10,true),compressed:v.getUint32(p+20,true),size:v.getUint32(p+24,true),offset:v.getUint32(p+42,true)});
  p+=46+n+extra+comment;
 }
 if(entries.length>64)throw Error('プレート数が多すぎます。プレート単位で書き出してください。');
 const result=new Map();
 // Config/JSON first. G-code is supplementary and may be too large to inspect.
 entries.sort((a,b)=>Number(a.name.endsWith('.gcode'))-Number(b.name.endsWith('.gcode')));
 for(const e of entries){
  if(e.size>PRINT_METADATA_LIMIT||e.compressed>PRINT_METADATA_LIMIT||total+e.size>32*1024*1024){if(e.name.endsWith('.gcode'))continue;throw Error('3MF内の設定情報が大きすぎます。');}
  if(e.flags&1||![0,8].includes(e.method)||e.offset+30>file.size)throw Error('暗号化または非対応の圧縮形式です。');
  const head=new DataView(await file.slice(e.offset,e.offset+30).arrayBuffer());if(head.getUint32(0,true)!==0x04034b50)throw Error('3MFのヘッダーが破損しています。');
  const start=e.offset+30+head.getUint16(26,true)+head.getUint16(28,true);if(start+e.compressed>offset)throw Error('3MF内のデータ位置が不正です。');
  let stream=file.slice(start,start+e.compressed).stream();
  if(e.method===8){if(typeof DecompressionStream==='undefined')throw Error('このブラウザーでは3MFの展開に対応していません。G-codeを選択してください。');stream=stream.pipeThrough(new DecompressionStream('deflate-raw'));}
  const reader=stream.getReader(),chunks=[];let length=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>e.size||length>PRINT_METADATA_LIMIT){await reader.cancel();throw Error('展開サイズが上限を超えています。');}chunks.push(value)}}finally{reader.releaseLock()}
  if(length!==e.size)throw Error('3MF内のデータが不完全です。');
  const data=new Uint8Array(length);let at=0;for(const chunk of chunks){data.set(chunk,at);at+=chunk.length}total+=length;result.set(e.name.toLowerCase(),new TextDecoder().decode(data));
 }
 return result;
}
function slicerXml(text){if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('3MFの設定XMLを読み取れません。');const xml=new DOMParser().parseFromString(text,'application/xml');if(xml.querySelector('parsererror'))throw Error('3MFの設定XMLが破損しています。');return xml}
async function extractPrintMetadata(file){
 if(/\.gcode$/i.test(file.name)){
  const head=await file.slice(0,512*1024).text(),tail=file.size>512*1024?await file.slice(Math.max(512*1024,file.size-512*1024)).text():'';
  return [{plate:'',...parseGcodeMetadata(head+'\n'+tail)}];
 }
 if(!/\.3mf$/i.test(file.name))return [];
 const entries=await readZipMetadata(file);let settings={};
 if(entries.has('metadata/project_settings.config')){try{settings=JSON.parse(entries.get('metadata/project_settings.config'))}catch{throw Error('3MFの商品・カラー設定を読み取れません。');}}
 const array=value=>Array.isArray(value)?value:[value],colors=array(settings.filament_colour||[]),types=array(settings.filament_type||[]);
 const base={layerHeight:array(settings.layer_height)[0],filaments:colors.map((color,i)=>({color,type:types[i]||types[0]}))};
 const plates=new Map();const ensure=id=>{if(!plates.has(id))plates.set(id,{...base,plate:id});return plates.get(id)};
 let hasSlicedPlates=false;const slice=entries.get('metadata/slice_info.config');if(slice){const xml=slicerXml(slice);for(const plate of xml.querySelectorAll('plate')){
  const metadata=key=>[...plate.querySelectorAll('metadata')].find(x=>x.getAttribute('key')===key)?.getAttribute('value');
  hasSlicedPlates=true;const id=metadata('index')||String(plates.size+1),row=ensure(id);row.seconds=Number(metadata('prediction'));
  const used=[...plate.querySelectorAll('filament')].filter(x=>x.getAttribute('id')!=='255'&&!(x.hasAttribute('used_g')&&Number(x.getAttribute('used_g'))===0));
  if(used.length){row.filaments=used.map(x=>({color:x.getAttribute('color'),type:x.getAttribute('type')}));row.usageFilaments=used.map(x=>({color:x.getAttribute('color'),type:x.getAttribute('type'),grams:x.getAttribute('used_g'),millimeters:x.hasAttribute('used_mm')?printUsageNumber(x.getAttribute('used_mm')):printUsageNumber(x.getAttribute('used_m'),1000)}));}
 }}
 for(const [name,text] of entries){const match=name.match(/plate_(\d+)\.(json|gcode)$/);if(!match)continue;const [,id,extension]=match;
  // A sliced export can contain preview JSON for unexported plates.
  if(hasSlicedPlates&&!plates.has(id))continue;
  const row=ensure(id);
  if(extension==='json'){try{const data=JSON.parse(text);if(Array.isArray(data.filament_colors)&&data.filament_colors.length&&!row.seconds)row.filaments=data.filament_colors.map((color,i)=>({color,type:types[data.filament_ids?.[i]]||types[i]||types[0]}));}catch{}}
  else{const data=parseGcodeMetadata(text);if(!row.seconds)row.seconds=data.seconds;if(data.layerHeight)row.layerHeight=data.layerHeight;if(!row.filaments?.length)row.filaments=data.filaments;if(!cleanPrintUsage(row))row.filamentUsage=data.filamentUsage;}
 }
 if(!plates.size)ensure('');return [...plates.values()].map(cleanPrintMetadata);
}

// A reservation can contain several sliced plates. Unknown values never become partial totals.
function validPrintPlates(plates){return Array.isArray(plates)&&plates.length>0&&plates.length<=64&&new Set(plates.map(p=>p?.attachmentId+':'+p?.plate)).size===plates.length&&plates.every(p=>p&&typeof p.attachmentId==='string'&&p.attachmentId.length>0&&p.attachmentId.length<=120&&typeof p.name==='string'&&p.name.length>0&&p.name.length<=240&&typeof p.plate==='string'&&p.plate.length<=40&&['seconds','grams','millimeters'].every(k=>p[k]===null||(typeof p[k]==='number'&&Number.isFinite(p[k])&&p[k]>=0&&p[k]<=(k==='seconds'?3600000:1000000000))))}
function aggregatePrintMetadata(rows){
 if(!rows.length||rows.length>64)throw Error('対象のプレートを1〜64件選択してください。');
 const sum=values=>values.every(v=>v!==null&&v!==undefined)?Math.round(values.reduce((a,b)=>a+b,0)*1000)/1000:null;
 const missingTime=rows.some(r=>!r.seconds),missingUsage=rows.some(r=>!r.filamentUsage),seconds=missingTime?null:sum(rows.map(r=>r.seconds));
 if(seconds!==null&&seconds>3600000)throw Error('合計印刷時間が1000時間を超えています。プレートを分けて予約してください。');
 const filaments=new Map(),usage=new Map();for(const [i,row] of rows.entries()){
  for(const f of row.filaments||[])filaments.set(f.color.toUpperCase()+':'+f.type.toUpperCase(),f);
  for(const [j,f] of (row.filamentUsage?.filaments||[]).entries()){const key=f.color&&f.type?f.color.toUpperCase()+':'+f.type.toUpperCase():i+':'+j;const old=usage.get(key);usage.set(key,old?{...f,grams:sum([old.grams,f.grams]),millimeters:sum([old.millimeters,f.millimeters])}:{...f});}
 }
 const complete=key=>rows.every(r=>r.filamentUsage&&r.filamentUsage[key]!==null),total=key=>complete(key)?sum(rows.map(r=>r.filamentUsage[key])):null;
 // If a plate has no trustworthy colour breakdown, require manual allocation rather than use a partial breakdown.
 const breakdownComplete=rows.every(r=>r.filamentUsage?.filaments?.length&&r.filamentUsage.filaments.every(f=>f.grams!==null)&&r.filamentUsage.grams!==null&&Math.abs(r.filamentUsage.filaments.reduce((n,f)=>n+f.grams,0)-r.filamentUsage.grams)<0.0011);
 const usageRows=[...usage.values()].map(f=>({...f,grams:breakdownComplete?f.grams:null,millimeters:missingUsage?null:f.millimeters}));
 if(filaments.size>64||usageRows.length>64)throw Error('色の内訳が64件を超えています。プレートを分けて選択してください。');
 const plates=rows.map(r=>({attachmentId:r.attachmentId,name:r.file.name,plate:String(r.plate||''),seconds:r.seconds??null,grams:r.filamentUsage?.grams??null,millimeters:r.filamentUsage?.millimeters??null}));
 const filamentUsage={grams:total('grams'),millimeters:total('millimeters'),filaments:usageRows,plates};
 if(!validPrintPlates(plates)||!validFilamentUsage(filamentUsage))throw Error('プレートの合計値が保存できる範囲を超えています。');
 return {rows,files:[...new Set(rows.map(r=>r.file))],file:rows[0].file,plate:rows.map(r=>r.plate||'1').join('・'),seconds:seconds&&seconds<=3600000?seconds:null,missingTime,missingUsage,layerHeight:rows.every(r=>r.layerHeight===rows[0].layerHeight)?rows[0].layerHeight:null,filaments:[...filaments.values()],filamentUsage};
}
