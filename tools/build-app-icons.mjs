// Development helper: render the existing SPOOL vector into platform icon sizes.
import fs from 'node:fs';
import {chromium} from '../online/node_modules/playwright-core/index.mjs';
const root=new URL('../public/app-icons/',import.meta.url);fs.mkdirSync(root,{recursive:true});
const original=fs.readFileSync(new URL('../public/favicon.svg',import.meta.url),'utf8');
const symbol=original.match(/<g[\s\S]*<\/g>/)[0];
const full='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#194c3d"/>'+symbol+'</svg>';
const mask='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#194c3d"/><g transform="translate(6.4 6.4) scale(.8)">'+symbol+'</g></svg>';
const targets=[['icon-192.png',192,original],['icon-512.png',512,original],['maskable-192.png',192,mask],['maskable-512.png',512,mask],['apple-touch-icon-180.png',180,full],['apple-touch-icon-167.png',167,full],['apple-touch-icon-152.png',152,full],['tile-150.png',150,full],['tile-310.png',310,full],['favicon-16.png',16,original],['favicon-32.png',32,original],['favicon-48.png',48,original]];
const browser=await chromium.launch({executablePath:process.env.SPOOL_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{const page=await browser.newPage();for(const [name,size,svg] of targets){await page.setViewportSize({width:size,height:size});await page.setContent('<style>html,body{margin:0;background:transparent}svg{display:block;width:100vw;height:100vh}</style>'+svg);await page.screenshot({path:new URL(name,root).pathname,omitBackground:true});}}finally{await browser.close()}
const pngs=[16,32,48].map(n=>fs.readFileSync(new URL('favicon-'+n+'.png',root))),header=Buffer.alloc(6+16*pngs.length);header.writeUInt16LE(1,2);header.writeUInt16LE(pngs.length,4);let offset=header.length;pngs.forEach((png,i)=>{const at=6+16*i;header[at]=[16,32,48][i];header[at+1]=header[at];header.writeUInt16LE(1,at+4);header.writeUInt16LE(32,at+6);header.writeUInt32LE(png.length,at+8);header.writeUInt32LE(offset,at+12);offset+=png.length});fs.writeFileSync(new URL('favicon.ico',root),Buffer.concat([header,...pngs]));
fs.writeFileSync(new URL('safari-pinned-tab.svg',root),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'+symbol.replace('#e4edc9','#000000')+'</svg>');
console.log('Built SPOOL browser, Apple, Android maskable and Windows icons.');
