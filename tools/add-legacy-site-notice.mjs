import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const start='<!-- SPOOL_LEGACY_NOTICE_START -->',end='<!-- SPOOL_LEGACY_NOTICE_END -->';
export function addLegacySiteNotice(html){
 const clean=html.replace(/<!-- SPOOL_LEGACY_NOTICE_START -->[\s\S]*?<!-- SPOOL_LEGACY_NOTICE_END -->\n?/g,'');
 const headEnd=clean.search(/<\/head\s*>/i);if(headEnd<0)throw Error('HTML head is missing');
 const body=/<body\b[^>]*>/i.exec(clean.slice(headEnd));if(!body)throw Error('HTML body is missing');
 const offset=headEnd+body.index+body[0].length;
 const notice=`${start}
<style>
#spool-legacy-site-notice{box-sizing:border-box;display:flex;flex-wrap:wrap;align-items:center;gap:14px 24px;padding:18px max(16px,calc((100vw - 1400px)/2));margin:0;border:0;border-bottom:3px solid #ad730c;background:#fff3d2;color:#3e3014;font-family:system-ui,sans-serif;line-height:1.7;text-align:left;position:relative;z-index:60}
#spool-legacy-site-notice .legacy-site-copy{flex:1 1 380px;min-width:0}
#spool-legacy-site-notice h2{font-size:20px;font-weight:750;line-height:1.4;margin:0 0 6px;color:#3e3014}
#spool-legacy-site-notice p{font-size:16px;line-height:1.7;margin:0;color:#3e3014}
#spool-legacy-site-notice a{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 18px;border:1px solid #174e40;border-radius:8px;background:#174e40;color:#fff;font-size:16px;font-weight:700;line-height:1.5;text-decoration:none}
#spool-legacy-site-notice a:focus-visible{outline:3px solid #694300;outline-offset:3px}
@media(max-width:600px){#spool-legacy-site-notice{padding:16px;gap:14px}#spool-legacy-site-notice a{width:100%}}
</style>
<section id="spool-legacy-site-notice" role="region" aria-labelledby="spool-legacy-site-title">
<div class="legacy-site-copy"><h2 id="spool-legacy-site-title">こちらは旧サイトです</h2><p>SPOOLの公開先はGitHub Pagesに移行しました。新機能・更新は最新版をご利用ください。</p></div>
<a href="https://ecleaire.github.io/spool/" aria-label="SPOOL最新版を開く（GitHub Pages）">SPOOL最新版を開く ↗</a>
</section>
${end}
`;
 return clean.slice(0,offset)+notice+clean.slice(offset);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: node tools/add-legacy-site-notice.mjs input.html output.html');
 const original=readFileSync(input,'utf8');writeFileSync(output,addLegacySiteNotice(original));console.log('Added old-site notice: '+output);
}
