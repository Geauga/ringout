CREATE TABLE `custom_maps` (
	`id` text PRIMARY KEY NOT NULL,
	`map_json` text NOT NULL,
	`revision` integer NOT NULL,
	`updated_at` integer NOT NULL
);
