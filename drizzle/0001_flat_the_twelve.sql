ALTER TABLE `exercises` ADD `remembered_extra_fields` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `sets` ADD `rir` integer;--> statement-breakpoint
ALTER TABLE `workout_exercises` ADD `extra_fields` text DEFAULT '[]' NOT NULL;