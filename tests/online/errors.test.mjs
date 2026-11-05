import assert from 'node:assert/strict';
import {classifyError} from '../../online/errors.mjs';
for(const [error,category]of [[{status:401},'session'],[{code:'42501',message:'RLS'},'permission'],[{status:409},'conflict'],[{code:'40001',message:'Library changed; reload before saving'},'conflict'],[{status:413},'file'],[{status:429},'rate'],[new TypeError('Failed to fetch'),'network'],[Error('Quota exceeded'),'storage'],[Error('秘密キーは使用できません'),'settings'],[Error('データ形式が不正です'),'input'],[Error('unexpected'),'unknown']])assert.equal(classifyError(error).category,category);
assert.ok(classifyError(Error('秘密キーは使用できません')).action.includes('秘密キーは使用できません'));
console.log('PASS: errors distinguish login, permission, conflict, file, rate, network, storage, settings, input and unknown recovery paths.');

assert.equal(classifyError({code:'SAVED_REFRESH_FAILED',message:'saved'}).category,'refresh');assert.match(classifyError({code:'SAVED_REFRESH_FAILED'}).title,/保存されました/);

for(const error of [{code:'WRITE_RESULT_UNKNOWN',message:'request timed out'},{message:'Error: 保存結果を確認できませんでした。サーバー側で保存済みの可能性があります。'}]){const info=classifyError(error);assert.equal(info.category,'uncertain');assert.match(info.action,/再読み込み/);}
