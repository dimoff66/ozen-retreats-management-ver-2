alter table public.users
  add column if not exists link_code text;

create unique index if not exists users_link_code_unique_idx
  on public.users (link_code)
  where link_code is not null;

alter table public.users
  drop constraint if exists users_link_code_length_check;

alter table public.users
  add constraint users_link_code_length_check
  check (link_code is null or (char_length(link_code) between 1 and 255));
