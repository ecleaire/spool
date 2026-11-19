import {mergedInventory,withoutSharedItems} from '../../online/aggregation.mjs';
import assert from 'node:assert/strict';
import {profileOf,profileUpdate,validAvatar,ensureUniqueProfileHandle,profileSaveError} from '../../online/profile.mjs';
assert.equal(profileOf({email:'user@example.com',user_metadata:{full_name:'Google Name'}}).name,'Google Name');
assert.equal(profileOf({user_metadata:{spool_display_name:'自分の名前',spool_handle:'abc_123',spool_avatar:'https://attacker.invalid/a.svg'}}).avatar,'');
assert.equal(profileOf({user_metadata:{spool_handle:'UPPER'}}).handle,'');
assert.equal(profileUpdate(' 名前 ','@User_123','').spool_handle,'user_123');
assert.throws(()=>profileUpdate('','abc',''),/表示名/);assert.throws(()=>profileUpdate('名前','ab',''),/表示ID/);assert.throws(()=>profileUpdate('名前','a b',''),/表示ID/);
assert.throws(()=>profileUpdate('名前','','data:image/svg+xml;base64,AAAA'),/画像/);assert.equal(validAvatar('data:image/jpeg;base64,AAAA'),true);assert.equal(validAvatar('data:image/jpeg;base64,AAAA'+String.fromCharCode(34)),false);
assert.deepEqual(Object.keys(profileUpdate('名前','user_123','')).sort(),['spool_avatar','spool_display_name','spool_handle']);
console.log('PASS: editable profile validation, Google defaults, safe embedded icons and auth-field separation.');

const own=[{id:'a',remaining:200}],combined=mergedInventory(own,[{source_id:'lib-a',source_name:'他の人',item:{id:'a',remaining:800,tags:['共有']}}]);assert.equal(combined.length,2);assert.notEqual(combined[0].id,combined[1].id);assert.deepEqual(withoutSharedItems({items:combined,reservations:[]}).items,own);

let calls=0;const mock=result=>({rpc:async(name,args)=>{calls++;assert.equal(name,'is_spool_handle_available');assert.equal(args.requested_handle,'next_id');return result;}});
await ensureUniqueProfileHandle(mock({}), 'same_id','same_id');assert.equal(calls,0);
await ensureUniqueProfileHandle(mock({data:true}),'next_id','old_id');
await assert.rejects(ensureUniqueProfileHandle(mock({data:false}),'next_id','old_id'),/すでに使われ/);
await assert.rejects(ensureUniqueProfileHandle(mock({error:{code:'PGRST202'}}),'next_id','old_id'),/DB更新/);
await assert.rejects(ensureUniqueProfileHandle(mock({data:[]}),'next_id','old_id'),/DB更新/);
await assert.rejects(ensureUniqueProfileHandle(mock({error:{code:'NETWORK'}}),'next_id','old_id'),/接続/);
assert.match(profileSaveError({code:'23505'},true),/すでに使われ/);assert.match(profileSaveError({code:'unexpected_failure'},true),/先に使用/);
