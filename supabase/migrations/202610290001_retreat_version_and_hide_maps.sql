alter table public.retreats
  add column if not exists version bigint;

update public.retreats
set version = 1
where version is null;

alter table public.retreats
  alter column version set default 1,
  alter column version set not null;

alter table public.users
  add column if not exists hide_maps boolean not null default false;

grant select (hide_maps) on table public.users to anon, authenticated;

create or replace function public.bump_retreat_version(target_retreat_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_retreat_id is not null then
    update public.retreats
    set version = version + 1
    where id = target_retreat_id;
  end if;
end;
$$;

create or replace function public.set_retreat_version_on_update()
returns trigger
language plpgsql
as $$
begin
  if new.version <= old.version then
    new.version := old.version + 1;
  end if;

  return new;
end;
$$;

drop trigger if exists retreats_set_version_on_update on public.retreats;
create trigger retreats_set_version_on_update
before update on public.retreats
for each row execute function public.set_retreat_version_on_update();

create or replace function public.bump_retreat_version_from_retreat_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.bump_retreat_version(new.retreat_id);
  elsif tg_op = 'DELETE' then
    perform public.bump_retreat_version(old.retreat_id);
  else
    perform public.bump_retreat_version(new.retreat_id);

    if old.retreat_id is distinct from new.retreat_id then
      perform public.bump_retreat_version(old.retreat_id);
    end if;
  end if;

  return null;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['guests', 'guest_statuses', 'retreat_rooms', 'taxi_rides']
  loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_bump_retreat_version', table_name);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.bump_retreat_version_from_retreat_row()',
      table_name || '_bump_retreat_version',
      table_name
    );
  end loop;
end;
$$;

create or replace function public.bump_retreat_version_from_taxi_guest()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_retreat_id bigint;
  new_retreat_id bigint;
begin
  if tg_op <> 'INSERT' then
    select retreat_id into old_retreat_id
    from public.taxi_rides
    where id = old.ride_id;
  end if;

  if tg_op <> 'DELETE' then
    select retreat_id into new_retreat_id
    from public.taxi_rides
    where id = new.ride_id;
  end if;

  perform public.bump_retreat_version(new_retreat_id);

  if old_retreat_id is distinct from new_retreat_id then
    perform public.bump_retreat_version(old_retreat_id);
  end if;

  return null;
end;
$$;

drop trigger if exists taxi_guests_bump_retreat_version on public.taxi_guests;
create trigger taxi_guests_bump_retreat_version
after insert or update or delete on public.taxi_guests
for each row execute function public.bump_retreat_version_from_taxi_guest();
