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
let resumeReactions, administrator=false, resumeSubmission, failPhoto=false;
const heldSubmission=new Promise(resolve=>{resumeSubmission=resolve});
const slowReaction=new Promise(resolve=>{resumeReactions=resolve});
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname.startsWith('/functions/v1/spool-events/api/')){
      const guest=req.headers.authorization?.startsWith('Bearer guest:');
      if(!guest)assert.equal(req.headers.authorization,'Bearer '+token);
      const route=url.pathname.replace('/functions/v1/spool-events','');seen.push(route);
      if(failPhoto && route.endsWith('/real')){res.writeHead(503).end();return;}
      if(req.method==='POST' && route.endsWith('/reactions'))await slowReaction;
      if(req.method==='POST' && route==='/api/works')await heldSubmission;
      const chunks=[];for await(const chunk of req)chunks.push(chunk);
      const result=await release.fetch(new Request('https://example.invalid'+route,{method:req.method,
        headers:{Authorization:'Bearer '+token,...(req.headers['content-type']?{'Content-Type':req.headers['content-type']}:{})},
        body:chunks.length?Buffer.concat(chunks):undefined}),
        {BUCKET:bucket,EVENT_IDENTITY:{fetch:async()=>Response.json({id:guest?'guest:browser':'mock-user',guest,allowed:true,canManageEvents:!guest&&administrator})}});
      res.writeHead(result.status,Object.fromEntries(result.headers)).end(Buffer.from(await result.arrayBuffer()));return;
    }
    if(!url.pathname.startsWith('/spool/event/')){res.writeHead(404).end();return}
    const file=path.join(output,url.pathname.slice('/spool/'.length));
    res.setHeader('Content-Type',({'html':'text/html; charset=utf-8',js:'application/javascript',css:'text/css',png:'image/png',webp:'image/webp'})[file.split('.').pop()]||'application/octet-stream');
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
  await page.waitForFunction(()=>document.querySelector('#storage-state')?.textContent.includes('サーバーに保存'));
  assert.equal(await page.locator('[data-open-submission]:visible').count(),0);
  for(const [width,dpr,file] of [[360,2,'event-christmas-2026-720.webp'],[390,3,'event-christmas-2026-1200.webp'],[1440,1,'event-christmas-2026.webp']]){
    const device=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:dpr});
    try{
      await device.goto(origin+'/spool/event/index.html');
      await device.waitForFunction(()=>document.querySelector('#storage-state')?.textContent.includes('サーバーに保存'));
      const poster=await device.locator('[data-event-banner]').evaluate(async image=>{
        await image.decode();
        return {url:image.currentSrc,bytes:performance.getEntriesByName(image.currentSrc)[0].encodedBodySize};
      });
      assert.ok(poster.url.endsWith('/'+file));
      assert.equal(poster.bytes,(await readFile(path.join(output,'event/assets',file))).length);
      assert.ok(poster.bytes>0 && poster.bytes<350000);
    }finally{await device.close();}
  }

  assert.equal(await page.getByRole('button',{name:'管理画面',exact:true}).count(),0);
  assert.equal(await page.locator('.prototype-footer span').innerText(),'v'+version);
  assert.equal(await page.locator('#submission[open]').count(),0);
  await page.evaluate(token=>sessionStorage.setItem('spool-auth-127',JSON.stringify({access_token:token,refresh_token:'mock',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:'mock-user'}})),token);
  const works=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/works');
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('.prototype-footer #storage-state')?.textContent.includes('サーバーに保存'));
  await works;
  assert.ok(seen.includes('/api/session'));assert.ok(seen.includes('/api/works'));
  await page.locator('[data-open-submission]:visible').first().click();
  await page.locator('#work-title').waitFor({state:'visible'});
  const desktopSize=page.viewportSize();
  const phones=[[320,568],[360,640],[375,667],[390,844],[412,915],[430,932],[480,854],[568,320],[667,375],[844,390],[932,430]];
  for(const [width,height] of phones){
    await page.setViewportSize({width,height});
    const checklist=page.locator('#submission .dialog-body .entry-checklist');
    await checklist.waitFor({state:'attached'});
    await checklist.evaluate(el=>{el.open=true;});
    const body=await page.locator('#submission .dialog-body').boundingBox();
    const close=await page.locator('#submission .dialog-heading [data-close-submission]').boundingBox();
    const submit=await page.locator('#post-button').boundingBox();
    assert.ok(body.width>=width-2 && body.height>height*0.65);
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
  const upright=triangle.replace('vertex 0 0 0','vertex 260 380 10').replace('vertex 1 0 0','vertex 262 380 10').replace('vertex 0 1 0','vertex 260 380 20');
  await modelInput.setInputFiles({name:'first.stl',mimeType:'application/octet-stream',buffer:Buffer.from(upright)});
  await preview.waitFor({state:'visible'});
  await preview.scrollIntoViewIfNeeded();
  const bounds=await preview.evaluate(image=>new Promise(resolve=>requestAnimationFrame(()=>{
    const canvas=document.createElement('canvas');
    canvas.width=image.width;canvas.height=image.height;
    const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
    const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);
    let left=image.width,right=0,top=image.height,bottom=0;
    const background=4*(Math.floor(image.height/2)*image.width+12);
    for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){
      const i=4*(y*image.width+x);
      if(Math.max(...[0,1,2].map(c=>Math.abs(data[i+c]-data[background+c])))<22)continue;
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
    }
    resolve({left,right,top,bottom,width:image.width,height:image.height});
  })));
  assert.ok(bounds.bottom-bounds.top>bounds.height*0.5 && bounds.bottom-bounds.top>bounds.right-bounds.left,JSON.stringify(bounds));
  assert.ok(bounds.left>0 && bounds.right<bounds.width-1 && bounds.top>0 && bounds.bottom<bounds.height-1,JSON.stringify(bounds));
  await page.locator('[data-clear="model-files"]').click();
  await preview.waitFor({state:'hidden'});
  await modelInput.setInputFiles(['star.STL','second.stl'].map(name=>({name,mimeType:'application/octet-stream',buffer:Buffer.from(triangle)})));
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
  assert.ok(await page.locator('#work-title').isDisabled());
  assert.ok(await page.locator('#submission .dialog-heading [data-close-submission]').isDisabled());
  assert.ok(await page.locator('#entry-fields').evaluate(fields=>fields.inert));
  await page.keyboard.press('Escape');
  assert.ok(await page.locator('#submission').isVisible());
  resumeSubmission();
  const response=await submitted;
  assert.equal(response.status(),201);
  assert.equal((await response.json()).work.model.root,'star.glb');
  assert.equal(prompts.length,5);
  assert.match(prompts[0],/glTF.*GLB/);
  const workId=(await response.json()).work.id;
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
  await page.getByRole('button',{name:'一覧を更新'}).click();
  await page.locator('.work-card').filter({hasText:'星'}).waitFor();
  await page.locator('.work-card').filter({hasText:'STL test'}).click();
  await page.locator('#viewer canvas').waitFor({state:'visible'});
  assert.equal(await page.locator('#work-detail .local-only').isVisible(),false);
  for(const [width,height] of [...phones,[768,1024],[820,1180],[1024,1366],[1366,1024],[1440,900],[320,568]]){
    const viewport={width,height};
    await page.setViewportSize(viewport);
    const layout=await page.locator('#work-detail .dialog-body').evaluate(body=>({
      width:body.clientWidth,contentWidth:body.scrollWidth,height:body.clientHeight,contentHeight:body.scrollHeight,
      viewer:document.querySelector('#viewer').clientHeight
    }));
    if(process.env.SPOOL_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.SPOOL_SCREENSHOT_DIR,'work-detail-'+viewport.width+'.png')});
    console.log('Work detail',viewport,layout);
    assert.ok(layout.contentWidth<=layout.width+1 && layout.viewer>=150);
    if(height>=844 && width>=390)assert.ok(layout.contentHeight<=layout.height+1);
  }
  const title=page.locator('#detail-title'),comment=page.locator('#detail-comment');
  const originalTitle=await title.textContent(),originalComment=await comment.textContent();
  await title.evaluate(el=>el.textContent='冬のオーナメント'.repeat(10));
  await comment.evaluate(el=>el.textContent='雪の結晶の重なりを表現しました。'.repeat(25));
  assert.ok(await title.evaluate(el=>el.scrollHeight<=el.clientHeight+1));
  assert.ok(await page.locator('#work-detail .dialog-body').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  await title.evaluate((el,text)=>el.textContent=text,originalTitle);
  await comment.evaluate((el,text)=>el.textContent=text,originalComment);
  await page.setViewportSize(desktopSize);
  const reads=()=>seen.filter(route=>route.startsWith('/api/files/'+workId+'/model')).length;
  assert.equal(reads(),1);
  await page.locator('#detail-model-select').selectOption('second.glb');
  await page.waitForFunction(()=>!document.querySelector('#reset-view').disabled);
  assert.equal(reads(),2);
  await page.locator('#detail-model-select').selectOption('star.glb');
  await page.waitForFunction(()=>!document.querySelector('#reset-view').disabled);
  assert.equal(reads(),2);
  failPhoto=true;
  await page.locator('[data-media=real]').click();
  const retryPhoto=page.getByRole('button',{name:'画像を再読み込み'});
  await retryPhoto.waitFor({timeout:3000});
  await page.locator('[data-media=image]').click();
  await page.locator('#detail-photo-img').evaluate(image=>image.decode());
  assert.equal(await retryPhoto.isVisible(),false);
  await page.locator('[data-media=real]').click();
  await retryPhoto.waitFor();
  failPhoto=false;
  const attempts=seen.filter(route=>route==='/api/files/'+workId+'/real').length;
  await retryPhoto.click();
  await page.locator('#detail-photo-img').evaluate(image=>image.decode());
  assert.equal(await retryPhoto.isVisible(),false);
  for(const media of ['real','image','real']){
    await page.locator('[data-media='+media+']').click();
    await page.locator('#detail-photo-img').evaluate(image=>image.decode());
    assert.equal(await page.locator('#detail-model-select').isVisible(),false);
  }
  assert.equal(seen.filter(route=>route==='/api/files/'+workId+'/real').length,attempts+1);
  const group=page.locator('#detail-reactions');
  await group.locator('button').first().waitFor();
  const burst=await group.evaluate(node=>{
    const [like,idea]=node.querySelectorAll('button');
    for(const button of [like,idea,like,like,idea,like])button.click();
    return [like.querySelector('.reaction-count').textContent,idea.querySelector('.reaction-count').textContent,like.disabled];
  });
  assert.deepEqual(burst,['3','2',true]);
  await page.locator('#close-detail').click();
  await page.locator('.work-card').filter({hasText:'星'}).click();
  const otherReaction=group.locator('button').first();
  assert.ok(await otherReaction.isEnabled());
  await otherReaction.click();
  assert.equal(await otherReaction.locator('.reaction-count').textContent(),'1');
  resumeReactions();
  await page.waitForFunction(()=>!document.querySelector('#detail-reactions button').disabled);
  for(let attempt=0;attempt<100;attempt++){
    const saved=await documents.get('reactions/'+workId+'.json')?.json();
    if(saved?.counts?.idea===2 && saved.counts.like===3)break;
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  const record=await documents.get('reactions/'+workId+'.json').json();
  assert.deepEqual(record.counts,{like:3,idea:2});
  assert.equal(seen.filter(route=>route==='/api/works/'+workId+'/reactions').length,5);
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
  await page.locator('.work-card').filter({hasText:'STL test'}).click();
  await page.locator('#viewer canvas').waitFor({state:'visible'});
  await page.evaluate(()=>{
    const clock=performance.now.bind(performance);
    let offset=0;
    performance.now=()=>clock()+offset;
    window.advanceViewerTime=ms=>{offset+=ms;};
  });
  const canvas=page.locator('#viewer canvas');
  await page.mouse.move(0,0);
  const still=await canvas.screenshot();
  await page.evaluate(()=>window.advanceViewerTime(9000));
  await page.waitForTimeout(650);
  assert.notDeepEqual(await canvas.screenshot(),still);
  await page.evaluate(()=>{
    window.advanceViewerTime(160000);
    document.querySelector('#viewer').dispatchEvent(new Event('pointermove',{bubbles:true}));
    window.advanceViewerTime(20000);
  });
  await page.waitForTimeout(100);
  assert.ok(await canvas.isVisible());
  await Promise.all([
    page.waitForEvent('load'),
    page.evaluate(()=>window.advanceViewerTime(180000))
  ]);
  assert.equal(new URL(page.url()).hash,'#works');
  await page.locator('#works-heading').waitFor({state:'visible'});
  assert.deepEqual(errors,[]);
  console.log('PASS: signed-out state, existing tab login, scoped API forwarding, gallery, submission dialog, multipart form, image and model reads under /spool/.');
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));await rm(output,{recursive:true,force:true})}
