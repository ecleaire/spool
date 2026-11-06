import assert from 'node:assert/strict';
import {mergedBookings,bookingLocation,createBookingSharing} from '../../online/booking-sharing.mjs';
import {withoutSharedItems} from '../../online/aggregation.mjs';
import {assertStatePermissions,rolePermissions} from '../../online/permissions.mjs';
const state={items:[],deleted:[],customColorPresets:[],reservations:[{id:'shared-booking-link',title:'own'}]},row={id:'link',source_id:'source',source_name:'Private',source_booking_id:'original',source_revision:2,can_edit:true,booking:{id:'original',title:'linked',attachments:[{id:'file'}]}};
const merged={...state,reservations:mergedBookings(state.reservations,[row])};assert.equal(merged.reservations.length,2);assert.notEqual(merged.reservations[0].id,merged.reservations[1].id);assert.equal(merged.reservations[1]._sharedBookingSource.revision,2);assert.deepEqual(bookingLocation(merged,'target',merged.reservations[1].id),{library:'source',booking:'original'});assert.deepEqual(bookingLocation(merged,'target',state.reservations[0].id),{library:'target',booking:state.reservations[0].id});assert.deepEqual(withoutSharedItems(merged),state);assertStatePermissions(state,merged,rolePermissions('viewer'));
console.log('PASS: incoming booking references preserve local ids and canonical file scope, and are excluded from target saves/backups.');

// Empty optional color metadata must not require the newer RPC on an older database.
const reference={id:'ref',modelColors:[],_sharedBookingSource:{id:'source',bookingId:'original',revision:1,canEdit:true}},requests=[];let current={reservations:[reference]};
const sharing=createBookingSharing({context:()=>({client:{async rpc(name,args){requests.push(args);return {data:2}}},session:{},library:'target',epoch:1,can:()=>true}),bridge:{snapshot:()=>current,apply:state=>current=state,notify(){}},esc:x=>x,prepare:async()=>{},refresh:async()=>{}});
await sharing.mutate('ref',{title:'edit',modelColors:[]});assert.equal('modelColors' in requests[0].changes,false);
current.reservations[0].modelColors=[{kind:'reference',id:'model',desiredColor:'青',color:'#123456'}];await sharing.mutate('ref',{modelColors:[]});assert.deepEqual(requests[1].changes.modelColors,[]);
console.log('PASS: empty optional model colors keep legacy shared edits compatible; clearing an existing override is sent explicitly.');

const usage={grams:10,millimeters:3000,filaments:[{color:'#123456',type:'PLA',grams:10,millimeters:3000}]};await sharing.mutate('ref',{filamentUsage:usage});assert.deepEqual(requests.at(-1).changes.filamentUsage,usage);
const legacySharing=createBookingSharing({context:()=>({client:{async rpc(){return {error:{code:'22023',message:'Invalid booking changes'}}}},session:{},library:'target',epoch:1,can:()=>true}),bridge:{snapshot:()=>current,apply:()=>assert.fail('failed save must not update local state'),notify(){}},esc:x=>x,prepare:async()=>{},refresh:async()=>{}});await assert.rejects(legacySharing.mutate('ref',{filamentUsage:usage}),/データベース更新/);
console.log('PASS: shared consumption estimates are included; missing DB support preserves input with explicit migration guidance.');
