// Exercise the distributed UI and its scoped service worker without a live project.
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {chromium} from '../../online/node_modules/playwright-core/index.mjs';
import {buildEvent} from '../../online/event/build.mjs';
import release from '../../supabase/functions/spool-events/release.mjs';

const output=await mkdtemp(path.join(os.tmpdir(),'spool-event-browser-'));
const token='mock.access.token', seen=[], documents=new Map();
const bucket={
  get:async key=>documents.get(key),
  list:async({prefix})=>({objects:[...documents.keys()].filter(key=>key.startsWith(prefix)).map(key=>({key})),truncated:false}),
  async put(key,value,options){
    const record=key.endsWith('.json')?{etag:crypto.randomUUID(),json:async()=>JSON.parse(value)}:
      {body:await new Response(value).blob(),httpMetadata:options.httpMetadata};
    documents.set(key,record);return record;
  }
};
let resumeReactions, administrator=false;
const slowReaction=new Promise(resolve=>{resumeReactions=resolve});
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname.startsWith('/functions/v1/spool-events/api/')){
      const guest=req.headers.authorization?.startsWith('Bearer guest:');
      if(!guest)assert.equal(req.headers.authorization,'Bearer '+token);
      const route=url.pathname.replace('/functions/v1/spool-events','');seen.push(route);
      if(req.method==='POST' && route.endsWith('/reactions'))await slowReaction;
      const chunks=[];for await(const chunk of req)chunks.push(chunk);
      const result=await release.fetch(new Request('https://example.invalid'+route,{method:req.method,
        headers:{Authorization:'Bearer '+token,...(req.headers['content-type']?{'Content-Type':req.headers['content-type']}:{})},
        body:chunks.length?Buffer.concat(chunks):undefined}),
        {BUCKET:bucket,EVENT_IDENTITY:{fetch:async()=>Response.json({id:guest?'guest:browser':'mock-user',guest,allowed:true,canManageEvents:!guest&&administrator})}});
      res.writeHead(result.status,Object.fromEntries(result.headers)).end(Buffer.from(await result.arrayBuffer()));return;
    }
    if(!url.pathname.startsWith('/spool/event/')){res.writeHead(404).end();return}
    const file=path.join(output,url.pathname.slice('/spool/'.length));
    res.setHeader('Content-Type',({'html':'text/html; charset=utf-8',js:'application/javascript',css:'text/css',png:'image/png'})[file.split('.').pop()]||'application/octet-stream');
    res.end(await readFile(file));
  }catch(error){res.writeHead(500).end(String(error))}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
  const {version}=JSON.parse(await readFile(new URL('../../package.json',import.meta.url),'utf8'));
  await buildEvent([output],{url:origin,key:'mock-anon-key'},true,version);
  browser=await chromium.launch({executablePath:process.env.SPOOL_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.goto(origin+'/spool/event/index.html');
  await page.getByRole('button',{name:'ログインして作品を投稿'}).first().waitFor();
  assert.equal(await page.getByRole('button',{name:'管理画面',exact:true}).count(),0);
  assert.equal(await page.locator('.prototype-footer span').innerText(),'v'+version);
  assert.equal(await page.locator('#submission[open]').count(),0);
  await page.evaluate(token=>sessionStorage.setItem('spool-auth-127',JSON.stringify({access_token:token,refresh_token:'mock',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:'mock-user'}})),token);
  const works=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/works');
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('#storage-state')?.textContent.includes('サーバーに保存'));
  await works;
  assert.ok(seen.includes('/api/session'));assert.ok(seen.includes('/api/works'));
  await page.locator('[data-open-submission]:visible').first().click();
  await page.locator('#work-title').waitFor({state:'visible'});
  const desktopSize=page.viewportSize();
  for(const width of [320,390]){
    await page.setViewportSize({width,height:700});
    const checklist=page.locator('#submission .dialog-body .entry-checklist');
    await checklist.waitFor({state:'attached'});
    await checklist.evaluate(el=>{el.open=true;});
    const body=await page.locator('#submission .dialog-body').boundingBox();
    const close=await page.locator('#submission .dialog-heading [data-close-submission]').boundingBox();
    const submit=await page.locator('#post-button').boundingBox();
    assert.ok(body.width>=width-2 && body.height>500);
    assert.ok(submit.y+submit.height<=body.y+1 && close.y+close.height<=body.y+1 && submit.x+submit.width<=close.x && close.x+close.width<=width);
  }
  await page.setViewportSize(desktopSize);
  await page.locator('#submission .dialog-footer .entry-checklist').evaluate(el=>{el.open=false;});
  const triangle='solid star\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid star';
  const png=await page.evaluate(()=>document.createElement('canvas').toDataURL().split(',')[1]);
  for(const id of ['real-photo','model-photo'])await page.locator('#'+id).setInputFiles({name:'photo.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await page.locator('#work-title').fill('STL test');
  await page.locator('#work-comment').fill('triangle');
  const modelInput=page.locator('#model-files');
  const preview=page.locator('#submission-viewer canvas');
  await modelInput.setInputFiles({name:'first.stl',mimeType:'application/octet-stream',buffer:Buffer.from(triangle)});
  await preview.waitFor({state:'visible'});
  await page.locator('[data-clear="model-files"]').click();
  await preview.waitFor({state:'hidden'});
  await page.locator('#model-files').setInputFiles({name:'star.STL',mimeType:'application/octet-stream',buffer:Buffer.from(triangle)});
  await preview.waitFor({state:'visible'});
  const prompts=[], choices=[false,true,false,true,true];
  page.on('dialog',async dialog=>{
    prompts.push(dialog.message());
    if(choices.shift())await dialog.accept();else await dialog.dismiss();
  });
  for(const count of [1,3]){
    await page.locator('#post-button').click();
    assert.equal(prompts.length,count);
    assert.equal(await page.locator('#submission').isVisible(),true);
    assert.equal(await page.locator('#work-title').inputValue(),'STL test');
    assert.equal(documents.size,0);
  }
  const submitted=page.waitForResponse(r=>r.url().endsWith('/api/works')&&r.request().method()==='POST');
  await page.locator('#post-button').click();
  const response=await submitted;
  assert.equal(response.status(),201);
  assert.equal((await response.json()).work.model.root,'star.glb');
  assert.equal(prompts.length,5);
  assert.match(prompts[0],/glTF.*GLB/);
  const workId=(await response.json()).work.id;
  await page.locator('.work-card').filter({hasText:'STL test'}).click();
  const group=page.locator('#detail-reactions');
  await group.locator('button').first().waitFor();
  const burst=await group.evaluate(node=>{
    const [like,idea]=node.querySelectorAll('button');
    for(const button of [like,idea,like,like,idea,like])button.click();
    return [like.querySelector('.reaction-count').textContent,idea.querySelector('.reaction-count').textContent,like.disabled];
  });
  assert.deepEqual(burst,['3','2',true]);
  resumeReactions();
  await page.waitForFunction(()=>!document.querySelector('#detail-reactions button').disabled);
  const record=await documents.get('reactions/'+workId+'.json').json();
  assert.deepEqual(record.counts,{like:3,idea:2});
  assert.equal(seen.filter(route=>route==='/api/works/'+workId+'/reactions').length,5);
  const uploaded=await page.evaluate(async()=>{
    const form=new FormData(), filename='star.gltf';
    form.set('metadata',JSON.stringify({title:'星',author:'',comment:'飾り',root:filename,files:[filename]}));
    const photo=await new Promise(resolve=>document.createElement('canvas').toBlob(resolve));
    for(const key of ['real','image']) form.set(key,photo,key+'.png');
    form.set('model-0',new Blob(['{"asset":{"version":"2.0"}}']),filename);
    const response=await new Promise((resolve,reject)=>{
      const xhr=new XMLHttpRequest();xhr.open('POST','/api/works');xhr.responseType='json';
      xhr.onload=()=>xhr.status===201?resolve(xhr.response):reject(Error('Upload '+xhr.status));xhr.onerror=()=>reject(Error('Upload failed'));xhr.send(form);
    });
    const image=new Image();image.src='/api/files/'+response.work.id+'/image';
    await image.decode();
    const manifest=await (await fetch('/api/works/'+response.work.id+'/model')).json();
    const model=await (await fetch(manifest.files[0].url)).json();
    return {imageWidth:image.naturalWidth,modelVersion:model.asset.version};
  });
  assert.ok(uploaded.imageWidth>0);assert.equal(uploaded.modelVersion,'2.0');
  await page.locator('#close-detail').click();
  const manage=page.getByRole('button',{name:'管理画面',exact:true});
  assert.equal(await manage.count(),0);
  assert.ok(await page.locator('#admin-panel').evaluate(panel=>panel.inert && !panel.open));
  administrator=true;
  await page.getByRole('button',{name:'一覧を更新'}).click();
  await manage.click();
  await page.locator('#admin-panel[open]').waitFor();
  await page.locator('#admin-close').click();
  administrator=false;
  await page.getByRole('button',{name:'一覧を更新'}).click();
  await page.waitForFunction(()=>document.querySelector('#admin-panel')?.inert&&!document.querySelector('#admin-panel')?.open);
  assert.equal(await manage.count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS: signed-out state, existing tab login, scoped API forwarding, gallery, submission dialog, multipart form, image and model reads under /spool/.');
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));await rm(output,{recursive:true,force:true})}
