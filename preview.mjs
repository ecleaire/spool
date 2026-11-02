import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('dist'),host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||48371);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
http.createServer((req,res)=>{let file;try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}}catch{res.writeHead(400).end();return}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return}res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'application/javascript':'text/html; charset=utf-8');res.end(data)})}).listen(port,host,()=>console.log('Local: http://'+host+':'+port));
