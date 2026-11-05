import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LibrarySync} from '../../online/sync.mjs';
test('keeps edits made during a save and sends expected revision',async()=>{
 let finish;const calls=[];const sync=new LibrarySync((...args)=>{calls.push(args);return new Promise(resolve=>finish=resolve)});
 sync.reset('a',2);sync.edit();const pending=sync.save({items:[1]});sync.edit();finish(3);await pending;
 assert.equal(sync.dirty,true);assert.equal(sync.revision,3);assert.deepEqual(calls[0],['a',2,{items:[1]}]);
 const last=sync.save({items:[2]});finish(4);await last;assert.equal(sync.dirty,false);
});
test('conflict preserves local changes and prevents automatic retry',async()=>{
 let calls=0;const sync=new LibrarySync(async()=>{calls++;throw Object.assign(Error('Conflict'),{code:'40001'})});
 sync.reset('a');sync.edit();await assert.rejects(sync.save({}),/Conflict/);assert.equal(sync.dirty,true);assert.equal(sync.conflict,true);
 await sync.save({});assert.equal(calls,1);
});
test('stale save response cannot contaminate another library/account',async()=>{
 let finish;const sync=new LibrarySync(()=>new Promise(resolve=>finish=resolve));sync.reset('a');sync.edit();const pending=sync.save({});sync.reset('b',9);finish(1);await pending;assert.equal(sync.library,'b');assert.equal(sync.revision,9);assert.equal(sync.dirty,false);
});
test('network errors retain unsaved state for explicit retry',async()=>{
 const sync=new LibrarySync(async()=>{throw Error('Offline')});sync.reset('a');sync.edit();await assert.rejects(sync.save({}),/Offline/);assert.equal(sync.dirty,true);assert.equal(sync.busy,false);assert.equal(sync.conflict,false);
});

import {assertStatePermissions,rolePermissions} from '../../online/permissions.mjs';
test('purchase-specific grants separate wish, plan and owned stock including conversion',()=>{
 const base={items:[],reservations:[],customColorPresets:[],deleted:[]},wish={id:'w',inventoryStatus:'planned',purchaseIntent:'wish',remaining:1000},flags={...rolePermissions('viewer'),wishlist_create:true};
 assert.doesNotThrow(()=>assertStatePermissions(base,{...base,items:[wish]},flags));
 assert.throws(()=>assertStatePermissions(base,{...base,items:[{...wish,purchaseIntent:'planned'}]},flags),/権限/);
 const old={...base,items:[wish]},edit={...flags,wishlist_edit:true};
 assert.throws(()=>assertStatePermissions(old,{...base,items:[{...wish,inventoryStatus:'owned'}]},edit),/権限/);
 assert.throws(()=>assertStatePermissions(old,{...base,items:[{...wish,purchaseIntent:'planned'}]},edit),/権限/);
 assert.doesNotThrow(()=>assertStatePermissions(old,{...base,items:[{...wish,purchaseIntent:'planned'}]},{...edit,purchase_create:true}));
});
