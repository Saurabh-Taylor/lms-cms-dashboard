ALTER TABLE `assessment_attempts` ADD `submission` text;--> statement-breakpoint
ALTER TABLE `assessment_attempts` ADD `feedback` text;--> statement-breakpoint
ALTER TABLE `assessment_attempts` ADD `graded_at` integer;--> statement-breakpoint
ALTER TABLE `assessment_attempts` ADD `graded_by` integer REFERENCES users(id);