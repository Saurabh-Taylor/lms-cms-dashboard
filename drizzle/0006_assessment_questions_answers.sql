CREATE TABLE `assessment_attempt_answers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`attempt_id` integer NOT NULL,
	`question_id` integer NOT NULL,
	`selected` text DEFAULT '[]' NOT NULL,
	`correct` integer DEFAULT false NOT NULL,
	`points` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`attempt_id`) REFERENCES `assessment_attempts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `assessment_questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attempt_answers_uniq` ON `assessment_attempt_answers` (`attempt_id`,`question_id`);--> statement-breakpoint
CREATE INDEX `attempt_answers_question_idx` ON `assessment_attempt_answers` (`question_id`);--> statement-breakpoint
CREATE TABLE `assessment_questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`assessment_id` integer NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`prompt` text NOT NULL,
	`type` text DEFAULT 'single' NOT NULL,
	`options` text DEFAULT '[]' NOT NULL,
	`correct` text DEFAULT '[]' NOT NULL,
	`points` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assessment_questions_assessment_idx` ON `assessment_questions` (`assessment_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_assessment_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`assessment_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`attempt_no` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`started_at` integer,
	`question_ids` text,
	`score` integer DEFAULT 0 NOT NULL,
	`passed` integer DEFAULT false NOT NULL,
	`submitted_at` integer,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_assessment_attempts`("id", "assessment_id", "user_id", "attempt_no", "status", "started_at", "question_ids", "score", "passed", "submitted_at") SELECT "id", "assessment_id", "user_id", "attempt_no", 'submitted' AS "status", NULL AS "started_at", NULL AS "question_ids", "score", "passed", "submitted_at" FROM `assessment_attempts`;--> statement-breakpoint
DROP TABLE `assessment_attempts`;--> statement-breakpoint
ALTER TABLE `__new_assessment_attempts` RENAME TO `assessment_attempts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `attempts_assessment_idx` ON `assessment_attempts` (`assessment_id`);--> statement-breakpoint
CREATE INDEX `attempts_user_idx` ON `assessment_attempts` (`user_id`);