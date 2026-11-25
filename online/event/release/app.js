import {createReactionQueue} from './reaction-queue.js';
import {normalizeStlFiles,confirmStl} from './stl.js';
var Ie={mode:"local",canManage:!1,reactions:null};async function Ge(i,e={}){let t=await fetch("/api"+i,{credentials:"same-origin",...e,headers:{...e.body&&!(e.body instanceof FormData)?{"Content-Type":"application/json"}:{},...e.headers}}),n=await t.json().catch(()=>({error:"\u30B5\u30FC\u30D0\u30FC\u306E\u5FDC\u7B54\u3092\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002"}));if(!t.ok){let s=Error(n.error||"\u51E6\u7406\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002");throw s.status=t.status,s.data=n,s}return n}async function nd(){if(location.pathname.endsWith("/preview.html"))return Ie;let i=await fetch("/api/session",{credentials:"same-origin"});if(i.status===404){if(document.body.dataset.environment==="production")throw Error("\u5171\u6709API\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093\u3002\u7BA1\u7406\u8005\u306B\u9023\u7D61\u3057\u3066\u304F\u3060\u3055\u3044\u3002");return Ie}let e=await i.json();if(!i.ok)throw Error(e.error||"\u5171\u6709\u4FDD\u5B58\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093\u3002");return Ie=e,Ie}async function id(){let i=await Ge("/works");return Ie.demoVersions=i.demoVersions||{},Ie.hiddenDemos=i.hiddenDemos,Ie.removedDemos=i.removedDemos||[],i.works.map(e=>({...e,shared:!0,realPhoto:new Blob([]),modelPhoto:new Blob([]),realPhotoURL:"/api/files/"+e.id+"/real?v="+(e.version||1),modelPhotoURL:"/api/files/"+e.id+"/image?v="+(e.version||1)}))}async function loadGalleryFile(file) {
  if (file.blob) return;
  file.pending ??= fetch(file.url, {credentials:"same-origin"}).then(async response => {
    if (!response.ok) throw Error("モデルを取得できません。もう一度お試しください。");
    file.blob = await response.blob();
  }).finally(() => { delete file.pending; });
  await file.pending;
}
async function galleryModel(work) {
  if (work.model.files?.length) return work.model;
  const manifest = await Ge("/works/" + work.id + "/model");
  return {...manifest, remoteFiles:true};
}
async function pl(i){if(i.model.files?.length)return i.model;let e=await Ge("/works/"+i.id+"/model"),t=await Promise.all(e.files.map(async n=>{let s=await fetch(n.url,{credentials:"same-origin"});if(!s.ok)throw Error("\u30E2\u30C7\u30EB\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3002");return{name:n.name,blob:await s.blob()}}));return{root:e.root,files:t,total:t.reduce((n,s)=>n+s.blob.size,0)}}var Va=null;function sd(){Va?.abort()}function Sm(i,e,t,n){return new Promise((s,r)=>{let a=new XMLHttpRequest;a.open(e,"/api"+i),a.withCredentials=!0,a.upload.onprogress=l=>{l.lengthComputable&&(window.dispatchEvent(new CustomEvent("uploadprogress",{detail:Math.round(l.loaded/l.total*100)})),l.loaded===l.total&&window.dispatchEvent(new Event("uploadcommitting")))};let o=()=>a.abort();n.addEventListener("abort",o,{once:!0});let c=()=>n.removeEventListener("abort",o);if(a.onload=()=>{c();let l;try{l=JSON.parse(a.responseText)}catch{r(Error("\u30B5\u30FC\u30D0\u30FC\u306E\u5FDC\u7B54\u3092\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093\u3002"));return}if(a.status>=200&&a.status<300)s(l);else{let h=Error(l.error||"\u4FDD\u5B58\u3067\u304D\u307E\u305B\u3093\u3002");h.status=a.status,r(h)}},a.onerror=()=>{c(),r(Error("\u901A\u4FE1\u304C\u9014\u5207\u308C\u307E\u3057\u305F\u3002\u5165\u529B\u3092\u4FDD\u6301\u3057\u3066\u3044\u307E\u3059\u3002\u518D\u8A66\u884C\u3067\u304D\u307E\u3059\u3002"))},a.onabort=()=>{c(),r(new DOMException("\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u3092\u4E2D\u65AD\u3057\u307E\u3057\u305F\u3002\u5165\u529B\u3092\u4FDD\u6301\u3057\u3066\u3044\u307E\u3059\u3002","AbortError"))},n.aborted){c(),r(new DOMException("\u4E2D\u65AD\u3057\u307E\u3057\u305F\u3002","AbortError"));return}a.send(t)})}async function ml(i,e=!1){let t=new AbortController;Va=t,window.dispatchEvent(new Event("uploadstart"));try{return await Mm(i,e,t.signal)}finally{Va===t&&(Va=null)}}async function Mm(i,e,t){let n={id:i.id,version:i.version,title:i.title,comment:i.comment,author:i.author,backgroundColor:i.backgroundColor,modelView:i.modelView,root:i.model.root,files:i.model.files.map(o=>o.name)},s=[{key:"real",blob:i.realPhoto},{key:"image",blob:i.modelPhoto},...i.model.files.map((o,c)=>({key:"model-"+c,blob:o.blob}))],r=e?"/works/"+i.id:"/works";if(s.reduce((o,c)=>o+c.blob.size,0)<=8*1024*1024){let o=new FormData;o.set("metadata",JSON.stringify(n));for(let c of s)o.set(c.key,c.blob,c.key);return Sm(r,e?"PUT":"POST",o,t)}let a=await Ge("/uploads",{method:"POST",signal:t,body:JSON.stringify({files:s.map(o=>({key:o.key,size:o.blob.size,type:o.blob.type||"application/octet-stream"}))})});try{let o={},c=0,l=s.reduce((h,u)=>h+u.blob.size,0);for(let h of s){o[h.key]=[];for(let u=0,d=1;u<h.blob.size;u+=a.partSize,d++){let f=h.blob.slice(u,u+a.partSize),g;for(let x=0;x<3;x++)try{g=await Ge("/uploads/"+a.id+"/parts/"+h.key+"/"+d,{method:"PUT",signal:t,body:f,headers:{"Content-Type":"application/octet-stream"}});break}catch(m){if(m.name==="AbortError"||m.status&&m.status<500||x===2)throw m;window.dispatchEvent(new CustomEvent("uploadretry",{detail:x+1})),await new Promise(p=>setTimeout(p,300*(x+1)))}o[h.key].push(g),c+=f.size,window.dispatchEvent(new CustomEvent("uploadprogress",{detail:Math.round(c/l*100)}))}}return t.throwIfAborted(),await Ge("/uploads/"+a.id+"/finish",{method:"POST",signal:t,body:JSON.stringify({parts:o})}),window.dispatchEvent(new Event("uploadcommitting")),await Ge(r,{method:e?"PUT":"POST",body:JSON.stringify({metadata:n,uploadId:a.id})})}catch(o){throw await Ge("/uploads/"+a.id,{method:"DELETE"}).catch(()=>{}),o}}var wm={clean:"\u5909\u66F4\u306A\u3057",editing:"\u7DE8\u96C6\u4E2D\u30FB\u672A\u53CD\u6620",draft:"\u4E0B\u66F8\u304D\u4FDD\u5B58\u6E08\u307F\u30FB\u672A\u53CD\u6620",saving:"\u4FDD\u5B58\u4E2D\u2026",applied:"\u53CD\u6620\u6E08\u307F",error:"\u4FDD\u5B58\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F"};function ut(i,e,t){i.dataset.editPhase=e;for(let n of document.querySelectorAll('[data-edit-state-for="'+i.id+'"]'))n.dataset.phase=e,n.textContent=t||wm[e]||e;i.dispatchEvent(new CustomEvent("editstate",{detail:{phase:e}}))}var Ha=i=>i.map(({id:e,icon:t,label:n,enabled:s})=>({id:e,icon:t.trim(),label:n.trim(),enabled:!!s})),Ga=(i,e)=>JSON.stringify(i)===JSON.stringify(e);function rd({form:i,rows:e,renderRow:t,onSaved:n}){let s="",r=[],a=null,o=!1,c,l=null,h=!1,u=!1,d=!1,f=!1,g=!1,x=0,m=i.querySelector("#reaction-settings-error"),p=document.querySelector("#reaction-undo"),M=document.querySelector("#reaction-retry"),v=document.querySelector("#reaction-reload"),w=()=>Ha([...e.children].map(L=>({id:L.dataset.id,icon:L.querySelector(".config-icon").value,label:L.querySelector(".config-name").value,enabled:L.querySelector(".config-enabled").checked}))),I=()=>{for(let L of i.querySelectorAll(".config-icon,.config-name"))L.setCustomValidity(L.value.trim()?"":"\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002");return i.checkValidity()&&w().every(L=>L.icon&&L.label)};function E(){p.disabled=u||!h||!a||o||!!l,M.hidden=!o||!m.textContent,M.disabled=u||!!l||d,v.hidden=h&&!d,v.disabled=u||!!l}function P(){if(h){if(o=d||f||!Ga(w(),r),clearTimeout(c),x=Date.now()+1e3,!o){l||ut(i,"applied"),E();return}if(ut(i,"editing"),d){ut(i,"error","\u4ED6\u306E\u753B\u9762\u3067\u5909\u66F4\u3055\u308C\u3066\u3044\u307E\u3059"),E();return}if(!I()){m.textContent="\u30A2\u30A4\u30B3\u30F3\u3068\u8868\u793A\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",E();return}d||(m.textContent="",g||(c=setTimeout(()=>S(),1e3))),E()}}function O(L,k,z,G){s=L.revision,r=Ha(L.types),a=G?null:structuredClone(z),d=!1,f=!1,n(L),o=!Ga(w(),r),o?ut(i,"editing"):(m.textContent="",ut(i,"applied"))}async function S(L=!1){if(clearTimeout(c),l)return l;if(!h)return!o;if(!o)return!0;if(g)return!1;if(!I())return m.textContent="\u30A2\u30A4\u30B3\u30F3\u3068\u8868\u793A\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",ut(i,"editing"),E(),!1;if(d)return!1;let k=w(),z=structuredClone(r);return ut(i,"saving"),m.textContent="",l=(async()=>{try{let G=await Ge("/settings/reactions",{method:"PUT",body:JSON.stringify({types:k,revision:s}),keepalive:!0});return O(G,k,z,L),!0}catch(G){if(G.status===409){try{let X=(await Ge("/session")).reactions;if(Ga(Ha(X.types),k))return O(X,k,z,L),!0}catch{}d=!0,m.textContent="\u5225\u306E\u753B\u9762\u3067\u8A2D\u5B9A\u304C\u5909\u66F4\u3055\u308C\u307E\u3057\u305F\u3002\u5165\u529B\u306F\u4FDD\u6301\u3057\u3066\u3044\u307E\u3059\u3002\u300C\u6700\u65B0\u306E\u8A2D\u5B9A\u3092\u8AAD\u307F\u8FBC\u3080\u300D\u3067\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002"}else f=!0,m.textContent=G.message||"\u4FDD\u5B58\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u518D\u8A66\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002";return o=!0,ut(i,"error"),!1}finally{l=null,E(),o&&!m.textContent&&!g&&(c=setTimeout(()=>S(),Math.max(0,x-Date.now())))}})(),E(),l}async function y(){for(clearTimeout(c);l||o;){if(l){if(!await l)return!1;continue}if(!I())return m.textContent="\u30A2\u30A4\u30B3\u30F3\u3068\u8868\u793A\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",i.reportValidity(),E(),!1;if(!await S())return!1}return!0}i.addEventListener("input",P),i.addEventListener("change",P),i.addEventListener("compositionstart",()=>{g=!0,clearTimeout(c)}),i.addEventListener("compositionend",()=>{g=!1,P()}),i.addEventListener("submit",L=>{L.preventDefault(),y()}),M.addEventListener("click",()=>S()),p.addEventListener("click",async()=>{if(!a||o||l)return;let L=structuredClone(a);e.replaceChildren(...L.map(t)),o=!Ga(L,r),x=Date.now(),await S(!0)}),v.addEventListener("click",async()=>{if(!(o&&!confirm("\u5165\u529B\u4E2D\u306E\u5909\u66F4\u3092\u7F6E\u304D\u63DB\u3048\u3066\u3001\u6700\u65B0\u306E\u8A2D\u5B9A\u3092\u8AAD\u307F\u8FBC\u307F\u307E\u3059\u304B\uFF1F"))){v.disabled=!0,u=!0,i.inert=!0;try{let L=(await Ge("/session")).reactions;R(L),n(L)}catch(L){h=!1,m.textContent=L.message,ut(i,"error")}finally{u=!1,E()}}}),window.addEventListener("beforeunload",L=>{(o||l)&&(L.preventDefault(),L.returnValue="")}),document.addEventListener("visibilitychange",()=>{document.hidden&&o&&!d&&!g&&S()});function R(L){i.inert=!1,clearTimeout(c),s=L.revision,r=Ha(L.types),e.replaceChildren(...r.map(t)),o=!1,a=null,d=!1,f=!1,h=!0,m.textContent="",ut(i,"clean"),E()}return{load:R,flush:y,beginLoad(){u=!0,ut(i,"saving","\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026"),E()},endLoad(L=!0){u=!1,L||(h=!1,i.inert=!0,m.textContent="\u8A2D\u5B9A\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u300C\u6700\u65B0\u306E\u8A2D\u5B9A\u3092\u8AAD\u307F\u8FBC\u3080\u300D\u3067\u518D\u8A66\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002",ut(i,"error")),E()},get pending(){return o||!!l}}}function ad(i,{editing:e,files:t,viewer:n}){let s=document.createElement("details");s.id="entry-checklist",s.className="entry-checklist",s.open=!1;let r=document.createElement("summary"),a=document.createElement("ul");r.textContent="\u6295\u7A3F\u524D\u30C1\u30A7\u30C3\u30AF",s.append(r,a),i.querySelector(".dialog-footer").prepend(s);
const compactForm = matchMedia("(max-width: 640px), (max-width: 960px) and (max-height: 500px)");
const footer = i.querySelector(".dialog-footer");
const editStatus = footer.querySelector(".edit-state");
const postButton = i.querySelector("#post-button");
const closeButton = i.querySelector(".dialog-heading [data-close-submission]");
function positionSubmissionFeedback() {
  const drafts=i.querySelector(".draft-tools");
  if (compactForm.matches) {
    if (drafts) i.querySelector(".dialog-body").prepend(drafts);
    closeButton.before(postButton);
    i.querySelector(".dialog-body").append(s, editStatus);
  } else {
    if (drafts) i.prepend(drafts);
    footer.prepend(s);
    footer.append(editStatus, postButton);
  }
}
positionSubmissionFeedback();
compactForm.addEventListener("change", positionSubmissionFeedback);
let o=!1;function c(){o||(o=!0,queueMicrotask(()=>{o=!1;let l=e(),h=[];try{h=t()}catch{}let u=h.reduce((m,p)=>m+(p.blob||p).size,0),d=["real-photo","model-photo"].map((m,p)=>{let M=document.getElementById(m).files[0]||(p===0?l?.realPhoto:l?.modelPhoto);return!!M&&/^(image\/png|image\/jpeg|image\/webp)$/.test(M.type)&&M.size>0&&M.size<=10*1024*1024}),f=h.some(m=>/\.(gltf|glb|stl)$/i.test(m.name)),g=f&&u>0&&h.length<=20&&u<=500*1024*1024,x=[{text:"\u4F5C\u54C1\u540D\u30FB\u4F5C\u54C1\u3078\u306E\u4E00\u8A00",ok:!!i.elements.title.value.trim()&&!!i.elements.comment.value.trim(),target:i.elements.title.value.trim()?"work-comment":"work-title"},{text:"\u753B\u50CF2\u679A\u306E\u5F62\u5F0F\u30FB\u5BB9\u91CF",ok:d.every(Boolean),target:d[0]?"model-photo":"real-photo"},{text:"\u30E2\u30C7\u30EB\u306E\u9078\u629E\u30FB\u5BB9\u91CF",ok:g,target:"model-files"},{text:"3D\u8868\u793A\u306E\u78BA\u8A8D",action:"3D\u30D7\u30EC\u30D3\u30E5\u30FC\u3092\u958B\u304F",ok:!!n(),target:"preview-model"}];r.textContent="\u6295\u7A3F\u524D\u30C1\u30A7\u30C3\u30AF "+x.filter(m=>m.ok).length+"/"+x.length,a.replaceChildren(...x.map(m=>{let p=document.createElement("li"),M=document.createElement("button");return M.type="button",M.textContent=(m.ok?"\u2713 ":"\u25CB ")+(m.ok?m.text:m.action||m.text+"\u3092\u78BA\u8A8D"),M.dataset.ready=String(m.ok),M.addEventListener("click",()=>{let v=document.getElementById(m.target);for(let w=v.parentElement;w;w=w.parentElement)w.tagName==="DETAILS"&&(w.open=!0);v.scrollIntoView({block:"center",behavior:"smooth"}),v.focus({preventScroll:!0}),m.target==="preview-model"&&!v.disabled&&v.click()}),p.append(M),p})),s.dataset.ready=String(x.every(m=>m.ok))}))}for(let l of["input","change","draftchange","draftrestored"])i.addEventListener(l,c);return i.addEventListener("invalid",()=>{s.open=!0,c()},!0),c(),{update:c}}var pn=null,od=new WeakSet;function gl(i){let e=i.closest("form");e?.dispatchEvent(new Event("input",{bubbles:!0})),e?.dispatchEvent(new Event("draftchange"))}function Wa(i,e){i.dataset.reorderItem="";let t=document.createElement("button");return t.type="button",t.className="reorder-handle",t.textContent="\u283F",t.draggable=!0,t.setAttribute("aria-label",e+"\u3092\u30C9\u30E9\u30C3\u30B0\u3057\u3066\u4E26\u3079\u66FF\u3048\u3002\u4E0A\u4E0B\u30AD\u30FC\u3067\u3082\u79FB\u52D5\u3067\u304D\u307E\u3059"),t.title="\u30C9\u30E9\u30C3\u30B0\u3067\u4E26\u3079\u66FF\u3048\uFF08\u4E0A\u4E0B\u30AD\u30FC\u3067\u3082\u79FB\u52D5\uFF09",t.addEventListener("click",n=>{n.preventDefault(),n.stopPropagation()}),t.addEventListener("keydown",n=>{if(!["ArrowUp","ArrowDown"].includes(n.key))return;n.preventDefault(),n.stopPropagation();let s=n.key==="ArrowUp"?i.previousElementSibling:i.nextElementSibling;s&&(n.key==="ArrowUp"?i.parentNode.insertBefore(i,s):i.parentNode.insertBefore(s,i),t.focus(),gl(i))}),t.addEventListener("dragstart",n=>{pn={row:i,parent:i.parentElement,order:[...i.parentElement.children]},i.classList.add("is-reordering"),n.dataTransfer.effectAllowed="move",n.dataTransfer.setData("text/plain","spool-reorder"),n.dataTransfer.setDragImage(i,16,16);let s=i.parentElement;od.has(s)||(od.add(s),s.addEventListener("dragover",r=>{if(!pn||pn.parent!==s)return;r.preventDefault(),r.dataTransfer.dropEffect="move";let a=r.target.closest("[data-reorder-item]");if(!a||a===pn.row||a.parentElement!==s)return;let o=a.getBoundingClientRect();s.insertBefore(pn.row,r.clientY<o.top+o.height/2?a:a.nextSibling)}),s.addEventListener("drop",r=>{!pn||pn.parent!==s||(r.preventDefault(),pn.dropped=!0,gl(pn.row))}))}),t.addEventListener("dragend",()=>{if(!pn)return;let n=pn;pn=null,n.dropped||n.order.forEach(s=>n.parent.append(s)),n.row.classList.remove("is-reordering"),t.focus({preventScroll:!0})}),Em(t,i),t}function Em(i,e){let t=null,n;function s(){let h=e.parentElement;for(;h;){if(/auto|scroll/.test(getComputedStyle(h).overflowY)&&h.scrollHeight>h.clientHeight)return h;h=h.parentElement}return document.scrollingElement}function r(){if(!t?.active)return;let h=document.elementFromPoint(t.x,t.y)?.closest("[data-reorder-item]");if(h&&h!==e&&h.parentElement===t.parent){let f=h.getBoundingClientRect();t.parent.insertBefore(e,t.y<f.top+f.height/2?h:h.nextSibling)}let u=s(),d=u===document.scrollingElement?{top:0,bottom:innerHeight}:u.getBoundingClientRect();t.y<d.top+48?u.scrollTop-=12:t.y>d.bottom-48&&(u.scrollTop+=12),n=requestAnimationFrame(r)}function a(h){if(!t)return;let u=t;t=null,cancelAnimationFrame(n),document.removeEventListener("pointermove",o,!0),document.removeEventListener("pointerup",c,!0),document.removeEventListener("pointercancel",l,!0),h?u.order.forEach(d=>u.parent.append(d)):u.active&&gl(e),e.classList.remove("is-reordering"),i.draggable=!0;try{i.releasePointerCapture(u.id)}catch{}i.focus({preventScroll:!0})}i.addEventListener("pointerdown",h=>{h.pointerType==="mouse"||h.button>0||(h.preventDefault(),i.draggable=!1,t={id:h.pointerId,parent:e.parentElement,order:[...e.parentElement.children],startX:h.clientX,startY:h.clientY,x:h.clientX,y:h.clientY,active:!1},document.addEventListener("pointermove",o,{capture:!0,passive:!1}),document.addEventListener("pointerup",c,!0),document.addEventListener("pointercancel",l,!0))});function o(h){!t||t.id!==h.pointerId||(h.preventDefault(),t.x=h.clientX,t.y=h.clientY,!t.active&&Math.hypot(t.x-t.startX,t.y-t.startY)>5&&(t.active=!0,e.classList.add("is-reordering"),r()))}function c(h){t?.id===h.pointerId&&(h.preventDefault(),a(!1))}function l(){a(!0)}}var Qn=[["awardsHeading","\u5404\u8CDE\u306E\u898B\u51FA\u3057","#eventAwardsHeading","text",80,"\u6848\u5185"],["awardsLabel","\u5404\u8CDE\u306E\u82F1\u5B57\u30E9\u30D9\u30EB","#eventAwards .event-section-label","text",30,"\u6848\u5185"],["detailHeading","\u30A4\u30D9\u30F3\u30C8\u8A73\u7D30\u306E\u898B\u51FA\u3057","#eventOverviewHeading","text",80,"\u6848\u5185"],["detailLabel","\u8A73\u7D30\u306E\u82F1\u5B57\u30E9\u30D9\u30EB","#eventOverview .event-section-label","text",30,"\u6848\u5185"],["submitLabel","\u30E1\u30A4\u30F3\u306E\u6295\u7A3F\u30DC\u30BF\u30F3","#event-submit-text","text",30,"\u6848\u5185"],["galleryHeading","\u4F5C\u54C1\u4E00\u89A7\u306E\u898B\u51FA\u3057","#gallery-title-text","text",80,"\u6848\u5185"],["galleryLabel","\u4E00\u89A7\u306E\u82F1\u5B57\u30E9\u30D9\u30EB","#works .section-eyebrow","text",30,"\u6848\u5185"],["galleryDescription","\u4F5C\u54C1\u4E00\u89A7\u306E\u8AAC\u660E","#works .section-description","textarea",500,"\u6848\u5185"],["posterAlt","\u30DD\u30B9\u30BF\u30FC\u306E\u4EE3\u66FF\u30C6\u30AD\u30B9\u30C8","[data-event-banner]","alt",500,"\u6848\u5185"],["award1Name","\u512A\u79C0\u8CDE\u306E\u8CDE\u540D",".event-award-entry:nth-child(1)>dt","text",40,"\u5404\u8CDE"],["award1Lead","\u512A\u79C0\u8CDE\u306E\u8AAC\u660E",".event-award-entry:nth-child(1) .event-award-lead","text",80,"\u5404\u8CDE"],["award1Prize","\u512A\u79C0\u8CDE\u306E\u7279\u5178",".event-award-entry:nth-child(1) dd>strong","text",80,"\u5404\u8CDE"],["award1Note","\u512A\u79C0\u8CDE\u306E\u88DC\u8DB3",".event-award-entry:nth-child(1) small","textarea",300,"\u5404\u8CDE"],["award2Name","\u30C7\u30B6\u30A4\u30F3\u8CDE\u306E\u8CDE\u540D",".event-award-entry:nth-child(2)>dt","text",40,"\u5404\u8CDE"],["award2Prize","\u30C7\u30B6\u30A4\u30F3\u8CDE\u306E\u5185\u5BB9",".event-award-entry:nth-child(2) dd>strong","text",80,"\u5404\u8CDE"],["award3Name","\u30A2\u30A4\u30C7\u30A2\u8CDE\u306E\u8CDE\u540D",".event-award-entry:nth-child(3)>dt","text",40,"\u5404\u8CDE"],["award3Prize","\u30A2\u30A4\u30C7\u30A2\u8CDE\u306E\u5185\u5BB9",".event-award-entry:nth-child(3) dd>strong","text",80,"\u5404\u8CDE"],["award1Color","\u512A\u79C0\u8CDE\u306E\u80CC\u666F\u8272",".event-award-entry:nth-child(1)","color",7,"\u5404\u8CDE"],["award2Color","\u30C7\u30B6\u30A4\u30F3\u8CDE\u306E\u80CC\u666F\u8272",".event-award-entry:nth-child(2)","color",7,"\u5404\u8CDE"],["award3Color","\u30A2\u30A4\u30C7\u30A2\u8CDE\u306E\u80CC\u666F\u8272",".event-award-entry:nth-child(3)","color",7,"\u5404\u8CDE"],["deadline","\u5FDC\u52DF\u7DE0\u3081\u5207\u308A","#event-deadline","date",10,"\u30A4\u30D9\u30F3\u30C8\u8A73\u7D30"],["theme","\u5236\u4F5C\u30C6\u30FC\u30DE","#eventOverview .overview-content>.event-facts>div:nth-child(2)>dd","textarea",300,"\u30A4\u30D9\u30F3\u30C8\u8A73\u7D30"],["entryLimit","\u5FDC\u52DF\u70B9\u6570","#eventOverview .overview-content>.event-facts>div:nth-child(3)>dd","text",150,"\u30A4\u30D9\u30F3\u30C8\u8A73\u7D30"],["tipsHeading","\u5236\u4F5C\u306E\u30D2\u30F3\u30C8\u306E\u898B\u51FA\u3057","#eventIdeasHeading","text",80,"\u30A4\u30D9\u30F3\u30C8\u8A73\u7D30"],["examples","\u30AA\u30FC\u30CA\u30E1\u30F3\u30C8\u306E\u4F8B\uFF081\u884C\u306B1\u3064\uFF09",".event-examples","lines",300,"\u30A4\u30D9\u30F3\u30C8\u8A73\u7D30"],["tips","\u5236\u4F5C\u306E\u30D2\u30F3\u30C8\u306E\u672C\u6587","#eventIdeasHeading~p","textarea",500,"\u30A4\u30D9\u30F3\u30C8\u8A73\u7D30"],["criteriaHeading","\u5BE9\u67FB\u57FA\u6E96\u306E\u898B\u51FA\u3057","#eventCriteriaHeading","text",80,"\u30A4\u30D9\u30F3\u30C8\u8A73\u7D30"],["criteria1Name","\u5BE9\u67FB\u9805\u76EE1\u306E\u540D\u524D","#eventCriteria .event-facts>div:nth-child(1)>dt","text",40,"\u30A4\u30D9\u30F3\u30C8\u8A73\u7D30"],["criteria1Text","\u5BE9\u67FB\u9805\u76EE1\u306E\u8AAC\u660E","#eventCriteria .event-facts>div:nth-child(1)>dd","text",200,"\u30A4\u30D9\u30F3\u30C8\u8A73\u7D30"],["criteria2Name","\u5BE9\u67FB\u9805\u76EE2\u306E\u540D\u524D","#eventCriteria .event-facts>div:nth-child(2)>dt","text",40,"\u30A4\u30D9\u30F3\u30C8\u8A73\u7D30"],["criteria2Text","\u5BE9\u67FB\u9805\u76EE2\u306E\u8AAC\u660E","#eventCriteria .event-facts>div:nth-child(2)>dd","text",200,"\u30A4\u30D9\u30F3\u30C8\u8A73\u7D30"],["criteria3Name","\u5BE9\u67FB\u9805\u76EE3\u306E\u540D\u524D","#eventCriteria .event-facts>div:nth-child(3)>dt","text",40,"\u30A4\u30D9\u30F3\u30C8\u8A73\u7D30"],["criteria3Text","\u5BE9\u67FB\u9805\u76EE3\u306E\u8AAC\u660E","#eventCriteria .event-facts>div:nth-child(3)>dd","text",200,"\u30A4\u30D9\u30F3\u30C8\u8A73\u7D30"],["criteria4Name","\u5BE9\u67FB\u9805\u76EE4\u306E\u540D\u524D","#eventCriteria .event-facts>div:nth-child(4)>dt","text",40,"\u30A4\u30D9\u30F3\u30C8\u8A73\u7D30"],["criteria4Text","\u5BE9\u67FB\u9805\u76EE4\u306E\u8AAC\u660E","#eventCriteria .event-facts>div:nth-child(4)>dd","text",200,"\u30A4\u30D9\u30F3\u30C8\u8A73\u7D30"],["newsHeading","\u4ECA\u5F8C\u306E\u304A\u77E5\u3089\u305B\u306E\u898B\u51FA\u3057","#eventCriteria h4:nth-of-type(2)","text",80,"\u30A4\u30D9\u30F3\u30C8\u8A73\u7D30"],["news","\u4ECA\u5F8C\u306E\u304A\u77E5\u3089\u305B","#eventCriteria ul li","textarea",500,"\u30A4\u30D9\u30F3\u30C8\u8A73\u7D30"],["notice","\u6CE8\u610F\u66F8\u304D",".event-change-note","textarea",300,"\u30A4\u30D9\u30F3\u30C8\u8A73\u7D30"]];var Tm={title:"\u4F5C\u54C1\u540D",author:"\u4F5C\u8005\u540D",comment:"\u4F5C\u54C1\u3078\u306E\u4E00\u8A00",visibility:"\u516C\u958B\u72B6\u614B",deleted:"\u524A\u9664\u6E08\u307F",root:"\u8868\u793A\u3059\u308B\u30E2\u30C7\u30EB",assets:"\u30E2\u30C7\u30EB\u306E\u30D5\u30A1\u30A4\u30EB",backgroundColor:"\u30E2\u30C7\u30EB\u306E\u80CC\u666F\u8272",modelView:"\u30E2\u30C7\u30EB\u306E\u5411\u304D",createdAt:"\u6295\u7A3F\u65E5\u6642"},Xa=i=>i?.uploadPrefix||"files/"+i?.id+"/"+(i?.assetRevision?i.assetRevision+"/":""),Am=(i,e)=>i?e?.(i)||"/api/admin/media?key="+encodeURIComponent(i):null,Cm=i=>i==null?"\u2014":typeof i=="boolean"?i?"\u306F\u3044":"\u3044\u3044\u3048":Array.isArray(i)?i.join(`
`):typeof i=="object"?i.position?"\u30AB\u30E1\u30E9 "+i.position.map(e=>Math.round(e*100)/100).join(", ")+" \uFF0F \u4E2D\u5FC3 "+(i.target||[]).map(e=>Math.round(e*100)/100).join(", "):"\u8A2D\u5B9A\u3042\u308A":String(i);function Rm(i,e){let t=i||{},n=e||{},s=[],r=(a,o,c,l)=>s.push({name:a,a:o,b:c,type:l});if(t.fields||n.fields){let a=Qn.filter(l=>l[5]!=="\u5404\u8CDE");for(let[l,h]of a)(l in(t.fields||{})||l in(n.fields||{}))&&r(h,t.fields?.[l],n.fields?.[l]);let o=t.awards||[],c=n.awards||[];r("\u5404\u8CDE\u306E\u4E26\u3073\u9806",o.map(l=>l.name),c.map(l=>l.name));for(let l of new Set([...o,...c].map(h=>h.id))){let h=o.find(d=>d.id===l)||{},u=c.find(d=>d.id===l)||{};for(let[d,f]of[["name","\u8CDE\u540D"],["lead","\u8AAC\u660E"],["prize","\u7279\u5178"],["note","\u88DC\u8DB3"],["color","\u80CC\u666F\u8272"],["featured","\u5F37\u8ABF\u8868\u793A"]])r((u.name||h.name||"\u8CDE")+" / "+f,h[d],u[d])}(t.poster||n.poster)&&r("\u30DD\u30B9\u30BF\u30FC",t.poster?t.posterKey||"posters/"+t.poster:null,n.poster?n.posterKey||"posters/"+n.poster:null,"image")}else if(t.types||n.types){let a=t.types||[],o=n.types||[];r("\u8868\u793A\u3059\u308B\u9806\u756A",a.map(c=>c.label),o.map(c=>c.label));for(let c of new Set([...a,...o].map(l=>l.id))){let l=a.find(u=>u.id===c)||{},h=o.find(u=>u.id===c)||{};for(let[u,d]of[["icon","\u30A2\u30A4\u30B3\u30F3"],["label","\u8868\u793A\u540D"],["enabled","\u8868\u793A\u3059\u308B"]])r((h.label||l.label)+" / "+d,l[u],h[u])}}else if(t.counts||n.counts)for(let a of new Set([...Object.keys(t.counts||{}),...Object.keys(n.counts||{})]))r((Ie.reactions?.types.find(o=>o.id===a)?.label||"\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3")+"\u306E\u5408\u8A08",t.counts?.[a]||0,n.counts?.[a]||0);else{for(let[a,o]of Object.entries(Tm)){if(!(a in t)&&!(a in n))continue;let c=l=>a==="visibility"?l==="hidden"?"\u975E\u516C\u958B":"\u516C\u958B\u4E2D":a==="createdAt"&&l?new Date(l).toLocaleString("ja-JP"):l;r(o,c(t[a]),c(n[a]))}(t.assets||n.assets)&&(r("\u5B9F\u7269\u5199\u771F",t.assets?Xa(t)+"real":null,n.assets?Xa(n)+"real":null,"image"),r("\u30E2\u30C7\u30EB\u753B\u50CF",t.assets?Xa(t)+"image":null,n.assets?Xa(n)+"image":null,"image"))}return s}function cd(i,e,t){let n=document.createElement("table");n.className="restore-table";let s=n.createTHead().insertRow();for(let a of["\u9805\u76EE","\u73FE\u5728","\u5FA9\u5143\u5F8C"]){let o=document.createElement("th");o.scope="col",o.textContent=a,s.append(o)}let r=n.createTBody();for(let a of Rm(i,e)){let o=r.insertRow();JSON.stringify(a.a)!==JSON.stringify(a.b)&&(o.className="is-different");let c=document.createElement("th");c.scope="row",c.textContent=a.name,o.append(c);for(let[l,h]of[[a.a,t.currentMedia],[a.b,t.nextMedia]]){let u=o.insertCell();if(a.type==="image"&&l){let d=document.createElement("img");d.src=Am(l,h),d.alt=a.name,d.loading="lazy",d.addEventListener("error",()=>{d.remove(),u.textContent="\u753B\u50CF\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093"},{once:!0}),u.append(d)}else u.textContent=Cm(l)}}return n}function ld(i,e,t={}){let n=document.createElement("div");if(n.className="comparison-scroll",![...Object.keys(i||{}),...Object.keys(e||{})].some(r=>/^(works|visibility|settings|reactions)\//.test(r)))return n.append(cd(i,e,t)),n;for(let r of new Set([...Object.keys(i||{}),...Object.keys(e||{})])){let a=i?.[r],o=e?.[r],c=document.createElement("details");c.className="comparison-record";let l=document.createElement("summary"),h=r==="settings/content.json"?"\u30A4\u30D9\u30F3\u30C8\u5185\u5BB9":r==="settings/reactions.json"?"\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u8A2D\u5B9A":r.startsWith("works/")?o?.title||a?.title||"\u4F5C\u54C1":r.startsWith("visibility/")?"\u4F5C\u54C1\u306E\u516C\u958B\u72B6\u614B":"\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u6570";l.textContent=h+(JSON.stringify(a)!==JSON.stringify(o)?" \u30FB\u5909\u66F4\u3042\u308A":" \u30FB\u5909\u66F4\u306A\u3057"),c.append(l,cd(a,o,t)),n.append(c)}return n}var Ib=new TextEncoder,Im=new TextDecoder;async function hd(i){let e=[],t=new Set,n=0;for(;n+512<=i.size;){let s=new Uint8Array(await i.slice(n,n+512).arrayBuffer());if(s.every(u=>u===0))return e;let r=(u,d)=>Im.decode(s.slice(u,u+d)).split("\0")[0].trim(),a=parseInt(r(148,8),8),o=s.slice();if(o.fill(32,148,156),!Number.isFinite(a)||o.reduce((u,d)=>u+d,0)!==a||r(257,5)!=="ustar"||![0,48].includes(s[156]))throw Error("\u5BFE\u5FDC\u3059\u308B\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u30D5\u30A1\u30A4\u30EB\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002");let c=r(0,100),l=r(124,12);if(!/^[0-7]+$/.test(l))throw Error("\u30D5\u30A1\u30A4\u30EB\u30B5\u30A4\u30BA\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002");let h=parseInt(l,8);if(!/^(manifest\.json|media\/\d{6}\.bin)$/.test(c)||t.has(c)||!Number.isSafeInteger(h)||n+512+h>i.size)throw Error("\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u306E\u69CB\u6210\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002");if(t.add(c),e.push({name:c,size:h,offset:n+512}),e.length>5001)throw Error("\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u306E\u30D5\u30A1\u30A4\u30EB\u6570\u304C\u4E0A\u9650\u3092\u8D85\u3048\u3066\u3044\u307E\u3059\u3002");n+=512+Math.ceil(h/512)*512}throw Error("\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u304C\u9014\u4E2D\u3067\u5207\u308C\u3066\u3044\u307E\u3059\u3002")}async function ud(i){if(!i||!i.size)throw Error("\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u30D5\u30A1\u30A4\u30EB\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002");let e=await hd(i),t=e.find(r=>r.name==="manifest.json");if(!t||t.size>3*1024*1024)throw Error("\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u306E\u8A18\u9332\u304C\u3042\u308A\u307E\u305B\u3093\u3002");let n;try{n=JSON.parse(await i.slice(t.offset,t.offset+t.size).text())}catch{throw Error("\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u306E\u8A18\u9332\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3002")}if(n.format!=="spool-event-backup-v1"||!n.records||typeof n.records!="object"||!Array.isArray(n.media))throw Error("\u5BFE\u5FDC\u3059\u308B\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002");let s=new Map(e.map(r=>[r.name,r]));if(e.length!==n.media.length+1)throw Error("\u6DFB\u4ED8\u30D5\u30A1\u30A4\u30EB\u306E\u6570\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002");for(let r of n.media){let a=s.get(r.name);if(!a||a.size!==r.size)throw Error("\u6DFB\u4ED8\u30D5\u30A1\u30A4\u30EB\u304C\u4E0D\u8DB3\u3057\u3066\u3044\u308B\u304B\u3001\u30B5\u30A4\u30BA\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002")}return{file:i,manifest:n,byName:s}}async function dd(i,e,t){let{file:n,manifest:s,byName:r}=i,a=await Ge("/admin/portable/imports",{method:"POST",body:JSON.stringify(s),signal:t}),o=0,c=!1,l=s.media.reduce((h,u)=>h+u.size,0);try{for(let h=0;h<s.media.length;h++){let u=s.media[h],d=r.get(u.name),f=[];for(let g=0,x=1;g<d.size;g+=a.partSize,x++){let m=n.slice(d.offset+g,d.offset+Math.min(d.size,g+a.partSize)),p;for(let M=0;M<3;M++)try{p=await Ge("/admin/portable/imports/"+a.id+"/files/"+h+"/parts/"+x,{method:"PUT",body:m,signal:t,headers:{"Content-Type":"application/octet-stream"}});break}catch(v){if(v.name==="AbortError"||v.status&&v.status<500||M===2)throw v}f.push(p),o+=m.size,e("\u30D5\u30A1\u30A4\u30EB\u3092\u9001\u4FE1\u4E2D "+Math.round(o/Math.max(1,l)*100)+"%\uFF08"+(h+1)+"/"+s.media.length+"\uFF09")}await Ge("/admin/portable/imports/"+a.id+"/files/"+h+"/finish",{method:"POST",body:JSON.stringify({parts:f}),signal:t})}return t.throwIfAborted(),e({text:"\u5FA9\u5143\u3092\u78BA\u5B9A\u3057\u3066\u3044\u307E\u3059\u2026",canCancel:!1}),c=!0,await Ge("/admin/portable/imports/"+a.id+"/commit",{method:"POST",body:"{}"})}catch(h){throw c||await Ge("/admin/portable/imports/"+a.id,{method:"DELETE"}).catch(()=>{}),h.name==="AbortError"?Error("\u5FA9\u5143\u3092\u4E2D\u65AD\u3057\u307E\u3057\u305F\u3002\u5143\u306E\u5185\u5BB9\u306F\u5909\u66F4\u3057\u3066\u3044\u307E\u305B\u3093\u3002"):h}}function fd(i){let e=new Map;return{url(t){let n=i.manifest.media.find(s=>s.key===t);if(!n?.type.startsWith("image/"))return null;if(!e.has(t)){let s=i.byName.get(n.name);e.set(t,URL.createObjectURL(i.file.slice(s.offset,s.offset+s.size,n.type)))}return e.get(t)},dispose(){for(let t of e.values())URL.revokeObjectURL(t)}}}function xl(i){let e=document.createElement("a");e.href="/api/admin/portable/export"+(i?"/"+i:""),e.download="",document.body.append(e),e.click(),e.remove()}var Ii={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},Pi={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},ef=0,lh=1,tf=2;var hh=1,nf=2,Yn=3,Rn=0,Jt=1,vn=2,Kn=0,Ki=1,uh=2,dh=3,fh=4,sf=5,Ti=100,rf=101,af=102,of=103,cf=104,lf=200,hf=201,uf=202,df=203,bo=204,So=205,ff=206,pf=207,mf=208,gf=209,xf=210,_f=211,yf=212,vf=213,bf=214,Xo=0,qo=1,Yo=2,Zi=3,Ko=4,Zo=5,Jo=6,jo=7,ph=0,Sf=1,Mf=2,di=0,wf=1,Ef=2,Tf=3,Af=4,Cf=5,Rf=6,If=7,Kl="attached",Pf="detached",mh=300,ss=301,rs=302,$o=303,Qo=304,xa=306,Ai=1e3,xn=1001,Ns=1002,Ot=1003,ec=1004;var as=1005;var Ft=1006,tr=1007;var Dn=1008;var Nn=1009,gh=1010,xh=1011,nr=1012,tc=1013,Li=1014,bn=1015,os=1016,nc=1017,ic=1018,ir=1020,_h=35902,yh=35899,vh=1021,bh=1022,un=1023,Us=1026,sr=1027,sc=1028,rc=1029,ac=1030,oc=1031;var cc=1033,_a=33776,ya=33777,va=33778,ba=33779,lc=35840,hc=35841,uc=35842,dc=35843,fc=36196,pc=37492,mc=37496,gc=37808,xc=37809,_c=37810,yc=37811,vc=37812,bc=37813,Sc=37814,Mc=37815,wc=37816,Ec=37817,Tc=37818,Ac=37819,Cc=37820,Rc=37821,Ic=36492,Pc=36494,Lc=36495,Dc=36283,Nc=36284,Uc=36285,Oc=36286;var Ji=2300,ji=2301,vo=2302,Zl=2400,Jl=2401,jl=2402,Lf=2500;var Sh=0,Sa=1,rr=2,Df=3200,Nf=3201;var Mh=0,Uf=1,fi="",Et="srgb",Bt="srgb-linear",Dr="linear",ct="srgb";var qi=7680;var $l=519,Of=512,Ff=513,Bf=514,wh=515,kf=516,zf=517,Vf=518,Hf=519,Mo=35044;var Eh="300 es",Cn=2e3,Nr=2001;function Th(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function Os(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Gf(){let i=Os("canvas");return i.style.display="block",i}var pd={},Fs=null;function Ur(...i){let e="THREE."+i.shift();Fs?Fs("log",e,...i):console.log(e,...i)}function Re(...i){let e="THREE."+i.shift();Fs?Fs("warn",e,...i):console.warn(e,...i)}function Je(...i){let e="THREE."+i.shift();Fs?Fs("error",e,...i):console.error(e,...i)}function Bs(...i){let e=i.join(" ");e in pd||(pd[e]=!0,Re(...i))}function Wf(i,e,t){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:n()}}setTimeout(r,t)})}var Vn=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){let n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){let n=this._listeners;if(n===void 0)return;let s=n[e];if(s!==void 0){let r=s.indexOf(t);r!==-1&&s.splice(r,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let n=t[e.type];if(n!==void 0){e.target=this;let s=n.slice(0);for(let r=0,a=s.length;r<a;r++)s[r].call(this,e);e.target=null}}},kt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],md=1234567,Rr=Math.PI/180,$i=180/Math.PI;function _n(){let i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(kt[i&255]+kt[i>>8&255]+kt[i>>16&255]+kt[i>>24&255]+"-"+kt[e&255]+kt[e>>8&255]+"-"+kt[e>>16&15|64]+kt[e>>24&255]+"-"+kt[t&63|128]+kt[t>>8&255]+"-"+kt[t>>16&255]+kt[t>>24&255]+kt[n&255]+kt[n>>8&255]+kt[n>>16&255]+kt[n>>24&255]).toLowerCase()}function qe(i,e,t){return Math.max(e,Math.min(t,i))}function Ah(i,e){return(i%e+e)%e}function Pm(i,e,t,n,s){return n+(i-e)*(s-n)/(t-e)}function Lm(i,e,t){return i!==e?(t-i)/(e-i):0}function Ir(i,e,t){return(1-t)*i+t*e}function Dm(i,e,t,n){return Ir(i,e,1-Math.exp(-t*n))}function Nm(i,e=1){return e-Math.abs(Ah(i,e*2)-e)}function Um(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*(3-2*i))}function Om(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*i*(i*(i*6-15)+10))}function Fm(i,e){return i+Math.floor(Math.random()*(e-i+1))}function Bm(i,e){return i+Math.random()*(e-i)}function km(i){return i*(.5-Math.random())}function zm(i){i!==void 0&&(md=i);let e=md+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function Vm(i){return i*Rr}function Hm(i){return i*$i}function Gm(i){return(i&i-1)===0&&i!==0}function Wm(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function Xm(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function qm(i,e,t,n,s){let r=Math.cos,a=Math.sin,o=r(t/2),c=a(t/2),l=r((e+n)/2),h=a((e+n)/2),u=r((e-n)/2),d=a((e-n)/2),f=r((n-e)/2),g=a((n-e)/2);switch(s){case"XYX":i.set(o*h,c*u,c*d,o*l);break;case"YZY":i.set(c*d,o*h,c*u,o*l);break;case"ZXZ":i.set(c*u,c*d,o*h,o*l);break;case"XZX":i.set(o*h,c*g,c*f,o*l);break;case"YXY":i.set(c*f,o*h,c*g,o*l);break;case"ZYZ":i.set(c*g,c*f,o*h,o*l);break;default:Re("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function An(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function ot(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}var Ma={DEG2RAD:Rr,RAD2DEG:$i,generateUUID:_n,clamp:qe,euclideanModulo:Ah,mapLinear:Pm,inverseLerp:Lm,lerp:Ir,damp:Dm,pingpong:Nm,smoothstep:Um,smootherstep:Om,randInt:Fm,randFloat:Bm,randFloatSpread:km,seededRandom:zm,degToRad:Vm,radToDeg:Hm,isPowerOfTwo:Gm,ceilPowerOfTwo:Wm,floorPowerOfTwo:Xm,setQuaternionFromProperEuler:qm,normalize:ot,denormalize:An},ie=class i{constructor(e=0,t=0){i.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6],this.y=s[1]*t+s[4]*n+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=qe(this.x,e.x,t.x),this.y=qe(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=qe(this.x,e,t),this.y=qe(this.y,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(qe(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(qe(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),s=Math.sin(t),r=this.x-e.x,a=this.y-e.y;return this.x=r*n-a*s+e.x,this.y=r*s+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},Kt=class{constructor(e=0,t=0,n=0,s=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=s}static slerpFlat(e,t,n,s,r,a,o){let c=n[s+0],l=n[s+1],h=n[s+2],u=n[s+3],d=r[a+0],f=r[a+1],g=r[a+2],x=r[a+3];if(o<=0){e[t+0]=c,e[t+1]=l,e[t+2]=h,e[t+3]=u;return}if(o>=1){e[t+0]=d,e[t+1]=f,e[t+2]=g,e[t+3]=x;return}if(u!==x||c!==d||l!==f||h!==g){let m=c*d+l*f+h*g+u*x;m<0&&(d=-d,f=-f,g=-g,x=-x,m=-m);let p=1-o;if(m<.9995){let M=Math.acos(m),v=Math.sin(M);p=Math.sin(p*M)/v,o=Math.sin(o*M)/v,c=c*p+d*o,l=l*p+f*o,h=h*p+g*o,u=u*p+x*o}else{c=c*p+d*o,l=l*p+f*o,h=h*p+g*o,u=u*p+x*o;let M=1/Math.sqrt(c*c+l*l+h*h+u*u);c*=M,l*=M,h*=M,u*=M}}e[t]=c,e[t+1]=l,e[t+2]=h,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,s,r,a){let o=n[s],c=n[s+1],l=n[s+2],h=n[s+3],u=r[a],d=r[a+1],f=r[a+2],g=r[a+3];return e[t]=o*g+h*u+c*f-l*d,e[t+1]=c*g+h*d+l*u-o*f,e[t+2]=l*g+h*f+o*d-c*u,e[t+3]=h*g-o*u-c*d-l*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,s){return this._x=e,this._y=t,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,s=e._y,r=e._z,a=e._order,o=Math.cos,c=Math.sin,l=o(n/2),h=o(s/2),u=o(r/2),d=c(n/2),f=c(s/2),g=c(r/2);switch(a){case"XYZ":this._x=d*h*u+l*f*g,this._y=l*f*u-d*h*g,this._z=l*h*g+d*f*u,this._w=l*h*u-d*f*g;break;case"YXZ":this._x=d*h*u+l*f*g,this._y=l*f*u-d*h*g,this._z=l*h*g-d*f*u,this._w=l*h*u+d*f*g;break;case"ZXY":this._x=d*h*u-l*f*g,this._y=l*f*u+d*h*g,this._z=l*h*g+d*f*u,this._w=l*h*u-d*f*g;break;case"ZYX":this._x=d*h*u-l*f*g,this._y=l*f*u+d*h*g,this._z=l*h*g-d*f*u,this._w=l*h*u+d*f*g;break;case"YZX":this._x=d*h*u+l*f*g,this._y=l*f*u+d*h*g,this._z=l*h*g-d*f*u,this._w=l*h*u-d*f*g;break;case"XZY":this._x=d*h*u-l*f*g,this._y=l*f*u-d*h*g,this._z=l*h*g+d*f*u,this._w=l*h*u+d*f*g;break;default:Re("Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,s=Math.sin(n);return this._x=e.x*s,this._y=e.y*s,this._z=e.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],s=t[4],r=t[8],a=t[1],o=t[5],c=t[9],l=t[2],h=t[6],u=t[10],d=n+o+u;if(d>0){let f=.5/Math.sqrt(d+1);this._w=.25/f,this._x=(h-c)*f,this._y=(r-l)*f,this._z=(a-s)*f}else if(n>o&&n>u){let f=2*Math.sqrt(1+n-o-u);this._w=(h-c)/f,this._x=.25*f,this._y=(s+a)/f,this._z=(r+l)/f}else if(o>u){let f=2*Math.sqrt(1+o-n-u);this._w=(r-l)/f,this._x=(s+a)/f,this._y=.25*f,this._z=(c+h)/f}else{let f=2*Math.sqrt(1+u-n-o);this._w=(a-s)/f,this._x=(r+l)/f,this._y=(c+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(qe(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let s=Math.min(1,t/n);return this.slerp(e,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,s=e._y,r=e._z,a=e._w,o=t._x,c=t._y,l=t._z,h=t._w;return this._x=n*h+a*o+s*l-r*c,this._y=s*h+a*c+r*o-n*l,this._z=r*h+a*l+n*c-s*o,this._w=a*h-n*o-s*c-r*l,this._onChangeCallback(),this}slerp(e,t){if(t<=0)return this;if(t>=1)return this.copy(e);let n=e._x,s=e._y,r=e._z,a=e._w,o=this.dot(e);o<0&&(n=-n,s=-s,r=-r,a=-a,o=-o);let c=1-t;if(o<.9995){let l=Math.acos(o),h=Math.sin(l);c=Math.sin(c*l)/h,t=Math.sin(t*l)/h,this._x=this._x*c+n*t,this._y=this._y*c+s*t,this._z=this._z*c+r*t,this._w=this._w*c+a*t,this._onChangeCallback()}else this._x=this._x*c+n*t,this._y=this._y*c+s*t,this._z=this._z*c+r*t,this._w=this._w*c+a*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(e),s*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},D=class i{constructor(e=0,t=0,n=0){i.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(gd.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(gd.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6]*s,this.y=r[1]*t+r[4]*n+r[7]*s,this.z=r[2]*t+r[5]*n+r[8]*s,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,s=this.z,r=e.elements,a=1/(r[3]*t+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*t+r[4]*n+r[8]*s+r[12])*a,this.y=(r[1]*t+r[5]*n+r[9]*s+r[13])*a,this.z=(r[2]*t+r[6]*n+r[10]*s+r[14])*a,this}applyQuaternion(e){let t=this.x,n=this.y,s=this.z,r=e.x,a=e.y,o=e.z,c=e.w,l=2*(a*s-o*n),h=2*(o*t-r*s),u=2*(r*n-a*t);return this.x=t+c*l+a*u-o*h,this.y=n+c*h+o*l-r*u,this.z=s+c*u+r*h-a*l,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*s,this.y=r[1]*t+r[5]*n+r[9]*s,this.z=r[2]*t+r[6]*n+r[10]*s,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=qe(this.x,e.x,t.x),this.y=qe(this.y,e.y,t.y),this.z=qe(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=qe(this.x,e,t),this.y=qe(this.y,e,t),this.z=qe(this.z,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(qe(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,s=e.y,r=e.z,a=t.x,o=t.y,c=t.z;return this.x=s*c-r*o,this.y=r*a-n*c,this.z=n*o-s*a,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return _l.copy(this).projectOnVector(e),this.sub(_l)}reflect(e){return this.sub(_l.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(qe(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,s=this.z-e.z;return t*t+n*n+s*s}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let s=Math.sin(t)*e;return this.x=s*Math.sin(n),this.y=Math.cos(t)*e,this.z=s*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),s=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=s,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},_l=new D,gd=new Kt,Xe=class i{constructor(e,t,n,s,r,a,o,c,l){i.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,a,o,c,l)}set(e,t,n,s,r,a,o,c,l){let h=this.elements;return h[0]=e,h[1]=s,h[2]=o,h[3]=t,h[4]=r,h[5]=c,h[6]=n,h[7]=a,h[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,s=t.elements,r=this.elements,a=n[0],o=n[3],c=n[6],l=n[1],h=n[4],u=n[7],d=n[2],f=n[5],g=n[8],x=s[0],m=s[3],p=s[6],M=s[1],v=s[4],w=s[7],I=s[2],E=s[5],P=s[8];return r[0]=a*x+o*M+c*I,r[3]=a*m+o*v+c*E,r[6]=a*p+o*w+c*P,r[1]=l*x+h*M+u*I,r[4]=l*m+h*v+u*E,r[7]=l*p+h*w+u*P,r[2]=d*x+f*M+g*I,r[5]=d*m+f*v+g*E,r[8]=d*p+f*w+g*P,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],a=e[4],o=e[5],c=e[6],l=e[7],h=e[8];return t*a*h-t*o*l-n*r*h+n*o*c+s*r*l-s*a*c}invert(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],a=e[4],o=e[5],c=e[6],l=e[7],h=e[8],u=h*a-o*l,d=o*c-h*r,f=l*r-a*c,g=t*u+n*d+s*f;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);let x=1/g;return e[0]=u*x,e[1]=(s*l-h*n)*x,e[2]=(o*n-s*a)*x,e[3]=d*x,e[4]=(h*t-s*c)*x,e[5]=(s*r-o*t)*x,e[6]=f*x,e[7]=(n*c-l*t)*x,e[8]=(a*t-n*r)*x,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,s,r,a,o){let c=Math.cos(r),l=Math.sin(r);return this.set(n*c,n*l,-n*(c*a+l*o)+a+e,-s*l,s*c,-s*(-l*a+c*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(yl.makeScale(e,t)),this}rotate(e){return this.premultiply(yl.makeRotation(-e)),this}translate(e,t){return this.premultiply(yl.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let s=0;s<9;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}},yl=new Xe,xd=new Xe().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),_d=new Xe().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Ym(){let i={enabled:!0,workingColorSpace:Bt,spaces:{},convert:function(s,r,a){return this.enabled===!1||r===a||!r||!a||(this.spaces[r].transfer===ct&&(s.r=ai(s.r),s.g=ai(s.g),s.b=ai(s.b)),this.spaces[r].primaries!==this.spaces[a].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===ct&&(s.r=Ds(s.r),s.g=Ds(s.g),s.b=Ds(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===fi?Dr:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,a){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return Bs("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return Bs("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[Bt]:{primaries:e,whitePoint:n,transfer:Dr,toXYZ:xd,fromXYZ:_d,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Et},outputColorSpaceConfig:{drawingBufferColorSpace:Et}},[Et]:{primaries:e,whitePoint:n,transfer:ct,toXYZ:xd,fromXYZ:_d,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Et}}}),i}var tt=Ym();function ai(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function Ds(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}var ys,wo=class{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{ys===void 0&&(ys=Os("canvas")),ys.width=e.width,ys.height=e.height;let s=ys.getContext("2d");e instanceof ImageData?s.putImageData(e,0,0):s.drawImage(e,0,0,e.width,e.height),n=ys}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){let t=Os("canvas");t.width=e.width,t.height=e.height;let n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);let s=n.getImageData(0,0,e.width,e.height),r=s.data;for(let a=0;a<r.length;a++)r[a]=ai(r[a]/255)*255;return n.putImageData(s,0,0),t}else if(e.data){let t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(ai(t[n]/255)*255):t[n]=ai(t[n]);return{data:t,width:e.width,height:e.height}}else return Re("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}},Km=0,ks=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Km++}),this.uuid=_n(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):t instanceof VideoFrame?e.set(t.displayHeight,t.displayWidth,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let a=0,o=s.length;a<o;a++)s[a].isDataTexture?r.push(vl(s[a].image)):r.push(vl(s[a]))}else r=vl(s);n.url=r}return t||(e.images[this.uuid]=n),n}};function vl(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?wo.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(Re("Texture: Unable to serialize Texture."),{})}var Zm=0,bl=new D,Nt=class i extends Vn{constructor(e=i.DEFAULT_IMAGE,t=i.DEFAULT_MAPPING,n=xn,s=xn,r=Ft,a=Dn,o=un,c=Nn,l=i.DEFAULT_ANISOTROPY,h=fi){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Zm++}),this.uuid=_n(),this.name="",this.source=new ks(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=a,this.anisotropy=l,this.format=o,this.internalFormat=null,this.type=c,this.offset=new ie(0,0),this.repeat=new ie(1,1),this.center=new ie(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Xe,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(bl).x}get height(){return this.source.getSize(bl).y}get depth(){return this.source.getSize(bl).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let n=e[t];if(n===void 0){Re(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let s=this[t];if(s===void 0){Re(`Texture.setValues(): property '${t}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==mh)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Ai:e.x=e.x-Math.floor(e.x);break;case xn:e.x=e.x<0?0:1;break;case Ns:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Ai:e.y=e.y-Math.floor(e.y);break;case xn:e.y=e.y<0?0:1;break;case Ns:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};Nt.DEFAULT_IMAGE=null;Nt.DEFAULT_MAPPING=mh;Nt.DEFAULT_ANISOTROPY=1;var it=class i{constructor(e=0,t=0,n=0,s=1){i.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=s}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,s){return this.x=e,this.y=t,this.z=n,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,s=this.z,r=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*s+a[12]*r,this.y=a[1]*t+a[5]*n+a[9]*s+a[13]*r,this.z=a[2]*t+a[6]*n+a[10]*s+a[14]*r,this.w=a[3]*t+a[7]*n+a[11]*s+a[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,s,r,c=e.elements,l=c[0],h=c[4],u=c[8],d=c[1],f=c[5],g=c[9],x=c[2],m=c[6],p=c[10];if(Math.abs(h-d)<.01&&Math.abs(u-x)<.01&&Math.abs(g-m)<.01){if(Math.abs(h+d)<.1&&Math.abs(u+x)<.1&&Math.abs(g+m)<.1&&Math.abs(l+f+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;let v=(l+1)/2,w=(f+1)/2,I=(p+1)/2,E=(h+d)/4,P=(u+x)/4,O=(g+m)/4;return v>w&&v>I?v<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(v),s=E/n,r=P/n):w>I?w<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(w),n=E/s,r=O/s):I<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(I),n=P/r,s=O/r),this.set(n,s,r,t),this}let M=Math.sqrt((m-g)*(m-g)+(u-x)*(u-x)+(d-h)*(d-h));return Math.abs(M)<.001&&(M=1),this.x=(m-g)/M,this.y=(u-x)/M,this.z=(d-h)/M,this.w=Math.acos((l+f+p-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=qe(this.x,e.x,t.x),this.y=qe(this.y,e.y,t.y),this.z=qe(this.z,e.z,t.z),this.w=qe(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=qe(this.x,e,t),this.y=qe(this.y,e,t),this.z=qe(this.z,e,t),this.w=qe(this.w,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(qe(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},Eo=class extends Vn{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Ft,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new it(0,0,e,t),this.scissorTest=!1,this.viewport=new it(0,0,e,t);let s={width:e,height:t,depth:n.depth},r=new Nt(s);this.textures=[];let a=n.count;for(let o=0;o<a;o++)this.textures[o]=r.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(e={}){let t={minFilter:Ft,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=e,this.textures[s].image.height=t,this.textures[s].image.depth=n,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let s=Object.assign({},e.textures[t].image);this.textures[t].source=new ks(s)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}},Hn=class extends Eo{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},Or=class extends Nt{constructor(e=null,t=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=Ot,this.minFilter=Ot,this.wrapR=xn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}};var To=class extends Nt{constructor(e=null,t=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=Ot,this.minFilter=Ot,this.wrapR=xn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var Zt=class{constructor(e=new D(1/0,1/0,1/0),t=new D(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(wn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(wn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=wn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let r=n.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let a=0,o=r.count;a<o;a++)e.isMesh===!0?e.getVertexPosition(a,wn):wn.fromBufferAttribute(r,a),wn.applyMatrix4(e.matrixWorld),this.expandByPoint(wn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),qa.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),qa.copy(n.boundingBox)),qa.applyMatrix4(e.matrixWorld),this.union(qa)}let s=e.children;for(let r=0,a=s.length;r<a;r++)this.expandByObject(s[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,wn),wn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(vr),Ya.subVectors(this.max,vr),vs.subVectors(e.a,vr),bs.subVectors(e.b,vr),Ss.subVectors(e.c,vr),yi.subVectors(bs,vs),vi.subVectors(Ss,bs),Hi.subVectors(vs,Ss);let t=[0,-yi.z,yi.y,0,-vi.z,vi.y,0,-Hi.z,Hi.y,yi.z,0,-yi.x,vi.z,0,-vi.x,Hi.z,0,-Hi.x,-yi.y,yi.x,0,-vi.y,vi.x,0,-Hi.y,Hi.x,0];return!Sl(t,vs,bs,Ss,Ya)||(t=[1,0,0,0,1,0,0,0,1],!Sl(t,vs,bs,Ss,Ya))?!1:(Ka.crossVectors(yi,vi),t=[Ka.x,Ka.y,Ka.z],Sl(t,vs,bs,Ss,Ya))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,wn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(wn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(ei[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),ei[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),ei[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),ei[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),ei[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),ei[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),ei[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),ei[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(ei),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},ei=[new D,new D,new D,new D,new D,new D,new D,new D],wn=new D,qa=new Zt,vs=new D,bs=new D,Ss=new D,yi=new D,vi=new D,Hi=new D,vr=new D,Ya=new D,Ka=new D,Gi=new D;function Sl(i,e,t,n,s){for(let r=0,a=i.length-3;r<=a;r+=3){Gi.fromArray(i,r);let o=s.x*Math.abs(Gi.x)+s.y*Math.abs(Gi.y)+s.z*Math.abs(Gi.z),c=e.dot(Gi),l=t.dot(Gi),h=n.dot(Gi);if(Math.max(-Math.max(c,l,h),Math.min(c,l,h))>o)return!1}return!0}var Jm=new Zt,br=new D,Ml=new D,Qt=class{constructor(e=new D,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t!==void 0?n.copy(t):Jm.setFromPoints(e).getCenter(n);let s=0;for(let r=0,a=e.length;r<a;r++)s=Math.max(s,n.distanceToSquared(e[r]));return this.radius=Math.sqrt(s),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;br.subVectors(e,this.center);let t=br.lengthSq();if(t>this.radius*this.radius){let n=Math.sqrt(t),s=(n-this.radius)*.5;this.center.addScaledVector(br,s/n),this.radius+=s}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Ml.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(br.copy(e.center).add(Ml)),this.expandByPoint(br.copy(e.center).sub(Ml))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},ti=new D,wl=new D,Za=new D,bi=new D,El=new D,Ja=new D,Tl=new D,oi=class{constructor(e=new D,t=new D(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,ti)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=ti.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(ti.copy(this.origin).addScaledVector(this.direction,t),ti.distanceToSquared(e))}distanceSqToSegment(e,t,n,s){wl.copy(e).add(t).multiplyScalar(.5),Za.copy(t).sub(e).normalize(),bi.copy(this.origin).sub(wl);let r=e.distanceTo(t)*.5,a=-this.direction.dot(Za),o=bi.dot(this.direction),c=-bi.dot(Za),l=bi.lengthSq(),h=Math.abs(1-a*a),u,d,f,g;if(h>0)if(u=a*c-o,d=a*o-c,g=r*h,u>=0)if(d>=-g)if(d<=g){let x=1/h;u*=x,d*=x,f=u*(u+a*d+2*o)+d*(a*u+d+2*c)+l}else d=r,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*c)+l;else d=-r,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*c)+l;else d<=-g?(u=Math.max(0,-(-a*r+o)),d=u>0?-r:Math.min(Math.max(-r,-c),r),f=-u*u+d*(d+2*c)+l):d<=g?(u=0,d=Math.min(Math.max(-r,-c),r),f=d*(d+2*c)+l):(u=Math.max(0,-(a*r+o)),d=u>0?r:Math.min(Math.max(-r,-c),r),f=-u*u+d*(d+2*c)+l);else d=a>0?-r:r,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*c)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,u),s&&s.copy(wl).addScaledVector(Za,d),f}intersectSphere(e,t){ti.subVectors(e.center,this.origin);let n=ti.dot(this.direction),s=ti.dot(ti)-n*n,r=e.radius*e.radius;if(s>r)return null;let a=Math.sqrt(r-s),o=n-a,c=n+a;return c<0?null:o<0?this.at(c,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,s,r,a,o,c,l=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,d=this.origin;return l>=0?(n=(e.min.x-d.x)*l,s=(e.max.x-d.x)*l):(n=(e.max.x-d.x)*l,s=(e.min.x-d.x)*l),h>=0?(r=(e.min.y-d.y)*h,a=(e.max.y-d.y)*h):(r=(e.max.y-d.y)*h,a=(e.min.y-d.y)*h),n>a||r>s||((r>n||isNaN(n))&&(n=r),(a<s||isNaN(s))&&(s=a),u>=0?(o=(e.min.z-d.z)*u,c=(e.max.z-d.z)*u):(o=(e.max.z-d.z)*u,c=(e.min.z-d.z)*u),n>c||o>s)||((o>n||n!==n)&&(n=o),(c<s||s!==s)&&(s=c),s<0)?null:this.at(n>=0?n:s,t)}intersectsBox(e){return this.intersectBox(e,ti)!==null}intersectTriangle(e,t,n,s,r){El.subVectors(t,e),Ja.subVectors(n,e),Tl.crossVectors(El,Ja);let a=this.direction.dot(Tl),o;if(a>0){if(s)return null;o=1}else if(a<0)o=-1,a=-a;else return null;bi.subVectors(this.origin,e);let c=o*this.direction.dot(Ja.crossVectors(bi,Ja));if(c<0)return null;let l=o*this.direction.dot(El.cross(bi));if(l<0||c+l>a)return null;let h=-o*bi.dot(Tl);return h<0?null:this.at(h/a,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},We=class i{constructor(e,t,n,s,r,a,o,c,l,h,u,d,f,g,x,m){i.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,a,o,c,l,h,u,d,f,g,x,m)}set(e,t,n,s,r,a,o,c,l,h,u,d,f,g,x,m){let p=this.elements;return p[0]=e,p[4]=t,p[8]=n,p[12]=s,p[1]=r,p[5]=a,p[9]=o,p[13]=c,p[2]=l,p[6]=h,p[10]=u,p[14]=d,p[3]=f,p[7]=g,p[11]=x,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new i().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){let t=this.elements,n=e.elements,s=1/Ms.setFromMatrixColumn(e,0).length(),r=1/Ms.setFromMatrixColumn(e,1).length(),a=1/Ms.setFromMatrixColumn(e,2).length();return t[0]=n[0]*s,t[1]=n[1]*s,t[2]=n[2]*s,t[3]=0,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,s=e.y,r=e.z,a=Math.cos(n),o=Math.sin(n),c=Math.cos(s),l=Math.sin(s),h=Math.cos(r),u=Math.sin(r);if(e.order==="XYZ"){let d=a*h,f=a*u,g=o*h,x=o*u;t[0]=c*h,t[4]=-c*u,t[8]=l,t[1]=f+g*l,t[5]=d-x*l,t[9]=-o*c,t[2]=x-d*l,t[6]=g+f*l,t[10]=a*c}else if(e.order==="YXZ"){let d=c*h,f=c*u,g=l*h,x=l*u;t[0]=d+x*o,t[4]=g*o-f,t[8]=a*l,t[1]=a*u,t[5]=a*h,t[9]=-o,t[2]=f*o-g,t[6]=x+d*o,t[10]=a*c}else if(e.order==="ZXY"){let d=c*h,f=c*u,g=l*h,x=l*u;t[0]=d-x*o,t[4]=-a*u,t[8]=g+f*o,t[1]=f+g*o,t[5]=a*h,t[9]=x-d*o,t[2]=-a*l,t[6]=o,t[10]=a*c}else if(e.order==="ZYX"){let d=a*h,f=a*u,g=o*h,x=o*u;t[0]=c*h,t[4]=g*l-f,t[8]=d*l+x,t[1]=c*u,t[5]=x*l+d,t[9]=f*l-g,t[2]=-l,t[6]=o*c,t[10]=a*c}else if(e.order==="YZX"){let d=a*c,f=a*l,g=o*c,x=o*l;t[0]=c*h,t[4]=x-d*u,t[8]=g*u+f,t[1]=u,t[5]=a*h,t[9]=-o*h,t[2]=-l*h,t[6]=f*u+g,t[10]=d-x*u}else if(e.order==="XZY"){let d=a*c,f=a*l,g=o*c,x=o*l;t[0]=c*h,t[4]=-u,t[8]=l*h,t[1]=d*u+x,t[5]=a*h,t[9]=f*u-g,t[2]=g*u-f,t[6]=o*h,t[10]=x*u+d}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(jm,e,$m)}lookAt(e,t,n){let s=this.elements;return on.subVectors(e,t),on.lengthSq()===0&&(on.z=1),on.normalize(),Si.crossVectors(n,on),Si.lengthSq()===0&&(Math.abs(n.z)===1?on.x+=1e-4:on.z+=1e-4,on.normalize(),Si.crossVectors(n,on)),Si.normalize(),ja.crossVectors(on,Si),s[0]=Si.x,s[4]=ja.x,s[8]=on.x,s[1]=Si.y,s[5]=ja.y,s[9]=on.y,s[2]=Si.z,s[6]=ja.z,s[10]=on.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,s=t.elements,r=this.elements,a=n[0],o=n[4],c=n[8],l=n[12],h=n[1],u=n[5],d=n[9],f=n[13],g=n[2],x=n[6],m=n[10],p=n[14],M=n[3],v=n[7],w=n[11],I=n[15],E=s[0],P=s[4],O=s[8],S=s[12],y=s[1],R=s[5],L=s[9],k=s[13],z=s[2],G=s[6],X=s[10],re=s[14],Y=s[3],ae=s[7],le=s[11],Ee=s[15];return r[0]=a*E+o*y+c*z+l*Y,r[4]=a*P+o*R+c*G+l*ae,r[8]=a*O+o*L+c*X+l*le,r[12]=a*S+o*k+c*re+l*Ee,r[1]=h*E+u*y+d*z+f*Y,r[5]=h*P+u*R+d*G+f*ae,r[9]=h*O+u*L+d*X+f*le,r[13]=h*S+u*k+d*re+f*Ee,r[2]=g*E+x*y+m*z+p*Y,r[6]=g*P+x*R+m*G+p*ae,r[10]=g*O+x*L+m*X+p*le,r[14]=g*S+x*k+m*re+p*Ee,r[3]=M*E+v*y+w*z+I*Y,r[7]=M*P+v*R+w*G+I*ae,r[11]=M*O+v*L+w*X+I*le,r[15]=M*S+v*k+w*re+I*Ee,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],s=e[8],r=e[12],a=e[1],o=e[5],c=e[9],l=e[13],h=e[2],u=e[6],d=e[10],f=e[14],g=e[3],x=e[7],m=e[11],p=e[15];return g*(+r*c*u-s*l*u-r*o*d+n*l*d+s*o*f-n*c*f)+x*(+t*c*f-t*l*d+r*a*d-s*a*f+s*l*h-r*c*h)+m*(+t*l*u-t*o*f-r*a*u+n*a*f+r*o*h-n*l*h)+p*(-s*o*h-t*c*u+t*o*d+s*a*u-n*a*d+n*c*h)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let s=this.elements;return e.isVector3?(s[12]=e.x,s[13]=e.y,s[14]=e.z):(s[12]=e,s[13]=t,s[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],a=e[4],o=e[5],c=e[6],l=e[7],h=e[8],u=e[9],d=e[10],f=e[11],g=e[12],x=e[13],m=e[14],p=e[15],M=u*m*l-x*d*l+x*c*f-o*m*f-u*c*p+o*d*p,v=g*d*l-h*m*l-g*c*f+a*m*f+h*c*p-a*d*p,w=h*x*l-g*u*l+g*o*f-a*x*f-h*o*p+a*u*p,I=g*u*c-h*x*c-g*o*d+a*x*d+h*o*m-a*u*m,E=t*M+n*v+s*w+r*I;if(E===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let P=1/E;return e[0]=M*P,e[1]=(x*d*r-u*m*r-x*s*f+n*m*f+u*s*p-n*d*p)*P,e[2]=(o*m*r-x*c*r+x*s*l-n*m*l-o*s*p+n*c*p)*P,e[3]=(u*c*r-o*d*r-u*s*l+n*d*l+o*s*f-n*c*f)*P,e[4]=v*P,e[5]=(h*m*r-g*d*r+g*s*f-t*m*f-h*s*p+t*d*p)*P,e[6]=(g*c*r-a*m*r-g*s*l+t*m*l+a*s*p-t*c*p)*P,e[7]=(a*d*r-h*c*r+h*s*l-t*d*l-a*s*f+t*c*f)*P,e[8]=w*P,e[9]=(g*u*r-h*x*r-g*n*f+t*x*f+h*n*p-t*u*p)*P,e[10]=(a*x*r-g*o*r+g*n*l-t*x*l-a*n*p+t*o*p)*P,e[11]=(h*o*r-a*u*r-h*n*l+t*u*l+a*n*f-t*o*f)*P,e[12]=I*P,e[13]=(h*x*s-g*u*s+g*n*d-t*x*d-h*n*m+t*u*m)*P,e[14]=(g*o*s-a*x*s-g*n*c+t*x*c+a*n*m-t*o*m)*P,e[15]=(a*u*s-h*o*s+h*n*c-t*u*c-a*n*d+t*o*d)*P,this}scale(e){let t=this.elements,n=e.x,s=e.y,r=e.z;return t[0]*=n,t[4]*=s,t[8]*=r,t[1]*=n,t[5]*=s,t[9]*=r,t[2]*=n,t[6]*=s,t[10]*=r,t[3]*=n,t[7]*=s,t[11]*=r,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],s=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,s))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),s=Math.sin(t),r=1-n,a=e.x,o=e.y,c=e.z,l=r*a,h=r*o;return this.set(l*a+n,l*o-s*c,l*c+s*o,0,l*o+s*c,h*o+n,h*c-s*a,0,l*c-s*o,h*c+s*a,r*c*c+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,s,r,a){return this.set(1,n,r,0,e,1,a,0,t,s,1,0,0,0,0,1),this}compose(e,t,n){let s=this.elements,r=t._x,a=t._y,o=t._z,c=t._w,l=r+r,h=a+a,u=o+o,d=r*l,f=r*h,g=r*u,x=a*h,m=a*u,p=o*u,M=c*l,v=c*h,w=c*u,I=n.x,E=n.y,P=n.z;return s[0]=(1-(x+p))*I,s[1]=(f+w)*I,s[2]=(g-v)*I,s[3]=0,s[4]=(f-w)*E,s[5]=(1-(d+p))*E,s[6]=(m+M)*E,s[7]=0,s[8]=(g+v)*P,s[9]=(m-M)*P,s[10]=(1-(d+x))*P,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,t,n){let s=this.elements,r=Ms.set(s[0],s[1],s[2]).length(),a=Ms.set(s[4],s[5],s[6]).length(),o=Ms.set(s[8],s[9],s[10]).length();this.determinant()<0&&(r=-r),e.x=s[12],e.y=s[13],e.z=s[14],En.copy(this);let l=1/r,h=1/a,u=1/o;return En.elements[0]*=l,En.elements[1]*=l,En.elements[2]*=l,En.elements[4]*=h,En.elements[5]*=h,En.elements[6]*=h,En.elements[8]*=u,En.elements[9]*=u,En.elements[10]*=u,t.setFromRotationMatrix(En),n.x=r,n.y=a,n.z=o,this}makePerspective(e,t,n,s,r,a,o=Cn,c=!1){let l=this.elements,h=2*r/(t-e),u=2*r/(n-s),d=(t+e)/(t-e),f=(n+s)/(n-s),g,x;if(c)g=r/(a-r),x=a*r/(a-r);else if(o===Cn)g=-(a+r)/(a-r),x=-2*a*r/(a-r);else if(o===Nr)g=-a/(a-r),x=-a*r/(a-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return l[0]=h,l[4]=0,l[8]=d,l[12]=0,l[1]=0,l[5]=u,l[9]=f,l[13]=0,l[2]=0,l[6]=0,l[10]=g,l[14]=x,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,t,n,s,r,a,o=Cn,c=!1){let l=this.elements,h=2/(t-e),u=2/(n-s),d=-(t+e)/(t-e),f=-(n+s)/(n-s),g,x;if(c)g=1/(a-r),x=a/(a-r);else if(o===Cn)g=-2/(a-r),x=-(a+r)/(a-r);else if(o===Nr)g=-1/(a-r),x=-r/(a-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return l[0]=h,l[4]=0,l[8]=0,l[12]=d,l[1]=0,l[5]=u,l[9]=0,l[13]=f,l[2]=0,l[6]=0,l[10]=g,l[14]=x,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let s=0;s<16;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}},Ms=new D,En=new We,jm=new D(0,0,0),$m=new D(1,1,1),Si=new D,ja=new D,on=new D,yd=new We,vd=new Kt,In=class i{constructor(e=0,t=0,n=0,s=i.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,s=this._order){return this._x=e,this._y=t,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let s=e.elements,r=s[0],a=s[4],o=s[8],c=s[1],l=s[5],h=s[9],u=s[2],d=s[6],f=s[10];switch(t){case"XYZ":this._y=Math.asin(qe(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-a,r)):(this._x=Math.atan2(d,l),this._z=0);break;case"YXZ":this._x=Math.asin(-qe(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-u,r),this._z=0);break;case"ZXY":this._x=Math.asin(qe(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-a,l)):(this._y=0,this._z=Math.atan2(c,r));break;case"ZYX":this._y=Math.asin(-qe(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(c,r)):(this._x=0,this._z=Math.atan2(-a,l));break;case"YZX":this._z=Math.asin(qe(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-h,l),this._y=Math.atan2(-u,r)):(this._x=0,this._y=Math.atan2(o,f));break;case"XZY":this._z=Math.asin(-qe(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(d,l),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-h,f),this._y=0);break;default:Re("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return yd.makeRotationFromQuaternion(e),this.setFromRotationMatrix(yd,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return vd.setFromEuler(this),this.setFromQuaternion(vd,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};In.DEFAULT_ORDER="XYZ";var Fr=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}},Qm=0,bd=new D,ws=new Kt,ni=new We,$a=new D,Sr=new D,e0=new D,t0=new Kt,Sd=new D(1,0,0),Md=new D(0,1,0),wd=new D(0,0,1),Ed={type:"added"},n0={type:"removed"},Es={type:"childadded",child:null},Al={type:"childremoved",child:null},xt=class i extends Vn{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Qm++}),this.uuid=_n(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=i.DEFAULT_UP.clone();let e=new D,t=new In,n=new Kt,s=new D(1,1,1);function r(){n.setFromEuler(t,!1)}function a(){t.setFromQuaternion(n,void 0,!1)}t._onChange(r),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new We},normalMatrix:{value:new Xe}}),this.matrix=new We,this.matrixWorld=new We,this.matrixAutoUpdate=i.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=i.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Fr,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return ws.setFromAxisAngle(e,t),this.quaternion.multiply(ws),this}rotateOnWorldAxis(e,t){return ws.setFromAxisAngle(e,t),this.quaternion.premultiply(ws),this}rotateX(e){return this.rotateOnAxis(Sd,e)}rotateY(e){return this.rotateOnAxis(Md,e)}rotateZ(e){return this.rotateOnAxis(wd,e)}translateOnAxis(e,t){return bd.copy(e).applyQuaternion(this.quaternion),this.position.add(bd.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Sd,e)}translateY(e){return this.translateOnAxis(Md,e)}translateZ(e){return this.translateOnAxis(wd,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(ni.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?$a.copy(e):$a.set(e,t,n);let s=this.parent;this.updateWorldMatrix(!0,!1),Sr.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?ni.lookAt(Sr,$a,this.up):ni.lookAt($a,Sr,this.up),this.quaternion.setFromRotationMatrix(ni),s&&(ni.extractRotation(s.matrixWorld),ws.setFromRotationMatrix(ni),this.quaternion.premultiply(ws.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Je("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Ed),Es.child=e,this.dispatchEvent(Es),Es.child=null):Je("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(n0),Al.child=e,this.dispatchEvent(Al),Al.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),ni.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),ni.multiply(e.parent.matrixWorld)),e.applyMatrix4(ni),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Ed),Es.child=e,this.dispatchEvent(Es),Es.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,s=this.children.length;n<s;n++){let a=this.children[n].getObjectByProperty(e,t);if(a!==void 0)return a}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Sr,e,e0),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Sr,t0,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){let n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){let s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].updateWorldMatrix(!1,!0)}}toJSON(e){let t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(o=>({...o})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(e),s.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(o,c){return o[c.uuid]===void 0&&(o[c.uuid]=c.toJSON(e)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(e.geometries,this.geometry);let o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){let c=o.shapes;if(Array.isArray(c))for(let l=0,h=c.length;l<h;l++){let u=c[l];r(e.shapes,u)}else r(e.shapes,c)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let o=[];for(let c=0,l=this.material.length;c<l;c++)o.push(r(e.materials,this.material[c]));s.material=o}else s.material=r(e.materials,this.material);if(this.children.length>0){s.children=[];for(let o=0;o<this.children.length;o++)s.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){s.animations=[];for(let o=0;o<this.animations.length;o++){let c=this.animations[o];s.animations.push(r(e.animations,c))}}if(t){let o=a(e.geometries),c=a(e.materials),l=a(e.textures),h=a(e.images),u=a(e.shapes),d=a(e.skeletons),f=a(e.animations),g=a(e.nodes);o.length>0&&(n.geometries=o),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),h.length>0&&(n.images=h),u.length>0&&(n.shapes=u),d.length>0&&(n.skeletons=d),f.length>0&&(n.animations=f),g.length>0&&(n.nodes=g)}return n.object=s,n;function a(o){let c=[];for(let l in o){let h=o[l];delete h.metadata,c.push(h)}return c}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){let s=e.children[n];this.add(s.clone())}return this}};xt.DEFAULT_UP=new D(0,1,0);xt.DEFAULT_MATRIX_AUTO_UPDATE=!0;xt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var Tn=new D,ii=new D,Cl=new D,si=new D,Ts=new D,As=new D,Td=new D,Rl=new D,Il=new D,Pl=new D,Ll=new it,Dl=new it,Nl=new it,Ei=class i{constructor(e=new D,t=new D,n=new D){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,s){s.subVectors(n,t),Tn.subVectors(e,t),s.cross(Tn);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(e,t,n,s,r){Tn.subVectors(s,t),ii.subVectors(n,t),Cl.subVectors(e,t);let a=Tn.dot(Tn),o=Tn.dot(ii),c=Tn.dot(Cl),l=ii.dot(ii),h=ii.dot(Cl),u=a*l-o*o;if(u===0)return r.set(0,0,0),null;let d=1/u,f=(l*c-o*h)*d,g=(a*h-o*c)*d;return r.set(1-f-g,g,f)}static containsPoint(e,t,n,s){return this.getBarycoord(e,t,n,s,si)===null?!1:si.x>=0&&si.y>=0&&si.x+si.y<=1}static getInterpolation(e,t,n,s,r,a,o,c){return this.getBarycoord(e,t,n,s,si)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(r,si.x),c.addScaledVector(a,si.y),c.addScaledVector(o,si.z),c)}static getInterpolatedAttribute(e,t,n,s,r,a){return Ll.setScalar(0),Dl.setScalar(0),Nl.setScalar(0),Ll.fromBufferAttribute(e,t),Dl.fromBufferAttribute(e,n),Nl.fromBufferAttribute(e,s),a.setScalar(0),a.addScaledVector(Ll,r.x),a.addScaledVector(Dl,r.y),a.addScaledVector(Nl,r.z),a}static isFrontFacing(e,t,n,s){return Tn.subVectors(n,t),ii.subVectors(e,t),Tn.cross(ii).dot(s)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,s){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[s]),this}setFromAttributeAndIndices(e,t,n,s){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,s),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Tn.subVectors(this.c,this.b),ii.subVectors(this.a,this.b),Tn.cross(ii).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return i.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return i.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,s,r){return i.getInterpolation(e,this.a,this.b,this.c,t,n,s,r)}containsPoint(e){return i.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return i.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,s=this.b,r=this.c,a,o;Ts.subVectors(s,n),As.subVectors(r,n),Rl.subVectors(e,n);let c=Ts.dot(Rl),l=As.dot(Rl);if(c<=0&&l<=0)return t.copy(n);Il.subVectors(e,s);let h=Ts.dot(Il),u=As.dot(Il);if(h>=0&&u<=h)return t.copy(s);let d=c*u-h*l;if(d<=0&&c>=0&&h<=0)return a=c/(c-h),t.copy(n).addScaledVector(Ts,a);Pl.subVectors(e,r);let f=Ts.dot(Pl),g=As.dot(Pl);if(g>=0&&f<=g)return t.copy(r);let x=f*l-c*g;if(x<=0&&l>=0&&g<=0)return o=l/(l-g),t.copy(n).addScaledVector(As,o);let m=h*g-f*u;if(m<=0&&u-h>=0&&f-g>=0)return Td.subVectors(r,s),o=(u-h)/(u-h+(f-g)),t.copy(s).addScaledVector(Td,o);let p=1/(m+x+d);return a=x*p,o=d*p,t.copy(n).addScaledVector(Ts,a).addScaledVector(As,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},Xf={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Mi={h:0,s:0,l:0},Qa={h:0,s:0,l:0};function Ul(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}var Oe=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let s=e;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Et){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,tt.colorSpaceToWorking(this,t),this}setRGB(e,t,n,s=tt.workingColorSpace){return this.r=e,this.g=t,this.b=n,tt.colorSpaceToWorking(this,s),this}setHSL(e,t,n,s=tt.workingColorSpace){if(e=Ah(e,1),t=qe(t,0,1),n=qe(n,0,1),t===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+t):n+t-n*t,a=2*n-r;this.r=Ul(a,r,e+1/3),this.g=Ul(a,r,e),this.b=Ul(a,r,e-1/3)}return tt.colorSpaceToWorking(this,s),this}setStyle(e,t=Et){function n(r){r!==void 0&&parseFloat(r)<1&&Re("Color: Alpha component of "+e+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(e)){let r,a=s[1],o=s[2];switch(a){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:Re("Color: Unknown color model "+e)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(e)){let r=s[1],a=r.length;if(a===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(a===6)return this.setHex(parseInt(r,16),t);Re("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Et){let n=Xf[e.toLowerCase()];return n!==void 0?this.setHex(n,t):Re("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=ai(e.r),this.g=ai(e.g),this.b=ai(e.b),this}copyLinearToSRGB(e){return this.r=Ds(e.r),this.g=Ds(e.g),this.b=Ds(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Et){return tt.workingToColorSpace(zt.copy(this),e),Math.round(qe(zt.r*255,0,255))*65536+Math.round(qe(zt.g*255,0,255))*256+Math.round(qe(zt.b*255,0,255))}getHexString(e=Et){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=tt.workingColorSpace){tt.workingToColorSpace(zt.copy(this),t);let n=zt.r,s=zt.g,r=zt.b,a=Math.max(n,s,r),o=Math.min(n,s,r),c,l,h=(o+a)/2;if(o===a)c=0,l=0;else{let u=a-o;switch(l=h<=.5?u/(a+o):u/(2-a-o),a){case n:c=(s-r)/u+(s<r?6:0);break;case s:c=(r-n)/u+2;break;case r:c=(n-s)/u+4;break}c/=6}return e.h=c,e.s=l,e.l=h,e}getRGB(e,t=tt.workingColorSpace){return tt.workingToColorSpace(zt.copy(this),t),e.r=zt.r,e.g=zt.g,e.b=zt.b,e}getStyle(e=Et){tt.workingToColorSpace(zt.copy(this),e);let t=zt.r,n=zt.g,s=zt.b;return e!==Et?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(e,t,n){return this.getHSL(Mi),this.setHSL(Mi.h+e,Mi.s+t,Mi.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Mi),e.getHSL(Qa);let n=Ir(Mi.h,Qa.h,t),s=Ir(Mi.s,Qa.s,t),r=Ir(Mi.l,Qa.l,t);return this.setHSL(n,s,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,s=this.b,r=e.elements;return this.r=r[0]*t+r[3]*n+r[6]*s,this.g=r[1]*t+r[4]*n+r[7]*s,this.b=r[2]*t+r[5]*n+r[8]*s,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},zt=new Oe;Oe.NAMES=Xf;var i0=0,en=class extends Vn{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:i0++}),this.uuid=_n(),this.name="",this.type="Material",this.blending=Ki,this.side=Rn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=bo,this.blendDst=So,this.blendEquation=Ti,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Oe(0,0,0),this.blendAlpha=0,this.depthFunc=Zi,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=$l,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=qi,this.stencilZFail=qi,this.stencilZPass=qi,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){Re(`Material: parameter '${t}' has value of undefined.`);continue}let s=this[t];if(s===void 0){Re(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==Ki&&(n.blending=this.blending),this.side!==Rn&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==bo&&(n.blendSrc=this.blendSrc),this.blendDst!==So&&(n.blendDst=this.blendDst),this.blendEquation!==Ti&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==Zi&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==$l&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==qi&&(n.stencilFail=this.stencilFail),this.stencilZFail!==qi&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==qi&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){let a=[];for(let o in r){let c=r[o];delete c.metadata,a.push(c)}return a}if(t){let r=s(e.textures),a=s(e.images);r.length>0&&(n.textures=r),a.length>0&&(n.images=a)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let s=t.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}},Pn=class extends en{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Oe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new In,this.combine=ph,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}};var Tt=new D,eo=new ie,s0=0,Ct=class{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:s0++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=Mo,this.updateRanges=[],this.gpuType=bn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[e+s]=t.array[n+s];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)eo.fromBufferAttribute(this,t),eo.applyMatrix3(e),this.setXY(t,eo.x,eo.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)Tt.fromBufferAttribute(this,t),Tt.applyMatrix3(e),this.setXYZ(t,Tt.x,Tt.y,Tt.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)Tt.fromBufferAttribute(this,t),Tt.applyMatrix4(e),this.setXYZ(t,Tt.x,Tt.y,Tt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Tt.fromBufferAttribute(this,t),Tt.applyNormalMatrix(e),this.setXYZ(t,Tt.x,Tt.y,Tt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Tt.fromBufferAttribute(this,t),Tt.transformDirection(e),this.setXYZ(t,Tt.x,Tt.y,Tt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=An(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=ot(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=An(t,this.array)),t}setX(e,t){return this.normalized&&(t=ot(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=An(t,this.array)),t}setY(e,t){return this.normalized&&(t=ot(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=An(t,this.array)),t}setZ(e,t){return this.normalized&&(t=ot(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=An(t,this.array)),t}setW(e,t){return this.normalized&&(t=ot(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=ot(t,this.array),n=ot(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,s){return e*=this.itemSize,this.normalized&&(t=ot(t,this.array),n=ot(n,this.array),s=ot(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e*=this.itemSize,this.normalized&&(t=ot(t,this.array),n=ot(n,this.array),s=ot(s,this.array),r=ot(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Mo&&(e.usage=this.usage),e}};var Br=class extends Ct{constructor(e,t,n){super(new Uint16Array(e),t,n)}};var kr=class extends Ct{constructor(e,t,n){super(new Uint32Array(e),t,n)}};var Dt=class extends Ct{constructor(e,t,n){super(new Float32Array(e),t,n)}},r0=0,mn=new We,Ol=new xt,Cs=new D,cn=new Zt,Mr=new Zt,Lt=new D,Vt=class i extends Vn{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:r0++}),this.uuid=_n(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Th(e)?kr:Br)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let r=new Xe().getNormalMatrix(e);n.applyNormalMatrix(r),n.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(e),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return mn.makeRotationFromQuaternion(e),this.applyMatrix4(mn),this}rotateX(e){return mn.makeRotationX(e),this.applyMatrix4(mn),this}rotateY(e){return mn.makeRotationY(e),this.applyMatrix4(mn),this}rotateZ(e){return mn.makeRotationZ(e),this.applyMatrix4(mn),this}translate(e,t,n){return mn.makeTranslation(e,t,n),this.applyMatrix4(mn),this}scale(e,t,n){return mn.makeScale(e,t,n),this.applyMatrix4(mn),this}lookAt(e){return Ol.lookAt(e),Ol.updateMatrix(),this.applyMatrix4(Ol.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Cs).negate(),this.translate(Cs.x,Cs.y,Cs.z),this}setFromPoints(e){let t=this.getAttribute("position");if(t===void 0){let n=[];for(let s=0,r=e.length;s<r;s++){let a=e[s];n.push(a.x,a.y,a.z||0)}this.setAttribute("position",new Dt(n,3))}else{let n=Math.min(e.length,t.count);for(let s=0;s<n;s++){let r=e[s];t.setXYZ(s,r.x,r.y,r.z||0)}e.length>t.count&&Re("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Zt);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Je("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new D(-1/0,-1/0,-1/0),new D(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,s=t.length;n<s;n++){let r=t[n];cn.setFromBufferAttribute(r),this.morphTargetsRelative?(Lt.addVectors(this.boundingBox.min,cn.min),this.boundingBox.expandByPoint(Lt),Lt.addVectors(this.boundingBox.max,cn.max),this.boundingBox.expandByPoint(Lt)):(this.boundingBox.expandByPoint(cn.min),this.boundingBox.expandByPoint(cn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Je('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Qt);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Je("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new D,1/0);return}if(e){let n=this.boundingSphere.center;if(cn.setFromBufferAttribute(e),t)for(let r=0,a=t.length;r<a;r++){let o=t[r];Mr.setFromBufferAttribute(o),this.morphTargetsRelative?(Lt.addVectors(cn.min,Mr.min),cn.expandByPoint(Lt),Lt.addVectors(cn.max,Mr.max),cn.expandByPoint(Lt)):(cn.expandByPoint(Mr.min),cn.expandByPoint(Mr.max))}cn.getCenter(n);let s=0;for(let r=0,a=e.count;r<a;r++)Lt.fromBufferAttribute(e,r),s=Math.max(s,n.distanceToSquared(Lt));if(t)for(let r=0,a=t.length;r<a;r++){let o=t[r],c=this.morphTargetsRelative;for(let l=0,h=o.count;l<h;l++)Lt.fromBufferAttribute(o,l),c&&(Cs.fromBufferAttribute(e,l),Lt.add(Cs)),s=Math.max(s,n.distanceToSquared(Lt))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&Je('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Je("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=t.position,s=t.normal,r=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Ct(new Float32Array(4*n.count),4));let a=this.getAttribute("tangent"),o=[],c=[];for(let O=0;O<n.count;O++)o[O]=new D,c[O]=new D;let l=new D,h=new D,u=new D,d=new ie,f=new ie,g=new ie,x=new D,m=new D;function p(O,S,y){l.fromBufferAttribute(n,O),h.fromBufferAttribute(n,S),u.fromBufferAttribute(n,y),d.fromBufferAttribute(r,O),f.fromBufferAttribute(r,S),g.fromBufferAttribute(r,y),h.sub(l),u.sub(l),f.sub(d),g.sub(d);let R=1/(f.x*g.y-g.x*f.y);isFinite(R)&&(x.copy(h).multiplyScalar(g.y).addScaledVector(u,-f.y).multiplyScalar(R),m.copy(u).multiplyScalar(f.x).addScaledVector(h,-g.x).multiplyScalar(R),o[O].add(x),o[S].add(x),o[y].add(x),c[O].add(m),c[S].add(m),c[y].add(m))}let M=this.groups;M.length===0&&(M=[{start:0,count:e.count}]);for(let O=0,S=M.length;O<S;++O){let y=M[O],R=y.start,L=y.count;for(let k=R,z=R+L;k<z;k+=3)p(e.getX(k+0),e.getX(k+1),e.getX(k+2))}let v=new D,w=new D,I=new D,E=new D;function P(O){I.fromBufferAttribute(s,O),E.copy(I);let S=o[O];v.copy(S),v.sub(I.multiplyScalar(I.dot(S))).normalize(),w.crossVectors(E,S);let R=w.dot(c[O])<0?-1:1;a.setXYZW(O,v.x,v.y,v.z,R)}for(let O=0,S=M.length;O<S;++O){let y=M[O],R=y.start,L=y.count;for(let k=R,z=R+L;k<z;k+=3)P(e.getX(k+0)),P(e.getX(k+1)),P(e.getX(k+2))}}computeVertexNormals(){let e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new Ct(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let d=0,f=n.count;d<f;d++)n.setXYZ(d,0,0,0);let s=new D,r=new D,a=new D,o=new D,c=new D,l=new D,h=new D,u=new D;if(e)for(let d=0,f=e.count;d<f;d+=3){let g=e.getX(d+0),x=e.getX(d+1),m=e.getX(d+2);s.fromBufferAttribute(t,g),r.fromBufferAttribute(t,x),a.fromBufferAttribute(t,m),h.subVectors(a,r),u.subVectors(s,r),h.cross(u),o.fromBufferAttribute(n,g),c.fromBufferAttribute(n,x),l.fromBufferAttribute(n,m),o.add(h),c.add(h),l.add(h),n.setXYZ(g,o.x,o.y,o.z),n.setXYZ(x,c.x,c.y,c.z),n.setXYZ(m,l.x,l.y,l.z)}else for(let d=0,f=t.count;d<f;d+=3)s.fromBufferAttribute(t,d+0),r.fromBufferAttribute(t,d+1),a.fromBufferAttribute(t,d+2),h.subVectors(a,r),u.subVectors(s,r),h.cross(u),n.setXYZ(d+0,h.x,h.y,h.z),n.setXYZ(d+1,h.x,h.y,h.z),n.setXYZ(d+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Lt.fromBufferAttribute(e,t),Lt.normalize(),e.setXYZ(t,Lt.x,Lt.y,Lt.z)}toNonIndexed(){function e(o,c){let l=o.array,h=o.itemSize,u=o.normalized,d=new l.constructor(c.length*h),f=0,g=0;for(let x=0,m=c.length;x<m;x++){o.isInterleavedBufferAttribute?f=c[x]*o.data.stride+o.offset:f=c[x]*h;for(let p=0;p<h;p++)d[g++]=l[f++]}return new Ct(d,h,u)}if(this.index===null)return Re("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let t=new i,n=this.index.array,s=this.attributes;for(let o in s){let c=s[o],l=e(c,n);t.setAttribute(o,l)}let r=this.morphAttributes;for(let o in r){let c=[],l=r[o];for(let h=0,u=l.length;h<u;h++){let d=l[h],f=e(d,n);c.push(f)}t.morphAttributes[o]=c}t.morphTargetsRelative=this.morphTargetsRelative;let a=this.groups;for(let o=0,c=a.length;o<c;o++){let l=a[o];t.addGroup(l.start,l.count,l.materialIndex)}return t}toJSON(){let e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){let c=this.parameters;for(let l in c)c[l]!==void 0&&(e[l]=c[l]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let c in n){let l=n[c];e.data.attributes[c]=l.toJSON(e.data)}let s={},r=!1;for(let c in this.morphAttributes){let l=this.morphAttributes[c],h=[];for(let u=0,d=l.length;u<d;u++){let f=l[u];h.push(f.toJSON(e.data))}h.length>0&&(s[c]=h,r=!0)}r&&(e.data.morphAttributes=s,e.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone());let s=e.attributes;for(let l in s){let h=s[l];this.setAttribute(l,h.clone(t))}let r=e.morphAttributes;for(let l in r){let h=[],u=r[l];for(let d=0,f=u.length;d<f;d++)h.push(u[d].clone(t));this.morphAttributes[l]=h}this.morphTargetsRelative=e.morphTargetsRelative;let a=e.groups;for(let l=0,h=a.length;l<h;l++){let u=a[l];this.addGroup(u.start,u.count,u.materialIndex)}let o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());let c=e.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}},Ad=new We,Wi=new oi,to=new Qt,Cd=new D,no=new D,io=new D,so=new D,Fl=new D,ro=new D,Rd=new D,ao=new D,Ht=class extends xt{constructor(e=new Vt,t=new Pn){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(e,t){let n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(s,e);let o=this.morphTargetInfluences;if(r&&o){ro.set(0,0,0);for(let c=0,l=r.length;c<l;c++){let h=o[c],u=r[c];h!==0&&(Fl.fromBufferAttribute(u,e),a?ro.addScaledVector(Fl,h):ro.addScaledVector(Fl.sub(t),h))}t.add(ro)}return t}raycast(e,t){let n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),to.copy(n.boundingSphere),to.applyMatrix4(r),Wi.copy(e.ray).recast(e.near),!(to.containsPoint(Wi.origin)===!1&&(Wi.intersectSphere(to,Cd)===null||Wi.origin.distanceToSquared(Cd)>(e.far-e.near)**2))&&(Ad.copy(r).invert(),Wi.copy(e.ray).applyMatrix4(Ad),!(n.boundingBox!==null&&Wi.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Wi)))}_computeIntersections(e,t,n){let s,r=this.geometry,a=this.material,o=r.index,c=r.attributes.position,l=r.attributes.uv,h=r.attributes.uv1,u=r.attributes.normal,d=r.groups,f=r.drawRange;if(o!==null)if(Array.isArray(a))for(let g=0,x=d.length;g<x;g++){let m=d[g],p=a[m.materialIndex],M=Math.max(m.start,f.start),v=Math.min(o.count,Math.min(m.start+m.count,f.start+f.count));for(let w=M,I=v;w<I;w+=3){let E=o.getX(w),P=o.getX(w+1),O=o.getX(w+2);s=oo(this,p,e,n,l,h,u,E,P,O),s&&(s.faceIndex=Math.floor(w/3),s.face.materialIndex=m.materialIndex,t.push(s))}}else{let g=Math.max(0,f.start),x=Math.min(o.count,f.start+f.count);for(let m=g,p=x;m<p;m+=3){let M=o.getX(m),v=o.getX(m+1),w=o.getX(m+2);s=oo(this,a,e,n,l,h,u,M,v,w),s&&(s.faceIndex=Math.floor(m/3),t.push(s))}}else if(c!==void 0)if(Array.isArray(a))for(let g=0,x=d.length;g<x;g++){let m=d[g],p=a[m.materialIndex],M=Math.max(m.start,f.start),v=Math.min(c.count,Math.min(m.start+m.count,f.start+f.count));for(let w=M,I=v;w<I;w+=3){let E=w,P=w+1,O=w+2;s=oo(this,p,e,n,l,h,u,E,P,O),s&&(s.faceIndex=Math.floor(w/3),s.face.materialIndex=m.materialIndex,t.push(s))}}else{let g=Math.max(0,f.start),x=Math.min(c.count,f.start+f.count);for(let m=g,p=x;m<p;m+=3){let M=m,v=m+1,w=m+2;s=oo(this,a,e,n,l,h,u,M,v,w),s&&(s.faceIndex=Math.floor(m/3),t.push(s))}}}};function a0(i,e,t,n,s,r,a,o){let c;if(e.side===Jt?c=n.intersectTriangle(a,r,s,!0,o):c=n.intersectTriangle(s,r,a,e.side===Rn,o),c===null)return null;ao.copy(o),ao.applyMatrix4(i.matrixWorld);let l=t.ray.origin.distanceTo(ao);return l<t.near||l>t.far?null:{distance:l,point:ao.clone(),object:i}}function oo(i,e,t,n,s,r,a,o,c,l){i.getVertexPosition(o,no),i.getVertexPosition(c,io),i.getVertexPosition(l,so);let h=a0(i,e,t,n,no,io,so,Rd);if(h){let u=new D;Ei.getBarycoord(Rd,no,io,so,u),s&&(h.uv=Ei.getInterpolatedAttribute(s,o,c,l,u,new ie)),r&&(h.uv1=Ei.getInterpolatedAttribute(r,o,c,l,u,new ie)),a&&(h.normal=Ei.getInterpolatedAttribute(a,o,c,l,u,new D),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));let d={a:o,b:c,c:l,normal:new D,materialIndex:0};Ei.getNormal(no,io,so,d.normal),h.face=d,h.barycoord=u}return h}var Ln=class i extends Vt{constructor(e=1,t=1,n=1,s=1,r=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:s,heightSegments:r,depthSegments:a};let o=this;s=Math.floor(s),r=Math.floor(r),a=Math.floor(a);let c=[],l=[],h=[],u=[],d=0,f=0;g("z","y","x",-1,-1,n,t,e,a,r,0),g("z","y","x",1,-1,n,t,-e,a,r,1),g("x","z","y",1,1,e,n,t,s,a,2),g("x","z","y",1,-1,e,n,-t,s,a,3),g("x","y","z",1,-1,e,t,n,s,r,4),g("x","y","z",-1,-1,e,t,-n,s,r,5),this.setIndex(c),this.setAttribute("position",new Dt(l,3)),this.setAttribute("normal",new Dt(h,3)),this.setAttribute("uv",new Dt(u,2));function g(x,m,p,M,v,w,I,E,P,O,S){let y=w/P,R=I/O,L=w/2,k=I/2,z=E/2,G=P+1,X=O+1,re=0,Y=0,ae=new D;for(let le=0;le<X;le++){let Ee=le*R-k;for(let Ze=0;Ze<G;Ze++){let Qe=Ze*y-L;ae[x]=Qe*M,ae[m]=Ee*v,ae[p]=z,l.push(ae.x,ae.y,ae.z),ae[x]=0,ae[m]=0,ae[p]=E>0?1:-1,h.push(ae.x,ae.y,ae.z),u.push(Ze/P),u.push(1-le/O),re+=1}}for(let le=0;le<O;le++)for(let Ee=0;Ee<P;Ee++){let Ze=d+Ee+G*le,Qe=d+Ee+G*(le+1),rt=d+(Ee+1)+G*(le+1),at=d+(Ee+1)+G*le;c.push(Ze,Qe,at),c.push(Qe,rt,at),Y+=6}o.addGroup(f,Y,S),f+=Y,d+=re}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}};function cs(i){let e={};for(let t in i){e[t]={};for(let n in i[t]){let s=i[t][n];s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)?s.isRenderTargetTexture?(Re("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=s.clone():Array.isArray(s)?e[t][n]=s.slice():e[t][n]=s}}return e}function Gt(i){let e={};for(let t=0;t<i.length;t++){let n=cs(i[t]);for(let s in n)e[s]=n[s]}return e}function o0(i){let e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function Ch(i){let e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:tt.workingColorSpace}var qf={clone:cs,merge:Gt},c0=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,l0=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,yn=class extends en{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=c0,this.fragmentShader=l0,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=cs(e.uniforms),this.uniformsGroups=o0(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let s in this.uniforms){let a=this.uniforms[s].value;a&&a.isTexture?t.uniforms[s]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[s]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[s]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[s]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[s]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[s]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[s]={type:"m4",value:a.toArray()}:t.uniforms[s]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}},zr=class extends xt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new We,this.projectionMatrix=new We,this.projectionMatrixInverse=new We,this.coordinateSystem=Cn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}},wi=new D,Id=new ie,Pd=new ie,At=class extends zr{constructor(e=50,t=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=$i*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(Rr*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return $i*2*Math.atan(Math.tan(Rr*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){wi.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(wi.x,wi.y).multiplyScalar(-e/wi.z),wi.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(wi.x,wi.y).multiplyScalar(-e/wi.z)}getViewSize(e,t){return this.getViewBounds(e,Id,Pd),t.subVectors(Pd,Id)}setViewOffset(e,t,n,s,r,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(Rr*.5*this.fov)/this.zoom,n=2*t,s=this.aspect*n,r=-.5*s,a=this.view;if(this.view!==null&&this.view.enabled){let c=a.fullWidth,l=a.fullHeight;r+=a.offsetX*s/c,t-=a.offsetY*n/l,s*=a.width/c,n*=a.height/l}let o=this.filmOffset;o!==0&&(r+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}},Rs=-90,Is=1,Ao=class extends xt{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new At(Rs,Is,e,t);s.layers=this.layers,this.add(s);let r=new At(Rs,Is,e,t);r.layers=this.layers,this.add(r);let a=new At(Rs,Is,e,t);a.layers=this.layers,this.add(a);let o=new At(Rs,Is,e,t);o.layers=this.layers,this.add(o);let c=new At(Rs,Is,e,t);c.layers=this.layers,this.add(c);let l=new At(Rs,Is,e,t);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,s,r,a,o,c]=t;for(let l of t)this.remove(l);if(e===Cn)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(e===Nr)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(let l of t)this.add(l),l.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[r,a,o,c,l,h]=this.children,u=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;let x=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0,s),e.render(t,r),e.setRenderTarget(n,1,s),e.render(t,a),e.setRenderTarget(n,2,s),e.render(t,o),e.setRenderTarget(n,3,s),e.render(t,c),e.setRenderTarget(n,4,s),e.render(t,l),n.texture.generateMipmaps=x,e.setRenderTarget(n,5,s),e.render(t,h),e.setRenderTarget(u,d,f),e.xr.enabled=g,n.texture.needsPMREMUpdate=!0}},Vr=class extends Nt{constructor(e=[],t=ss,n,s,r,a,o,c,l,h){super(e,t,n,s,r,a,o,c,l,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},Co=class extends Hn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},s=[n,n,n,n,n,n];this.texture=new Vr(s),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new Ln(5,5,5),r=new yn({name:"CubemapFromEquirect",uniforms:cs(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Jt,blending:Kn});r.uniforms.tEquirect.value=t;let a=new Ht(s,r),o=t.minFilter;return t.minFilter===Dn&&(t.minFilter=Ft),new Ao(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,s=!0){let r=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,n,s);e.setRenderTarget(r)}},ln=class extends xt{constructor(){super(),this.isGroup=!0,this.type="Group"}},h0={type:"move"},zs=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new ln,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new ln,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new D,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new D),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new ln,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new D,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new D),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let s=null,r=null,a=null,o=this._targetRay,c=this._grip,l=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(l&&e.hand){a=!0;for(let x of e.hand.values()){let m=t.getJointPose(x,n),p=this._getHandJoint(l,x);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}let h=l.joints["index-finger-tip"],u=l.joints["thumb-tip"],d=h.position.distanceTo(u.position),f=.02,g=.005;l.inputState.pinching&&d>f+g?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!l.inputState.pinching&&d<=f-g&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else c!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,n),r!==null&&(c.matrix.fromArray(r.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,r.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(r.linearVelocity)):c.hasLinearVelocity=!1,r.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(r.angularVelocity)):c.hasAngularVelocity=!1));o!==null&&(s=t.getPose(e.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(o.matrix.fromArray(s.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,s.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(s.linearVelocity)):o.hasLinearVelocity=!1,s.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(s.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(h0)))}return o!==null&&(o.visible=s!==null),c!==null&&(c.visible=r!==null),l!==null&&(l.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new ln;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}};var Hr=class extends xt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new In,this.environmentIntensity=1,this.environmentRotation=new In,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}},Vs=class{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=Mo,this.updateRanges=[],this.version=0,this.uuid=_n()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let s=0,r=this.stride;s<r;s++)this.array[e+s]=t.array[n+s];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=_n()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=_n()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}},Yt=new D,Hs=class i{constructor(e,t,n,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=n,this.normalized=s}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)Yt.fromBufferAttribute(this,t),Yt.applyMatrix4(e),this.setXYZ(t,Yt.x,Yt.y,Yt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Yt.fromBufferAttribute(this,t),Yt.applyNormalMatrix(e),this.setXYZ(t,Yt.x,Yt.y,Yt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Yt.fromBufferAttribute(this,t),Yt.transformDirection(e),this.setXYZ(t,Yt.x,Yt.y,Yt.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=An(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=ot(n,this.array)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=ot(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=ot(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=ot(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=ot(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=An(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=An(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=An(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=An(t,this.array)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=ot(t,this.array),n=ot(n,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,s){return e=e*this.data.stride+this.offset,this.normalized&&(t=ot(t,this.array),n=ot(n,this.array),s=ot(s,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=ot(t,this.array),n=ot(n,this.array),s=ot(s,this.array),r=ot(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=s,this.data.array[e+3]=r,this}clone(e){if(e===void 0){Ur("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let t=[];for(let n=0;n<this.count;n++){let s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return new Ct(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new i(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){Ur("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let t=[];for(let n=0;n<this.count;n++){let s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}};var Ld=new D,Dd=new it,Nd=new it,u0=new D,Ud=new We,co=new D,Bl=new Qt,Od=new We,kl=new oi,Gr=class extends Ht{constructor(e,t){super(e,t),this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode=Kl,this.bindMatrix=new We,this.bindMatrixInverse=new We,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){let e=this.geometry;this.boundingBox===null&&(this.boundingBox=new Zt),this.boundingBox.makeEmpty();let t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,co),this.boundingBox.expandByPoint(co)}computeBoundingSphere(){let e=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new Qt),this.boundingSphere.makeEmpty();let t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,co),this.boundingSphere.expandByPoint(co)}copy(e,t){return super.copy(e,t),this.bindMode=e.bindMode,this.bindMatrix.copy(e.bindMatrix),this.bindMatrixInverse.copy(e.bindMatrixInverse),this.skeleton=e.skeleton,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}raycast(e,t){let n=this.material,s=this.matrixWorld;n!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Bl.copy(this.boundingSphere),Bl.applyMatrix4(s),e.ray.intersectsSphere(Bl)!==!1&&(Od.copy(s).invert(),kl.copy(e.ray).applyMatrix4(Od),!(this.boundingBox!==null&&kl.intersectsBox(this.boundingBox)===!1)&&this._computeIntersections(e,t,kl)))}getVertexPosition(e,t){return super.getVertexPosition(e,t),this.applyBoneTransform(e,t),t}bind(e,t){this.skeleton=e,t===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),t=this.matrixWorld),this.bindMatrix.copy(t),this.bindMatrixInverse.copy(t).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){let e=new it,t=this.geometry.attributes.skinWeight;for(let n=0,s=t.count;n<s;n++){e.fromBufferAttribute(t,n);let r=1/e.manhattanLength();r!==1/0?e.multiplyScalar(r):e.set(1,0,0,0),t.setXYZW(n,e.x,e.y,e.z,e.w)}}updateMatrixWorld(e){super.updateMatrixWorld(e),this.bindMode===Kl?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode===Pf?this.bindMatrixInverse.copy(this.bindMatrix).invert():Re("SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform(e,t){let n=this.skeleton,s=this.geometry;Dd.fromBufferAttribute(s.attributes.skinIndex,e),Nd.fromBufferAttribute(s.attributes.skinWeight,e),Ld.copy(t).applyMatrix4(this.bindMatrix),t.set(0,0,0);for(let r=0;r<4;r++){let a=Nd.getComponent(r);if(a!==0){let o=Dd.getComponent(r);Ud.multiplyMatrices(n.bones[o].matrixWorld,n.boneInverses[o]),t.addScaledVector(u0.copy(Ld).applyMatrix4(Ud),a)}}return t.applyMatrix4(this.bindMatrixInverse)}},Gs=class extends xt{constructor(){super(),this.isBone=!0,this.type="Bone"}},Ws=class extends Nt{constructor(e=null,t=1,n=1,s,r,a,o,c,l=Ot,h=Ot,u,d){super(null,a,o,c,l,h,s,r,u,d),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},Fd=new We,d0=new We,Wr=class i{constructor(e=[],t=[]){this.uuid=_n(),this.bones=e.slice(0),this.boneInverses=t,this.boneMatrices=null,this.boneTexture=null,this.init()}init(){let e=this.bones,t=this.boneInverses;if(this.boneMatrices=new Float32Array(e.length*16),t.length===0)this.calculateInverses();else if(e.length!==t.length){Re("Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let n=0,s=this.bones.length;n<s;n++)this.boneInverses.push(new We)}}calculateInverses(){this.boneInverses.length=0;for(let e=0,t=this.bones.length;e<t;e++){let n=new We;this.bones[e]&&n.copy(this.bones[e].matrixWorld).invert(),this.boneInverses.push(n)}}pose(){for(let e=0,t=this.bones.length;e<t;e++){let n=this.bones[e];n&&n.matrixWorld.copy(this.boneInverses[e]).invert()}for(let e=0,t=this.bones.length;e<t;e++){let n=this.bones[e];n&&(n.parent&&n.parent.isBone?(n.matrix.copy(n.parent.matrixWorld).invert(),n.matrix.multiply(n.matrixWorld)):n.matrix.copy(n.matrixWorld),n.matrix.decompose(n.position,n.quaternion,n.scale))}}update(){let e=this.bones,t=this.boneInverses,n=this.boneMatrices,s=this.boneTexture;for(let r=0,a=e.length;r<a;r++){let o=e[r]?e[r].matrixWorld:d0;Fd.multiplyMatrices(o,t[r]),Fd.toArray(n,r*16)}s!==null&&(s.needsUpdate=!0)}clone(){return new i(this.bones,this.boneInverses)}computeBoneTexture(){let e=Math.sqrt(this.bones.length*4);e=Math.ceil(e/4)*4,e=Math.max(e,4);let t=new Float32Array(e*e*4);t.set(this.boneMatrices);let n=new Ws(t,e,e,un,bn);return n.needsUpdate=!0,this.boneMatrices=t,this.boneTexture=n,this}getBoneByName(e){for(let t=0,n=this.bones.length;t<n;t++){let s=this.bones[t];if(s.name===e)return s}}dispose(){this.boneTexture!==null&&(this.boneTexture.dispose(),this.boneTexture=null)}fromJSON(e,t){this.uuid=e.uuid;for(let n=0,s=e.bones.length;n<s;n++){let r=e.bones[n],a=t[r];a===void 0&&(Re("Skeleton: No bone found with UUID:",r),a=new Gs),this.bones.push(a),this.boneInverses.push(new We().fromArray(e.boneInverses[n]))}return this.init(),this}toJSON(){let e={metadata:{version:4.7,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};e.uuid=this.uuid;let t=this.bones,n=this.boneInverses;for(let s=0,r=t.length;s<r;s++){let a=t[s];e.bones.push(a.uuid);let o=n[s];e.boneInverses.push(o.toArray())}return e}},Ci=class extends Ct{constructor(e,t,n,s=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){let e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}},Ps=new We,Bd=new We,lo=[],kd=new Zt,f0=new We,wr=new Ht,Er=new Qt,Xr=class extends Ht{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new Ci(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<n;s++)this.setMatrixAt(s,f0)}computeBoundingBox(){let e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new Zt),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,Ps),kd.copy(e.boundingBox).applyMatrix4(Ps),this.boundingBox.union(kd)}computeBoundingSphere(){let e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new Qt),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,Ps),Er.copy(e.boundingSphere).applyMatrix4(Ps),this.boundingSphere.union(Er)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){let n=t.morphTargetInfluences,s=this.morphTexture.source.data.data,r=n.length+1,a=e*r+1;for(let o=0;o<n.length;o++)n[o]=s[a+o]}raycast(e,t){let n=this.matrixWorld,s=this.count;if(wr.geometry=this.geometry,wr.material=this.material,wr.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Er.copy(this.boundingSphere),Er.applyMatrix4(n),e.ray.intersectsSphere(Er)!==!1))for(let r=0;r<s;r++){this.getMatrixAt(r,Ps),Bd.multiplyMatrices(n,Ps),wr.matrixWorld=Bd,wr.raycast(e,lo);for(let a=0,o=lo.length;a<o;a++){let c=lo[a];c.instanceId=r,c.object=this,t.push(c)}lo.length=0}}setColorAt(e,t){this.instanceColor===null&&(this.instanceColor=new Ci(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3)}setMatrixAt(e,t){t.toArray(this.instanceMatrix.array,e*16)}setMorphAt(e,t){let n=t.morphTargetInfluences,s=n.length+1;this.morphTexture===null&&(this.morphTexture=new Ws(new Float32Array(s*this.count),s,this.count,sc,bn));let r=this.morphTexture.source.data.data,a=0;for(let l=0;l<n.length;l++)a+=n[l];let o=this.geometry.morphTargetsRelative?1:1-a,c=s*e;r[c]=o,r.set(n,c+1)}updateMorphTargets(){}dispose(){this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}},zl=new D,p0=new D,m0=new Xe,gn=class{constructor(e=new D(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,s){return this.normal.set(e,t,n),this.constant=s,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let s=zl.subVectors(n,t).cross(p0.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(s,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){let n=e.delta(zl),s=this.normal.dot(n);if(s===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let r=-(e.start.dot(this.normal)+this.constant)/s;return r<0||r>1?null:t.copy(e.start).addScaledVector(n,r)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||m0.getNormalMatrix(e),s=this.coplanarPoint(zl).applyMatrix4(e),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}},Xi=new Qt,g0=new ie(.5,.5),ho=new D,Xs=class{constructor(e=new gn,t=new gn,n=new gn,s=new gn,r=new gn,a=new gn){this.planes=[e,t,n,s,r,a]}set(e,t,n,s,r,a){let o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(s),o[4].copy(r),o[5].copy(a),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=Cn,n=!1){let s=this.planes,r=e.elements,a=r[0],o=r[1],c=r[2],l=r[3],h=r[4],u=r[5],d=r[6],f=r[7],g=r[8],x=r[9],m=r[10],p=r[11],M=r[12],v=r[13],w=r[14],I=r[15];if(s[0].setComponents(l-a,f-h,p-g,I-M).normalize(),s[1].setComponents(l+a,f+h,p+g,I+M).normalize(),s[2].setComponents(l+o,f+u,p+x,I+v).normalize(),s[3].setComponents(l-o,f-u,p-x,I-v).normalize(),n)s[4].setComponents(c,d,m,w).normalize(),s[5].setComponents(l-c,f-d,p-m,I-w).normalize();else if(s[4].setComponents(l-c,f-d,p-m,I-w).normalize(),t===Cn)s[5].setComponents(l+c,f+d,p+m,I+w).normalize();else if(t===Nr)s[5].setComponents(c,d,m,w).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Xi.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Xi.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Xi)}intersectsSprite(e){Xi.center.set(0,0,0);let t=g0.distanceTo(e.center);return Xi.radius=.7071067811865476+t,Xi.applyMatrix4(e.matrixWorld),this.intersectsSphere(Xi)}intersectsSphere(e){let t=this.planes,n=e.center,s=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let s=t[n];if(ho.x=s.normal.x>0?e.max.x:e.min.x,ho.y=s.normal.y>0?e.max.y:e.min.y,ho.z=s.normal.z>0?e.max.z:e.min.z,s.distanceToPoint(ho)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var qs=class extends en{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Oe(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},Ro=new D,Io=new D,zd=new We,Tr=new oi,uo=new Qt,Vl=new D,Vd=new D,Qi=class extends xt{constructor(e=new Vt,t=new qs){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[0];for(let s=1,r=t.count;s<r;s++)Ro.fromBufferAttribute(t,s-1),Io.fromBufferAttribute(t,s),n[s]=n[s-1],n[s]+=Ro.distanceTo(Io);e.setAttribute("lineDistance",new Dt(n,1))}else Re("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){let n=this.geometry,s=this.matrixWorld,r=e.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),uo.copy(n.boundingSphere),uo.applyMatrix4(s),uo.radius+=r,e.ray.intersectsSphere(uo)===!1)return;zd.copy(s).invert(),Tr.copy(e.ray).applyMatrix4(zd);let o=r/((this.scale.x+this.scale.y+this.scale.z)/3),c=o*o,l=this.isLineSegments?2:1,h=n.index,d=n.attributes.position;if(h!==null){let f=Math.max(0,a.start),g=Math.min(h.count,a.start+a.count);for(let x=f,m=g-1;x<m;x+=l){let p=h.getX(x),M=h.getX(x+1),v=fo(this,e,Tr,c,p,M,x);v&&t.push(v)}if(this.isLineLoop){let x=h.getX(g-1),m=h.getX(f),p=fo(this,e,Tr,c,x,m,g-1);p&&t.push(p)}}else{let f=Math.max(0,a.start),g=Math.min(d.count,a.start+a.count);for(let x=f,m=g-1;x<m;x+=l){let p=fo(this,e,Tr,c,x,x+1,x);p&&t.push(p)}if(this.isLineLoop){let x=fo(this,e,Tr,c,g-1,f,g-1);x&&t.push(x)}}}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}};function fo(i,e,t,n,s,r,a){let o=i.geometry.attributes.position;if(Ro.fromBufferAttribute(o,s),Io.fromBufferAttribute(o,r),t.distanceSqToSegment(Ro,Io,Vl,Vd)>n)return;Vl.applyMatrix4(i.matrixWorld);let l=e.ray.origin.distanceTo(Vl);if(!(l<e.near||l>e.far))return{distance:l,point:Vd.clone().applyMatrix4(i.matrixWorld),index:a,face:null,faceIndex:null,barycoord:null,object:i}}var Hd=new D,Gd=new D,qr=class extends Qi{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[];for(let s=0,r=t.count;s<r;s+=2)Hd.fromBufferAttribute(t,s),Gd.fromBufferAttribute(t,s+1),n[s]=s===0?0:n[s-1],n[s+1]=n[s]+Hd.distanceTo(Gd);e.setAttribute("lineDistance",new Dt(n,1))}else Re("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}},Yr=class extends Qi{constructor(e,t){super(e,t),this.isLineLoop=!0,this.type="LineLoop"}},Ys=class extends en{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new Oe(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},Wd=new We,Ql=new oi,po=new Qt,mo=new D,Kr=class extends xt{constructor(e=new Vt,t=new Ys){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){let n=this.geometry,s=this.matrixWorld,r=e.params.Points.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),po.copy(n.boundingSphere),po.applyMatrix4(s),po.radius+=r,e.ray.intersectsSphere(po)===!1)return;Wd.copy(s).invert(),Ql.copy(e.ray).applyMatrix4(Wd);let o=r/((this.scale.x+this.scale.y+this.scale.z)/3),c=o*o,l=n.index,u=n.attributes.position;if(l!==null){let d=Math.max(0,a.start),f=Math.min(l.count,a.start+a.count);for(let g=d,x=f;g<x;g++){let m=l.getX(g);mo.fromBufferAttribute(u,m),Xd(mo,m,c,s,e,t,this)}}else{let d=Math.max(0,a.start),f=Math.min(u.count,a.start+a.count);for(let g=d,x=f;g<x;g++)mo.fromBufferAttribute(u,g),Xd(mo,g,c,s,e,t,this)}}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}};function Xd(i,e,t,n,s,r,a){let o=Ql.distanceSqToPoint(i);if(o<t){let c=new D;Ql.closestPointToPoint(i,c),c.applyMatrix4(n);let l=s.ray.origin.distanceTo(c);if(l<s.near||l>s.far)return;r.push({distance:l,distanceToRay:Math.sqrt(o),point:c,index:e,face:null,faceIndex:null,barycoord:null,object:a})}}var Zr=class extends Nt{constructor(e,t,n=Li,s,r,a,o=Ot,c=Ot,l,h=Us,u=1){if(h!==Us&&h!==sr)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let d={width:e,height:t,depth:u};super(d,s,r,a,o,c,h,n,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new ks(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}},Jr=class extends Nt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}};var Ks=class i extends Vt{constructor(e=1,t=1,n=1,s=32,r=1,a=!1,o=0,c=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:s,heightSegments:r,openEnded:a,thetaStart:o,thetaLength:c};let l=this;s=Math.floor(s),r=Math.floor(r);let h=[],u=[],d=[],f=[],g=0,x=[],m=n/2,p=0;M(),a===!1&&(e>0&&v(!0),t>0&&v(!1)),this.setIndex(h),this.setAttribute("position",new Dt(u,3)),this.setAttribute("normal",new Dt(d,3)),this.setAttribute("uv",new Dt(f,2));function M(){let w=new D,I=new D,E=0,P=(t-e)/n;for(let O=0;O<=r;O++){let S=[],y=O/r,R=y*(t-e)+e;for(let L=0;L<=s;L++){let k=L/s,z=k*c+o,G=Math.sin(z),X=Math.cos(z);I.x=R*G,I.y=-y*n+m,I.z=R*X,u.push(I.x,I.y,I.z),w.set(G,P,X).normalize(),d.push(w.x,w.y,w.z),f.push(k,1-y),S.push(g++)}x.push(S)}for(let O=0;O<s;O++)for(let S=0;S<r;S++){let y=x[S][O],R=x[S+1][O],L=x[S+1][O+1],k=x[S][O+1];(e>0||S!==0)&&(h.push(y,R,k),E+=3),(t>0||S!==r-1)&&(h.push(R,L,k),E+=3)}l.addGroup(p,E,0),p+=E}function v(w){let I=g,E=new ie,P=new D,O=0,S=w===!0?e:t,y=w===!0?1:-1;for(let L=1;L<=s;L++)u.push(0,m*y,0),d.push(0,y,0),f.push(.5,.5),g++;let R=g;for(let L=0;L<=s;L++){let z=L/s*c+o,G=Math.cos(z),X=Math.sin(z);P.x=S*X,P.y=m*y,P.z=S*G,u.push(P.x,P.y,P.z),d.push(0,y,0),E.x=G*.5+.5,E.y=X*.5*y+.5,f.push(E.x,E.y),g++}for(let L=0;L<s;L++){let k=I+L,z=R+L;w===!0?h.push(z,z+1,k):h.push(z+1,z,k),O+=3}l.addGroup(p,O,w===!0?1:2),p+=O}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}},jr=class i extends Ks{constructor(e=1,t=1,n=32,s=1,r=!1,a=0,o=Math.PI*2){super(0,e,t,n,s,r,a,o),this.type="ConeGeometry",this.parameters={radius:e,height:t,radialSegments:n,heightSegments:s,openEnded:r,thetaStart:a,thetaLength:o}}static fromJSON(e){return new i(e.radius,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}};var hn=class{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){Re("Curve: .getPoint() not implemented.")}getPointAt(e,t){let n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let t=[],n,s=this.getPoint(0),r=0;t.push(0);for(let a=1;a<=e;a++)n=this.getPoint(a/e),r+=n.distanceTo(s),t.push(r),s=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){let n=this.getLengths(),s=0,r=n.length,a;t?a=t:a=e*n[r-1];let o=0,c=r-1,l;for(;o<=c;)if(s=Math.floor(o+(c-o)/2),l=n[s]-a,l<0)o=s+1;else if(l>0)c=s-1;else{c=s;break}if(s=c,n[s]===a)return s/(r-1);let h=n[s],d=n[s+1]-h,f=(a-h)/d;return(s+f)/(r-1)}getTangent(e,t){let s=e-1e-4,r=e+1e-4;s<0&&(s=0),r>1&&(r=1);let a=this.getPoint(s),o=this.getPoint(r),c=t||(a.isVector2?new ie:new D);return c.copy(o).sub(a).normalize(),c}getTangentAt(e,t){let n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t=!1){let n=new D,s=[],r=[],a=[],o=new D,c=new We;for(let f=0;f<=e;f++){let g=f/e;s[f]=this.getTangentAt(g,new D)}r[0]=new D,a[0]=new D;let l=Number.MAX_VALUE,h=Math.abs(s[0].x),u=Math.abs(s[0].y),d=Math.abs(s[0].z);h<=l&&(l=h,n.set(1,0,0)),u<=l&&(l=u,n.set(0,1,0)),d<=l&&n.set(0,0,1),o.crossVectors(s[0],n).normalize(),r[0].crossVectors(s[0],o),a[0].crossVectors(s[0],r[0]);for(let f=1;f<=e;f++){if(r[f]=r[f-1].clone(),a[f]=a[f-1].clone(),o.crossVectors(s[f-1],s[f]),o.length()>Number.EPSILON){o.normalize();let g=Math.acos(qe(s[f-1].dot(s[f]),-1,1));r[f].applyMatrix4(c.makeRotationAxis(o,g))}a[f].crossVectors(s[f],r[f])}if(t===!0){let f=Math.acos(qe(r[0].dot(r[e]),-1,1));f/=e,s[0].dot(o.crossVectors(r[0],r[e]))>0&&(f=-f);for(let g=1;g<=e;g++)r[g].applyMatrix4(c.makeRotationAxis(s[g],f*g)),a[g].crossVectors(s[g],r[g])}return{tangents:s,normals:r,binormals:a}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){let e={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}},Zs=class extends hn{constructor(e=0,t=0,n=1,s=1,r=0,a=Math.PI*2,o=!1,c=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=s,this.aStartAngle=r,this.aEndAngle=a,this.aClockwise=o,this.aRotation=c}getPoint(e,t=new ie){let n=t,s=Math.PI*2,r=this.aEndAngle-this.aStartAngle,a=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=s;for(;r>s;)r-=s;r<Number.EPSILON&&(a?r=0:r=s),this.aClockwise===!0&&!a&&(r===s?r=-s:r=r-s);let o=this.aStartAngle+e*r,c=this.aX+this.xRadius*Math.cos(o),l=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let h=Math.cos(this.aRotation),u=Math.sin(this.aRotation),d=c-this.aX,f=l-this.aY;c=d*h-f*u+this.aX,l=d*u+f*h+this.aY}return n.set(c,l)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){let e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}},Po=class extends Zs{constructor(e,t,n,s,r,a){super(e,t,n,n,s,r,a),this.isArcCurve=!0,this.type="ArcCurve"}};function Rh(){let i=0,e=0,t=0,n=0;function s(r,a,o,c){i=r,e=o,t=-3*r+3*a-2*o-c,n=2*r-2*a+o+c}return{initCatmullRom:function(r,a,o,c,l){s(a,o,l*(o-r),l*(c-a))},initNonuniformCatmullRom:function(r,a,o,c,l,h,u){let d=(a-r)/l-(o-r)/(l+h)+(o-a)/h,f=(o-a)/h-(c-a)/(h+u)+(c-o)/u;d*=h,f*=h,s(a,o,d,f)},calc:function(r){let a=r*r,o=a*r;return i+e*r+t*a+n*o}}}var go=new D,Hl=new Rh,Gl=new Rh,Wl=new Rh,Lo=class extends hn{constructor(e=[],t=!1,n="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=n,this.tension=s}getPoint(e,t=new D){let n=t,s=this.points,r=s.length,a=(r-(this.closed?0:1))*e,o=Math.floor(a),c=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/r)+1)*r:c===0&&o===r-1&&(o=r-2,c=1);let l,h;this.closed||o>0?l=s[(o-1)%r]:(go.subVectors(s[0],s[1]).add(s[0]),l=go);let u=s[o%r],d=s[(o+1)%r];if(this.closed||o+2<r?h=s[(o+2)%r]:(go.subVectors(s[r-1],s[r-2]).add(s[r-1]),h=go),this.curveType==="centripetal"||this.curveType==="chordal"){let f=this.curveType==="chordal"?.5:.25,g=Math.pow(l.distanceToSquared(u),f),x=Math.pow(u.distanceToSquared(d),f),m=Math.pow(d.distanceToSquared(h),f);x<1e-4&&(x=1),g<1e-4&&(g=x),m<1e-4&&(m=x),Hl.initNonuniformCatmullRom(l.x,u.x,d.x,h.x,g,x,m),Gl.initNonuniformCatmullRom(l.y,u.y,d.y,h.y,g,x,m),Wl.initNonuniformCatmullRom(l.z,u.z,d.z,h.z,g,x,m)}else this.curveType==="catmullrom"&&(Hl.initCatmullRom(l.x,u.x,d.x,h.x,this.tension),Gl.initCatmullRom(l.y,u.y,d.y,h.y,this.tension),Wl.initCatmullRom(l.z,u.z,d.z,h.z,this.tension));return n.set(Hl.calc(c),Gl.calc(c),Wl.calc(c)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(s.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let s=this.points[t];e.points.push(s.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(new D().fromArray(s))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}};function qd(i,e,t,n,s){let r=(n-e)*.5,a=(s-t)*.5,o=i*i,c=i*o;return(2*t-2*n+r+a)*c+(-3*t+3*n-2*r-a)*o+r*i+t}function x0(i,e){let t=1-i;return t*t*e}function _0(i,e){return 2*(1-i)*i*e}function y0(i,e){return i*i*e}function Pr(i,e,t,n){return x0(i,e)+_0(i,t)+y0(i,n)}function v0(i,e){let t=1-i;return t*t*t*e}function b0(i,e){let t=1-i;return 3*t*t*i*e}function S0(i,e){return 3*(1-i)*i*i*e}function M0(i,e){return i*i*i*e}function Lr(i,e,t,n,s){return v0(i,e)+b0(i,t)+S0(i,n)+M0(i,s)}var $r=class extends hn{constructor(e=new ie,t=new ie,n=new ie,s=new ie){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=n,this.v3=s}getPoint(e,t=new ie){let n=t,s=this.v0,r=this.v1,a=this.v2,o=this.v3;return n.set(Lr(e,s.x,r.x,a.x,o.x),Lr(e,s.y,r.y,a.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Do=class extends hn{constructor(e=new D,t=new D,n=new D,s=new D){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=n,this.v3=s}getPoint(e,t=new D){let n=t,s=this.v0,r=this.v1,a=this.v2,o=this.v3;return n.set(Lr(e,s.x,r.x,a.x,o.x),Lr(e,s.y,r.y,a.y,o.y),Lr(e,s.z,r.z,a.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Qr=class extends hn{constructor(e=new ie,t=new ie){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new ie){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new ie){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},No=class extends hn{constructor(e=new D,t=new D){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new D){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new D){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},ea=class extends hn{constructor(e=new ie,t=new ie,n=new ie){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new ie){let n=t,s=this.v0,r=this.v1,a=this.v2;return n.set(Pr(e,s.x,r.x,a.x),Pr(e,s.y,r.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Uo=class extends hn{constructor(e=new D,t=new D,n=new D){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new D){let n=t,s=this.v0,r=this.v1,a=this.v2;return n.set(Pr(e,s.x,r.x,a.x),Pr(e,s.y,r.y,a.y),Pr(e,s.z,r.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},ta=class extends hn{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,t=new ie){let n=t,s=this.points,r=(s.length-1)*e,a=Math.floor(r),o=r-a,c=s[a===0?a:a-1],l=s[a],h=s[a>s.length-2?s.length-1:a+1],u=s[a>s.length-3?s.length-1:a+2];return n.set(qd(o,c.x,l.x,h.x,u.x),qd(o,c.y,l.y,h.y,u.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(s.clone())}return this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let s=this.points[t];e.points.push(s.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(new ie().fromArray(s))}return this}},eh=Object.freeze({__proto__:null,ArcCurve:Po,CatmullRomCurve3:Lo,CubicBezierCurve:$r,CubicBezierCurve3:Do,EllipseCurve:Zs,LineCurve:Qr,LineCurve3:No,QuadraticBezierCurve:ea,QuadraticBezierCurve3:Uo,SplineCurve:ta}),Oo=class extends hn{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){let e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);if(!e.equals(t)){let n=e.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new eh[n](t,e))}return this}getPoint(e,t){let n=e*this.getLength(),s=this.getCurveLengths(),r=0;for(;r<s.length;){if(s[r]>=n){let a=s[r]-n,o=this.curves[r],c=o.getLength(),l=c===0?0:1-a/c;return o.getPointAt(l,t)}r++}return null}getLength(){let e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let e=[],t=0;for(let n=0,s=this.curves.length;n<s;n++)t+=this.curves[n].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){let t=[],n;for(let s=0,r=this.curves;s<r.length;s++){let a=r[s],o=a.isEllipseCurve?e*2:a.isLineCurve||a.isLineCurve3?1:a.isSplineCurve?e*a.points.length:e,c=a.getPoints(o);for(let l=0;l<c.length;l++){let h=c[l];n&&n.equals(h)||(t.push(h),n=h)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let s=e.curves[t];this.curves.push(s.clone())}return this.autoClose=e.autoClose,this}toJSON(){let e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,n=this.curves.length;t<n;t++){let s=this.curves[t];e.curves.push(s.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let s=e.curves[t];this.curves.push(new eh[s.type]().fromJSON(s))}return this}},na=class extends Oo{constructor(e){super(),this.type="Path",this.currentPoint=new ie,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,n=e.length;t<n;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){let n=new Qr(this.currentPoint.clone(),new ie(e,t));return this.curves.push(n),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,n,s){let r=new ea(this.currentPoint.clone(),new ie(e,t),new ie(n,s));return this.curves.push(r),this.currentPoint.set(n,s),this}bezierCurveTo(e,t,n,s,r,a){let o=new $r(this.currentPoint.clone(),new ie(e,t),new ie(n,s),new ie(r,a));return this.curves.push(o),this.currentPoint.set(r,a),this}splineThru(e){let t=[this.currentPoint.clone()].concat(e),n=new ta(t);return this.curves.push(n),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,n,s,r,a){let o=this.currentPoint.x,c=this.currentPoint.y;return this.absarc(e+o,t+c,n,s,r,a),this}absarc(e,t,n,s,r,a){return this.absellipse(e,t,n,n,s,r,a),this}ellipse(e,t,n,s,r,a,o,c){let l=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(e+l,t+h,n,s,r,a,o,c),this}absellipse(e,t,n,s,r,a,o,c){let l=new Zs(e,t,n,s,r,a,o,c);if(this.curves.length>0){let u=l.getPoint(0);u.equals(this.currentPoint)||this.lineTo(u.x,u.y)}this.curves.push(l);let h=l.getPoint(1);return this.currentPoint.copy(h),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){let e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}},Js=class extends na{constructor(e){super(e),this.uuid=_n(),this.type="Shape",this.holes=[]}getPointsHoles(e){let t=[];for(let n=0,s=this.holes.length;n<s;n++)t[n]=this.holes[n].getPoints(e);return t}extractPoints(e){return{shape:this.getPoints(e),holes:this.getPointsHoles(e)}}copy(e){super.copy(e),this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let s=e.holes[t];this.holes.push(s.clone())}return this}toJSON(){let e=super.toJSON();e.uuid=this.uuid,e.holes=[];for(let t=0,n=this.holes.length;t<n;t++){let s=this.holes[t];e.holes.push(s.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.uuid=e.uuid,this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let s=e.holes[t];this.holes.push(new na().fromJSON(s))}return this}};function w0(i,e,t=2){let n=e&&e.length,s=n?e[0]*t:i.length,r=Yf(i,0,s,t,!0),a=[];if(!r||r.next===r.prev)return a;let o,c,l;if(n&&(r=R0(i,e,r,t)),i.length>80*t){o=i[0],c=i[1];let h=o,u=c;for(let d=t;d<s;d+=t){let f=i[d],g=i[d+1];f<o&&(o=f),g<c&&(c=g),f>h&&(h=f),g>u&&(u=g)}l=Math.max(h-o,u-c),l=l!==0?32767/l:0}return ia(r,a,t,o,c,l,0),a}function Yf(i,e,t,n,s){let r;if(s===z0(i,e,t,n)>0)for(let a=e;a<t;a+=n)r=Yd(a/n|0,i[a],i[a+1],r);else for(let a=t-n;a>=e;a-=n)r=Yd(a/n|0,i[a],i[a+1],r);return r&&js(r,r.next)&&(ra(r),r=r.next),r}function es(i,e){if(!i)return i;e||(e=i);let t=i,n;do if(n=!1,!t.steiner&&(js(t,t.next)||vt(t.prev,t,t.next)===0)){if(ra(t),t=e=t.prev,t===t.next)break;n=!0}else t=t.next;while(n||t!==e);return e}function ia(i,e,t,n,s,r,a){if(!i)return;!a&&r&&N0(i,n,s,r);let o=i;for(;i.prev!==i.next;){let c=i.prev,l=i.next;if(r?T0(i,n,s,r):E0(i)){e.push(c.i,i.i,l.i),ra(i),i=l.next,o=l.next;continue}if(i=l,i===o){a?a===1?(i=A0(es(i),e),ia(i,e,t,n,s,r,2)):a===2&&C0(i,e,t,n,s,r):ia(es(i),e,t,n,s,r,1);break}}}function E0(i){let e=i.prev,t=i,n=i.next;if(vt(e,t,n)>=0)return!1;let s=e.x,r=t.x,a=n.x,o=e.y,c=t.y,l=n.y,h=Math.min(s,r,a),u=Math.min(o,c,l),d=Math.max(s,r,a),f=Math.max(o,c,l),g=n.next;for(;g!==e;){if(g.x>=h&&g.x<=d&&g.y>=u&&g.y<=f&&Cr(s,o,r,c,a,l,g.x,g.y)&&vt(g.prev,g,g.next)>=0)return!1;g=g.next}return!0}function T0(i,e,t,n){let s=i.prev,r=i,a=i.next;if(vt(s,r,a)>=0)return!1;let o=s.x,c=r.x,l=a.x,h=s.y,u=r.y,d=a.y,f=Math.min(o,c,l),g=Math.min(h,u,d),x=Math.max(o,c,l),m=Math.max(h,u,d),p=th(f,g,e,t,n),M=th(x,m,e,t,n),v=i.prevZ,w=i.nextZ;for(;v&&v.z>=p&&w&&w.z<=M;){if(v.x>=f&&v.x<=x&&v.y>=g&&v.y<=m&&v!==s&&v!==a&&Cr(o,h,c,u,l,d,v.x,v.y)&&vt(v.prev,v,v.next)>=0||(v=v.prevZ,w.x>=f&&w.x<=x&&w.y>=g&&w.y<=m&&w!==s&&w!==a&&Cr(o,h,c,u,l,d,w.x,w.y)&&vt(w.prev,w,w.next)>=0))return!1;w=w.nextZ}for(;v&&v.z>=p;){if(v.x>=f&&v.x<=x&&v.y>=g&&v.y<=m&&v!==s&&v!==a&&Cr(o,h,c,u,l,d,v.x,v.y)&&vt(v.prev,v,v.next)>=0)return!1;v=v.prevZ}for(;w&&w.z<=M;){if(w.x>=f&&w.x<=x&&w.y>=g&&w.y<=m&&w!==s&&w!==a&&Cr(o,h,c,u,l,d,w.x,w.y)&&vt(w.prev,w,w.next)>=0)return!1;w=w.nextZ}return!0}function A0(i,e){let t=i;do{let n=t.prev,s=t.next.next;!js(n,s)&&Zf(n,t,t.next,s)&&sa(n,s)&&sa(s,n)&&(e.push(n.i,t.i,s.i),ra(t),ra(t.next),t=i=s),t=t.next}while(t!==i);return es(t)}function C0(i,e,t,n,s,r){let a=i;do{let o=a.next.next;for(;o!==a.prev;){if(a.i!==o.i&&F0(a,o)){let c=Jf(a,o);a=es(a,a.next),c=es(c,c.next),ia(a,e,t,n,s,r,0),ia(c,e,t,n,s,r,0);return}o=o.next}a=a.next}while(a!==i)}function R0(i,e,t,n){let s=[];for(let r=0,a=e.length;r<a;r++){let o=e[r]*n,c=r<a-1?e[r+1]*n:i.length,l=Yf(i,o,c,n,!1);l===l.next&&(l.steiner=!0),s.push(O0(l))}s.sort(I0);for(let r=0;r<s.length;r++)t=P0(s[r],t);return t}function I0(i,e){let t=i.x-e.x;if(t===0&&(t=i.y-e.y,t===0)){let n=(i.next.y-i.y)/(i.next.x-i.x),s=(e.next.y-e.y)/(e.next.x-e.x);t=n-s}return t}function P0(i,e){let t=L0(i,e);if(!t)return e;let n=Jf(t,i);return es(n,n.next),es(t,t.next)}function L0(i,e){let t=e,n=i.x,s=i.y,r=-1/0,a;if(js(i,t))return t;do{if(js(i,t.next))return t.next;if(s<=t.y&&s>=t.next.y&&t.next.y!==t.y){let u=t.x+(s-t.y)*(t.next.x-t.x)/(t.next.y-t.y);if(u<=n&&u>r&&(r=u,a=t.x<t.next.x?t:t.next,u===n))return a}t=t.next}while(t!==e);if(!a)return null;let o=a,c=a.x,l=a.y,h=1/0;t=a;do{if(n>=t.x&&t.x>=c&&n!==t.x&&Kf(s<l?n:r,s,c,l,s<l?r:n,s,t.x,t.y)){let u=Math.abs(s-t.y)/(n-t.x);sa(t,i)&&(u<h||u===h&&(t.x>a.x||t.x===a.x&&D0(a,t)))&&(a=t,h=u)}t=t.next}while(t!==o);return a}function D0(i,e){return vt(i.prev,i,e.prev)<0&&vt(e.next,i,i.next)<0}function N0(i,e,t,n){let s=i;do s.z===0&&(s.z=th(s.x,s.y,e,t,n)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==i);s.prevZ.nextZ=null,s.prevZ=null,U0(s)}function U0(i){let e,t=1;do{let n=i,s;i=null;let r=null;for(e=0;n;){e++;let a=n,o=0;for(let l=0;l<t&&(o++,a=a.nextZ,!!a);l++);let c=t;for(;o>0||c>0&&a;)o!==0&&(c===0||!a||n.z<=a.z)?(s=n,n=n.nextZ,o--):(s=a,a=a.nextZ,c--),r?r.nextZ=s:i=s,s.prevZ=r,r=s;n=a}r.nextZ=null,t*=2}while(e>1);return i}function th(i,e,t,n,s){return i=(i-t)*s|0,e=(e-n)*s|0,i=(i|i<<8)&16711935,i=(i|i<<4)&252645135,i=(i|i<<2)&858993459,i=(i|i<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,i|e<<1}function O0(i){let e=i,t=i;do(e.x<t.x||e.x===t.x&&e.y<t.y)&&(t=e),e=e.next;while(e!==i);return t}function Kf(i,e,t,n,s,r,a,o){return(s-a)*(e-o)>=(i-a)*(r-o)&&(i-a)*(n-o)>=(t-a)*(e-o)&&(t-a)*(r-o)>=(s-a)*(n-o)}function Cr(i,e,t,n,s,r,a,o){return!(i===a&&e===o)&&Kf(i,e,t,n,s,r,a,o)}function F0(i,e){return i.next.i!==e.i&&i.prev.i!==e.i&&!B0(i,e)&&(sa(i,e)&&sa(e,i)&&k0(i,e)&&(vt(i.prev,i,e.prev)||vt(i,e.prev,e))||js(i,e)&&vt(i.prev,i,i.next)>0&&vt(e.prev,e,e.next)>0)}function vt(i,e,t){return(e.y-i.y)*(t.x-e.x)-(e.x-i.x)*(t.y-e.y)}function js(i,e){return i.x===e.x&&i.y===e.y}function Zf(i,e,t,n){let s=_o(vt(i,e,t)),r=_o(vt(i,e,n)),a=_o(vt(t,n,i)),o=_o(vt(t,n,e));return!!(s!==r&&a!==o||s===0&&xo(i,t,e)||r===0&&xo(i,n,e)||a===0&&xo(t,i,n)||o===0&&xo(t,e,n))}function xo(i,e,t){return e.x<=Math.max(i.x,t.x)&&e.x>=Math.min(i.x,t.x)&&e.y<=Math.max(i.y,t.y)&&e.y>=Math.min(i.y,t.y)}function _o(i){return i>0?1:i<0?-1:0}function B0(i,e){let t=i;do{if(t.i!==i.i&&t.next.i!==i.i&&t.i!==e.i&&t.next.i!==e.i&&Zf(t,t.next,i,e))return!0;t=t.next}while(t!==i);return!1}function sa(i,e){return vt(i.prev,i,i.next)<0?vt(i,e,i.next)>=0&&vt(i,i.prev,e)>=0:vt(i,e,i.prev)<0||vt(i,i.next,e)<0}function k0(i,e){let t=i,n=!1,s=(i.x+e.x)/2,r=(i.y+e.y)/2;do t.y>r!=t.next.y>r&&t.next.y!==t.y&&s<(t.next.x-t.x)*(r-t.y)/(t.next.y-t.y)+t.x&&(n=!n),t=t.next;while(t!==i);return n}function Jf(i,e){let t=nh(i.i,i.x,i.y),n=nh(e.i,e.x,e.y),s=i.next,r=e.prev;return i.next=e,e.prev=i,t.next=s,s.prev=t,n.next=t,t.prev=n,r.next=n,n.prev=r,n}function Yd(i,e,t,n){let s=nh(i,e,t);return n?(s.next=n.next,s.prev=n,n.next.prev=s,n.next=s):(s.prev=s,s.next=s),s}function ra(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}function nh(i,e,t){return{i,x:e,y:t,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function z0(i,e,t,n){let s=0;for(let r=e,a=t-n;r<t;r+=n)s+=(i[a]-i[r])*(i[r+1]+i[a+1]),a=r;return s}var ih=class{static triangulate(e,t,n=2){return w0(e,t,n)}},Yi=class i{static area(e){let t=e.length,n=0;for(let s=t-1,r=0;r<t;s=r++)n+=e[s].x*e[r].y-e[r].x*e[s].y;return n*.5}static isClockWise(e){return i.area(e)<0}static triangulateShape(e,t){let n=[],s=[],r=[];Kd(e),Zd(n,e);let a=e.length;t.forEach(Kd);for(let c=0;c<t.length;c++)s.push(a),a+=t[c].length,Zd(n,t[c]);let o=ih.triangulate(n,s);for(let c=0;c<o.length;c+=3)r.push(o.slice(c,c+3));return r}};function Kd(i){let e=i.length;e>2&&i[e-1].equals(i[0])&&i.pop()}function Zd(i,e){for(let t=0;t<e.length;t++)i.push(e[t].x),i.push(e[t].y)}var aa=class i extends Vt{constructor(e=new Js([new ie(.5,.5),new ie(-.5,.5),new ie(-.5,-.5),new ie(.5,-.5)]),t={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:e,options:t},e=Array.isArray(e)?e:[e];let n=this,s=[],r=[];for(let o=0,c=e.length;o<c;o++){let l=e[o];a(l)}this.setAttribute("position",new Dt(s,3)),this.setAttribute("uv",new Dt(r,2)),this.computeVertexNormals();function a(o){let c=[],l=t.curveSegments!==void 0?t.curveSegments:12,h=t.steps!==void 0?t.steps:1,u=t.depth!==void 0?t.depth:1,d=t.bevelEnabled!==void 0?t.bevelEnabled:!0,f=t.bevelThickness!==void 0?t.bevelThickness:.2,g=t.bevelSize!==void 0?t.bevelSize:f-.1,x=t.bevelOffset!==void 0?t.bevelOffset:0,m=t.bevelSegments!==void 0?t.bevelSegments:3,p=t.extrudePath,M=t.UVGenerator!==void 0?t.UVGenerator:V0,v,w=!1,I,E,P,O;p&&(v=p.getSpacedPoints(h),w=!0,d=!1,I=p.computeFrenetFrames(h,!1),E=new D,P=new D,O=new D),d||(m=0,f=0,g=0,x=0);let S=o.extractPoints(l),y=S.shape,R=S.holes;if(!Yi.isClockWise(y)){y=y.reverse();for(let Q=0,A=R.length;Q<A;Q++){let $=R[Q];Yi.isClockWise($)&&(R[Q]=$.reverse())}}function k(Q){let $=10000000000000001e-36,se=Q[0];for(let ce=1;ce<=Q.length;ce++){let te=ce%Q.length,Se=Q[te],fe=Se.x-se.x,ye=Se.y-se.y,T=fe*fe+ye*ye,_=Math.max(Math.abs(Se.x),Math.abs(Se.y),Math.abs(se.x),Math.abs(se.y)),B=$*_*_;if(T<=B){Q.splice(te,1),ce--;continue}se=Se}}k(y),R.forEach(k);let z=R.length,G=y;for(let Q=0;Q<z;Q++){let A=R[Q];y=y.concat(A)}function X(Q,A,$){return A||Je("ExtrudeGeometry: vec does not exist"),Q.clone().addScaledVector(A,$)}let re=y.length;function Y(Q,A,$){let se,ce,te,Se=Q.x-A.x,fe=Q.y-A.y,ye=$.x-Q.x,T=$.y-Q.y,_=Se*Se+fe*fe,B=Se*T-fe*ye;if(Math.abs(B)>Number.EPSILON){let q=Math.sqrt(_),J=Math.sqrt(ye*ye+T*T),W=A.x-fe/q,Ce=A.y+Se/q,pe=$.x-T/J,Pe=$.y+ye/J,Te=((pe-W)*T-(Pe-Ce)*ye)/(Se*T-fe*ye);se=W+Se*Te-Q.x,ce=Ce+fe*Te-Q.y;let ee=se*se+ce*ce;if(ee<=2)return new ie(se,ce);te=Math.sqrt(ee/2)}else{let q=!1;Se>Number.EPSILON?ye>Number.EPSILON&&(q=!0):Se<-Number.EPSILON?ye<-Number.EPSILON&&(q=!0):Math.sign(fe)===Math.sign(T)&&(q=!0),q?(se=-fe,ce=Se,te=Math.sqrt(_)):(se=Se,ce=fe,te=Math.sqrt(_/2))}return new ie(se/te,ce/te)}let ae=[];for(let Q=0,A=G.length,$=A-1,se=Q+1;Q<A;Q++,$++,se++)$===A&&($=0),se===A&&(se=0),ae[Q]=Y(G[Q],G[$],G[se]);let le=[],Ee,Ze=ae.concat();for(let Q=0,A=z;Q<A;Q++){let $=R[Q];Ee=[];for(let se=0,ce=$.length,te=ce-1,Se=se+1;se<ce;se++,te++,Se++)te===ce&&(te=0),Se===ce&&(Se=0),Ee[se]=Y($[se],$[te],$[Se]);le.push(Ee),Ze=Ze.concat(Ee)}let Qe;if(m===0)Qe=Yi.triangulateShape(G,R);else{let Q=[],A=[];for(let $=0;$<m;$++){let se=$/m,ce=f*Math.cos(se*Math.PI/2),te=g*Math.sin(se*Math.PI/2)+x;for(let Se=0,fe=G.length;Se<fe;Se++){let ye=X(G[Se],ae[Se],te);De(ye.x,ye.y,-ce),se===0&&Q.push(ye)}for(let Se=0,fe=z;Se<fe;Se++){let ye=R[Se];Ee=le[Se];let T=[];for(let _=0,B=ye.length;_<B;_++){let q=X(ye[_],Ee[_],te);De(q.x,q.y,-ce),se===0&&T.push(q)}se===0&&A.push(T)}}Qe=Yi.triangulateShape(Q,A)}let rt=Qe.length,at=g+x;for(let Q=0;Q<re;Q++){let A=d?X(y[Q],Ze[Q],at):y[Q];w?(P.copy(I.normals[0]).multiplyScalar(A.x),E.copy(I.binormals[0]).multiplyScalar(A.y),O.copy(v[0]).add(P).add(E),De(O.x,O.y,O.z)):De(A.x,A.y,0)}for(let Q=1;Q<=h;Q++)for(let A=0;A<re;A++){let $=d?X(y[A],Ze[A],at):y[A];w?(P.copy(I.normals[Q]).multiplyScalar($.x),E.copy(I.binormals[Q]).multiplyScalar($.y),O.copy(v[Q]).add(P).add(E),De(O.x,O.y,O.z)):De($.x,$.y,u/h*Q)}for(let Q=m-1;Q>=0;Q--){let A=Q/m,$=f*Math.cos(A*Math.PI/2),se=g*Math.sin(A*Math.PI/2)+x;for(let ce=0,te=G.length;ce<te;ce++){let Se=X(G[ce],ae[ce],se);De(Se.x,Se.y,u+$)}for(let ce=0,te=R.length;ce<te;ce++){let Se=R[ce];Ee=le[ce];for(let fe=0,ye=Se.length;fe<ye;fe++){let T=X(Se[fe],Ee[fe],se);w?De(T.x,T.y+v[h-1].y,v[h-1].x+$):De(T.x,T.y,u+$)}}}K(),j();function K(){let Q=s.length/3;if(d){let A=0,$=re*A;for(let se=0;se<rt;se++){let ce=Qe[se];Ae(ce[2]+$,ce[1]+$,ce[0]+$)}A=h+m*2,$=re*A;for(let se=0;se<rt;se++){let ce=Qe[se];Ae(ce[0]+$,ce[1]+$,ce[2]+$)}}else{for(let A=0;A<rt;A++){let $=Qe[A];Ae($[2],$[1],$[0])}for(let A=0;A<rt;A++){let $=Qe[A];Ae($[0]+re*h,$[1]+re*h,$[2]+re*h)}}n.addGroup(Q,s.length/3-Q,0)}function j(){let Q=s.length/3,A=0;ve(G,A),A+=G.length;for(let $=0,se=R.length;$<se;$++){let ce=R[$];ve(ce,A),A+=ce.length}n.addGroup(Q,s.length/3-Q,1)}function ve(Q,A){let $=Q.length;for(;--$>=0;){let se=$,ce=$-1;ce<0&&(ce=Q.length-1);for(let te=0,Se=h+m*2;te<Se;te++){let fe=re*te,ye=re*(te+1),T=A+se+fe,_=A+ce+fe,B=A+ce+ye,q=A+se+ye;je(T,_,B,q)}}}function De(Q,A,$){c.push(Q),c.push(A),c.push($)}function Ae(Q,A,$){ft(Q),ft(A),ft($);let se=s.length/3,ce=M.generateTopUV(n,s,se-3,se-2,se-1);ke(ce[0]),ke(ce[1]),ke(ce[2])}function je(Q,A,$,se){ft(Q),ft(A),ft(se),ft(A),ft($),ft(se);let ce=s.length/3,te=M.generateSideWallUV(n,s,ce-6,ce-3,ce-2,ce-1);ke(te[0]),ke(te[1]),ke(te[3]),ke(te[1]),ke(te[2]),ke(te[3])}function ft(Q){s.push(c[Q*3+0]),s.push(c[Q*3+1]),s.push(c[Q*3+2])}function ke(Q){r.push(Q.x),r.push(Q.y)}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON(),t=this.parameters.shapes,n=this.parameters.options;return H0(t,n,e)}static fromJSON(e,t){let n=[];for(let r=0,a=e.shapes.length;r<a;r++){let o=t[e.shapes[r]];n.push(o)}let s=e.options.extrudePath;return s!==void 0&&(e.options.extrudePath=new eh[s.type]().fromJSON(s)),new i(n,e.options)}},V0={generateTopUV:function(i,e,t,n,s){let r=e[t*3],a=e[t*3+1],o=e[n*3],c=e[n*3+1],l=e[s*3],h=e[s*3+1];return[new ie(r,a),new ie(o,c),new ie(l,h)]},generateSideWallUV:function(i,e,t,n,s,r){let a=e[t*3],o=e[t*3+1],c=e[t*3+2],l=e[n*3],h=e[n*3+1],u=e[n*3+2],d=e[s*3],f=e[s*3+1],g=e[s*3+2],x=e[r*3],m=e[r*3+1],p=e[r*3+2];return Math.abs(o-h)<Math.abs(a-l)?[new ie(a,1-c),new ie(l,1-u),new ie(d,1-g),new ie(x,1-p)]:[new ie(o,1-c),new ie(h,1-u),new ie(f,1-g),new ie(m,1-p)]}};function H0(i,e,t){if(t.shapes=[],Array.isArray(i))for(let n=0,s=i.length;n<s;n++){let r=i[n];t.shapes.push(r.uuid)}else t.shapes.push(i.uuid);return t.options=Object.assign({},e),e.extrudePath!==void 0&&(t.options.extrudePath=e.extrudePath.toJSON()),t}var oa=class i extends Vt{constructor(e=1,t=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:s};let r=e/2,a=t/2,o=Math.floor(n),c=Math.floor(s),l=o+1,h=c+1,u=e/o,d=t/c,f=[],g=[],x=[],m=[];for(let p=0;p<h;p++){let M=p*d-a;for(let v=0;v<l;v++){let w=v*u-r;g.push(w,-M,0),x.push(0,0,1),m.push(v/o),m.push(1-p/c)}}for(let p=0;p<c;p++)for(let M=0;M<o;M++){let v=M+l*p,w=M+l*(p+1),I=M+1+l*(p+1),E=M+1+l*p;f.push(v,w,E),f.push(w,I,E)}this.setIndex(f),this.setAttribute("position",new Dt(g,3)),this.setAttribute("normal",new Dt(x,3)),this.setAttribute("uv",new Dt(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.width,e.height,e.widthSegments,e.heightSegments)}};var ts=class extends en{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Oe(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Oe(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Mh,this.normalScale=new ie(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new In,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},tn=class extends ts{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new ie(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return qe(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new Oe(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new Oe(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new Oe(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}};var Fo=class extends en{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Df,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},Bo=class extends en{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function yo(i,e){return!i||i.constructor===e?i:typeof e.BYTES_PER_ELEMENT=="number"?new e(i):Array.prototype.slice.call(i)}function G0(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}function W0(i){function e(s,r){return i[s]-i[r]}let t=i.length,n=new Array(t);for(let s=0;s!==t;++s)n[s]=s;return n.sort(e),n}function Jd(i,e,t){let n=i.length,s=new i.constructor(n);for(let r=0,a=0;a!==n;++r){let o=t[r]*e;for(let c=0;c!==e;++c)s[a++]=i[o+c]}return s}function jf(i,e,t,n){let s=1,r=i[0];for(;r!==void 0&&r[n]===void 0;)r=i[s++];if(r===void 0)return;let a=r[n];if(a!==void 0)if(Array.isArray(a))do a=r[n],a!==void 0&&(e.push(r.time),t.push(...a)),r=i[s++];while(r!==void 0);else if(a.toArray!==void 0)do a=r[n],a!==void 0&&(e.push(r.time),a.toArray(t,t.length)),r=i[s++];while(r!==void 0);else do a=r[n],a!==void 0&&(e.push(r.time),t.push(a)),r=i[s++];while(r!==void 0)}var ci=class{constructor(e,t,n,s){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,s=t[n],r=t[n-1];n:{e:{let a;t:{i:if(!(e<s)){for(let o=n+2;;){if(s===void 0){if(e<r)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===o)break;if(r=s,s=t[++n],e<s)break e}a=t.length;break t}if(!(e>=r)){let o=t[1];e<o&&(n=2,r=o);for(let c=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===c)break;if(s=r,r=t[--n-1],e>=r)break e}a=n,n=0;break t}break n}for(;n<a;){let o=n+a>>>1;e<t[o]?a=o:n=o+1}if(s=t[n],r=t[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,s)}return this.interpolate_(n,r,e,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=e*s;for(let a=0;a!==s;++a)t[a]=n[r+a];return t}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}},ko=class extends ci{constructor(e,t,n,s){super(e,t,n,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Zl,endingEnd:Zl}}intervalChanged_(e,t,n){let s=this.parameterPositions,r=e-2,a=e+1,o=s[r],c=s[a];if(o===void 0)switch(this.getSettings_().endingStart){case Jl:r=e,o=2*t-n;break;case jl:r=s.length-2,o=t+s[r]-s[r+1];break;default:r=e,o=n}if(c===void 0)switch(this.getSettings_().endingEnd){case Jl:a=e,c=2*n-t;break;case jl:a=1,c=n+s[1]-s[0];break;default:a=e-1,c=t}let l=(n-t)*.5,h=this.valueSize;this._weightPrev=l/(t-o),this._weightNext=l/(c-n),this._offsetPrev=r*h,this._offsetNext=a*h}interpolate_(e,t,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=e*o,l=c-o,h=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,f=this._weightNext,g=(n-t)/(s-t),x=g*g,m=x*g,p=-d*m+2*d*x-d*g,M=(1+d)*m+(-1.5-2*d)*x+(-.5+d)*g+1,v=(-1-f)*m+(1.5+f)*x+.5*g,w=f*m-f*x;for(let I=0;I!==o;++I)r[I]=p*a[h+I]+M*a[l+I]+v*a[c+I]+w*a[u+I];return r}},zo=class extends ci{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e,t,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=e*o,l=c-o,h=(n-t)/(s-t),u=1-h;for(let d=0;d!==o;++d)r[d]=a[l+d]*u+a[c+d]*h;return r}},Vo=class extends ci{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e){return this.copySampleValue_(e-1)}},nn=class{constructor(e,t,n,s){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=yo(t,this.TimeBufferType),this.values=yo(n,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:yo(e.times,Array),values:yo(e.values,Array)};let s=e.getInterpolation();s!==e.DefaultInterpolation&&(n.interpolation=s)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new Vo(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new zo(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new ko(this.times,this.values,this.getValueSize(),e)}setInterpolation(e){let t;switch(e){case Ji:t=this.InterpolantFactoryMethodDiscrete;break;case ji:t=this.InterpolantFactoryMethodLinear;break;case vo:t=this.InterpolantFactoryMethodSmooth;break}if(t===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return Re("KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Ji;case this.InterpolantFactoryMethodLinear:return ji;case this.InterpolantFactoryMethodSmooth:return vo}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,s=t.length;n!==s;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,s=t.length;n!==s;++n)t[n]*=e}return this}trim(e,t){let n=this.times,s=n.length,r=0,a=s-1;for(;r!==s&&n[r]<e;)++r;for(;a!==-1&&n[a]>t;)--a;if(++a,r!==0||a!==s){r>=a&&(a=Math.max(a,1),r=a-1);let o=this.getValueSize();this.times=n.slice(r,a),this.values=this.values.slice(r*o,a*o)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(Je("KeyframeTrack: Invalid value size in track.",this),e=!1);let n=this.times,s=this.values,r=n.length;r===0&&(Je("KeyframeTrack: Track is empty.",this),e=!1);let a=null;for(let o=0;o!==r;o++){let c=n[o];if(typeof c=="number"&&isNaN(c)){Je("KeyframeTrack: Time is not a valid number.",this,o,c),e=!1;break}if(a!==null&&a>c){Je("KeyframeTrack: Out of order keys.",this,o,c,a),e=!1;break}a=c}if(s!==void 0&&G0(s))for(let o=0,c=s.length;o!==c;++o){let l=s[o];if(isNaN(l)){Je("KeyframeTrack: Value is not a valid number.",this,o,l),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),s=this.getInterpolation()===vo,r=e.length-1,a=1;for(let o=1;o<r;++o){let c=!1,l=e[o],h=e[o+1];if(l!==h&&(o!==1||l!==e[0]))if(s)c=!0;else{let u=o*n,d=u-n,f=u+n;for(let g=0;g!==n;++g){let x=t[u+g];if(x!==t[d+g]||x!==t[f+g]){c=!0;break}}}if(c){if(o!==a){e[a]=e[o];let u=o*n,d=a*n;for(let f=0;f!==n;++f)t[d+f]=t[u+f]}++a}}if(r>0){e[a]=e[r];for(let o=r*n,c=a*n,l=0;l!==n;++l)t[c+l]=t[o+l];++a}return a!==e.length?(this.times=e.slice(0,a),this.values=t.slice(0,a*n)):(this.times=e,this.values=t),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,s=new n(this.name,e,t);return s.createInterpolant=this.createInterpolant,s}};nn.prototype.ValueTypeName="";nn.prototype.TimeBufferType=Float32Array;nn.prototype.ValueBufferType=Float32Array;nn.prototype.DefaultInterpolation=ji;var li=class extends nn{constructor(e,t,n){super(e,t,n)}};li.prototype.ValueTypeName="bool";li.prototype.ValueBufferType=Array;li.prototype.DefaultInterpolation=Ji;li.prototype.InterpolantFactoryMethodLinear=void 0;li.prototype.InterpolantFactoryMethodSmooth=void 0;var ca=class extends nn{constructor(e,t,n,s){super(e,t,n,s)}};ca.prototype.ValueTypeName="color";var Gn=class extends nn{constructor(e,t,n,s){super(e,t,n,s)}};Gn.prototype.ValueTypeName="number";var Ho=class extends ci{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e,t,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=(n-t)/(s-t),l=e*o;for(let h=l+o;l!==h;l+=4)Kt.slerpFlat(r,0,a,l-o,a,l,c);return r}},Wn=class extends nn{constructor(e,t,n,s){super(e,t,n,s)}InterpolantFactoryMethodLinear(e){return new Ho(this.times,this.values,this.getValueSize(),e)}};Wn.prototype.ValueTypeName="quaternion";Wn.prototype.InterpolantFactoryMethodSmooth=void 0;var hi=class extends nn{constructor(e,t,n){super(e,t,n)}};hi.prototype.ValueTypeName="string";hi.prototype.ValueBufferType=Array;hi.prototype.DefaultInterpolation=Ji;hi.prototype.InterpolantFactoryMethodLinear=void 0;hi.prototype.InterpolantFactoryMethodSmooth=void 0;var Xn=class extends nn{constructor(e,t,n,s){super(e,t,n,s)}};Xn.prototype.ValueTypeName="vector";var la=class{constructor(e="",t=-1,n=[],s=Lf){this.name=e,this.tracks=n,this.duration=t,this.blendMode=s,this.uuid=_n(),this.userData={},this.duration<0&&this.resetDuration()}static parse(e){let t=[],n=e.tracks,s=1/(e.fps||1);for(let a=0,o=n.length;a!==o;++a)t.push(q0(n[a]).scale(s));let r=new this(e.name,e.duration,t,e.blendMode);return r.uuid=e.uuid,r.userData=JSON.parse(e.userData||"{}"),r}static toJSON(e){let t=[],n=e.tracks,s={name:e.name,duration:e.duration,tracks:t,uuid:e.uuid,blendMode:e.blendMode,userData:JSON.stringify(e.userData)};for(let r=0,a=n.length;r!==a;++r)t.push(nn.toJSON(n[r]));return s}static CreateFromMorphTargetSequence(e,t,n,s){let r=t.length,a=[];for(let o=0;o<r;o++){let c=[],l=[];c.push((o+r-1)%r,o,(o+1)%r),l.push(0,1,0);let h=W0(c);c=Jd(c,1,h),l=Jd(l,1,h),!s&&c[0]===0&&(c.push(r),l.push(l[0])),a.push(new Gn(".morphTargetInfluences["+t[o].name+"]",c,l).scale(1/n))}return new this(e,-1,a)}static findByName(e,t){let n=e;if(!Array.isArray(e)){let s=e;n=s.geometry&&s.geometry.animations||s.animations}for(let s=0;s<n.length;s++)if(n[s].name===t)return n[s];return null}static CreateClipsFromMorphTargetSequences(e,t,n){let s={},r=/^([\w-]*?)([\d]+)$/;for(let o=0,c=e.length;o<c;o++){let l=e[o],h=l.name.match(r);if(h&&h.length>1){let u=h[1],d=s[u];d||(s[u]=d=[]),d.push(l)}}let a=[];for(let o in s)a.push(this.CreateFromMorphTargetSequence(o,s[o],t,n));return a}static parseAnimation(e,t){if(Re("AnimationClip: parseAnimation() is deprecated and will be removed with r185"),!e)return Je("AnimationClip: No animation in JSONLoader data."),null;let n=function(u,d,f,g,x){if(f.length!==0){let m=[],p=[];jf(f,m,p,g),m.length!==0&&x.push(new u(d,m,p))}},s=[],r=e.name||"default",a=e.fps||30,o=e.blendMode,c=e.length||-1,l=e.hierarchy||[];for(let u=0;u<l.length;u++){let d=l[u].keys;if(!(!d||d.length===0))if(d[0].morphTargets){let f={},g;for(g=0;g<d.length;g++)if(d[g].morphTargets)for(let x=0;x<d[g].morphTargets.length;x++)f[d[g].morphTargets[x]]=-1;for(let x in f){let m=[],p=[];for(let M=0;M!==d[g].morphTargets.length;++M){let v=d[g];m.push(v.time),p.push(v.morphTarget===x?1:0)}s.push(new Gn(".morphTargetInfluence["+x+"]",m,p))}c=f.length*a}else{let f=".bones["+t[u].name+"]";n(Xn,f+".position",d,"pos",s),n(Wn,f+".quaternion",d,"rot",s),n(Xn,f+".scale",d,"scl",s)}}return s.length===0?null:new this(r,c,s,o)}resetDuration(){let e=this.tracks,t=0;for(let n=0,s=e.length;n!==s;++n){let r=this.tracks[n];t=Math.max(t,r.times[r.times.length-1])}return this.duration=t,this}trim(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].trim(0,this.duration);return this}validate(){let e=!0;for(let t=0;t<this.tracks.length;t++)e=e&&this.tracks[t].validate();return e}optimize(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].optimize();return this}clone(){let e=[];for(let n=0;n<this.tracks.length;n++)e.push(this.tracks[n].clone());let t=new this.constructor(this.name,this.duration,e,this.blendMode);return t.userData=JSON.parse(JSON.stringify(this.userData)),t}toJSON(){return this.constructor.toJSON(this)}};function X0(i){switch(i.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return Gn;case"vector":case"vector2":case"vector3":case"vector4":return Xn;case"color":return ca;case"quaternion":return Wn;case"bool":case"boolean":return li;case"string":return hi}throw new Error("THREE.KeyframeTrack: Unsupported typeName: "+i)}function q0(i){if(i.type===void 0)throw new Error("THREE.KeyframeTrack: track type undefined, can not parse");let e=X0(i.type);if(i.times===void 0){let t=[],n=[];jf(i.keys,t,n,"value"),i.times=t,i.values=n}return e.parse!==void 0?e.parse(i):new e(i.name,i.times,i.values,i.interpolation)}var zn={enabled:!1,files:{},add:function(i,e){this.enabled!==!1&&(this.files[i]=e)},get:function(i){if(this.enabled!==!1)return this.files[i]},remove:function(i){delete this.files[i]},clear:function(){this.files={}}},$s=class{constructor(e,t,n){let s=this,r=!1,a=0,o=0,c,l=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(h){o++,r===!1&&s.onStart!==void 0&&s.onStart(h,a,o),r=!0},this.itemEnd=function(h){a++,s.onProgress!==void 0&&s.onProgress(h,a,o),a===o&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return c?c(h):h},this.setURLModifier=function(h){return c=h,this},this.addHandler=function(h,u){return l.push(h,u),this},this.removeHandler=function(h){let u=l.indexOf(h);return u!==-1&&l.splice(u,2),this},this.getHandler=function(h){for(let u=0,d=l.length;u<d;u+=2){let f=l[u],g=l[u+1];if(f.global&&(f.lastIndex=0),f.test(h))return g}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},$f=new $s,qn=class{constructor(e){this.manager=e!==void 0?e:$f,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,t){let n=this;return new Promise(function(s,r){n.load(e,s,t,r)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}};qn.DEFAULT_MATERIAL_NAME="__DEFAULT";var ri={},sh=class extends Error{constructor(e,t){super(e),this.response=t}},Qs=class extends qn{constructor(e){super(e),this.mimeType="",this.responseType="",this._abortController=new AbortController}load(e,t,n,s){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let r=zn.get(`file:${e}`);if(r!==void 0)return this.manager.itemStart(e),setTimeout(()=>{t&&t(r),this.manager.itemEnd(e)},0),r;if(ri[e]!==void 0){ri[e].push({onLoad:t,onProgress:n,onError:s});return}ri[e]=[],ri[e].push({onLoad:t,onProgress:n,onError:s});let a=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),o=this.mimeType,c=this.responseType;fetch(a).then(l=>{if(l.status===200||l.status===0){if(l.status===0&&Re("FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||l.body===void 0||l.body.getReader===void 0)return l;let h=ri[e],u=l.body.getReader(),d=l.headers.get("X-File-Size")||l.headers.get("Content-Length"),f=d?parseInt(d):0,g=f!==0,x=0,m=new ReadableStream({start(p){M();function M(){u.read().then(({done:v,value:w})=>{if(v)p.close();else{x+=w.byteLength;let I=new ProgressEvent("progress",{lengthComputable:g,loaded:x,total:f});for(let E=0,P=h.length;E<P;E++){let O=h[E];O.onProgress&&O.onProgress(I)}p.enqueue(w),M()}},v=>{p.error(v)})}}});return new Response(m)}else throw new sh(`fetch for "${l.url}" responded with ${l.status}: ${l.statusText}`,l)}).then(l=>{switch(c){case"arraybuffer":return l.arrayBuffer();case"blob":return l.blob();case"document":return l.text().then(h=>new DOMParser().parseFromString(h,o));case"json":return l.json();default:if(o==="")return l.text();{let u=/charset="?([^;"\s]*)"?/i.exec(o),d=u&&u[1]?u[1].toLowerCase():void 0,f=new TextDecoder(d);return l.arrayBuffer().then(g=>f.decode(g))}}}).then(l=>{zn.add(`file:${e}`,l);let h=ri[e];delete ri[e];for(let u=0,d=h.length;u<d;u++){let f=h[u];f.onLoad&&f.onLoad(l)}}).catch(l=>{let h=ri[e];if(h===void 0)throw this.manager.itemError(e),l;delete ri[e];for(let u=0,d=h.length;u<d;u++){let f=h[u];f.onError&&f.onError(l)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}};var Ls=new WeakMap,Go=class extends qn{constructor(e){super(e)}load(e,t,n,s){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let r=this,a=zn.get(`image:${e}`);if(a!==void 0){if(a.complete===!0)r.manager.itemStart(e),setTimeout(function(){t&&t(a),r.manager.itemEnd(e)},0);else{let u=Ls.get(a);u===void 0&&(u=[],Ls.set(a,u)),u.push({onLoad:t,onError:s})}return a}let o=Os("img");function c(){h(),t&&t(this);let u=Ls.get(this)||[];for(let d=0;d<u.length;d++){let f=u[d];f.onLoad&&f.onLoad(this)}Ls.delete(this),r.manager.itemEnd(e)}function l(u){h(),s&&s(u),zn.remove(`image:${e}`);let d=Ls.get(this)||[];for(let f=0;f<d.length;f++){let g=d[f];g.onError&&g.onError(u)}Ls.delete(this),r.manager.itemError(e),r.manager.itemEnd(e)}function h(){o.removeEventListener("load",c,!1),o.removeEventListener("error",l,!1)}return o.addEventListener("load",c,!1),o.addEventListener("error",l,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),zn.add(`image:${e}`,o),r.manager.itemStart(e),o.src=e,o}};var ha=class extends qn{constructor(e){super(e)}load(e,t,n,s){let r=new Nt,a=new Go(this.manager);return a.setCrossOrigin(this.crossOrigin),a.setPath(this.path),a.load(e,function(o){r.image=o,r.needsUpdate=!0,t!==void 0&&t(r)},n,s),r}},ns=class extends xt{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Oe(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(t.object.target=this.target.uuid),t}},ua=class extends ns{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(xt.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Oe(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}},Xl=new We,jd=new D,$d=new D,da=class{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ie(512,512),this.mapType=Nn,this.map=null,this.mapPass=null,this.matrix=new We,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Xs,this._frameExtents=new ie(1,1),this._viewportCount=1,this._viewports=[new it(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera,n=this.matrix;jd.setFromMatrixPosition(e.matrixWorld),t.position.copy(jd),$d.setFromMatrixPosition(e.target.matrixWorld),t.lookAt($d),t.updateMatrixWorld(),Xl.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Xl,t.coordinateSystem,t.reversedDepth),t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(Xl)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}},rh=class extends da{constructor(){super(new At(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(e){let t=this.camera,n=$i*2*e.angle*this.focus,s=this.mapSize.width/this.mapSize.height*this.aspect,r=e.distance||t.far;(n!==t.fov||s!==t.aspect||r!==t.far)&&(t.fov=n,t.aspect=s,t.far=r,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this}},fa=class extends ns{constructor(e,t,n=0,s=Math.PI/3,r=0,a=2){super(e,t),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(xt.DEFAULT_UP),this.updateMatrix(),this.target=new xt,this.distance=n,this.angle=s,this.penumbra=r,this.decay=a,this.map=null,this.shadow=new rh}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}},Qd=new We,Ar=new D,ql=new D,ah=class extends da{constructor(){super(new At(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new ie(4,2),this._viewportCount=6,this._viewports=[new it(2,1,1,1),new it(0,1,1,1),new it(3,1,1,1),new it(1,1,1,1),new it(3,0,1,1),new it(1,0,1,1)],this._cubeDirections=[new D(1,0,0),new D(-1,0,0),new D(0,0,1),new D(0,0,-1),new D(0,1,0),new D(0,-1,0)],this._cubeUps=[new D(0,1,0),new D(0,1,0),new D(0,1,0),new D(0,1,0),new D(0,0,1),new D(0,0,-1)]}updateMatrices(e,t=0){let n=this.camera,s=this.matrix,r=e.distance||n.far;r!==n.far&&(n.far=r,n.updateProjectionMatrix()),Ar.setFromMatrixPosition(e.matrixWorld),n.position.copy(Ar),ql.copy(n.position),ql.add(this._cubeDirections[t]),n.up.copy(this._cubeUps[t]),n.lookAt(ql),n.updateMatrixWorld(),s.makeTranslation(-Ar.x,-Ar.y,-Ar.z),Qd.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Qd,n.coordinateSystem,n.reversedDepth)}},pa=class extends ns{constructor(e,t,n=0,s=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=s,this.shadow=new ah}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}},is=class extends zr{constructor(e=-1,t=1,n=1,s=-1,r=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=s,this.near=r,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,s,r,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=n-e,a=n+e,o=s+t,c=s-t;if(this.view!==null&&this.view.enabled){let l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=l*this.view.offsetX,a=r+l*this.view.width,o-=h*this.view.offsetY,c=o-h*this.view.height}this.projectionMatrix.makeOrthographic(r,a,o,c,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},oh=class extends da{constructor(){super(new is(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},Ri=class extends ns{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(xt.DEFAULT_UP),this.updateMatrix(),this.target=new xt,this.shadow=new oh}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}};var ui=class{static extractUrlBase(e){let t=e.lastIndexOf("/");return t===-1?"./":e.slice(0,t+1)}static resolveURL(e,t){return typeof e!="string"||e===""?"":(/^https?:\/\//i.test(t)&&/^\//.test(e)&&(t=t.replace(/(^https?:\/\/[^\/]+).*/i,"$1")),/^(https?:)?\/\//i.test(e)||/^data:.*,.*$/i.test(e)||/^blob:.*$/i.test(e)?e:t+e)}};var Yl=new WeakMap,ma=class extends qn{constructor(e){super(e),this.isImageBitmapLoader=!0,typeof createImageBitmap>"u"&&Re("ImageBitmapLoader: createImageBitmap() not supported."),typeof fetch>"u"&&Re("ImageBitmapLoader: fetch() not supported."),this.options={premultiplyAlpha:"none"},this._abortController=new AbortController}setOptions(e){return this.options=e,this}load(e,t,n,s){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let r=this,a=zn.get(`image-bitmap:${e}`);if(a!==void 0){if(r.manager.itemStart(e),a.then){a.then(l=>{if(Yl.has(a)===!0)s&&s(Yl.get(a)),r.manager.itemError(e),r.manager.itemEnd(e);else return t&&t(l),r.manager.itemEnd(e),l});return}return setTimeout(function(){t&&t(a),r.manager.itemEnd(e)},0),a}let o={};o.credentials=this.crossOrigin==="anonymous"?"same-origin":"include",o.headers=this.requestHeader,o.signal=typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal;let c=fetch(e,o).then(function(l){return l.blob()}).then(function(l){return createImageBitmap(l,Object.assign(r.options,{colorSpaceConversion:"none"}))}).then(function(l){return zn.add(`image-bitmap:${e}`,l),t&&t(l),r.manager.itemEnd(e),l}).catch(function(l){s&&s(l),Yl.set(c,l),zn.remove(`image-bitmap:${e}`),r.manager.itemError(e),r.manager.itemEnd(e)});zn.add(`image-bitmap:${e}`,c),r.manager.itemStart(e)}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}};var Wo=class extends At{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}};var Ih="\\[\\]\\.:\\/",Y0=new RegExp("["+Ih+"]","g"),Ph="[^"+Ih+"]",K0="[^"+Ih.replace("\\.","")+"]",Z0=/((?:WC+[\/:])*)/.source.replace("WC",Ph),J0=/(WCOD+)?/.source.replace("WCOD",K0),j0=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Ph),$0=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Ph),Q0=new RegExp("^"+Z0+J0+j0+$0+"$"),eg=["material","materials","bones","map"],ch=class{constructor(e,t,n){let s=n||mt.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,s)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,s=this._bindings[n];s!==void 0&&s.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=n.length;s!==r;++s)n[s].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},mt=class i{constructor(e,t,n){this.path=t,this.parsedPath=n||i.parseTrackName(t),this.node=i.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new i.Composite(e,t,n):new i(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(Y0,"")}static parseTrackName(e){let t=Q0.exec(e);if(t===null)throw new Error("PropertyBinding: Cannot parse trackName: "+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},s=n.nodeName&&n.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=n.nodeName.substring(s+1);eg.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,s),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(r){for(let a=0;a<r.length;a++){let o=r[a];if(o.name===t||o.uuid===t)return o;let c=n(o.children);if(c)return c}return null},s=n(e.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)e[t++]=n[s]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node,t=this.parsedPath,n=t.objectName,s=t.propertyName,r=t.propertyIndex;if(e||(e=i.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){Re("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let l=t.objectIndex;switch(n){case"materials":if(!e.material){Je("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){Je("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){Je("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let h=0;h<e.length;h++)if(e[h].name===l){l=h;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){Je("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){Je("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[n]===void 0){Je("PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(l!==void 0){if(e[l]===void 0){Je("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[l]}}let a=e[s];if(a===void 0){let l=t.nodeName;Je("PropertyBinding: Trying to update property for track: "+l+"."+s+" but it wasn't found.",e);return}let o=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?o=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!e.geometry){Je("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){Je("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[r]!==void 0&&(r=e.morphTargetDictionary[r])}c=this.BindingType.ArrayElement,this.resolvedProperty=a,this.propertyIndex=r}else a.fromArray!==void 0&&a.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=a):Array.isArray(a)?(c=this.BindingType.EntireArray,this.resolvedProperty=a):this.propertyName=s;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};mt.Composite=ch;mt.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};mt.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};mt.prototype.GetterByBindingType=[mt.prototype._getValue_direct,mt.prototype._getValue_array,mt.prototype._getValue_arrayElement,mt.prototype._getValue_toArray];mt.prototype.SetterByBindingTypeAndVersioning=[[mt.prototype._setValue_direct,mt.prototype._setValue_direct_setNeedsUpdate,mt.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[mt.prototype._setValue_array,mt.prototype._setValue_array_setNeedsUpdate,mt.prototype._setValue_array_setMatrixWorldNeedsUpdate],[mt.prototype._setValue_arrayElement,mt.prototype._setValue_arrayElement_setNeedsUpdate,mt.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[mt.prototype._setValue_fromArray,mt.prototype._setValue_fromArray_setNeedsUpdate,mt.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var Ub=new Float32Array(1);var er=class{constructor(e=1,t=0,n=0){this.radius=e,this.phi=t,this.theta=n}set(e,t,n){return this.radius=e,this.phi=t,this.theta=n,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=qe(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,n){return this.radius=Math.sqrt(e*e+t*t+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,n),this.phi=Math.acos(qe(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}};var ga=class extends Vn{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(e){if(e===void 0){Re("Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=e}disconnect(){}dispose(){}update(){}};function Lh(i,e,t,n){let s=tg(n);switch(t){case vh:return i*e;case sc:return i*e/s.components*s.byteLength;case rc:return i*e/s.components*s.byteLength;case ac:return i*e*2/s.components*s.byteLength;case oc:return i*e*2/s.components*s.byteLength;case bh:return i*e*3/s.components*s.byteLength;case un:return i*e*4/s.components*s.byteLength;case cc:return i*e*4/s.components*s.byteLength;case _a:case ya:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case va:case ba:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case hc:case dc:return Math.max(i,16)*Math.max(e,8)/4;case lc:case uc:return Math.max(i,8)*Math.max(e,8)/2;case fc:case pc:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case mc:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case gc:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case xc:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case _c:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case yc:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case vc:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case bc:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case Sc:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case Mc:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case wc:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case Ec:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case Tc:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case Ac:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case Cc:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case Rc:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case Ic:case Pc:case Lc:return Math.ceil(i/4)*Math.ceil(e/4)*16;case Dc:case Nc:return Math.ceil(i/4)*Math.ceil(e/4)*8;case Uc:case Oc:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function tg(i){switch(i){case Nn:case gh:return{byteLength:1,components:1};case nr:case xh:case os:return{byteLength:2,components:1};case nc:case ic:return{byteLength:2,components:4};case Li:case tc:case bn:return{byteLength:4,components:1};case _h:case yh:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"181"}}));typeof window<"u"&&(window.__THREE__?Re("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="181");function bp(){let i=null,e=!1,t=null,n=null;function s(r,a){t(r,a),n=i.requestAnimationFrame(s)}return{start:function(){e!==!0&&t!==null&&(n=i.requestAnimationFrame(s),e=!0)},stop:function(){i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){i=r}}}function ig(i){let e=new WeakMap;function t(o,c){let l=o.array,h=o.usage,u=l.byteLength,d=i.createBuffer();i.bindBuffer(c,d),i.bufferData(c,l,h),o.onUploadCallback();let f;if(l instanceof Float32Array)f=i.FLOAT;else if(typeof Float16Array<"u"&&l instanceof Float16Array)f=i.HALF_FLOAT;else if(l instanceof Uint16Array)o.isFloat16BufferAttribute?f=i.HALF_FLOAT:f=i.UNSIGNED_SHORT;else if(l instanceof Int16Array)f=i.SHORT;else if(l instanceof Uint32Array)f=i.UNSIGNED_INT;else if(l instanceof Int32Array)f=i.INT;else if(l instanceof Int8Array)f=i.BYTE;else if(l instanceof Uint8Array)f=i.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)f=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:d,type:f,bytesPerElement:l.BYTES_PER_ELEMENT,version:o.version,size:u}}function n(o,c,l){let h=c.array,u=c.updateRanges;if(i.bindBuffer(l,o),u.length===0)i.bufferSubData(l,0,h);else{u.sort((f,g)=>f.start-g.start);let d=0;for(let f=1;f<u.length;f++){let g=u[d],x=u[f];x.start<=g.start+g.count+1?g.count=Math.max(g.count,x.start+x.count-g.start):(++d,u[d]=x)}u.length=d+1;for(let f=0,g=u.length;f<g;f++){let x=u[f];i.bufferSubData(l,x.start*h.BYTES_PER_ELEMENT,h,x.start,x.count)}c.clearUpdateRanges()}c.onUploadCallback()}function s(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function r(o){o.isInterleavedBufferAttribute&&(o=o.data);let c=e.get(o);c&&(i.deleteBuffer(c.buffer),e.delete(o))}function a(o,c){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){let h=e.get(o);(!h||h.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}let l=e.get(o);if(l===void 0)e.set(o,t(o,c));else if(l.version<o.version){if(l.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(l.buffer,o,c),l.version=o.version}}return{get:s,remove:r,update:a}}var sg=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,rg=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,ag=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,og=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,cg=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,lg=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,hg=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,ug=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,dg=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,fg=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,pg=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,mg=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,gg=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,xg=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,_g=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,yg=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,vg=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,bg=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Sg=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Mg=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,wg=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Eg=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,Tg=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,Ag=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Cg=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Rg=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,Ig=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Pg=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Lg=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Dg=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Ng="gl_FragColor = linearToOutputTexel( gl_FragColor );",Ug=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Og=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,Fg=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,Bg=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,kg=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,zg=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Vg=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Hg=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Gg=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Wg=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Xg=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,qg=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Yg=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Kg=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Zg=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,Jg=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,jg=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,$g=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Qg=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,ex=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,tx=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,nx=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 uv = vec2( roughness, dotNV );
	return texture2D( dfgLUT, uv ).rg;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = DFGApprox( vec3(0.0, 0.0, 1.0), vec3(sqrt(1.0 - dotNV * dotNV), 0.0, dotNV), material.roughness );
	vec2 dfgL = DFGApprox( vec3(0.0, 0.0, 1.0), vec3(sqrt(1.0 - dotNL * dotNL), 0.0, dotNL), material.roughness );
	vec3 FssEss_V = material.specularColor * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColor * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColor + ( 1.0 - material.specularColor ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,ix=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,sx=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,rx=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,ax=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,ox=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,cx=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,lx=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,hx=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,ux=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,dx=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,fx=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,px=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,mx=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,gx=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,xx=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,_x=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,yx=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,vx=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,bx=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Sx=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Mx=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,wx=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Ex=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Tx=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Ax=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Cx=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Rx=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Ix=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Px=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Lx=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,Dx=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Nx=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Ux=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Ox=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Fx=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Bx=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,kx=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		float depth = unpackRGBAToDepth( texture2D( depths, uv ) );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			return step( depth, compare );
		#else
			return step( compare, depth );
		#endif
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow( sampler2D shadow, vec2 uv, float compare ) {
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			float hard_shadow = step( distribution.x, compare );
		#else
			float hard_shadow = step( compare, distribution.x );
		#endif
		if ( hard_shadow != 1.0 ) {
			float distance = compare - distribution.x;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,zx=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Vx=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Hx=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Gx=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Wx=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Xx=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,qx=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Yx=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Kx=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Zx=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Jx=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,jx=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,$x=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Qx=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,e_=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,t_=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,n_=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,i_=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,s_=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,r_=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,a_=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,o_=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,c_=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,l_=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,h_=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,u_=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,d_=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,f_=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,p_=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,m_=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,g_=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,x_=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,__=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,y_=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,v_=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,b_=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,S_=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,M_=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,w_=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,E_=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,T_=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,A_=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,C_=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,R_=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,I_=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,P_=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,L_=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,D_=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,N_=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,U_=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,O_=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Ke={alphahash_fragment:sg,alphahash_pars_fragment:rg,alphamap_fragment:ag,alphamap_pars_fragment:og,alphatest_fragment:cg,alphatest_pars_fragment:lg,aomap_fragment:hg,aomap_pars_fragment:ug,batching_pars_vertex:dg,batching_vertex:fg,begin_vertex:pg,beginnormal_vertex:mg,bsdfs:gg,iridescence_fragment:xg,bumpmap_pars_fragment:_g,clipping_planes_fragment:yg,clipping_planes_pars_fragment:vg,clipping_planes_pars_vertex:bg,clipping_planes_vertex:Sg,color_fragment:Mg,color_pars_fragment:wg,color_pars_vertex:Eg,color_vertex:Tg,common:Ag,cube_uv_reflection_fragment:Cg,defaultnormal_vertex:Rg,displacementmap_pars_vertex:Ig,displacementmap_vertex:Pg,emissivemap_fragment:Lg,emissivemap_pars_fragment:Dg,colorspace_fragment:Ng,colorspace_pars_fragment:Ug,envmap_fragment:Og,envmap_common_pars_fragment:Fg,envmap_pars_fragment:Bg,envmap_pars_vertex:kg,envmap_physical_pars_fragment:Jg,envmap_vertex:zg,fog_vertex:Vg,fog_pars_vertex:Hg,fog_fragment:Gg,fog_pars_fragment:Wg,gradientmap_pars_fragment:Xg,lightmap_pars_fragment:qg,lights_lambert_fragment:Yg,lights_lambert_pars_fragment:Kg,lights_pars_begin:Zg,lights_toon_fragment:jg,lights_toon_pars_fragment:$g,lights_phong_fragment:Qg,lights_phong_pars_fragment:ex,lights_physical_fragment:tx,lights_physical_pars_fragment:nx,lights_fragment_begin:ix,lights_fragment_maps:sx,lights_fragment_end:rx,logdepthbuf_fragment:ax,logdepthbuf_pars_fragment:ox,logdepthbuf_pars_vertex:cx,logdepthbuf_vertex:lx,map_fragment:hx,map_pars_fragment:ux,map_particle_fragment:dx,map_particle_pars_fragment:fx,metalnessmap_fragment:px,metalnessmap_pars_fragment:mx,morphinstance_vertex:gx,morphcolor_vertex:xx,morphnormal_vertex:_x,morphtarget_pars_vertex:yx,morphtarget_vertex:vx,normal_fragment_begin:bx,normal_fragment_maps:Sx,normal_pars_fragment:Mx,normal_pars_vertex:wx,normal_vertex:Ex,normalmap_pars_fragment:Tx,clearcoat_normal_fragment_begin:Ax,clearcoat_normal_fragment_maps:Cx,clearcoat_pars_fragment:Rx,iridescence_pars_fragment:Ix,opaque_fragment:Px,packing:Lx,premultiplied_alpha_fragment:Dx,project_vertex:Nx,dithering_fragment:Ux,dithering_pars_fragment:Ox,roughnessmap_fragment:Fx,roughnessmap_pars_fragment:Bx,shadowmap_pars_fragment:kx,shadowmap_pars_vertex:zx,shadowmap_vertex:Vx,shadowmask_pars_fragment:Hx,skinbase_vertex:Gx,skinning_pars_vertex:Wx,skinning_vertex:Xx,skinnormal_vertex:qx,specularmap_fragment:Yx,specularmap_pars_fragment:Kx,tonemapping_fragment:Zx,tonemapping_pars_fragment:Jx,transmission_fragment:jx,transmission_pars_fragment:$x,uv_pars_fragment:Qx,uv_pars_vertex:e_,uv_vertex:t_,worldpos_vertex:n_,background_vert:i_,background_frag:s_,backgroundCube_vert:r_,backgroundCube_frag:a_,cube_vert:o_,cube_frag:c_,depth_vert:l_,depth_frag:h_,distanceRGBA_vert:u_,distanceRGBA_frag:d_,equirect_vert:f_,equirect_frag:p_,linedashed_vert:m_,linedashed_frag:g_,meshbasic_vert:x_,meshbasic_frag:__,meshlambert_vert:y_,meshlambert_frag:v_,meshmatcap_vert:b_,meshmatcap_frag:S_,meshnormal_vert:M_,meshnormal_frag:w_,meshphong_vert:E_,meshphong_frag:T_,meshphysical_vert:A_,meshphysical_frag:C_,meshtoon_vert:R_,meshtoon_frag:I_,points_vert:P_,points_frag:L_,shadow_vert:D_,shadow_frag:N_,sprite_vert:U_,sprite_frag:O_},me={common:{diffuse:{value:new Oe(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Xe},alphaMap:{value:null},alphaMapTransform:{value:new Xe},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Xe}},envmap:{envMap:{value:null},envMapRotation:{value:new Xe},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Xe}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Xe}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Xe},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Xe},normalScale:{value:new ie(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Xe},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Xe}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Xe}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Xe}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Oe(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Oe(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Xe},alphaTest:{value:0},uvTransform:{value:new Xe}},sprite:{diffuse:{value:new Oe(16777215)},opacity:{value:1},center:{value:new ie(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Xe},alphaMap:{value:null},alphaMapTransform:{value:new Xe},alphaTest:{value:0}}},Zn={basic:{uniforms:Gt([me.common,me.specularmap,me.envmap,me.aomap,me.lightmap,me.fog]),vertexShader:Ke.meshbasic_vert,fragmentShader:Ke.meshbasic_frag},lambert:{uniforms:Gt([me.common,me.specularmap,me.envmap,me.aomap,me.lightmap,me.emissivemap,me.bumpmap,me.normalmap,me.displacementmap,me.fog,me.lights,{emissive:{value:new Oe(0)}}]),vertexShader:Ke.meshlambert_vert,fragmentShader:Ke.meshlambert_frag},phong:{uniforms:Gt([me.common,me.specularmap,me.envmap,me.aomap,me.lightmap,me.emissivemap,me.bumpmap,me.normalmap,me.displacementmap,me.fog,me.lights,{emissive:{value:new Oe(0)},specular:{value:new Oe(1118481)},shininess:{value:30}}]),vertexShader:Ke.meshphong_vert,fragmentShader:Ke.meshphong_frag},standard:{uniforms:Gt([me.common,me.envmap,me.aomap,me.lightmap,me.emissivemap,me.bumpmap,me.normalmap,me.displacementmap,me.roughnessmap,me.metalnessmap,me.fog,me.lights,{emissive:{value:new Oe(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Ke.meshphysical_vert,fragmentShader:Ke.meshphysical_frag},toon:{uniforms:Gt([me.common,me.aomap,me.lightmap,me.emissivemap,me.bumpmap,me.normalmap,me.displacementmap,me.gradientmap,me.fog,me.lights,{emissive:{value:new Oe(0)}}]),vertexShader:Ke.meshtoon_vert,fragmentShader:Ke.meshtoon_frag},matcap:{uniforms:Gt([me.common,me.bumpmap,me.normalmap,me.displacementmap,me.fog,{matcap:{value:null}}]),vertexShader:Ke.meshmatcap_vert,fragmentShader:Ke.meshmatcap_frag},points:{uniforms:Gt([me.points,me.fog]),vertexShader:Ke.points_vert,fragmentShader:Ke.points_frag},dashed:{uniforms:Gt([me.common,me.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Ke.linedashed_vert,fragmentShader:Ke.linedashed_frag},depth:{uniforms:Gt([me.common,me.displacementmap]),vertexShader:Ke.depth_vert,fragmentShader:Ke.depth_frag},normal:{uniforms:Gt([me.common,me.bumpmap,me.normalmap,me.displacementmap,{opacity:{value:1}}]),vertexShader:Ke.meshnormal_vert,fragmentShader:Ke.meshnormal_frag},sprite:{uniforms:Gt([me.sprite,me.fog]),vertexShader:Ke.sprite_vert,fragmentShader:Ke.sprite_frag},background:{uniforms:{uvTransform:{value:new Xe},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Ke.background_vert,fragmentShader:Ke.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Xe}},vertexShader:Ke.backgroundCube_vert,fragmentShader:Ke.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Ke.cube_vert,fragmentShader:Ke.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Ke.equirect_vert,fragmentShader:Ke.equirect_frag},distanceRGBA:{uniforms:Gt([me.common,me.displacementmap,{referencePosition:{value:new D},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Ke.distanceRGBA_vert,fragmentShader:Ke.distanceRGBA_frag},shadow:{uniforms:Gt([me.lights,me.fog,{color:{value:new Oe(0)},opacity:{value:1}}]),vertexShader:Ke.shadow_vert,fragmentShader:Ke.shadow_frag}};Zn.physical={uniforms:Gt([Zn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Xe},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Xe},clearcoatNormalScale:{value:new ie(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Xe},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Xe},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Xe},sheen:{value:0},sheenColor:{value:new Oe(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Xe},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Xe},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Xe},transmissionSamplerSize:{value:new ie},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Xe},attenuationDistance:{value:0},attenuationColor:{value:new Oe(0)},specularColor:{value:new Oe(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Xe},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Xe},anisotropyVector:{value:new ie},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Xe}}]),vertexShader:Ke.meshphysical_vert,fragmentShader:Ke.meshphysical_frag};var Fc={r:0,b:0,g:0},ls=new In,F_=new We;function B_(i,e,t,n,s,r,a){let o=new Oe(0),c=r===!0?0:1,l,h,u=null,d=0,f=null;function g(v){let w=v.isScene===!0?v.background:null;return w&&w.isTexture&&(w=(v.backgroundBlurriness>0?t:e).get(w)),w}function x(v){let w=!1,I=g(v);I===null?p(o,c):I&&I.isColor&&(p(I,1),w=!0);let E=i.xr.getEnvironmentBlendMode();E==="additive"?n.buffers.color.setClear(0,0,0,1,a):E==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,a),(i.autoClear||w)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function m(v,w){let I=g(w);I&&(I.isCubeTexture||I.mapping===xa)?(h===void 0&&(h=new Ht(new Ln(1,1,1),new yn({name:"BackgroundCubeMaterial",uniforms:cs(Zn.backgroundCube.uniforms),vertexShader:Zn.backgroundCube.vertexShader,fragmentShader:Zn.backgroundCube.fragmentShader,side:Jt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(E,P,O){this.matrixWorld.copyPosition(O.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),s.update(h)),ls.copy(w.backgroundRotation),ls.x*=-1,ls.y*=-1,ls.z*=-1,I.isCubeTexture&&I.isRenderTargetTexture===!1&&(ls.y*=-1,ls.z*=-1),h.material.uniforms.envMap.value=I,h.material.uniforms.flipEnvMap.value=I.isCubeTexture&&I.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=w.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=w.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(F_.makeRotationFromEuler(ls)),h.material.toneMapped=tt.getTransfer(I.colorSpace)!==ct,(u!==I||d!==I.version||f!==i.toneMapping)&&(h.material.needsUpdate=!0,u=I,d=I.version,f=i.toneMapping),h.layers.enableAll(),v.unshift(h,h.geometry,h.material,0,0,null)):I&&I.isTexture&&(l===void 0&&(l=new Ht(new oa(2,2),new yn({name:"BackgroundMaterial",uniforms:cs(Zn.background.uniforms),vertexShader:Zn.background.vertexShader,fragmentShader:Zn.background.fragmentShader,side:Rn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),s.update(l)),l.material.uniforms.t2D.value=I,l.material.uniforms.backgroundIntensity.value=w.backgroundIntensity,l.material.toneMapped=tt.getTransfer(I.colorSpace)!==ct,I.matrixAutoUpdate===!0&&I.updateMatrix(),l.material.uniforms.uvTransform.value.copy(I.matrix),(u!==I||d!==I.version||f!==i.toneMapping)&&(l.material.needsUpdate=!0,u=I,d=I.version,f=i.toneMapping),l.layers.enableAll(),v.unshift(l,l.geometry,l.material,0,0,null))}function p(v,w){v.getRGB(Fc,Ch(i)),n.buffers.color.setClear(Fc.r,Fc.g,Fc.b,w,a)}function M(){h!==void 0&&(h.geometry.dispose(),h.material.dispose(),h=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return o},setClearColor:function(v,w=1){o.set(v),c=w,p(o,c)},getClearAlpha:function(){return c},setClearAlpha:function(v){c=v,p(o,c)},render:x,addToRenderList:m,dispose:M}}function k_(i,e){let t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=d(null),r=s,a=!1;function o(y,R,L,k,z){let G=!1,X=u(k,L,R);r!==X&&(r=X,l(r.object)),G=f(y,k,L,z),G&&g(y,k,L,z),z!==null&&e.update(z,i.ELEMENT_ARRAY_BUFFER),(G||a)&&(a=!1,w(y,R,L,k),z!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(z).buffer))}function c(){return i.createVertexArray()}function l(y){return i.bindVertexArray(y)}function h(y){return i.deleteVertexArray(y)}function u(y,R,L){let k=L.wireframe===!0,z=n[y.id];z===void 0&&(z={},n[y.id]=z);let G=z[R.id];G===void 0&&(G={},z[R.id]=G);let X=G[k];return X===void 0&&(X=d(c()),G[k]=X),X}function d(y){let R=[],L=[],k=[];for(let z=0;z<t;z++)R[z]=0,L[z]=0,k[z]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:R,enabledAttributes:L,attributeDivisors:k,object:y,attributes:{},index:null}}function f(y,R,L,k){let z=r.attributes,G=R.attributes,X=0,re=L.getAttributes();for(let Y in re)if(re[Y].location>=0){let le=z[Y],Ee=G[Y];if(Ee===void 0&&(Y==="instanceMatrix"&&y.instanceMatrix&&(Ee=y.instanceMatrix),Y==="instanceColor"&&y.instanceColor&&(Ee=y.instanceColor)),le===void 0||le.attribute!==Ee||Ee&&le.data!==Ee.data)return!0;X++}return r.attributesNum!==X||r.index!==k}function g(y,R,L,k){let z={},G=R.attributes,X=0,re=L.getAttributes();for(let Y in re)if(re[Y].location>=0){let le=G[Y];le===void 0&&(Y==="instanceMatrix"&&y.instanceMatrix&&(le=y.instanceMatrix),Y==="instanceColor"&&y.instanceColor&&(le=y.instanceColor));let Ee={};Ee.attribute=le,le&&le.data&&(Ee.data=le.data),z[Y]=Ee,X++}r.attributes=z,r.attributesNum=X,r.index=k}function x(){let y=r.newAttributes;for(let R=0,L=y.length;R<L;R++)y[R]=0}function m(y){p(y,0)}function p(y,R){let L=r.newAttributes,k=r.enabledAttributes,z=r.attributeDivisors;L[y]=1,k[y]===0&&(i.enableVertexAttribArray(y),k[y]=1),z[y]!==R&&(i.vertexAttribDivisor(y,R),z[y]=R)}function M(){let y=r.newAttributes,R=r.enabledAttributes;for(let L=0,k=R.length;L<k;L++)R[L]!==y[L]&&(i.disableVertexAttribArray(L),R[L]=0)}function v(y,R,L,k,z,G,X){X===!0?i.vertexAttribIPointer(y,R,L,z,G):i.vertexAttribPointer(y,R,L,k,z,G)}function w(y,R,L,k){x();let z=k.attributes,G=L.getAttributes(),X=R.defaultAttributeValues;for(let re in G){let Y=G[re];if(Y.location>=0){let ae=z[re];if(ae===void 0&&(re==="instanceMatrix"&&y.instanceMatrix&&(ae=y.instanceMatrix),re==="instanceColor"&&y.instanceColor&&(ae=y.instanceColor)),ae!==void 0){let le=ae.normalized,Ee=ae.itemSize,Ze=e.get(ae);if(Ze===void 0)continue;let Qe=Ze.buffer,rt=Ze.type,at=Ze.bytesPerElement,K=rt===i.INT||rt===i.UNSIGNED_INT||ae.gpuType===tc;if(ae.isInterleavedBufferAttribute){let j=ae.data,ve=j.stride,De=ae.offset;if(j.isInstancedInterleavedBuffer){for(let Ae=0;Ae<Y.locationSize;Ae++)p(Y.location+Ae,j.meshPerAttribute);y.isInstancedMesh!==!0&&k._maxInstanceCount===void 0&&(k._maxInstanceCount=j.meshPerAttribute*j.count)}else for(let Ae=0;Ae<Y.locationSize;Ae++)m(Y.location+Ae);i.bindBuffer(i.ARRAY_BUFFER,Qe);for(let Ae=0;Ae<Y.locationSize;Ae++)v(Y.location+Ae,Ee/Y.locationSize,rt,le,ve*at,(De+Ee/Y.locationSize*Ae)*at,K)}else{if(ae.isInstancedBufferAttribute){for(let j=0;j<Y.locationSize;j++)p(Y.location+j,ae.meshPerAttribute);y.isInstancedMesh!==!0&&k._maxInstanceCount===void 0&&(k._maxInstanceCount=ae.meshPerAttribute*ae.count)}else for(let j=0;j<Y.locationSize;j++)m(Y.location+j);i.bindBuffer(i.ARRAY_BUFFER,Qe);for(let j=0;j<Y.locationSize;j++)v(Y.location+j,Ee/Y.locationSize,rt,le,Ee*at,Ee/Y.locationSize*j*at,K)}}else if(X!==void 0){let le=X[re];if(le!==void 0)switch(le.length){case 2:i.vertexAttrib2fv(Y.location,le);break;case 3:i.vertexAttrib3fv(Y.location,le);break;case 4:i.vertexAttrib4fv(Y.location,le);break;default:i.vertexAttrib1fv(Y.location,le)}}}}M()}function I(){O();for(let y in n){let R=n[y];for(let L in R){let k=R[L];for(let z in k)h(k[z].object),delete k[z];delete R[L]}delete n[y]}}function E(y){if(n[y.id]===void 0)return;let R=n[y.id];for(let L in R){let k=R[L];for(let z in k)h(k[z].object),delete k[z];delete R[L]}delete n[y.id]}function P(y){for(let R in n){let L=n[R];if(L[y.id]===void 0)continue;let k=L[y.id];for(let z in k)h(k[z].object),delete k[z];delete L[y.id]}}function O(){S(),a=!0,r!==s&&(r=s,l(r.object))}function S(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:o,reset:O,resetDefaultState:S,dispose:I,releaseStatesOfGeometry:E,releaseStatesOfProgram:P,initAttributes:x,enableAttribute:m,disableUnusedAttributes:M}}function z_(i,e,t){let n;function s(l){n=l}function r(l,h){i.drawArrays(n,l,h),t.update(h,n,1)}function a(l,h,u){u!==0&&(i.drawArraysInstanced(n,l,h,u),t.update(h,n,u))}function o(l,h,u){if(u===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,h,0,u);let f=0;for(let g=0;g<u;g++)f+=h[g];t.update(f,n,1)}function c(l,h,u,d){if(u===0)return;let f=e.get("WEBGL_multi_draw");if(f===null)for(let g=0;g<l.length;g++)a(l[g],h[g],d[g]);else{f.multiDrawArraysInstancedWEBGL(n,l,0,h,0,d,0,u);let g=0;for(let x=0;x<u;x++)g+=h[x]*d[x];t.update(g,n,1)}}this.setMode=s,this.render=r,this.renderInstances=a,this.renderMultiDraw=o,this.renderMultiDrawInstances=c}function V_(i,e,t,n){let s;function r(){if(s!==void 0)return s;if(e.has("EXT_texture_filter_anisotropic")===!0){let P=e.get("EXT_texture_filter_anisotropic");s=i.getParameter(P.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function a(P){return!(P!==un&&n.convert(P)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(P){let O=P===os&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(P!==Nn&&n.convert(P)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&P!==bn&&!O)}function c(P){if(P==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";P="mediump"}return P==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=t.precision!==void 0?t.precision:"highp",h=c(l);h!==l&&(Re("WebGLRenderer:",l,"not supported, using",h,"instead."),l=h);let u=t.logarithmicDepthBuffer===!0,d=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),f=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),x=i.getParameter(i.MAX_TEXTURE_SIZE),m=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),p=i.getParameter(i.MAX_VERTEX_ATTRIBS),M=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),v=i.getParameter(i.MAX_VARYING_VECTORS),w=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),I=g>0,E=i.getParameter(i.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:c,textureFormatReadable:a,textureTypeReadable:o,precision:l,logarithmicDepthBuffer:u,reversedDepthBuffer:d,maxTextures:f,maxVertexTextures:g,maxTextureSize:x,maxCubemapSize:m,maxAttributes:p,maxVertexUniforms:M,maxVaryings:v,maxFragmentUniforms:w,vertexTextures:I,maxSamples:E}}function H_(i){let e=this,t=null,n=0,s=!1,r=!1,a=new gn,o=new Xe,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(u,d){let f=u.length!==0||d||n!==0||s;return s=d,n=u.length,f},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(u,d){t=h(u,d,0)},this.setState=function(u,d,f){let g=u.clippingPlanes,x=u.clipIntersection,m=u.clipShadows,p=i.get(u);if(!s||g===null||g.length===0||r&&!m)r?h(null):l();else{let M=r?0:n,v=M*4,w=p.clippingState||null;c.value=w,w=h(g,d,v,f);for(let I=0;I!==v;++I)w[I]=t[I];p.clippingState=w,this.numIntersection=x?this.numPlanes:0,this.numPlanes+=M}};function l(){c.value!==t&&(c.value=t,c.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(u,d,f,g){let x=u!==null?u.length:0,m=null;if(x!==0){if(m=c.value,g!==!0||m===null){let p=f+x*4,M=d.matrixWorldInverse;o.getNormalMatrix(M),(m===null||m.length<p)&&(m=new Float32Array(p));for(let v=0,w=f;v!==x;++v,w+=4)a.copy(u[v]).applyMatrix4(M,o),a.normal.toArray(m,w),m[w+3]=a.constant}c.value=m,c.needsUpdate=!0}return e.numPlanes=x,e.numIntersection=0,m}}function G_(i){let e=new WeakMap;function t(a,o){return o===$o?a.mapping=ss:o===Qo&&(a.mapping=rs),a}function n(a){if(a&&a.isTexture){let o=a.mapping;if(o===$o||o===Qo)if(e.has(a)){let c=e.get(a).texture;return t(c,a.mapping)}else{let c=a.image;if(c&&c.height>0){let l=new Co(c.height);return l.fromEquirectangularTexture(i,a),e.set(a,l),a.addEventListener("dispose",s),t(l.texture,a.mapping)}else return null}}return a}function s(a){let o=a.target;o.removeEventListener("dispose",s);let c=e.get(o);c!==void 0&&(e.delete(o),c.dispose())}function r(){e=new WeakMap}return{get:n,dispose:r}}var Di=4,Qf=[.125,.215,.35,.446,.526,.582],us=20,W_=256,wa=new is,ep=new Oe,Dh=null,Nh=0,Uh=0,Oh=!1,X_=new D,kc=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,s=100,r={}){let{size:a=256,position:o=X_}=r;Dh=this._renderer.getRenderTarget(),Nh=this._renderer.getActiveCubeFace(),Uh=this._renderer.getActiveMipmapLevel(),Oh=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let c=this._allocateTargets();return c.depthBuffer=!0,this._sceneToCubeUV(e,n,s,c,o),t>0&&this._blur(c,0,0,t),this._applyPMREM(c),this._cleanup(c),c}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=ip(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=np(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Dh,Nh,Uh),this._renderer.xr.enabled=Oh,e.scissorTest=!1,ar(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===ss||e.mapping===rs?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Dh=this._renderer.getRenderTarget(),Nh=this._renderer.getActiveCubeFace(),Uh=this._renderer.getActiveMipmapLevel(),Oh=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:Ft,minFilter:Ft,generateMipmaps:!1,type:os,format:un,colorSpace:Bt,depthBuffer:!1},s=tp(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=tp(e,t,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=q_(r)),this._blurMaterial=K_(r,e,t),this._ggxMaterial=Y_(r,e,t)}return s}_compileMaterial(e){let t=new Ht(new Vt,e);this._renderer.compile(t,wa)}_sceneToCubeUV(e,t,n,s,r){let c=new At(90,1,t,n),l=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],u=this._renderer,d=u.autoClear,f=u.toneMapping;u.getClearColor(ep),u.toneMapping=di,u.autoClear=!1,u.state.buffers.depth.getReversed()&&(u.setRenderTarget(s),u.clearDepth(),u.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Ht(new Ln,new Pn({name:"PMREM.Background",side:Jt,depthWrite:!1,depthTest:!1})));let x=this._backgroundBox,m=x.material,p=!1,M=e.background;M?M.isColor&&(m.color.copy(M),e.background=null,p=!0):(m.color.copy(ep),p=!0);for(let v=0;v<6;v++){let w=v%3;w===0?(c.up.set(0,l[v],0),c.position.set(r.x,r.y,r.z),c.lookAt(r.x+h[v],r.y,r.z)):w===1?(c.up.set(0,0,l[v]),c.position.set(r.x,r.y,r.z),c.lookAt(r.x,r.y+h[v],r.z)):(c.up.set(0,l[v],0),c.position.set(r.x,r.y,r.z),c.lookAt(r.x,r.y,r.z+h[v]));let I=this._cubeSize;ar(s,w*I,v>2?I:0,I,I),u.setRenderTarget(s),p&&u.render(x,c),u.render(e,c)}u.toneMapping=f,u.autoClear=d,e.background=M}_textureToCubeUV(e,t){let n=this._renderer,s=e.mapping===ss||e.mapping===rs;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=ip()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=np());let r=s?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=r;let o=r.uniforms;o.envMap.value=e;let c=this._cubeSize;ar(t,0,0,3*c,2*c),n.setRenderTarget(t),n.render(a,wa)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(e,r-1,r);t.autoClear=n}_applyGGXFilter(e,t,n){let s=this._renderer,r=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;let c=a.uniforms,l=n/(this._lodMeshes.length-1),h=t/(this._lodMeshes.length-1),u=Math.sqrt(l*l-h*h),d=.05+l*.95,f=u*d,{_lodMax:g}=this,x=this._sizeLods[n],m=3*x*(n>g-Di?n-g+Di:0),p=4*(this._cubeSize-x);c.envMap.value=e.texture,c.roughness.value=f,c.mipInt.value=g-t,ar(r,m,p,3*x,2*x),s.setRenderTarget(r),s.render(o,wa),c.envMap.value=r.texture,c.roughness.value=0,c.mipInt.value=g-n,ar(e,m,p,3*x,2*x),s.setRenderTarget(e),s.render(o,wa)}_blur(e,t,n,s,r){let a=this._pingPongRenderTarget;this._halfBlur(e,a,t,n,s,"latitudinal",r),this._halfBlur(a,e,n,n,s,"longitudinal",r)}_halfBlur(e,t,n,s,r,a,o){let c=this._renderer,l=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&Je("blur direction must be either latitudinal or longitudinal!");let h=3,u=this._lodMeshes[s];u.material=l;let d=l.uniforms,f=this._sizeLods[n]-1,g=isFinite(r)?Math.PI/(2*f):2*Math.PI/(2*us-1),x=r/g,m=isFinite(r)?1+Math.floor(h*x):us;m>us&&Re(`sigmaRadians, ${r}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${us}`);let p=[],M=0;for(let P=0;P<us;++P){let O=P/x,S=Math.exp(-O*O/2);p.push(S),P===0?M+=S:P<m&&(M+=2*S)}for(let P=0;P<p.length;P++)p[P]=p[P]/M;d.envMap.value=e.texture,d.samples.value=m,d.weights.value=p,d.latitudinal.value=a==="latitudinal",o&&(d.poleAxis.value=o);let{_lodMax:v}=this;d.dTheta.value=g,d.mipInt.value=v-n;let w=this._sizeLods[s],I=3*w*(s>v-Di?s-v+Di:0),E=4*(this._cubeSize-w);ar(t,I,E,3*w,2*w),c.setRenderTarget(t),c.render(u,wa)}};function q_(i){let e=[],t=[],n=[],s=i,r=i-Di+1+Qf.length;for(let a=0;a<r;a++){let o=Math.pow(2,s);e.push(o);let c=1/o;a>i-Di?c=Qf[a-i+Di-1]:a===0&&(c=0),t.push(c);let l=1/(o-2),h=-l,u=1+l,d=[h,h,u,h,u,u,h,h,u,u,h,u],f=6,g=6,x=3,m=2,p=1,M=new Float32Array(x*g*f),v=new Float32Array(m*g*f),w=new Float32Array(p*g*f);for(let E=0;E<f;E++){let P=E%3*2/3-1,O=E>2?0:-1,S=[P,O,0,P+2/3,O,0,P+2/3,O+1,0,P,O,0,P+2/3,O+1,0,P,O+1,0];M.set(S,x*g*E),v.set(d,m*g*E);let y=[E,E,E,E,E,E];w.set(y,p*g*E)}let I=new Vt;I.setAttribute("position",new Ct(M,x)),I.setAttribute("uv",new Ct(v,m)),I.setAttribute("faceIndex",new Ct(w,p)),n.push(new Ht(I,null)),s>Di&&s--}return{lodMeshes:n,sizeLods:e,sigmas:t}}function tp(i,e,t){let n=new Hn(i,e,t);return n.texture.mapping=xa,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function ar(i,e,t,n,s){i.viewport.set(e,t,n,s),i.scissor.set(e,t,n,s)}function Y_(i,e,t){return new yn({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:W_,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Vc(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 3.2: Transform view direction to hemisphere configuration
				vec3 Vh = normalize(vec3(alpha * V.x, alpha * V.y, V.z));

				// Section 4.1: Orthonormal basis
				float lensq = Vh.x * Vh.x + Vh.y * Vh.y;
				vec3 T1 = lensq > 0.0 ? vec3(-Vh.y, Vh.x, 0.0) / sqrt(lensq) : vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(Vh, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + Vh.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * Vh;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:Kn,depthTest:!1,depthWrite:!1})}function K_(i,e,t){let n=new Float32Array(us),s=new D(0,1,0);return new yn({name:"SphericalGaussianBlur",defines:{n:us,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:Vc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:Kn,depthTest:!1,depthWrite:!1})}function np(){return new yn({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Vc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Kn,depthTest:!1,depthWrite:!1})}function ip(){return new yn({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Vc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Kn,depthTest:!1,depthWrite:!1})}function Vc(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function Z_(i){let e=new WeakMap,t=null;function n(o){if(o&&o.isTexture){let c=o.mapping,l=c===$o||c===Qo,h=c===ss||c===rs;if(l||h){let u=e.get(o),d=u!==void 0?u.texture.pmremVersion:0;if(o.isRenderTargetTexture&&o.pmremVersion!==d)return t===null&&(t=new kc(i)),u=l?t.fromEquirectangular(o,u):t.fromCubemap(o,u),u.texture.pmremVersion=o.pmremVersion,e.set(o,u),u.texture;if(u!==void 0)return u.texture;{let f=o.image;return l&&f&&f.height>0||h&&f&&s(f)?(t===null&&(t=new kc(i)),u=l?t.fromEquirectangular(o):t.fromCubemap(o),u.texture.pmremVersion=o.pmremVersion,e.set(o,u),o.addEventListener("dispose",r),u.texture):null}}}return o}function s(o){let c=0,l=6;for(let h=0;h<l;h++)o[h]!==void 0&&c++;return c===l}function r(o){let c=o.target;c.removeEventListener("dispose",r);let l=e.get(c);l!==void 0&&(e.delete(c),l.dispose())}function a(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:n,dispose:a}}function J_(i){let e={};function t(n){if(e[n]!==void 0)return e[n];let s=i.getExtension(n);return e[n]=s,s}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){let s=t(n);return s===null&&Bs("WebGLRenderer: "+n+" extension not supported."),s}}}function j_(i,e,t,n){let s={},r=new WeakMap;function a(u){let d=u.target;d.index!==null&&e.remove(d.index);for(let g in d.attributes)e.remove(d.attributes[g]);d.removeEventListener("dispose",a),delete s[d.id];let f=r.get(d);f&&(e.remove(f),r.delete(d)),n.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,t.memory.geometries--}function o(u,d){return s[d.id]===!0||(d.addEventListener("dispose",a),s[d.id]=!0,t.memory.geometries++),d}function c(u){let d=u.attributes;for(let f in d)e.update(d[f],i.ARRAY_BUFFER)}function l(u){let d=[],f=u.index,g=u.attributes.position,x=0;if(f!==null){let M=f.array;x=f.version;for(let v=0,w=M.length;v<w;v+=3){let I=M[v+0],E=M[v+1],P=M[v+2];d.push(I,E,E,P,P,I)}}else if(g!==void 0){let M=g.array;x=g.version;for(let v=0,w=M.length/3-1;v<w;v+=3){let I=v+0,E=v+1,P=v+2;d.push(I,E,E,P,P,I)}}else return;let m=new(Th(d)?kr:Br)(d,1);m.version=x;let p=r.get(u);p&&e.remove(p),r.set(u,m)}function h(u){let d=r.get(u);if(d){let f=u.index;f!==null&&d.version<f.version&&l(u)}else l(u);return r.get(u)}return{get:o,update:c,getWireframeAttribute:h}}function $_(i,e,t){let n;function s(d){n=d}let r,a;function o(d){r=d.type,a=d.bytesPerElement}function c(d,f){i.drawElements(n,f,r,d*a),t.update(f,n,1)}function l(d,f,g){g!==0&&(i.drawElementsInstanced(n,f,r,d*a,g),t.update(f,n,g))}function h(d,f,g){if(g===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,f,0,r,d,0,g);let m=0;for(let p=0;p<g;p++)m+=f[p];t.update(m,n,1)}function u(d,f,g,x){if(g===0)return;let m=e.get("WEBGL_multi_draw");if(m===null)for(let p=0;p<d.length;p++)l(d[p]/a,f[p],x[p]);else{m.multiDrawElementsInstancedWEBGL(n,f,0,r,d,0,x,0,g);let p=0;for(let M=0;M<g;M++)p+=f[M]*x[M];t.update(p,n,1)}}this.setMode=s,this.setIndex=o,this.render=c,this.renderInstances=l,this.renderMultiDraw=h,this.renderMultiDrawInstances=u}function Q_(i){let e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,a,o){switch(t.calls++,a){case i.TRIANGLES:t.triangles+=o*(r/3);break;case i.LINES:t.lines+=o*(r/2);break;case i.LINE_STRIP:t.lines+=o*(r-1);break;case i.LINE_LOOP:t.lines+=o*r;break;case i.POINTS:t.points+=o*r;break;default:Je("WebGLInfo: Unknown draw mode:",a);break}}function s(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:s,update:n}}function ey(i,e,t){let n=new WeakMap,s=new it;function r(a,o,c){let l=a.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=h!==void 0?h.length:0,d=n.get(o);if(d===void 0||d.count!==u){let S=function(){P.dispose(),n.delete(o),o.removeEventListener("dispose",S)};d!==void 0&&d.texture.dispose();let f=o.morphAttributes.position!==void 0,g=o.morphAttributes.normal!==void 0,x=o.morphAttributes.color!==void 0,m=o.morphAttributes.position||[],p=o.morphAttributes.normal||[],M=o.morphAttributes.color||[],v=0;f===!0&&(v=1),g===!0&&(v=2),x===!0&&(v=3);let w=o.attributes.position.count*v,I=1;w>e.maxTextureSize&&(I=Math.ceil(w/e.maxTextureSize),w=e.maxTextureSize);let E=new Float32Array(w*I*4*u),P=new Or(E,w,I,u);P.type=bn,P.needsUpdate=!0;let O=v*4;for(let y=0;y<u;y++){let R=m[y],L=p[y],k=M[y],z=w*I*4*y;for(let G=0;G<R.count;G++){let X=G*O;f===!0&&(s.fromBufferAttribute(R,G),E[z+X+0]=s.x,E[z+X+1]=s.y,E[z+X+2]=s.z,E[z+X+3]=0),g===!0&&(s.fromBufferAttribute(L,G),E[z+X+4]=s.x,E[z+X+5]=s.y,E[z+X+6]=s.z,E[z+X+7]=0),x===!0&&(s.fromBufferAttribute(k,G),E[z+X+8]=s.x,E[z+X+9]=s.y,E[z+X+10]=s.z,E[z+X+11]=k.itemSize===4?s.w:1)}}d={count:u,texture:P,size:new ie(w,I)},n.set(o,d),o.addEventListener("dispose",S)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)c.getUniforms().setValue(i,"morphTexture",a.morphTexture,t);else{let f=0;for(let x=0;x<l.length;x++)f+=l[x];let g=o.morphTargetsRelative?1:1-f;c.getUniforms().setValue(i,"morphTargetBaseInfluence",g),c.getUniforms().setValue(i,"morphTargetInfluences",l)}c.getUniforms().setValue(i,"morphTargetsTexture",d.texture,t),c.getUniforms().setValue(i,"morphTargetsTextureSize",d.size)}return{update:r}}function ty(i,e,t,n){let s=new WeakMap;function r(c){let l=n.render.frame,h=c.geometry,u=e.get(c,h);if(s.get(u)!==l&&(e.update(u),s.set(u,l)),c.isInstancedMesh&&(c.hasEventListener("dispose",o)===!1&&c.addEventListener("dispose",o),s.get(c)!==l&&(t.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,i.ARRAY_BUFFER),s.set(c,l))),c.isSkinnedMesh){let d=c.skeleton;s.get(d)!==l&&(d.update(),s.set(d,l))}return u}function a(){s=new WeakMap}function o(c){let l=c.target;l.removeEventListener("dispose",o),t.remove(l.instanceMatrix),l.instanceColor!==null&&t.remove(l.instanceColor)}return{update:r,dispose:a}}var Sp=new Nt,sp=new Zr(1,1),Mp=new Or,wp=new To,Ep=new Vr,rp=[],ap=[],op=new Float32Array(16),cp=new Float32Array(9),lp=new Float32Array(4);function cr(i,e,t){let n=i[0];if(n<=0||n>0)return i;let s=e*t,r=rp[s];if(r===void 0&&(r=new Float32Array(s),rp[s]=r),e!==0){n.toArray(r,0);for(let a=1,o=0;a!==e;++a)o+=t,i[a].toArray(r,o)}return r}function Rt(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function It(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function Hc(i,e){let t=ap[e];t===void 0&&(t=new Int32Array(e),ap[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function ny(i,e){let t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function iy(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Rt(t,e))return;i.uniform2fv(this.addr,e),It(t,e)}}function sy(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Rt(t,e))return;i.uniform3fv(this.addr,e),It(t,e)}}function ry(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Rt(t,e))return;i.uniform4fv(this.addr,e),It(t,e)}}function ay(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(Rt(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),It(t,e)}else{if(Rt(t,n))return;lp.set(n),i.uniformMatrix2fv(this.addr,!1,lp),It(t,n)}}function oy(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(Rt(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),It(t,e)}else{if(Rt(t,n))return;cp.set(n),i.uniformMatrix3fv(this.addr,!1,cp),It(t,n)}}function cy(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(Rt(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),It(t,e)}else{if(Rt(t,n))return;op.set(n),i.uniformMatrix4fv(this.addr,!1,op),It(t,n)}}function ly(i,e){let t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function hy(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Rt(t,e))return;i.uniform2iv(this.addr,e),It(t,e)}}function uy(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Rt(t,e))return;i.uniform3iv(this.addr,e),It(t,e)}}function dy(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Rt(t,e))return;i.uniform4iv(this.addr,e),It(t,e)}}function fy(i,e){let t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function py(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Rt(t,e))return;i.uniform2uiv(this.addr,e),It(t,e)}}function my(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Rt(t,e))return;i.uniform3uiv(this.addr,e),It(t,e)}}function gy(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Rt(t,e))return;i.uniform4uiv(this.addr,e),It(t,e)}}function xy(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(sp.compareFunction=wh,r=sp):r=Sp,t.setTexture2D(e||r,s)}function _y(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture3D(e||wp,s)}function yy(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTextureCube(e||Ep,s)}function vy(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture2DArray(e||Mp,s)}function by(i){switch(i){case 5126:return ny;case 35664:return iy;case 35665:return sy;case 35666:return ry;case 35674:return ay;case 35675:return oy;case 35676:return cy;case 5124:case 35670:return ly;case 35667:case 35671:return hy;case 35668:case 35672:return uy;case 35669:case 35673:return dy;case 5125:return fy;case 36294:return py;case 36295:return my;case 36296:return gy;case 35678:case 36198:case 36298:case 36306:case 35682:return xy;case 35679:case 36299:case 36307:return _y;case 35680:case 36300:case 36308:case 36293:return yy;case 36289:case 36303:case 36311:case 36292:return vy}}function Sy(i,e){i.uniform1fv(this.addr,e)}function My(i,e){let t=cr(e,this.size,2);i.uniform2fv(this.addr,t)}function wy(i,e){let t=cr(e,this.size,3);i.uniform3fv(this.addr,t)}function Ey(i,e){let t=cr(e,this.size,4);i.uniform4fv(this.addr,t)}function Ty(i,e){let t=cr(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function Ay(i,e){let t=cr(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function Cy(i,e){let t=cr(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function Ry(i,e){i.uniform1iv(this.addr,e)}function Iy(i,e){i.uniform2iv(this.addr,e)}function Py(i,e){i.uniform3iv(this.addr,e)}function Ly(i,e){i.uniform4iv(this.addr,e)}function Dy(i,e){i.uniform1uiv(this.addr,e)}function Ny(i,e){i.uniform2uiv(this.addr,e)}function Uy(i,e){i.uniform3uiv(this.addr,e)}function Oy(i,e){i.uniform4uiv(this.addr,e)}function Fy(i,e,t){let n=this.cache,s=e.length,r=Hc(t,s);Rt(n,r)||(i.uniform1iv(this.addr,r),It(n,r));for(let a=0;a!==s;++a)t.setTexture2D(e[a]||Sp,r[a])}function By(i,e,t){let n=this.cache,s=e.length,r=Hc(t,s);Rt(n,r)||(i.uniform1iv(this.addr,r),It(n,r));for(let a=0;a!==s;++a)t.setTexture3D(e[a]||wp,r[a])}function ky(i,e,t){let n=this.cache,s=e.length,r=Hc(t,s);Rt(n,r)||(i.uniform1iv(this.addr,r),It(n,r));for(let a=0;a!==s;++a)t.setTextureCube(e[a]||Ep,r[a])}function zy(i,e,t){let n=this.cache,s=e.length,r=Hc(t,s);Rt(n,r)||(i.uniform1iv(this.addr,r),It(n,r));for(let a=0;a!==s;++a)t.setTexture2DArray(e[a]||Mp,r[a])}function Vy(i){switch(i){case 5126:return Sy;case 35664:return My;case 35665:return wy;case 35666:return Ey;case 35674:return Ty;case 35675:return Ay;case 35676:return Cy;case 5124:case 35670:return Ry;case 35667:case 35671:return Iy;case 35668:case 35672:return Py;case 35669:case 35673:return Ly;case 5125:return Dy;case 36294:return Ny;case 36295:return Uy;case 36296:return Oy;case 35678:case 36198:case 36298:case 36306:case 35682:return Fy;case 35679:case 36299:case 36307:return By;case 35680:case 36300:case 36308:case 36293:return ky;case 36289:case 36303:case 36311:case 36292:return zy}}var Bh=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=by(t.type)}},kh=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Vy(t.type)}},zh=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let s=this.seq;for(let r=0,a=s.length;r!==a;++r){let o=s[r];o.setValue(e,t[o.id],n)}}},Fh=/(\w+)(\])?(\[|\.)?/g;function hp(i,e){i.seq.push(e),i.map[e.id]=e}function Hy(i,e,t){let n=i.name,s=n.length;for(Fh.lastIndex=0;;){let r=Fh.exec(n),a=Fh.lastIndex,o=r[1],c=r[2]==="]",l=r[3];if(c&&(o=o|0),l===void 0||l==="["&&a+2===s){hp(t,l===void 0?new Bh(o,i,e):new kh(o,i,e));break}else{let u=t.map[o];u===void 0&&(u=new zh(o),hp(t,u)),t=u}}}var or=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let s=0;s<n;++s){let r=e.getActiveUniform(t,s),a=e.getUniformLocation(t,r.name);Hy(r,a,this)}}setValue(e,t,n,s){let r=this.map[t];r!==void 0&&r.setValue(e,n,s)}setOptional(e,t,n){let s=t[n];s!==void 0&&this.setValue(e,n,s)}static upload(e,t,n,s){for(let r=0,a=t.length;r!==a;++r){let o=t[r],c=n[o.id];c.needsUpdate!==!1&&o.setValue(e,c.value,s)}}static seqWithValue(e,t){let n=[];for(let s=0,r=e.length;s!==r;++s){let a=e[s];a.id in t&&n.push(a)}return n}};function up(i,e,t){let n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}var Gy=37297,Wy=0;function Xy(i,e){let t=i.split(`
`),n=[],s=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let a=s;a<r;a++){let o=a+1;n.push(`${o===e?">":" "} ${o}: ${t[a]}`)}return n.join(`
`)}var dp=new Xe;function qy(i){tt._getMatrix(dp,tt.workingColorSpace,i);let e=`mat3( ${dp.elements.map(t=>t.toFixed(4))} )`;switch(tt.getTransfer(i)){case Dr:return[e,"LinearTransferOETF"];case ct:return[e,"sRGBTransferOETF"];default:return Re("WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function fp(i,e,t){let n=i.getShaderParameter(e,i.COMPILE_STATUS),r=(i.getShaderInfoLog(e)||"").trim();if(n&&r==="")return"";let a=/ERROR: 0:(\d+)/.exec(r);if(a){let o=parseInt(a[1]);return t.toUpperCase()+`

`+r+`

`+Xy(i.getShaderSource(e),o)}else return r}function Yy(i,e){let t=qy(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function Ky(i,e){let t;switch(e){case wf:t="Linear";break;case Ef:t="Reinhard";break;case Tf:t="Cineon";break;case Af:t="ACESFilmic";break;case Rf:t="AgX";break;case If:t="Neutral";break;case Cf:t="Custom";break;default:Re("WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}var Bc=new D;function Zy(){tt.getLuminanceCoefficients(Bc);let i=Bc.x.toFixed(4),e=Bc.y.toFixed(4),t=Bc.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Jy(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Ea).join(`
`)}function jy(i){let e=[];for(let t in i){let n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function $y(i,e){let t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){let r=i.getActiveAttrib(e,s),a=r.name,o=1;r.type===i.FLOAT_MAT2&&(o=2),r.type===i.FLOAT_MAT3&&(o=3),r.type===i.FLOAT_MAT4&&(o=4),t[a]={type:r.type,location:i.getAttribLocation(e,a),locationSize:o}}return t}function Ea(i){return i!==""}function pp(i,e){let t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function mp(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}var Qy=/^[ \t]*#include +<([\w\d./]+)>/gm;function Vh(i){return i.replace(Qy,tv)}var ev=new Map;function tv(i,e){let t=Ke[e];if(t===void 0){let n=ev.get(e);if(n!==void 0)t=Ke[n],Re('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return Vh(t)}var nv=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function gp(i){return i.replace(nv,iv)}function iv(i,e,t,n){let s="";for(let r=parseInt(e);r<parseInt(t);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function xp(i){let e=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?e+=`
#define HIGH_PRECISION`:i.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function sv(i){let e="SHADOWMAP_TYPE_BASIC";return i.shadowMapType===hh?e="SHADOWMAP_TYPE_PCF":i.shadowMapType===nf?e="SHADOWMAP_TYPE_PCF_SOFT":i.shadowMapType===Yn&&(e="SHADOWMAP_TYPE_VSM"),e}function rv(i){let e="ENVMAP_TYPE_CUBE";if(i.envMap)switch(i.envMapMode){case ss:case rs:e="ENVMAP_TYPE_CUBE";break;case xa:e="ENVMAP_TYPE_CUBE_UV";break}return e}function av(i){let e="ENVMAP_MODE_REFLECTION";if(i.envMap)switch(i.envMapMode){case rs:e="ENVMAP_MODE_REFRACTION";break}return e}function ov(i){let e="ENVMAP_BLENDING_NONE";if(i.envMap)switch(i.combine){case ph:e="ENVMAP_BLENDING_MULTIPLY";break;case Sf:e="ENVMAP_BLENDING_MIX";break;case Mf:e="ENVMAP_BLENDING_ADD";break}return e}function cv(i){let e=i.envMapCubeUVHeight;if(e===null)return null;let t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:n,maxMip:t}}function lv(i,e,t,n){let s=i.getContext(),r=t.defines,a=t.vertexShader,o=t.fragmentShader,c=sv(t),l=rv(t),h=av(t),u=ov(t),d=cv(t),f=Jy(t),g=jy(r),x=s.createProgram(),m,p,M=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Ea).join(`
`),m.length>0&&(m+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Ea).join(`
`),p.length>0&&(p+=`
`)):(m=[xp(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Ea).join(`
`),p=[xp(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+l:"",t.envMap?"#define "+h:"",t.envMap?"#define "+u:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==di?"#define TONE_MAPPING":"",t.toneMapping!==di?Ke.tonemapping_pars_fragment:"",t.toneMapping!==di?Ky("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Ke.colorspace_pars_fragment,Yy("linearToOutputTexel",t.outputColorSpace),Zy(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Ea).join(`
`)),a=Vh(a),a=pp(a,t),a=mp(a,t),o=Vh(o),o=pp(o,t),o=mp(o,t),a=gp(a),o=gp(o),t.isRawShaderMaterial!==!0&&(M=`#version 300 es
`,m=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,p=["#define varying in",t.glslVersion===Eh?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Eh?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);let v=M+m+a,w=M+p+o,I=up(s,s.VERTEX_SHADER,v),E=up(s,s.FRAGMENT_SHADER,w);s.attachShader(x,I),s.attachShader(x,E),t.index0AttributeName!==void 0?s.bindAttribLocation(x,0,t.index0AttributeName):t.morphTargets===!0&&s.bindAttribLocation(x,0,"position"),s.linkProgram(x);function P(R){if(i.debug.checkShaderErrors){let L=s.getProgramInfoLog(x)||"",k=s.getShaderInfoLog(I)||"",z=s.getShaderInfoLog(E)||"",G=L.trim(),X=k.trim(),re=z.trim(),Y=!0,ae=!0;if(s.getProgramParameter(x,s.LINK_STATUS)===!1)if(Y=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,x,I,E);else{let le=fp(s,I,"vertex"),Ee=fp(s,E,"fragment");Je("THREE.WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(x,s.VALIDATE_STATUS)+`

Material Name: `+R.name+`
Material Type: `+R.type+`

Program Info Log: `+G+`
`+le+`
`+Ee)}else G!==""?Re("WebGLProgram: Program Info Log:",G):(X===""||re==="")&&(ae=!1);ae&&(R.diagnostics={runnable:Y,programLog:G,vertexShader:{log:X,prefix:m},fragmentShader:{log:re,prefix:p}})}s.deleteShader(I),s.deleteShader(E),O=new or(s,x),S=$y(s,x)}let O;this.getUniforms=function(){return O===void 0&&P(this),O};let S;this.getAttributes=function(){return S===void 0&&P(this),S};let y=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return y===!1&&(y=s.getProgramParameter(x,Gy)),y},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(x),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Wy++,this.cacheKey=e,this.usedTimes=1,this.program=x,this.vertexShader=I,this.fragmentShader=E,this}var hv=0,Hh=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){let t=e.vertexShader,n=e.fragmentShader,s=this._getShaderStage(t),r=this._getShaderStage(n),a=this._getShaderCacheForMaterial(e);return a.has(s)===!1&&(a.add(s),s.usedTimes++),a.has(r)===!1&&(a.add(r),r.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new Gh(e),t.set(e,n)),n}},Gh=class{constructor(e){this.id=hv++,this.code=e,this.usedTimes=0}};function uv(i,e,t,n,s,r,a){let o=new Fr,c=new Hh,l=new Set,h=[],u=s.logarithmicDepthBuffer,d=s.vertexTextures,f=s.precision,g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function x(S){return l.add(S),S===0?"uv":`uv${S}`}function m(S,y,R,L,k){let z=L.fog,G=k.geometry,X=S.isMeshStandardMaterial?L.environment:null,re=(S.isMeshStandardMaterial?t:e).get(S.envMap||X),Y=re&&re.mapping===xa?re.image.height:null,ae=g[S.type];S.precision!==null&&(f=s.getMaxPrecision(S.precision),f!==S.precision&&Re("WebGLProgram.getParameters:",S.precision,"not supported, using",f,"instead."));let le=G.morphAttributes.position||G.morphAttributes.normal||G.morphAttributes.color,Ee=le!==void 0?le.length:0,Ze=0;G.morphAttributes.position!==void 0&&(Ze=1),G.morphAttributes.normal!==void 0&&(Ze=2),G.morphAttributes.color!==void 0&&(Ze=3);let Qe,rt,at,K;if(ae){let lt=Zn[ae];Qe=lt.vertexShader,rt=lt.fragmentShader}else Qe=S.vertexShader,rt=S.fragmentShader,c.update(S),at=c.getVertexShaderID(S),K=c.getFragmentShaderID(S);let j=i.getRenderTarget(),ve=i.state.buffers.depth.getReversed(),De=k.isInstancedMesh===!0,Ae=k.isBatchedMesh===!0,je=!!S.map,ft=!!S.matcap,ke=!!re,Q=!!S.aoMap,A=!!S.lightMap,$=!!S.bumpMap,se=!!S.normalMap,ce=!!S.displacementMap,te=!!S.emissiveMap,Se=!!S.metalnessMap,fe=!!S.roughnessMap,ye=S.anisotropy>0,T=S.clearcoat>0,_=S.dispersion>0,B=S.iridescence>0,q=S.sheen>0,J=S.transmission>0,W=ye&&!!S.anisotropyMap,Ce=T&&!!S.clearcoatMap,pe=T&&!!S.clearcoatNormalMap,Pe=T&&!!S.clearcoatRoughnessMap,Te=B&&!!S.iridescenceMap,ee=B&&!!S.iridescenceThicknessMap,he=q&&!!S.sheenColorMap,Be=q&&!!S.sheenRoughnessMap,Ue=!!S.specularMap,_e=!!S.specularColorMap,Ve=!!S.specularIntensityMap,N=J&&!!S.transmissionMap,ge=J&&!!S.thicknessMap,ue=!!S.gradientMap,de=!!S.alphaMap,ne=S.alphaTest>0,Z=!!S.alphaHash,Me=!!S.extensions,He=di;S.toneMapped&&(j===null||j.isXRRenderTarget===!0)&&(He=i.toneMapping);let gt={shaderID:ae,shaderType:S.type,shaderName:S.name,vertexShader:Qe,fragmentShader:rt,defines:S.defines,customVertexShaderID:at,customFragmentShaderID:K,isRawShaderMaterial:S.isRawShaderMaterial===!0,glslVersion:S.glslVersion,precision:f,batching:Ae,batchingColor:Ae&&k._colorsTexture!==null,instancing:De,instancingColor:De&&k.instanceColor!==null,instancingMorph:De&&k.morphTexture!==null,supportsVertexTextures:d,outputColorSpace:j===null?i.outputColorSpace:j.isXRRenderTarget===!0?j.texture.colorSpace:Bt,alphaToCoverage:!!S.alphaToCoverage,map:je,matcap:ft,envMap:ke,envMapMode:ke&&re.mapping,envMapCubeUVHeight:Y,aoMap:Q,lightMap:A,bumpMap:$,normalMap:se,displacementMap:d&&ce,emissiveMap:te,normalMapObjectSpace:se&&S.normalMapType===Uf,normalMapTangentSpace:se&&S.normalMapType===Mh,metalnessMap:Se,roughnessMap:fe,anisotropy:ye,anisotropyMap:W,clearcoat:T,clearcoatMap:Ce,clearcoatNormalMap:pe,clearcoatRoughnessMap:Pe,dispersion:_,iridescence:B,iridescenceMap:Te,iridescenceThicknessMap:ee,sheen:q,sheenColorMap:he,sheenRoughnessMap:Be,specularMap:Ue,specularColorMap:_e,specularIntensityMap:Ve,transmission:J,transmissionMap:N,thicknessMap:ge,gradientMap:ue,opaque:S.transparent===!1&&S.blending===Ki&&S.alphaToCoverage===!1,alphaMap:de,alphaTest:ne,alphaHash:Z,combine:S.combine,mapUv:je&&x(S.map.channel),aoMapUv:Q&&x(S.aoMap.channel),lightMapUv:A&&x(S.lightMap.channel),bumpMapUv:$&&x(S.bumpMap.channel),normalMapUv:se&&x(S.normalMap.channel),displacementMapUv:ce&&x(S.displacementMap.channel),emissiveMapUv:te&&x(S.emissiveMap.channel),metalnessMapUv:Se&&x(S.metalnessMap.channel),roughnessMapUv:fe&&x(S.roughnessMap.channel),anisotropyMapUv:W&&x(S.anisotropyMap.channel),clearcoatMapUv:Ce&&x(S.clearcoatMap.channel),clearcoatNormalMapUv:pe&&x(S.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Pe&&x(S.clearcoatRoughnessMap.channel),iridescenceMapUv:Te&&x(S.iridescenceMap.channel),iridescenceThicknessMapUv:ee&&x(S.iridescenceThicknessMap.channel),sheenColorMapUv:he&&x(S.sheenColorMap.channel),sheenRoughnessMapUv:Be&&x(S.sheenRoughnessMap.channel),specularMapUv:Ue&&x(S.specularMap.channel),specularColorMapUv:_e&&x(S.specularColorMap.channel),specularIntensityMapUv:Ve&&x(S.specularIntensityMap.channel),transmissionMapUv:N&&x(S.transmissionMap.channel),thicknessMapUv:ge&&x(S.thicknessMap.channel),alphaMapUv:de&&x(S.alphaMap.channel),vertexTangents:!!G.attributes.tangent&&(se||ye),vertexColors:S.vertexColors,vertexAlphas:S.vertexColors===!0&&!!G.attributes.color&&G.attributes.color.itemSize===4,pointsUvs:k.isPoints===!0&&!!G.attributes.uv&&(je||de),fog:!!z,useFog:S.fog===!0,fogExp2:!!z&&z.isFogExp2,flatShading:S.flatShading===!0&&S.wireframe===!1,sizeAttenuation:S.sizeAttenuation===!0,logarithmicDepthBuffer:u,reversedDepthBuffer:ve,skinning:k.isSkinnedMesh===!0,morphTargets:G.morphAttributes.position!==void 0,morphNormals:G.morphAttributes.normal!==void 0,morphColors:G.morphAttributes.color!==void 0,morphTargetsCount:Ee,morphTextureStride:Ze,numDirLights:y.directional.length,numPointLights:y.point.length,numSpotLights:y.spot.length,numSpotLightMaps:y.spotLightMap.length,numRectAreaLights:y.rectArea.length,numHemiLights:y.hemi.length,numDirLightShadows:y.directionalShadowMap.length,numPointLightShadows:y.pointShadowMap.length,numSpotLightShadows:y.spotShadowMap.length,numSpotLightShadowsWithMaps:y.numSpotLightShadowsWithMaps,numLightProbes:y.numLightProbes,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:S.dithering,shadowMapEnabled:i.shadowMap.enabled&&R.length>0,shadowMapType:i.shadowMap.type,toneMapping:He,decodeVideoTexture:je&&S.map.isVideoTexture===!0&&tt.getTransfer(S.map.colorSpace)===ct,decodeVideoTextureEmissive:te&&S.emissiveMap.isVideoTexture===!0&&tt.getTransfer(S.emissiveMap.colorSpace)===ct,premultipliedAlpha:S.premultipliedAlpha,doubleSided:S.side===vn,flipSided:S.side===Jt,useDepthPacking:S.depthPacking>=0,depthPacking:S.depthPacking||0,index0AttributeName:S.index0AttributeName,extensionClipCullDistance:Me&&S.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Me&&S.extensions.multiDraw===!0||Ae)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:S.customProgramCacheKey()};return gt.vertexUv1s=l.has(1),gt.vertexUv2s=l.has(2),gt.vertexUv3s=l.has(3),l.clear(),gt}function p(S){let y=[];if(S.shaderID?y.push(S.shaderID):(y.push(S.customVertexShaderID),y.push(S.customFragmentShaderID)),S.defines!==void 0)for(let R in S.defines)y.push(R),y.push(S.defines[R]);return S.isRawShaderMaterial===!1&&(M(y,S),v(y,S),y.push(i.outputColorSpace)),y.push(S.customProgramCacheKey),y.join()}function M(S,y){S.push(y.precision),S.push(y.outputColorSpace),S.push(y.envMapMode),S.push(y.envMapCubeUVHeight),S.push(y.mapUv),S.push(y.alphaMapUv),S.push(y.lightMapUv),S.push(y.aoMapUv),S.push(y.bumpMapUv),S.push(y.normalMapUv),S.push(y.displacementMapUv),S.push(y.emissiveMapUv),S.push(y.metalnessMapUv),S.push(y.roughnessMapUv),S.push(y.anisotropyMapUv),S.push(y.clearcoatMapUv),S.push(y.clearcoatNormalMapUv),S.push(y.clearcoatRoughnessMapUv),S.push(y.iridescenceMapUv),S.push(y.iridescenceThicknessMapUv),S.push(y.sheenColorMapUv),S.push(y.sheenRoughnessMapUv),S.push(y.specularMapUv),S.push(y.specularColorMapUv),S.push(y.specularIntensityMapUv),S.push(y.transmissionMapUv),S.push(y.thicknessMapUv),S.push(y.combine),S.push(y.fogExp2),S.push(y.sizeAttenuation),S.push(y.morphTargetsCount),S.push(y.morphAttributeCount),S.push(y.numDirLights),S.push(y.numPointLights),S.push(y.numSpotLights),S.push(y.numSpotLightMaps),S.push(y.numHemiLights),S.push(y.numRectAreaLights),S.push(y.numDirLightShadows),S.push(y.numPointLightShadows),S.push(y.numSpotLightShadows),S.push(y.numSpotLightShadowsWithMaps),S.push(y.numLightProbes),S.push(y.shadowMapType),S.push(y.toneMapping),S.push(y.numClippingPlanes),S.push(y.numClipIntersection),S.push(y.depthPacking)}function v(S,y){o.disableAll(),y.supportsVertexTextures&&o.enable(0),y.instancing&&o.enable(1),y.instancingColor&&o.enable(2),y.instancingMorph&&o.enable(3),y.matcap&&o.enable(4),y.envMap&&o.enable(5),y.normalMapObjectSpace&&o.enable(6),y.normalMapTangentSpace&&o.enable(7),y.clearcoat&&o.enable(8),y.iridescence&&o.enable(9),y.alphaTest&&o.enable(10),y.vertexColors&&o.enable(11),y.vertexAlphas&&o.enable(12),y.vertexUv1s&&o.enable(13),y.vertexUv2s&&o.enable(14),y.vertexUv3s&&o.enable(15),y.vertexTangents&&o.enable(16),y.anisotropy&&o.enable(17),y.alphaHash&&o.enable(18),y.batching&&o.enable(19),y.dispersion&&o.enable(20),y.batchingColor&&o.enable(21),y.gradientMap&&o.enable(22),S.push(o.mask),o.disableAll(),y.fog&&o.enable(0),y.useFog&&o.enable(1),y.flatShading&&o.enable(2),y.logarithmicDepthBuffer&&o.enable(3),y.reversedDepthBuffer&&o.enable(4),y.skinning&&o.enable(5),y.morphTargets&&o.enable(6),y.morphNormals&&o.enable(7),y.morphColors&&o.enable(8),y.premultipliedAlpha&&o.enable(9),y.shadowMapEnabled&&o.enable(10),y.doubleSided&&o.enable(11),y.flipSided&&o.enable(12),y.useDepthPacking&&o.enable(13),y.dithering&&o.enable(14),y.transmission&&o.enable(15),y.sheen&&o.enable(16),y.opaque&&o.enable(17),y.pointsUvs&&o.enable(18),y.decodeVideoTexture&&o.enable(19),y.decodeVideoTextureEmissive&&o.enable(20),y.alphaToCoverage&&o.enable(21),S.push(o.mask)}function w(S){let y=g[S.type],R;if(y){let L=Zn[y];R=qf.clone(L.uniforms)}else R=S.uniforms;return R}function I(S,y){let R;for(let L=0,k=h.length;L<k;L++){let z=h[L];if(z.cacheKey===y){R=z,++R.usedTimes;break}}return R===void 0&&(R=new lv(i,y,S,r),h.push(R)),R}function E(S){if(--S.usedTimes===0){let y=h.indexOf(S);h[y]=h[h.length-1],h.pop(),S.destroy()}}function P(S){c.remove(S)}function O(){c.dispose()}return{getParameters:m,getProgramCacheKey:p,getUniforms:w,acquireProgram:I,releaseProgram:E,releaseShaderCache:P,programs:h,dispose:O}}function dv(){let i=new WeakMap;function e(a){return i.has(a)}function t(a){let o=i.get(a);return o===void 0&&(o={},i.set(a,o)),o}function n(a){i.delete(a)}function s(a,o,c){i.get(a)[o]=c}function r(){i=new WeakMap}return{has:e,get:t,remove:n,update:s,dispose:r}}function fv(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.z!==e.z?i.z-e.z:i.id-e.id}function _p(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function yp(){let i=[],e=0,t=[],n=[],s=[];function r(){e=0,t.length=0,n.length=0,s.length=0}function a(u,d,f,g,x,m){let p=i[e];return p===void 0?(p={id:u.id,object:u,geometry:d,material:f,groupOrder:g,renderOrder:u.renderOrder,z:x,group:m},i[e]=p):(p.id=u.id,p.object=u,p.geometry=d,p.material=f,p.groupOrder=g,p.renderOrder=u.renderOrder,p.z=x,p.group=m),e++,p}function o(u,d,f,g,x,m){let p=a(u,d,f,g,x,m);f.transmission>0?n.push(p):f.transparent===!0?s.push(p):t.push(p)}function c(u,d,f,g,x,m){let p=a(u,d,f,g,x,m);f.transmission>0?n.unshift(p):f.transparent===!0?s.unshift(p):t.unshift(p)}function l(u,d){t.length>1&&t.sort(u||fv),n.length>1&&n.sort(d||_p),s.length>1&&s.sort(d||_p)}function h(){for(let u=e,d=i.length;u<d;u++){let f=i[u];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:t,transmissive:n,transparent:s,init:r,push:o,unshift:c,finish:h,sort:l}}function pv(){let i=new WeakMap;function e(n,s){let r=i.get(n),a;return r===void 0?(a=new yp,i.set(n,[a])):s>=r.length?(a=new yp,r.push(a)):a=r[s],a}function t(){i=new WeakMap}return{get:e,dispose:t}}function mv(){let i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new D,color:new Oe};break;case"SpotLight":t={position:new D,direction:new D,color:new Oe,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new D,color:new Oe,distance:0,decay:0};break;case"HemisphereLight":t={direction:new D,skyColor:new Oe,groundColor:new Oe};break;case"RectAreaLight":t={color:new Oe,position:new D,halfWidth:new D,halfHeight:new D};break}return i[e.id]=t,t}}}function gv(){let i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ie};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ie};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ie,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}var xv=0;function _v(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function yv(i){let e=new mv,t=gv(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)n.probe.push(new D);let s=new D,r=new We,a=new We;function o(l){let h=0,u=0,d=0;for(let S=0;S<9;S++)n.probe[S].set(0,0,0);let f=0,g=0,x=0,m=0,p=0,M=0,v=0,w=0,I=0,E=0,P=0;l.sort(_v);for(let S=0,y=l.length;S<y;S++){let R=l[S],L=R.color,k=R.intensity,z=R.distance,G=R.shadow&&R.shadow.map?R.shadow.map.texture:null;if(R.isAmbientLight)h+=L.r*k,u+=L.g*k,d+=L.b*k;else if(R.isLightProbe){for(let X=0;X<9;X++)n.probe[X].addScaledVector(R.sh.coefficients[X],k);P++}else if(R.isDirectionalLight){let X=e.get(R);if(X.color.copy(R.color).multiplyScalar(R.intensity),R.castShadow){let re=R.shadow,Y=t.get(R);Y.shadowIntensity=re.intensity,Y.shadowBias=re.bias,Y.shadowNormalBias=re.normalBias,Y.shadowRadius=re.radius,Y.shadowMapSize=re.mapSize,n.directionalShadow[f]=Y,n.directionalShadowMap[f]=G,n.directionalShadowMatrix[f]=R.shadow.matrix,M++}n.directional[f]=X,f++}else if(R.isSpotLight){let X=e.get(R);X.position.setFromMatrixPosition(R.matrixWorld),X.color.copy(L).multiplyScalar(k),X.distance=z,X.coneCos=Math.cos(R.angle),X.penumbraCos=Math.cos(R.angle*(1-R.penumbra)),X.decay=R.decay,n.spot[x]=X;let re=R.shadow;if(R.map&&(n.spotLightMap[I]=R.map,I++,re.updateMatrices(R),R.castShadow&&E++),n.spotLightMatrix[x]=re.matrix,R.castShadow){let Y=t.get(R);Y.shadowIntensity=re.intensity,Y.shadowBias=re.bias,Y.shadowNormalBias=re.normalBias,Y.shadowRadius=re.radius,Y.shadowMapSize=re.mapSize,n.spotShadow[x]=Y,n.spotShadowMap[x]=G,w++}x++}else if(R.isRectAreaLight){let X=e.get(R);X.color.copy(L).multiplyScalar(k),X.halfWidth.set(R.width*.5,0,0),X.halfHeight.set(0,R.height*.5,0),n.rectArea[m]=X,m++}else if(R.isPointLight){let X=e.get(R);if(X.color.copy(R.color).multiplyScalar(R.intensity),X.distance=R.distance,X.decay=R.decay,R.castShadow){let re=R.shadow,Y=t.get(R);Y.shadowIntensity=re.intensity,Y.shadowBias=re.bias,Y.shadowNormalBias=re.normalBias,Y.shadowRadius=re.radius,Y.shadowMapSize=re.mapSize,Y.shadowCameraNear=re.camera.near,Y.shadowCameraFar=re.camera.far,n.pointShadow[g]=Y,n.pointShadowMap[g]=G,n.pointShadowMatrix[g]=R.shadow.matrix,v++}n.point[g]=X,g++}else if(R.isHemisphereLight){let X=e.get(R);X.skyColor.copy(R.color).multiplyScalar(k),X.groundColor.copy(R.groundColor).multiplyScalar(k),n.hemi[p]=X,p++}}m>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=me.LTC_FLOAT_1,n.rectAreaLTC2=me.LTC_FLOAT_2):(n.rectAreaLTC1=me.LTC_HALF_1,n.rectAreaLTC2=me.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=u,n.ambient[2]=d;let O=n.hash;(O.directionalLength!==f||O.pointLength!==g||O.spotLength!==x||O.rectAreaLength!==m||O.hemiLength!==p||O.numDirectionalShadows!==M||O.numPointShadows!==v||O.numSpotShadows!==w||O.numSpotMaps!==I||O.numLightProbes!==P)&&(n.directional.length=f,n.spot.length=x,n.rectArea.length=m,n.point.length=g,n.hemi.length=p,n.directionalShadow.length=M,n.directionalShadowMap.length=M,n.pointShadow.length=v,n.pointShadowMap.length=v,n.spotShadow.length=w,n.spotShadowMap.length=w,n.directionalShadowMatrix.length=M,n.pointShadowMatrix.length=v,n.spotLightMatrix.length=w+I-E,n.spotLightMap.length=I,n.numSpotLightShadowsWithMaps=E,n.numLightProbes=P,O.directionalLength=f,O.pointLength=g,O.spotLength=x,O.rectAreaLength=m,O.hemiLength=p,O.numDirectionalShadows=M,O.numPointShadows=v,O.numSpotShadows=w,O.numSpotMaps=I,O.numLightProbes=P,n.version=xv++)}function c(l,h){let u=0,d=0,f=0,g=0,x=0,m=h.matrixWorldInverse;for(let p=0,M=l.length;p<M;p++){let v=l[p];if(v.isDirectionalLight){let w=n.directional[u];w.direction.setFromMatrixPosition(v.matrixWorld),s.setFromMatrixPosition(v.target.matrixWorld),w.direction.sub(s),w.direction.transformDirection(m),u++}else if(v.isSpotLight){let w=n.spot[f];w.position.setFromMatrixPosition(v.matrixWorld),w.position.applyMatrix4(m),w.direction.setFromMatrixPosition(v.matrixWorld),s.setFromMatrixPosition(v.target.matrixWorld),w.direction.sub(s),w.direction.transformDirection(m),f++}else if(v.isRectAreaLight){let w=n.rectArea[g];w.position.setFromMatrixPosition(v.matrixWorld),w.position.applyMatrix4(m),a.identity(),r.copy(v.matrixWorld),r.premultiply(m),a.extractRotation(r),w.halfWidth.set(v.width*.5,0,0),w.halfHeight.set(0,v.height*.5,0),w.halfWidth.applyMatrix4(a),w.halfHeight.applyMatrix4(a),g++}else if(v.isPointLight){let w=n.point[d];w.position.setFromMatrixPosition(v.matrixWorld),w.position.applyMatrix4(m),d++}else if(v.isHemisphereLight){let w=n.hemi[x];w.direction.setFromMatrixPosition(v.matrixWorld),w.direction.transformDirection(m),x++}}}return{setup:o,setupView:c,state:n}}function vp(i){let e=new yv(i),t=[],n=[];function s(h){l.camera=h,t.length=0,n.length=0}function r(h){t.push(h)}function a(h){n.push(h)}function o(){e.setup(t)}function c(h){e.setupView(t,h)}let l={lightsArray:t,shadowsArray:n,camera:null,lights:e,transmissionRenderTarget:{}};return{init:s,state:l,setupLights:o,setupLightsView:c,pushLight:r,pushShadow:a}}function vv(i){let e=new WeakMap;function t(s,r=0){let a=e.get(s),o;return a===void 0?(o=new vp(i),e.set(s,[o])):r>=a.length?(o=new vp(i),a.push(o)):o=a[r],o}function n(){e=new WeakMap}return{get:t,dispose:n}}var bv=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Sv=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function Mv(i,e,t){let n=new Xs,s=new ie,r=new ie,a=new it,o=new Fo({depthPacking:Nf}),c=new Bo,l={},h=t.maxTextureSize,u={[Rn]:Jt,[Jt]:Rn,[vn]:vn},d=new yn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ie},radius:{value:4}},vertexShader:bv,fragmentShader:Sv}),f=d.clone();f.defines.HORIZONTAL_PASS=1;let g=new Vt;g.setAttribute("position",new Ct(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let x=new Ht(g,d),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=hh;let p=this.type;this.render=function(E,P,O){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||E.length===0)return;let S=i.getRenderTarget(),y=i.getActiveCubeFace(),R=i.getActiveMipmapLevel(),L=i.state;L.setBlending(Kn),L.buffers.depth.getReversed()===!0?L.buffers.color.setClear(0,0,0,0):L.buffers.color.setClear(1,1,1,1),L.buffers.depth.setTest(!0),L.setScissorTest(!1);let k=p!==Yn&&this.type===Yn,z=p===Yn&&this.type!==Yn;for(let G=0,X=E.length;G<X;G++){let re=E[G],Y=re.shadow;if(Y===void 0){Re("WebGLShadowMap:",re,"has no shadow.");continue}if(Y.autoUpdate===!1&&Y.needsUpdate===!1)continue;s.copy(Y.mapSize);let ae=Y.getFrameExtents();if(s.multiply(ae),r.copy(Y.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/ae.x),s.x=r.x*ae.x,Y.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/ae.y),s.y=r.y*ae.y,Y.mapSize.y=r.y)),Y.map===null||k===!0||z===!0){let Ee=this.type!==Yn?{minFilter:Ot,magFilter:Ot}:{};Y.map!==null&&Y.map.dispose(),Y.map=new Hn(s.x,s.y,Ee),Y.map.texture.name=re.name+".shadowMap",Y.camera.updateProjectionMatrix()}i.setRenderTarget(Y.map),i.clear();let le=Y.getViewportCount();for(let Ee=0;Ee<le;Ee++){let Ze=Y.getViewport(Ee);a.set(r.x*Ze.x,r.y*Ze.y,r.x*Ze.z,r.y*Ze.w),L.viewport(a),Y.updateMatrices(re,Ee),n=Y.getFrustum(),w(P,O,Y.camera,re,this.type)}Y.isPointLightShadow!==!0&&this.type===Yn&&M(Y,O),Y.needsUpdate=!1}p=this.type,m.needsUpdate=!1,i.setRenderTarget(S,y,R)};function M(E,P){let O=e.update(x);d.defines.VSM_SAMPLES!==E.blurSamples&&(d.defines.VSM_SAMPLES=E.blurSamples,f.defines.VSM_SAMPLES=E.blurSamples,d.needsUpdate=!0,f.needsUpdate=!0),E.mapPass===null&&(E.mapPass=new Hn(s.x,s.y)),d.uniforms.shadow_pass.value=E.map.texture,d.uniforms.resolution.value=E.mapSize,d.uniforms.radius.value=E.radius,i.setRenderTarget(E.mapPass),i.clear(),i.renderBufferDirect(P,null,O,d,x,null),f.uniforms.shadow_pass.value=E.mapPass.texture,f.uniforms.resolution.value=E.mapSize,f.uniforms.radius.value=E.radius,i.setRenderTarget(E.map),i.clear(),i.renderBufferDirect(P,null,O,f,x,null)}function v(E,P,O,S){let y=null,R=O.isPointLight===!0?E.customDistanceMaterial:E.customDepthMaterial;if(R!==void 0)y=R;else if(y=O.isPointLight===!0?c:o,i.localClippingEnabled&&P.clipShadows===!0&&Array.isArray(P.clippingPlanes)&&P.clippingPlanes.length!==0||P.displacementMap&&P.displacementScale!==0||P.alphaMap&&P.alphaTest>0||P.map&&P.alphaTest>0||P.alphaToCoverage===!0){let L=y.uuid,k=P.uuid,z=l[L];z===void 0&&(z={},l[L]=z);let G=z[k];G===void 0&&(G=y.clone(),z[k]=G,P.addEventListener("dispose",I)),y=G}if(y.visible=P.visible,y.wireframe=P.wireframe,S===Yn?y.side=P.shadowSide!==null?P.shadowSide:P.side:y.side=P.shadowSide!==null?P.shadowSide:u[P.side],y.alphaMap=P.alphaMap,y.alphaTest=P.alphaToCoverage===!0?.5:P.alphaTest,y.map=P.map,y.clipShadows=P.clipShadows,y.clippingPlanes=P.clippingPlanes,y.clipIntersection=P.clipIntersection,y.displacementMap=P.displacementMap,y.displacementScale=P.displacementScale,y.displacementBias=P.displacementBias,y.wireframeLinewidth=P.wireframeLinewidth,y.linewidth=P.linewidth,O.isPointLight===!0&&y.isMeshDistanceMaterial===!0){let L=i.properties.get(y);L.light=O}return y}function w(E,P,O,S,y){if(E.visible===!1)return;if(E.layers.test(P.layers)&&(E.isMesh||E.isLine||E.isPoints)&&(E.castShadow||E.receiveShadow&&y===Yn)&&(!E.frustumCulled||n.intersectsObject(E))){E.modelViewMatrix.multiplyMatrices(O.matrixWorldInverse,E.matrixWorld);let k=e.update(E),z=E.material;if(Array.isArray(z)){let G=k.groups;for(let X=0,re=G.length;X<re;X++){let Y=G[X],ae=z[Y.materialIndex];if(ae&&ae.visible){let le=v(E,ae,S,y);E.onBeforeShadow(i,E,P,O,k,le,Y),i.renderBufferDirect(O,null,k,le,E,Y),E.onAfterShadow(i,E,P,O,k,le,Y)}}}else if(z.visible){let G=v(E,z,S,y);E.onBeforeShadow(i,E,P,O,k,G,null),i.renderBufferDirect(O,null,k,G,E,null),E.onAfterShadow(i,E,P,O,k,G,null)}}let L=E.children;for(let k=0,z=L.length;k<z;k++)w(L[k],P,O,S,y)}function I(E){E.target.removeEventListener("dispose",I);for(let O in l){let S=l[O],y=E.target.uuid;y in S&&(S[y].dispose(),delete S[y])}}}var wv={[Xo]:qo,[Yo]:Jo,[Ko]:jo,[Zi]:Zo,[qo]:Xo,[Jo]:Yo,[jo]:Ko,[Zo]:Zi};function Ev(i,e){function t(){let N=!1,ge=new it,ue=null,de=new it(0,0,0,0);return{setMask:function(ne){ue!==ne&&!N&&(i.colorMask(ne,ne,ne,ne),ue=ne)},setLocked:function(ne){N=ne},setClear:function(ne,Z,Me,He,gt){gt===!0&&(ne*=He,Z*=He,Me*=He),ge.set(ne,Z,Me,He),de.equals(ge)===!1&&(i.clearColor(ne,Z,Me,He),de.copy(ge))},reset:function(){N=!1,ue=null,de.set(-1,0,0,0)}}}function n(){let N=!1,ge=!1,ue=null,de=null,ne=null;return{setReversed:function(Z){if(ge!==Z){let Me=e.get("EXT_clip_control");Z?Me.clipControlEXT(Me.LOWER_LEFT_EXT,Me.ZERO_TO_ONE_EXT):Me.clipControlEXT(Me.LOWER_LEFT_EXT,Me.NEGATIVE_ONE_TO_ONE_EXT),ge=Z;let He=ne;ne=null,this.setClear(He)}},getReversed:function(){return ge},setTest:function(Z){Z?j(i.DEPTH_TEST):ve(i.DEPTH_TEST)},setMask:function(Z){ue!==Z&&!N&&(i.depthMask(Z),ue=Z)},setFunc:function(Z){if(ge&&(Z=wv[Z]),de!==Z){switch(Z){case Xo:i.depthFunc(i.NEVER);break;case qo:i.depthFunc(i.ALWAYS);break;case Yo:i.depthFunc(i.LESS);break;case Zi:i.depthFunc(i.LEQUAL);break;case Ko:i.depthFunc(i.EQUAL);break;case Zo:i.depthFunc(i.GEQUAL);break;case Jo:i.depthFunc(i.GREATER);break;case jo:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}de=Z}},setLocked:function(Z){N=Z},setClear:function(Z){ne!==Z&&(ge&&(Z=1-Z),i.clearDepth(Z),ne=Z)},reset:function(){N=!1,ue=null,de=null,ne=null,ge=!1}}}function s(){let N=!1,ge=null,ue=null,de=null,ne=null,Z=null,Me=null,He=null,gt=null;return{setTest:function(lt){N||(lt?j(i.STENCIL_TEST):ve(i.STENCIL_TEST))},setMask:function(lt){ge!==lt&&!N&&(i.stencilMask(lt),ge=lt)},setFunc:function(lt,kn,Mn){(ue!==lt||de!==kn||ne!==Mn)&&(i.stencilFunc(lt,kn,Mn),ue=lt,de=kn,ne=Mn)},setOp:function(lt,kn,Mn){(Z!==lt||Me!==kn||He!==Mn)&&(i.stencilOp(lt,kn,Mn),Z=lt,Me=kn,He=Mn)},setLocked:function(lt){N=lt},setClear:function(lt){gt!==lt&&(i.clearStencil(lt),gt=lt)},reset:function(){N=!1,ge=null,ue=null,de=null,ne=null,Z=null,Me=null,He=null,gt=null}}}let r=new t,a=new n,o=new s,c=new WeakMap,l=new WeakMap,h={},u={},d=new WeakMap,f=[],g=null,x=!1,m=null,p=null,M=null,v=null,w=null,I=null,E=null,P=new Oe(0,0,0),O=0,S=!1,y=null,R=null,L=null,k=null,z=null,G=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),X=!1,re=0,Y=i.getParameter(i.VERSION);Y.indexOf("WebGL")!==-1?(re=parseFloat(/^WebGL (\d)/.exec(Y)[1]),X=re>=1):Y.indexOf("OpenGL ES")!==-1&&(re=parseFloat(/^OpenGL ES (\d)/.exec(Y)[1]),X=re>=2);let ae=null,le={},Ee=i.getParameter(i.SCISSOR_BOX),Ze=i.getParameter(i.VIEWPORT),Qe=new it().fromArray(Ee),rt=new it().fromArray(Ze);function at(N,ge,ue,de){let ne=new Uint8Array(4),Z=i.createTexture();i.bindTexture(N,Z),i.texParameteri(N,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(N,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Me=0;Me<ue;Me++)N===i.TEXTURE_3D||N===i.TEXTURE_2D_ARRAY?i.texImage3D(ge,0,i.RGBA,1,1,de,0,i.RGBA,i.UNSIGNED_BYTE,ne):i.texImage2D(ge+Me,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,ne);return Z}let K={};K[i.TEXTURE_2D]=at(i.TEXTURE_2D,i.TEXTURE_2D,1),K[i.TEXTURE_CUBE_MAP]=at(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),K[i.TEXTURE_2D_ARRAY]=at(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),K[i.TEXTURE_3D]=at(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),a.setClear(1),o.setClear(0),j(i.DEPTH_TEST),a.setFunc(Zi),$(!1),se(lh),j(i.CULL_FACE),Q(Kn);function j(N){h[N]!==!0&&(i.enable(N),h[N]=!0)}function ve(N){h[N]!==!1&&(i.disable(N),h[N]=!1)}function De(N,ge){return u[N]!==ge?(i.bindFramebuffer(N,ge),u[N]=ge,N===i.DRAW_FRAMEBUFFER&&(u[i.FRAMEBUFFER]=ge),N===i.FRAMEBUFFER&&(u[i.DRAW_FRAMEBUFFER]=ge),!0):!1}function Ae(N,ge){let ue=f,de=!1;if(N){ue=d.get(ge),ue===void 0&&(ue=[],d.set(ge,ue));let ne=N.textures;if(ue.length!==ne.length||ue[0]!==i.COLOR_ATTACHMENT0){for(let Z=0,Me=ne.length;Z<Me;Z++)ue[Z]=i.COLOR_ATTACHMENT0+Z;ue.length=ne.length,de=!0}}else ue[0]!==i.BACK&&(ue[0]=i.BACK,de=!0);de&&i.drawBuffers(ue)}function je(N){return g!==N?(i.useProgram(N),g=N,!0):!1}let ft={[Ti]:i.FUNC_ADD,[rf]:i.FUNC_SUBTRACT,[af]:i.FUNC_REVERSE_SUBTRACT};ft[of]=i.MIN,ft[cf]=i.MAX;let ke={[lf]:i.ZERO,[hf]:i.ONE,[uf]:i.SRC_COLOR,[bo]:i.SRC_ALPHA,[xf]:i.SRC_ALPHA_SATURATE,[mf]:i.DST_COLOR,[ff]:i.DST_ALPHA,[df]:i.ONE_MINUS_SRC_COLOR,[So]:i.ONE_MINUS_SRC_ALPHA,[gf]:i.ONE_MINUS_DST_COLOR,[pf]:i.ONE_MINUS_DST_ALPHA,[_f]:i.CONSTANT_COLOR,[yf]:i.ONE_MINUS_CONSTANT_COLOR,[vf]:i.CONSTANT_ALPHA,[bf]:i.ONE_MINUS_CONSTANT_ALPHA};function Q(N,ge,ue,de,ne,Z,Me,He,gt,lt){if(N===Kn){x===!0&&(ve(i.BLEND),x=!1);return}if(x===!1&&(j(i.BLEND),x=!0),N!==sf){if(N!==m||lt!==S){if((p!==Ti||w!==Ti)&&(i.blendEquation(i.FUNC_ADD),p=Ti,w=Ti),lt)switch(N){case Ki:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case uh:i.blendFunc(i.ONE,i.ONE);break;case dh:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case fh:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Je("WebGLState: Invalid blending: ",N);break}else switch(N){case Ki:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case uh:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case dh:Je("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case fh:Je("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Je("WebGLState: Invalid blending: ",N);break}M=null,v=null,I=null,E=null,P.set(0,0,0),O=0,m=N,S=lt}return}ne=ne||ge,Z=Z||ue,Me=Me||de,(ge!==p||ne!==w)&&(i.blendEquationSeparate(ft[ge],ft[ne]),p=ge,w=ne),(ue!==M||de!==v||Z!==I||Me!==E)&&(i.blendFuncSeparate(ke[ue],ke[de],ke[Z],ke[Me]),M=ue,v=de,I=Z,E=Me),(He.equals(P)===!1||gt!==O)&&(i.blendColor(He.r,He.g,He.b,gt),P.copy(He),O=gt),m=N,S=!1}function A(N,ge){N.side===vn?ve(i.CULL_FACE):j(i.CULL_FACE);let ue=N.side===Jt;ge&&(ue=!ue),$(ue),N.blending===Ki&&N.transparent===!1?Q(Kn):Q(N.blending,N.blendEquation,N.blendSrc,N.blendDst,N.blendEquationAlpha,N.blendSrcAlpha,N.blendDstAlpha,N.blendColor,N.blendAlpha,N.premultipliedAlpha),a.setFunc(N.depthFunc),a.setTest(N.depthTest),a.setMask(N.depthWrite),r.setMask(N.colorWrite);let de=N.stencilWrite;o.setTest(de),de&&(o.setMask(N.stencilWriteMask),o.setFunc(N.stencilFunc,N.stencilRef,N.stencilFuncMask),o.setOp(N.stencilFail,N.stencilZFail,N.stencilZPass)),te(N.polygonOffset,N.polygonOffsetFactor,N.polygonOffsetUnits),N.alphaToCoverage===!0?j(i.SAMPLE_ALPHA_TO_COVERAGE):ve(i.SAMPLE_ALPHA_TO_COVERAGE)}function $(N){y!==N&&(N?i.frontFace(i.CW):i.frontFace(i.CCW),y=N)}function se(N){N!==ef?(j(i.CULL_FACE),N!==R&&(N===lh?i.cullFace(i.BACK):N===tf?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):ve(i.CULL_FACE),R=N}function ce(N){N!==L&&(X&&i.lineWidth(N),L=N)}function te(N,ge,ue){N?(j(i.POLYGON_OFFSET_FILL),(k!==ge||z!==ue)&&(i.polygonOffset(ge,ue),k=ge,z=ue)):ve(i.POLYGON_OFFSET_FILL)}function Se(N){N?j(i.SCISSOR_TEST):ve(i.SCISSOR_TEST)}function fe(N){N===void 0&&(N=i.TEXTURE0+G-1),ae!==N&&(i.activeTexture(N),ae=N)}function ye(N,ge,ue){ue===void 0&&(ae===null?ue=i.TEXTURE0+G-1:ue=ae);let de=le[ue];de===void 0&&(de={type:void 0,texture:void 0},le[ue]=de),(de.type!==N||de.texture!==ge)&&(ae!==ue&&(i.activeTexture(ue),ae=ue),i.bindTexture(N,ge||K[N]),de.type=N,de.texture=ge)}function T(){let N=le[ae];N!==void 0&&N.type!==void 0&&(i.bindTexture(N.type,null),N.type=void 0,N.texture=void 0)}function _(){try{i.compressedTexImage2D(...arguments)}catch(N){N("WebGLState:",N)}}function B(){try{i.compressedTexImage3D(...arguments)}catch(N){N("WebGLState:",N)}}function q(){try{i.texSubImage2D(...arguments)}catch(N){N("WebGLState:",N)}}function J(){try{i.texSubImage3D(...arguments)}catch(N){N("WebGLState:",N)}}function W(){try{i.compressedTexSubImage2D(...arguments)}catch(N){N("WebGLState:",N)}}function Ce(){try{i.compressedTexSubImage3D(...arguments)}catch(N){N("WebGLState:",N)}}function pe(){try{i.texStorage2D(...arguments)}catch(N){N("WebGLState:",N)}}function Pe(){try{i.texStorage3D(...arguments)}catch(N){N("WebGLState:",N)}}function Te(){try{i.texImage2D(...arguments)}catch(N){N("WebGLState:",N)}}function ee(){try{i.texImage3D(...arguments)}catch(N){N("WebGLState:",N)}}function he(N){Qe.equals(N)===!1&&(i.scissor(N.x,N.y,N.z,N.w),Qe.copy(N))}function Be(N){rt.equals(N)===!1&&(i.viewport(N.x,N.y,N.z,N.w),rt.copy(N))}function Ue(N,ge){let ue=l.get(ge);ue===void 0&&(ue=new WeakMap,l.set(ge,ue));let de=ue.get(N);de===void 0&&(de=i.getUniformBlockIndex(ge,N.name),ue.set(N,de))}function _e(N,ge){let de=l.get(ge).get(N);c.get(ge)!==de&&(i.uniformBlockBinding(ge,de,N.__bindingPointIndex),c.set(ge,de))}function Ve(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),a.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),h={},ae=null,le={},u={},d=new WeakMap,f=[],g=null,x=!1,m=null,p=null,M=null,v=null,w=null,I=null,E=null,P=new Oe(0,0,0),O=0,S=!1,y=null,R=null,L=null,k=null,z=null,Qe.set(0,0,i.canvas.width,i.canvas.height),rt.set(0,0,i.canvas.width,i.canvas.height),r.reset(),a.reset(),o.reset()}return{buffers:{color:r,depth:a,stencil:o},enable:j,disable:ve,bindFramebuffer:De,drawBuffers:Ae,useProgram:je,setBlending:Q,setMaterial:A,setFlipSided:$,setCullFace:se,setLineWidth:ce,setPolygonOffset:te,setScissorTest:Se,activeTexture:fe,bindTexture:ye,unbindTexture:T,compressedTexImage2D:_,compressedTexImage3D:B,texImage2D:Te,texImage3D:ee,updateUBOMapping:Ue,uniformBlockBinding:_e,texStorage2D:pe,texStorage3D:Pe,texSubImage2D:q,texSubImage3D:J,compressedTexSubImage2D:W,compressedTexSubImage3D:Ce,scissor:he,viewport:Be,reset:Ve}}function Tv(i,e,t,n,s,r,a){let o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new ie,h=new WeakMap,u,d=new WeakMap,f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(T,_){return f?new OffscreenCanvas(T,_):Os("canvas")}function x(T,_,B){let q=1,J=ye(T);if((J.width>B||J.height>B)&&(q=B/Math.max(J.width,J.height)),q<1)if(typeof HTMLImageElement<"u"&&T instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&T instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&T instanceof ImageBitmap||typeof VideoFrame<"u"&&T instanceof VideoFrame){let W=Math.floor(q*J.width),Ce=Math.floor(q*J.height);u===void 0&&(u=g(W,Ce));let pe=_?g(W,Ce):u;return pe.width=W,pe.height=Ce,pe.getContext("2d").drawImage(T,0,0,W,Ce),Re("WebGLRenderer: Texture has been resized from ("+J.width+"x"+J.height+") to ("+W+"x"+Ce+")."),pe}else return"data"in T&&Re("WebGLRenderer: Image in DataTexture is too big ("+J.width+"x"+J.height+")."),T;return T}function m(T){return T.generateMipmaps}function p(T){i.generateMipmap(T)}function M(T){return T.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:T.isWebGL3DRenderTarget?i.TEXTURE_3D:T.isWebGLArrayRenderTarget||T.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function v(T,_,B,q,J=!1){if(T!==null){if(i[T]!==void 0)return i[T];Re("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+T+"'")}let W=_;if(_===i.RED&&(B===i.FLOAT&&(W=i.R32F),B===i.HALF_FLOAT&&(W=i.R16F),B===i.UNSIGNED_BYTE&&(W=i.R8)),_===i.RED_INTEGER&&(B===i.UNSIGNED_BYTE&&(W=i.R8UI),B===i.UNSIGNED_SHORT&&(W=i.R16UI),B===i.UNSIGNED_INT&&(W=i.R32UI),B===i.BYTE&&(W=i.R8I),B===i.SHORT&&(W=i.R16I),B===i.INT&&(W=i.R32I)),_===i.RG&&(B===i.FLOAT&&(W=i.RG32F),B===i.HALF_FLOAT&&(W=i.RG16F),B===i.UNSIGNED_BYTE&&(W=i.RG8)),_===i.RG_INTEGER&&(B===i.UNSIGNED_BYTE&&(W=i.RG8UI),B===i.UNSIGNED_SHORT&&(W=i.RG16UI),B===i.UNSIGNED_INT&&(W=i.RG32UI),B===i.BYTE&&(W=i.RG8I),B===i.SHORT&&(W=i.RG16I),B===i.INT&&(W=i.RG32I)),_===i.RGB_INTEGER&&(B===i.UNSIGNED_BYTE&&(W=i.RGB8UI),B===i.UNSIGNED_SHORT&&(W=i.RGB16UI),B===i.UNSIGNED_INT&&(W=i.RGB32UI),B===i.BYTE&&(W=i.RGB8I),B===i.SHORT&&(W=i.RGB16I),B===i.INT&&(W=i.RGB32I)),_===i.RGBA_INTEGER&&(B===i.UNSIGNED_BYTE&&(W=i.RGBA8UI),B===i.UNSIGNED_SHORT&&(W=i.RGBA16UI),B===i.UNSIGNED_INT&&(W=i.RGBA32UI),B===i.BYTE&&(W=i.RGBA8I),B===i.SHORT&&(W=i.RGBA16I),B===i.INT&&(W=i.RGBA32I)),_===i.RGB&&(B===i.UNSIGNED_INT_5_9_9_9_REV&&(W=i.RGB9_E5),B===i.UNSIGNED_INT_10F_11F_11F_REV&&(W=i.R11F_G11F_B10F)),_===i.RGBA){let Ce=J?Dr:tt.getTransfer(q);B===i.FLOAT&&(W=i.RGBA32F),B===i.HALF_FLOAT&&(W=i.RGBA16F),B===i.UNSIGNED_BYTE&&(W=Ce===ct?i.SRGB8_ALPHA8:i.RGBA8),B===i.UNSIGNED_SHORT_4_4_4_4&&(W=i.RGBA4),B===i.UNSIGNED_SHORT_5_5_5_1&&(W=i.RGB5_A1)}return(W===i.R16F||W===i.R32F||W===i.RG16F||W===i.RG32F||W===i.RGBA16F||W===i.RGBA32F)&&e.get("EXT_color_buffer_float"),W}function w(T,_){let B;return T?_===null||_===Li||_===ir?B=i.DEPTH24_STENCIL8:_===bn?B=i.DEPTH32F_STENCIL8:_===nr&&(B=i.DEPTH24_STENCIL8,Re("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):_===null||_===Li||_===ir?B=i.DEPTH_COMPONENT24:_===bn?B=i.DEPTH_COMPONENT32F:_===nr&&(B=i.DEPTH_COMPONENT16),B}function I(T,_){return m(T)===!0||T.isFramebufferTexture&&T.minFilter!==Ot&&T.minFilter!==Ft?Math.log2(Math.max(_.width,_.height))+1:T.mipmaps!==void 0&&T.mipmaps.length>0?T.mipmaps.length:T.isCompressedTexture&&Array.isArray(T.image)?_.mipmaps.length:1}function E(T){let _=T.target;_.removeEventListener("dispose",E),O(_),_.isVideoTexture&&h.delete(_)}function P(T){let _=T.target;_.removeEventListener("dispose",P),y(_)}function O(T){let _=n.get(T);if(_.__webglInit===void 0)return;let B=T.source,q=d.get(B);if(q){let J=q[_.__cacheKey];J.usedTimes--,J.usedTimes===0&&S(T),Object.keys(q).length===0&&d.delete(B)}n.remove(T)}function S(T){let _=n.get(T);i.deleteTexture(_.__webglTexture);let B=T.source,q=d.get(B);delete q[_.__cacheKey],a.memory.textures--}function y(T){let _=n.get(T);if(T.depthTexture&&(T.depthTexture.dispose(),n.remove(T.depthTexture)),T.isWebGLCubeRenderTarget)for(let q=0;q<6;q++){if(Array.isArray(_.__webglFramebuffer[q]))for(let J=0;J<_.__webglFramebuffer[q].length;J++)i.deleteFramebuffer(_.__webglFramebuffer[q][J]);else i.deleteFramebuffer(_.__webglFramebuffer[q]);_.__webglDepthbuffer&&i.deleteRenderbuffer(_.__webglDepthbuffer[q])}else{if(Array.isArray(_.__webglFramebuffer))for(let q=0;q<_.__webglFramebuffer.length;q++)i.deleteFramebuffer(_.__webglFramebuffer[q]);else i.deleteFramebuffer(_.__webglFramebuffer);if(_.__webglDepthbuffer&&i.deleteRenderbuffer(_.__webglDepthbuffer),_.__webglMultisampledFramebuffer&&i.deleteFramebuffer(_.__webglMultisampledFramebuffer),_.__webglColorRenderbuffer)for(let q=0;q<_.__webglColorRenderbuffer.length;q++)_.__webglColorRenderbuffer[q]&&i.deleteRenderbuffer(_.__webglColorRenderbuffer[q]);_.__webglDepthRenderbuffer&&i.deleteRenderbuffer(_.__webglDepthRenderbuffer)}let B=T.textures;for(let q=0,J=B.length;q<J;q++){let W=n.get(B[q]);W.__webglTexture&&(i.deleteTexture(W.__webglTexture),a.memory.textures--),n.remove(B[q])}n.remove(T)}let R=0;function L(){R=0}function k(){let T=R;return T>=s.maxTextures&&Re("WebGLTextures: Trying to use "+T+" texture units while this GPU supports only "+s.maxTextures),R+=1,T}function z(T){let _=[];return _.push(T.wrapS),_.push(T.wrapT),_.push(T.wrapR||0),_.push(T.magFilter),_.push(T.minFilter),_.push(T.anisotropy),_.push(T.internalFormat),_.push(T.format),_.push(T.type),_.push(T.generateMipmaps),_.push(T.premultiplyAlpha),_.push(T.flipY),_.push(T.unpackAlignment),_.push(T.colorSpace),_.join()}function G(T,_){let B=n.get(T);if(T.isVideoTexture&&Se(T),T.isRenderTargetTexture===!1&&T.isExternalTexture!==!0&&T.version>0&&B.__version!==T.version){let q=T.image;if(q===null)Re("WebGLRenderer: Texture marked for update but no image data found.");else if(q.complete===!1)Re("WebGLRenderer: Texture marked for update but image is incomplete");else{K(B,T,_);return}}else T.isExternalTexture&&(B.__webglTexture=T.sourceTexture?T.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,B.__webglTexture,i.TEXTURE0+_)}function X(T,_){let B=n.get(T);if(T.isRenderTargetTexture===!1&&T.version>0&&B.__version!==T.version){K(B,T,_);return}else T.isExternalTexture&&(B.__webglTexture=T.sourceTexture?T.sourceTexture:null);t.bindTexture(i.TEXTURE_2D_ARRAY,B.__webglTexture,i.TEXTURE0+_)}function re(T,_){let B=n.get(T);if(T.isRenderTargetTexture===!1&&T.version>0&&B.__version!==T.version){K(B,T,_);return}t.bindTexture(i.TEXTURE_3D,B.__webglTexture,i.TEXTURE0+_)}function Y(T,_){let B=n.get(T);if(T.version>0&&B.__version!==T.version){j(B,T,_);return}t.bindTexture(i.TEXTURE_CUBE_MAP,B.__webglTexture,i.TEXTURE0+_)}let ae={[Ai]:i.REPEAT,[xn]:i.CLAMP_TO_EDGE,[Ns]:i.MIRRORED_REPEAT},le={[Ot]:i.NEAREST,[ec]:i.NEAREST_MIPMAP_NEAREST,[as]:i.NEAREST_MIPMAP_LINEAR,[Ft]:i.LINEAR,[tr]:i.LINEAR_MIPMAP_NEAREST,[Dn]:i.LINEAR_MIPMAP_LINEAR},Ee={[Of]:i.NEVER,[Hf]:i.ALWAYS,[Ff]:i.LESS,[wh]:i.LEQUAL,[Bf]:i.EQUAL,[Vf]:i.GEQUAL,[kf]:i.GREATER,[zf]:i.NOTEQUAL};function Ze(T,_){if(_.type===bn&&e.has("OES_texture_float_linear")===!1&&(_.magFilter===Ft||_.magFilter===tr||_.magFilter===as||_.magFilter===Dn||_.minFilter===Ft||_.minFilter===tr||_.minFilter===as||_.minFilter===Dn)&&Re("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(T,i.TEXTURE_WRAP_S,ae[_.wrapS]),i.texParameteri(T,i.TEXTURE_WRAP_T,ae[_.wrapT]),(T===i.TEXTURE_3D||T===i.TEXTURE_2D_ARRAY)&&i.texParameteri(T,i.TEXTURE_WRAP_R,ae[_.wrapR]),i.texParameteri(T,i.TEXTURE_MAG_FILTER,le[_.magFilter]),i.texParameteri(T,i.TEXTURE_MIN_FILTER,le[_.minFilter]),_.compareFunction&&(i.texParameteri(T,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(T,i.TEXTURE_COMPARE_FUNC,Ee[_.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(_.magFilter===Ot||_.minFilter!==as&&_.minFilter!==Dn||_.type===bn&&e.has("OES_texture_float_linear")===!1)return;if(_.anisotropy>1||n.get(_).__currentAnisotropy){let B=e.get("EXT_texture_filter_anisotropic");i.texParameterf(T,B.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(_.anisotropy,s.getMaxAnisotropy())),n.get(_).__currentAnisotropy=_.anisotropy}}}function Qe(T,_){let B=!1;T.__webglInit===void 0&&(T.__webglInit=!0,_.addEventListener("dispose",E));let q=_.source,J=d.get(q);J===void 0&&(J={},d.set(q,J));let W=z(_);if(W!==T.__cacheKey){J[W]===void 0&&(J[W]={texture:i.createTexture(),usedTimes:0},a.memory.textures++,B=!0),J[W].usedTimes++;let Ce=J[T.__cacheKey];Ce!==void 0&&(J[T.__cacheKey].usedTimes--,Ce.usedTimes===0&&S(_)),T.__cacheKey=W,T.__webglTexture=J[W].texture}return B}function rt(T,_,B){return Math.floor(Math.floor(T/B)/_)}function at(T,_,B,q){let W=T.updateRanges;if(W.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,_.width,_.height,B,q,_.data);else{W.sort((ee,he)=>ee.start-he.start);let Ce=0;for(let ee=1;ee<W.length;ee++){let he=W[Ce],Be=W[ee],Ue=he.start+he.count,_e=rt(Be.start,_.width,4),Ve=rt(he.start,_.width,4);Be.start<=Ue+1&&_e===Ve&&rt(Be.start+Be.count-1,_.width,4)===_e?he.count=Math.max(he.count,Be.start+Be.count-he.start):(++Ce,W[Ce]=Be)}W.length=Ce+1;let pe=i.getParameter(i.UNPACK_ROW_LENGTH),Pe=i.getParameter(i.UNPACK_SKIP_PIXELS),Te=i.getParameter(i.UNPACK_SKIP_ROWS);i.pixelStorei(i.UNPACK_ROW_LENGTH,_.width);for(let ee=0,he=W.length;ee<he;ee++){let Be=W[ee],Ue=Math.floor(Be.start/4),_e=Math.ceil(Be.count/4),Ve=Ue%_.width,N=Math.floor(Ue/_.width),ge=_e,ue=1;i.pixelStorei(i.UNPACK_SKIP_PIXELS,Ve),i.pixelStorei(i.UNPACK_SKIP_ROWS,N),t.texSubImage2D(i.TEXTURE_2D,0,Ve,N,ge,ue,B,q,_.data)}T.clearUpdateRanges(),i.pixelStorei(i.UNPACK_ROW_LENGTH,pe),i.pixelStorei(i.UNPACK_SKIP_PIXELS,Pe),i.pixelStorei(i.UNPACK_SKIP_ROWS,Te)}}function K(T,_,B){let q=i.TEXTURE_2D;(_.isDataArrayTexture||_.isCompressedArrayTexture)&&(q=i.TEXTURE_2D_ARRAY),_.isData3DTexture&&(q=i.TEXTURE_3D);let J=Qe(T,_),W=_.source;t.bindTexture(q,T.__webglTexture,i.TEXTURE0+B);let Ce=n.get(W);if(W.version!==Ce.__version||J===!0){t.activeTexture(i.TEXTURE0+B);let pe=tt.getPrimaries(tt.workingColorSpace),Pe=_.colorSpace===fi?null:tt.getPrimaries(_.colorSpace),Te=_.colorSpace===fi||pe===Pe?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,_.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,_.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Te);let ee=x(_.image,!1,s.maxTextureSize);ee=fe(_,ee);let he=r.convert(_.format,_.colorSpace),Be=r.convert(_.type),Ue=v(_.internalFormat,he,Be,_.colorSpace,_.isVideoTexture);Ze(q,_);let _e,Ve=_.mipmaps,N=_.isVideoTexture!==!0,ge=Ce.__version===void 0||J===!0,ue=W.dataReady,de=I(_,ee);if(_.isDepthTexture)Ue=w(_.format===sr,_.type),ge&&(N?t.texStorage2D(i.TEXTURE_2D,1,Ue,ee.width,ee.height):t.texImage2D(i.TEXTURE_2D,0,Ue,ee.width,ee.height,0,he,Be,null));else if(_.isDataTexture)if(Ve.length>0){N&&ge&&t.texStorage2D(i.TEXTURE_2D,de,Ue,Ve[0].width,Ve[0].height);for(let ne=0,Z=Ve.length;ne<Z;ne++)_e=Ve[ne],N?ue&&t.texSubImage2D(i.TEXTURE_2D,ne,0,0,_e.width,_e.height,he,Be,_e.data):t.texImage2D(i.TEXTURE_2D,ne,Ue,_e.width,_e.height,0,he,Be,_e.data);_.generateMipmaps=!1}else N?(ge&&t.texStorage2D(i.TEXTURE_2D,de,Ue,ee.width,ee.height),ue&&at(_,ee,he,Be)):t.texImage2D(i.TEXTURE_2D,0,Ue,ee.width,ee.height,0,he,Be,ee.data);else if(_.isCompressedTexture)if(_.isCompressedArrayTexture){N&&ge&&t.texStorage3D(i.TEXTURE_2D_ARRAY,de,Ue,Ve[0].width,Ve[0].height,ee.depth);for(let ne=0,Z=Ve.length;ne<Z;ne++)if(_e=Ve[ne],_.format!==un)if(he!==null)if(N){if(ue)if(_.layerUpdates.size>0){let Me=Lh(_e.width,_e.height,_.format,_.type);for(let He of _.layerUpdates){let gt=_e.data.subarray(He*Me/_e.data.BYTES_PER_ELEMENT,(He+1)*Me/_e.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,ne,0,0,He,_e.width,_e.height,1,he,gt)}_.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,ne,0,0,0,_e.width,_e.height,ee.depth,he,_e.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,ne,Ue,_e.width,_e.height,ee.depth,0,_e.data,0,0);else Re("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else N?ue&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,ne,0,0,0,_e.width,_e.height,ee.depth,he,Be,_e.data):t.texImage3D(i.TEXTURE_2D_ARRAY,ne,Ue,_e.width,_e.height,ee.depth,0,he,Be,_e.data)}else{N&&ge&&t.texStorage2D(i.TEXTURE_2D,de,Ue,Ve[0].width,Ve[0].height);for(let ne=0,Z=Ve.length;ne<Z;ne++)_e=Ve[ne],_.format!==un?he!==null?N?ue&&t.compressedTexSubImage2D(i.TEXTURE_2D,ne,0,0,_e.width,_e.height,he,_e.data):t.compressedTexImage2D(i.TEXTURE_2D,ne,Ue,_e.width,_e.height,0,_e.data):Re("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):N?ue&&t.texSubImage2D(i.TEXTURE_2D,ne,0,0,_e.width,_e.height,he,Be,_e.data):t.texImage2D(i.TEXTURE_2D,ne,Ue,_e.width,_e.height,0,he,Be,_e.data)}else if(_.isDataArrayTexture)if(N){if(ge&&t.texStorage3D(i.TEXTURE_2D_ARRAY,de,Ue,ee.width,ee.height,ee.depth),ue)if(_.layerUpdates.size>0){let ne=Lh(ee.width,ee.height,_.format,_.type);for(let Z of _.layerUpdates){let Me=ee.data.subarray(Z*ne/ee.data.BYTES_PER_ELEMENT,(Z+1)*ne/ee.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,Z,ee.width,ee.height,1,he,Be,Me)}_.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,ee.width,ee.height,ee.depth,he,Be,ee.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,Ue,ee.width,ee.height,ee.depth,0,he,Be,ee.data);else if(_.isData3DTexture)N?(ge&&t.texStorage3D(i.TEXTURE_3D,de,Ue,ee.width,ee.height,ee.depth),ue&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,ee.width,ee.height,ee.depth,he,Be,ee.data)):t.texImage3D(i.TEXTURE_3D,0,Ue,ee.width,ee.height,ee.depth,0,he,Be,ee.data);else if(_.isFramebufferTexture){if(ge)if(N)t.texStorage2D(i.TEXTURE_2D,de,Ue,ee.width,ee.height);else{let ne=ee.width,Z=ee.height;for(let Me=0;Me<de;Me++)t.texImage2D(i.TEXTURE_2D,Me,Ue,ne,Z,0,he,Be,null),ne>>=1,Z>>=1}}else if(Ve.length>0){if(N&&ge){let ne=ye(Ve[0]);t.texStorage2D(i.TEXTURE_2D,de,Ue,ne.width,ne.height)}for(let ne=0,Z=Ve.length;ne<Z;ne++)_e=Ve[ne],N?ue&&t.texSubImage2D(i.TEXTURE_2D,ne,0,0,he,Be,_e):t.texImage2D(i.TEXTURE_2D,ne,Ue,he,Be,_e);_.generateMipmaps=!1}else if(N){if(ge){let ne=ye(ee);t.texStorage2D(i.TEXTURE_2D,de,Ue,ne.width,ne.height)}ue&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,he,Be,ee)}else t.texImage2D(i.TEXTURE_2D,0,Ue,he,Be,ee);m(_)&&p(q),Ce.__version=W.version,_.onUpdate&&_.onUpdate(_)}T.__version=_.version}function j(T,_,B){if(_.image.length!==6)return;let q=Qe(T,_),J=_.source;t.bindTexture(i.TEXTURE_CUBE_MAP,T.__webglTexture,i.TEXTURE0+B);let W=n.get(J);if(J.version!==W.__version||q===!0){t.activeTexture(i.TEXTURE0+B);let Ce=tt.getPrimaries(tt.workingColorSpace),pe=_.colorSpace===fi?null:tt.getPrimaries(_.colorSpace),Pe=_.colorSpace===fi||Ce===pe?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,_.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,_.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Pe);let Te=_.isCompressedTexture||_.image[0].isCompressedTexture,ee=_.image[0]&&_.image[0].isDataTexture,he=[];for(let Z=0;Z<6;Z++)!Te&&!ee?he[Z]=x(_.image[Z],!0,s.maxCubemapSize):he[Z]=ee?_.image[Z].image:_.image[Z],he[Z]=fe(_,he[Z]);let Be=he[0],Ue=r.convert(_.format,_.colorSpace),_e=r.convert(_.type),Ve=v(_.internalFormat,Ue,_e,_.colorSpace),N=_.isVideoTexture!==!0,ge=W.__version===void 0||q===!0,ue=J.dataReady,de=I(_,Be);Ze(i.TEXTURE_CUBE_MAP,_);let ne;if(Te){N&&ge&&t.texStorage2D(i.TEXTURE_CUBE_MAP,de,Ve,Be.width,Be.height);for(let Z=0;Z<6;Z++){ne=he[Z].mipmaps;for(let Me=0;Me<ne.length;Me++){let He=ne[Me];_.format!==un?Ue!==null?N?ue&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,Me,0,0,He.width,He.height,Ue,He.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,Me,Ve,He.width,He.height,0,He.data):Re("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):N?ue&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,Me,0,0,He.width,He.height,Ue,_e,He.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,Me,Ve,He.width,He.height,0,Ue,_e,He.data)}}}else{if(ne=_.mipmaps,N&&ge){ne.length>0&&de++;let Z=ye(he[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,de,Ve,Z.width,Z.height)}for(let Z=0;Z<6;Z++)if(ee){N?ue&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,0,0,he[Z].width,he[Z].height,Ue,_e,he[Z].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,Ve,he[Z].width,he[Z].height,0,Ue,_e,he[Z].data);for(let Me=0;Me<ne.length;Me++){let gt=ne[Me].image[Z].image;N?ue&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,Me+1,0,0,gt.width,gt.height,Ue,_e,gt.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,Me+1,Ve,gt.width,gt.height,0,Ue,_e,gt.data)}}else{N?ue&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,0,0,Ue,_e,he[Z]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,Ve,Ue,_e,he[Z]);for(let Me=0;Me<ne.length;Me++){let He=ne[Me];N?ue&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,Me+1,0,0,Ue,_e,He.image[Z]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,Me+1,Ve,Ue,_e,He.image[Z])}}}m(_)&&p(i.TEXTURE_CUBE_MAP),W.__version=J.version,_.onUpdate&&_.onUpdate(_)}T.__version=_.version}function ve(T,_,B,q,J,W){let Ce=r.convert(B.format,B.colorSpace),pe=r.convert(B.type),Pe=v(B.internalFormat,Ce,pe,B.colorSpace),Te=n.get(_),ee=n.get(B);if(ee.__renderTarget=_,!Te.__hasExternalTextures){let he=Math.max(1,_.width>>W),Be=Math.max(1,_.height>>W);J===i.TEXTURE_3D||J===i.TEXTURE_2D_ARRAY?t.texImage3D(J,W,Pe,he,Be,_.depth,0,Ce,pe,null):t.texImage2D(J,W,Pe,he,Be,0,Ce,pe,null)}t.bindFramebuffer(i.FRAMEBUFFER,T),te(_)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,q,J,ee.__webglTexture,0,ce(_)):(J===i.TEXTURE_2D||J>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&J<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,q,J,ee.__webglTexture,W),t.bindFramebuffer(i.FRAMEBUFFER,null)}function De(T,_,B){if(i.bindRenderbuffer(i.RENDERBUFFER,T),_.depthBuffer){let q=_.depthTexture,J=q&&q.isDepthTexture?q.type:null,W=w(_.stencilBuffer,J),Ce=_.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,pe=ce(_);te(_)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,pe,W,_.width,_.height):B?i.renderbufferStorageMultisample(i.RENDERBUFFER,pe,W,_.width,_.height):i.renderbufferStorage(i.RENDERBUFFER,W,_.width,_.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,Ce,i.RENDERBUFFER,T)}else{let q=_.textures;for(let J=0;J<q.length;J++){let W=q[J],Ce=r.convert(W.format,W.colorSpace),pe=r.convert(W.type),Pe=v(W.internalFormat,Ce,pe,W.colorSpace),Te=ce(_);B&&te(_)===!1?i.renderbufferStorageMultisample(i.RENDERBUFFER,Te,Pe,_.width,_.height):te(_)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Te,Pe,_.width,_.height):i.renderbufferStorage(i.RENDERBUFFER,Pe,_.width,_.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function Ae(T,_){if(_&&_.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(i.FRAMEBUFFER,T),!(_.depthTexture&&_.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");let q=n.get(_.depthTexture);q.__renderTarget=_,(!q.__webglTexture||_.depthTexture.image.width!==_.width||_.depthTexture.image.height!==_.height)&&(_.depthTexture.image.width=_.width,_.depthTexture.image.height=_.height,_.depthTexture.needsUpdate=!0),G(_.depthTexture,0);let J=q.__webglTexture,W=ce(_);if(_.depthTexture.format===Us)te(_)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,J,0,W):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,J,0);else if(_.depthTexture.format===sr)te(_)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,J,0,W):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,J,0);else throw new Error("Unknown depthTexture format")}function je(T){let _=n.get(T),B=T.isWebGLCubeRenderTarget===!0;if(_.__boundDepthTexture!==T.depthTexture){let q=T.depthTexture;if(_.__depthDisposeCallback&&_.__depthDisposeCallback(),q){let J=()=>{delete _.__boundDepthTexture,delete _.__depthDisposeCallback,q.removeEventListener("dispose",J)};q.addEventListener("dispose",J),_.__depthDisposeCallback=J}_.__boundDepthTexture=q}if(T.depthTexture&&!_.__autoAllocateDepthBuffer){if(B)throw new Error("target.depthTexture not supported in Cube render targets");let q=T.texture.mipmaps;q&&q.length>0?Ae(_.__webglFramebuffer[0],T):Ae(_.__webglFramebuffer,T)}else if(B){_.__webglDepthbuffer=[];for(let q=0;q<6;q++)if(t.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer[q]),_.__webglDepthbuffer[q]===void 0)_.__webglDepthbuffer[q]=i.createRenderbuffer(),De(_.__webglDepthbuffer[q],T,!1);else{let J=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,W=_.__webglDepthbuffer[q];i.bindRenderbuffer(i.RENDERBUFFER,W),i.framebufferRenderbuffer(i.FRAMEBUFFER,J,i.RENDERBUFFER,W)}}else{let q=T.texture.mipmaps;if(q&&q.length>0?t.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer),_.__webglDepthbuffer===void 0)_.__webglDepthbuffer=i.createRenderbuffer(),De(_.__webglDepthbuffer,T,!1);else{let J=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,W=_.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,W),i.framebufferRenderbuffer(i.FRAMEBUFFER,J,i.RENDERBUFFER,W)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function ft(T,_,B){let q=n.get(T);_!==void 0&&ve(q.__webglFramebuffer,T,T.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),B!==void 0&&je(T)}function ke(T){let _=T.texture,B=n.get(T),q=n.get(_);T.addEventListener("dispose",P);let J=T.textures,W=T.isWebGLCubeRenderTarget===!0,Ce=J.length>1;if(Ce||(q.__webglTexture===void 0&&(q.__webglTexture=i.createTexture()),q.__version=_.version,a.memory.textures++),W){B.__webglFramebuffer=[];for(let pe=0;pe<6;pe++)if(_.mipmaps&&_.mipmaps.length>0){B.__webglFramebuffer[pe]=[];for(let Pe=0;Pe<_.mipmaps.length;Pe++)B.__webglFramebuffer[pe][Pe]=i.createFramebuffer()}else B.__webglFramebuffer[pe]=i.createFramebuffer()}else{if(_.mipmaps&&_.mipmaps.length>0){B.__webglFramebuffer=[];for(let pe=0;pe<_.mipmaps.length;pe++)B.__webglFramebuffer[pe]=i.createFramebuffer()}else B.__webglFramebuffer=i.createFramebuffer();if(Ce)for(let pe=0,Pe=J.length;pe<Pe;pe++){let Te=n.get(J[pe]);Te.__webglTexture===void 0&&(Te.__webglTexture=i.createTexture(),a.memory.textures++)}if(T.samples>0&&te(T)===!1){B.__webglMultisampledFramebuffer=i.createFramebuffer(),B.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,B.__webglMultisampledFramebuffer);for(let pe=0;pe<J.length;pe++){let Pe=J[pe];B.__webglColorRenderbuffer[pe]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,B.__webglColorRenderbuffer[pe]);let Te=r.convert(Pe.format,Pe.colorSpace),ee=r.convert(Pe.type),he=v(Pe.internalFormat,Te,ee,Pe.colorSpace,T.isXRRenderTarget===!0),Be=ce(T);i.renderbufferStorageMultisample(i.RENDERBUFFER,Be,he,T.width,T.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+pe,i.RENDERBUFFER,B.__webglColorRenderbuffer[pe])}i.bindRenderbuffer(i.RENDERBUFFER,null),T.depthBuffer&&(B.__webglDepthRenderbuffer=i.createRenderbuffer(),De(B.__webglDepthRenderbuffer,T,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(W){t.bindTexture(i.TEXTURE_CUBE_MAP,q.__webglTexture),Ze(i.TEXTURE_CUBE_MAP,_);for(let pe=0;pe<6;pe++)if(_.mipmaps&&_.mipmaps.length>0)for(let Pe=0;Pe<_.mipmaps.length;Pe++)ve(B.__webglFramebuffer[pe][Pe],T,_,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+pe,Pe);else ve(B.__webglFramebuffer[pe],T,_,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+pe,0);m(_)&&p(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Ce){for(let pe=0,Pe=J.length;pe<Pe;pe++){let Te=J[pe],ee=n.get(Te),he=i.TEXTURE_2D;(T.isWebGL3DRenderTarget||T.isWebGLArrayRenderTarget)&&(he=T.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(he,ee.__webglTexture),Ze(he,Te),ve(B.__webglFramebuffer,T,Te,i.COLOR_ATTACHMENT0+pe,he,0),m(Te)&&p(he)}t.unbindTexture()}else{let pe=i.TEXTURE_2D;if((T.isWebGL3DRenderTarget||T.isWebGLArrayRenderTarget)&&(pe=T.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(pe,q.__webglTexture),Ze(pe,_),_.mipmaps&&_.mipmaps.length>0)for(let Pe=0;Pe<_.mipmaps.length;Pe++)ve(B.__webglFramebuffer[Pe],T,_,i.COLOR_ATTACHMENT0,pe,Pe);else ve(B.__webglFramebuffer,T,_,i.COLOR_ATTACHMENT0,pe,0);m(_)&&p(pe),t.unbindTexture()}T.depthBuffer&&je(T)}function Q(T){let _=T.textures;for(let B=0,q=_.length;B<q;B++){let J=_[B];if(m(J)){let W=M(T),Ce=n.get(J).__webglTexture;t.bindTexture(W,Ce),p(W),t.unbindTexture()}}}let A=[],$=[];function se(T){if(T.samples>0){if(te(T)===!1){let _=T.textures,B=T.width,q=T.height,J=i.COLOR_BUFFER_BIT,W=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Ce=n.get(T),pe=_.length>1;if(pe)for(let Te=0;Te<_.length;Te++)t.bindFramebuffer(i.FRAMEBUFFER,Ce.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Te,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,Ce.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Te,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,Ce.__webglMultisampledFramebuffer);let Pe=T.texture.mipmaps;Pe&&Pe.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Ce.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Ce.__webglFramebuffer);for(let Te=0;Te<_.length;Te++){if(T.resolveDepthBuffer&&(T.depthBuffer&&(J|=i.DEPTH_BUFFER_BIT),T.stencilBuffer&&T.resolveStencilBuffer&&(J|=i.STENCIL_BUFFER_BIT)),pe){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,Ce.__webglColorRenderbuffer[Te]);let ee=n.get(_[Te]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,ee,0)}i.blitFramebuffer(0,0,B,q,0,0,B,q,J,i.NEAREST),c===!0&&(A.length=0,$.length=0,A.push(i.COLOR_ATTACHMENT0+Te),T.depthBuffer&&T.resolveDepthBuffer===!1&&(A.push(W),$.push(W),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,$)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,A))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),pe)for(let Te=0;Te<_.length;Te++){t.bindFramebuffer(i.FRAMEBUFFER,Ce.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Te,i.RENDERBUFFER,Ce.__webglColorRenderbuffer[Te]);let ee=n.get(_[Te]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,Ce.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Te,i.TEXTURE_2D,ee,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Ce.__webglMultisampledFramebuffer)}else if(T.depthBuffer&&T.resolveDepthBuffer===!1&&c){let _=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[_])}}}function ce(T){return Math.min(s.maxSamples,T.samples)}function te(T){let _=n.get(T);return T.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&_.__useRenderToTexture!==!1}function Se(T){let _=a.render.frame;h.get(T)!==_&&(h.set(T,_),T.update())}function fe(T,_){let B=T.colorSpace,q=T.format,J=T.type;return T.isCompressedTexture===!0||T.isVideoTexture===!0||B!==Bt&&B!==fi&&(tt.getTransfer(B)===ct?(q!==un||J!==Nn)&&Re("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Je("WebGLTextures: Unsupported texture color space:",B)),_}function ye(T){return typeof HTMLImageElement<"u"&&T instanceof HTMLImageElement?(l.width=T.naturalWidth||T.width,l.height=T.naturalHeight||T.height):typeof VideoFrame<"u"&&T instanceof VideoFrame?(l.width=T.displayWidth,l.height=T.displayHeight):(l.width=T.width,l.height=T.height),l}this.allocateTextureUnit=k,this.resetTextureUnits=L,this.setTexture2D=G,this.setTexture2DArray=X,this.setTexture3D=re,this.setTextureCube=Y,this.rebindTextures=ft,this.setupRenderTarget=ke,this.updateRenderTargetMipmap=Q,this.updateMultisampleRenderTarget=se,this.setupDepthRenderbuffer=je,this.setupFrameBufferTexture=ve,this.useMultisampledRTT=te}function Av(i,e){function t(n,s=fi){let r,a=tt.getTransfer(s);if(n===Nn)return i.UNSIGNED_BYTE;if(n===nc)return i.UNSIGNED_SHORT_4_4_4_4;if(n===ic)return i.UNSIGNED_SHORT_5_5_5_1;if(n===_h)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===yh)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===gh)return i.BYTE;if(n===xh)return i.SHORT;if(n===nr)return i.UNSIGNED_SHORT;if(n===tc)return i.INT;if(n===Li)return i.UNSIGNED_INT;if(n===bn)return i.FLOAT;if(n===os)return i.HALF_FLOAT;if(n===vh)return i.ALPHA;if(n===bh)return i.RGB;if(n===un)return i.RGBA;if(n===Us)return i.DEPTH_COMPONENT;if(n===sr)return i.DEPTH_STENCIL;if(n===sc)return i.RED;if(n===rc)return i.RED_INTEGER;if(n===ac)return i.RG;if(n===oc)return i.RG_INTEGER;if(n===cc)return i.RGBA_INTEGER;if(n===_a||n===ya||n===va||n===ba)if(a===ct)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===_a)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===ya)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===va)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===ba)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===_a)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===ya)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===va)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===ba)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===lc||n===hc||n===uc||n===dc)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===lc)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===hc)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===uc)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===dc)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===fc||n===pc||n===mc)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(n===fc||n===pc)return a===ct?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===mc)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===gc||n===xc||n===_c||n===yc||n===vc||n===bc||n===Sc||n===Mc||n===wc||n===Ec||n===Tc||n===Ac||n===Cc||n===Rc)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(n===gc)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===xc)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===_c)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===yc)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===vc)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===bc)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Sc)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Mc)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===wc)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Ec)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Tc)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Ac)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Cc)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Rc)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Ic||n===Pc||n===Lc)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(n===Ic)return a===ct?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Pc)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Lc)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Dc||n===Nc||n===Uc||n===Oc)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(n===Dc)return r.COMPRESSED_RED_RGTC1_EXT;if(n===Nc)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Uc)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Oc)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===ir?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:t}}var Cv=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Rv=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,Wh=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new Jr(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new yn({vertexShader:Cv,fragmentShader:Rv,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Ht(new oa(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Xh=class extends Vn{constructor(e,t){super();let n=this,s=null,r=1,a=null,o="local-floor",c=1,l=null,h=null,u=null,d=null,f=null,g=null,x=typeof XRWebGLBinding<"u",m=new Wh,p={},M=t.getContextAttributes(),v=null,w=null,I=[],E=[],P=new ie,O=null,S=new At;S.viewport=new it;let y=new At;y.viewport=new it;let R=[S,y],L=new Wo,k=null,z=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(K){let j=I[K];return j===void 0&&(j=new zs,I[K]=j),j.getTargetRaySpace()},this.getControllerGrip=function(K){let j=I[K];return j===void 0&&(j=new zs,I[K]=j),j.getGripSpace()},this.getHand=function(K){let j=I[K];return j===void 0&&(j=new zs,I[K]=j),j.getHandSpace()};function G(K){let j=E.indexOf(K.inputSource);if(j===-1)return;let ve=I[j];ve!==void 0&&(ve.update(K.inputSource,K.frame,l||a),ve.dispatchEvent({type:K.type,data:K.inputSource}))}function X(){s.removeEventListener("select",G),s.removeEventListener("selectstart",G),s.removeEventListener("selectend",G),s.removeEventListener("squeeze",G),s.removeEventListener("squeezestart",G),s.removeEventListener("squeezeend",G),s.removeEventListener("end",X),s.removeEventListener("inputsourceschange",re);for(let K=0;K<I.length;K++){let j=E[K];j!==null&&(E[K]=null,I[K].disconnect(j))}k=null,z=null,m.reset();for(let K in p)delete p[K];e.setRenderTarget(v),f=null,d=null,u=null,s=null,w=null,at.stop(),n.isPresenting=!1,e.setPixelRatio(O),e.setSize(P.width,P.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(K){r=K,n.isPresenting===!0&&Re("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(K){o=K,n.isPresenting===!0&&Re("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||a},this.setReferenceSpace=function(K){l=K},this.getBaseLayer=function(){return d!==null?d:f},this.getBinding=function(){return u===null&&x&&(u=new XRWebGLBinding(s,t)),u},this.getFrame=function(){return g},this.getSession=function(){return s},this.setSession=async function(K){if(s=K,s!==null){if(v=e.getRenderTarget(),s.addEventListener("select",G),s.addEventListener("selectstart",G),s.addEventListener("selectend",G),s.addEventListener("squeeze",G),s.addEventListener("squeezestart",G),s.addEventListener("squeezeend",G),s.addEventListener("end",X),s.addEventListener("inputsourceschange",re),M.xrCompatible!==!0&&await t.makeXRCompatible(),O=e.getPixelRatio(),e.getSize(P),x&&"createProjectionLayer"in XRWebGLBinding.prototype){let ve=null,De=null,Ae=null;M.depth&&(Ae=M.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,ve=M.stencil?sr:Us,De=M.stencil?ir:Li);let je={colorFormat:t.RGBA8,depthFormat:Ae,scaleFactor:r};u=this.getBinding(),d=u.createProjectionLayer(je),s.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),w=new Hn(d.textureWidth,d.textureHeight,{format:un,type:Nn,depthTexture:new Zr(d.textureWidth,d.textureHeight,De,void 0,void 0,void 0,void 0,void 0,void 0,ve),stencilBuffer:M.stencil,colorSpace:e.outputColorSpace,samples:M.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}else{let ve={antialias:M.antialias,alpha:!0,depth:M.depth,stencil:M.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(s,t,ve),s.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),w=new Hn(f.framebufferWidth,f.framebufferHeight,{format:un,type:Nn,colorSpace:e.outputColorSpace,stencilBuffer:M.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}w.isXRRenderTarget=!0,this.setFoveation(c),l=null,a=await s.requestReferenceSpace(o),at.setContext(s),at.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return m.getDepthTexture()};function re(K){for(let j=0;j<K.removed.length;j++){let ve=K.removed[j],De=E.indexOf(ve);De>=0&&(E[De]=null,I[De].disconnect(ve))}for(let j=0;j<K.added.length;j++){let ve=K.added[j],De=E.indexOf(ve);if(De===-1){for(let je=0;je<I.length;je++)if(je>=E.length){E.push(ve),De=je;break}else if(E[je]===null){E[je]=ve,De=je;break}if(De===-1)break}let Ae=I[De];Ae&&Ae.connect(ve)}}let Y=new D,ae=new D;function le(K,j,ve){Y.setFromMatrixPosition(j.matrixWorld),ae.setFromMatrixPosition(ve.matrixWorld);let De=Y.distanceTo(ae),Ae=j.projectionMatrix.elements,je=ve.projectionMatrix.elements,ft=Ae[14]/(Ae[10]-1),ke=Ae[14]/(Ae[10]+1),Q=(Ae[9]+1)/Ae[5],A=(Ae[9]-1)/Ae[5],$=(Ae[8]-1)/Ae[0],se=(je[8]+1)/je[0],ce=ft*$,te=ft*se,Se=De/(-$+se),fe=Se*-$;if(j.matrixWorld.decompose(K.position,K.quaternion,K.scale),K.translateX(fe),K.translateZ(Se),K.matrixWorld.compose(K.position,K.quaternion,K.scale),K.matrixWorldInverse.copy(K.matrixWorld).invert(),Ae[10]===-1)K.projectionMatrix.copy(j.projectionMatrix),K.projectionMatrixInverse.copy(j.projectionMatrixInverse);else{let ye=ft+Se,T=ke+Se,_=ce-fe,B=te+(De-fe),q=Q*ke/T*ye,J=A*ke/T*ye;K.projectionMatrix.makePerspective(_,B,q,J,ye,T),K.projectionMatrixInverse.copy(K.projectionMatrix).invert()}}function Ee(K,j){j===null?K.matrixWorld.copy(K.matrix):K.matrixWorld.multiplyMatrices(j.matrixWorld,K.matrix),K.matrixWorldInverse.copy(K.matrixWorld).invert()}this.updateCamera=function(K){if(s===null)return;let j=K.near,ve=K.far;m.texture!==null&&(m.depthNear>0&&(j=m.depthNear),m.depthFar>0&&(ve=m.depthFar)),L.near=y.near=S.near=j,L.far=y.far=S.far=ve,(k!==L.near||z!==L.far)&&(s.updateRenderState({depthNear:L.near,depthFar:L.far}),k=L.near,z=L.far),L.layers.mask=K.layers.mask|6,S.layers.mask=L.layers.mask&3,y.layers.mask=L.layers.mask&5;let De=K.parent,Ae=L.cameras;Ee(L,De);for(let je=0;je<Ae.length;je++)Ee(Ae[je],De);Ae.length===2?le(L,S,y):L.projectionMatrix.copy(S.projectionMatrix),Ze(K,L,De)};function Ze(K,j,ve){ve===null?K.matrix.copy(j.matrixWorld):(K.matrix.copy(ve.matrixWorld),K.matrix.invert(),K.matrix.multiply(j.matrixWorld)),K.matrix.decompose(K.position,K.quaternion,K.scale),K.updateMatrixWorld(!0),K.projectionMatrix.copy(j.projectionMatrix),K.projectionMatrixInverse.copy(j.projectionMatrixInverse),K.isPerspectiveCamera&&(K.fov=$i*2*Math.atan(1/K.projectionMatrix.elements[5]),K.zoom=1)}this.getCamera=function(){return L},this.getFoveation=function(){if(!(d===null&&f===null))return c},this.setFoveation=function(K){c=K,d!==null&&(d.fixedFoveation=K),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=K)},this.hasDepthSensing=function(){return m.texture!==null},this.getDepthSensingMesh=function(){return m.getMesh(L)},this.getCameraTexture=function(K){return p[K]};let Qe=null;function rt(K,j){if(h=j.getViewerPose(l||a),g=j,h!==null){let ve=h.views;f!==null&&(e.setRenderTargetFramebuffer(w,f.framebuffer),e.setRenderTarget(w));let De=!1;ve.length!==L.cameras.length&&(L.cameras.length=0,De=!0);for(let ke=0;ke<ve.length;ke++){let Q=ve[ke],A=null;if(f!==null)A=f.getViewport(Q);else{let se=u.getViewSubImage(d,Q);A=se.viewport,ke===0&&(e.setRenderTargetTextures(w,se.colorTexture,se.depthStencilTexture),e.setRenderTarget(w))}let $=R[ke];$===void 0&&($=new At,$.layers.enable(ke),$.viewport=new it,R[ke]=$),$.matrix.fromArray(Q.transform.matrix),$.matrix.decompose($.position,$.quaternion,$.scale),$.projectionMatrix.fromArray(Q.projectionMatrix),$.projectionMatrixInverse.copy($.projectionMatrix).invert(),$.viewport.set(A.x,A.y,A.width,A.height),ke===0&&(L.matrix.copy($.matrix),L.matrix.decompose(L.position,L.quaternion,L.scale)),De===!0&&L.cameras.push($)}let Ae=s.enabledFeatures;if(Ae&&Ae.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&x){u=n.getBinding();let ke=u.getDepthInformation(ve[0]);ke&&ke.isValid&&ke.texture&&m.init(ke,s.renderState)}if(Ae&&Ae.includes("camera-access")&&x){e.state.unbindTexture(),u=n.getBinding();for(let ke=0;ke<ve.length;ke++){let Q=ve[ke].camera;if(Q){let A=p[Q];A||(A=new Jr,p[Q]=A);let $=u.getCameraImage(Q);A.sourceTexture=$}}}}for(let ve=0;ve<I.length;ve++){let De=E[ve],Ae=I[ve];De!==null&&Ae!==void 0&&Ae.update(De,j,l||a)}Qe&&Qe(K,j),j.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:j}),g=null}let at=new bp;at.setAnimationLoop(rt),this.setAnimationLoop=function(K){Qe=K},this.dispose=function(){}}},hs=new In,Iv=new We;function Pv(i,e){function t(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function n(m,p){p.color.getRGB(m.fogColor.value,Ch(i)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function s(m,p,M,v,w){p.isMeshBasicMaterial||p.isMeshLambertMaterial?r(m,p):p.isMeshToonMaterial?(r(m,p),u(m,p)):p.isMeshPhongMaterial?(r(m,p),h(m,p)):p.isMeshStandardMaterial?(r(m,p),d(m,p),p.isMeshPhysicalMaterial&&f(m,p,w)):p.isMeshMatcapMaterial?(r(m,p),g(m,p)):p.isMeshDepthMaterial?r(m,p):p.isMeshDistanceMaterial?(r(m,p),x(m,p)):p.isMeshNormalMaterial?r(m,p):p.isLineBasicMaterial?(a(m,p),p.isLineDashedMaterial&&o(m,p)):p.isPointsMaterial?c(m,p,M,v):p.isSpriteMaterial?l(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function r(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,t(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===Jt&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,t(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===Jt&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,t(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,t(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,t(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);let M=e.get(p),v=M.envMap,w=M.envMapRotation;v&&(m.envMap.value=v,hs.copy(w),hs.x*=-1,hs.y*=-1,hs.z*=-1,v.isCubeTexture&&v.isRenderTargetTexture===!1&&(hs.y*=-1,hs.z*=-1),m.envMapRotation.value.setFromMatrix4(Iv.makeRotationFromEuler(hs)),m.flipEnvMap.value=v.isCubeTexture&&v.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap&&(m.lightMap.value=p.lightMap,m.lightMapIntensity.value=p.lightMapIntensity,t(p.lightMap,m.lightMapTransform)),p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,t(p.aoMap,m.aoMapTransform))}function a(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform))}function o(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function c(m,p,M,v){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*M,m.scale.value=v*.5,p.map&&(m.map.value=p.map,t(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function l(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function h(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function u(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function d(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,t(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,t(p.roughnessMap,m.roughnessMapTransform)),p.envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function f(m,p,M){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,t(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,t(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,t(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,t(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,t(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===Jt&&m.clearcoatNormalScale.value.negate())),p.dispersion>0&&(m.dispersion.value=p.dispersion),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,t(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,t(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=M.texture,m.transmissionSamplerSize.value.set(M.width,M.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,t(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,t(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,t(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,t(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,t(p.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,p){p.matcap&&(m.matcap.value=p.matcap)}function x(m,p){let M=e.get(p).light;m.referencePosition.value.setFromMatrixPosition(M.matrixWorld),m.nearDistance.value=M.shadow.camera.near,m.farDistance.value=M.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function Lv(i,e,t,n){let s={},r={},a=[],o=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function c(M,v){let w=v.program;n.uniformBlockBinding(M,w)}function l(M,v){let w=s[M.id];w===void 0&&(g(M),w=h(M),s[M.id]=w,M.addEventListener("dispose",m));let I=v.program;n.updateUBOMapping(M,I);let E=e.render.frame;r[M.id]!==E&&(d(M),r[M.id]=E)}function h(M){let v=u();M.__bindingPointIndex=v;let w=i.createBuffer(),I=M.__size,E=M.usage;return i.bindBuffer(i.UNIFORM_BUFFER,w),i.bufferData(i.UNIFORM_BUFFER,I,E),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,v,w),w}function u(){for(let M=0;M<o;M++)if(a.indexOf(M)===-1)return a.push(M),M;return Je("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(M){let v=s[M.id],w=M.uniforms,I=M.__cache;i.bindBuffer(i.UNIFORM_BUFFER,v);for(let E=0,P=w.length;E<P;E++){let O=Array.isArray(w[E])?w[E]:[w[E]];for(let S=0,y=O.length;S<y;S++){let R=O[S];if(f(R,E,S,I)===!0){let L=R.__offset,k=Array.isArray(R.value)?R.value:[R.value],z=0;for(let G=0;G<k.length;G++){let X=k[G],re=x(X);typeof X=="number"||typeof X=="boolean"?(R.__data[0]=X,i.bufferSubData(i.UNIFORM_BUFFER,L+z,R.__data)):X.isMatrix3?(R.__data[0]=X.elements[0],R.__data[1]=X.elements[1],R.__data[2]=X.elements[2],R.__data[3]=0,R.__data[4]=X.elements[3],R.__data[5]=X.elements[4],R.__data[6]=X.elements[5],R.__data[7]=0,R.__data[8]=X.elements[6],R.__data[9]=X.elements[7],R.__data[10]=X.elements[8],R.__data[11]=0):(X.toArray(R.__data,z),z+=re.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,L,R.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function f(M,v,w,I){let E=M.value,P=v+"_"+w;if(I[P]===void 0)return typeof E=="number"||typeof E=="boolean"?I[P]=E:I[P]=E.clone(),!0;{let O=I[P];if(typeof E=="number"||typeof E=="boolean"){if(O!==E)return I[P]=E,!0}else if(O.equals(E)===!1)return O.copy(E),!0}return!1}function g(M){let v=M.uniforms,w=0,I=16;for(let P=0,O=v.length;P<O;P++){let S=Array.isArray(v[P])?v[P]:[v[P]];for(let y=0,R=S.length;y<R;y++){let L=S[y],k=Array.isArray(L.value)?L.value:[L.value];for(let z=0,G=k.length;z<G;z++){let X=k[z],re=x(X),Y=w%I,ae=Y%re.boundary,le=Y+ae;w+=ae,le!==0&&I-le<re.storage&&(w+=I-le),L.__data=new Float32Array(re.storage/Float32Array.BYTES_PER_ELEMENT),L.__offset=w,w+=re.storage}}}let E=w%I;return E>0&&(w+=I-E),M.__size=w,M.__cache={},this}function x(M){let v={boundary:0,storage:0};return typeof M=="number"||typeof M=="boolean"?(v.boundary=4,v.storage=4):M.isVector2?(v.boundary=8,v.storage=8):M.isVector3||M.isColor?(v.boundary=16,v.storage=12):M.isVector4?(v.boundary=16,v.storage=16):M.isMatrix3?(v.boundary=48,v.storage=48):M.isMatrix4?(v.boundary=64,v.storage=64):M.isTexture?Re("WebGLRenderer: Texture samplers can not be part of an uniforms group."):Re("WebGLRenderer: Unsupported uniform value type.",M),v}function m(M){let v=M.target;v.removeEventListener("dispose",m);let w=a.indexOf(v.__bindingPointIndex);a.splice(w,1),i.deleteBuffer(s[v.id]),delete s[v.id],delete r[v.id]}function p(){for(let M in s)i.deleteBuffer(s[M]);a=[],s={},r={}}return{bind:c,update:l,dispose:p}}var Dv=new Uint16Array([11481,15204,11534,15171,11808,15015,12385,14843,12894,14716,13396,14600,13693,14483,13976,14366,14237,14171,14405,13961,14511,13770,14605,13598,14687,13444,14760,13305,14822,13066,14876,12857,14923,12675,14963,12517,14997,12379,15025,12230,15049,12023,15070,11843,15086,11687,15100,11551,15111,11433,15120,11330,15127,11217,15132,11060,15135,10922,15138,10801,15139,10695,15139,10600,13012,14923,13020,14917,13064,14886,13176,14800,13349,14666,13513,14526,13724,14398,13960,14230,14200,14020,14383,13827,14488,13651,14583,13491,14667,13348,14740,13132,14803,12908,14856,12713,14901,12542,14938,12394,14968,12241,14992,12017,15010,11822,15024,11654,15034,11507,15041,11380,15044,11269,15044,11081,15042,10913,15037,10764,15031,10635,15023,10520,15014,10419,15003,10330,13657,14676,13658,14673,13670,14660,13698,14622,13750,14547,13834,14442,13956,14317,14112,14093,14291,13889,14407,13704,14499,13538,14586,13389,14664,13201,14733,12966,14792,12758,14842,12577,14882,12418,14915,12272,14940,12033,14959,11826,14972,11646,14980,11490,14983,11355,14983,11212,14979,11008,14971,10830,14961,10675,14950,10540,14936,10420,14923,10315,14909,10204,14894,10041,14089,14460,14090,14459,14096,14452,14112,14431,14141,14388,14186,14305,14252,14130,14341,13941,14399,13756,14467,13585,14539,13430,14610,13272,14677,13026,14737,12808,14790,12617,14833,12449,14869,12303,14896,12065,14916,11845,14929,11655,14937,11490,14939,11347,14936,11184,14930,10970,14921,10783,14912,10621,14900,10480,14885,10356,14867,10247,14848,10062,14827,9894,14805,9745,14400,14208,14400,14206,14402,14198,14406,14174,14415,14122,14427,14035,14444,13913,14469,13767,14504,13613,14548,13463,14598,13324,14651,13082,14704,12858,14752,12658,14795,12483,14831,12330,14860,12106,14881,11875,14895,11675,14903,11501,14905,11351,14903,11178,14900,10953,14892,10757,14880,10589,14865,10442,14847,10313,14827,10162,14805,9965,14782,9792,14757,9642,14731,9507,14562,13883,14562,13883,14563,13877,14566,13862,14570,13830,14576,13773,14584,13689,14595,13582,14613,13461,14637,13336,14668,13120,14704,12897,14741,12695,14776,12516,14808,12358,14835,12150,14856,11910,14870,11701,14878,11519,14882,11361,14884,11187,14880,10951,14871,10748,14858,10572,14842,10418,14823,10286,14801,10099,14777,9897,14751,9722,14725,9567,14696,9430,14666,9309,14702,13604,14702,13604,14702,13600,14703,13591,14705,13570,14707,13533,14709,13477,14712,13400,14718,13305,14727,13106,14743,12907,14762,12716,14784,12539,14807,12380,14827,12190,14844,11943,14855,11727,14863,11539,14870,11376,14871,11204,14868,10960,14858,10748,14845,10565,14829,10406,14809,10269,14786,10058,14761,9852,14734,9671,14705,9512,14674,9374,14641,9253,14608,9076,14821,13366,14821,13365,14821,13364,14821,13358,14821,13344,14821,13320,14819,13252,14817,13145,14815,13011,14814,12858,14817,12698,14823,12539,14832,12389,14841,12214,14850,11968,14856,11750,14861,11558,14866,11390,14867,11226,14862,10972,14853,10754,14840,10565,14823,10401,14803,10259,14780,10032,14754,9820,14725,9635,14694,9473,14661,9333,14627,9203,14593,8988,14557,8798,14923,13014,14922,13014,14922,13012,14922,13004,14920,12987,14919,12957,14915,12907,14909,12834,14902,12738,14894,12623,14888,12498,14883,12370,14880,12203,14878,11970,14875,11759,14873,11569,14874,11401,14872,11243,14865,10986,14855,10762,14842,10568,14825,10401,14804,10255,14781,10017,14754,9799,14725,9611,14692,9445,14658,9301,14623,9139,14587,8920,14548,8729,14509,8562,15008,12672,15008,12672,15008,12671,15007,12667,15005,12656,15001,12637,14997,12605,14989,12556,14978,12490,14966,12407,14953,12313,14940,12136,14927,11934,14914,11742,14903,11563,14896,11401,14889,11247,14879,10992,14866,10767,14851,10570,14833,10400,14812,10252,14789,10007,14761,9784,14731,9592,14698,9424,14663,9279,14627,9088,14588,8868,14548,8676,14508,8508,14467,8360,15080,12386,15080,12386,15079,12385,15078,12383,15076,12378,15072,12367,15066,12347,15057,12315,15045,12253,15030,12138,15012,11998,14993,11845,14972,11685,14951,11530,14935,11383,14920,11228,14904,10981,14887,10762,14870,10567,14850,10397,14827,10248,14803,9997,14774,9771,14743,9578,14710,9407,14674,9259,14637,9048,14596,8826,14555,8632,14514,8464,14471,8317,14427,8182,15139,12008,15139,12008,15138,12008,15137,12007,15135,12003,15130,11990,15124,11969,15115,11929,15102,11872,15086,11794,15064,11693,15041,11581,15013,11459,14987,11336,14966,11170,14944,10944,14921,10738,14898,10552,14875,10387,14850,10239,14824,9983,14794,9758,14762,9563,14728,9392,14692,9244,14653,9014,14611,8791,14569,8597,14526,8427,14481,8281,14436,8110,14391,7885,15188,11617,15188,11617,15187,11617,15186,11618,15183,11617,15179,11612,15173,11601,15163,11581,15150,11546,15133,11495,15110,11427,15083,11346,15051,11246,15024,11057,14996,10868,14967,10687,14938,10517,14911,10362,14882,10206,14853,9956,14821,9737,14787,9543,14752,9375,14715,9228,14675,8980,14632,8760,14589,8565,14544,8395,14498,8248,14451,8049,14404,7824,14357,7630,15228,11298,15228,11298,15227,11299,15226,11301,15223,11303,15219,11302,15213,11299,15204,11290,15191,11271,15174,11217,15150,11129,15119,11015,15087,10886,15057,10744,15024,10599,14990,10455,14957,10318,14924,10143,14891,9911,14856,9701,14820,9516,14782,9352,14744,9200,14703,8946,14659,8725,14615,8533,14568,8366,14521,8220,14472,7992,14423,7770,14374,7578,14315,7408,15260,10819,15260,10819,15259,10822,15258,10826,15256,10832,15251,10836,15246,10841,15237,10838,15225,10821,15207,10788,15183,10734,15151,10660,15120,10571,15087,10469,15049,10359,15012,10249,14974,10041,14937,9837,14900,9647,14860,9475,14820,9320,14779,9147,14736,8902,14691,8688,14646,8499,14598,8335,14549,8189,14499,7940,14448,7720,14397,7529,14347,7363,14256,7218,15285,10410,15285,10411,15285,10413,15284,10418,15282,10425,15278,10434,15272,10442,15264,10449,15252,10445,15235,10433,15210,10403,15179,10358,15149,10301,15113,10218,15073,10059,15033,9894,14991,9726,14951,9565,14909,9413,14865,9273,14822,9073,14777,8845,14730,8641,14682,8459,14633,8300,14583,8129,14531,7883,14479,7670,14426,7482,14373,7321,14305,7176,14201,6939,15305,9939,15305,9940,15305,9945,15304,9955,15302,9967,15298,9989,15293,10010,15286,10033,15274,10044,15258,10045,15233,10022,15205,9975,15174,9903,15136,9808,15095,9697,15053,9578,15009,9451,14965,9327,14918,9198,14871,8973,14825,8766,14775,8579,14725,8408,14675,8259,14622,8058,14569,7821,14515,7615,14460,7435,14405,7276,14350,7108,14256,6866,14149,6653,15321,9444,15321,9445,15321,9448,15320,9458,15317,9470,15314,9490,15310,9515,15302,9540,15292,9562,15276,9579,15251,9577,15226,9559,15195,9519,15156,9463,15116,9389,15071,9304,15025,9208,14978,9023,14927,8838,14878,8661,14827,8496,14774,8344,14722,8206,14667,7973,14612,7749,14556,7555,14499,7382,14443,7229,14385,7025,14322,6791,14210,6588,14100,6409,15333,8920,15333,8921,15332,8927,15332,8943,15329,8965,15326,9002,15322,9048,15316,9106,15307,9162,15291,9204,15267,9221,15244,9221,15212,9196,15175,9134,15133,9043,15088,8930,15040,8801,14990,8665,14938,8526,14886,8391,14830,8261,14775,8087,14719,7866,14661,7664,14603,7482,14544,7322,14485,7178,14426,6936,14367,6713,14281,6517,14166,6348,14054,6198,15341,8360,15341,8361,15341,8366,15341,8379,15339,8399,15336,8431,15332,8473,15326,8527,15318,8585,15302,8632,15281,8670,15258,8690,15227,8690,15191,8664,15149,8612,15104,8543,15055,8456,15001,8360,14948,8259,14892,8122,14834,7923,14776,7734,14716,7558,14656,7397,14595,7250,14534,7070,14472,6835,14410,6628,14350,6443,14243,6283,14125,6135,14010,5889,15348,7715,15348,7717,15348,7725,15347,7745,15345,7780,15343,7836,15339,7905,15334,8e3,15326,8103,15310,8193,15293,8239,15270,8270,15240,8287,15204,8283,15163,8260,15118,8223,15067,8143,15014,8014,14958,7873,14899,7723,14839,7573,14778,7430,14715,7293,14652,7164,14588,6931,14524,6720,14460,6531,14396,6362,14330,6210,14207,6015,14086,5781,13969,5576,15352,7114,15352,7116,15352,7128,15352,7159,15350,7195,15348,7237,15345,7299,15340,7374,15332,7457,15317,7544,15301,7633,15280,7703,15251,7754,15216,7775,15176,7767,15131,7733,15079,7670,15026,7588,14967,7492,14906,7387,14844,7278,14779,7171,14714,6965,14648,6770,14581,6587,14515,6420,14448,6269,14382,6123,14299,5881,14172,5665,14049,5477,13929,5310,15355,6329,15355,6330,15355,6339,15355,6362,15353,6410,15351,6472,15349,6572,15344,6688,15337,6835,15323,6985,15309,7142,15287,7220,15260,7277,15226,7310,15188,7326,15142,7318,15090,7285,15036,7239,14976,7177,14914,7045,14849,6892,14782,6736,14714,6581,14645,6433,14576,6293,14506,6164,14438,5946,14369,5733,14270,5540,14140,5369,14014,5216,13892,5043,15357,5483,15357,5484,15357,5496,15357,5528,15356,5597,15354,5692,15351,5835,15347,6011,15339,6195,15328,6317,15314,6446,15293,6566,15268,6668,15235,6746,15197,6796,15152,6811,15101,6790,15046,6748,14985,6673,14921,6583,14854,6479,14785,6371,14714,6259,14643,6149,14571,5946,14499,5750,14428,5567,14358,5401,14242,5250,14109,5111,13980,4870,13856,4657,15359,4555,15359,4557,15358,4573,15358,4633,15357,4715,15355,4841,15353,5061,15349,5216,15342,5391,15331,5577,15318,5770,15299,5967,15274,6150,15243,6223,15206,6280,15161,6310,15111,6317,15055,6300,14994,6262,14928,6208,14860,6141,14788,5994,14715,5838,14641,5684,14566,5529,14492,5384,14418,5247,14346,5121,14216,4892,14079,4682,13948,4496,13822,4330,15359,3498,15359,3501,15359,3520,15359,3598,15358,3719,15356,3860,15355,4137,15351,4305,15344,4563,15334,4809,15321,5116,15303,5273,15280,5418,15250,5547,15214,5653,15170,5722,15120,5761,15064,5763,15002,5733,14935,5673,14865,5597,14792,5504,14716,5400,14640,5294,14563,5185,14486,5041,14410,4841,14335,4655,14191,4482,14051,4325,13918,4183,13790,4012,15360,2282,15360,2285,15360,2306,15360,2401,15359,2547,15357,2748,15355,3103,15352,3349,15345,3675,15336,4020,15324,4272,15307,4496,15285,4716,15255,4908,15220,5086,15178,5170,15128,5214,15072,5234,15010,5231,14943,5206,14871,5166,14796,5102,14718,4971,14639,4833,14559,4687,14480,4541,14402,4401,14315,4268,14167,4142,14025,3958,13888,3747,13759,3556,15360,923,15360,925,15360,946,15360,1052,15359,1214,15357,1494,15356,1892,15352,2274,15346,2663,15338,3099,15326,3393,15309,3679,15288,3980,15260,4183,15226,4325,15185,4437,15136,4517,15080,4570,15018,4591,14950,4581,14877,4545,14800,4485,14720,4411,14638,4325,14556,4231,14475,4136,14395,3988,14297,3803,14145,3628,13999,3465,13861,3314,13729,3177,15360,263,15360,264,15360,272,15360,325,15359,407,15358,548,15356,780,15352,1144,15347,1580,15339,2099,15328,2425,15312,2795,15292,3133,15264,3329,15232,3517,15191,3689,15143,3819,15088,3923,15025,3978,14956,3999,14882,3979,14804,3931,14722,3855,14639,3756,14554,3645,14470,3529,14388,3409,14279,3289,14124,3173,13975,3055,13834,2848,13701,2658,15360,49,15360,49,15360,52,15360,75,15359,111,15358,201,15356,283,15353,519,15348,726,15340,1045,15329,1415,15314,1795,15295,2173,15269,2410,15237,2649,15197,2866,15150,3054,15095,3140,15032,3196,14963,3228,14888,3236,14808,3224,14725,3191,14639,3146,14553,3088,14466,2976,14382,2836,14262,2692,14103,2549,13952,2409,13808,2278,13674,2154,15360,4,15360,4,15360,4,15360,13,15359,33,15358,59,15357,112,15353,199,15348,302,15341,456,15331,628,15316,827,15297,1082,15272,1332,15241,1601,15202,1851,15156,2069,15101,2172,15039,2256,14970,2314,14894,2348,14813,2358,14728,2344,14640,2311,14551,2263,14463,2203,14376,2133,14247,2059,14084,1915,13930,1761,13784,1609,13648,1464,15360,0,15360,0,15360,0,15360,3,15359,18,15358,26,15357,53,15354,80,15348,97,15341,165,15332,238,15318,326,15299,427,15275,529,15245,654,15207,771,15161,885,15108,994,15046,1089,14976,1170,14900,1229,14817,1266,14731,1284,14641,1282,14550,1260,14460,1223,14370,1174,14232,1116,14066,1050,13909,981,13761,910,13623,839]),pi=null;function Nv(){return pi===null&&(pi=new Ws(Dv,32,32,ac,os),pi.minFilter=Ft,pi.magFilter=Ft,pi.wrapS=xn,pi.wrapT=xn,pi.generateMipmaps=!1,pi.needsUpdate=!0),pi}var zc=class{constructor(e={}){let{canvas:t=Gf(),context:n=null,depth:s=!0,stencil:r=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1}=e;this.isWebGLRenderer=!0;let f;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");f=n.getContextAttributes().alpha}else f=a;let g=new Set([cc,oc,rc]),x=new Set([Nn,Li,nr,ir,nc,ic]),m=new Uint32Array(4),p=new Int32Array(4),M=null,v=null,w=[],I=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=di,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let E=this,P=!1;this._outputColorSpace=Et;let O=0,S=0,y=null,R=-1,L=null,k=new it,z=new it,G=null,X=new Oe(0),re=0,Y=t.width,ae=t.height,le=1,Ee=null,Ze=null,Qe=new it(0,0,Y,ae),rt=new it(0,0,Y,ae),at=!1,K=new Xs,j=!1,ve=!1,De=new We,Ae=new D,je=new it,ft={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},ke=!1;function Q(){return y===null?le:1}let A=n;function $(b,U){return t.getContext(b,U)}try{let b={alpha:!0,depth:s,stencil:r,antialias:o,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${"181"}`),t.addEventListener("webglcontextlost",ne,!1),t.addEventListener("webglcontextrestored",Z,!1),t.addEventListener("webglcontextcreationerror",Me,!1),A===null){let U="webgl2";if(A=$(U,b),A===null)throw $(U)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(b){throw b("WebGLRenderer: "+b.message),b}let se,ce,te,Se,fe,ye,T,_,B,q,J,W,Ce,pe,Pe,Te,ee,he,Be,Ue,_e,Ve,N,ge;function ue(){se=new J_(A),se.init(),Ve=new Av(A,se),ce=new V_(A,se,e,Ve),te=new Ev(A,se),ce.reversedDepthBuffer&&d&&te.buffers.depth.setReversed(!0),Se=new Q_(A),fe=new dv,ye=new Tv(A,se,te,fe,ce,Ve,Se),T=new G_(E),_=new Z_(E),B=new ig(A),N=new k_(A,B),q=new j_(A,B,Se,N),J=new ty(A,q,B,Se),Be=new ey(A,ce,ye),Te=new H_(fe),W=new uv(E,T,_,se,ce,N,Te),Ce=new Pv(E,fe),pe=new pv,Pe=new vv(se),he=new B_(E,T,_,te,J,f,c),ee=new Mv(E,J,ce),ge=new Lv(A,Se,ce,te),Ue=new z_(A,se,Se),_e=new $_(A,se,Se),Se.programs=W.programs,E.capabilities=ce,E.extensions=se,E.properties=fe,E.renderLists=pe,E.shadowMap=ee,E.state=te,E.info=Se}ue();let de=new Xh(E,A);this.xr=de,this.getContext=function(){return A},this.getContextAttributes=function(){return A.getContextAttributes()},this.forceContextLoss=function(){let b=se.get("WEBGL_lose_context");b&&b.loseContext()},this.forceContextRestore=function(){let b=se.get("WEBGL_lose_context");b&&b.restoreContext()},this.getPixelRatio=function(){return le},this.setPixelRatio=function(b){b!==void 0&&(le=b,this.setSize(Y,ae,!1))},this.getSize=function(b){return b.set(Y,ae)},this.setSize=function(b,U,V=!0){if(de.isPresenting){Re("WebGLRenderer: Can't change size while VR device is presenting.");return}Y=b,ae=U,t.width=Math.floor(b*le),t.height=Math.floor(U*le),V===!0&&(t.style.width=b+"px",t.style.height=U+"px"),this.setViewport(0,0,b,U)},this.getDrawingBufferSize=function(b){return b.set(Y*le,ae*le).floor()},this.setDrawingBufferSize=function(b,U,V){Y=b,ae=U,le=V,t.width=Math.floor(b*V),t.height=Math.floor(U*V),this.setViewport(0,0,b,U)},this.getCurrentViewport=function(b){return b.copy(k)},this.getViewport=function(b){return b.copy(Qe)},this.setViewport=function(b,U,V,H){b.isVector4?Qe.set(b.x,b.y,b.z,b.w):Qe.set(b,U,V,H),te.viewport(k.copy(Qe).multiplyScalar(le).round())},this.getScissor=function(b){return b.copy(rt)},this.setScissor=function(b,U,V,H){b.isVector4?rt.set(b.x,b.y,b.z,b.w):rt.set(b,U,V,H),te.scissor(z.copy(rt).multiplyScalar(le).round())},this.getScissorTest=function(){return at},this.setScissorTest=function(b){te.setScissorTest(at=b)},this.setOpaqueSort=function(b){Ee=b},this.setTransparentSort=function(b){Ze=b},this.getClearColor=function(b){return b.copy(he.getClearColor())},this.setClearColor=function(){he.setClearColor(...arguments)},this.getClearAlpha=function(){return he.getClearAlpha()},this.setClearAlpha=function(){he.setClearAlpha(...arguments)},this.clear=function(b=!0,U=!0,V=!0){let H=0;if(b){let F=!1;if(y!==null){let oe=y.texture.format;F=g.has(oe)}if(F){let oe=y.texture.type,xe=x.has(oe),we=he.getClearColor(),be=he.getClearAlpha(),Fe=we.r,ze=we.g,Le=we.b;xe?(m[0]=Fe,m[1]=ze,m[2]=Le,m[3]=be,A.clearBufferuiv(A.COLOR,0,m)):(p[0]=Fe,p[1]=ze,p[2]=Le,p[3]=be,A.clearBufferiv(A.COLOR,0,p))}else H|=A.COLOR_BUFFER_BIT}U&&(H|=A.DEPTH_BUFFER_BIT),V&&(H|=A.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),A.clear(H)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",ne,!1),t.removeEventListener("webglcontextrestored",Z,!1),t.removeEventListener("webglcontextcreationerror",Me,!1),he.dispose(),pe.dispose(),Pe.dispose(),fe.dispose(),T.dispose(),_.dispose(),J.dispose(),N.dispose(),ge.dispose(),W.dispose(),de.dispose(),de.removeEventListener("sessionstart",Zu),de.removeEventListener("sessionend",Ju),zi.stop()};function ne(b){b.preventDefault(),Ur("WebGLRenderer: Context Lost."),P=!0}function Z(){Ur("WebGLRenderer: Context Restored."),P=!1;let b=Se.autoReset,U=ee.enabled,V=ee.autoUpdate,H=ee.needsUpdate,F=ee.type;ue(),Se.autoReset=b,ee.enabled=U,ee.autoUpdate=V,ee.needsUpdate=H,ee.type=F}function Me(b){Je("WebGLRenderer: A WebGL context could not be created. Reason: ",b.statusMessage)}function He(b){let U=b.target;U.removeEventListener("dispose",He),gt(U)}function gt(b){lt(b),fe.remove(b)}function lt(b){let U=fe.get(b).programs;U!==void 0&&(U.forEach(function(V){W.releaseProgram(V)}),b.isShaderMaterial&&W.releaseShaderCache(b))}this.renderBufferDirect=function(b,U,V,H,F,oe){U===null&&(U=ft);let xe=F.isMesh&&F.matrixWorld.determinant()<0,we=gm(b,U,V,H,F);te.setMaterial(H,xe);let be=V.index,Fe=1;if(H.wireframe===!0){if(be=q.getWireframeAttribute(V),be===void 0)return;Fe=2}let ze=V.drawRange,Le=V.attributes.position,et=ze.start*Fe,ht=(ze.start+ze.count)*Fe;oe!==null&&(et=Math.max(et,oe.start*Fe),ht=Math.min(ht,(oe.start+oe.count)*Fe)),be!==null?(et=Math.max(et,0),ht=Math.min(ht,be.count)):Le!=null&&(et=Math.max(et,0),ht=Math.min(ht,Le.count));let St=ht-et;if(St<0||St===1/0)return;N.setup(F,H,we,V,be);let Mt,pt=Ue;if(be!==null&&(Mt=B.get(be),pt=_e,pt.setIndex(Mt)),F.isMesh)H.wireframe===!0?(te.setLineWidth(H.wireframeLinewidth*Q()),pt.setMode(A.LINES)):pt.setMode(A.TRIANGLES);else if(F.isLine){let Ne=H.linewidth;Ne===void 0&&(Ne=1),te.setLineWidth(Ne*Q()),F.isLineSegments?pt.setMode(A.LINES):F.isLineLoop?pt.setMode(A.LINE_LOOP):pt.setMode(A.LINE_STRIP)}else F.isPoints?pt.setMode(A.POINTS):F.isSprite&&pt.setMode(A.TRIANGLES);if(F.isBatchedMesh)if(F._multiDrawInstances!==null)Bs("WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),pt.renderMultiDrawInstances(F._multiDrawStarts,F._multiDrawCounts,F._multiDrawCount,F._multiDrawInstances);else if(se.get("WEBGL_multi_draw"))pt.renderMultiDraw(F._multiDrawStarts,F._multiDrawCounts,F._multiDrawCount);else{let Ne=F._multiDrawStarts,_t=F._multiDrawCounts,nt=F._multiDrawCount,rn=be?B.get(be).bytesPerElement:1,_s=fe.get(H).currentProgram.getUniforms();for(let an=0;an<nt;an++)_s.setValue(A,"_gl_DrawID",an),pt.render(Ne[an]/rn,_t[an])}else if(F.isInstancedMesh)pt.renderInstances(et,St,F.count);else if(V.isInstancedBufferGeometry){let Ne=V._maxInstanceCount!==void 0?V._maxInstanceCount:1/0,_t=Math.min(V.instanceCount,Ne);pt.renderInstances(et,St,_t)}else pt.render(et,St)};function kn(b,U,V){b.transparent===!0&&b.side===vn&&b.forceSinglePass===!1?(b.side=Jt,b.needsUpdate=!0,za(b,U,V),b.side=Rn,b.needsUpdate=!0,za(b,U,V),b.side=vn):za(b,U,V)}this.compile=function(b,U,V=null){V===null&&(V=b),v=Pe.get(V),v.init(U),I.push(v),V.traverseVisible(function(F){F.isLight&&F.layers.test(U.layers)&&(v.pushLight(F),F.castShadow&&v.pushShadow(F))}),b!==V&&b.traverseVisible(function(F){F.isLight&&F.layers.test(U.layers)&&(v.pushLight(F),F.castShadow&&v.pushShadow(F))}),v.setupLights();let H=new Set;return b.traverse(function(F){if(!(F.isMesh||F.isPoints||F.isLine||F.isSprite))return;let oe=F.material;if(oe)if(Array.isArray(oe))for(let xe=0;xe<oe.length;xe++){let we=oe[xe];kn(we,V,F),H.add(we)}else kn(oe,V,F),H.add(oe)}),v=I.pop(),H},this.compileAsync=function(b,U,V=null){let H=this.compile(b,U,V);return new Promise(F=>{function oe(){if(H.forEach(function(xe){fe.get(xe).currentProgram.isReady()&&H.delete(xe)}),H.size===0){F(b);return}setTimeout(oe,10)}se.get("KHR_parallel_shader_compile")!==null?oe():setTimeout(oe,10)})};let Mn=null;function mm(b){Mn&&Mn(b)}function Zu(){zi.stop()}function Ju(){zi.start()}let zi=new bp;zi.setAnimationLoop(mm),typeof self<"u"&&zi.setContext(self),this.setAnimationLoop=function(b){Mn=b,de.setAnimationLoop(b),b===null?zi.stop():zi.start()},de.addEventListener("sessionstart",Zu),de.addEventListener("sessionend",Ju),this.render=function(b,U){if(U!==void 0&&U.isCamera!==!0){Je("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(P===!0)return;if(b.matrixWorldAutoUpdate===!0&&b.updateMatrixWorld(),U.parent===null&&U.matrixWorldAutoUpdate===!0&&U.updateMatrixWorld(),de.enabled===!0&&de.isPresenting===!0&&(de.cameraAutoUpdate===!0&&de.updateCamera(U),U=de.getCamera()),b.isScene===!0&&b.onBeforeRender(E,b,U,y),v=Pe.get(b,I.length),v.init(U),I.push(v),De.multiplyMatrices(U.projectionMatrix,U.matrixWorldInverse),K.setFromProjectionMatrix(De,Cn,U.reversedDepth),ve=this.localClippingEnabled,j=Te.init(this.clippingPlanes,ve),M=pe.get(b,w.length),M.init(),w.push(M),de.enabled===!0&&de.isPresenting===!0){let oe=E.xr.getDepthSensingMesh();oe!==null&&dl(oe,U,-1/0,E.sortObjects)}dl(b,U,0,E.sortObjects),M.finish(),E.sortObjects===!0&&M.sort(Ee,Ze),ke=de.enabled===!1||de.isPresenting===!1||de.hasDepthSensing()===!1,ke&&he.addToRenderList(M,b),this.info.render.frame++,j===!0&&Te.beginShadows();let V=v.state.shadowsArray;ee.render(V,b,U),j===!0&&Te.endShadows(),this.info.autoReset===!0&&this.info.reset();let H=M.opaque,F=M.transmissive;if(v.setupLights(),U.isArrayCamera){let oe=U.cameras;if(F.length>0)for(let xe=0,we=oe.length;xe<we;xe++){let be=oe[xe];$u(H,F,b,be)}ke&&he.render(b);for(let xe=0,we=oe.length;xe<we;xe++){let be=oe[xe];ju(M,b,be,be.viewport)}}else F.length>0&&$u(H,F,b,U),ke&&he.render(b),ju(M,b,U);y!==null&&S===0&&(ye.updateMultisampleRenderTarget(y),ye.updateRenderTargetMipmap(y)),b.isScene===!0&&b.onAfterRender(E,b,U),N.resetDefaultState(),R=-1,L=null,I.pop(),I.length>0?(v=I[I.length-1],j===!0&&Te.setGlobalState(E.clippingPlanes,v.state.camera)):v=null,w.pop(),w.length>0?M=w[w.length-1]:M=null};function dl(b,U,V,H){if(b.visible===!1)return;if(b.layers.test(U.layers)){if(b.isGroup)V=b.renderOrder;else if(b.isLOD)b.autoUpdate===!0&&b.update(U);else if(b.isLight)v.pushLight(b),b.castShadow&&v.pushShadow(b);else if(b.isSprite){if(!b.frustumCulled||K.intersectsSprite(b)){H&&je.setFromMatrixPosition(b.matrixWorld).applyMatrix4(De);let xe=J.update(b),we=b.material;we.visible&&M.push(b,xe,we,V,je.z,null)}}else if((b.isMesh||b.isLine||b.isPoints)&&(!b.frustumCulled||K.intersectsObject(b))){let xe=J.update(b),we=b.material;if(H&&(b.boundingSphere!==void 0?(b.boundingSphere===null&&b.computeBoundingSphere(),je.copy(b.boundingSphere.center)):(xe.boundingSphere===null&&xe.computeBoundingSphere(),je.copy(xe.boundingSphere.center)),je.applyMatrix4(b.matrixWorld).applyMatrix4(De)),Array.isArray(we)){let be=xe.groups;for(let Fe=0,ze=be.length;Fe<ze;Fe++){let Le=be[Fe],et=we[Le.materialIndex];et&&et.visible&&M.push(b,xe,et,V,je.z,Le)}}else we.visible&&M.push(b,xe,we,V,je.z,null)}}let oe=b.children;for(let xe=0,we=oe.length;xe<we;xe++)dl(oe[xe],U,V,H)}function ju(b,U,V,H){let{opaque:F,transmissive:oe,transparent:xe}=b;v.setupLightsView(V),j===!0&&Te.setGlobalState(E.clippingPlanes,V),H&&te.viewport(k.copy(H)),F.length>0&&ka(F,U,V),oe.length>0&&ka(oe,U,V),xe.length>0&&ka(xe,U,V),te.buffers.depth.setTest(!0),te.buffers.depth.setMask(!0),te.buffers.color.setMask(!0),te.setPolygonOffset(!1)}function $u(b,U,V,H){if((V.isScene===!0?V.overrideMaterial:null)!==null)return;v.state.transmissionRenderTarget[H.id]===void 0&&(v.state.transmissionRenderTarget[H.id]=new Hn(1,1,{generateMipmaps:!0,type:se.has("EXT_color_buffer_half_float")||se.has("EXT_color_buffer_float")?os:Nn,minFilter:Dn,samples:4,stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:tt.workingColorSpace}));let oe=v.state.transmissionRenderTarget[H.id],xe=H.viewport||k;oe.setSize(xe.z*E.transmissionResolutionScale,xe.w*E.transmissionResolutionScale);let we=E.getRenderTarget(),be=E.getActiveCubeFace(),Fe=E.getActiveMipmapLevel();E.setRenderTarget(oe),E.getClearColor(X),re=E.getClearAlpha(),re<1&&E.setClearColor(16777215,.5),E.clear(),ke&&he.render(V);let ze=E.toneMapping;E.toneMapping=di;let Le=H.viewport;if(H.viewport!==void 0&&(H.viewport=void 0),v.setupLightsView(H),j===!0&&Te.setGlobalState(E.clippingPlanes,H),ka(b,V,H),ye.updateMultisampleRenderTarget(oe),ye.updateRenderTargetMipmap(oe),se.has("WEBGL_multisampled_render_to_texture")===!1){let et=!1;for(let ht=0,St=U.length;ht<St;ht++){let Mt=U[ht],{object:pt,geometry:Ne,material:_t,group:nt}=Mt;if(_t.side===vn&&pt.layers.test(H.layers)){let rn=_t.side;_t.side=Jt,_t.needsUpdate=!0,Qu(pt,V,H,Ne,_t,nt),_t.side=rn,_t.needsUpdate=!0,et=!0}}et===!0&&(ye.updateMultisampleRenderTarget(oe),ye.updateRenderTargetMipmap(oe))}E.setRenderTarget(we,be,Fe),E.setClearColor(X,re),Le!==void 0&&(H.viewport=Le),E.toneMapping=ze}function ka(b,U,V){let H=U.isScene===!0?U.overrideMaterial:null;for(let F=0,oe=b.length;F<oe;F++){let xe=b[F],{object:we,geometry:be,group:Fe}=xe,ze=xe.material;ze.allowOverride===!0&&H!==null&&(ze=H),we.layers.test(V.layers)&&Qu(we,U,V,be,ze,Fe)}}function Qu(b,U,V,H,F,oe){b.onBeforeRender(E,U,V,H,F,oe),b.modelViewMatrix.multiplyMatrices(V.matrixWorldInverse,b.matrixWorld),b.normalMatrix.getNormalMatrix(b.modelViewMatrix),F.onBeforeRender(E,U,V,H,b,oe),F.transparent===!0&&F.side===vn&&F.forceSinglePass===!1?(F.side=Jt,F.needsUpdate=!0,E.renderBufferDirect(V,U,H,F,b,oe),F.side=Rn,F.needsUpdate=!0,E.renderBufferDirect(V,U,H,F,b,oe),F.side=vn):E.renderBufferDirect(V,U,H,F,b,oe),b.onAfterRender(E,U,V,H,F,oe)}function za(b,U,V){U.isScene!==!0&&(U=ft);let H=fe.get(b),F=v.state.lights,oe=v.state.shadowsArray,xe=F.state.version,we=W.getParameters(b,F.state,oe,U,V),be=W.getProgramCacheKey(we),Fe=H.programs;H.environment=b.isMeshStandardMaterial?U.environment:null,H.fog=U.fog,H.envMap=(b.isMeshStandardMaterial?_:T).get(b.envMap||H.environment),H.envMapRotation=H.environment!==null&&b.envMap===null?U.environmentRotation:b.envMapRotation,Fe===void 0&&(b.addEventListener("dispose",He),Fe=new Map,H.programs=Fe);let ze=Fe.get(be);if(ze!==void 0){if(H.currentProgram===ze&&H.lightsStateVersion===xe)return td(b,we),ze}else we.uniforms=W.getUniforms(b),b.onBeforeCompile(we,E),ze=W.acquireProgram(we,be),Fe.set(be,ze),H.uniforms=we.uniforms;let Le=H.uniforms;return(!b.isShaderMaterial&&!b.isRawShaderMaterial||b.clipping===!0)&&(Le.clippingPlanes=Te.uniform),td(b,we),H.needsLights=_m(b),H.lightsStateVersion=xe,H.needsLights&&(Le.ambientLightColor.value=F.state.ambient,Le.lightProbe.value=F.state.probe,Le.directionalLights.value=F.state.directional,Le.directionalLightShadows.value=F.state.directionalShadow,Le.spotLights.value=F.state.spot,Le.spotLightShadows.value=F.state.spotShadow,Le.rectAreaLights.value=F.state.rectArea,Le.ltc_1.value=F.state.rectAreaLTC1,Le.ltc_2.value=F.state.rectAreaLTC2,Le.pointLights.value=F.state.point,Le.pointLightShadows.value=F.state.pointShadow,Le.hemisphereLights.value=F.state.hemi,Le.directionalShadowMap.value=F.state.directionalShadowMap,Le.directionalShadowMatrix.value=F.state.directionalShadowMatrix,Le.spotShadowMap.value=F.state.spotShadowMap,Le.spotLightMatrix.value=F.state.spotLightMatrix,Le.spotLightMap.value=F.state.spotLightMap,Le.pointShadowMap.value=F.state.pointShadowMap,Le.pointShadowMatrix.value=F.state.pointShadowMatrix),H.currentProgram=ze,H.uniformsList=null,ze}function ed(b){if(b.uniformsList===null){let U=b.currentProgram.getUniforms();b.uniformsList=or.seqWithValue(U.seq,b.uniforms)}return b.uniformsList}function td(b,U){let V=fe.get(b);V.outputColorSpace=U.outputColorSpace,V.batching=U.batching,V.batchingColor=U.batchingColor,V.instancing=U.instancing,V.instancingColor=U.instancingColor,V.instancingMorph=U.instancingMorph,V.skinning=U.skinning,V.morphTargets=U.morphTargets,V.morphNormals=U.morphNormals,V.morphColors=U.morphColors,V.morphTargetsCount=U.morphTargetsCount,V.numClippingPlanes=U.numClippingPlanes,V.numIntersection=U.numClipIntersection,V.vertexAlphas=U.vertexAlphas,V.vertexTangents=U.vertexTangents,V.toneMapping=U.toneMapping}function gm(b,U,V,H,F){U.isScene!==!0&&(U=ft),ye.resetTextureUnits();let oe=U.fog,xe=H.isMeshStandardMaterial?U.environment:null,we=y===null?E.outputColorSpace:y.isXRRenderTarget===!0?y.texture.colorSpace:Bt,be=(H.isMeshStandardMaterial?_:T).get(H.envMap||xe),Fe=H.vertexColors===!0&&!!V.attributes.color&&V.attributes.color.itemSize===4,ze=!!V.attributes.tangent&&(!!H.normalMap||H.anisotropy>0),Le=!!V.morphAttributes.position,et=!!V.morphAttributes.normal,ht=!!V.morphAttributes.color,St=di;H.toneMapped&&(y===null||y.isXRRenderTarget===!0)&&(St=E.toneMapping);let Mt=V.morphAttributes.position||V.morphAttributes.normal||V.morphAttributes.color,pt=Mt!==void 0?Mt.length:0,Ne=fe.get(H),_t=v.state.lights;if(j===!0&&(ve===!0||b!==L)){let qt=b===L&&H.id===R;Te.setState(H,b,qt)}let nt=!1;H.version===Ne.__version?(Ne.needsLights&&Ne.lightsStateVersion!==_t.state.version||Ne.outputColorSpace!==we||F.isBatchedMesh&&Ne.batching===!1||!F.isBatchedMesh&&Ne.batching===!0||F.isBatchedMesh&&Ne.batchingColor===!0&&F.colorTexture===null||F.isBatchedMesh&&Ne.batchingColor===!1&&F.colorTexture!==null||F.isInstancedMesh&&Ne.instancing===!1||!F.isInstancedMesh&&Ne.instancing===!0||F.isSkinnedMesh&&Ne.skinning===!1||!F.isSkinnedMesh&&Ne.skinning===!0||F.isInstancedMesh&&Ne.instancingColor===!0&&F.instanceColor===null||F.isInstancedMesh&&Ne.instancingColor===!1&&F.instanceColor!==null||F.isInstancedMesh&&Ne.instancingMorph===!0&&F.morphTexture===null||F.isInstancedMesh&&Ne.instancingMorph===!1&&F.morphTexture!==null||Ne.envMap!==be||H.fog===!0&&Ne.fog!==oe||Ne.numClippingPlanes!==void 0&&(Ne.numClippingPlanes!==Te.numPlanes||Ne.numIntersection!==Te.numIntersection)||Ne.vertexAlphas!==Fe||Ne.vertexTangents!==ze||Ne.morphTargets!==Le||Ne.morphNormals!==et||Ne.morphColors!==ht||Ne.toneMapping!==St||Ne.morphTargetsCount!==pt)&&(nt=!0):(nt=!0,Ne.__version=H.version);let rn=Ne.currentProgram;nt===!0&&(rn=za(H,U,F));let _s=!1,an=!1,yr=!1,yt=rn.getUniforms(),jt=Ne.uniforms;if(te.useProgram(rn.program)&&(_s=!0,an=!0,yr=!0),H.id!==R&&(R=H.id,an=!0),_s||L!==b){te.buffers.depth.getReversed()&&b.reversedDepth!==!0&&(b._reversedDepth=!0,b.updateProjectionMatrix()),yt.setValue(A,"projectionMatrix",b.projectionMatrix),yt.setValue(A,"viewMatrix",b.matrixWorldInverse);let $t=yt.map.cameraPosition;$t!==void 0&&$t.setValue(A,Ae.setFromMatrixPosition(b.matrixWorld)),ce.logarithmicDepthBuffer&&yt.setValue(A,"logDepthBufFC",2/(Math.log(b.far+1)/Math.LN2)),(H.isMeshPhongMaterial||H.isMeshToonMaterial||H.isMeshLambertMaterial||H.isMeshBasicMaterial||H.isMeshStandardMaterial||H.isShaderMaterial)&&yt.setValue(A,"isOrthographic",b.isOrthographicCamera===!0),L!==b&&(L=b,an=!0,yr=!0)}if(F.isSkinnedMesh){yt.setOptional(A,F,"bindMatrix"),yt.setOptional(A,F,"bindMatrixInverse");let qt=F.skeleton;qt&&(qt.boneTexture===null&&qt.computeBoneTexture(),yt.setValue(A,"boneTexture",qt.boneTexture,ye))}F.isBatchedMesh&&(yt.setOptional(A,F,"batchingTexture"),yt.setValue(A,"batchingTexture",F._matricesTexture,ye),yt.setOptional(A,F,"batchingIdTexture"),yt.setValue(A,"batchingIdTexture",F._indirectTexture,ye),yt.setOptional(A,F,"batchingColorTexture"),F._colorsTexture!==null&&yt.setValue(A,"batchingColorTexture",F._colorsTexture,ye));let fn=V.morphAttributes;if((fn.position!==void 0||fn.normal!==void 0||fn.color!==void 0)&&Be.update(F,V,rn),(an||Ne.receiveShadow!==F.receiveShadow)&&(Ne.receiveShadow=F.receiveShadow,yt.setValue(A,"receiveShadow",F.receiveShadow)),H.isMeshGouraudMaterial&&H.envMap!==null&&(jt.envMap.value=be,jt.flipEnvMap.value=be.isCubeTexture&&be.isRenderTargetTexture===!1?-1:1),H.isMeshStandardMaterial&&H.envMap===null&&U.environment!==null&&(jt.envMapIntensity.value=U.environmentIntensity),jt.dfgLUT!==void 0&&(jt.dfgLUT.value=Nv()),an&&(yt.setValue(A,"toneMappingExposure",E.toneMappingExposure),Ne.needsLights&&xm(jt,yr),oe&&H.fog===!0&&Ce.refreshFogUniforms(jt,oe),Ce.refreshMaterialUniforms(jt,H,le,ae,v.state.transmissionRenderTarget[b.id]),or.upload(A,ed(Ne),jt,ye)),H.isShaderMaterial&&H.uniformsNeedUpdate===!0&&(or.upload(A,ed(Ne),jt,ye),H.uniformsNeedUpdate=!1),H.isSpriteMaterial&&yt.setValue(A,"center",F.center),yt.setValue(A,"modelViewMatrix",F.modelViewMatrix),yt.setValue(A,"normalMatrix",F.normalMatrix),yt.setValue(A,"modelMatrix",F.matrixWorld),H.isShaderMaterial||H.isRawShaderMaterial){let qt=H.uniformsGroups;for(let $t=0,fl=qt.length;$t<fl;$t++){let Vi=qt[$t];ge.update(Vi,rn),ge.bind(Vi,rn)}}return rn}function xm(b,U){b.ambientLightColor.needsUpdate=U,b.lightProbe.needsUpdate=U,b.directionalLights.needsUpdate=U,b.directionalLightShadows.needsUpdate=U,b.pointLights.needsUpdate=U,b.pointLightShadows.needsUpdate=U,b.spotLights.needsUpdate=U,b.spotLightShadows.needsUpdate=U,b.rectAreaLights.needsUpdate=U,b.hemisphereLights.needsUpdate=U}function _m(b){return b.isMeshLambertMaterial||b.isMeshToonMaterial||b.isMeshPhongMaterial||b.isMeshStandardMaterial||b.isShadowMaterial||b.isShaderMaterial&&b.lights===!0}this.getActiveCubeFace=function(){return O},this.getActiveMipmapLevel=function(){return S},this.getRenderTarget=function(){return y},this.setRenderTargetTextures=function(b,U,V){let H=fe.get(b);H.__autoAllocateDepthBuffer=b.resolveDepthBuffer===!1,H.__autoAllocateDepthBuffer===!1&&(H.__useRenderToTexture=!1),fe.get(b.texture).__webglTexture=U,fe.get(b.depthTexture).__webglTexture=H.__autoAllocateDepthBuffer?void 0:V,H.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(b,U){let V=fe.get(b);V.__webglFramebuffer=U,V.__useDefaultFramebuffer=U===void 0};let ym=A.createFramebuffer();this.setRenderTarget=function(b,U=0,V=0){y=b,O=U,S=V;let H=!0,F=null,oe=!1,xe=!1;if(b){let be=fe.get(b);if(be.__useDefaultFramebuffer!==void 0)te.bindFramebuffer(A.FRAMEBUFFER,null),H=!1;else if(be.__webglFramebuffer===void 0)ye.setupRenderTarget(b);else if(be.__hasExternalTextures)ye.rebindTextures(b,fe.get(b.texture).__webglTexture,fe.get(b.depthTexture).__webglTexture);else if(b.depthBuffer){let Le=b.depthTexture;if(be.__boundDepthTexture!==Le){if(Le!==null&&fe.has(Le)&&(b.width!==Le.image.width||b.height!==Le.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");ye.setupDepthRenderbuffer(b)}}let Fe=b.texture;(Fe.isData3DTexture||Fe.isDataArrayTexture||Fe.isCompressedArrayTexture)&&(xe=!0);let ze=fe.get(b).__webglFramebuffer;b.isWebGLCubeRenderTarget?(Array.isArray(ze[U])?F=ze[U][V]:F=ze[U],oe=!0):b.samples>0&&ye.useMultisampledRTT(b)===!1?F=fe.get(b).__webglMultisampledFramebuffer:Array.isArray(ze)?F=ze[V]:F=ze,k.copy(b.viewport),z.copy(b.scissor),G=b.scissorTest}else k.copy(Qe).multiplyScalar(le).floor(),z.copy(rt).multiplyScalar(le).floor(),G=at;if(V!==0&&(F=ym),te.bindFramebuffer(A.FRAMEBUFFER,F)&&H&&te.drawBuffers(b,F),te.viewport(k),te.scissor(z),te.setScissorTest(G),oe){let be=fe.get(b.texture);A.framebufferTexture2D(A.FRAMEBUFFER,A.COLOR_ATTACHMENT0,A.TEXTURE_CUBE_MAP_POSITIVE_X+U,be.__webglTexture,V)}else if(xe){let be=U;for(let Fe=0;Fe<b.textures.length;Fe++){let ze=fe.get(b.textures[Fe]);A.framebufferTextureLayer(A.FRAMEBUFFER,A.COLOR_ATTACHMENT0+Fe,ze.__webglTexture,V,be)}}else if(b!==null&&V!==0){let be=fe.get(b.texture);A.framebufferTexture2D(A.FRAMEBUFFER,A.COLOR_ATTACHMENT0,A.TEXTURE_2D,be.__webglTexture,V)}R=-1},this.readRenderTargetPixels=function(b,U,V,H,F,oe,xe,we=0){if(!(b&&b.isWebGLRenderTarget)){Je("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let be=fe.get(b).__webglFramebuffer;if(b.isWebGLCubeRenderTarget&&xe!==void 0&&(be=be[xe]),be){te.bindFramebuffer(A.FRAMEBUFFER,be);try{let Fe=b.textures[we],ze=Fe.format,Le=Fe.type;if(!ce.textureFormatReadable(ze)){Je("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!ce.textureTypeReadable(Le)){Je("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}U>=0&&U<=b.width-H&&V>=0&&V<=b.height-F&&(b.textures.length>1&&A.readBuffer(A.COLOR_ATTACHMENT0+we),A.readPixels(U,V,H,F,Ve.convert(ze),Ve.convert(Le),oe))}finally{let Fe=y!==null?fe.get(y).__webglFramebuffer:null;te.bindFramebuffer(A.FRAMEBUFFER,Fe)}}},this.readRenderTargetPixelsAsync=async function(b,U,V,H,F,oe,xe,we=0){if(!(b&&b.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let be=fe.get(b).__webglFramebuffer;if(b.isWebGLCubeRenderTarget&&xe!==void 0&&(be=be[xe]),be)if(U>=0&&U<=b.width-H&&V>=0&&V<=b.height-F){te.bindFramebuffer(A.FRAMEBUFFER,be);let Fe=b.textures[we],ze=Fe.format,Le=Fe.type;if(!ce.textureFormatReadable(ze))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!ce.textureTypeReadable(Le))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let et=A.createBuffer();A.bindBuffer(A.PIXEL_PACK_BUFFER,et),A.bufferData(A.PIXEL_PACK_BUFFER,oe.byteLength,A.STREAM_READ),b.textures.length>1&&A.readBuffer(A.COLOR_ATTACHMENT0+we),A.readPixels(U,V,H,F,Ve.convert(ze),Ve.convert(Le),0);let ht=y!==null?fe.get(y).__webglFramebuffer:null;te.bindFramebuffer(A.FRAMEBUFFER,ht);let St=A.fenceSync(A.SYNC_GPU_COMMANDS_COMPLETE,0);return A.flush(),await Wf(A,St,4),A.bindBuffer(A.PIXEL_PACK_BUFFER,et),A.getBufferSubData(A.PIXEL_PACK_BUFFER,0,oe),A.deleteBuffer(et),A.deleteSync(St),oe}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(b,U=null,V=0){let H=Math.pow(2,-V),F=Math.floor(b.image.width*H),oe=Math.floor(b.image.height*H),xe=U!==null?U.x:0,we=U!==null?U.y:0;ye.setTexture2D(b,0),A.copyTexSubImage2D(A.TEXTURE_2D,V,0,0,xe,we,F,oe),te.unbindTexture()};let vm=A.createFramebuffer(),bm=A.createFramebuffer();this.copyTextureToTexture=function(b,U,V=null,H=null,F=0,oe=null){oe===null&&(F!==0?(Bs("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),oe=F,F=0):oe=0);let xe,we,be,Fe,ze,Le,et,ht,St,Mt=b.isCompressedTexture?b.mipmaps[oe]:b.image;if(V!==null)xe=V.max.x-V.min.x,we=V.max.y-V.min.y,be=V.isBox3?V.max.z-V.min.z:1,Fe=V.min.x,ze=V.min.y,Le=V.isBox3?V.min.z:0;else{let fn=Math.pow(2,-F);xe=Math.floor(Mt.width*fn),we=Math.floor(Mt.height*fn),b.isDataArrayTexture?be=Mt.depth:b.isData3DTexture?be=Math.floor(Mt.depth*fn):be=1,Fe=0,ze=0,Le=0}H!==null?(et=H.x,ht=H.y,St=H.z):(et=0,ht=0,St=0);let pt=Ve.convert(U.format),Ne=Ve.convert(U.type),_t;U.isData3DTexture?(ye.setTexture3D(U,0),_t=A.TEXTURE_3D):U.isDataArrayTexture||U.isCompressedArrayTexture?(ye.setTexture2DArray(U,0),_t=A.TEXTURE_2D_ARRAY):(ye.setTexture2D(U,0),_t=A.TEXTURE_2D),A.pixelStorei(A.UNPACK_FLIP_Y_WEBGL,U.flipY),A.pixelStorei(A.UNPACK_PREMULTIPLY_ALPHA_WEBGL,U.premultiplyAlpha),A.pixelStorei(A.UNPACK_ALIGNMENT,U.unpackAlignment);let nt=A.getParameter(A.UNPACK_ROW_LENGTH),rn=A.getParameter(A.UNPACK_IMAGE_HEIGHT),_s=A.getParameter(A.UNPACK_SKIP_PIXELS),an=A.getParameter(A.UNPACK_SKIP_ROWS),yr=A.getParameter(A.UNPACK_SKIP_IMAGES);A.pixelStorei(A.UNPACK_ROW_LENGTH,Mt.width),A.pixelStorei(A.UNPACK_IMAGE_HEIGHT,Mt.height),A.pixelStorei(A.UNPACK_SKIP_PIXELS,Fe),A.pixelStorei(A.UNPACK_SKIP_ROWS,ze),A.pixelStorei(A.UNPACK_SKIP_IMAGES,Le);let yt=b.isDataArrayTexture||b.isData3DTexture,jt=U.isDataArrayTexture||U.isData3DTexture;if(b.isDepthTexture){let fn=fe.get(b),qt=fe.get(U),$t=fe.get(fn.__renderTarget),fl=fe.get(qt.__renderTarget);te.bindFramebuffer(A.READ_FRAMEBUFFER,$t.__webglFramebuffer),te.bindFramebuffer(A.DRAW_FRAMEBUFFER,fl.__webglFramebuffer);for(let Vi=0;Vi<be;Vi++)yt&&(A.framebufferTextureLayer(A.READ_FRAMEBUFFER,A.COLOR_ATTACHMENT0,fe.get(b).__webglTexture,F,Le+Vi),A.framebufferTextureLayer(A.DRAW_FRAMEBUFFER,A.COLOR_ATTACHMENT0,fe.get(U).__webglTexture,oe,St+Vi)),A.blitFramebuffer(Fe,ze,xe,we,et,ht,xe,we,A.DEPTH_BUFFER_BIT,A.NEAREST);te.bindFramebuffer(A.READ_FRAMEBUFFER,null),te.bindFramebuffer(A.DRAW_FRAMEBUFFER,null)}else if(F!==0||b.isRenderTargetTexture||fe.has(b)){let fn=fe.get(b),qt=fe.get(U);te.bindFramebuffer(A.READ_FRAMEBUFFER,vm),te.bindFramebuffer(A.DRAW_FRAMEBUFFER,bm);for(let $t=0;$t<be;$t++)yt?A.framebufferTextureLayer(A.READ_FRAMEBUFFER,A.COLOR_ATTACHMENT0,fn.__webglTexture,F,Le+$t):A.framebufferTexture2D(A.READ_FRAMEBUFFER,A.COLOR_ATTACHMENT0,A.TEXTURE_2D,fn.__webglTexture,F),jt?A.framebufferTextureLayer(A.DRAW_FRAMEBUFFER,A.COLOR_ATTACHMENT0,qt.__webglTexture,oe,St+$t):A.framebufferTexture2D(A.DRAW_FRAMEBUFFER,A.COLOR_ATTACHMENT0,A.TEXTURE_2D,qt.__webglTexture,oe),F!==0?A.blitFramebuffer(Fe,ze,xe,we,et,ht,xe,we,A.COLOR_BUFFER_BIT,A.NEAREST):jt?A.copyTexSubImage3D(_t,oe,et,ht,St+$t,Fe,ze,xe,we):A.copyTexSubImage2D(_t,oe,et,ht,Fe,ze,xe,we);te.bindFramebuffer(A.READ_FRAMEBUFFER,null),te.bindFramebuffer(A.DRAW_FRAMEBUFFER,null)}else jt?b.isDataTexture||b.isData3DTexture?A.texSubImage3D(_t,oe,et,ht,St,xe,we,be,pt,Ne,Mt.data):U.isCompressedArrayTexture?A.compressedTexSubImage3D(_t,oe,et,ht,St,xe,we,be,pt,Mt.data):A.texSubImage3D(_t,oe,et,ht,St,xe,we,be,pt,Ne,Mt):b.isDataTexture?A.texSubImage2D(A.TEXTURE_2D,oe,et,ht,xe,we,pt,Ne,Mt.data):b.isCompressedTexture?A.compressedTexSubImage2D(A.TEXTURE_2D,oe,et,ht,Mt.width,Mt.height,pt,Mt.data):A.texSubImage2D(A.TEXTURE_2D,oe,et,ht,xe,we,pt,Ne,Mt);A.pixelStorei(A.UNPACK_ROW_LENGTH,nt),A.pixelStorei(A.UNPACK_IMAGE_HEIGHT,rn),A.pixelStorei(A.UNPACK_SKIP_PIXELS,_s),A.pixelStorei(A.UNPACK_SKIP_ROWS,an),A.pixelStorei(A.UNPACK_SKIP_IMAGES,yr),oe===0&&U.generateMipmaps&&A.generateMipmap(_t),te.unbindTexture()},this.initRenderTarget=function(b){fe.get(b).__webglFramebuffer===void 0&&ye.setupRenderTarget(b)},this.initTexture=function(b){b.isCubeTexture?ye.setTextureCube(b,0):b.isData3DTexture?ye.setTexture3D(b,0):b.isDataArrayTexture||b.isCompressedArrayTexture?ye.setTexture2DArray(b,0):ye.setTexture2D(b,0),te.unbindTexture()},this.resetState=function(){O=0,S=0,y=null,te.reset(),N.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Cn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=tt._getDrawingBufferColorSpace(e),t.unpackColorSpace=tt._getUnpackColorSpace()}};var Uv=[{id:"demo-tree",title:"\u3010\u30C7\u30E2\u3011\u91CD\u306D\u3066\u98FE\u308B\u30DF\u30CB\u30C4\u30EA\u30FC",author:"SPOOL\u30C7\u30E2",comment:"\u5C0F\u3055\u306A\u673A\u306B\u3082\u98FE\u308C\u308B\u3088\u3046\u306B\u3001\u5927\u304D\u3055\u306E\u9055\u3046\u7DD1\u306E\u5186\u3059\u3044\u30923\u6BB5\u306B\u91CD\u306D\u307E\u3057\u305F\u3002",color:"#40866b",kind:"tree"},{id:"demo-star",title:"\u3010\u30C7\u30E2\u3011\u661F\u306E\u30AA\u30FC\u30CA\u30E1\u30F3\u30C8",author:"SPOOL\u30C7\u30E2",comment:"\u7A93\u8FBA\u306B\u98FE\u308B\u661F\u3092\u30A4\u30E1\u30FC\u30B8\u3057\u307E\u3057\u305F\u3002\u5C11\u3057\u539A\u307F\u3092\u3064\u3051\u3066\u3001\u6A2A\u304B\u3089\u3082\u5F62\u3092\u697D\u3057\u3081\u308B\u3088\u3046\u306B\u3057\u3066\u3044\u307E\u3059\u3002",color:"#d8a946",kind:"star"},{id:"demo-gift",title:"\u3010\u30C7\u30E2\u3011\u30D7\u30EC\u30BC\u30F3\u30C8\u306E\u5C0F\u7269\u30B1\u30FC\u30B9",author:"SPOOL\u30C7\u30E2",comment:"\u8D64\u3044\u7BB1\u306B\u91D1\u8272\u306E\u30EA\u30DC\u30F3\u3092\u5341\u5B57\u306B\u304B\u3051\u307E\u3057\u305F\u3002\u4ECA\u56DE\u306F\u30D7\u30EC\u30BC\u30F3\u30C8\u7BB1\u306E\u5916\u89B3\u3092\u5F62\u306B\u3057\u3066\u3044\u307E\u3059\u3002",color:"#bf655c",kind:"gift"},{id:"demo-tree-snow",title:"\u3010\u30C7\u30E2\u3011\u96EA\u8272\u306E\u30DF\u30CB\u30C4\u30EA\u30FC",author:"SPOOL\u30C7\u30E2",comment:"\u96EA\u304C\u679D\u306B\u7A4D\u3082\u3063\u305F\u671D\u3092\u601D\u3044\u6D6E\u304B\u3079\u3066\u3001\u30C4\u30EA\u30FC\u5168\u4F53\u3092\u307B\u3093\u306E\u308A\u7DD1\u304C\u304B\u3063\u305F\u767D\u306B\u3057\u307E\u3057\u305F\u3002",color:"#dde7e2",kind:"tree"},{id:"demo-star-red",title:"\u3010\u30C7\u30E2\u3011\u8D64\u3044\u661F\u306E\u30AA\u30FC\u30CA\u30E1\u30F3\u30C8",author:"SPOOL\u30C7\u30E2",comment:"\u30C4\u30EA\u30FC\u306E\u7DD1\u306B\u6620\u3048\u308B\u3088\u3046\u306B\u3001\u661F\u3092\u6E29\u304B\u307F\u306E\u3042\u308B\u8D64\u306B\u3057\u307E\u3057\u305F\u3002",color:"#c85650",kind:"star"},{id:"demo-gift-blue",title:"\u3010\u30C7\u30E2\u3011\u9752\u3044\u30D7\u30EC\u30BC\u30F3\u30C8\u30B1\u30FC\u30B9",author:"SPOOL\u30C7\u30E2",comment:"\u51AC\u306E\u7A7A\u3092\u601D\u308F\u305B\u308B\u9752\u3044\u7BB1\u306B\u3001\u6DE1\u3044\u91D1\u8272\u306E\u30EA\u30DC\u30F3\u3092\u5408\u308F\u305B\u307E\u3057\u305F\u3002",color:"#5b8eb6",kind:"gift"},{id:"demo-tree-mint",title:"\u3010\u30C7\u30E2\u3011\u30DF\u30F3\u30C8\u8272\u306E\u30DF\u30CB\u30C4\u30EA\u30FC",author:"SPOOL\u30C7\u30E2",comment:"\u30DF\u30F3\u30C8\u8272\u306E\u679D\u306E\u4E0B\u304B\u3089\u3001\u8336\u8272\u3044\u5E79\u304C\u5C11\u3057\u3060\u3051\u306E\u305E\u304F\u5F62\u306B\u3057\u307E\u3057\u305F\u3002",color:"#7ebaa3",kind:"tree"},{id:"demo-star-silver",title:"\u3010\u30C7\u30E2\u3011\u30B7\u30EB\u30D0\u30FC\u306E\u661F\u98FE\u308A",author:"SPOOL\u30C7\u30E2",comment:"\u661F\u306E\u89D2\u3092\u5C11\u3057\u4E38\u3081\u307E\u3057\u305F\u3002\u5411\u304D\u3092\u5909\u3048\u308B\u3068\u3001\u9280\u8272\u306E\u7E01\u306B\u6CBF\u3063\u3066\u660E\u308B\u3044\u9762\u304C\u79FB\u308A\u307E\u3059\u3002",color:"#9caebb",kind:"star"},{id:"demo-gift-lavender",title:"\u3010\u30C7\u30E2\u3011\u30E9\u30D9\u30F3\u30C0\u30FC\u306E\u5C0F\u7269\u30B1\u30FC\u30B9",author:"SPOOL\u30C7\u30E2",comment:"\u3084\u308F\u3089\u304B\u306A\u7D2B\u8272\u306E\u7BB1\u306B\u3001\u3075\u305F\u3092\u5C11\u3057\u5F35\u308A\u51FA\u3055\u305B\u3066\u30D7\u30EC\u30BC\u30F3\u30C8\u3089\u3057\u3044\u8F2A\u90ED\u3092\u3064\u3051\u307E\u3057\u305F\u3002",color:"#9c86b8",kind:"gift"},{id:"demo-star-copper",title:"\u3010\u30C7\u30E2\u3011\u9285\u8272\u306E\u661F\u98FE\u308A",author:"SPOOL\u30C7\u30E2",comment:"\u843D\u3061\u7740\u3044\u305F\u9285\u8272\u3092\u9078\u3073\u307E\u3057\u305F\u3002\u6B63\u9762\u304B\u3089\u898B\u308B\u3068\u3001\u4E94\u3064\u306E\u3068\u304C\u3063\u305F\u5148\u304C\u304F\u3063\u304D\u308A\u898B\u3048\u307E\u3059\u3002",color:"#b47c4c",kind:"star"}];function Ov(i){if(i.kind==="tree")return[[new Ks(.12,.12,.5,24),[0,-.7,0],"#8a6345"],...[0,1,2].map(t=>[new jr(.8-t*.18,.8,40),[0,-.35+t*.48,0],i.color])];if(i.kind==="gift")return[[new Ln(1.3,1.1,1.3),[0,0,0],i.color],[new Ln(1.42,.16,1.42),[0,.6,0],i.color],[new Ln(.19,1.25,1.45),[0,.06,0],"#e8c577"],[new Ln(1.45,1.25,.19),[0,.06,0],"#e8c577"]];let e=new Js;for(let t=0;t<10;t++){let n=Math.PI/2+t*Math.PI/5,s=t%2?.43:1,r=Math.cos(n)*s,a=Math.sin(n)*s;t?e.lineTo(r,a):e.moveTo(r,a)}return e.closePath(),[[new aa(e,{depth:.22,bevelEnabled:!0,bevelSegments:2,steps:1,bevelSize:.04,bevelThickness:.04}),[0,0,-.11],i.color]]}function Fv(i){let e=[],t=[],n=[],s=[],r=[],a=[],o=0;for(let[f,g,x]of Ov(i)){let m=f.index?f.toNonIndexed():f,p={};for(let v of["position","normal"]){let w=m.attributes[v],I=new Uint8Array(w.array.buffer,w.array.byteOffset,w.array.byteLength);e.push(I),t.push({buffer:0,byteOffset:o,byteLength:I.length}),o+=I.length;let E={bufferView:t.length-1,componentType:5126,count:w.count,type:"VEC3"};v==="position"&&(m.computeBoundingBox(),E.min=m.boundingBox.min.toArray(),E.max=m.boundingBox.max.toArray()),n.push(E),p[v==="position"?"POSITION":"NORMAL"]=n.length-1}let M=new Oe(x);a.push({pbrMetallicRoughness:{baseColorFactor:[M.r,M.g,M.b,1],metallicFactor:0,roughnessFactor:.65}}),s.push({primitives:[{attributes:p,material:a.length-1}]}),r.push({mesh:s.length-1,translation:g}),m.dispose(),f.dispose()}let c=new Uint8Array(o),l=0;for(let f of e)c.set(f,l),l+=f.length;let h="";for(let f of c)h+=String.fromCharCode(f);let u={asset:{version:"2.0",generator:"SPOOL demo fixtures"},scene:0,scenes:[{nodes:r.map((f,g)=>g)}],nodes:r,meshes:s,materials:a,buffers:[{byteLength:o,uri:"data:application/octet-stream;base64,"+btoa(h)}],bufferViews:t,accessors:n},d=new Blob([JSON.stringify(u)],{type:"model/gltf+json"});return{root:i.id+".gltf",files:[{name:i.id+".gltf",blob:d}],total:d.size}}async function Ap(i,e){let t=document.createElement("canvas");t.width=t.height=720;let n=t.getContext("2d");if(n.fillStyle=e?"#e8e1d4":"#e9eee8",n.fillRect(0,0,720,720),n.fillStyle="#00000015",n.beginPath(),n.ellipse(360,540,155,25,0,0,Math.PI*2),n.fill(),n.fillStyle=i.color,n.strokeStyle="#f1d690",n.lineWidth=18,i.kind==="tree"){n.fillStyle="#8a6345",n.fillRect(338,445,44,95),n.fillStyle=i.color;for(let s=0;s<3;s++){let r=455-s*100,a=170-s*38;n.beginPath(),n.moveTo(360,r-190),n.lineTo(360+a,r+20),n.lineTo(360-a,r+20),n.closePath(),n.fill(),n.strokeStyle="#ffffff20",n.lineWidth=3,n.stroke()}}else if(i.kind==="star"){n.beginPath();for(let s=0;s<10;s++){let r=-Math.PI/2+s*Math.PI/5,a=s%2?90:195,o=360+Math.cos(r)*a,c=345+Math.sin(r)*a;s?n.lineTo(o,c):n.moveTo(o,c)}n.closePath(),n.fill(),n.stroke()}else n.fillRect(210,270,300,265),n.fillStyle="#d88980",n.fillRect(195,245,330,45),n.fillStyle="#edcf86",n.fillRect(336,245,48,290),n.fillRect(210,360,300,40),n.strokeStyle="#edcf86",n.lineWidth=17,n.beginPath(),n.ellipse(316,216,46,24,-.5,0,Math.PI*2),n.ellipse(404,216,46,24,.5,0,Math.PI*2),n.stroke();return n.fillStyle="#284b3b",n.font="bold 22px sans-serif",n.textAlign="center",n.fillText("SPOOL / DEMO",360,70),n.font="19px sans-serif",n.fillText(e?"\u30C7\u30E2\u7528\u30A4\u30E1\u30FC\u30B8 \xB7 \u5B9F\u7269\u5199\u771F\u3067\u306F\u3042\u308A\u307E\u305B\u3093":"\u30E2\u30C7\u30EB\u306E\u30A4\u30E1\u30FC\u30B8",360,640),new Promise(s=>t.toBlob(s,"image/png"))}async function Ta(){return Promise.all(Uv.map(async(i,e)=>({id:i.id,title:i.title,author:i.author,comment:i.comment,createdAt:Date.UTC(2026,10,15,0,0,e),realPhoto:await Ap(i,!0),modelPhoto:await Ap(i,!1),model:Fv(i),isDemo:!0,version:1})))}var mi=i=>document.querySelector(i),ds=(i,e)=>{let t=document.createElement("button");return t.type="button",t.className="secondary",t.textContent=i,t.addEventListener("click",async()=>{t.disabled=!0;try{await e()}catch(n){mi("#admin-error").textContent=n.message}finally{t.disabled=!1}}),t},Ni=i=>{let e=document.createElement("p");return e.textContent=i,e};function qh(i,e,t,n,s={}){let r=document.createElement("dialog");r.className="compare-dialog";let a=document.createElement("h2");a.textContent=i;let o=structuredClone(t||{});(o.assets||o.isDemo)&&(o.visibility="hidden");for(let[p,M]of Object.entries(o))/^(works|visibility)\//.test(p)&&M&&typeof M=="object"&&(M.visibility="hidden");let c=ld(e,o,s),l=Ni("\u8272\u306E\u4ED8\u3044\u305F\u884C\u304C\u5909\u66F4\u7B87\u6240\u3067\u3059\u3002\u4F5C\u54C1\u306F\u975E\u516C\u958B\u3067\u5FA9\u5143\u3057\u307E\u3059\u3002");l.setAttribute("role","status");let h=!1,u,d=!1,f=ds("\u9589\u3058\u308B",()=>{if(h){d&&u.abort();return}r.close()}),g=p=>{let M=typeof p=="string"?{text:p}:p;l.textContent=M.text,M.canCancel===!1&&(d=!1,f.disabled=!0)},x=ds("\u3053\u306E\u5185\u5BB9\u3067\u5FA9\u5143",async()=>{if(confirm("\u6BD4\u8F03\u3057\u305F\u5185\u5BB9\u3067\u5FA9\u5143\u3057\u307E\u3059\u304B\uFF1F")){h=!0,u=new AbortController,d=!!s.cancellable,f.textContent=d?"\u5FA9\u5143\u3092\u4E2D\u65AD":"\u5FA9\u5143\u4E2D\u2026",f.disabled=!d;try{let p=await n(g,u.signal);l.textContent=p?.conflicts?.length?"\u4E00\u90E8\u306E\u9805\u76EE\u306F\u540C\u6642\u66F4\u65B0\u306E\u305F\u3081\u5FA9\u5143\u3057\u3066\u3044\u307E\u305B\u3093\u3002\u5185\u5BB9\u3092\u518D\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002":"\u5FA9\u5143\u3057\u307E\u3057\u305F\u3002",x.hidden=!0}catch(p){throw l.textContent=p.message,p}finally{h=!1,f.disabled=!1,f.textContent="\u9589\u3058\u308B"}}}),m=document.createElement("div");return m.className="dialog-footer",m.append(f,x),r.append(a,c,l,m),document.body.append(r),r.addEventListener("cancel",p=>{h&&(p.preventDefault(),d&&u.abort())}),r.addEventListener("close",()=>{s.dispose?.(),r.remove()},{once:!0}),r.showModal(),r}async function Yh(i){let e=mi("#admin-trash-list"),{items:t}=await Ge("/admin/trash");e.replaceChildren(),t.length||e.append(Ni("\u524A\u9664\u3057\u305F\u4F5C\u54C1\u306F\u3042\u308A\u307E\u305B\u3093\u3002"));let n=await Ta();for(let s of t){let r={...n.find(o=>o.id===s.id),...s},a=document.createElement("article");a.className="admin-work-row",a.append(Ni((r.title||r.id)+" \uFF0F \u4F5C\u8005\uFF1A"+(r.author||"\u672A\u767B\u9332")),Ni(r.deletedAt?new Date(r.deletedAt).toLocaleString("ja-JP"):""),ds("\u975E\u516C\u958B\u3067\u5FA9\u5143",async()=>{await Ge("/admin/trash/"+r.id+"/restore",{method:"POST",body:"{}"}),await i(),await Yh(i)})),e.append(a)}}var Bv={work_create:"\u4F5C\u54C1\u6295\u7A3F",work_edit:"\u4F5C\u54C1\u7DE8\u96C6",work_delete:"\u4F5C\u54C1\u524A\u9664",work_restore:"\u4F5C\u54C1\u5FA9\u5143",history_restore:"\u5C65\u6B74\u304B\u3089\u5FA9\u5143",visibility:"\u516C\u958B\u72B6\u614B\u306E\u5909\u66F4",reaction_settings:"\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u8A2D\u5B9A",event_content:"\u30A4\u30D9\u30F3\u30C8\u5185\u5BB9",backup_create:"\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u4F5C\u6210",backup_restore:"\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u5FA9\u5143",portable_restore:"\u30D5\u30A1\u30A4\u30EB\u304B\u3089\u5FA9\u5143"};async function Cp(i){if(!i?.isDemo||i.assets)return{value:i,urls:[]};let e=(await Ta()).find(r=>r.id===i.id);if(!e)return{value:i,urls:[]};let t="demo-original/"+i.id+"/",n=URL.createObjectURL(e.realPhoto),s=URL.createObjectURL(e.modelPhoto);return{value:{...e,...i,assets:e.model.files.map(r=>r.name),root:e.model.root,uploadPrefix:t},urls:[n,s],resolve:r=>r===t+"real"?n:r===t+"image"?s:null}}async function Rp(i){let{events:e}=await Ge("/admin/audit"),t=mi("#admin-audit-list");t.replaceChildren(),e.length||t.append(Ni("\u5909\u66F4\u5C65\u6B74\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093\u3002"));for(let n of e){let s=document.createElement("details");s.className="audit-row admin-fold";let r=document.createElement("summary");r.textContent=(Bv[n.action]||n.action)+" \uFF0F "+new Date(n.at).toLocaleString("ja-JP"),s.append(r,Ni(n.role+" \uFF0F "+n.actor),Ni(n.details.title||n.target)),n.details.before&&s.append(ds("\u6BD4\u8F03\u30FB\u5FA9\u5143",async()=>{let a=await Ge("/admin/history/"+n.id),o=await Cp(a.current),c=await Cp(a.event.details.before);qh("\u5909\u66F4\u524D\u306E\u5185\u5BB9\u3068\u6BD4\u8F03",o.value,c.value,async()=>{let l=await Ge("/admin/history/"+n.id+"/restore",{method:"POST",body:JSON.stringify({expectedRevision:a.expectedRevision})});return await i(),l},{currentMedia:o.resolve,nextMedia:c.resolve,dispose:()=>[...o.urls,...c.urls].forEach(l=>URL.revokeObjectURL(l))})})),t.append(s)}}async function Gc(i){let e=mi("#admin-backup-list"),{items:t}=await Ge("/admin/backups");e.replaceChildren();for(let n of t){let s=document.createElement("details");s.className="audit-row admin-fold";let r=document.createElement("summary");r.textContent=new Date(n.at).toLocaleString("ja-JP")+" \uFF0F "+n.count+"\u9805\u76EE",s.append(r,ds("\u5185\u5BB9\u3092\u6BD4\u8F03\u30FB\u5FA9\u5143",async()=>{let[a,o]=await Promise.all([Ge("/admin/backups/"+n.id),Ge("/admin/backup-current")]);qh("\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u3092\u5FA9\u5143",o.records,a.records,async()=>{let c=await Ge("/admin/backups/"+n.id+"/restore",{method:"POST",body:JSON.stringify({expected:o.records})});return await i(),c})}),ds("\u30D5\u30A1\u30A4\u30EB\u8FBC\u307F\u3067\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9",()=>xl(n.id)),ds("\u8A18\u9332\u306E\u307F\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9",async()=>{let a=await Ge("/admin/backups/"+n.id),o=URL.createObjectURL(new Blob([JSON.stringify(a,null,2)],{type:"application/json"})),c=document.createElement("a");c.href=o,c.download="spool-backup-"+n.id+".json",c.click(),setTimeout(()=>URL.revokeObjectURL(o),1e3)})),e.append(s)}t.length||e.append(Ni("\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093\u3002"))}function Ip(i){mi("#portable-export").addEventListener("click",()=>xl()),mi("#portable-file").addEventListener("change",async e=>{let t=mi("#portable-progress"),n=e.currentTarget;n.disabled=!0;try{t.textContent="\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u3092\u78BA\u8A8D\u3057\u3066\u3044\u307E\u3059\u2026";let s=await ud(n.files[0]),r=fd(s),a=await Ge("/admin/backup-current");t.textContent=s.manifest.media.length+"\u30D5\u30A1\u30A4\u30EB\u306E\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u3092\u9078\u629E\u3057\u307E\u3057\u305F\u3002\u6BD4\u8F03\u753B\u9762\u3067\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",qh("\u30D5\u30A1\u30A4\u30EB\u304B\u3089\u5FA9\u5143",a.records,s.manifest.records,async(o,c)=>{let l=await dd(s,o,c);return await i(),await Gc(i),t.textContent=l.conflicts?.length?"\u4E00\u90E8\u306E\u9805\u76EE\u306B\u7AF6\u5408\u304C\u3042\u308A\u307E\u3059\u3002\u5FA9\u5143\u7D50\u679C\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002":"\u30D5\u30A1\u30A4\u30EB\u304B\u3089\u5FA9\u5143\u3057\u307E\u3057\u305F\u3002",l},{cancellable:!0,nextMedia:o=>r.url(o),dispose:()=>r.dispose()})}catch(s){t.textContent=s.message}finally{n.disabled=!1,n.value=""}}),mi("#backup-create").addEventListener("click",async e=>{let t=e.currentTarget;t.disabled=!0;try{await Ge("/admin/backups",{method:"POST",body:"{}"}),await Gc(i)}catch(n){mi("#admin-error").textContent=n.message}finally{t.disabled=!1}})}var lr;function kv(){return lr||(lr=new Promise((i,e)=>{let t=indexedDB.open("spool-editor-drafts",1);t.onupgradeneeded=()=>t.result.createObjectStore("drafts"),t.onsuccess=()=>{let n=t.result;n.onversionchange=()=>{n.close(),lr=null},i(n)},t.onerror=()=>e(t.error),t.onblocked=()=>e(Error("\u5225\u306E\u30BF\u30D6\u3092\u9589\u3058\u3066\u304B\u3089\u518D\u8A66\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002"))}).catch(i=>{throw lr=null,i}),lr)}async function Wc(i,e,t){let n=await kv();return new Promise((s,r)=>{let a=n.transaction("drafts",i==="get"?"readonly":"readwrite"),o=a.objectStore("drafts"),c=i==="get"?o.get(e):i==="delete"?o.delete(e):o.put(t,e);a.oncomplete=()=>s(c.result),a.onerror=a.onabort=()=>r(a.error||Error("\u4E0B\u66F8\u304D\u306E\u4FDD\u5B58\u51E6\u7406\u3092\u5B8C\u4E86\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002"))})}var zv=()=>Ie.user?.id||"local";function Xc(i,{key:e,extra:t,restoreExtra:n}={}){let s="",r=!1,a,o=Promise.resolve(),c=0,l=!1,h=!1,u=!1,d=()=>zv()+":"+i.id+":"+(e?.()||"new"),f=()=>({values:[...i.elements].filter(y=>y.id&&!["button","submit","file"].includes(y.type)).map(y=>({id:y.id,value:y.type==="checkbox"?y.checked:y.value})),files:[...i.querySelectorAll("input[type=file]")].map(y=>({id:y.id,files:[...y.files]})),extra:t?.()}),g=()=>{let y=f();return JSON.stringify({...y,files:y.files.map(R=>({id:R.id,files:R.files.map(L=>[L.name,L.size,L.lastModified])}))})},x=document.createElement("p");x.className="draft-status",x.setAttribute("role","status");let m=document.createElement("div");m.className="draft-tools";let p=document.createElement("button");p.type="button",p.className="secondary",p.textContent="\u4E0B\u66F8\u304D\u3092\u5FA9\u5143",p.hidden=!0;let M=document.createElement("button");M.type="button",M.className="secondary",M.textContent="\u4E0B\u66F8\u304D\u3092\u524A\u9664",M.hidden=!0,m.append(p,M,x),i.prepend(m);let v=(y,R)=>y===c&&R===d(),w=y=>o=o.catch(()=>{}).then(y);function I(){p.disabled=M.disabled=h||i.dataset.editPhase==="saving"}i.addEventListener("editstate",I);function E(y){u=!0,x.textContent=y,i.dataset.editPhase!=="saving"&&ut(i,"error",y)}function P(y=!1){let R=c,L=d(),k=f();return w(async()=>{if(!(!y&&!v(R,L)))try{if(await Wc("put",L,k),!v(R,L))return;u=!1,x.textContent="\u4E0B\u66F8\u304D\u3092\u3053\u306E\u30D6\u30E9\u30A6\u30B6\u30FC\u306B\u4FDD\u5B58\u3057\u307E\u3057\u305F",i.dataset.editPhase!=="saving"&&ut(i,"draft"),p.hidden=M.hidden=!1}catch{v(R,L)&&E("\u4E0B\u66F8\u304D\u3092\u4FDD\u5B58\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u5165\u529B\u5185\u5BB9\u3092\u30B3\u30D4\u30FC\u3057\u3066\u304B\u3089\u9589\u3058\u3066\u304F\u3060\u3055\u3044\u3002")}})}function O(y,R,{applied:L=!1}={}){return w(async()=>{let k=!1;try{await Wc("delete",R),u=!1}catch{k=!0}if(v(y,R)){if(k){L?(x.textContent="\u4FDD\u5B58\u306F\u5B8C\u4E86\u3057\u307E\u3057\u305F\u304C\u3001\u4E0B\u66F8\u304D\u3092\u524A\u9664\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002",ut(i,"applied")):E("\u4E0B\u66F8\u304D\u3092\u524A\u9664\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u518D\u8A66\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002");return}p.hidden=M.hidden=!0,x.textContent="",(L||i.dataset.editPhase!=="saving")&&ut(i,L?"applied":r?"editing":"clean")}})}function S(){if(l)return;let y=++c,R=d();r=g()!==s,clearTimeout(a),r?(ut(i,"editing"),x.textContent="\u672A\u4FDD\u5B58\u306E\u5909\u66F4\u304C\u3042\u308A\u307E\u3059",a=setTimeout(()=>P(),400)):(ut(i,"clean"),x.textContent="",O(y,R))}for(let y of["input","change","draftchange"])i.addEventListener(y,S);return p.addEventListener("click",async()=>{if(h||i.dataset.editPhase==="saving"||r&&!confirm("\u73FE\u5728\u306E\u5165\u529B\u3092\u4E0B\u66F8\u304D\u3067\u7F6E\u304D\u63DB\u3048\u307E\u3059\u304B\uFF1F"))return;h=!0,p.disabled=M.disabled=!0,clearTimeout(a);let y=++c,R=d();try{await o.catch(()=>{});let L=await Wc("get",R);if(!v(y,R)||i.dataset.editPhase==="saving")return;if(!L){p.hidden=M.hidden=!0,x.textContent="\u4FDD\u5B58\u3055\u308C\u305F\u4E0B\u66F8\u304D\u306F\u3042\u308A\u307E\u305B\u3093\u3002";return}l=!0;for(let k of L.values){let z=document.getElementById(k.id);z&&i.contains(z)&&(z.type==="checkbox"?z.checked=k.value:z.value=k.value)}for(let k of L.files){let z=document.getElementById(k.id);if(!z||!i.contains(z))continue;let G=new DataTransfer;k.files.forEach(X=>G.items.add(X)),z.files=G.files,z.dispatchEvent(new Event("change",{bubbles:!0}))}n?.(L.extra),l=!1,S(),i.dispatchEvent(new Event("draftrestored")),x.textContent="\u4E0B\u66F8\u304D\u3092\u5FA9\u5143\u3057\u307E\u3057\u305F\u3002\u6DFB\u4ED8\u30D5\u30A1\u30A4\u30EB\u3068\u30D7\u30EC\u30D3\u30E5\u30FC\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002"}catch{v(y,R)&&E("\u4E0B\u66F8\u304D\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u518D\u8A66\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002")}finally{l=!1,h=!1,I()}}),M.addEventListener("click",async()=>{if(h||i.dataset.editPhase==="saving"||!confirm("\u4FDD\u5B58\u3057\u305F\u4E0B\u66F8\u304D\u3092\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F"))return;h=!0,p.disabled=M.disabled=!0,clearTimeout(a);let y=++c,R=d();try{await O(y,R),v(y,R)&&!u&&(x.textContent="\u4E0B\u66F8\u304D\u3092\u524A\u9664\u3057\u307E\u3057\u305F")}finally{h=!1,I()}}),{get dirty(){return r},async reset(){let y=++c,R=d();clearTimeout(a),s=g(),r=!1,x.textContent="",ut(i,"clean");try{await o.catch(()=>{});let L=await Wc("get",R);if(!v(y,R))return;p.hidden=M.hidden=!L,L&&(x.textContent="\u4FDD\u5B58\u3055\u308C\u305F\u4E0B\u66F8\u304D\u304C\u3042\u308A\u307E\u3059")}catch{}},async clear(){let y=++c,R=d();clearTimeout(a),r=!1,s=g(),await O(y,R,{applied:!0})},confirmClose(){return r?confirm(u?"\u4E0B\u66F8\u304D\u3092\u4FDD\u5B58\u3067\u304D\u3066\u3044\u307E\u305B\u3093\u3002\u5165\u529B\u5185\u5BB9\u304C\u5931\u308F\u308C\u308B\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059\u3002\u3053\u306E\u307E\u307E\u9589\u3058\u307E\u3059\u304B\uFF1F":"\u672A\u4FDD\u5B58\u306E\u5909\u66F4\u304C\u3042\u308A\u307E\u3059\u3002\u4E0B\u66F8\u304D\u3092\u6B8B\u3057\u3066\u9589\u3058\u307E\u3059\u304B\uFF1F")?(clearTimeout(a),P(!0),!0):!1:!0}}}var Pp=new Set;function qc(i){return Pp.add(i),i}window.addEventListener("beforeunload",i=>{[...Pp].some(e=>e.dirty)&&(i.preventDefault(),i.returnValue="")});var Aa=null,st=null,hr=null,Ui,Jn=null,Dp,Vv={award1Color:"#f7e6b9",award2Color:"#f4ded8",award3Color:"#deefdf"};function Yc(){return Object.fromEntries(Qn.map(([i,,e,t])=>{let n=document.querySelector(e);return[i,t==="color"?Vv[i]:t==="date"?n?.getAttribute("datetime")||"2026-12-13":t==="alt"?n?.getAttribute("alt")||"":t==="lines"?[...n.children].map(s=>s.textContent).join(`
`):n?.textContent||""]}))}function Ca(i){if(Array.isArray(i?.awards))return i.awards;let e={...Aa,...i?.fields};return[1,2,3].map(t=>({id:"award-"+t,name:e["award"+t+"Name"],lead:e["award"+t+"Lead"]||"",prize:e["award"+t+"Prize"]||"",note:e["award"+t+"Note"]||"",color:e["award"+t+"Color"],featured:t===1}))}function Op(i){document.querySelector(".event-award-grid").replaceChildren(...i.map(t=>{let n=document.createElement("div");n.className="event-award-entry"+(t.featured?" is-featured":""),n.dataset.awardId=t.id,n.style.background="linear-gradient(135deg,#ffffff77,transparent),"+t.color,n.style.borderColor="color-mix(in srgb,"+t.color+",#173f32 28%)";let s=document.createElement("dt");s.textContent=t.name;let r=document.createElement("dd");if(t.lead){let o=document.createElement("span");o.className="event-award-lead",o.textContent=t.lead,r.append(o)}let a=document.createElement("strong");if(a.textContent=t.prize,r.append(a),t.note){let o=document.createElement("small");o.textContent=t.note,r.append(o)}return n.append(s,r),n})),document.querySelector("#eventAwards").hidden=!i.length,document.querySelector("[data-event-jump=eventAwards]").hidden=!i.length}const defaultPoster=document.querySelector("[data-event-banner]");
const defaultPosterSrc=defaultPoster.src;
const defaultPosterSet=defaultPoster.srcset;
function displayPoster(url){
  const target=new URL(url,document.baseURI).href;
  const isDefault=target===defaultPosterSrc;
  if(!isDefault && defaultPoster.hasAttribute("srcset"))defaultPoster.removeAttribute("srcset");
  if(isDefault && defaultPoster.srcset!==defaultPosterSet)defaultPoster.srcset=defaultPosterSet;
  if(defaultPoster.src!==target)defaultPoster.src=target;
  if(isDefault){defaultPoster.width=2172;defaultPoster.height=724;}
  else{defaultPoster.removeAttribute("width");defaultPoster.removeAttribute("height");}
}
function dr(i){Aa||=Yc();let e={...Aa,...i?.fields};for(let[t,,n,s,,r]of Qn){if(!(t in e)||r==="\u5404\u8CDE"&&Array.isArray(i?.awards))continue;let a=document.querySelector(n),o=e[t];if(a)if(s==="color")a.style.background="linear-gradient(135deg,#ffffff70,transparent),"+o;else if(s==="alt")a.setAttribute("alt",o);else if(s==="lines")a.replaceChildren(...o.split(`
`).filter(Boolean).map(c=>{let l=document.createElement("span");return l.textContent=c,l}));else if(s==="date"){a.dateTime=o;let[c,l,h]=o.split("-").map(Number),u=new Date(Date.UTC(c,l-1,h));a.textContent=c+"\u5E74"+l+"\u6708"+h+"\u65E5\uFF08"+["\u65E5","\u6708","\u706B","\u6C34","\u6728","\u91D1","\u571F"][u.getUTCDay()]+"\uFF09"}else a.textContent=o}Op(Ca(i));displayPoster(i?.poster?"/api/event/poster?v="+encodeURIComponent(i.poster):defaultPosterSrc);Ie.content=i||{fields:{},revision:""}}function Kh(i){let e=document.createElement("details");e.className="award-edit-card",e.open=!1,e.dataset.awardId=i.id;let t=document.createElement("summary"),n=document.createElement("span");n.textContent=i.name,t.append(Wa(e,i.name),n),e.append(t);for(let[o,c,l]of[["name","\u8CDE\u540D",40],["lead","\u8AAC\u660E\uFF08\u4EFB\u610F\uFF09",80],["prize","\u7279\u5178\u30FB\u5185\u5BB9",80],["note","\u88DC\u8DB3\uFF08\u4EFB\u610F\uFF09",300],["color","\u80CC\u666F\u8272",7]]){let h=document.createElement("label");h.className="content-field";let u=document.createElement("span");u.textContent=c;let d=document.createElement(o==="note"?"textarea":"input");d.tagName==="INPUT"&&(d.type=o==="color"?"color":"text"),d.dataset.awardKey=o,d.value=i[o]||"",d.maxLength=l,d.required=o==="name"||o==="color",d.setAttribute("aria-label",c),o==="name"&&d.addEventListener("input",()=>n.textContent=d.value||"\u65B0\u3057\u3044\u8CDE"),h.append(u,d),e.append(h)}let s=document.createElement("label");s.className="award-featured";let r=document.createElement("input");r.type="checkbox",r.dataset.awardKey="featured",r.checked=!!i.featured,s.append(r,document.createTextNode("\u7279\u5178\u306E\u6587\u5B57\u3092\u5927\u304D\u304F\u5F37\u8ABF\u3059\u308B")),e.append(s);let a=document.createElement("div");a.className="award-editor-actions";for(let[o,c]of[["\u3053\u306E\u8CDE\u3092\u524A\u9664",()=>e.remove()]]){let l=document.createElement("button");l.type="button",l.className="secondary",l.textContent=o,l.addEventListener("click",c),a.append(l)}return e.append(a),e}function Fp(){Aa||=Yc();let i=document.querySelector("#event-content-form"),e=i.querySelector("#event-content-fields");e.replaceChildren();for(let t of[...new Set(Qn.map(n=>n[5]))]){let n=document.createElement("details");n.className="content-group",n.open=!1;let s=document.createElement("summary");if(s.textContent=t==="\u6848\u5185"?"\u57FA\u672C\u60C5\u5831":t,n.append(s),t==="\u5404\u8CDE"){let r=document.createElement("div");r.id="award-editor-list",r.replaceChildren(...Ca(Ie.content).map(Kh));let a=document.createElement("button");a.type="button",a.className="secondary",a.textContent="\u8CDE\u3092\u8FFD\u52A0",a.id="award-add",a.addEventListener("click",()=>{if(r.children.length>=20){i.querySelector("#event-content-error").textContent="\u8CDE\u306F\u6700\u592720\u4EF6\u3067\u3059\u3002";return}r.append(Kh({id:"award-"+crypto.randomUUID(),name:"\u65B0\u3057\u3044\u8CDE",lead:"",prize:"\u8FD1\u65E5\u516C\u958B",note:"",color:"#e7eee1",featured:!1}))}),n.append(r,a)}else for(let[r,a,,o,c]of Qn.filter(l=>l[5]===t)){let l=document.createElement("label");l.className="content-field";let h=document.createElement("span");h.textContent=a;let u=document.createElement(["textarea","lines"].includes(o)?"textarea":"input");u.tagName==="INPUT"&&(u.type=o==="alt"?"text":o),u.dataset.contentKey=r,u.value=Ie.content?.fields?.[r]??Aa[r],u.required=["date","color"].includes(o),u.maxLength=c,u.setAttribute("aria-label",a),l.append(h,u),n.append(l)}e.append(n)}i.querySelector("#event-poster-file").value="",i.querySelector("#event-content-error").textContent="",Ui?.reset()}function Zh(){let i=document.querySelector("#event-content-form"),e=Object.fromEntries([...i.querySelectorAll("[data-content-key]")].map(n=>[n.dataset.contentKey,n.value.trim()])),t=[...i.querySelectorAll(".award-edit-card")].map(n=>({id:n.dataset.awardId,...Object.fromEntries([...n.querySelectorAll("[data-award-key]")].map(s=>[s.dataset.awardKey,s.type==="checkbox"?s.checked:s.value.trim()]))}));return{fields:e,awards:t,revision:Ie.content?.revision||""}}function Hv(){if(!Jn)return null;if(Jn.award){let i=[...document.querySelectorAll(".event-award-entry")].find(e=>e.dataset.awardId===Jn.award);return i?.querySelector({name:"dt",lead:".event-award-lead",prize:"dd>strong",note:"small"}[Jn.key]||"dt")||i}return Jn.poster?document.querySelector("[data-event-banner]"):document.querySelector(Qn.find(i=>i[0]===Jn.key)?.[2]||"#main")}function Jh(i=!0){let e=Hv();if(e){for(let t=e.parentElement;t;t=t.parentElement)t.tagName==="DETAILS"&&(t.open=!0);document.querySelectorAll("[data-preview-changed]").forEach(t=>t.removeAttribute("data-preview-changed")),e.setAttribute("data-preview-changed",""),clearTimeout(Dp),Dp=setTimeout(()=>e.removeAttribute("data-preview-changed"),3500),i&&e.scrollIntoView({block:"center",behavior:"smooth"})}}function ur(){if(!st||!document.querySelector("#event-content-form").checkValidity())return;let e=Zh(),t=Ie.content;dr({...e,poster:t?.poster}),Ie.content=t;let n=document.querySelector("#event-poster-file").files[0];n?(n!==st.posterFile&&(st.posterURL&&URL.revokeObjectURL(st.posterURL),st.posterFile=n,st.posterURL=URL.createObjectURL(n)),displayPoster(st.posterURL)):displayPoster(st.savedPoster),document.querySelector("#live-editor-status").textContent="\u5909\u66F4\u7B87\u6240\u3092\u30D7\u30EC\u30D3\u30E5\u30FC\u3057\u3066\u3044\u307E\u3059",Jn&&!document.body.classList.contains("preview-only")&&Jh(!1)}function Gv(i=!0){if(!st||(clearTimeout(hr),!Ui?.confirmClose()))return;let e=st;st=null,e.anchor.replaceWith(e.form),document.body.classList.remove("live-editing","preview-only"),document.querySelector("#live-editor").hidden=!0,document.querySelector("#start-live-edit").hidden=!1,i&&(dr(e.saved),displayPoster(e.savedPoster)),e.posterURL&&URL.revokeObjectURL(e.posterURL),window.scrollTo(0,e.originalScroll),document.querySelectorAll("[data-live-selected]").forEach(t=>t.removeAttribute("data-live-selected"))}function Np(){if(st||!document.querySelector("#event-content-form").reportValidity())return;let i=document.querySelector("#event-content-form"),e=document.createComment("event editor form");i.before(e);let t=Ie.content;st={form:i,anchor:e,originalScroll:scrollY,previewScroll:scrollY,editScroll:scrollY,editorScroll:0,saved:{...t,fields:{...Yc()},awards:Ca(t).map(n=>({...n}))},savedPoster:document.querySelector("[data-event-banner]").src,posterURL:null,posterFile:null},Op(Ca(t)),ut(i,i.dataset.editPhase||"clean"),document.querySelector("#live-editor-cancel").textContent="\u53D6\u308A\u6D88\u3057\u3066\u7D42\u4E86",document.querySelector("#admin-panel").close(),document.querySelector("#live-editor-body").append(i),document.querySelector("#start-live-edit").hidden=!0,document.body.classList.add("live-editing","preview-only"),document.querySelector("#live-editor-toggle").textContent="\u7DE8\u96C6\u306B\u623B\u308B",document.querySelector("#live-editor").hidden=!1,ur(),requestAnimationFrame(()=>Jh()),document.querySelector("#live-editor-status").textContent="\u5185\u5BB9\u3092\u78BA\u8A8D\u3057\u3001\u300C\u4FDD\u5B58\u3057\u3066\u53CD\u6620\u300D\u3092\u62BC\u3057\u3066\u304F\u3060\u3055\u3044\u3002"}function Up(i,e){if(i){document.body.classList.remove("preview-only"),document.querySelector("#live-editor-toggle").textContent="\u5168\u753B\u9762\u3067\u30D7\u30EC\u30D3\u30E5\u30FC";for(let t=i;t;t=t.parentElement)t.tagName==="DETAILS"&&(t.open=!0);document.querySelectorAll("[data-live-selected]").forEach(t=>t.removeAttribute("data-live-selected")),e?.setAttribute("data-live-selected",""),i.focus({preventScroll:!0}),i.scrollIntoView({block:"center",behavior:"smooth"})}}function Bp(i){let e=document.querySelector("#event-content-form");new ResizeObserver(()=>document.body.style.setProperty("--preview-footer-height",document.querySelector("#live-editor").getBoundingClientRect().height+"px")).observe(document.querySelector("#live-editor")),Ui=qc(Xc(e,{extra:()=>Zh(),restoreExtra:t=>{if(t){for(let n of e.querySelectorAll("[data-content-key]"))n.value=t.fields?.[n.dataset.contentKey]??n.value;e.querySelector("#award-editor-list").replaceChildren(...(t.awards||[]).map(Kh))}}})),e.addEventListener("draftrestored",()=>ur()),document.querySelector("#admin-close").addEventListener("click",t=>{Ui.confirmClose()||t.stopImmediatePropagation()},!0),document.querySelector("#admin-panel").addEventListener("cancel",t=>{Ui.confirmClose()||t.preventDefault()}),document.querySelector("#live-editor-toggle").addEventListener("click",()=>{if(!document.body.classList.contains("preview-only")&&!e.reportValidity())return;st&&(document.body.classList.contains("preview-only")?st.previewScroll=scrollY:(st.editScroll=scrollY,st.editorScroll=document.querySelector("#live-editor-body").scrollTop));let t=document.body.classList.toggle("preview-only");document.querySelector("#live-editor-toggle").textContent=t?"\u7DE8\u96C6\u306B\u623B\u308B":"\u5168\u753B\u9762\u3067\u30D7\u30EC\u30D3\u30E5\u30FC",t&&ur(),st&&(window.scrollTo(0,t?st.previewScroll:st.editScroll),document.querySelector("#live-editor-body").scrollTop=st.editorScroll,t&&requestAnimationFrame(()=>Jh()))}),e.addEventListener("input",t=>{let n=t.target;n.dataset?.contentKey?Jn={key:n.dataset.contentKey}:n.closest?.(".award-edit-card")?Jn={award:n.closest(".award-edit-card").dataset.awardId,key:n.dataset.awardKey}:n.id==="event-poster-file"&&(Jn={poster:!0}),st&&(document.querySelector("#live-editor-cancel").textContent="\u53D6\u308A\u6D88\u3057\u3066\u7D42\u4E86",document.querySelector("#live-editor-status").textContent="\u672A\u4FDD\u5B58\u306E\u5909\u66F4\u304C\u3042\u308A\u307E\u3059",clearTimeout(hr),hr=setTimeout(ur,120))}),e.addEventListener("click",t=>{if(t.target.closest(".award-editor-actions,#award-add")){if(e.dispatchEvent(new Event("draftchange")),!st)return;clearTimeout(hr),hr=setTimeout(ur,0)}}),document.querySelector("#start-live-edit").addEventListener("click",Np);for(let t of["live-editor-close","live-editor-cancel"])document.querySelector("#"+t).addEventListener("click",()=>Gv(!0));document.addEventListener("click",t=>{if(!st||document.body.classList.contains("preview-only")||t.target.closest("#live-editor"))return;let n=t.target.closest(".event-award-entry");if(n){t.preventDefault(),t.stopPropagation();let s=[...e.querySelectorAll(".award-edit-card")].find(a=>a.dataset.awardId===n.dataset.awardId),r=t.target.closest("dt")?"name":t.target.closest(".event-award-lead")?"lead":t.target.closest("dd>strong")?"prize":t.target.closest("small")?"note":"name";Up(s?.querySelector("[data-award-key="+r+"]"),n);return}for(let[s,,r]of Qn.filter(a=>a[5]!=="\u5404\u8CDE")){let a=document.querySelector(r);if(a&&(a===t.target||a.contains(t.target))){t.preventDefault(),t.stopPropagation(),Up(s==="posterAlt"?e.querySelector("#event-poster-file"):e.querySelector("[data-content-key="+s+"]"),a);return}}},!0),e.addEventListener("submit",async t=>{if(t.preventDefault(),clearTimeout(hr),!st){Np();return}ur();let n=[t.submitter,document.querySelector("#event-content-save"),document.querySelector("#live-editor-save"),document.querySelector("#live-editor-close"),document.querySelector("#live-editor-cancel"),document.querySelector("#live-editor-toggle")].filter(Boolean);n.forEach(s=>s.disabled=!0),e.inert=!0,e.setAttribute("aria-busy","true"),ut(e,"saving");try{let s=Zh(),r=e.querySelector("#event-poster-file").files[0],a=JSON.stringify(s);if(r){let c=new FormData;c.set("metadata",a),c.set("poster",r),a=c}let o=await Ge("/settings/content",{method:"PUT",body:a});dr(o),e.querySelector("#event-poster-file").value="",st&&(st.posterURL&&URL.revokeObjectURL(st.posterURL),st.posterURL=null,st.posterFile=null,st.saved={...o,fields:{...Yc()},awards:Ca(o).map(c=>({...c}))},st.savedPoster=document.querySelector("[data-event-banner]").src,document.querySelector("#live-editor-status").textContent="\u4FDD\u5B58\u3057\u307E\u3057\u305F",document.querySelector("#live-editor-feedback").textContent="\u4FDD\u5B58\u3057\u307E\u3057\u305F",document.querySelector("#live-editor-cancel").textContent="\u7DE8\u96C6\u3092\u7D42\u4E86"),await Ui.clear(),i("\u30A4\u30D9\u30F3\u30C8\u5185\u5BB9\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F\u3002")}catch(s){e.querySelector("#event-content-error").textContent=s.message,ut(e,"error",s.message)}finally{e.inert=!1,e.removeAttribute("aria-busy"),n.forEach(s=>s.disabled=!1)}})}function kp(){return!Ui||Ui.confirmClose()}var Qh="spool-event-reactions-v2",Wv="spool-event-reactions-v1",Xv=5,$h=3e3,fs=[{id:"like",icon:"\u2764\uFE0F",label:"\u3044\u3044\u306D",enabled:!0},{id:"idea",icon:"\u{1F4A1}",label:"\u30A2\u30A4\u30C7\u30A2\u304C\u7D20\u6575",enabled:!0},{id:"make",icon:"\u{1F381}",label:"\u307B\u3057\u3044\uFF01",enabled:!0}],gi={},Jc={},jh=new Map;
const reactionQueue=createReactionQueue({
 limit:Xv,state:eu,
 send:(work,type)=>Ge("/works/"+work+"/reactions",{method:"POST",body:JSON.stringify({type})}),
 acknowledge:(work,result)=>{Jc[work]=result.counts;gi[work]={until:result.until,batch:result.batch}},
 changed:Zc,
 failed:(work,error)=>{if(error.status===429)gi[work]={until:Date.now()+$h};Xt(error.message)}
});
window.addEventListener("beforeunload",event=>{if(reactionQueue.saving()){event.preventDefault();event.returnValue=""}});
function reactionDisabled(work){return Ie.mode==="shared"?reactionQueue.full(work):Kc(work)>0}
function Ia(){if(Ie.mode!=="shared")try{let i=localStorage.getItem(Qh);if(i!==null){let e=JSON.parse(i);gi=e&&typeof e=="object"&&!Array.isArray(e)?e:{}}else{let e=JSON.parse(localStorage.getItem(Wv)||"{}");gi={};for(let[t,n]of Object.entries(e||{}))Array.isArray(n)&&(gi[t]={counts:Object.fromEntries(fs.map(s=>[s.id,n.includes(s.id)?1:0])),batch:0,until:0})}}catch{gi={}}}function eu(i){let e=gi[i];return e&&typeof e=="object"&&!Array.isArray(e)?e:{counts:{},batch:0,until:0}}function fr(i,e){let t=Ie.mode==="shared"?Jc[i]?.[e]:eu(i).counts?.[e];return (Number.isSafeInteger(t)&&t>=0?t:0)+(Ie.mode==="shared"?reactionQueue.pending(i,e):0)}function tu(i){return fs.filter(e=>e.enabled).reduce((e,t)=>e+fr(i,t.id),0)}function Kc(i){return Math.max(0,Math.min($h,(eu(i).until||0)-Date.now()))}function pr(){document.querySelectorAll("[data-reaction-work]").forEach(i=>{let e=i.dataset.reactionWork,t=i.dataset.reaction,n=fs.find(r=>r.id===t);if(!n)return;let s=fr(e,t);i.setAttribute("aria-label",n.label+" "+s),i.querySelector(".reaction-count").textContent=String(s),i.tagName==="BUTTON"&&(i.disabled=reactionDisabled(e),i.dataset.reacted=String(s>0))}),document.querySelectorAll("[data-reaction-status]").forEach(i=>{let e=i.dataset.reactionStatus,t=Kc(e);t>0&&!jh.has(e)&&jh.set(e,setTimeout(()=>{jh.delete(e),Ia(),pr()},t+10))})}function Zc(){pr(),window.dispatchEvent(new Event("reactionschange"))}async function nu(){Ie.mode==="shared"?(fs=Ie.reactions.types,Jc=(await Ge("/reactions")).counts):Ia()}async function iu(){if(Ie.mode==="shared"){let[i,e]=await Promise.all([Ge("/session"),Ge("/reactions")]),t=JSON.stringify(fs)!==JSON.stringify(i.reactions.types);syncEventAdmin(i),Ie.reactions=i.reactions,Jc=e.counts,t&&su(i.reactions.types),Zc()}}function su(i){fs=i,window.dispatchEvent(new Event("reactiontypeschange"))}Ia();function jc(i,e,t=!1){let n=document.createElement("div");n.className=t?"work-reactions reaction-summary":"work-reactions",n.setAttribute("role","group"),n.setAttribute("aria-label","\u4F5C\u54C1\u3078\u306E\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3");for(let s of fs.filter(r=>r.enabled)){let r=document.createElement(t?"span":"button");t||(r.type="button"),r.className=t?"reaction-total":"reaction-button",r.dataset.reactionWork=i,r.dataset.reaction=s.id,r.setAttribute("aria-label",s.label+" "+fr(i,s.id)),t||(r.disabled=reactionDisabled(i),r.dataset.reacted=String(fr(i,s.id)>0));let a=document.createElement("span");a.textContent=s.icon,a.setAttribute("aria-hidden","true");let o=document.createElement("span");o.textContent=s.label;let c=document.createElement("span");c.className="reaction-count",c.textContent=String(fr(i,s.id)),t?r.append(a,c):r.append(a,o,c),t||r.addEventListener("click",async()=>{if(Ia(),reactionDisabled(i)){pr();return}if(Ie.mode==="shared"){reactionQueue.tap(i,s.id);return}let l=eu(i),h=l.until?0:l.batch||0,u={...l.counts||{},[s.id]:fr(i,s.id)+1},d={...gi,[i]:{counts:u,batch:h+1,until:h+1===Xv?Date.now()+$h:0}};try{localStorage.setItem(Qh,JSON.stringify(d)),gi=d,Zc()}catch{e("\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u3092\u4FDD\u5B58\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002")}}),n.append(r)}if(!t){let s=document.createElement("p");s.className="reaction-status",s.dataset.reactionStatus=i,n.append(s),queueMicrotask(pr)}return n}window.addEventListener("storage",i=>{(i.key===Qh||i.key===null)&&(Ia(),Zc())});var ru="#edf1e7";function ps(i){return/^#[0-9a-f]{6}$/i.test(i||"")?i.toLowerCase():ru}function zp(i){let e=i.querySelector("#background-picker"),t=i.querySelector("#background-hex"),n=["r","g","b"].map(c=>i.querySelector("#background-"+c)),s=i.querySelector("#background-swatch"),r=ru,a=0;function o(c,l){a++,r=ps(c),e.value=r,l!==t&&(t.value=r);let h=[1,3,5].map(u=>parseInt(r.slice(u,u+2),16));n.forEach((u,d)=>{l!==u&&(u.value=h[d]),u.setCustomValidity("")}),t.setCustomValidity(""),i.dispatchEvent(new CustomEvent("backgroundchange",{detail:r})),s.style.backgroundColor=r,s.textContent=r.toUpperCase(),s.style.color=h[0]*.299+h[1]*.587+h[2]*.114>150?"#173f32":"#ffffff"}return e.addEventListener("input",()=>o(e.value)),t.addEventListener("input",()=>{let c=t.value.trim().replace(/^#?/,"#");/^#[0-9a-f]{6}$/i.test(c)?o(c,t):t.setCustomValidity("16\u9032\u6570\u306F6\u6841\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\uFF08\u4F8B\uFF1A#123ABC\uFF09\u3002")}),t.addEventListener("change",()=>{t.validity.valid&&o(r)}),n.forEach(c=>c.addEventListener("input",()=>{n.every(l=>l.value!==""&&l.validity.valid)&&o("#"+n.map(l=>Number(l.value).toString(16).padStart(2,"0")).join(""))})),i.addEventListener("reset",()=>{let c=a;queueMicrotask(()=>{a===c&&o(ru)})}),o(r),()=>r}function au(i,e){if(e===Sh)return console.warn("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles."),i;if(e===rr||e===Sa){let t=i.getIndex();if(t===null){let a=[],o=i.getAttribute("position");if(o!==void 0){for(let c=0;c<o.count;c++)a.push(c);i.setIndex(a),t=i.getIndex()}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible."),i}let n=t.count-2,s=[];if(e===rr)for(let a=1;a<=n;a++)s.push(t.getX(0)),s.push(t.getX(a)),s.push(t.getX(a+1));else for(let a=0;a<n;a++)a%2===0?(s.push(t.getX(a)),s.push(t.getX(a+1)),s.push(t.getX(a+2))):(s.push(t.getX(a+2)),s.push(t.getX(a+1)),s.push(t.getX(a)));s.length/3!==n&&console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles.");let r=i.clone();return r.setIndex(s),r.clearGroups(),r}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:",e),i}var $c=class extends qn{constructor(e){super(e),this.dracoLoader=null,this.ktx2Loader=null,this.meshoptDecoder=null,this.pluginCallbacks=[],this.register(function(t){return new fu(t)}),this.register(function(t){return new pu(t)}),this.register(function(t){return new Mu(t)}),this.register(function(t){return new wu(t)}),this.register(function(t){return new Eu(t)}),this.register(function(t){return new gu(t)}),this.register(function(t){return new xu(t)}),this.register(function(t){return new _u(t)}),this.register(function(t){return new yu(t)}),this.register(function(t){return new du(t)}),this.register(function(t){return new vu(t)}),this.register(function(t){return new mu(t)}),this.register(function(t){return new Su(t)}),this.register(function(t){return new bu(t)}),this.register(function(t){return new hu(t)}),this.register(function(t){return new Tu(t)}),this.register(function(t){return new Au(t)})}load(e,t,n,s){let r=this,a;if(this.resourcePath!=="")a=this.resourcePath;else if(this.path!==""){let l=ui.extractUrlBase(e);a=ui.resolveURL(l,this.path)}else a=ui.extractUrlBase(e);this.manager.itemStart(e);let o=function(l){s?s(l):console.error(l),r.manager.itemError(e),r.manager.itemEnd(e)},c=new Qs(this.manager);c.setPath(this.path),c.setResponseType("arraybuffer"),c.setRequestHeader(this.requestHeader),c.setWithCredentials(this.withCredentials),c.load(e,function(l){try{r.parse(l,a,function(h){t(h),r.manager.itemEnd(e)},o)}catch(h){o(h)}},n,o)}setDRACOLoader(e){return this.dracoLoader=e,this}setKTX2Loader(e){return this.ktx2Loader=e,this}setMeshoptDecoder(e){return this.meshoptDecoder=e,this}register(e){return this.pluginCallbacks.indexOf(e)===-1&&this.pluginCallbacks.push(e),this}unregister(e){return this.pluginCallbacks.indexOf(e)!==-1&&this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(e),1),this}parse(e,t,n,s){let r,a={},o={},c=new TextDecoder;if(typeof e=="string")r=JSON.parse(e);else if(e instanceof ArrayBuffer)if(c.decode(new Uint8Array(e,0,4))===Xp){try{a[$e.KHR_BINARY_GLTF]=new Cu(e)}catch(u){s&&s(u);return}r=JSON.parse(a[$e.KHR_BINARY_GLTF].content)}else r=JSON.parse(c.decode(e));else r=e;if(r.asset===void 0||r.asset.version[0]<2){s&&s(new Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));return}let l=new Uu(r,{path:t||this.resourcePath||"",crossOrigin:this.crossOrigin,requestHeader:this.requestHeader,manager:this.manager,ktx2Loader:this.ktx2Loader,meshoptDecoder:this.meshoptDecoder});l.fileLoader.setRequestHeader(this.requestHeader);for(let h=0;h<this.pluginCallbacks.length;h++){let u=this.pluginCallbacks[h](l);u.name||console.error("THREE.GLTFLoader: Invalid plugin found: missing name"),o[u.name]=u,a[u.name]=!0}if(r.extensionsUsed)for(let h=0;h<r.extensionsUsed.length;++h){let u=r.extensionsUsed[h],d=r.extensionsRequired||[];switch(u){case $e.KHR_MATERIALS_UNLIT:a[u]=new uu;break;case $e.KHR_DRACO_MESH_COMPRESSION:a[u]=new Ru(r,this.dracoLoader);break;case $e.KHR_TEXTURE_TRANSFORM:a[u]=new Iu;break;case $e.KHR_MESH_QUANTIZATION:a[u]=new Pu;break;default:d.indexOf(u)>=0&&o[u]===void 0&&console.warn('THREE.GLTFLoader: Unknown extension "'+u+'".')}}l.setExtensions(a),l.setPlugins(o),l.parse(n,s)}parseAsync(e,t){let n=this;return new Promise(function(s,r){n.parse(e,t,s,r)})}};function qv(){let i={};return{get:function(e){return i[e]},add:function(e,t){i[e]=t},remove:function(e){delete i[e]},removeAll:function(){i={}}}}var $e={KHR_BINARY_GLTF:"KHR_binary_glTF",KHR_DRACO_MESH_COMPRESSION:"KHR_draco_mesh_compression",KHR_LIGHTS_PUNCTUAL:"KHR_lights_punctual",KHR_MATERIALS_CLEARCOAT:"KHR_materials_clearcoat",KHR_MATERIALS_DISPERSION:"KHR_materials_dispersion",KHR_MATERIALS_IOR:"KHR_materials_ior",KHR_MATERIALS_SHEEN:"KHR_materials_sheen",KHR_MATERIALS_SPECULAR:"KHR_materials_specular",KHR_MATERIALS_TRANSMISSION:"KHR_materials_transmission",KHR_MATERIALS_IRIDESCENCE:"KHR_materials_iridescence",KHR_MATERIALS_ANISOTROPY:"KHR_materials_anisotropy",KHR_MATERIALS_UNLIT:"KHR_materials_unlit",KHR_MATERIALS_VOLUME:"KHR_materials_volume",KHR_TEXTURE_BASISU:"KHR_texture_basisu",KHR_TEXTURE_TRANSFORM:"KHR_texture_transform",KHR_MESH_QUANTIZATION:"KHR_mesh_quantization",KHR_MATERIALS_EMISSIVE_STRENGTH:"KHR_materials_emissive_strength",EXT_MATERIALS_BUMP:"EXT_materials_bump",EXT_TEXTURE_WEBP:"EXT_texture_webp",EXT_TEXTURE_AVIF:"EXT_texture_avif",EXT_MESHOPT_COMPRESSION:"EXT_meshopt_compression",EXT_MESH_GPU_INSTANCING:"EXT_mesh_gpu_instancing"},hu=class{constructor(e){this.parser=e,this.name=$e.KHR_LIGHTS_PUNCTUAL,this.cache={refs:{},uses:{}}}_markDefs(){let e=this.parser,t=this.parser.json.nodes||[];for(let n=0,s=t.length;n<s;n++){let r=t[n];r.extensions&&r.extensions[this.name]&&r.extensions[this.name].light!==void 0&&e._addNodeRef(this.cache,r.extensions[this.name].light)}}_loadLight(e){let t=this.parser,n="light:"+e,s=t.cache.get(n);if(s)return s;let r=t.json,c=((r.extensions&&r.extensions[this.name]||{}).lights||[])[e],l,h=new Oe(16777215);c.color!==void 0&&h.setRGB(c.color[0],c.color[1],c.color[2],Bt);let u=c.range!==void 0?c.range:0;switch(c.type){case"directional":l=new Ri(h),l.target.position.set(0,0,-1),l.add(l.target);break;case"point":l=new pa(h),l.distance=u;break;case"spot":l=new fa(h),l.distance=u,c.spot=c.spot||{},c.spot.innerConeAngle=c.spot.innerConeAngle!==void 0?c.spot.innerConeAngle:0,c.spot.outerConeAngle=c.spot.outerConeAngle!==void 0?c.spot.outerConeAngle:Math.PI/4,l.angle=c.spot.outerConeAngle,l.penumbra=1-c.spot.innerConeAngle/c.spot.outerConeAngle,l.target.position.set(0,0,-1),l.add(l.target);break;default:throw new Error("THREE.GLTFLoader: Unexpected light type: "+c.type)}return l.position.set(0,0,0),jn(l,c),c.intensity!==void 0&&(l.intensity=c.intensity),l.name=t.createUniqueName(c.name||"light_"+e),s=Promise.resolve(l),t.cache.add(n,s),s}getDependency(e,t){if(e==="light")return this._loadLight(t)}createNodeAttachment(e){let t=this,n=this.parser,r=n.json.nodes[e],o=(r.extensions&&r.extensions[this.name]||{}).light;return o===void 0?null:this._loadLight(o).then(function(c){return n._getNodeRef(t.cache,o,c)})}},uu=class{constructor(){this.name=$e.KHR_MATERIALS_UNLIT}getMaterialType(){return Pn}extendParams(e,t,n){let s=[];e.color=new Oe(1,1,1),e.opacity=1;let r=t.pbrMetallicRoughness;if(r){if(Array.isArray(r.baseColorFactor)){let a=r.baseColorFactor;e.color.setRGB(a[0],a[1],a[2],Bt),e.opacity=a[3]}r.baseColorTexture!==void 0&&s.push(n.assignTexture(e,"map",r.baseColorTexture,Et))}return Promise.all(s)}},du=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_EMISSIVE_STRENGTH}extendMaterialParams(e,t){let s=this.parser.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=s.extensions[this.name].emissiveStrength;return r!==void 0&&(t.emissiveIntensity=r),Promise.resolve()}},fu=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_CLEARCOAT}getMaterialType(e){let n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:tn}extendMaterialParams(e,t){let n=this.parser,s=n.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=[],a=s.extensions[this.name];if(a.clearcoatFactor!==void 0&&(t.clearcoat=a.clearcoatFactor),a.clearcoatTexture!==void 0&&r.push(n.assignTexture(t,"clearcoatMap",a.clearcoatTexture)),a.clearcoatRoughnessFactor!==void 0&&(t.clearcoatRoughness=a.clearcoatRoughnessFactor),a.clearcoatRoughnessTexture!==void 0&&r.push(n.assignTexture(t,"clearcoatRoughnessMap",a.clearcoatRoughnessTexture)),a.clearcoatNormalTexture!==void 0&&(r.push(n.assignTexture(t,"clearcoatNormalMap",a.clearcoatNormalTexture)),a.clearcoatNormalTexture.scale!==void 0)){let o=a.clearcoatNormalTexture.scale;t.clearcoatNormalScale=new ie(o,o)}return Promise.all(r)}},pu=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_DISPERSION}getMaterialType(e){let n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:tn}extendMaterialParams(e,t){let s=this.parser.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=s.extensions[this.name];return t.dispersion=r.dispersion!==void 0?r.dispersion:0,Promise.resolve()}},mu=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_IRIDESCENCE}getMaterialType(e){let n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:tn}extendMaterialParams(e,t){let n=this.parser,s=n.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=[],a=s.extensions[this.name];return a.iridescenceFactor!==void 0&&(t.iridescence=a.iridescenceFactor),a.iridescenceTexture!==void 0&&r.push(n.assignTexture(t,"iridescenceMap",a.iridescenceTexture)),a.iridescenceIor!==void 0&&(t.iridescenceIOR=a.iridescenceIor),t.iridescenceThicknessRange===void 0&&(t.iridescenceThicknessRange=[100,400]),a.iridescenceThicknessMinimum!==void 0&&(t.iridescenceThicknessRange[0]=a.iridescenceThicknessMinimum),a.iridescenceThicknessMaximum!==void 0&&(t.iridescenceThicknessRange[1]=a.iridescenceThicknessMaximum),a.iridescenceThicknessTexture!==void 0&&r.push(n.assignTexture(t,"iridescenceThicknessMap",a.iridescenceThicknessTexture)),Promise.all(r)}},gu=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_SHEEN}getMaterialType(e){let n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:tn}extendMaterialParams(e,t){let n=this.parser,s=n.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=[];t.sheenColor=new Oe(0,0,0),t.sheenRoughness=0,t.sheen=1;let a=s.extensions[this.name];if(a.sheenColorFactor!==void 0){let o=a.sheenColorFactor;t.sheenColor.setRGB(o[0],o[1],o[2],Bt)}return a.sheenRoughnessFactor!==void 0&&(t.sheenRoughness=a.sheenRoughnessFactor),a.sheenColorTexture!==void 0&&r.push(n.assignTexture(t,"sheenColorMap",a.sheenColorTexture,Et)),a.sheenRoughnessTexture!==void 0&&r.push(n.assignTexture(t,"sheenRoughnessMap",a.sheenRoughnessTexture)),Promise.all(r)}},xu=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_TRANSMISSION}getMaterialType(e){let n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:tn}extendMaterialParams(e,t){let n=this.parser,s=n.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=[],a=s.extensions[this.name];return a.transmissionFactor!==void 0&&(t.transmission=a.transmissionFactor),a.transmissionTexture!==void 0&&r.push(n.assignTexture(t,"transmissionMap",a.transmissionTexture)),Promise.all(r)}},_u=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_VOLUME}getMaterialType(e){let n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:tn}extendMaterialParams(e,t){let n=this.parser,s=n.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=[],a=s.extensions[this.name];t.thickness=a.thicknessFactor!==void 0?a.thicknessFactor:0,a.thicknessTexture!==void 0&&r.push(n.assignTexture(t,"thicknessMap",a.thicknessTexture)),t.attenuationDistance=a.attenuationDistance||1/0;let o=a.attenuationColor||[1,1,1];return t.attenuationColor=new Oe().setRGB(o[0],o[1],o[2],Bt),Promise.all(r)}},yu=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_IOR}getMaterialType(e){let n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:tn}extendMaterialParams(e,t){let s=this.parser.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=s.extensions[this.name];return t.ior=r.ior!==void 0?r.ior:1.5,Promise.resolve()}},vu=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_SPECULAR}getMaterialType(e){let n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:tn}extendMaterialParams(e,t){let n=this.parser,s=n.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=[],a=s.extensions[this.name];t.specularIntensity=a.specularFactor!==void 0?a.specularFactor:1,a.specularTexture!==void 0&&r.push(n.assignTexture(t,"specularIntensityMap",a.specularTexture));let o=a.specularColorFactor||[1,1,1];return t.specularColor=new Oe().setRGB(o[0],o[1],o[2],Bt),a.specularColorTexture!==void 0&&r.push(n.assignTexture(t,"specularColorMap",a.specularColorTexture,Et)),Promise.all(r)}},bu=class{constructor(e){this.parser=e,this.name=$e.EXT_MATERIALS_BUMP}getMaterialType(e){let n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:tn}extendMaterialParams(e,t){let n=this.parser,s=n.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=[],a=s.extensions[this.name];return t.bumpScale=a.bumpFactor!==void 0?a.bumpFactor:1,a.bumpTexture!==void 0&&r.push(n.assignTexture(t,"bumpMap",a.bumpTexture)),Promise.all(r)}},Su=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_ANISOTROPY}getMaterialType(e){let n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:tn}extendMaterialParams(e,t){let n=this.parser,s=n.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=[],a=s.extensions[this.name];return a.anisotropyStrength!==void 0&&(t.anisotropy=a.anisotropyStrength),a.anisotropyRotation!==void 0&&(t.anisotropyRotation=a.anisotropyRotation),a.anisotropyTexture!==void 0&&r.push(n.assignTexture(t,"anisotropyMap",a.anisotropyTexture)),Promise.all(r)}},Mu=class{constructor(e){this.parser=e,this.name=$e.KHR_TEXTURE_BASISU}loadTexture(e){let t=this.parser,n=t.json,s=n.textures[e];if(!s.extensions||!s.extensions[this.name])return null;let r=s.extensions[this.name],a=t.options.ktx2Loader;if(!a){if(n.extensionsRequired&&n.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures");return null}return t.loadTextureImage(e,r.source,a)}},wu=class{constructor(e){this.parser=e,this.name=$e.EXT_TEXTURE_WEBP}loadTexture(e){let t=this.name,n=this.parser,s=n.json,r=s.textures[e];if(!r.extensions||!r.extensions[t])return null;let a=r.extensions[t],o=s.images[a.source],c=n.textureLoader;if(o.uri){let l=n.options.manager.getHandler(o.uri);l!==null&&(c=l)}return n.loadTextureImage(e,a.source,c)}},Eu=class{constructor(e){this.parser=e,this.name=$e.EXT_TEXTURE_AVIF}loadTexture(e){let t=this.name,n=this.parser,s=n.json,r=s.textures[e];if(!r.extensions||!r.extensions[t])return null;let a=r.extensions[t],o=s.images[a.source],c=n.textureLoader;if(o.uri){let l=n.options.manager.getHandler(o.uri);l!==null&&(c=l)}return n.loadTextureImage(e,a.source,c)}},Tu=class{constructor(e){this.name=$e.EXT_MESHOPT_COMPRESSION,this.parser=e}loadBufferView(e){let t=this.parser.json,n=t.bufferViews[e];if(n.extensions&&n.extensions[this.name]){let s=n.extensions[this.name],r=this.parser.getDependency("buffer",s.buffer),a=this.parser.options.meshoptDecoder;if(!a||!a.supported){if(t.extensionsRequired&&t.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files");return null}return r.then(function(o){let c=s.byteOffset||0,l=s.byteLength||0,h=s.count,u=s.byteStride,d=new Uint8Array(o,c,l);return a.decodeGltfBufferAsync?a.decodeGltfBufferAsync(h,u,d,s.mode,s.filter).then(function(f){return f.buffer}):a.ready.then(function(){let f=new ArrayBuffer(h*u);return a.decodeGltfBuffer(new Uint8Array(f),h,u,d,s.mode,s.filter),f})})}else return null}},Au=class{constructor(e){this.name=$e.EXT_MESH_GPU_INSTANCING,this.parser=e}createNodeMesh(e){let t=this.parser.json,n=t.nodes[e];if(!n.extensions||!n.extensions[this.name]||n.mesh===void 0)return null;let s=t.meshes[n.mesh];for(let l of s.primitives)if(l.mode!==Sn.TRIANGLES&&l.mode!==Sn.TRIANGLE_STRIP&&l.mode!==Sn.TRIANGLE_FAN&&l.mode!==void 0)return null;let a=n.extensions[this.name].attributes,o=[],c={};for(let l in a)o.push(this.parser.getDependency("accessor",a[l]).then(h=>(c[l]=h,c[l])));return o.length<1?null:(o.push(this.parser.createNodeMesh(e)),Promise.all(o).then(l=>{let h=l.pop(),u=h.isGroup?h.children:[h],d=l[0].count,f=[];for(let g of u){let x=new We,m=new D,p=new Kt,M=new D(1,1,1),v=new Xr(g.geometry,g.material,d);for(let w=0;w<d;w++)c.TRANSLATION&&m.fromBufferAttribute(c.TRANSLATION,w),c.ROTATION&&p.fromBufferAttribute(c.ROTATION,w),c.SCALE&&M.fromBufferAttribute(c.SCALE,w),v.setMatrixAt(w,x.compose(m,p,M));for(let w in c)if(w==="_COLOR_0"){let I=c[w];v.instanceColor=new Ci(I.array,I.itemSize,I.normalized)}else w!=="TRANSLATION"&&w!=="ROTATION"&&w!=="SCALE"&&g.geometry.setAttribute(w,c[w]);xt.prototype.copy.call(v,g),this.parser.assignFinalMaterial(v),f.push(v)}return h.isGroup?(h.clear(),h.add(...f),h):f[0]}))}},Xp="glTF",Pa=12,Vp={JSON:1313821514,BIN:5130562},Cu=class{constructor(e){this.name=$e.KHR_BINARY_GLTF,this.content=null,this.body=null;let t=new DataView(e,0,Pa),n=new TextDecoder;if(this.header={magic:n.decode(new Uint8Array(e.slice(0,4))),version:t.getUint32(4,!0),length:t.getUint32(8,!0)},this.header.magic!==Xp)throw new Error("THREE.GLTFLoader: Unsupported glTF-Binary header.");if(this.header.version<2)throw new Error("THREE.GLTFLoader: Legacy binary file detected.");let s=this.header.length-Pa,r=new DataView(e,Pa),a=0;for(;a<s;){let o=r.getUint32(a,!0);a+=4;let c=r.getUint32(a,!0);if(a+=4,c===Vp.JSON){let l=new Uint8Array(e,Pa+a,o);this.content=n.decode(l)}else if(c===Vp.BIN){let l=Pa+a;this.body=e.slice(l,l+o)}a+=o}if(this.content===null)throw new Error("THREE.GLTFLoader: JSON content not found.")}},Ru=class{constructor(e,t){if(!t)throw new Error("THREE.GLTFLoader: No DRACOLoader instance provided.");this.name=$e.KHR_DRACO_MESH_COMPRESSION,this.json=e,this.dracoLoader=t,this.dracoLoader.preload()}decodePrimitive(e,t){let n=this.json,s=this.dracoLoader,r=e.extensions[this.name].bufferView,a=e.extensions[this.name].attributes,o={},c={},l={};for(let h in a){let u=Du[h]||h.toLowerCase();o[u]=a[h]}for(let h in e.attributes){let u=Du[h]||h.toLowerCase();if(a[h]!==void 0){let d=n.accessors[e.attributes[h]],f=mr[d.componentType];l[u]=f.name,c[u]=d.normalized===!0}}return t.getDependency("bufferView",r).then(function(h){return new Promise(function(u,d){s.decodeDracoFile(h,function(f){for(let g in f.attributes){let x=f.attributes[g],m=c[g];m!==void 0&&(x.normalized=m)}u(f)},o,l,Bt,d)})})}},Iu=class{constructor(){this.name=$e.KHR_TEXTURE_TRANSFORM}extendTexture(e,t){return(t.texCoord===void 0||t.texCoord===e.channel)&&t.offset===void 0&&t.rotation===void 0&&t.scale===void 0||(e=e.clone(),t.texCoord!==void 0&&(e.channel=t.texCoord),t.offset!==void 0&&e.offset.fromArray(t.offset),t.rotation!==void 0&&(e.rotation=t.rotation),t.scale!==void 0&&e.repeat.fromArray(t.scale),e.needsUpdate=!0),e}},Pu=class{constructor(){this.name=$e.KHR_MESH_QUANTIZATION}},Qc=class extends ci{constructor(e,t,n,s){super(e,t,n,s)}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=e*s*3+s;for(let a=0;a!==s;a++)t[a]=n[r+a];return t}interpolate_(e,t,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=o*2,l=o*3,h=s-t,u=(n-t)/h,d=u*u,f=d*u,g=e*l,x=g-l,m=-2*f+3*d,p=f-d,M=1-m,v=p-d+u;for(let w=0;w!==o;w++){let I=a[x+w+o],E=a[x+w+c]*h,P=a[g+w+o],O=a[g+w]*h;r[w]=M*I+v*E+m*P+p*O}return r}},Yv=new Kt,Lu=class extends Qc{interpolate_(e,t,n,s){let r=super.interpolate_(e,t,n,s);return Yv.fromArray(r).normalize().toArray(r),r}},Sn={FLOAT:5126,FLOAT_MAT3:35675,FLOAT_MAT4:35676,FLOAT_VEC2:35664,FLOAT_VEC3:35665,FLOAT_VEC4:35666,LINEAR:9729,REPEAT:10497,SAMPLER_2D:35678,POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,TRIANGLE_STRIP:5,TRIANGLE_FAN:6,UNSIGNED_BYTE:5121,UNSIGNED_SHORT:5123},mr={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},Hp={9728:Ot,9729:Ft,9984:ec,9985:tr,9986:as,9987:Dn},Gp={33071:xn,33648:Ns,10497:Ai},ou={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},Du={POSITION:"position",NORMAL:"normal",TANGENT:"tangent",TEXCOORD_0:"uv",TEXCOORD_1:"uv1",TEXCOORD_2:"uv2",TEXCOORD_3:"uv3",COLOR_0:"color",WEIGHTS_0:"skinWeight",JOINTS_0:"skinIndex"},Oi={scale:"scale",translation:"position",rotation:"quaternion",weights:"morphTargetInfluences"},Kv={CUBICSPLINE:void 0,LINEAR:ji,STEP:Ji},cu={OPAQUE:"OPAQUE",MASK:"MASK",BLEND:"BLEND"};function Zv(i){return i.DefaultMaterial===void 0&&(i.DefaultMaterial=new ts({color:16777215,emissive:0,metalness:1,roughness:1,transparent:!1,depthTest:!0,side:Rn})),i.DefaultMaterial}function ms(i,e,t){for(let n in t.extensions)i[n]===void 0&&(e.userData.gltfExtensions=e.userData.gltfExtensions||{},e.userData.gltfExtensions[n]=t.extensions[n])}function jn(i,e){e.extras!==void 0&&(typeof e.extras=="object"?Object.assign(i.userData,e.extras):console.warn("THREE.GLTFLoader: Ignoring primitive type .extras, "+e.extras))}function Jv(i,e,t){let n=!1,s=!1,r=!1;for(let l=0,h=e.length;l<h;l++){let u=e[l];if(u.POSITION!==void 0&&(n=!0),u.NORMAL!==void 0&&(s=!0),u.COLOR_0!==void 0&&(r=!0),n&&s&&r)break}if(!n&&!s&&!r)return Promise.resolve(i);let a=[],o=[],c=[];for(let l=0,h=e.length;l<h;l++){let u=e[l];if(n){let d=u.POSITION!==void 0?t.getDependency("accessor",u.POSITION):i.attributes.position;a.push(d)}if(s){let d=u.NORMAL!==void 0?t.getDependency("accessor",u.NORMAL):i.attributes.normal;o.push(d)}if(r){let d=u.COLOR_0!==void 0?t.getDependency("accessor",u.COLOR_0):i.attributes.color;c.push(d)}}return Promise.all([Promise.all(a),Promise.all(o),Promise.all(c)]).then(function(l){let h=l[0],u=l[1],d=l[2];return n&&(i.morphAttributes.position=h),s&&(i.morphAttributes.normal=u),r&&(i.morphAttributes.color=d),i.morphTargetsRelative=!0,i})}function jv(i,e){if(i.updateMorphTargets(),e.weights!==void 0)for(let t=0,n=e.weights.length;t<n;t++)i.morphTargetInfluences[t]=e.weights[t];if(e.extras&&Array.isArray(e.extras.targetNames)){let t=e.extras.targetNames;if(i.morphTargetInfluences.length===t.length){i.morphTargetDictionary={};for(let n=0,s=t.length;n<s;n++)i.morphTargetDictionary[t[n]]=n}else console.warn("THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.")}}function $v(i){let e,t=i.extensions&&i.extensions[$e.KHR_DRACO_MESH_COMPRESSION];if(t?e="draco:"+t.bufferView+":"+t.indices+":"+lu(t.attributes):e=i.indices+":"+lu(i.attributes)+":"+i.mode,i.targets!==void 0)for(let n=0,s=i.targets.length;n<s;n++)e+=":"+lu(i.targets[n]);return e}function lu(i){let e="",t=Object.keys(i).sort();for(let n=0,s=t.length;n<s;n++)e+=t[n]+":"+i[t[n]]+";";return e}function Nu(i){switch(i){case Int8Array:return 1/127;case Uint8Array:return 1/255;case Int16Array:return 1/32767;case Uint16Array:return 1/65535;default:throw new Error("THREE.GLTFLoader: Unsupported normalized accessor component type.")}}function Qv(i){return i.search(/\.jpe?g($|\?)/i)>0||i.search(/^data\:image\/jpeg/)===0?"image/jpeg":i.search(/\.webp($|\?)/i)>0||i.search(/^data\:image\/webp/)===0?"image/webp":i.search(/\.ktx2($|\?)/i)>0||i.search(/^data\:image\/ktx2/)===0?"image/ktx2":"image/png"}var eb=new We,Uu=class{constructor(e={},t={}){this.json=e,this.extensions={},this.plugins={},this.options=t,this.cache=new qv,this.associations=new Map,this.primitiveCache={},this.nodeCache={},this.meshCache={refs:{},uses:{}},this.cameraCache={refs:{},uses:{}},this.lightCache={refs:{},uses:{}},this.sourceCache={},this.textureCache={},this.nodeNamesUsed={};let n=!1,s=-1,r=!1,a=-1;if(typeof navigator<"u"){let o=navigator.userAgent;n=/^((?!chrome|android).)*safari/i.test(o)===!0;let c=o.match(/Version\/(\d+)/);s=n&&c?parseInt(c[1],10):-1,r=o.indexOf("Firefox")>-1,a=r?o.match(/Firefox\/([0-9]+)\./)[1]:-1}typeof createImageBitmap>"u"||n&&s<17||r&&a<98?this.textureLoader=new ha(this.options.manager):this.textureLoader=new ma(this.options.manager),this.textureLoader.setCrossOrigin(this.options.crossOrigin),this.textureLoader.setRequestHeader(this.options.requestHeader),this.fileLoader=new Qs(this.options.manager),this.fileLoader.setResponseType("arraybuffer"),this.options.crossOrigin==="use-credentials"&&this.fileLoader.setWithCredentials(!0)}setExtensions(e){this.extensions=e}setPlugins(e){this.plugins=e}parse(e,t){let n=this,s=this.json,r=this.extensions;this.cache.removeAll(),this.nodeCache={},this._invokeAll(function(a){return a._markDefs&&a._markDefs()}),Promise.all(this._invokeAll(function(a){return a.beforeRoot&&a.beforeRoot()})).then(function(){return Promise.all([n.getDependencies("scene"),n.getDependencies("animation"),n.getDependencies("camera")])}).then(function(a){let o={scene:a[0][s.scene||0],scenes:a[0],animations:a[1],cameras:a[2],asset:s.asset,parser:n,userData:{}};return ms(r,o,s),jn(o,s),Promise.all(n._invokeAll(function(c){return c.afterRoot&&c.afterRoot(o)})).then(function(){for(let c of o.scenes)c.updateMatrixWorld();e(o)})}).catch(t)}_markDefs(){let e=this.json.nodes||[],t=this.json.skins||[],n=this.json.meshes||[];for(let s=0,r=t.length;s<r;s++){let a=t[s].joints;for(let o=0,c=a.length;o<c;o++)e[a[o]].isBone=!0}for(let s=0,r=e.length;s<r;s++){let a=e[s];a.mesh!==void 0&&(this._addNodeRef(this.meshCache,a.mesh),a.skin!==void 0&&(n[a.mesh].isSkinnedMesh=!0)),a.camera!==void 0&&this._addNodeRef(this.cameraCache,a.camera)}}_addNodeRef(e,t){t!==void 0&&(e.refs[t]===void 0&&(e.refs[t]=e.uses[t]=0),e.refs[t]++)}_getNodeRef(e,t,n){if(e.refs[t]<=1)return n;let s=n.clone(),r=(a,o)=>{let c=this.associations.get(a);c!=null&&this.associations.set(o,c);for(let[l,h]of a.children.entries())r(h,o.children[l])};return r(n,s),s.name+="_instance_"+e.uses[t]++,s}_invokeOne(e){let t=Object.values(this.plugins);t.push(this);for(let n=0;n<t.length;n++){let s=e(t[n]);if(s)return s}return null}_invokeAll(e){let t=Object.values(this.plugins);t.unshift(this);let n=[];for(let s=0;s<t.length;s++){let r=e(t[s]);r&&n.push(r)}return n}getDependency(e,t){let n=e+":"+t,s=this.cache.get(n);if(!s){switch(e){case"scene":s=this.loadScene(t);break;case"node":s=this._invokeOne(function(r){return r.loadNode&&r.loadNode(t)});break;case"mesh":s=this._invokeOne(function(r){return r.loadMesh&&r.loadMesh(t)});break;case"accessor":s=this.loadAccessor(t);break;case"bufferView":s=this._invokeOne(function(r){return r.loadBufferView&&r.loadBufferView(t)});break;case"buffer":s=this.loadBuffer(t);break;case"material":s=this._invokeOne(function(r){return r.loadMaterial&&r.loadMaterial(t)});break;case"texture":s=this._invokeOne(function(r){return r.loadTexture&&r.loadTexture(t)});break;case"skin":s=this.loadSkin(t);break;case"animation":s=this._invokeOne(function(r){return r.loadAnimation&&r.loadAnimation(t)});break;case"camera":s=this.loadCamera(t);break;default:if(s=this._invokeOne(function(r){return r!=this&&r.getDependency&&r.getDependency(e,t)}),!s)throw new Error("Unknown type: "+e);break}this.cache.add(n,s)}return s}getDependencies(e){let t=this.cache.get(e);if(!t){let n=this,s=this.json[e+(e==="mesh"?"es":"s")]||[];t=Promise.all(s.map(function(r,a){return n.getDependency(e,a)})),this.cache.add(e,t)}return t}loadBuffer(e){let t=this.json.buffers[e],n=this.fileLoader;if(t.type&&t.type!=="arraybuffer")throw new Error("THREE.GLTFLoader: "+t.type+" buffer type is not supported.");if(t.uri===void 0&&e===0)return Promise.resolve(this.extensions[$e.KHR_BINARY_GLTF].body);let s=this.options;return new Promise(function(r,a){n.load(ui.resolveURL(t.uri,s.path),r,void 0,function(){a(new Error('THREE.GLTFLoader: Failed to load buffer "'+t.uri+'".'))})})}loadBufferView(e){let t=this.json.bufferViews[e];return this.getDependency("buffer",t.buffer).then(function(n){let s=t.byteLength||0,r=t.byteOffset||0;return n.slice(r,r+s)})}loadAccessor(e){let t=this,n=this.json,s=this.json.accessors[e];if(s.bufferView===void 0&&s.sparse===void 0){let a=ou[s.type],o=mr[s.componentType],c=s.normalized===!0,l=new o(s.count*a);return Promise.resolve(new Ct(l,a,c))}let r=[];return s.bufferView!==void 0?r.push(this.getDependency("bufferView",s.bufferView)):r.push(null),s.sparse!==void 0&&(r.push(this.getDependency("bufferView",s.sparse.indices.bufferView)),r.push(this.getDependency("bufferView",s.sparse.values.bufferView))),Promise.all(r).then(function(a){let o=a[0],c=ou[s.type],l=mr[s.componentType],h=l.BYTES_PER_ELEMENT,u=h*c,d=s.byteOffset||0,f=s.bufferView!==void 0?n.bufferViews[s.bufferView].byteStride:void 0,g=s.normalized===!0,x,m;if(f&&f!==u){let p=Math.floor(d/f),M="InterleavedBuffer:"+s.bufferView+":"+s.componentType+":"+p+":"+s.count,v=t.cache.get(M);v||(x=new l(o,p*f,s.count*f/h),v=new Vs(x,f/h),t.cache.add(M,v)),m=new Hs(v,c,d%f/h,g)}else o===null?x=new l(s.count*c):x=new l(o,d,s.count*c),m=new Ct(x,c,g);if(s.sparse!==void 0){let p=ou.SCALAR,M=mr[s.sparse.indices.componentType],v=s.sparse.indices.byteOffset||0,w=s.sparse.values.byteOffset||0,I=new M(a[1],v,s.sparse.count*p),E=new l(a[2],w,s.sparse.count*c);o!==null&&(m=new Ct(m.array.slice(),m.itemSize,m.normalized)),m.normalized=!1;for(let P=0,O=I.length;P<O;P++){let S=I[P];if(m.setX(S,E[P*c]),c>=2&&m.setY(S,E[P*c+1]),c>=3&&m.setZ(S,E[P*c+2]),c>=4&&m.setW(S,E[P*c+3]),c>=5)throw new Error("THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.")}m.normalized=g}return m})}loadTexture(e){let t=this.json,n=this.options,r=t.textures[e].source,a=t.images[r],o=this.textureLoader;if(a.uri){let c=n.manager.getHandler(a.uri);c!==null&&(o=c)}return this.loadTextureImage(e,r,o)}loadTextureImage(e,t,n){let s=this,r=this.json,a=r.textures[e],o=r.images[t],c=(o.uri||o.bufferView)+":"+a.sampler;if(this.textureCache[c])return this.textureCache[c];let l=this.loadImageSource(t,n).then(function(h){h.flipY=!1,h.name=a.name||o.name||"",h.name===""&&typeof o.uri=="string"&&o.uri.startsWith("data:image/")===!1&&(h.name=o.uri);let d=(r.samplers||{})[a.sampler]||{};return h.magFilter=Hp[d.magFilter]||Ft,h.minFilter=Hp[d.minFilter]||Dn,h.wrapS=Gp[d.wrapS]||Ai,h.wrapT=Gp[d.wrapT]||Ai,h.generateMipmaps=!h.isCompressedTexture&&h.minFilter!==Ot&&h.minFilter!==Ft,s.associations.set(h,{textures:e}),h}).catch(function(){return null});return this.textureCache[c]=l,l}loadImageSource(e,t){let n=this,s=this.json,r=this.options;if(this.sourceCache[e]!==void 0)return this.sourceCache[e].then(u=>u.clone());let a=s.images[e],o=self.URL||self.webkitURL,c=a.uri||"",l=!1;if(a.bufferView!==void 0)c=n.getDependency("bufferView",a.bufferView).then(function(u){l=!0;let d=new Blob([u],{type:a.mimeType});return c=o.createObjectURL(d),c});else if(a.uri===void 0)throw new Error("THREE.GLTFLoader: Image "+e+" is missing URI and bufferView");let h=Promise.resolve(c).then(function(u){return new Promise(function(d,f){let g=d;t.isImageBitmapLoader===!0&&(g=function(x){let m=new Nt(x);m.needsUpdate=!0,d(m)}),t.load(ui.resolveURL(u,r.path),g,void 0,f)})}).then(function(u){return l===!0&&o.revokeObjectURL(c),jn(u,a),u.userData.mimeType=a.mimeType||Qv(a.uri),u}).catch(function(u){throw console.error("THREE.GLTFLoader: Couldn't load texture",c),u});return this.sourceCache[e]=h,h}assignTexture(e,t,n,s){let r=this;return this.getDependency("texture",n.index).then(function(a){if(!a)return null;if(n.texCoord!==void 0&&n.texCoord>0&&(a=a.clone(),a.channel=n.texCoord),r.extensions[$e.KHR_TEXTURE_TRANSFORM]){let o=n.extensions!==void 0?n.extensions[$e.KHR_TEXTURE_TRANSFORM]:void 0;if(o){let c=r.associations.get(a);a=r.extensions[$e.KHR_TEXTURE_TRANSFORM].extendTexture(a,o),r.associations.set(a,c)}}return s!==void 0&&(a.colorSpace=s),e[t]=a,a})}assignFinalMaterial(e){let t=e.geometry,n=e.material,s=t.attributes.tangent===void 0,r=t.attributes.color!==void 0,a=t.attributes.normal===void 0;if(e.isPoints){let o="PointsMaterial:"+n.uuid,c=this.cache.get(o);c||(c=new Ys,en.prototype.copy.call(c,n),c.color.copy(n.color),c.map=n.map,c.sizeAttenuation=!1,this.cache.add(o,c)),n=c}else if(e.isLine){let o="LineBasicMaterial:"+n.uuid,c=this.cache.get(o);c||(c=new qs,en.prototype.copy.call(c,n),c.color.copy(n.color),c.map=n.map,this.cache.add(o,c)),n=c}if(s||r||a){let o="ClonedMaterial:"+n.uuid+":";s&&(o+="derivative-tangents:"),r&&(o+="vertex-colors:"),a&&(o+="flat-shading:");let c=this.cache.get(o);c||(c=n.clone(),r&&(c.vertexColors=!0),a&&(c.flatShading=!0),s&&(c.normalScale&&(c.normalScale.y*=-1),c.clearcoatNormalScale&&(c.clearcoatNormalScale.y*=-1)),this.cache.add(o,c),this.associations.set(c,this.associations.get(n))),n=c}e.material=n}getMaterialType(){return ts}loadMaterial(e){let t=this,n=this.json,s=this.extensions,r=n.materials[e],a,o={},c=r.extensions||{},l=[];if(c[$e.KHR_MATERIALS_UNLIT]){let u=s[$e.KHR_MATERIALS_UNLIT];a=u.getMaterialType(),l.push(u.extendParams(o,r,t))}else{let u=r.pbrMetallicRoughness||{};if(o.color=new Oe(1,1,1),o.opacity=1,Array.isArray(u.baseColorFactor)){let d=u.baseColorFactor;o.color.setRGB(d[0],d[1],d[2],Bt),o.opacity=d[3]}u.baseColorTexture!==void 0&&l.push(t.assignTexture(o,"map",u.baseColorTexture,Et)),o.metalness=u.metallicFactor!==void 0?u.metallicFactor:1,o.roughness=u.roughnessFactor!==void 0?u.roughnessFactor:1,u.metallicRoughnessTexture!==void 0&&(l.push(t.assignTexture(o,"metalnessMap",u.metallicRoughnessTexture)),l.push(t.assignTexture(o,"roughnessMap",u.metallicRoughnessTexture))),a=this._invokeOne(function(d){return d.getMaterialType&&d.getMaterialType(e)}),l.push(Promise.all(this._invokeAll(function(d){return d.extendMaterialParams&&d.extendMaterialParams(e,o)})))}r.doubleSided===!0&&(o.side=vn);let h=r.alphaMode||cu.OPAQUE;if(h===cu.BLEND?(o.transparent=!0,o.depthWrite=!1):(o.transparent=!1,h===cu.MASK&&(o.alphaTest=r.alphaCutoff!==void 0?r.alphaCutoff:.5)),r.normalTexture!==void 0&&a!==Pn&&(l.push(t.assignTexture(o,"normalMap",r.normalTexture)),o.normalScale=new ie(1,1),r.normalTexture.scale!==void 0)){let u=r.normalTexture.scale;o.normalScale.set(u,u)}if(r.occlusionTexture!==void 0&&a!==Pn&&(l.push(t.assignTexture(o,"aoMap",r.occlusionTexture)),r.occlusionTexture.strength!==void 0&&(o.aoMapIntensity=r.occlusionTexture.strength)),r.emissiveFactor!==void 0&&a!==Pn){let u=r.emissiveFactor;o.emissive=new Oe().setRGB(u[0],u[1],u[2],Bt)}return r.emissiveTexture!==void 0&&a!==Pn&&l.push(t.assignTexture(o,"emissiveMap",r.emissiveTexture,Et)),Promise.all(l).then(function(){let u=new a(o);return r.name&&(u.name=r.name),jn(u,r),t.associations.set(u,{materials:e}),r.extensions&&ms(s,u,r),u})}createUniqueName(e){let t=mt.sanitizeNodeName(e||"");return t in this.nodeNamesUsed?t+"_"+ ++this.nodeNamesUsed[t]:(this.nodeNamesUsed[t]=0,t)}loadGeometries(e){let t=this,n=this.extensions,s=this.primitiveCache;function r(o){return n[$e.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(o,t).then(function(c){return Wp(c,o,t)})}let a=[];for(let o=0,c=e.length;o<c;o++){let l=e[o],h=$v(l),u=s[h];if(u)a.push(u.promise);else{let d;l.extensions&&l.extensions[$e.KHR_DRACO_MESH_COMPRESSION]?d=r(l):d=Wp(new Vt,l,t),s[h]={primitive:l,promise:d},a.push(d)}}return Promise.all(a)}loadMesh(e){let t=this,n=this.json,s=this.extensions,r=n.meshes[e],a=r.primitives,o=[];for(let c=0,l=a.length;c<l;c++){let h=a[c].material===void 0?Zv(this.cache):this.getDependency("material",a[c].material);o.push(h)}return o.push(t.loadGeometries(a)),Promise.all(o).then(function(c){let l=c.slice(0,c.length-1),h=c[c.length-1],u=[];for(let f=0,g=h.length;f<g;f++){let x=h[f],m=a[f],p,M=l[f];if(m.mode===Sn.TRIANGLES||m.mode===Sn.TRIANGLE_STRIP||m.mode===Sn.TRIANGLE_FAN||m.mode===void 0)p=r.isSkinnedMesh===!0?new Gr(x,M):new Ht(x,M),p.isSkinnedMesh===!0&&p.normalizeSkinWeights(),m.mode===Sn.TRIANGLE_STRIP?p.geometry=au(p.geometry,Sa):m.mode===Sn.TRIANGLE_FAN&&(p.geometry=au(p.geometry,rr));else if(m.mode===Sn.LINES)p=new qr(x,M);else if(m.mode===Sn.LINE_STRIP)p=new Qi(x,M);else if(m.mode===Sn.LINE_LOOP)p=new Yr(x,M);else if(m.mode===Sn.POINTS)p=new Kr(x,M);else throw new Error("THREE.GLTFLoader: Primitive mode unsupported: "+m.mode);Object.keys(p.geometry.morphAttributes).length>0&&jv(p,r),p.name=t.createUniqueName(r.name||"mesh_"+e),jn(p,r),m.extensions&&ms(s,p,m),t.assignFinalMaterial(p),u.push(p)}for(let f=0,g=u.length;f<g;f++)t.associations.set(u[f],{meshes:e,primitives:f});if(u.length===1)return r.extensions&&ms(s,u[0],r),u[0];let d=new ln;r.extensions&&ms(s,d,r),t.associations.set(d,{meshes:e});for(let f=0,g=u.length;f<g;f++)d.add(u[f]);return d})}loadCamera(e){let t,n=this.json.cameras[e],s=n[n.type];if(!s){console.warn("THREE.GLTFLoader: Missing camera parameters.");return}return n.type==="perspective"?t=new At(Ma.radToDeg(s.yfov),s.aspectRatio||1,s.znear||1,s.zfar||2e6):n.type==="orthographic"&&(t=new is(-s.xmag,s.xmag,s.ymag,-s.ymag,s.znear,s.zfar)),n.name&&(t.name=this.createUniqueName(n.name)),jn(t,n),Promise.resolve(t)}loadSkin(e){let t=this.json.skins[e],n=[];for(let s=0,r=t.joints.length;s<r;s++)n.push(this._loadNodeShallow(t.joints[s]));return t.inverseBindMatrices!==void 0?n.push(this.getDependency("accessor",t.inverseBindMatrices)):n.push(null),Promise.all(n).then(function(s){let r=s.pop(),a=s,o=[],c=[];for(let l=0,h=a.length;l<h;l++){let u=a[l];if(u){o.push(u);let d=new We;r!==null&&d.fromArray(r.array,l*16),c.push(d)}else console.warn('THREE.GLTFLoader: Joint "%s" could not be found.',t.joints[l])}return new Wr(o,c)})}loadAnimation(e){let t=this.json,n=this,s=t.animations[e],r=s.name?s.name:"animation_"+e,a=[],o=[],c=[],l=[],h=[];for(let u=0,d=s.channels.length;u<d;u++){let f=s.channels[u],g=s.samplers[f.sampler],x=f.target,m=x.node,p=s.parameters!==void 0?s.parameters[g.input]:g.input,M=s.parameters!==void 0?s.parameters[g.output]:g.output;x.node!==void 0&&(a.push(this.getDependency("node",m)),o.push(this.getDependency("accessor",p)),c.push(this.getDependency("accessor",M)),l.push(g),h.push(x))}return Promise.all([Promise.all(a),Promise.all(o),Promise.all(c),Promise.all(l),Promise.all(h)]).then(function(u){let d=u[0],f=u[1],g=u[2],x=u[3],m=u[4],p=[];for(let v=0,w=d.length;v<w;v++){let I=d[v],E=f[v],P=g[v],O=x[v],S=m[v];if(I===void 0)continue;I.updateMatrix&&I.updateMatrix();let y=n._createAnimationTracks(I,E,P,O,S);if(y)for(let R=0;R<y.length;R++)p.push(y[R])}let M=new la(r,void 0,p);return jn(M,s),M})}createNodeMesh(e){let t=this.json,n=this,s=t.nodes[e];return s.mesh===void 0?null:n.getDependency("mesh",s.mesh).then(function(r){let a=n._getNodeRef(n.meshCache,s.mesh,r);return s.weights!==void 0&&a.traverse(function(o){if(o.isMesh)for(let c=0,l=s.weights.length;c<l;c++)o.morphTargetInfluences[c]=s.weights[c]}),a})}loadNode(e){let t=this.json,n=this,s=t.nodes[e],r=n._loadNodeShallow(e),a=[],o=s.children||[];for(let l=0,h=o.length;l<h;l++)a.push(n.getDependency("node",o[l]));let c=s.skin===void 0?Promise.resolve(null):n.getDependency("skin",s.skin);return Promise.all([r,Promise.all(a),c]).then(function(l){let h=l[0],u=l[1],d=l[2];d!==null&&h.traverse(function(f){f.isSkinnedMesh&&f.bind(d,eb)});for(let f=0,g=u.length;f<g;f++)h.add(u[f]);return h})}_loadNodeShallow(e){let t=this.json,n=this.extensions,s=this;if(this.nodeCache[e]!==void 0)return this.nodeCache[e];let r=t.nodes[e],a=r.name?s.createUniqueName(r.name):"",o=[],c=s._invokeOne(function(l){return l.createNodeMesh&&l.createNodeMesh(e)});return c&&o.push(c),r.camera!==void 0&&o.push(s.getDependency("camera",r.camera).then(function(l){return s._getNodeRef(s.cameraCache,r.camera,l)})),s._invokeAll(function(l){return l.createNodeAttachment&&l.createNodeAttachment(e)}).forEach(function(l){o.push(l)}),this.nodeCache[e]=Promise.all(o).then(function(l){let h;if(r.isBone===!0?h=new Gs:l.length>1?h=new ln:l.length===1?h=l[0]:h=new xt,h!==l[0])for(let u=0,d=l.length;u<d;u++)h.add(l[u]);if(r.name&&(h.userData.name=r.name,h.name=a),jn(h,r),r.extensions&&ms(n,h,r),r.matrix!==void 0){let u=new We;u.fromArray(r.matrix),h.applyMatrix4(u)}else r.translation!==void 0&&h.position.fromArray(r.translation),r.rotation!==void 0&&h.quaternion.fromArray(r.rotation),r.scale!==void 0&&h.scale.fromArray(r.scale);if(!s.associations.has(h))s.associations.set(h,{});else if(r.mesh!==void 0&&s.meshCache.refs[r.mesh]>1){let u=s.associations.get(h);s.associations.set(h,{...u})}return s.associations.get(h).nodes=e,h}),this.nodeCache[e]}loadScene(e){let t=this.extensions,n=this.json.scenes[e],s=this,r=new ln;n.name&&(r.name=s.createUniqueName(n.name)),jn(r,n),n.extensions&&ms(t,r,n);let a=n.nodes||[],o=[];for(let c=0,l=a.length;c<l;c++)o.push(s.getDependency("node",a[c]));return Promise.all(o).then(function(c){for(let h=0,u=c.length;h<u;h++)r.add(c[h]);let l=h=>{let u=new Map;for(let[d,f]of s.associations)(d instanceof en||d instanceof Nt)&&u.set(d,f);return h.traverse(d=>{let f=s.associations.get(d);f!=null&&u.set(d,f)}),u};return s.associations=l(r),r})}_createAnimationTracks(e,t,n,s,r){let a=[],o=e.name?e.name:e.uuid,c=[];Oi[r.path]===Oi.weights?e.traverse(function(d){d.morphTargetInfluences&&c.push(d.name?d.name:d.uuid)}):c.push(o);let l;switch(Oi[r.path]){case Oi.weights:l=Gn;break;case Oi.rotation:l=Wn;break;case Oi.translation:case Oi.scale:l=Xn;break;default:switch(n.itemSize){case 1:l=Gn;break;case 2:case 3:default:l=Xn;break}break}let h=s.interpolation!==void 0?Kv[s.interpolation]:ji,u=this._getArrayFromAccessor(n);for(let d=0,f=c.length;d<f;d++){let g=new l(c[d]+"."+Oi[r.path],t.array,u,h);s.interpolation==="CUBICSPLINE"&&this._createCubicSplineTrackInterpolant(g),a.push(g)}return a}_getArrayFromAccessor(e){let t=e.array;if(e.normalized){let n=Nu(t.constructor),s=new Float32Array(t.length);for(let r=0,a=t.length;r<a;r++)s[r]=t[r]*n;t=s}return t}_createCubicSplineTrackInterpolant(e){e.createInterpolant=function(n){let s=this instanceof Wn?Lu:Qc;return new s(this.times,this.values,this.getValueSize()/3,n)},e.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline=!0}};function tb(i,e,t){let n=e.attributes,s=new Zt;if(n.POSITION!==void 0){let o=t.json.accessors[n.POSITION],c=o.min,l=o.max;if(c!==void 0&&l!==void 0){if(s.set(new D(c[0],c[1],c[2]),new D(l[0],l[1],l[2])),o.normalized){let h=Nu(mr[o.componentType]);s.min.multiplyScalar(h),s.max.multiplyScalar(h)}}else{console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");return}}else return;let r=e.targets;if(r!==void 0){let o=new D,c=new D;for(let l=0,h=r.length;l<h;l++){let u=r[l];if(u.POSITION!==void 0){let d=t.json.accessors[u.POSITION],f=d.min,g=d.max;if(f!==void 0&&g!==void 0){if(c.setX(Math.max(Math.abs(f[0]),Math.abs(g[0]))),c.setY(Math.max(Math.abs(f[1]),Math.abs(g[1]))),c.setZ(Math.max(Math.abs(f[2]),Math.abs(g[2]))),d.normalized){let x=Nu(mr[d.componentType]);c.multiplyScalar(x)}o.max(c)}else console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.")}}s.expandByVector(o)}i.boundingBox=s;let a=new Qt;s.getCenter(a.center),a.radius=s.min.distanceTo(s.max)/2,i.boundingSphere=a}function Wp(i,e,t){let n=e.attributes,s=[];function r(a,o){return t.getDependency("accessor",a).then(function(c){i.setAttribute(o,c)})}for(let a in n){let o=Du[a]||a.toLowerCase();o in i.attributes||s.push(r(n[a],o))}if(e.indices!==void 0&&!i.index){let a=t.getDependency("accessor",e.indices).then(function(o){i.setIndex(o)});s.push(a)}return tt.workingColorSpace!==Bt&&"COLOR_0"in n&&console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${tt.workingColorSpace}" not supported.`),jn(i,e),tb(i,e,t),Promise.all(s).then(function(){return e.targets!==void 0?Jv(i,e.targets,t):i})}var qp={type:"change"},Fu={type:"start"},Kp={type:"end"},el=new oi,Yp=new gn,nb=Math.cos(70*Ma.DEG2RAD),Pt=new D,sn=2*Math.PI,dt={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Ou=1e-6,tl=class extends ga{constructor(e,t=null){super(e,t),this.state=dt.NONE,this.target=new D,this.cursor=new D,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:Ii.ROTATE,MIDDLE:Ii.DOLLY,RIGHT:Ii.PAN},this.touches={ONE:Pi.ROTATE,TWO:Pi.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this._lastPosition=new D,this._lastQuaternion=new Kt,this._lastTargetPosition=new D,this._quat=new Kt().setFromUnitVectors(e.up,new D(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new er,this._sphericalDelta=new er,this._scale=1,this._panOffset=new D,this._rotateStart=new ie,this._rotateEnd=new ie,this._rotateDelta=new ie,this._panStart=new ie,this._panEnd=new ie,this._panDelta=new ie,this._dollyStart=new ie,this._dollyEnd=new ie,this._dollyDelta=new ie,this._dollyDirection=new D,this._mouse=new ie,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=sb.bind(this),this._onPointerDown=ib.bind(this),this._onPointerUp=rb.bind(this),this._onContextMenu=db.bind(this),this._onMouseWheel=cb.bind(this),this._onKeyDown=lb.bind(this),this._onTouchStart=hb.bind(this),this._onTouchMove=ub.bind(this),this._onMouseDown=ab.bind(this),this._onMouseMove=ob.bind(this),this._interceptControlDown=fb.bind(this),this._interceptControlUp=pb.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(qp),this.update(),this.state=dt.NONE}update(e=null){let t=this.object.position;Pt.copy(t).sub(this.target),Pt.applyQuaternion(this._quat),this._spherical.setFromVector3(Pt),this.autoRotate&&this.state===dt.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,s=this.maxAzimuthAngle;isFinite(n)&&isFinite(s)&&(n<-Math.PI?n+=sn:n>Math.PI&&(n-=sn),s<-Math.PI?s+=sn:s>Math.PI&&(s-=sn),n<=s?this._spherical.theta=Math.max(n,Math.min(s,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+s)/2?Math.max(n,this._spherical.theta):Math.min(s,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let a=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=a!=this._spherical.radius}if(Pt.setFromSpherical(this._spherical),Pt.applyQuaternion(this._quatInverse),t.copy(this.target).add(Pt),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let a=null;if(this.object.isPerspectiveCamera){let o=Pt.length();a=this._clampDistance(o*this._scale);let c=o-a;this.object.position.addScaledVector(this._dollyDirection,c),this.object.updateMatrixWorld(),r=!!c}else if(this.object.isOrthographicCamera){let o=new D(this._mouse.x,this._mouse.y,0);o.unproject(this.object);let c=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=c!==this.object.zoom;let l=new D(this._mouse.x,this._mouse.y,0);l.unproject(this.object),this.object.position.sub(l).add(o),this.object.updateMatrixWorld(),a=Pt.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;a!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(a).add(this.object.position):(el.origin.copy(this.object.position),el.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(el.direction))<nb?this.object.lookAt(this.target):(Yp.setFromNormalAndCoplanarPoint(this.object.up,this.target),el.intersectPlane(Yp,this.target))))}else if(this.object.isOrthographicCamera){let a=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),a!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>Ou||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Ou||this._lastTargetPosition.distanceToSquared(this.target)>Ou?(this.dispatchEvent(qp),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?sn/60*this.autoRotateSpeed*e:sn/60/60*this.autoRotateSpeed}_getZoomScale(e){let t=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){Pt.setFromMatrixColumn(t,0),Pt.multiplyScalar(-e),this._panOffset.add(Pt)}_panUp(e,t){this.screenSpacePanning===!0?Pt.setFromMatrixColumn(t,1):(Pt.setFromMatrixColumn(t,0),Pt.crossVectors(this.object.up,Pt)),Pt.multiplyScalar(e),this._panOffset.add(Pt)}_pan(e,t){let n=this.domElement;if(this.object.isPerspectiveCamera){let s=this.object.position;Pt.copy(s).sub(this.target);let r=Pt.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*r/n.clientHeight,this.object.matrix),this._panUp(2*t*r/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let n=this.domElement.getBoundingClientRect(),s=e-n.left,r=t-n.top,a=n.width,o=n.height;this._mouse.x=s/a*2-1,this._mouse.y=-(r/o)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let t=this.domElement;this._rotateLeft(sn*this._rotateDelta.x/t.clientHeight),this._rotateUp(sn*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(sn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-sn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(sn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-sn*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._rotateStart.set(n,s)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._panStart.set(n,s)}}_handleTouchStartDolly(e){let t=this._getSecondPointerPosition(e),n=e.pageX-t.x,s=e.pageY-t.y,r=Math.sqrt(n*n+s*s);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{let n=this._getSecondPointerPosition(e),s=.5*(e.pageX+n.x),r=.5*(e.pageY+n.y);this._rotateEnd.set(s,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let t=this.domElement;this._rotateLeft(sn*this._rotateDelta.x/t.clientHeight),this._rotateUp(sn*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._panEnd.set(n,s)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){let t=this._getSecondPointerPosition(e),n=e.pageX-t.x,s=e.pageY-t.y,r=Math.sqrt(n*n+s*s);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let a=(e.pageX+t.x)*.5,o=(e.pageY+t.y)*.5;this._updateZoomParameters(a,o)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new ie,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){let t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){let t=e.deltaMode,n={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}};function ib(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i)))}function sb(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function rb(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Kp),this.state=dt.NONE;break;case 1:let e=this._pointers[0],t=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:t.x,pageY:t.y});break}}function ab(i){let e;switch(i.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case Ii.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=dt.DOLLY;break;case Ii.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=dt.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=dt.ROTATE}break;case Ii.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=dt.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=dt.PAN}break;default:this.state=dt.NONE}this.state!==dt.NONE&&this.dispatchEvent(Fu)}function ob(i){switch(this.state){case dt.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case dt.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case dt.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function cb(i){this.enabled===!1||this.enableZoom===!1||this.state!==dt.NONE||(i.preventDefault(),this.dispatchEvent(Fu),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(Kp))}function lb(i){this.enabled!==!1&&this._handleKeyDown(i)}function hb(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case Pi.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(i),this.state=dt.TOUCH_ROTATE;break;case Pi.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(i),this.state=dt.TOUCH_PAN;break;default:this.state=dt.NONE}break;case 2:switch(this.touches.TWO){case Pi.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=dt.TOUCH_DOLLY_PAN;break;case Pi.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=dt.TOUCH_DOLLY_ROTATE;break;default:this.state=dt.NONE}break;default:this.state=dt.NONE}this.state!==dt.NONE&&this.dispatchEvent(Fu)}function ub(i){switch(this._trackPointer(i),this.state){case dt.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case dt.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case dt.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case dt.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=dt.NONE}}function db(i){this.enabled!==!1&&i.preventDefault()}function fb(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function pb(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}var mb=/\.(gltf|glb|bin|png|jpe?g|webp)$/i;function Jp(i,e=!1){let t=i;try{e&&(t=decodeURIComponent(i))}catch{throw Error("\u30E2\u30C7\u30EB\u306E\u53C2\u7167\u30D5\u30A1\u30A4\u30EB\u540D\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002")}let n=t.replaceAll("\\","/").replace(/^\.\//,"");if(!n||n.startsWith("/")||n.split("/").includes("..")||/^[a-z]+:/i.test(n)||/[\x00-\x1f]/.test(n))throw Error("\u30E2\u30C7\u30EB\u306B\u5916\u90E8URL\u3084\u5B89\u5168\u306B\u6271\u3048\u306A\u3044\u30D5\u30A1\u30A4\u30EB\u540D\u304C\u542B\u307E\u308C\u3066\u3044\u307E\u3059\u3002");return n}async function jp(i,e){if(!i.length||i.length>20)throw Error("\u30E2\u30C7\u30EB\u672C\u4F53\u3068\u95A2\u9023\u30D5\u30A1\u30A4\u30EB\u3092\u5408\u308F\u305B\u30661\u301C20\u30D5\u30A1\u30A4\u30EB\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002");let t=i.reduce((a,o)=>a+o.size,0);if(t>500*1024*1024||!t)throw Error("\u30E2\u30C7\u30EB\u672C\u4F53\u3068\u95A2\u9023\u30D5\u30A1\u30A4\u30EB\u3092\u5408\u308F\u305B\u3066500MB\u4EE5\u5185\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002");i=await normalizeStlFiles(i);let n=i.map(a=>({name:Jp(a.webkitRelativePath||a.name),blob:a}));if(n.some(a=>!mb.test(a.name)))throw Error("\u30E2\u30C7\u30EB\u672C\u4F53\u30FBBIN\u30FBPNG\u30FBJPEG\u30FBWebP\u3060\u3051\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002");if(new Set(n.map(a=>a.name)).size!==n.length)throw Error("\u540C\u3058\u540D\u524D\u306E\u30D5\u30A1\u30A4\u30EB\u304C\u542B\u307E\u308C\u3066\u3044\u307E\u3059\u3002");let s=n.filter(a=>/\.(gltf|glb)$/i.test(a.name));if(!s.length)throw Error("GLTF\u307E\u305F\u306FGLB\u306E\u30E2\u30C7\u30EB\u672C\u4F53\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002");let r={root:s.some(a=>a.name===e)?e:s[0].name,roots:s.map(a=>a.name),files:n,total:t};for(let a of r.roots)await $p({...r,root:a});return r}async function $p(i){let e=i.files.find(c=>c.name===i.root);if(!e)throw Error("3D\u30E2\u30C7\u30EB\u672C\u4F53\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002");let t;try{if(/\.glb$/i.test(i.root)){let c=await e.blob.slice(0,20).arrayBuffer(),l=new DataView(c);if(c.byteLength<20||l.getUint32(0,!0)!==1179937895||l.getUint32(4,!0)!==2||l.getUint32(8,!0)!==e.blob.size||l.getUint32(16,!0)!==1313821514)throw Error();let h=l.getUint32(12,!0);if(h>e.blob.size-20)throw Error();t=JSON.parse(await e.blob.slice(20,20+h).text())}else t=JSON.parse(await e.blob.text())}catch{throw Error("3D\u30E2\u30C7\u30EB\u306E\u5185\u5BB9\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3002GLTF 2.0\uFF0FGLB 2.0\u306E\u30D5\u30A1\u30A4\u30EB\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002")}if(t?.asset?.version!=="2.0")throw Error("GLTF 2.0\uFF0FGLB 2.0\u306B\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002");if((t.extensionsRequired||[]).some(c=>["KHR_draco_mesh_compression","EXT_meshopt_compression","KHR_texture_basisu"].includes(c)))throw Error("\u3053\u306E\u5F62\u5F0F\u306E\u5727\u7E2E\u30E2\u30C7\u30EB\u306F\u8868\u793A\u3067\u304D\u307E\u305B\u3093\u3002\u5727\u7E2E\u305B\u305AGLB\u3067\u66F8\u304D\u51FA\u3057\u3066\u304F\u3060\u3055\u3044\u3002");for(let c of[...t.buffers||[],...t.images||[]])if(c.uri){if(typeof c.uri!="string")throw Error("\u30E2\u30C7\u30EB\u306E\u53C2\u7167\u30D5\u30A1\u30A4\u30EB\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002");if(c.uri.startsWith("data:")){if(!/^data:(application\/(octet-stream|gltf-buffer)|image\/(png|jpeg|webp));base64,/i.test(c.uri))throw Error("\u30E2\u30C7\u30EB\u306B\u5BFE\u5FDC\u3057\u3066\u3044\u306A\u3044\u57CB\u3081\u8FBC\u307F\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u3059\u3002");continue}Qp(i,c.uri)}if((t.nodes?.length||0)>1e4||(t.meshes?.length||0)>1e4)throw Error("\u30E2\u30C7\u30EB\u304C\u8907\u96D1\u3059\u304E\u307E\u3059\u3002\u8EFD\u91CF\u5316\u3057\u3066\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002");let s=0,r={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4},a={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16};for(let c of t.accessors||[]){if(!Number.isSafeInteger(c.count)||c.count<0||!r[c.componentType]||!a[c.type])throw Error("\u30E2\u30C7\u30EB\u306E\u9802\u70B9\u30C7\u30FC\u30BF\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002");if(s+=c.count*r[c.componentType]*a[c.type],!Number.isSafeInteger(s)||s>256*1024*1024)throw Error("\u30E2\u30C7\u30EB\u306E\u5C55\u958B\u5F8C\u30C7\u30FC\u30BF\u304C\u5927\u304D\u3059\u304E\u307E\u3059\u3002\u8EFD\u91CF\u5316\u3057\u3066\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002")}let o=0;for(let c of t.meshes||[])for(let l of c.primitives||[]){let h=t.accessors?.[l.attributes?.POSITION];if(o+=h?.count||0,o>2e6)throw Error("\u30E2\u30C7\u30EB\u306E\u9802\u70B9\u6570\u3092200\u4E07\u4EE5\u4E0B\u306B\u8EFD\u91CF\u5316\u3057\u3066\u304F\u3060\u3055\u3044\u3002")}return t}function Qp(i,e){let t=Jp(e,!0),n=t.split("/").pop(),s=i.files.find(a=>a.name===t||a.name===(i.root.includes("/")?i.root.slice(0,i.root.lastIndexOf("/")+1):"")+t);if(s)return s;let r=i.files.filter(a=>a.name.split("/").pop()===n);if(r.length===1)return r[0];throw Error("\u30E2\u30C7\u30EB\u306B\u5FC5\u8981\u306A\u300C"+n+"\u300D\u3082\u4E00\u7DD2\u306B\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002")}function Zp(i){if(!i)return;let e=new Set,t=new Set,n=new Set;i.traverse(s=>{s.geometry&&n.add(s.geometry);for(let r of Array.isArray(s.material)?s.material:s.material?[s.material]:[]){t.add(r);for(let a of Object.values(r))a?.isTexture&&e.add(a)}});for(let s of e)s.source?.data?.close?.(),s.dispose();for(let s of t)s.dispose();for(let s of n)s.dispose()}async function La(i){
  if (i.remoteFiles) {
    const rootFile = i.files.find(file => file.name === i.root);
    if (rootFile) await loadGalleryFile(rootFile);
  }
  const metadata = await $p(i);
  if (i.remoteFiles) {
    const resources = [...(metadata.buffers || []), ...(metadata.images || [])];
    await Promise.all(resources.filter(resource => resource.uri && !resource.uri.startsWith("data:"))
      .map(resource => loadGalleryFile(Qp(i, resource.uri))));
  }
let e=await i.files.find(a=>a.name===i.root).blob.arrayBuffer(),t=[],n=new $s;n.setURLModifier(a=>{if(a.startsWith("blob:"))return a;if(a.startsWith("data:")){if(!/^data:(application\/(octet-stream|gltf-buffer)|image\/(png|jpeg|webp));base64,/i.test(a))throw Error("\u5BFE\u5FDC\u3057\u3066\u3044\u306A\u3044\u30C7\u30FC\u30BF\u5F62\u5F0F\u3067\u3059\u3002");return a}let o=Qp(i,a),c=URL.createObjectURL(o.blob);return t.push(c),c});let s=new $c(n),r;try{r=await s.parseAsync(e,"");let a=0,o=new Set;if(r.scene.traverse(l=>{let h=l.geometry?.attributes?.position;a+=h?.count||0;let u=h?.array||h?.data?.array;if(u&&!o.has(u)){o.add(u);for(let d=0;d<u.length;d++)if(!Number.isFinite(u[d]))throw Error("\u30E2\u30C7\u30EB\u306E\u9802\u70B9\u306B\u4E0D\u6B63\u306A\u6570\u5024\u304C\u3042\u308A\u307E\u3059\u3002\u66F8\u304D\u51FA\u3057\u76F4\u3057\u3066\u304F\u3060\u3055\u3044\u3002")}}),a>2e6)throw Error("\u30E2\u30C7\u30EB\u304C\u5927\u304D\u3059\u304E\u307E\u3059\u3002\u9802\u70B9\u6570\u3092200\u4E07\u4EE5\u4E0B\u306B\u8EFD\u91CF\u5316\u3057\u3066\u304F\u3060\u3055\u3044\u3002");let c=new Zt().setFromObject(r.scene);if(c.isEmpty()||![...c.min.toArray(),...c.max.toArray()].every(Number.isFinite))throw Error("\u8868\u793A\u3067\u304D\u308B\u5F62\u72B6\u304C\u30E2\u30C7\u30EB\u306B\u3042\u308A\u307E\u305B\u3093\u3002");return{scene:r.scene,box:c,dispose(){Zp(r.scene),t.forEach(l=>URL.revokeObjectURL(l))}}}catch(a){throw r&&Zp(r.scene),t.forEach(o=>URL.revokeObjectURL(o)),Error(a.message?.includes("\u30E2\u30C7\u30EB")||a.message?.includes("\u9078\u3093\u3067")?a.message:"3D\u30E2\u30C7\u30EB\u3092\u958B\u3051\u307E\u305B\u3093\u3002\u88DC\u52A9\u30D5\u30A1\u30A4\u30EB\u3084\u66F8\u304D\u51FA\u3057\u5F62\u5F0F\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002")}}function watchGalleryViewer(viewer, controls) {
  const dialog = viewer.closest("#work-detail");
  if (!dialog) return null;
  const listeners = new AbortController();
  const options = {capture:true, passive:true, signal:listeners.signal};
  const pointers = new Set();
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let lastActivity = performance.now();
  function activity() {
    controls.autoRotate = false;
    lastActivity = performance.now();
  }
  for (const type of ["pointermove","click","wheel","keydown","scroll"]) {
    dialog.addEventListener(type, activity, options);
  }
  dialog.addEventListener("pointerdown", event => { pointers.add(event.pointerId); activity(); }, options);
  for (const type of ["pointerup","pointercancel"]) {
    window.addEventListener(type, event => { if (pointers.delete(event.pointerId)) activity(); }, options);
  }
  window.addEventListener("blur", () => { pointers.clear(); activity(); }, options);
  document.addEventListener("visibilitychange", activity, options);
  controls.autoRotateSpeed = 0.35;
  return {
    update() {
      if (document.hidden || !viewer.offsetParent || !dialog.open || pointers.size ||
          document.querySelector("dialog[open]:not(#work-detail)")) { activity(); return; }
      const elapsed = performance.now() - lastActivity;
      controls.autoRotate = elapsed >= 8000 && !reducedMotion.matches;
      if (elapsed >= 180000) {
        activity();
        history.replaceState(history.state, "", "#works");
        location.reload();
      }
    },
    dispose() { listeners.abort(); }
  };
}
function nl(i,e,t,n){let s;try{s=new zc({antialias:!0,alpha:!1})}catch{throw e.dispose(),Error("\u3053\u306E\u30D6\u30E9\u30A6\u30B6\u30FC\u3067\u306F3D\u8868\u793A\u3092\u5229\u7528\u3067\u304D\u307E\u305B\u3093\u3002\u5199\u771F\u30FB\u30E2\u30C7\u30EB\u753B\u50CF\u306F\u5F15\u304D\u7D9A\u304D\u78BA\u8A8D\u3067\u304D\u307E\u3059\u3002")}s.setPixelRatio(Math.min(window.devicePixelRatio||1,2)),s.setClearColor(ps(t)),s.outputColorSpace=Et,i.replaceChildren(s.domElement);let r=new Hr,a=new ln;a.add(e.scene);let o=e.box.getCenter(new D),c=e.box.getSize(new D),l=2/Math.max(c.x,c.y,c.z,1e-4);a.scale.setScalar(l),a.position.copy(o.multiplyScalar(-l)),r.add(a),r.add(new ua(16777215,6584414,3));let h=new Ri(16777215,3);h.position.set(3,5,4),r.add(h);let u=new Ri(16777215,1.5);u.position.set(-3,1,-3),r.add(u);let d=new At(38,1,.01,100),f=new tl(d,s.domElement);f.enableDamping=!0,f.minDistance=1.2,f.maxDistance=12;// Frame the normalized bounds against both viewport axes.
const axes=["x","y","z"].sort((a,b)=>c[a]-c[b]);
const thinAxis=c[axes[0]]<0.25*c[axes[1]] ? axes[0] : null;
const direction = new D(0.45,0.28,1);
if(thinAxis)direction[thinAxis]=2;
direction.normalize();
function frameDistance(sight,aspect){
  const right=new D().crossVectors(d.up,sight);
  if(right.lengthSq()<1e-10)right.set(1,0,0);
  right.normalize();
  const up=new D().crossVectors(sight,right);
  const vertical=Math.tan(d.fov*Math.PI/360), horizontal=vertical*aspect;
  let distance=f.minDistance;
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){
    const corner=new D(x*c.x,y*c.y,z*c.z).multiplyScalar(l/2);
    const depth=corner.dot(sight);
    distance=Math.max(distance,depth+1.08*Math.max(Math.abs(corner.dot(right))/horizontal,Math.abs(corner.dot(up))/vertical));
  }
  return distance;
}
function fitModel(sight=direction){
  const distance=frameDistance(sight,d.aspect);
  f.maxDistance=Math.max(12,distance*2);
  d.far=Math.max(100,f.maxDistance+4);
  d.updateProjectionMatrix();
  f.target.set(0,0,0);
  d.position.copy(sight).multiplyScalar(distance);
  f.update();
}
const saved=n&&[n.position,n.target].every(v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite))
  &&new D().fromArray(n.position).distanceTo(new D().fromArray(n.target))>0.001;
let initial=true;
const g=()=>fitModel();
function x(){
  const width=i.clientWidth,height=i.clientHeight;
  if(!width||!height)return;
  const aspect=width/height;
  if(!initial && aspect!==d.aspect){
    const offset=d.position.clone().sub(f.target);
    const sight=offset.clone().normalize();
    const fit=frameDistance(sight,aspect);
    const distance=offset.length()*fit/frameDistance(sight,d.aspect);
    f.maxDistance=Math.max(12,fit*2,distance);
    d.far=Math.max(100,f.maxDistance+4);
    d.position.copy(f.target).addScaledVector(sight,distance);
  }
  d.aspect=aspect; d.updateProjectionMatrix(); s.setSize(width,height,false);
  if(initial){
    initial=false;
    let initialDirection=direction;
    if(saved){
      const target=new D().fromArray(n.target);
      const sight=new D().fromArray(n.position).sub(target).normalize();
      if(!thinAxis||Math.abs(sight[thinAxis])>=0.35)initialDirection=sight;
    }
    fitModel(initialDirection);
  }
}
const m=new ResizeObserver(x);
const idle = watchGalleryViewer(i,f);
let previousFrame = performance.now();
return m.observe(i),x(),s.setAnimationLoop(()=>{
  const now = performance.now();
  idle?.update();
  if (i.offsetParent) { f.update(Math.min((now-previousFrame)/1000,0.1)); s.render(r,d); }
  previousFrame=now;
}),{reset:g,snapshot(){return f.update(),s.render(r,d),new Promise((p,M)=>s.domElement.toBlob(v=>v?p(v):M(Error("\u30E2\u30C7\u30EB\u753B\u50CF\u3092\u4F5C\u6210\u3067\u304D\u307E\u305B\u3093\u3002")),"image/png"))},getView(){return{position:d.position.toArray(),target:f.target.toArray()}},setBackground(p){s.setClearColor(ps(p))},dispose(){idle?.dispose(),m.disconnect(),s.setAnimationLoop(null),f.dispose(),e.dispose(),s.dispose(),s.forceContextLoss(),i.replaceChildren()}}}var C=i=>document.querySelector(i),dn=i=>[...document.querySelectorAll(i)],Ut=C("#entry-form"),_r=C("#submission"),Fn=C("#work-detail"),rl=!1,Na=null,al=crypto.randomUUID(),Un=[],xs=!1,Vu,ku,$n=null,On=0,wt=null,Ua=null,Da=new Map,zu=[],ol=[],em,gr=!1,bt=null,xi=0,Wt=null,Ye=null,nm=zp(Ut),hl=qc(Xc(Ut,{key:()=>Ye?.id||"new",extra:()=>({pendingId:al,kept:Ye?.model.files.map(i=>i.name),view:bt?.getView()||Wt}),restoreExtra:i=>{!Ye&&i?.pendingId&&(al=i.pendingId),Ye&&i?.kept&&(Ye.model={...Ye.model,files:Ye.model.files.filter(e=>i.kept.includes(e.name))},ul()),Wt=i?.view||Wt}}));function Xt(i){C("#toast").textContent=i,C("#toast").hidden=!1,clearTimeout(em),em=setTimeout(()=>C("#toast").hidden=!0,4500)}var Hu=new Promise((i,e)=>{try{let t=indexedDB.open("spool-event-prototype-v1",1);t.onupgradeneeded=()=>t.result.createObjectStore("works",{keyPath:"id"}),t.onsuccess=()=>{let n=t.result;n.onversionchange=()=>n.close(),i(n)},t.onerror=()=>e(Error("\u30C6\u30B9\u30C8\u6295\u7A3F\u306E\u4FDD\u5B58\u5148\u3092\u958B\u3051\u307E\u305B\u3093\u3002\u30D6\u30E9\u30A6\u30B6\u30FC\u306E\u4FDD\u5B58\u8A2D\u5B9A\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002")),t.onblocked=()=>e(Error("\u5225\u306E\u30BF\u30D6\u3092\u9589\u3058\u3066\u304B\u3089\u518D\u8AAD\u307F\u8FBC\u307F\u3057\u3066\u304F\u3060\u3055\u3044\u3002"))}catch{e(Error("\u3053\u306E\u30D6\u30E9\u30A6\u30B6\u30FC\u3067\u306F\u6295\u7A3F\u3092\u4FDD\u5B58\u3067\u304D\u307E\u305B\u3093\u3002\u4FDD\u5B58\u8A2D\u5B9A\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002"))}});Hu.catch(()=>{});async function Gu(i,e){let t=await Hu;return new Promise((n,s)=>{let r=t.transaction("works",i),a=e(r.objectStore("works")),o;a.onsuccess=()=>o=a.result,r.oncomplete=()=>n(o),r.onerror=r.onabort=()=>s(Error("\u6295\u7A3F\u306E\u4FDD\u5B58\u30FB\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u7AEF\u672B\u306E\u7A7A\u304D\u5BB9\u91CF\u3084\u30D6\u30E9\u30A6\u30B6\u30FC\u306E\u4FDD\u5B58\u8A2D\u5B9A\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u5165\u529B\u5185\u5BB9\u306F\u4FDD\u6301\u3055\u308C\u3066\u3044\u307E\u3059\u3002"))})}function xr(i){i.splice(0).forEach(e=>URL.revokeObjectURL(e))}function Wu(i,e){let t=URL.createObjectURL(i);return e.push(t),t}function Xu(){let i=C("#work-search").value.normalize("NFKC").toLocaleLowerCase().trim();return Un.filter(e=>(C("#show-hidden").checked||e.visibility!=="hidden")&&(!i||[e.title,e.author,e.comment].some(t=>(t||"").normalize("NFKC").toLocaleLowerCase().includes(i)))).sort((e,t)=>{let n=C("#sort-by").value==="reactions"?tu(e.id)-tu(t.id):e.createdAt-t.createdAt;return(gr?1:-1)*n||e.id.localeCompare(t.id)})}function Bn(){
  const thumbnails = new Map(Array.from(C("#gallery").querySelectorAll("img"), image => [image.src,image]));
C("#sort-by option[value=date]").textContent=gr?"\u53E4\u3044\u9806":"\u65B0\u7740\u9806",C("#sort-by option[value=reactions]").textContent=gr?"\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u304C\u5C11\u306A\u3044\u9806":"\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u304C\u591A\u3044\u9806",xr(zu);let i=Xu().map(e=>{let t=document.createElement("button");t.type="button",t.className="work-card",t.dataset.workId=e.id;const src=e.modelPhotoURL||Wu(e.modelPhoto,zu);
let n=thumbnails.get(new URL(src,location.href).href);
if (!n) { n=document.createElement("img"); n.loading="lazy"; n.decoding="async"; n.src=src; }
n.alt=e.title+"\u306E\u30E2\u30C7\u30EB\u753B\u50CF",n.loading="lazy";let s=document.createElement("strong");s.textContent=e.title+(e.visibility==="hidden"?"\uFF08\u975E\u516C\u958B\uFF09":"");let r=document.createElement("small");r.textContent=e.author||"\u4F5C\u8005\u540D\u306A\u3057",t.append(n,s,r),t.addEventListener("click",()=>sm(e,t));let a=document.createElement("div");return a.className="work-tile",a.append(t,jc(e.id,Xt,!0)),a});C("#gallery").replaceChildren(...i),C("#empty-gallery").hidden=Un.length>0,C("#search-empty").hidden=i.length>0||!Un.length,C("#work-count").textContent=i.length+"\u4EF6",am()}async function Oa(){try{let i=[];try{if(Ie.environment!=="production")i=await Gu("readonly",n=>n.getAll())}catch(n){if(Ie.mode!=="shared")throw n}let e=Ie.mode==="shared"?await id():[],t=Ie.demoEnabled===!1||new URLSearchParams(location.search).has("qa-empty")?[]:(await Ta()).filter(n=>!Ie.removedDemos?.includes(n.id)&&!e.some(s=>s.id===n.id));t.forEach(n=>{n.visibility=Ie.hiddenDemos?.includes(n.id)?"hidden":"public",n.version=Ie.demoVersions?.[n.id]||1}),Un=[...i,...e,...t],C("#gallery-error").hidden=!0,C("#gallery-error").textContent="",Bn(),C("#admin-panel").open&&!C("#admin-works").hidden&&await _i()}catch(i){C("#gallery-error").textContent=i.message,C("#gallery-error").hidden=!1,C("#empty-gallery").hidden=!0}}async function gb(){try{await nd(),syncEventAdmin(Ie),rl=!0,dn("[data-open-submission]").forEach(i=>{i.hidden=i.disabled=Ie.user?.role==="guest"}),dr(Ie.content),Ie.environment==="production"&&(document.body.dataset.environment="production",C(".test-badge").hidden=!0,C(".test-notice").hidden=!0,C(".local-data").hidden=!0),await nu(),C("#storage-state").textContent=Ie.mode==="shared"?Ie.environment==="production"?"\u6295\u7A3F\u3068\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u306F\u30B5\u30FC\u30D0\u30FC\u306B\u4FDD\u5B58\u3055\u308C\u3001\u5229\u7528\u8005\u9593\u3067\u5171\u6709\u3055\u308C\u307E\u3059\u3002":"\u6295\u7A3F\u3068\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u306F\u30C6\u30B9\u30C8\u7528\u30B5\u30FC\u30D0\u30FC\u306B\u4FDD\u5B58\u3055\u308C\u3001\u95B2\u89A7\u3067\u304D\u308B\u5229\u7528\u8005\u9593\u3067\u5171\u6709\u3055\u308C\u307E\u3059\u3002":"\u3053\u306E\u30D6\u30E9\u30A6\u30B6\u30FC\u5185\u306E\u30C6\u30B9\u30C8\u7248\u3067\u3059\u3002",Ie.mode==="shared"&&(C(".test-notice span").textContent="\u30C6\u30B9\u30C8\u5C02\u7528\u306E\u5171\u6709\u4FDD\u5B58\u3067\u3059\u3002\u672C\u756A\u306E\u5728\u5EAB\u30FB\u4E88\u7D04\u306B\u306F\u63A5\u7D9A\u3057\u307E\u305B\u3093\u3002",C(".local-data p").textContent="\u65B0\u3057\u3044\u6295\u7A3F\u306F\u30C6\u30B9\u30C8\u5C02\u7528\u30B5\u30FC\u30D0\u30FC\u3078\u4FDD\u5B58\u3055\u308C\u307E\u3059\u3002\u4EE5\u524D\u306E\u30D6\u30E9\u30A6\u30B6\u30FC\u5185\u6295\u7A3F\u306F\u81EA\u52D5\u9001\u4FE1\u3057\u307E\u305B\u3093\u3002\u5FC5\u8981\u306A\u4F5C\u54C1\u306E\u307F\u8A73\u7D30\u304B\u3089\u5171\u6709\u3078\u79FB\u305B\u307E\u3059\u3002"),C("#reaction-settings-open").hidden=!Ie.canManage,C("#hidden-filter-label").hidden=!Ie.canManage,await Oa()}catch(i){rl=!1,dn("[data-open-submission]").forEach(e=>{e.hidden=e.disabled=!0}),C("#empty-gallery").hidden=!0,C("#gallery-error").hidden=!1,C("#gallery-error").textContent=i.message+" 「一覧を更新」で再試行できます。"}}C("#work-search").addEventListener("input",Bn);C("#sort-by").addEventListener("change",Bn);C("#sort-direction").addEventListener("click",()=>{gr=!gr,C("#sort-direction").textContent=gr?"\u6607\u9806 \u2191":"\u964D\u9806 \u2193",Bn()});C("#show-hidden").addEventListener("change",Bn);window.addEventListener("reactionschange",()=>{C("#sort-by").value==="reactions"&&Bn()});window.addEventListener("reactiontypeschange",()=>{Bn(),wt&&C("#detail-reactions").replaceChildren(jc(wt.id,Xt))});function xb(i){if(Ie.user?.role==="guest"){location.assign("../");return}if(!rl){Xt("\u30ED\u30B0\u30A4\u30F3\u72B6\u614B\u3084\u901A\u4FE1\u74B0\u5883\u3092\u78BA\u8A8D\u3057\u3001\u30DA\u30FC\u30B8\u3092\u518D\u8AAD\u307F\u8FBC\u307F\u3057\u3066\u304F\u3060\u3055\u3044\u3002");return}Ye&&(Ut.reset(),Ye=null,Wt=null,Object.keys(Fa).forEach(e=>gs(document.getElementById(e)))),Ku(),hl.reset(),Vu=i,C("#submission-error").hidden=!0,_r.showModal(),C("#work-title").focus()}function qu(){if(!(xs||!hl.confirmClose())){if(Wt=bt?.getView()||Wt,xi++,bt?.dispose(),bt=null,C("#submission-viewer").hidden=!0,C("#preview-tools").hidden=!0,C("#preview-model").disabled=!1,_r.close(),Na){let i=Na;return Na=null,C("#admin-panel").showModal(),_i().then(()=>{C(".admin-main").scrollTop=i.scroll,[...dn("#admin-work-list .admin-work-row")].find(t=>t.dataset.id===i.id)?.querySelector(".admin-edit")?.focus({preventScroll:!0})}),!0}return Vu?.focus(),!1}}dn("[data-open-submission]").forEach(i=>{i.hidden=true;i.disabled=true});dn("[data-open-submission]").forEach(i=>i.addEventListener("click",()=>xb(i)));dn("[data-close-submission]").forEach(i=>i.addEventListener("click",qu));_r.addEventListener("cancel",i=>{i.preventDefault(),qu()});dn("[data-event-jump]").forEach(i=>i.addEventListener("click",()=>{let e=document.getElementById(i.dataset.eventJump);if(e){for(let t=e;t;t=t.parentElement)t.tagName==="DETAILS"&&(t.open=!0);e.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"instant":"smooth",block:"start"}),e.focus({preventScroll:!0})}}));var Fa={"real-photo":{feedback:"real-feedback"},"model-photo":{feedback:"model-feedback"},"model-files":{feedback:"model-files-feedback"}};function gs(i){i.id==="model-files"&&(Wt=null,C("#preview-model-select").replaceChildren(),C("#preview-model-select-label").hidden=!0,xi++,bt?.dispose(),bt=null,C("#preview-model").disabled=!1,C("#submission-viewer").hidden=!0,C("#preview-tools").hidden=!0,C("#preview-status").textContent="");let e=i.id==="model-files",t=[...i.files],n=i.closest(".file-drop"),s=document.getElementById(Fa[i.id].feedback);Da.has(i.id)&&(URL.revokeObjectURL(Da.get(i.id)),Da.delete(i.id));let r=n.querySelector("img");if(r){r.hidden=!0,r.removeAttribute("src"),n.classList.remove("has-preview");let a=t[0]||(!e&&Ye?i.id==="real-photo"?Ye.realPhoto:Ye.modelPhoto:null);if(a&&/^image\/(png|jpeg|webp)$/.test(a.type)){let o=URL.createObjectURL(a);Da.set(i.id,o),r.src=o,r.hidden=!1,n.classList.add("has-preview")}}s.textContent=t.length?(e?t.length+`\u30D5\u30A1\u30A4\u30EB\u9078\u629E\uFF1A
`:"\u9078\u629E\u6E08\u307F\uFF1A")+t.map(a=>a.name).join(`
`):"",document.querySelector('[data-clear="'+i.id+'"]').hidden=!t.length,i.setCustomValidity(""),e&&Ye&&ul()}Object.keys(Fa).forEach(i=>{let e=document.getElementById(i),t=e.closest(".file-drop");e.addEventListener("change",()=>gs(e)),t.addEventListener("dragover",n=>{n.preventDefault(),xs||t.classList.add("is-over")}),t.addEventListener("dragleave",()=>t.classList.remove("is-over")),t.addEventListener("drop",n=>{if(n.preventDefault(),t.classList.remove("is-over"),xs)return;let s=[...n.dataTransfer.files];if(!s.length)return;if(!e.multiple&&s.length>1){Xt("\u5199\u771F\u306F1\u679A\u305A\u3064\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002");return}let r=new DataTransfer;s.forEach(a=>r.items.add(a)),e.files=r.files,e.dispatchEvent(new Event("change",{bubbles:!0}))})});dn("[data-clear]").forEach(i=>i.addEventListener("click",()=>{let e=document.getElementById(i.dataset.clear);e.value="",e.dispatchEvent(new Event("change",{bubbles:!0}))}));async function il(i,e){if(!i||!/^image\/(png|jpeg|webp)$/.test(i.type)||!i.size||i.size>10*1024*1024)throw Error(e+"\u306FJPEG\u30FBPNG\u30FBWebP\u306710MB\u4EE5\u5185\u306E\u753B\u50CF\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002");let t;try{if(t=await createImageBitmap(i),t.width*t.height>4e7)throw Error()}catch{throw t?.close(),Error(e+"\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3002\u5225\u306E\u753B\u50CF\u3067\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002")}let n=Math.min(1,2048/Math.max(t.width,t.height)),s=document.createElement("canvas");return s.width=Math.max(1,Math.round(t.width*n)),s.height=Math.max(1,Math.round(t.height*n)),s.getContext("2d").drawImage(t,0,0,s.width,s.height),t.close(),new Promise((r,a)=>s.toBlob(o=>o?r(o):a(Error("\u753B\u50CF\u3092\u5909\u63DB\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002")),"image/webp",.9))}function Bu(i){
  for (const panel of Ut.querySelectorAll("#entry-fields, .draft-tools, .entry-checklist")) panel.inert=i;
  xs=i,i&&ut(Ut,"saving"),C("#entry-fields").disabled=i,dn("[data-close-submission]").forEach(e=>e.disabled=i),C("#post-button").disabled=i,C("#post-button").textContent=i?"\u4FDD\u5B58\u4E2D\u2026":Ye?"\u5909\u66F4\u3092\u4FDD\u5B58":Ie.environment==="production"?"\u6295\u7A3F\u3059\u308B":"\u30C6\u30B9\u30C8\u6295\u7A3F\u3059\u308B",C("#save-progress").hidden=!i,C("#upload-meter").hidden=!i,C("#upload-cancel").hidden=!0,C("#upload-cancel").disabled=!1,i&&(C("#upload-meter").value=0,C("#upload-cancel").textContent="\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u3092\u4E2D\u65AD"),_r.setAttribute("aria-busy",String(i))}Ut.addEventListener("submit",async i=>{if(i.preventDefault(),xs)return;if(!confirmStl([...C("#model-files").files]))return;if(!rl){C("#submission-error").hidden=!1,C("#submission-error").textContent="\u30ED\u30B0\u30A4\u30F3\u72B6\u614B\u3084\u901A\u4FE1\u74B0\u5883\u3092\u78BA\u8A8D\u3057\u3001\u30DA\u30FC\u30B8\u3092\u518D\u8AAD\u307F\u8FBC\u307F\u3057\u3066\u304F\u3060\u3055\u3044\u3002";return}let e=Ut.elements.title.value.trim(),t=Ut.elements.comment.value.trim(),n=Ut.elements.author.value.trim();if(C("#submission-error").hidden=!0,!e||!t){C("#submission-error").textContent="\u4F5C\u54C1\u540D\u3068\u4F5C\u54C1\u3078\u306E\u4E00\u8A00\u306B\u306F\u3001\u7A7A\u767D\u4EE5\u5916\u306E\u6587\u5B57\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",C("#submission-error").hidden=!1,C(e?"#work-comment":"#work-title").focus();return}Bu(!0);try{(Ie.mode!=="shared"||Ye&&!Ye.shared&&!Ye.isDemo)&&await Hu,C("#save-progress").textContent="\u5199\u771F\u3092\u78BA\u8A8D\u3057\u3066\u3044\u307E\u3059\u2026";let[s,r]=await Promise.all([C("#real-photo").files[0]?il(C("#real-photo").files[0],"\u5B9F\u7269\u5199\u771F"):Ye?.realPhoto||il(null,"\u5B9F\u7269\u5199\u771F"),C("#model-photo").files[0]?il(C("#model-photo").files[0],"\u30E2\u30C7\u30EB\u753B\u50CF"):Ye?.modelPhoto||il(null,"\u30E2\u30C7\u30EB\u753B\u50CF")]);C("#save-progress").textContent="3D\u30E2\u30C7\u30EB\u3092\u78BA\u8A8D\u3057\u3066\u3044\u307E\u3059\u2026";let a=await fm(C("#preview-model-select").value),o=C("#preview-model-select").value;a.files.some(h=>h.name===o&&/\.(gltf|glb)$/i.test(h.name))&&(a.root=o);for(let h of a.files.filter(u=>/\.(gltf|glb)$/i.test(u.name)).map(u=>u.name))(await La({...a,root:h})).dispose();let c={...Ye,id:Ye?.id||al,title:e,comment:t,author:n,realPhoto:s,modelPhoto:r,model:a,backgroundColor:nm(),modelView:bt?.getView()||Wt,createdAt:Ye?.createdAt||Date.now()};C("#save-progress").textContent=Ie.mode==="shared"?"\u5171\u6709\u30B5\u30FC\u30D0\u30FC\u306B\u4FDD\u5B58\u3057\u3066\u3044\u307E\u3059\u2026":"\u3053\u306E\u30D6\u30E9\u30A6\u30B6\u30FC\u306B\u4FDD\u5B58\u3057\u3066\u3044\u307E\u3059\u2026",Ie.mode==="shared"&&(!Ye||Ye.shared||Ye.isDemo)?(await ml(c,!!Ye),await Oa()):(await Gu("readwrite",h=>Ye?h.put(c):h.add(c)),Un=Un.filter(h=>h.id!==c.id),Un.unshift(c),Bn()),await hl.clear(),al=crypto.randomUUID(),Ut.reset(),Ye=null,Ku(),Wt=null,C("#preview-model-select").replaceChildren(),C("#preview-model-select-label").hidden=!0,xi++,bt?.dispose(),bt=null,C("#submission-viewer").hidden=!0,C("#preview-tools").hidden=!0,Object.keys(Fa).forEach(h=>gs(document.getElementById(h))),Bu(!1),qu()||(C("#works").scrollIntoView({block:"start"}),C("#works").focus({preventScroll:!0})),Xt(Ie.mode==="shared"?"\u4F5C\u54C1\u3092\u30B5\u30FC\u30D0\u30FC\u306B\u4FDD\u5B58\u3057\u307E\u3057\u305F\u3002":"\u30C6\u30B9\u30C8\u6295\u7A3F\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F\u3002")}catch(s){ut(Ut,"error"),C("#submission-error").textContent=s.message||"\u6295\u7A3F\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u5165\u529B\u5185\u5BB9\u306F\u4FDD\u6301\u3055\u308C\u3066\u3044\u307E\u3059\u3002",C("#submission-error").hidden=!1,C("#submission-error").scrollIntoView({block:"nearest"})}finally{Bu(!1)}});const detailPhotos = new Map();
function updateDetailPhotoState(image) {
  if (image !== C("#detail-photo-img") || !wt) return;
  const failed=image.complete && !image.naturalWidth;
  image.hidden=failed;
  C("#detail-photo-error").hidden=!failed;
}
C("#retry-detail-photo").addEventListener("click",()=>{
  const tab=C('[data-media][aria-pressed="true"]');
  if(wt && tab && tab.dataset.media!=="model")im(tab.dataset.media);
});
function detailPhoto(media) {
  if (!wt) return;
  let image = detailPhotos.get(media);
  if (!image || (image.complete && !image.naturalWidth)) {
    image = new Image();
    image.decoding = "async";
    image.addEventListener("load",()=>updateDetailPhotoState(image));
    image.addEventListener("error",()=>updateDetailPhotoState(image));
    image.src = (media==="real" ? wt.realPhotoURL : wt.modelPhotoURL) ||
      Wu(media==="real" ? wt.realPhoto : wt.modelPhoto, ol);
    detailPhotos.set(media, image);
  }
  return image;
}
for (const tab of dn("[data-media=real],[data-media=image]")) {
  for (const type of ["pointerenter","focus","pointerdown"])
    tab.addEventListener(type, () => detailPhoto(tab.dataset.media));
}
function showDetailPhoto(media) {
  const current = C("#detail-photo-img");
  const image = detailPhoto(media);
  if (image !== current) {
    current.removeAttribute("id");
    image.id = "detail-photo-img";
    current.replaceWith(image);
  }
  updateDetailPhotoState(image);
}
function im(i){dn("[data-media]").forEach(e=>e.setAttribute("aria-pressed",String(e.dataset.media===i))),C("#viewer-panel").hidden=i!=="model",C("#detail-photo").hidden=i==="model",C("#reset-view").hidden=i!=="model",C("#viewer-help").hidden=i!=="model",C("#detail-photo-caption").hidden=i==="model",C("#viewer-status").hidden=i!=="model"||!C("#viewer-status").textContent,i!=="model"&&wt&&(showDetailPhoto(i),C("#detail-photo-img").alt=wt.title+(i==="real"?"\u306E\u5B9F\u7269\u5199\u771F":"\u306E\u30E2\u30C7\u30EB\u753B\u50CF"),C("#detail-photo-caption").textContent=i==="real"?wt.isDemo?"\u30C7\u30E2\u7528\u30A4\u30E1\u30FC\u30B8\uFF08\u5B9F\u7269\u5199\u771F\u3067\u306F\u3042\u308A\u307E\u305B\u3093\uFF09":"\u5B9F\u7269\u5199\u771F":"\u30E2\u30C7\u30EB\u753B\u50CF")}dn("[data-media]").forEach(i=>i.addEventListener("click",()=>im(i.dataset.media)));async function sm(i,e){detailPhotos.clear();xr(ol);$n?.dispose(),$n=null,Ua=null,C("#detail-model-select-label").hidden=!0,C("#detail-model-select").replaceChildren(),ku=e,wt=i;let t=++On;am(),C("#detail-title").textContent=i.title,C("#detail-author").textContent=i.author?"\u4F5C\u8005\uFF1A"+i.author:"\u4F5C\u8005\u540D\u306A\u3057",C("#detail-comment").textContent=i.comment,C("#detail-reactions").replaceChildren(jc(i.id,Xt)),C("#detail-model-name").textContent=i.model.root,C("#detail-date").textContent=new Intl.DateTimeFormat("ja-JP",{dateStyle:"medium",timeStyle:"short"}).format(i.createdAt),C("#work-metadata").open=!1,C("#work-visibility").hidden=!Ie.canManage||!i.shared&&!i.isDemo,C("#work-visibility").textContent=i.visibility==="hidden"?"\u516C\u958B\u3059\u308B":"\u975E\u516C\u958B\u306B\u3059\u308B",C("#edit-work").hidden=!Ie.canManage,C("#share-local-work").hidden=Ie.mode!=="shared"||!!i.shared||!!i.isDemo,C(".local-only").hidden=!!(i.shared&&!i.isDemo&&Ie.environment==="production"),C(".local-only").textContent=i.isDemo?"\u30C7\u30E2\u4F5C\u54C1\uFF08\u5B9F\u969B\u306E\u5FDC\u52DF\u3067\u306F\u3042\u308A\u307E\u305B\u3093\uFF09":i.shared?Ie.environment==="production"?"\u6295\u7A3F\u4F5C\u54C1":"\u5171\u6709\u30C6\u30B9\u30C8\u6295\u7A3F":"\u3053\u306E\u30D6\u30E9\u30A6\u30B6\u30FC\u5185\u306E\u30C6\u30B9\u30C8\u6295\u7A3F",document.querySelector("[data-media=real]").textContent=i.isDemo?"\u30C7\u30E2\u753B\u50CF":"\u5B9F\u7269\u5199\u771F",C("#viewer-status").textContent="3D\u30E2\u30C7\u30EB\u3092\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026",C("#viewer-status").hidden=!1,C("#viewer").style.backgroundColor=ps(i.backgroundColor),C("#reset-view").disabled=!0,Fn.open||Fn.showModal(),Fn.querySelector(".dialog-body").scrollTop=0,im("model");try{let n=i.shared?await galleryModel(i):i.model;if(t!==On)return;Ua=n,um(C("#detail-model-select"),n,n.root),C("#detail-model-select-label").hidden=ll(n).length<2;let s=await La(n);if(t!==On){s.dispose();return}$n=nl(C("#viewer"),s,i.backgroundColor,i.modelView),C("#viewer-status").textContent="",C("#viewer-status").hidden=!0,C("#reset-view").disabled=!1}catch(n){t===On&&(C("#viewer-status").textContent=n.message,C("#viewer-status").hidden=C("#viewer-panel").hidden)}}function Ba(){detailPhotos.clear();On++,$n?.dispose(),$n=null,wt=null,Ua=null,xr(ol),C("#detail-photo-img").removeAttribute("src"),Fn.close(),([...document.querySelectorAll(".work-card")].find(i=>i.dataset.workId===ku?.dataset.workId)||ku)?.focus()}C("#close-detail").addEventListener("click",Ba);var cl=null;function rm(i){let e=Fn.getBoundingClientRect();return i.clientX<e.left||i.clientX>e.right||i.clientY<e.top||i.clientY>e.bottom}Fn.addEventListener("pointerdown",i=>{cl=i.target===Fn&&rm(i)?i.pointerId:null});Fn.addEventListener("click",i=>{let e=cl!==null&&i.target===Fn&&rm(i);cl=null,e&&Ba()});Fn.addEventListener("pointercancel",()=>{cl=null});Fn.addEventListener("cancel",i=>{i.preventDefault(),Ba()});C("#reset-view").addEventListener("click",()=>$n?.reset());window.addEventListener("pagehide",()=>{bt?.dispose(),$n?.dispose(),xr(zu),xr(ol),Da.forEach(i=>URL.revokeObjectURL(i))});function am(){let i=Xu();C(".detail-navigation").hidden=i.length<2;let e=i.findIndex(t=>t.id===wt?.id);C("#previous-work").disabled=e<=0,C("#next-work").disabled=e<0||e>=i.length-1,C("#work-position").textContent=e>=0?e+1+" / "+i.length:""}function om(i){let e=Xu(),t=e.findIndex(s=>s.id===wt?.id),n=e[t+i];n&&sm(n,[...document.querySelectorAll(".work-card")].find(s=>s.dataset.workId===n.id))}C("#previous-work").addEventListener("click",()=>om(-1));C("#next-work").addEventListener("click",()=>om(1));async function Yu(){let i=++xi;Wt=bt?.getView()||Wt,bt?.dispose(),bt=null,C("#preview-status").textContent="\u30E2\u30C7\u30EB\u3092\u78BA\u8A8D\u3057\u3066\u3044\u307E\u3059\u2026",C("#preview-model").disabled=!0;try{let e=await fm(C("#preview-model-select").value);if(i!==xi)return;let t=C("#preview-model-select").value;um(C("#preview-model-select"),e,ll(e).includes(t)?t:e.root),C("#preview-model-select-label").hidden=ll(e).length<2;let n=C("#preview-model-select").value,s=await La({...e,root:n});if(i!==xi){s.dispose();return}C("#submission-viewer").hidden=!1,C("#preview-tools").hidden=!1,bt=nl(C("#submission-viewer"),s,nm(),Wt),C("#preview-status").textContent=""}catch(e){i===xi&&(C("#preview-status").textContent=e.message,C("#submission-viewer").hidden=!0,C("#preview-tools").hidden=!0)}finally{i===xi&&(C("#preview-model").disabled=!1),pm.update()}}C("#preview-model").addEventListener("click",Yu);C("#preview-reset").addEventListener("click",()=>{bt?.reset(),Wt=null});Ut.addEventListener("backgroundchange",i=>bt?.setBackground(i.detail));C("#model-files").addEventListener("change", () => {
  if (C("#model-files").files.length) void Yu();
});
C("#work-visibility").addEventListener("click",async()=>{if(!wt)return;let i=wt;C("#work-visibility").disabled=!0;try{let e=i.visibility==="hidden"?"public":"hidden";await Ge("/works/"+i.id+"/visibility",{method:"PUT",body:JSON.stringify({visibility:e})}),i.visibility=e,C("#work-visibility").textContent=e==="hidden"?"\u516C\u958B\u3059\u308B":"\u975E\u516C\u958B\u306B\u3059\u308B",Bn(),Xt(e==="hidden"?"\u4F5C\u54C1\u3092\u975E\u516C\u958B\u306B\u3057\u307E\u3057\u305F\u3002":"\u4F5C\u54C1\u3092\u516C\u958B\u3057\u307E\u3057\u305F\u3002")}catch(e){Xt(e.message)}finally{C("#work-visibility").disabled=!1}});C("#share-local-work").addEventListener("click",async()=>{if(!wt||!confirm("\u3053\u306E\u4F5C\u54C1\u306E\u5199\u771F\u30683D\u30E2\u30C7\u30EB\u3092\u3001\u30C6\u30B9\u30C8\u7528\u306E\u5171\u6709\u4FDD\u5B58\u3078\u9001\u4FE1\u3057\u307E\u3059\u304B\uFF1F"))return;let i=wt;C("#share-local-work").disabled=!0;try{await ml(i),await Gu("readwrite",e=>e.delete(i.id)),Ba(),await Oa(),Xt("\u4F5C\u54C1\u3092\u5171\u6709\u4FDD\u5B58\u3078\u79FB\u3057\u307E\u3057\u305F\u3002")}catch(e){Xt(e.message)}finally{C("#share-local-work").disabled=!1}});function cm(i){let e=document.createElement("div");e.className="config-row",e.dataset.id=i.id;let t=document.createElement("input");t.value=i.icon,t.maxLength=12,t.required=!0,t.setAttribute("aria-label","\u30A2\u30A4\u30B3\u30F3"),t.className="config-icon";let n=document.createElement("input");n.value=i.label,n.maxLength=30,n.required=!0,n.setAttribute("aria-label","\u8868\u793A\u540D"),n.className="config-name";let s=document.createElement("input");s.type="checkbox",s.checked=i.enabled,s.className="config-enabled";let r=document.createElement("label");r.append(s,document.createTextNode("\u8868\u793A\u3059\u308B"));let a=document.createElement("button");a.type="button",a.className="danger config-remove",a.textContent="\u524A\u9664",a.setAttribute("aria-label","\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u3092\u524A\u9664"),a.addEventListener("click",()=>{if(confirm("\u3053\u306E\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u3092\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F\u4F5C\u54C1\u4E00\u89A7\u30FB\u4F5C\u54C1\u8A73\u7D30\u306B\u8868\u793A\u3055\u308C\u306A\u304F\u306A\u308A\u307E\u3059\u3002\u540C\u3058\u540D\u524D\u3067\u4F5C\u308A\u76F4\u3057\u3066\u3082\u3001\u4EE5\u524D\u306E\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u6570\u306F\u5F15\u304D\u7D99\u304C\u308C\u307E\u305B\u3093\u3002")){let u=e.closest("form");e.remove(),u?.dispatchEvent(new Event("input",{bubbles:!0}))}});let o=document.createElement("label");o.className="reaction-icon-field";let c=document.createElement("span");c.textContent="\u30A2\u30A4\u30B3\u30F3",o.append(c,t);let l=document.createElement("label");l.className="reaction-name-field";let h=document.createElement("span");return h.textContent="\u8868\u793A\u540D",l.append(h,n),e.append(Wa(e,i.label),o,l,r,a),e}C("#reaction-settings-add").addEventListener("click",()=>{if(C("#reaction-settings-rows").children.length>=8){C("#reaction-settings-error").textContent="\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u306F\u6700\u59278\u7A2E\u985E\u307E\u3067\u8FFD\u52A0\u3067\u304D\u307E\u3059\u3002";return}C("#reaction-settings-rows").append(cm({id:"reaction-"+crypto.randomUUID(),icon:"\u2728",label:"\u65B0\u3057\u3044\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3",enabled:!0})),C("#reaction-settings-form").dispatchEvent(new Event("input",{bubbles:!0}))});var Fi=rd({form:C("#reaction-settings-form"),rows:C("#reaction-settings-rows"),renderRow:cm,onSaved:i=>{Ie.reactions=i,C("#admin-error").textContent="",su(i.types)}}),Bi=document.createElement("button");Bi.type="button";Bi.className="secondary";Bi.textContent="\u4E00\u89A7\u3092\u66F4\u65B0";Bi.addEventListener("click",async()=>{Bi.disabled=!0;try{if(rl){await iu();await Oa()}else{await gb()}}catch(i){Xt(i.message)}finally{Bi.disabled=!1}});C(".gallery-controls").append(Bi);function Ku(){let i=!!Ye;C("#existing-assets").hidden=!i,C("#submission-title").textContent=i?"\u4F5C\u54C1\u3092\u7DE8\u96C6":"\u4F5C\u54C1\u3092\u6295\u7A3F",C("#post-button").textContent=i?"\u5909\u66F4\u3092\u4FDD\u5B58":Ie.environment==="production"?"\u6295\u7A3F\u3059\u308B":"\u30C6\u30B9\u30C8\u6295\u7A3F\u3059\u308B";for(let e of["real-photo","model-photo","model-files"])document.getElementById(e).required=!i}async function lm(i){if(!i)return;let e=On;C("#admin-panel").open&&(Na={scroll:C(".admin-main").scrollTop,id:i.id}),C("#edit-work").disabled=!0;try{let t=async a=>{let o=await fetch(a,{credentials:"same-origin"});if(!o.ok)throw Error("\u7DE8\u96C6\u7528\u306E\u753B\u50CF\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3002");return o.blob()},[n,s,r]=await Promise.all([i.realPhotoURL?t(i.realPhotoURL):i.realPhoto,i.modelPhotoURL?t(i.modelPhotoURL):i.modelPhoto,i.shared?pl(i):i.model]);if(On!==e||wt?.id!==i.id)return;Ba(),C("#admin-panel").close(),Ut.reset(),Object.keys(Fa).forEach(a=>gs(document.getElementById(a))),Ye={...i,realPhoto:n,modelPhoto:s,model:r},Wt=i.modelView||null,Ut.elements.title.value=i.title,Ut.elements.comment.value=i.comment,Ut.elements.author.value=i.author||"",C("#background-hex").value=ps(i.backgroundColor),C("#background-hex").dispatchEvent(new Event("input",{bubbles:!0})),Ku(),hl.reset(),ul(),gs(C("#real-photo")),gs(C("#model-photo")),C("#real-feedback").textContent="\u767B\u9332\u6E08\u307F\u306E\u5199\u771F\u3092\u4F7F\u7528\u3057\u307E\u3059\u3002\u5DEE\u3057\u66FF\u3048\u308B\u5834\u5408\u306F\u5199\u771F\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002",C("#model-feedback").textContent="\u767B\u9332\u6E08\u307F\u306E\u30E2\u30C7\u30EB\u753B\u50CF\u3092\u4F7F\u7528\u3057\u307E\u3059\u3002\u5DEE\u3057\u66FF\u3048\u308B\u5834\u5408\u306F\u753B\u50CF\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002",C("#model-files-feedback").textContent="\u73FE\u5728\u306E\u30E2\u30C7\u30EB\uFF1A"+r.root,C("#submission-error").hidden=!0,Vu=C("#works [data-open-submission]"),_r.showModal(),await Yu()}catch(t){Na=null,Xt(t.message)}finally{C("#edit-work").disabled=!1}}C("#edit-work").addEventListener("click",()=>lm(wt));C("#use-model-thumbnail").addEventListener("click",async()=>{if(!bt)return;let i=C("#use-model-thumbnail");i.disabled=!0,C("#post-button").disabled=!0;try{let e=await bt.snapshot(),t=new File([e],"model-view.png",{type:"image/png"}),n=new DataTransfer;n.items.add(t),C("#model-photo").files=n.files,C("#model-photo").dispatchEvent(new Event("change",{bubbles:!0})),C("#model-feedback").textContent="3D\u30D7\u30EC\u30D3\u30E5\u30FC\u304B\u3089\u30E2\u30C7\u30EB\u753B\u50CF\u3092\u4F5C\u6210\u3057\u307E\u3057\u305F\u3002",Xt("\u73FE\u5728\u306E\u8868\u793A\u3092\u30E2\u30C7\u30EB\u753B\u50CF\u306B\u3057\u307E\u3057\u305F\u3002")}catch(e){Xt(e.message)}finally{i.disabled=!1,C("#post-button").disabled=xs}});var ki=document.createElement("button");ki.type="button";ki.className="secondary";ki.textContent="\u7BA1\u7406\u753B\u9762";function syncEventAdmin(session){
 const allowed=session?.canManage===true && session?.user?.role==="admin";
 if(Ie.canManage===true && !allowed && ki.isConnected){ki.remove();C("#admin-panel").close();location.reload();return}
 Ie.canManage=allowed;
 C("#admin-panel").inert=!allowed;
 C("#reaction-settings-open").hidden=!allowed;
 C("#hidden-filter-label").hidden=!allowed;
 if(allowed){if(!ki.isConnected)C(".gallery-controls").append(ki)}else ki.remove();
}
var tm=[];async function _i(){xr(tm);let i=C("#admin-work-list");i.replaceChildren();let e=C("#admin-search").value.normalize("NFKC").toLocaleLowerCase(),t=C("#admin-sort").value,n=Un.filter(r=>(r.shared||r.isDemo)&&(C("#admin-filter").value==="all"||(r.visibility||"public")===C("#admin-filter").value)&&(!e||(r.title+" "+(r.author||"")).normalize("NFKC").toLocaleLowerCase().includes(e))).sort((r,a)=>t==="title"?r.title.localeCompare(a.title,"ja"):t==="author"?(r.author||"").localeCompare(a.author||"","ja"):t==="old"?r.createdAt-a.createdAt:a.createdAt-r.createdAt),s=Un.filter(r=>r.shared||r.isDemo);C("#admin-work-result").textContent=n.length+"\u4EF6\u3092\u8868\u793A \uFF0F \u5168"+s.length+"\u4EF6",C("#admin-work-summary").replaceChildren(...[["\u3059\u3079\u3066",s.length,"all"],["\u516C\u958B\u4E2D",s.filter(r=>r.visibility!=="hidden").length,"public"],["\u975E\u516C\u958B",s.filter(r=>r.visibility==="hidden").length,"hidden"]].map(([r,a,o])=>{let c=document.createElement("button");c.type="button",c.className="admin-stat",c.setAttribute("aria-pressed",String(C("#admin-filter").value===o));let l=document.createElement("span"),h=document.createElement("strong");return l.textContent=r,h.textContent=a,c.append(l,h),c.addEventListener("click",()=>{C("#admin-filter").value=o,_i()}),c})),n.length||(i.textContent="\u8A72\u5F53\u3059\u308B\u4F5C\u54C1\u306F\u3042\u308A\u307E\u305B\u3093\u3002");for(let r of n){let a=document.createElement("div");a.className="admin-work-row",a.dataset.id=r.id;let o=document.createElement("strong");o.textContent=r.title;let c=document.createElement("span");c.className="admin-work-author",c.textContent="\u4F5C\u8005\uFF1A"+(r.author||"\u672A\u767B\u9332");let l=document.createElement("div");l.className="admin-work-info";let h=document.createElement("img");h.className="admin-work-thumbnail",h.alt="",h.loading="lazy",h.src=r.modelPhotoURL||Wu(r.modelPhoto,tm),h.getAttribute("src")||(h.hidden=!0);let u=document.createElement("small");u.className="admin-work-date",u.textContent=new Date(r.createdAt).toLocaleDateString("ja-JP"),l.append(h,o,c,u);let d=document.createElement("span");d.className="admin-status "+(r.visibility==="hidden"?"is-hidden":"is-public"),d.textContent=r.visibility==="hidden"?"\u975E\u516C\u958B":"\u516C\u958B\u4E2D";let f=document.createElement("button");f.type="button",f.className="secondary",f.textContent=r.visibility==="hidden"?"\u516C\u958B\u3059\u308B":"\u975E\u516C\u958B\u306B\u3059\u308B",f.addEventListener("click",async()=>{f.disabled=!0;try{let p=r.visibility==="hidden"?"public":"hidden";await Ge("/works/"+r.id+"/visibility",{method:"PUT",body:JSON.stringify({visibility:p})}),r.visibility=p,Bn(),await _i()}catch(p){C("#admin-error").textContent=p.message}finally{f.disabled=!1}});let g=document.createElement("button");g.type="button",g.className="primary admin-edit",g.textContent="\u5185\u5BB9\u3092\u7DE8\u96C6",g.addEventListener("click",async()=>{g.disabled=!0,wt=r,On++;try{await lm(r)}finally{g.disabled=!1}});let x=document.createElement("button");x.type="button",x.className="danger",x.textContent="\u524A\u9664",x.addEventListener("click",async()=>{if(confirm("\u300C"+r.title+"\u300D\u3092\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F\u7BA1\u7406\u753B\u9762\u306E\u300C\u524A\u9664\u6E08\u307F\u300D\u304B\u3089\u5FA9\u5143\u3067\u304D\u307E\u3059\u3002")){x.disabled=!0;try{await Ge("/works/"+r.id,{method:"DELETE"}),Un=Un.filter(p=>p.id!==r.id),Bn(),await _i(),Xt("\u4F5C\u54C1\u3092\u524A\u9664\u3057\u307E\u3057\u305F\u3002")}catch(p){C("#admin-error").textContent=p.message,x.disabled=!1}}});let m=document.createElement("div");m.className="admin-work-actions",m.append(g,f,x),a.append(l,d,m),i.append(a)}}async function hm(i){if(!Ie.canManage)return;if(Fi.pending&&!await Fi.flush()||i!=="content"&&!C("#admin-content").hidden&&!kp())return;C("#reaction-settings-footer").hidden=i!=="reactions",C("#event-content-footer").hidden=i!=="content";for(let t of["content","works","reactions","history","trash","backups"])C("#admin-"+t).hidden=t!==i;dn("[data-admin-tab]").forEach(t=>t.setAttribute("aria-pressed",String(t.dataset.adminTab===i)));let e={works:["\u4F5C\u54C1","\u6295\u7A3F\u306E\u78BA\u8A8D\u30FB\u7DE8\u96C6\u3001\u516C\u958B\u72B6\u614B\u306E\u5909\u66F4\u3092\u884C\u3044\u307E\u3059\u3002"],content:["\u30A4\u30D9\u30F3\u30C8\u5185\u5BB9","\u5909\u66F4\u3057\u305F\u5185\u5BB9\u3092\u30D7\u30EC\u30D3\u30E5\u30FC\u3067\u78BA\u8A8D\u3057\u3066\u304B\u3089\u53CD\u6620\u3057\u307E\u3059\u3002"],reactions:["\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3","\u7A2E\u985E\u3092\u7DE8\u96C6\u3067\u304D\u307E\u3059\u3002\u4E26\u3079\u66FF\u3048\u30CF\u30F3\u30C9\u30EB\u3092\u30C9\u30E9\u30C3\u30B0\u3059\u308B\u3068\u8868\u793A\u9806\u3092\u5909\u66F4\u3067\u304D\u307E\u3059\u3002"],trash:["\u524A\u9664\u6E08\u307F","\u524A\u9664\u3057\u305F\u4F5C\u54C1\u3092\u975E\u516C\u958B\u3067\u5FA9\u5143\u3067\u304D\u307E\u3059\u3002"],history:["\u5909\u66F4\u5C65\u6B74","\u5909\u66F4\u5185\u5BB9\u3092\u6BD4\u8F03\u3057\u3001\u4EE5\u524D\u306E\u72B6\u614B\u306B\u623B\u305B\u307E\u3059\u3002"],backups:["\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7","\u73FE\u5728\u306E\u5185\u5BB9\u3092\u4FDD\u5B58\u3057\u3001\u5FC5\u8981\u306A\u3068\u304D\u306B\u5FA9\u5143\u3067\u304D\u307E\u3059\u3002"]};C("#admin-screen-title").textContent=e[i][0],C("#admin-screen-description").textContent=e[i][1],C(".admin-main").scrollTop=0,C("#admin-error").textContent="";try{if(i==="reactions"){let t=C("#reaction-settings-form");t.inert=!0,Fi.beginLoad();let n=!1;try{await iu(),Fi.load(Ie.reactions),n=!0}finally{Fi.endLoad(n)}}if(i==="content"){C("#event-content-fields").replaceChildren(),C("#event-content-save").disabled=!0,C("#start-live-edit").disabled=!0;try{let t=await Ge("/session");Ie.content=t.content,Fp()}finally{C("#event-content-save").disabled=!1,C("#start-live-edit").disabled=!1}}i==="works"&&await _i(),i==="history"&&await Rp(sl),i==="trash"&&await Yh(sl),i==="backups"&&await Gc(sl)}catch(t){C("#admin-error").textContent=t.message}}ki.addEventListener("click",async()=>{if(Ie.canManage){if(document.body.classList.contains("live-editing")){C("#live-editor-save").focus();return}C("#admin-panel").showModal(),await hm("works")}});C("#admin-close").addEventListener("click",async()=>{await Fi.flush()&&C("#admin-panel").close()});C("#admin-panel").addEventListener("cancel",async i=>{Fi.pending&&(i.preventDefault(),await Fi.flush()&&C("#admin-panel").close())});dn("[data-admin-tab]").forEach(i=>i.addEventListener("click",()=>hm(i.dataset.adminTab)));C("#admin-filter").addEventListener("change",_i);function ll(i){return i.files.filter(e=>/\.(gltf|glb)$/i.test(e.name)).map(e=>e.name)}function um(i,e,t){i.replaceChildren(...ll(e).map(n=>{let s=document.createElement("option");return s.value=n,s.textContent=n,s})),i.value=t}C("#preview-model-select").addEventListener("change",()=>{bt?.dispose(),bt=null,Wt=null,Yu()});C("#detail-model-select").addEventListener("change",async()=>{if(!Ua||!wt)return;let i=C("#detail-model-select").value,e=Ua,t=wt,n=++On;$n?.dispose(),$n=null,C("#reset-view").disabled=!0,C("#viewer-status").textContent="3D\u30E2\u30C7\u30EB\u3092\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026",C("#viewer-status").hidden=C("#viewer-panel").hidden,C("#detail-model-name").textContent=i;try{let s=await La({...e,root:i});if(n!==On){s.dispose();return}$n=nl(C("#viewer"),s,t.backgroundColor,i===e.root?t.modelView:null),C("#reset-view").disabled=!1,C("#viewer-status").textContent="",C("#viewer-status").hidden=!0}catch(s){n===On&&(C("#viewer-status").textContent=s.message,C("#viewer-status").hidden=C("#viewer-panel").hidden)}});window.addEventListener("uploadprogress",i=>{xs&&(C("#save-progress").textContent="\u5171\u6709\u30B5\u30FC\u30D0\u30FC\u3078\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u4E2D\u2026 "+i.detail+"%",C("#upload-meter").value=i.detail)});function dm(){let i=new Map((Ye?.model.files||[]).map(t=>[t.name,new File([t.blob],t.name,{type:t.blob.type})])),e=new Set;for(let t of C("#model-files").files){let n=t.webkitRelativePath||t.name;if(e.has(n))throw Error("\u8FFD\u52A0\u3057\u305F\u30E2\u30C7\u30EB\u95A2\u9023\u30D5\u30A1\u30A4\u30EB\u306B\u540C\u3058\u540D\u524D\u304C\u3042\u308A\u307E\u3059\u3002\u540D\u524D\u3092\u5909\u3048\u3066\u9078\u3073\u76F4\u3057\u3066\u304F\u3060\u3055\u3044\u3002");e.add(n),i.set(n,t)}return[...i.values()]}async function fm(i){return jp(Ye?dm():[...C("#model-files").files],i||Ye?.model.root)}function ul(){if(C("#existing-assets").hidden=!Ye,!Ye)return;let i=new Map([...C("#model-files").files].map(t=>[t.webkitRelativePath||t.name,t])),e=new Map(Ye.model.files.map(t=>[t.name,{blob:t.blob,added:!1}]));for(let[t,n]of i)e.set(t,{blob:n,added:!0});C("#existing-model-files").replaceChildren(...[...e].map(([t,n])=>{let s=document.createElement("li"),r=document.createElement("span");r.textContent=t+" \xB7 "+(n.blob.size/1024/1024).toFixed(2)+"MB"+(n.added?"\uFF08\u8FFD\u52A0\u30FB\u5DEE\u3057\u66FF\u3048\uFF09":"");let a=document.createElement("button");return a.type="button",a.className="text-button",a.textContent="\u524A\u9664",a.setAttribute("aria-label",t+"\u3092\u524A\u9664"),a.addEventListener("click",()=>{Ye.model={...Ye.model,files:Ye.model.files.filter(c=>c.name!==t)};let o=new DataTransfer;for(let c of C("#model-files").files)(c.webkitRelativePath||c.name)!==t&&o.items.add(c);C("#model-files").files=o.files,gs(C("#model-files")),Ut.dispatchEvent(new Event("draftchange"))}),s.append(r,a),s}))}C("#upload-cancel").addEventListener("click",()=>{sd(),C("#upload-cancel").disabled=!0,C("#upload-cancel").textContent="\u4E2D\u65AD\u4E2D\u2026"});window.addEventListener("uploadcommitting",()=>{C("#upload-cancel").disabled=!0,C("#save-progress").textContent="\u4FDD\u5B58\u3092\u78BA\u5B9A\u3057\u3066\u3044\u307E\u3059\u2026"});window.addEventListener("uploadretry",i=>{C("#save-progress").textContent="\u901A\u4FE1\u3092\u518D\u8A66\u884C\u3057\u3066\u3044\u307E\u3059\u2026 "+i.detail+"/2"});C("#admin-search").addEventListener("input",_i);C("#admin-sort").addEventListener("change",_i);Ip(sl);window.addEventListener("uploadstart",()=>{C("#upload-cancel").hidden=!1});Ut.addEventListener("draftrestored",()=>{C("#background-hex").dispatchEvent(new Event("input",{bubbles:!0})),Ye&&ul()});var pm=ad(Ut,{editing:()=>Ye,files:dm,viewer:()=>bt});_r.addEventListener("toggle",()=>pm.update());async function sl(){let i=await Ge("/session");syncEventAdmin(i),Object.assign(Ie,i,{canManage:Ie.canManage}),dr(i.content),await nu(),await Oa()}
Bp(Xt);
Bi.disabled=true;
gb().finally(()=>{Bi.disabled=false});
/*! Bundled license information:

three/build/three.core.js:
three/build/three.module.js:
  (**
   * @license
   * Copyright 2010-2025 Three.js Authors
   * SPDX-License-Identifier: MIT
   *)
*/
