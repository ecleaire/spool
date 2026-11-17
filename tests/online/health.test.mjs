import assert from 'node:assert/strict';import {FEATURE_CHECKS,featureReport} from '../../online/health.mjs';
assert.throws(()=>featureReport(null),/診断結果/);assert.throws(()=>featureReport({version:2,features:{}}),/診断結果/);
const rows=featureReport({version:1,features:{filament_sharing:true,booking_sharing:false,consumption:'true'}});assert.equal(rows.length,FEATURE_CHECKS.length);assert.equal(rows[0].state,'supported');assert.equal(rows[1].state,'missing');assert.equal(rows.find(x=>x.key==='consumption').state,'unknown');assert.equal(rows.find(x=>x.key==='shared_edit').state,'unknown');
console.log('PASS: feature report never treats missing/malformed diagnostics as supported.');
