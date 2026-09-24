-- Keep updated_at trustworthy without relying on clients.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists practitioner_profiles_set_updated_at on public.practitioner_profiles;
create trigger practitioner_profiles_set_updated_at
before update on public.practitioner_profiles
for each row execute function public.set_updated_at();

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

drop trigger if exists charts_set_updated_at on public.charts;
create trigger charts_set_updated_at
before update on public.charts
for each row execute function public.set_updated_at();
