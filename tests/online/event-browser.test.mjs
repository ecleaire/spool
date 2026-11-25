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
  get:async key=>documents.get(key),list:async()=>({objects:[],truncated:false}),
  put:async(key,value)=>{const record={etag:crypto.randomUUID(),json:async()=>JSON.parse(value)};documents.set(key,record);return record}
};
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname.startsWith('/functions/v1/spool-events/api/')){
      assert.equal(req.headers.authorization,'Bearer '+token);
      const route=url.pathname.replace('/functions/v1/spool-events','');seen.push(route);
      const result=await release.fetch(new Request('https://example.invalid'+route,{headers:{Authorization:'Bearer '+token}}),
        {BUCKET:bucket,EVENT_IDENTITY:{fetch:async()=>Response.json({id:'mock-user',allowed:true,canManageEvents:false})}});
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
  await buildEvent([output],{url:origin,key:'mock-anon-key'});
  browser=await chromium.launch({executablePath:process.env.SPOOL_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.goto(origin+'/spool/event/index.html');
  await page.getByText('SPOOLにログインしてからイベントを開いてください。').waitFor();
  assert.equal(seen.length,0);
  await page.evaluate(token=>sessionStorage.setItem('spool-auth-127',JSON.stringify({access_token:token,refresh_token:'mock',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:'mock-user'}})),token);
  const works=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/works');
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('#storage-state')?.textContent.includes('サーバーに保存'));
  await works;
  assert.ok(seen.includes('/api/session'));assert.ok(seen.includes('/api/works'));
  await page.locator('[data-open-submission]:visible').first().click();
  await page.locator('#work-title').waitFor({state:'visible'});
  assert.deepEqual(errors,[]);
  console.log('PASS: signed-out state, existing tab login, scoped API forwarding, gallery and submission dialog under /spool/.');
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));await rm(output,{recursive:true,force:true})}
