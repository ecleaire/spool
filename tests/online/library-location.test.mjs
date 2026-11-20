import assert from 'node:assert/strict';
import {libraryFromUrl,libraryUrl,loginReturnUrl,rememberLoginLibrary,pendingLoginLibrary,clearLoginLibrary} from '../../online/library-location.mjs';
const id='11111111-1111-4111-8111-111111111111',base='https://ecleaire.github.io/spool/';
assert.equal(libraryFromUrl(base+'?library='+id),id);
assert.equal(libraryFromUrl(base+'?library=bad'),null);
assert.equal(libraryFromUrl(base),null);
assert.equal(libraryUrl(base+'?other=keep',id),base+'?other=keep&library='+id);
assert.equal(loginReturnUrl(base+'?code=private&library='+id+'#access_token=private'),base);const values=new Map(),storage={setItem:(key,value)=>values.set(key,value),getItem:key=>values.get(key),removeItem:key=>values.delete(key)};rememberLoginLibrary(storage,base+'?library='+id);assert.equal(pendingLoginLibrary(storage,base),id);assert.equal(pendingLoginLibrary(storage,base+'other/'),null);clearLoginLibrary(storage,base);assert.equal(pendingLoginLibrary(storage,base),null);
assert.equal(loginReturnUrl(base+'?library=bad'),base);
console.log('PASS library bookmark URLs and safe OAuth return target.');

const {startingLibrary,recentLibraryKey}=await import('../../online/library-location.mjs');const libs=[{id:'personal'},{id:'shared'}];assert.equal(startingLibrary(libs,{requested:'personal',recent:'shared',personal:'personal'}),'personal');assert.equal(startingLibrary(libs,{recent:'shared',personal:'personal'}),'shared');assert.equal(startingLibrary(libs,{recent:'personal',personal:'shared'}),'personal');assert.equal(startingLibrary(libs,{recent:'revoked',personal:'personal'}),'personal');assert.equal(startingLibrary([],{}),null);assert.notEqual(recentLibraryKey('a'),recentLibraryKey('b'));console.log('PASS: recent accessible library priority, explicit links, revoked-library fallback and account-isolated keys.');
