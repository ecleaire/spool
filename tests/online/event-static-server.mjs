import {readFileSync} from 'node:fs';
// Serve the real nested Pages build when the workspace navigation leaves index.html.
export function serveEvent(req,res){
  const path=new URL(req.url,'http://localhost').pathname;
  if(!path.startsWith('/spool/event/'))return false;
  const file=path.slice('/spool/event/'.length);
  if(!/^(?:assets\/)?[\w.-]+\.(?:html|js|png|webp|css)$/.test(file)){res.writeHead(404).end();return true}
  const type={html:'text/html;charset=utf-8',js:'application/javascript',png:'image/png',webp:'image/webp',css:'text/css'};
  try{res.setHeader('Content-Type',type[file.split('.').pop()]);res.end(readFileSync(new URL('../../online-dist/event/'+file,import.meta.url)))}
  catch{res.writeHead(404).end()}
  return true;
}
