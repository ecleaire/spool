import assert from 'node:assert/strict';import {describeDestination} from '../../online/destinations.mjs';
assert.equal(describeDestination({name:'自分',personal:true},null),'登録・編集先：自分（個人用）');
assert.match(describeDestination({name:'共有',personal:false},{name:'原本'},{view:true}),/表示先：共有（共有用） · 原本：原本 · 編集は共有元と同期先/);
assert.match(describeDestination({name:'共有',personal:false},{name:'原本'},{readonly:true}),/原本：原本 · 閲覧のみ$/);
console.log('PASS: active library and shared original are distinguished for viewing/editing.');
