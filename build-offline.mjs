import {modelHelperArchive} from './tools/model-helper-archive.mjs';
import fs from 'node:fs';
import path from 'node:path';
const root=fs.realpathSync(process.cwd()),publicDir=path.join(root,'public'),output=path.join(root,'dist');
const inlineJs=name=>'<script>\n'+fs.readFileSync(path.join(publicDir,name),'utf8').replace('MODEL_HELPER_DOWNLOAD_PLACEHOLDER',JSON.stringify('data:application/zip;base64,'+modelHelperArchive().toString('base64'))).replace(/<\/script/gi,'<\\/script')+'\n</script>';
let html=fs.readFileSync(path.join(publicDir,'inventory.html'),'utf8');
html=html.replace('EVENT_BANNER_PLACEHOLDER','data:image/png;base64,'+fs.readFileSync(path.join(publicDir,'event-christmas-2026.png')).toString('base64'));
const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
if(!/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i.test(version))throw Error('Invalid release version');
html=html.replace(/(<summary id="appVersion">)[^<]*(<\/summary>)/,'$1v'+version+'$2');
html=html.replace('<link rel="stylesheet" href="style.css">',()=>'<style>\n'+fs.readFileSync(path.join(publicDir,'style.css'),'utf8')+'\n</style>');
html=html.replace('<link rel="stylesheet" href="polish.css">',()=>'<style>\n'+fs.readFileSync(path.join(publicDir,'polish.css'),'utf8')+'\n</style>');
html=html.replace('<link rel="stylesheet" href="workspace.css">',()=>'<style>\n'+fs.readFileSync(path.join(publicDir,'workspace.css'),'utf8')+'\n</style>');
html=html.replace('<link rel="stylesheet" href="studio.css">',()=>'<style>\n'+fs.readFileSync(path.join(publicDir,'studio.css'),'utf8')+'\n</style>');
for(const name of ['bootstrap.js','color-presets.js','elegoo-library.js','bambu-library.js','app.js','model-files.js','print-metadata.js','booking-drafts.js','reservations.js','offline.js','forms.js','print-import.js','filament-usage.js','events.js','booking-experience.js']){
 const marker='<script src="'+name+'"></script>';
 if(!html.includes(marker))throw Error('Missing script '+name);
 html=html.replace(marker,()=>inlineJs(name));
}
if(/<script\b[^>]*\bsrc=|<link\b[^>]*rel="stylesheet"|@import|fonts\.googleapis/i.test(html))throw Error('External runtime dependency detected');
// The old generated build is disposable; the authored source lives in public/.
if(path.dirname(output)!==root||path.basename(output)!=='dist')throw Error('Unsafe output path');
if(fs.existsSync(output)){
 if(fs.lstatSync(output).isSymbolicLink()||fs.realpathSync(output)!==output)throw Error('Unsafe output directory');
 fs.rmSync(output,{recursive:true});
}
fs.mkdirSync(output);fs.writeFileSync(path.join(output,'index.html'),html);
const delivery=path.resolve(root,'..','deliverables');fs.mkdirSync(delivery,{recursive:true});fs.writeFileSync(path.join(delivery,'SPOOL-offline.html'),html);fs.writeFileSync(path.join(delivery,'SPOOL-file-helper.zip'),modelHelperArchive());
console.log('Built standalone offline HTML: '+Buffer.byteLength(html)+' bytes. No network dependencies.');
