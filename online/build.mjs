import {readFileSync,writeFileSync,mkdirSync,readdirSync,lstatSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {build,transform} from 'esbuild';
import {createHash} from 'node:crypto';
import {publicConfig} from './security.mjs';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const config=publicConfig(JSON.parse(readFileSync(path.join(root,'online/config.json'),'utf8')));
const version=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8')).version;
let sourceSha=process.env.GITHUB_SHA||'';
if(!sourceSha)try{sourceSha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim()}catch{}
if(!/^[0-9a-f]{40}$/i.test(sourceSha))sourceSha='';
let html=readFileSync(path.join(root,'dist/index.html'),'utf8');
// The online build has isolated in-memory app state. Offline browser data is never imported implicitly.
const memory=`const EMBEDDED_DATA={items:[],deleted:[],reservations:[],customColorPresets:[]};const storage=(()=>{const data=new Map();return {persistent:false,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)}})();`;
html=html.replace(/<script>\s*\/\/ A downloaded copy[\s\S]*?<\/script>/,()=>'<script>'+memory+'</script>');
if(!html.includes(memory))throw Error('Missing bootstrap marker');
html=html.replace('function queueOfflineSave(){','function queueOfflineSave(){window.spoolOnlineChanged?.();return;');
html=html.replace('restoreFileLink();','/* Online state is loaded only after authenticated membership checks. */');
html=html.replace(/<body\b([^>]*)>/i,(_,attributes)=>{
 const hasClass=/\bclass\s*=\s*(["'])(.*?)\1/i.test(attributes);
 const attrs=hasClass?attributes.replace(/\bclass\s*=\s*(["'])(.*?)\1/i,(_match,quote,classes)=>'class='+quote+classes+' cloud-locked'+quote):attributes+' class="cloud-locked"';
 return '<body'+attrs+'><section id="cloud-panel" aria-label="オンラインライブラリ"></section>';
});
if(!html.includes('id="cloud-panel"')||!/<body\b[^>]*\bcloud-locked/.test(html))throw Error('Online shell and login protection were not inserted');
// Public catalog photos are fetched on demand; private library photos remain in authenticated state.
const catalogImages={};html=html.replace(/data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*/g,value=>{const key=createHash('sha256').update(value).digest('hex');catalogImages[key]=value;return 'catalog-image:'+key});
const catalogText=JSON.stringify(catalogImages),catalogFile='catalog-images-'+createHash('sha256').update(catalogText).digest('hex').slice(0,16)+'.json';
const lazyCatalog=`
window.spoolCatalogReady=false;let catalogRequest=null,catalogChoice=0;
window.spoolEnsureCatalog=()=>{if(window.spoolCatalogReady)return Promise.resolve();if(catalogRequest)return catalogRequest;catalogRequest=fetch('./${catalogFile}',{cache:'force-cache'}).then(response=>{if(!response.ok)throw Error('商品画像を読み込めませんでした。');return response.json()}).then(images=>{for(const product of PRODUCT_LIBRARY)for(const color of product.colors)for(const field of ['image','swatchImage']){const value=color[field];if(typeof value==='string'&&value.startsWith('catalog-image:')){const photo=images[value.slice(14)];if(typeof photo!=='string'||!/^data:image\\/(?:jpeg|png|webp);base64,/.test(photo))throw Error('商品画像の形式を確認できませんでした。');color[field]=photo}}window.spoolCatalogReady=true;if($('#editor').open){renderColorPresets();if($('#elegooLibrary').open)renderProductLibrary()}}).catch(error=>{catalogRequest=null;throw error});return catalogRequest};
const catalogOriginalEditor=openEditor;openEditor=function(id){catalogChoice++;return catalogOriginalEditor(id)};
const catalogOriginalProduct=applyELEGOOProduct;applyELEGOOProduct=function(id){if(window.spoolCatalogReady)return catalogOriginalProduct(id);const ticket=++catalogChoice;window.spoolCatalogApplying=ticket;$('#productAutofillStatus').textContent='商品画像を読み込んでいます…';$('#form .dialog-actions .primary').disabled=true;$('#saveAndContinue').disabled=true;return window.spoolEnsureCatalog().then(()=>{if(ticket===catalogChoice&&$('#editor').open&&$('#editorProduct').value===id)catalogOriginalProduct(id)}).catch(error=>{$('#productAutofillStatus').textContent=error.message+' 商品を選び直すか、手動入力をご利用ください。'}).finally(()=>{if(ticket===catalogChoice){window.spoolCatalogApplying=false;$('#form .dialog-actions .primary').disabled=editorEntryMode==='start';$('#saveAndContinue').disabled=editorEntryMode==='start'}})};
const catalogOriginalPreset=applyColorPreset;applyColorPreset=function(preset,context){if(window.spoolCatalogReady)return catalogOriginalPreset(preset,context);const ticket=++catalogChoice,expected=$('#form').elements.namedItem('color').value;$('#form .dialog-actions .primary').disabled=true;$('#saveAndContinue').disabled=true;return window.spoolEnsureCatalog().then(()=>{if(ticket===catalogChoice&&$('#editor').open&&$('#form').elements.namedItem('color').value===expected)catalogOriginalPreset(preset,context)}).catch(error=>toast(error.message)).finally(()=>{if(ticket===catalogChoice){$('#form .dialog-actions .primary').disabled=editorEntryMode==='start';$('#saveAndContinue').disabled=editorEntryMode==='start'}})};
const catalogOriginalGallery=$('#openLibrary').onclick;$('#openLibrary').onclick=()=>{const button=$('#openLibrary'),label=button.textContent;button.disabled=true;button.textContent='商品画像を読み込み中…';return window.spoolEnsureCatalog().then(catalogOriginalGallery).catch(error=>toast(error.message)).finally(()=>{button.disabled=false;button.textContent=label})};
`;
html=html.replace('</body>',()=>'<script>'+lazyCatalog+'</script></body>');
const bridge=`window.spoolBridge={displayAccount:restoreDisplayPreferences,snapshot:()=>structuredClone(currentOfflineState()),apply:state=>{if(!validOfflineState(state))throw Error('ライブラリのデータ形式が不正です');items=state.items;deleted=state.deleted;customColorPresets=state.customColorPresets;reservations=state.reservations;selected.clear();reorderMode=false;render();renderBookings()},valid:validOfflineState,navigate:showBookingView,selected:()=>[...selected],repaint:render,esc};`;
html=html.replace('</body>',()=>'<script>'+bridge+'</script><script type="module" src="./online.js"></script></body>');
const styleVersion=createHash('sha256').update(readFileSync(path.join(root,'online/style.css'))).digest('hex').slice(0,16);
html=html.replace('</head>','<link rel="stylesheet" href="./online.css?v='+styleVersion+'"></head>');
html=html.replace('<p id="appBuild">オフライン版</p>','<p id="appBuild">オンライン版'+(sourceSha?' · '+sourceSha.slice(0,7)+'<br><a href="https://github.com/ecleaire/spool/commit/'+sourceSha+'" target="_blank" rel="noopener noreferrer">ソースを確認 ↗</a>':'')+'</p>');
const out=path.join(root,'online-dist');mkdirSync(out,{recursive:true});
writeFileSync(path.join(out,catalogFile),catalogText);
writeFileSync(path.join(out,'config.json'),JSON.stringify(config));
writeFileSync(path.join(out,'online.css'),readFileSync(path.join(root,'online/style.css')));
writeFileSync(path.join(out,'offline.html'),readFileSync(path.join(root,'dist/index.html')));
await build({entryPoints:[path.join(root,'online/client.mjs')],outfile:path.join(out,'online.js'),bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,define:{__SPOOL_VERSION__:JSON.stringify(version),__SPOOL_BUILD__:JSON.stringify(sourceSha)}});
const digest=code=>'sha256-'+createHash('sha256').update(code).digest('base64');
const bundleHash=digest(readFileSync(path.join(out,'online.js')));
html=html.replace('src="./online.js"','src="./online.js?v='+createHash('sha256').update(bundleHash).digest('hex').slice(0,16)+'" integrity="'+bundleHash+'" crossorigin="anonymous"');
// Smaller executable text while retaining global bindings shared by inline modules.
const scriptMatches=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].filter(x=>!x[1].includes('src=')&&!x[1].includes('application/json'));
for(const match of scriptMatches){const result=await transform(match[2],{loader:'js',target:'es2022',minifyWhitespace:true,minifySyntax:true,minifyIdentifiers:false,charset:'utf8'});html=html.replace(match[0],()=>'<script'+match[1]+'>'+result.code.replace(/<\/script/gi,'<\\/script')+'</script>');}
const styleMatches=[...html.matchAll(/<style>([\s\S]*?)<\/style>/gi)];for(const match of styleMatches){const result=await transform(match[1],{loader:'css',minify:true,charset:'utf8'});html=html.replace(match[0],()=>'<style>'+result.code+'</style>');}
const inlineHashes=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].filter(x=>!x[1].includes('src=')&&!x[1].includes('application/json')).map(x=>digest(x[2].replace(/\r\n?/g,'\n')));
const policy=["default-src 'none'",'script-src '+[...inlineHashes,bundleHash].map(x=>"'"+x+"'").join(' '),"script-src-attr 'none'","style-src 'self' 'unsafe-inline'","img-src 'self' data: blob:","font-src 'self'","connect-src 'self' "+config.url+' '+config.url.replace('https:','wss:'),"object-src 'none'","base-uri 'none'","form-action 'self'","frame-src 'none'","worker-src 'none'"].join('; ');
const charset='<meta charset="UTF-8">';
if(!html.includes(charset))throw Error('Missing character encoding marker');
html=html.replace(charset,charset+'<meta http-equiv="Content-Security-Policy" content="'+policy+'"><meta name="referrer" content="no-referrer">');
writeFileSync(path.join(out,'index.html'),html);
// Hosting uses a supported static output directory; retain the standalone offline app beside it.
const hosted=path.join(root,'out');mkdirSync(hosted,{recursive:true});
const publicFiles=['index.html','online.js','online.css','config.json','offline.html',catalogFile];
if(lstatSync(hosted).isSymbolicLink())throw Error('Public output must be a regular directory');
if(readdirSync(hosted).some(name=>(!publicFiles.includes(name)&&!/^catalog-images-[a-f0-9]{16}\.json$/.test(name))||!lstatSync(path.join(hosted,name)).isFile()))throw Error('Unexpected files in public output; review them before publication');
for(const name of publicFiles)writeFileSync(path.join(hosted,name),readFileSync(path.join(out,name)));
console.log('Built online-dist (separate from offline dist). Public connection config included; no service secrets.');
