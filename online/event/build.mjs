import {readFileSync,writeFileSync,mkdirSync,readdirSync,lstatSync,existsSync} from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';

const source=new URL('./release/',import.meta.url);
const assets=['three-LICENSE.txt','app.js','prototype.css','assets/style.css','assets/studio.css','assets/event-christmas-2026.png'];
function checkDirectory(dir,allowed){
  if(!existsSync(dir))return;
  if(!lstatSync(dir).isDirectory())throw Error('Unexpected event output '+dir);
  for(const entry of readdirSync(dir)){
    const file=path.join(dir,entry);
    if(allowed.includes(entry)&&lstatSync(file).isFile())continue;
    const children=allowed.filter(name=>name.startsWith(entry+'/')).map(name=>name.slice(entry.length+1));
    if(!children.length)throw Error('Unexpected event output '+file);
    checkDirectory(file,children);
  }
}
export async function buildEvent(outputs,config){
  const boot=await build({entryPoints:[new URL('./bootstrap.mjs',import.meta.url).pathname],external:['./app.js'],bundle:true,format:'esm',minify:true,write:false,define:{__EVENT_CONFIG__:JSON.stringify(config)}});
  const worker=readFileSync(new URL('./event-worker.js',import.meta.url),'utf8').replace('__EVENT_CONFIG__',JSON.stringify(config));
  const policy="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' "+config.url+" blob: data:; worker-src 'self' blob:; form-action 'none'; base-uri 'none'; object-src 'none'";
  const html=readFileSync(new URL('index.html',source),'utf8')
    .replace('<meta charset="utf-8">','<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="'+policy+'">')
    .replace('href="#" class="prototype-brand" aria-label="イベントトップ"','href="../" class="prototype-brand" aria-label="SPOOLに戻る"')
    .replace(/class="(test-badge|test-notice|local-data)"/g,'hidden class="$1"')
    .replace('src="app.js"','src="bootstrap.js"')
    .replace('<a class="skip"','<div id="event-loading" role="status"><span>イベントを読み込んでいます…</span> <a href="../">SPOOLに戻る</a></div><div id="event-content" hidden><a class="skip"')
    .replace('</body>','</div></body>');
  for(const parent of outputs){
    const dir=path.join(parent,'event');
    checkDirectory(dir,[...assets,'index.html','bootstrap.js','event-worker.js']);
    mkdirSync(path.join(dir,'assets'),{recursive:true});
    for(const asset of assets)writeFileSync(path.join(dir,asset),readFileSync(new URL(asset,source)));
    writeFileSync(path.join(dir,'index.html'),html);
    writeFileSync(path.join(dir,'event-worker.js'),worker);
    writeFileSync(path.join(dir,'bootstrap.js'),boot.outputFiles[0].contents);
  }
}
