alter table `retreats`
  add column if not exists `version` bigint not null default 1;

alter table `users`
  add column if not exists `hide_maps` tinyint(1) not null default 0;

delimiter //

drop procedure if exists bump_retreat_version//
create procedure bump_retreat_version(in target_retreat_id bigint)
begin
  if target_retreat_id is not null then
    update `retreats`
    set `version` = `version` + 1
    where `id` = target_retreat_id;
  end if;
end//

drop trigger if exists retreats_set_version_on_update//
create trigger retreats_set_version_on_update
before update on `retreats`
for each row
begin
  if new.`version` <= old.`version` then
    set new.`version` = old.`version` + 1;
  end if;
end//

drop trigger if exists guests_bump_retreat_version_insert//
create trigger guests_bump_retreat_version_insert
after insert on `guests`
for each row call bump_retreat_version(new.`retreat_id`)//

drop trigger if exists guests_bump_retreat_version_update//
create trigger guests_bump_retreat_version_update
after update on `guests`
for each row
begin
  call bump_retreat_version(new.`retreat_id`);
  if old.`retreat_id` <> new.`retreat_id` then
    call bump_retreat_version(old.`retreat_id`);
  end if;
end//

drop trigger if exists guests_bump_retreat_version_delete//
create trigger guests_bump_retreat_version_delete
after delete on `guests`
for each row call bump_retreat_version(old.`retreat_id`)//

drop trigger if exists guest_statuses_bump_retreat_version_insert//
create trigger guest_statuses_bump_retreat_version_insert
after insert on `guest_statuses`
for each row call bump_retreat_version(new.`retreat_id`)//

drop trigger if exists guest_statuses_bump_retreat_version_update//
create trigger guest_statuses_bump_retreat_version_update
after update on `guest_statuses`
for each row
begin
  call bump_retreat_version(new.`retreat_id`);
  if old.`retreat_id` <> new.`retreat_id` then
    call bump_retreat_version(old.`retreat_id`);
  end if;
end//

drop trigger if exists guest_statuses_bump_retreat_version_delete//
create trigger guest_statuses_bump_retreat_version_delete
after delete on `guest_statuses`
for each row call bump_retreat_version(old.`retreat_id`)//

drop trigger if exists retreat_rooms_bump_retreat_version_insert//
create trigger retreat_rooms_bump_retreat_version_insert
after insert on `retreat_rooms`
for each row call bump_retreat_version(new.`retreat_id`)//

drop trigger if exists retreat_rooms_bump_retreat_version_update//
create trigger retreat_rooms_bump_retreat_version_update
after update on `retreat_rooms`
for each row
begin
  call bump_retreat_version(new.`retreat_id`);
  if old.`retreat_id` <> new.`retreat_id` then
    call bump_retreat_version(old.`retreat_id`);
  end if;
end//

drop trigger if exists retreat_rooms_bump_retreat_version_delete//
create trigger retreat_rooms_bump_retreat_version_delete
after delete on `retreat_rooms`
for each row call bump_retreat_version(old.`retreat_id`)//

drop trigger if exists taxi_rides_bump_retreat_version_insert//
create trigger taxi_rides_bump_retreat_version_insert
after insert on `taxi_rides`
for each row call bump_retreat_version(new.`retreat_id`)//

drop trigger if exists taxi_rides_bump_retreat_version_update//
create trigger taxi_rides_bump_retreat_version_update
after update on `taxi_rides`
for each row
begin
  call bump_retreat_version(new.`retreat_id`);
  if old.`retreat_id` <> new.`retreat_id` then
    call bump_retreat_version(old.`retreat_id`);
  end if;
end//

drop trigger if exists taxi_rides_bump_retreat_version_delete//
create trigger taxi_rides_bump_retreat_version_delete
after delete on `taxi_rides`
for each row call bump_retreat_version(old.`retreat_id`)//

drop trigger if exists taxi_guests_bump_retreat_version_insert//
create trigger taxi_guests_bump_retreat_version_insert
after insert on `taxi_guests`
for each row
begin
  declare target_retreat_id bigint;
  select `retreat_id` into target_retreat_id from `taxi_rides` where `id` = new.`ride_id` limit 1;
  call bump_retreat_version(target_retreat_id);
end//

drop trigger if exists taxi_guests_bump_retreat_version_update//
create trigger taxi_guests_bump_retreat_version_update
after update on `taxi_guests`
for each row
begin
  declare old_retreat_id bigint;
  declare new_retreat_id bigint;
  select `retreat_id` into old_retreat_id from `taxi_rides` where `id` = old.`ride_id` limit 1;
  select `retreat_id` into new_retreat_id from `taxi_rides` where `id` = new.`ride_id` limit 1;
  call bump_retreat_version(new_retreat_id);
  if not (old_retreat_id <=> new_retreat_id) then
    call bump_retreat_version(old_retreat_id);
  end if;
end//

drop trigger if exists taxi_guests_bump_retreat_version_delete//
create trigger taxi_guests_bump_retreat_version_delete
after delete on `taxi_guests`
for each row
begin
  declare target_retreat_id bigint;
  select `retreat_id` into target_retreat_id from `taxi_rides` where `id` = old.`ride_id` limit 1;
  call bump_retreat_version(target_retreat_id);
end//

delimiter ;
