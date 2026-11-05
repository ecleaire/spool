import {spawnSync} from 'node:child_process';
const tests=[
 'tests/online/browser.test.mjs',
 'tests/online/auth-loading.browser.test.mjs',
 'tests/online/sharing.browser.test.mjs',
 'tests/online/permissions.browser.test.mjs',
 'tests/online/lifecycle.browser.test.mjs',
 'tests/online/booking-status.browser.test.mjs',
 'tests/search-layout.browser.test.mjs',
 'tests/print-import.browser.test.mjs',
 'tests/usability.browser.test.mjs',
 'tests/booking-status.browser.test.mjs',
 'tests/inventory-improvements.browser.test.mjs',
 'tests/small-screen.browser.test.mjs',
 'tests/color-name-wrap.browser.test.mjs',
 'tests/simple-view.browser.test.mjs',
];
const escape=value=>String(value).replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A');
for(const file of tests){
 console.log('Running '+file);
 const result=spawnSync(process.execPath,[file],{encoding:'utf8',maxBuffer:4*1024*1024});
 if(result.stdout)process.stdout.write(result.stdout);
 if(result.stderr)process.stderr.write(result.stderr);
 if(result.status!==0){
  const detail=String(result.error?.message||result.stderr||result.stdout||'No diagnostic output').slice(-5000);
  if(process.env.GITHUB_ACTIONS)console.log('::error title='+escape(file)+'::'+escape(detail));
  process.exit(result.status||1);
 }
}
