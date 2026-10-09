-- Atomic guest write helpers used by the Supabase database adapter.
-- These functions intentionally contain no business validation or calculations.
-- Services prepare all values before calling the adapter. The only generated value
-- added here is guest_id for the status created together with a new guest.

create or replace function public.create_guest_with_status(
  p_guest jsonb,
  p_status jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_guest public.guests;
begin
  insert into public.guests (
    retreat_id,
    name,
    is_organizer,
    arrival_date,
    diet_notes,
    room_id
  )
  values (
    (p_guest->>'retreat_id')::bigint,
    p_guest->>'name',
    (p_guest->>'is_organizer')::boolean,
    (p_guest->>'arrival_date')::date,
    p_guest->>'diet_notes',
    (p_guest->>'room_id')::bigint
  )
  returning * into v_guest;

  insert into public.guest_statuses (
    retreat_id,
    guest_id,
    status,
    room,
    updated_by
  )
  values (
    (p_status->>'retreat_id')::bigint,
    v_guest.id,
    p_status->>'status',
    p_status->>'room',
    (p_status->>'updated_by')::bigint
  );

  return to_jsonb(v_guest);
end;
$$;

create or replace function public.update_guest_with_status(
  p_id bigint,
  p_changes jsonb,
  p_status jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_guest public.guests;
begin
  update public.guests
  set
    retreat_id = case
      when p_changes ? 'retreat_id' then (p_changes->>'retreat_id')::bigint
      else retreat_id
    end,
    name = case
      when p_changes ? 'name' then p_changes->>'name'
      else name
    end,
    is_organizer = case
      when p_changes ? 'is_organizer' then (p_changes->>'is_organizer')::boolean
      else is_organizer
    end,
    arrival_date = case
      when p_changes ? 'arrival_date' then (p_changes->>'arrival_date')::date
      else arrival_date
    end,
    diet_notes = case
      when p_changes ? 'diet_notes' then p_changes->>'diet_notes'
      else diet_notes
    end,
    room_id = case
      when p_changes ? 'room_id' then (p_changes->>'room_id')::bigint
      else room_id
    end
  where id = p_id
  returning * into v_guest;

  insert into public.guest_statuses (
    retreat_id,
    guest_id,
    status,
    room,
    updated_by
  )
  values (
    (p_status->>'retreat_id')::bigint,
    (p_status->>'guest_id')::bigint,
    p_status->>'status',
    p_status->>'room',
    (p_status->>'updated_by')::bigint
  );

  return to_jsonb(v_guest);
end;
$$;

create or replace function public.swap_guest_rooms(
  p_first_guest_id bigint,
  p_first_guest_changes jsonb,
  p_first_status jsonb,
  p_second_guest_id bigint,
  p_second_guest_changes jsonb,
  p_second_status jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_first_guest public.guests;
  v_second_guest public.guests;
begin
  update public.guests
  set room_id = (p_first_guest_changes->>'room_id')::bigint
  where id = p_first_guest_id
  returning * into v_first_guest;

  update public.guests
  set room_id = (p_second_guest_changes->>'room_id')::bigint
  where id = p_second_guest_id
  returning * into v_second_guest;

  insert into public.guest_statuses (
    retreat_id,
    guest_id,
    status,
    room,
    updated_by
  )
  values (
    (p_first_status->>'retreat_id')::bigint,
    (p_first_status->>'guest_id')::bigint,
    p_first_status->>'status',
    p_first_status->>'room',
    (p_first_status->>'updated_by')::bigint
  );

  insert into public.guest_statuses (
    retreat_id,
    guest_id,
    status,
    room,
    updated_by
  )
  values (
    (p_second_status->>'retreat_id')::bigint,
    (p_second_status->>'guest_id')::bigint,
    p_second_status->>'status',
    p_second_status->>'room',
    (p_second_status->>'updated_by')::bigint
  );

  return jsonb_build_object(
    'firstGuest', to_jsonb(v_first_guest),
    'secondGuest', to_jsonb(v_second_guest)
  );
end;
$$;
