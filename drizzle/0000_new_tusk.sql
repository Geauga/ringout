CREATE TABLE `pin_attempts` (
	`bucket` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `pin_attempts_expiry` ON `pin_attempts` (`expires_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`verifier_tag` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sessions_expiry` ON `sessions` (`expires_at`);