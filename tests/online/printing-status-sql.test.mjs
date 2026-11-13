import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '../../online/node_modules/@electric-sql/pglite/dist/index.js';
const db=new PGlite();
const sql=readFileSync(new URL('../../supabase/booking-filament-usage.sql',import.meta.url),'utf8');
for(const name of ['spool_validate_filament_usage','spool_validate_shared_booking']){
 const fn=sql.match(new RegExp('create or replace function public\\.'+name+'\\([\\s\\S]*?end;\\$\\$;'))?.[0];assert.ok(fn);await db.exec(fn.replace("'印刷予定','印刷途中','印刷済み','未定'","'印刷予定','印刷済み','未定'"));
}
const b={id:'status-test',title:'モデル',registeredDate:'2026-11-13',deadline:'',weekday:'金',className:'',desiredColor:'希望なし',color:'#808080',printMinutes:90,printStatus:'印刷途中'};
const valid=async value=>(await db.query('select public.spool_validate_shared_booking($1::jsonb) as valid',[JSON.stringify(value)])).rows[0].valid;
assert.equal(await valid(b),false);
const migration=readFileSync(new URL('../../supabase/booking-printing-status.sql',import.meta.url),'utf8');await db.exec(migration);await db.exec(migration);
for(const printStatus of ['印刷予定','印刷途中','印刷済み','未定'])assert.equal(await valid({...b,printStatus}),true);
for(const bad of [{...b,printStatus:'invalid'},{...b,printStatus:null},{...b,title:''},{...b,color:'javascript:alert(1)'},{...b,printMinutes:-1}])assert.equal(await valid(bad),false);
await db.close();console.log('PASS: repeatable printing-status migration accepts four statuses and retains booking validation.');
