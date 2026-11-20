import assert from 'node:assert/strict';import {rolePermissions,fetchPermissions} from '../../online/permissions.mjs';
const old={...rolePermissions('editor')};delete old.files_organize;
for(const role of ['viewer','editor','owner']){const data=await fetchPermissions({rpc:async()=>({data:{...old}})},'lib',role);assert.equal(data.files_organize,role==='owner');assert.equal(data._organize_supported,false);}
assert.equal((await fetchPermissions({rpc:async()=>({data:{...rolePermissions('owner'),files_organize:false}})},'lib','owner')).files_organize,false);
assert.equal((await fetchPermissions({rpc:async()=>({data:rolePermissions('editor')})},'lib','editor'))._organize_supported,true);
console.log('PASS: organizer grant is explicit, legacy restricted members remain denied, owner fallback and service restriction respected.');
