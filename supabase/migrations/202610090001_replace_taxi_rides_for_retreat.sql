-- Atomically replaces all taxi rides and passengers for one retreat.
-- The service prepares every business value. This function only writes the
-- supplied records and attaches generated taxi_rides.id values to passengers.

create or replace function public.replace_taxi_rides_for_retreat(
  p_retreat_id bigint,
  p_rides jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ride jsonb;
  v_guest jsonb;
  v_created_ride public.taxi_rides;
  v_result jsonb := '[]'::jsonb;
begin
  perform 1
  from public.retreats
  where id = p_retreat_id
  for update;

  delete from public.taxi_guests
  where ride_id in (
    select id
    from public.taxi_rides
    where retreat_id = p_retreat_id
  );

  delete from public.taxi_rides
  where retreat_id = p_retreat_id;

  for v_ride in
    select value
    from jsonb_array_elements(coalesce(p_rides, '[]'::jsonb))
  loop
    insert into public.taxi_rides (
      retreat_id,
      arrival_datetime,
      driver_name
    )
    values (
      p_retreat_id,
      (v_ride->>'arrival_datetime')::timestamptz,
      v_ride->>'driver_name'
    )
    returning * into v_created_ride;

    for v_guest in
      select value
      from jsonb_array_elements(coalesce(v_ride->'guests', '[]'::jsonb))
    loop
      insert into public.taxi_guests (
        ride_id,
        guest_id,
        unbooked_guest_name
      )
      values (
        v_created_ride.id,
        (v_guest->>'guest_id')::bigint,
        v_guest->>'unbooked_guest_name'
      );
    end loop;

    v_result := v_result || jsonb_build_array(to_jsonb(v_created_ride));
  end loop;

  return v_result;
end;
$$;
