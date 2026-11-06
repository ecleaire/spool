import {readFileSync,writeFileSync} from 'node:fs';
const sources=['account-management.sql','shared-libraries.sql','library-aggregation.sql','library-combination.sql','selective-sharing.sql','library-appearance.sql','member-permissions.sql','library-administrators.sql','library-lifecycle.sql','account-access.sql','purchase-plan-sharing.sql','purchase-wishes.sql','shared-library-privacy.sql','shared-inventory-sync.sql','booking-sharing.sql'];
const chunks=sources.map(name=>'\n-- '+name+'\n'+readFileSync(new URL('../supabase/'+name,import.meta.url),'utf8').replace(/^begin;\s*$/gm,'').replace(/^commit;\s*$/gm,''));
const sql='-- Existing SPOOL database upgrade. Requires schema.sql already installed.\n-- Preserves existing accounts, libraries, inventory and sharing choices.\nbegin;\n'+chunks.join('\n')+"\ncommit;\nnotify pgrst, 'reload schema';\n";
writeFileSync(new URL('../supabase/upgrade-existing.sql',import.meta.url),sql);
console.log('Built supabase/upgrade-existing.sql ('+Buffer.byteLength(sql)+' bytes).');
