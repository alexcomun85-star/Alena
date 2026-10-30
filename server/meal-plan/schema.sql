CREATE TABLE `ai_budget` (
	`bucket` text PRIMARY KEY NOT NULL,
	`used` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_budget_expires` ON `ai_budget` (`expires`);--> statement-breakpoint
CREATE TABLE `ai_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`request_hash` text NOT NULL,
	`owner` text NOT NULL,
	`status` text NOT NULL,
	`result` text,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_requests_expires` ON `ai_requests` (`expires`);