import assert from 'node:assert/strict';
import {createOnlineModelFiles} from '../../online/model-files.mjs';
let context={session:{user:{id:'user'}},library:'library-a',epoch:1},signedCalls=0,downloads=0,opened=null,release,releaseBlob,storageError=null;
const filters=[],links=[],timers=[],revoked=[],paths=[];
const chain={select(){return this},eq(key,value){filters.push([key,value]);return this},single(){return new Promise(resolve=>release=resolve)}};
context.client={from:()=>chain,storage:{from:()=>({async createSignedUrl(){signedCalls++;return {data:{signedUrl:'https://example.com/signed?token=test'}}},download(path){paths.push(path);return new Promise(resolve=>releaseBlob=resolve)}})}};
globalThis.document={body:{append(){}},createElement:()=>{const link={click(){downloads++},remove(){}};links.push(link);return link}};globalThis.window={spoolShowModelOpen:file=>opened=file};
const originalTimer=globalThis.setTimeout,originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL;globalThis.setTimeout=(callback,delay)=>{timers.push({callback,delay})};let downloadedBlob;URL.createObjectURL=blob=>{downloadedBlob=blob;return 'blob:test'};URL.revokeObjectURL=url=>revoked.push(url);
try{
const files=createOnlineModelFiles({context:()=>context}),meta={data:{name:'作品 データ（青）.3mf',object_path:'library-a/file/model'}};
let pending=files.open('file');release(meta);await pending;assert.equal(opened.name,meta.data.name);assert.equal(signedCalls,1);assert.ok(filters.some(([key,value])=>key==='library_id'&&value==='library-a'));assert.equal(downloads,0);
pending=files.download('file');release(meta);await Promise.resolve();await Promise.resolve();releaseBlob({data:new Blob(['exact model bytes'])});await pending;assert.equal(downloads,1);assert.equal(links[0].download,meta.data.name);assert.equal(links[0].href,'blob:test');assert.equal(await downloadedBlob.text(),'exact model bytes');assert.equal(signedCalls,1,'Downloads use authenticated storage bytes, not a cross-origin URL filename');assert.equal(paths[0],meta.data.object_path);assert.equal(timers[0].delay,60000);timers[0].callback();assert.deepEqual(revoked,['blob:test']);
pending=files.open('file');context={...context,library:'library-b',epoch:2};release(meta);await assert.rejects(pending,/変わりました/);assert.equal(signedCalls,1);assert.equal(downloads,1);
context={...context,resolveFileLibrary:id=>id==='shared-file'?'canonical-source':context.library};pending=files.open('shared-file');release(meta);await pending;assert.ok(filters.some(([key,value])=>key==='library_id'&&value==='canonical-source'));
pending=files.download('shared-file');release(meta);await Promise.resolve();await Promise.resolve();context={...context,epoch:3};releaseBlob({data:new Blob(['stale'])});await assert.rejects(pending,/変わりました/);assert.equal(downloads,1);
pending=files.download('file');release(meta);await Promise.resolve();await Promise.resolve();releaseBlob({error:Error('Storage denied')});await assert.rejects(pending,/Storage denied/);assert.equal(downloads,1);
console.log('PASS: exact Japanese attachment filenames and bytes, canonical file scope, delayed URL cleanup, stale download cancellation and storage failure.');
}finally{delete globalThis.document;delete globalThis.window;globalThis.setTimeout=originalTimer;URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;}
