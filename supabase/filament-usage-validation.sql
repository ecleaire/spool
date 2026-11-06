-- Pure validation of optional reservation estimates. No data or permissions are changed.
create or replace function public.spool_validate_filament_usage(u jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare f jsonb;k text;
begin
 if u='null'::jsonb then return true;end if;
 if jsonb_typeof(u) is distinct from 'object' or jsonb_typeof(u->'filaments') is distinct from 'array' or jsonb_array_length(u->'filaments')>64 then return false;end if;
 for k in select unnest(array['grams','millimeters']) loop
  if not(u ? k) or (u->k<>'null'::jsonb and (jsonb_typeof(u->k) is distinct from 'number' or (u->>k)::numeric not between 0 and 1000000000)) then return false;end if;
 end loop;
 for f in select value from jsonb_array_elements(u->'filaments') loop
  if jsonb_typeof(f) is distinct from 'object' or jsonb_typeof(f->'type') is distinct from 'string' or length(f->>'type')>40 or jsonb_typeof(f->'color') is distinct from 'string' or ((f->>'color')<>'' and (f->>'color') !~ '^#[0-9A-Fa-f]{6}$') then return false;end if;
  for k in select unnest(array['grams','millimeters']) loop
   if not(f ? k) or (f->k<>'null'::jsonb and (jsonb_typeof(f->k) is distinct from 'number' or (f->>k)::numeric not between 0 and 1000000000)) then return false;end if;
  end loop;
 end loop;
 return true;
exception when others then return false;
end;$$;
