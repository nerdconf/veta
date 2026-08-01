CREATE TABLE `library_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`has_real_import` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `library_items` ADD `content` text DEFAULT '' NOT NULL;