import assert from 'node:assert/strict';
import {mergedBookings,bookingLocation} from '../../online/booking-sharing.mjs';
import {withoutSharedItems} from '../../online/aggregation.mjs';
import {assertStatePermissions,rolePermissions} from '../../online/permissions.mjs';
const state={items:[],deleted:[],customColorPresets:[],reservations:[{id:'shared-booking-link',title:'own'}]},row={id:'link',source_id:'source',source_name:'Private',source_booking_id:'original',source_revision:2,can_edit:true,booking:{id:'original',title:'linked',attachments:[{id:'file'}]}};
const merged={...state,reservations:mergedBookings(state.reservations,[row])};assert.equal(merged.reservations.length,2);assert.notEqual(merged.reservations[0].id,merged.reservations[1].id);assert.equal(merged.reservations[1]._sharedBookingSource.revision,2);assert.deepEqual(bookingLocation(merged,'target',merged.reservations[1].id),{library:'source',booking:'original'});assert.deepEqual(bookingLocation(merged,'target',state.reservations[0].id),{library:'target',booking:state.reservations[0].id});assert.deepEqual(withoutSharedItems(merged),state);assertStatePermissions(state,merged,rolePermissions('viewer'));
console.log('PASS: incoming booking references preserve local ids and canonical file scope, and are excluded from target saves/backups.');
