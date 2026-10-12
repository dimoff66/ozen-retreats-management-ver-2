alter table `users`
  add column if not exists `link_code` varchar(255) binary null;

create unique index if not exists `users_link_code_unique_idx`
  on `users` (`link_code`);
