import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {modelHelperArchive} from '../tools/model-helper-archive.mjs';
const root=new URL('../tools/file-bridge/',import.meta.url),exe=new URL('SPOOL.FileOpener.exe',root),meta=JSON.parse(readFileSync(new URL('build.json',root)));
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
assert.equal(hash(new URL('ModelOpener.cs',root)),meta.sourceSha256);assert.equal(hash(exe),meta.exeSha256);
const archive=modelHelperArchive();assert.equal(archive.readUInt32LE(0),0x04034b50);assert.equal(archive.readUInt32LE(archive.length-22),0x06054b50);assert.equal(archive.readUInt16LE(archive.length-14),1);assert.ok(archive.includes(readFileSync(exe)));
if(process.platform==='win32'){
 const run=link=>execFileSync(fileURLToPath(exe),['--validate',link],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 for(const extension of ['stl','obj','3mf','amf','step','stp','gcode'])assert.equal(run('spool-open://open/?path='+encodeURIComponent('C:\\Models\\作品.'+extension)),'local|作品.'+extension);
 assert.equal(run('spool-bambu://open/?path='+encodeURIComponent('\\\\server\\prints\\part.3mf')),'local|part.3mf');
 assert.equal(run('spool-open://pick/?name=part.gcode'),'pick|part.gcode');
 const signed='https://mtfmamufpaqpwsuiccoz.supabase.co/storage/v1/object/sign/spool-models/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/model?token=test';
 assert.equal(run('spool-open://open/?url='+encodeURIComponent(signed)+'&name=part.3mf'),'download|part.3mf');
 for(const link of ['spool-open://open/?path='+encodeURIComponent('C:\\x.exe'),'spool-open://open/?path='+encodeURIComponent('C:\\x.3mf:stream'),'spool-open://open/?path='+encodeURIComponent('\\\\?\\C:\\x.3mf'),'spool-open://pick/?name=../part.3mf','spool-open://pick/?name=part.stl&name=x.stl','spool-open://open/?url='+encodeURIComponent(signed.replace('mtfmamufpaqpwsuiccoz.supabase.co','127.0.0.1'))+'&name=part.stl','spool-open://open/?url='+encodeURIComponent(signed.replace('/sign/','/public/'))+'&name=part.stl'])assert.throws(()=>run(link));
}
console.log('PASS: helper archive/source provenance, allowed model extensions, legacy links and rejection of unsafe paths, URLs and duplicate parameters. No installer or slicer was launched.');
