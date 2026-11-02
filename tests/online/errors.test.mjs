import assert from 'node:assert/strict';
import {classifyError} from '../../online/errors.mjs';
for(const [error,category]of [[{status:401},'session'],[{code:'42501',message:'RLS'},'permission'],[{status:409},'conflict'],[{status:413},'file'],[{status:429},'rate'],[new TypeError('Failed to fetch'),'network'],[Error('Quota exceeded'),'storage'],[Error('秘密キーは使用できません'),'settings'],[Error('データ形式が不正です'),'input'],[Error('unexpected'),'unknown']])assert.equal(classifyError(error).category,category);
assert.ok(classifyError(Error('秘密キーは使用できません')).action.includes('秘密キーは使用できません'));
console.log('PASS: errors distinguish login, permission, conflict, file, rate, network, storage, settings, input and unknown recovery paths.');
