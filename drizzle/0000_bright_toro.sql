CREATE TABLE `activity_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`course_id` integer,
	`meta` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `activity_user_idx` ON `activity_events` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `activity_type_idx` ON `activity_events` (`type`);--> statement-breakpoint
CREATE INDEX `activity_course_idx` ON `activity_events` (`course_id`);--> statement-breakpoint
CREATE INDEX `activity_created_idx` ON `activity_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `announcements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`audience` text DEFAULT 'all' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`scheduled_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `assessment_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`assessment_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`attempt_no` integer DEFAULT 1 NOT NULL,
	`score` integer NOT NULL,
	`passed` integer NOT NULL,
	`submitted_at` integer NOT NULL,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `attempts_assessment_idx` ON `assessment_attempts` (`assessment_id`);--> statement-breakpoint
CREATE INDEX `attempts_user_idx` ON `assessment_attempts` (`user_id`);--> statement-breakpoint
CREATE TABLE `assessments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`course_id` integer,
	`title` text NOT NULL,
	`kind` text DEFAULT 'quiz' NOT NULL,
	`question_count` integer DEFAULT 0 NOT NULL,
	`passing_score` integer DEFAULT 70 NOT NULL,
	`max_attempts` integer DEFAULT 1 NOT NULL,
	`time_limit_min` integer DEFAULT 30 NOT NULL,
	`shuffle_questions` integer DEFAULT false NOT NULL,
	`show_results` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`avg_score` integer DEFAULT 0 NOT NULL,
	`pass_rate` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `assessments_course_idx` ON `assessments` (`course_id`);--> statement-breakpoint
CREATE INDEX `assessments_kind_idx` ON `assessments` (`kind`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_id` integer,
	`actor_name` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` integer,
	`target_label` text NOT NULL,
	`module` text NOT NULL,
	`details` text DEFAULT '{}' NOT NULL,
	`ip` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_module_idx` ON `audit_logs` (`module`);--> statement-breakpoint
CREATE INDEX `audit_actor_idx` ON `audit_logs` (`actor_id`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `certificates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`serial` text NOT NULL,
	`user_id` integer NOT NULL,
	`course_id` integer NOT NULL,
	`issued_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `certificates_serial_unique` ON `certificates` (`serial`);--> statement-breakpoint
CREATE INDEX `certs_user_idx` ON `certificates` (`user_id`);--> statement-breakpoint
CREATE INDEX `certs_course_idx` ON `certificates` (`course_id`);--> statement-breakpoint
CREATE TABLE `courses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`category_id` integer,
	`instructor_id` integer,
	`difficulty` text DEFAULT 'beginner' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	`estimated_minutes` integer DEFAULT 0 NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`thumbnail_color` text DEFAULT '#6366f1' NOT NULL,
	`certificate_enabled` integer DEFAULT false NOT NULL,
	`enrollment_count` integer DEFAULT 0 NOT NULL,
	`completion_rate` integer DEFAULT 0 NOT NULL,
	`avg_progress` integer DEFAULT 0 NOT NULL,
	`lesson_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`instructor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `courses_slug_unique` ON `courses` (`slug`);--> statement-breakpoint
CREATE INDEX `courses_status_idx` ON `courses` (`status`);--> statement-breakpoint
CREATE INDEX `courses_category_idx` ON `courses` (`category_id`);--> statement-breakpoint
CREATE INDEX `courses_instructor_idx` ON `courses` (`instructor_id`);--> statement-breakpoint
CREATE INDEX `courses_updated_idx` ON `courses` (`updated_at`);--> statement-breakpoint
CREATE TABLE `email_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`course_id` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`enrolled_at` integer NOT NULL,
	`expires_at` integer,
	`completed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrollments_uniq` ON `enrollments` (`user_id`,`course_id`);--> statement-breakpoint
CREATE INDEX `enrollments_course_idx` ON `enrollments` (`course_id`);--> statement-breakpoint
CREATE INDEX `enrollments_status_idx` ON `enrollments` (`status`);--> statement-breakpoint
CREATE INDEX `enrollments_enrolled_idx` ON `enrollments` (`enrolled_at`);--> statement-breakpoint
CREATE TABLE `group_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `group_members_uniq` ON `group_members` (`group_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `group_members_user_idx` ON `group_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lab_assignments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lab_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`course_id` integer,
	`status` text DEFAULT 'assigned' NOT NULL,
	`assigned_at` integer NOT NULL,
	`expires_at` integer,
	FOREIGN KEY (`lab_id`) REFERENCES `labs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lab_assign_uniq` ON `lab_assignments` (`lab_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `lab_assign_user_idx` ON `lab_assignments` (`user_id`);--> statement-breakpoint
CREATE TABLE `labs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'container' NOT NULL,
	`category_id` integer,
	`description` text,
	`duration_min` integer DEFAULT 60 NOT NULL,
	`resource_tier` text DEFAULT 'small' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`assigned_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `labs_status_idx` ON `labs` (`status`);--> statement-breakpoint
CREATE TABLE `learning_paths` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`course_ids` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `learning_paths_slug_unique` ON `learning_paths` (`slug`);--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`section_id` integer NOT NULL,
	`title` text NOT NULL,
	`type` text DEFAULT 'text' NOT NULL,
	`duration_min` integer DEFAULT 10 NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`position` integer NOT NULL,
	`blocks` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lessons_section_idx` ON `lessons` (`section_id`,`position`);--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`size_kb` integer NOT NULL,
	`uploaded_by_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`uploaded_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `sections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`course_id` integer NOT NULL,
	`title` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sections_course_idx` ON `sections` (`course_id`,`position`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'learner' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`title` text,
	`enrolled_count` integer DEFAULT 0 NOT NULL,
	`labs_count` integer DEFAULT 0 NOT NULL,
	`avg_progress` integer DEFAULT 0 NOT NULL,
	`last_active_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `users_status_idx` ON `users` (`status`);--> statement-breakpoint
CREATE INDEX `users_last_active_idx` ON `users` (`last_active_at`);--> statement-breakpoint
CREATE INDEX `users_created_idx` ON `users` (`created_at`);