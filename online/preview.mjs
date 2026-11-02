import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../online-dist/',import.meta.url)),host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||48372);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return}
 let file;try{const url=new URL(req.url,'http://localhost');file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));if(!file.startsWith(root)){res.writeHead(403).end();return}}catch{res.writeHead(400).end();return}
 fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return}res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/html; charset=utf-8');res.end(req.method==='HEAD'?undefined:data)});
}).listen(port,host,()=>console.log('Online development server ready on port '+port));
