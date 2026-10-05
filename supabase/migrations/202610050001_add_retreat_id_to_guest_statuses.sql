alter table public.guest_statuses
  add column retreat_id bigint;

update public.guest_statuses as statuses
set retreat_id = guests.retreat_id
from public.guests as guests
where guests.id = statuses.guest_id
  and statuses.retreat_id is null;

do $$
begin
  if exists (
    select 1
    from public.guest_statuses
    where retreat_id is null
  ) then
    raise exception 'Cannot backfill guest_statuses.retreat_id: some statuses have no matching guest.';
  end if;
end;
$$;

alter table public.guest_statuses
  alter column retreat_id set not null;

alter table public.guest_statuses
  add constraint guest_statuses_retreat_id_fkey
  foreign key (retreat_id) references public.retreats(id);

create index idx_guest_statuses_retreat_id
  on public.guest_statuses (retreat_id);

-- Keep the database function compatible with the new required column.
create or replace function public.save_guest(p_id bigint, p_guest jsonb, p_updated_by bigint)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_guest public.guests;
  v_old_room bigint;
  v_retreat bigint := (p_guest->>'retreat_id')::bigint;
  v_room bigint := (p_guest->>'room_id')::bigint;
  v_actor public.users;
  v_room_record public.rooms;
  v_house public.houses;
  v_capacity integer;
  v_occupants integer;
  v_label text;
begin
  select * into v_actor from public.users where id = p_updated_by;
  if not found or v_actor.role not in ('admin', 'organizer') then
    raise exception 'A valid administrator or organizer is required.';
  end if;
  if v_actor.role = 'organizer' and v_actor.retreat_id is distinct from v_retreat then
    raise exception 'You can only edit guests of your assigned retreat.';
  end if;
  if nullif(btrim(p_guest->>'name'), '') is null then
    raise exception 'Enter a guest name.';
  end if;

  -- Serialize saves within a retreat, including concurrent room assignments.
  perform id from public.retreats where id = v_retreat for update;
  if not found then
    raise exception 'Retreat no longer exists.';
  end if;
  if p_id is not null then
    select * into v_guest from public.guests where id = p_id for update;
    if not found then
      raise exception 'Guest no longer exists. Reload the list.';
    end if;
    if v_guest.retreat_id <> v_retreat then
      raise exception 'A guest cannot be moved to another retreat here.';
    end if;
    v_old_room := v_guest.room_id;
  end if;

  if v_room is not null and (p_id is null or v_room is distinct from v_old_room) then
    select * into v_room_record from public.rooms where id = v_room for share;
    if not found or not v_room_record.is_available then
      raise exception 'This room is unavailable.';
    end if;
    select max_guests into v_capacity from public.retreat_rooms
      where retreat_id = v_retreat and room_id = v_room order by id limit 1 for share;
    if not found or v_capacity < 1 then
      raise exception 'This room is not available for this retreat.';
    end if;
    select count(*) into v_occupants from public.guests g
      where g.retreat_id = v_retreat and g.room_id = v_room
      and (p_id is null or g.id <> p_id)
      and coalesce((select s.status from public.guest_statuses s where s.guest_id = g.id
        order by s.changed_at desc, s.id desc limit 1), 'booked') <> 'not_coming';
    if v_occupants >= v_capacity then
      raise exception 'This room is full. Choose another room.';
    end if;
    select * into strict v_house from public.houses where id = v_room_record.house_id;
    v_label := case when right(v_house.name, 1) = 's'
      then left(v_house.name, length(v_house.name) - 1) || ' ' || v_room_record.room_number
      else v_house.name || v_room_record.room_number end;
  end if;

  if p_id is null then
    insert into public.guests(retreat_id, name, is_organizer, arrival_date, diet_notes, room_id)
    values (v_retreat, btrim(p_guest->>'name'), coalesce((p_guest->>'is_organizer')::boolean, false),
      (p_guest->>'arrival_date')::date, nullif(btrim(p_guest->>'diet_notes'), ''), v_room)
    returning * into v_guest;
  else
    update public.guests set name = btrim(p_guest->>'name'),
      is_organizer = coalesce((p_guest->>'is_organizer')::boolean, false),
      arrival_date = (p_guest->>'arrival_date')::date,
      diet_notes = nullif(btrim(p_guest->>'diet_notes'), ''), room_id = v_room
    where id = p_id returning * into v_guest;
  end if;

  if v_room is not null and (p_id is null or v_room is distinct from v_old_room) then
    insert into public.guest_statuses(retreat_id, guest_id, status, room, updated_by)
    values (v_guest.retreat_id, v_guest.id, 'booked', v_label, p_updated_by);
  end if;
  return to_jsonb(v_guest);
end;
$$;
