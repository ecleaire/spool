import {AuthClient} from '@supabase/supabase-js';

export function createEventAuth(config, storageKey, storage) {
  return new AuthClient({
    url:new URL('/auth/v1',config.url).href,
    headers:{apikey:config.key,Authorization:'Bearer '+config.key},
    storageKey,storage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:'pkce'
  });
}
