CREATE TABLE `library_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`url` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`author` text NOT NULL,
	`handle` text NOT NULL,
	`source` text NOT NULL,
	`saved_at` text NOT NULL,
	`reading_minutes` integer NOT NULL,
	`summary` text NOT NULL,
	`preview` text NOT NULL,
	`why_it_matters` text NOT NULL,
	`key_points` text NOT NULL,
	`tags` text NOT NULL,
	`accent` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_library_items_user_url` ON `library_items` (`user_id`,`url`);