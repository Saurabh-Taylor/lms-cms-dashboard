ALTER TABLE `users` ADD `auth_user_id` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `users_auth_user_uniq` ON `users` (`auth_user_id`);