CREATE TABLE `lesson_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`enrollment_id` integer NOT NULL,
	`lesson_id` integer NOT NULL,
	`completed_at` integer NOT NULL,
	FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_progress_uniq` ON `lesson_progress` (`enrollment_id`,`lesson_id`);--> statement-breakpoint
CREATE INDEX `lesson_progress_lesson_idx` ON `lesson_progress` (`lesson_id`);