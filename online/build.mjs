import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {build} from 'esbuild';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let html=readFileSync(path.join(root,'dist/index.html'),'utf8');
// The online build has isolated in-memory app state. Offline browser data is never imported implicitly.
const memory=`const EMBEDDED_DATA={items:[],deleted:[],reservations:[],customColorPresets:[]};const storage=(()=>{const data=new Map();return {persistent:false,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)}})();`;
html=html.replace(/<script>\s*\/\/ A downloaded copy[\s\S]*?<\/script>/,()=>'<script>'+memory+'</script>');
if(!html.includes(memory))throw Error('Missing bootstrap marker');
html=html.replace('function queueOfflineSave(){','function queueOfflineSave(){window.spoolOnlineChanged?.();return;');
html=html.replace('restoreFileLink();','/* Online state is loaded only after authenticated membership checks. */');
html=html.replace('<body>','<body class="cloud-locked"><section id="cloud-panel" aria-label="オンラインライブラリ"></section>');
const bridge=`window.spoolBridge={snapshot:()=>structuredClone(currentOfflineState()),apply:state=>{if(!validOfflineState(state))throw Error('ライブラリのデータ形式が不正です');items=state.items;deleted=state.deleted;customColorPresets=state.customColorPresets;reservations=state.reservations;selected.clear();reorderMode=false;render();renderBookings()},valid:validOfflineState,navigate:showBookingView,esc};`;
html=html.replace('</body>',()=>'<script>'+bridge+'</script><script type="module" src="./online.js"></script></body>');
html=html.replace('</head>','<link rel="stylesheet" href="./online.css"></head>');
const out=path.join(root,'online-dist');mkdirSync(out,{recursive:true});
writeFileSync(path.join(out,'index.html'),html);
writeFileSync(path.join(out,'config.json'),readFileSync(path.join(root,'online/config.json')));
writeFileSync(path.join(out,'online.css'),readFileSync(path.join(root,'online/style.css')));
writeFileSync(path.join(out,'offline.html'),readFileSync(path.join(root,'dist/index.html')));
await build({entryPoints:[path.join(root,'online/client.mjs')],outfile:path.join(out,'online.js'),bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true});
// Hosting uses a supported static output directory; retain the standalone offline app beside it.
const hosted=path.join(root,'out');mkdirSync(hosted,{recursive:true});
for(const name of ['index.html','online.js','online.css','config.json','offline.html'])writeFileSync(path.join(hosted,name),readFileSync(path.join(out,name)));
console.log('Built online-dist (separate from offline dist). Public connection config included; no service secrets.');
