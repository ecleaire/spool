export const FEATURE_CHECKS=[
 ['filament_sharing','フィラメントの選択共有','selective-sharing.sql'],
 ['booking_sharing','予約の同期','booking-sharing.sql'],
 ['shared_edit','共有在庫の相互編集','shared-inventory-sync.sql'],
 ['consumption','共有元を含む使用量記録','booking-consumption.sql'],
 ['booking_deletion','予約作成権限での予約・添付削除','booking-deletion.sql'],
 ['booking_progress_deletion','他のモデルの進捗を保った添付削除','booking-deletion.sql'],
 ['permissions','参加者の個別操作権限','member-permissions.sql'],
 ['printing_status','共有予約の印刷途中','booking-printing-status.sql'],
];
export function featureReport(data){if(data?.version!==1||!data.features||typeof data.features!=='object')throw Error('診断結果を確認できませんでした。');return FEATURE_CHECKS.map(([key,label,sql])=>({key,label,sql,state:data.features[key]===true?'supported':data.features[key]===false?'missing':'unknown'}));}
const stamp=c=>c.session&&c.library?c.epoch+':'+c.library:'';
const format=time=>time?new Date(time).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}):'未確認';
export function createHealthPanel({context,esc,status,version,build}){
 let key='',rows=null,checkedAt=null,pending=false,notice='',ticket=0,autoChecked=false;
 const backups=new Map();
 function reset(){const next=stamp(context());if(next!==key){key=next;rows=null;checkedAt=null;pending=false;notice='';autoChecked=false;ticket++;}}
 function canUse(feature){reset();return !rows?.some(r=>r.key===feature&&r.state==='missing');}
 function backupKey(c){return c.session&&c.library?'spool-backup-request-v1:'+c.session.user.id+':'+c.library:null;}
 function backup(at=Date.now()){const c=context(),k=backupKey(c);if(k){backups.set(k,at);try{localStorage.setItem(k,String(at))}catch{}}mount();}
 function backupTime(c){const k=backupKey(c);if(!k)return null;try{const n=Number(localStorage.getItem(k));if(Number.isFinite(n)&&n>0)return n}catch{}return backups.get(k);}
 function mount(){reset();const summary=document.querySelector('#cloud-db-summary');if(summary){const missing=rows?.filter(r=>r.state==='missing').length||0,unknown=!rows||rows.some(r=>r.state==='unknown');summary.textContent=pending?'DB対応を確認中…':missing?'必要なDB更新 '+missing+'件':unknown?'DB対応に未確認の項目があります':'DBの機能対応を確認済み';summary.dataset.state=missing?'missing':unknown?'unknown':'supported';summary.onclick=()=>{const section=document.querySelector('[data-tool-section=health]');if(section)section.open=true;if(!pending)void check();};}const root=document.querySelector('#cloud-health');if(!root)return;const c=context(),s=status(),backupAt=backupTime(c);root.innerHTML='<dl class="cloud-health-facts"><div><dt>バージョン</dt><dd>v'+esc(version)+(build?' · '+esc(build.slice(0,7)):'')+'</dd></div><div><dt>保存状態</dt><dd>'+esc(s.text)+'</dd></div><div><dt>オンライン最終確認</dt><dd>'+esc(format(s.confirmedAt))+'</dd></div><div><dt>JSON出力要求</dt><dd>'+esc(backupAt?format(backupAt):'この端末では未出力')+'</dd></div></dl><p class="health-caption">JSONの出力時刻は、この端末でダウンロードを要求した時刻です。端末への保存完了は確認できません。</p><button type="button" id="cloud-check-features" '+(pending?'disabled':'')+'>'+(pending?'確認中…':'DBの機能対応を確認')+'</button><p role="status" class="health-notice">'+esc(notice||'DBの対応状況は未確認です。確認する操作でデータは変更しません。')+'</p>'+(rows?'<ul class="feature-support-list">'+rows.map(r=>'<li data-feature="'+r.key+'" data-support="'+r.state+'"><strong>'+esc(r.label)+'</strong><span>'+({supported:'API対応',missing:'更新が必要',unknown:'未確認'}[r.state])+'</span>'+(r.state==='missing'?'<small>'+esc(c.admin?'適用候補：'+r.sql:'共有管理者に確認してください。')+'</small>':'')+'</li>').join('')+'</ul>':'')+'<p class="health-caption">'+(checkedAt?'確認日時：'+esc(format(checkedAt))+'。対応表示はAPIの存在を示します。操作には別途権限が必要です。':'診断自体が未導入の場合は、管理者が site-health.sql を適用してから再確認してください。')+'</p>';
 root.querySelector('#cloud-check-features').onclick=check;
 }
 async function check(){reset();const c=context(),id=stamp(c);if(!id||pending)return;const n=++ticket;pending=true;notice='対応する機能を確認しています…';mount();try{const r=await c.client.rpc('get_spool_feature_support',{lib:c.library});if(stamp(context())!==id||n!==ticket)return;if(r.error)throw r.error;rows=featureReport(r.data);const support=await c.client.rpc('supports_booking_progress_deletion',{});if(stamp(context())!==id||n!==ticket)return;const progress=rows.find(row=>row.key==='booking_progress_deletion');progress.state=support.data===true&&!support.error?'supported':support.error&&['PGRST202','42883'].includes(support.error.code)||support.data===false?'missing':'unknown';checkedAt=Date.now();notice=rows.some(r=>r.state==='missing')?'更新が必要な機能があります。適用前に管理者が内容を確認してください。':rows.some(r=>r.state==='unknown')?'一部の対応状況は未確認です。接続・権限を確認して再試行できます。':'機能対応を確認しました。';}catch(error){if(stamp(context())!==id||n!==ticket)return;rows=null;checkedAt=null;notice=error.code==='PGRST202'||error.code==='42883'?'診断機能が未導入です。site-health.sql の適用を管理者に確認してください。':'対応状況を取得できませんでした。未確認のままです。接続・権限を確認して再試行してください。';}finally{if(stamp(context())===id&&n===ticket){pending=false;mount();}}}
 function ensure(){reset();if(autoChecked||pending)return;autoChecked=true;void check();}
 return {mount,backup,canUse,check,ensure};
}
