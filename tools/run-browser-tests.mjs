import {spawnSync} from 'node:child_process';
const tests=[
 'tests/planned-separation.browser.test.mjs',
 'tests/help.browser.test.mjs',
 'tests/layout-audit.browser.test.mjs',
 'tests/multi-plate.test.mjs',
 'tests/print-consumption.browser.test.mjs',
 'tests/online/print-consumption.browser.test.mjs',
 'tests/model-zip.test.mjs',
 'tests/booking-download.browser.test.mjs',
 'tests/color-family-tags.browser.test.mjs',
 'tests/booking-multicolor.browser.test.mjs',
 'tests/booking-recovery.browser.test.mjs',
 'tests/booking-experience.browser.test.mjs',
 'tests/online/booking-experience.browser.test.mjs',
 'tests/booking-inputs.browser.test.mjs',
 'tests/booking-registration.browser.test.mjs',
 'tests/booking-delete.browser.test.mjs',
 'tests/online/booking-delete.browser.test.mjs',
 'tests/online/booking-save.browser.test.mjs',
 'tests/model-open.browser.test.mjs',
 'tests/events.browser.test.mjs',
 'tests/online/events.browser.test.mjs',
 'tests/tag-entry.browser.test.mjs',
 'tests/online/file-list.browser.test.mjs',
 'tests/online/v4-settings.browser.test.mjs',
 'tests/online/browser.test.mjs',
 'tests/online/auth-loading.browser.test.mjs',
 'tests/online/sharing.browser.test.mjs',
 'tests/online/people-ui.browser.test.mjs',
 'tests/online/booking-sharing.browser.test.mjs',
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
 'tests/legacy-site-notice.browser.test.mjs',
];
const escape=value=>String(value).replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A');
for(const file of tests){
 console.log('Running '+file);
 const result=spawnSync(process.execPath,[file],{encoding:'utf8',maxBuffer:4*1024*1024,timeout:180000,killSignal:'SIGKILL'});
 if(result.stdout)process.stdout.write(result.stdout);
 if(result.stderr)process.stderr.write(result.stderr);
 if(result.status!==0){
  const detail=(result.error?.code==='ETIMEDOUT'?'Browser test exceeded the 180-second limit.\n':'')+String(result.error?.message||result.stderr||result.stdout||'No diagnostic output').slice(-5000);
  if(process.env.GITHUB_ACTIONS)console.log('::error title='+escape(file)+'::'+escape(detail));
  process.exit(result.status||1);
 }
}
