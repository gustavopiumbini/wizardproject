CREATE TYPE "public"."role" AS ENUM('org_manager', 'coordinator', 'receptionist', 'teacher');--> statement-breakpoint
CREATE TYPE "public"."active_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."assignment_role" AS ENUM('responsible', 'substitute');--> statement-breakpoint
CREATE TYPE "public"."assignment_status" AS ENUM('active', 'ended');--> statement-breakpoint
CREATE TYPE "public"."lesson_status" AS ENUM('scheduled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."lesson_type" AS ENUM('regular', 'individual', 'makeup', 'trial');--> statement-breakpoint
CREATE TYPE "public"."participant_kind" AS ENUM('regular', 'makeup');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('not_recorded', 'present', 'absent', 'late', 'excused');--> statement-breakpoint
CREATE TYPE "public"."attendance_sheet_status" AS ENUM('draft', 'finalized');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"active_unit_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"unit_id" uuid,
	"user_id" text NOT NULL,
	"role" "role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_uq" UNIQUE NULLS NOT DISTINCT("organization_id","unit_id","user_id","role"),
	CONSTRAINT "membership_unit_scope_ck" CHECK (("membership"."role" = 'org_manager' and "membership"."unit_id" is null) or ("membership"."role" <> 'org_manager' and "membership"."unit_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "school_unit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"timezone" text DEFAULT 'America/Sao_Paulo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "school_unit_id_org_uq" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "class_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"code" text NOT NULL,
	"level" text NOT NULL,
	"responsible_teacher_id" uuid,
	"usual_room_id" uuid,
	"capacity" integer NOT NULL,
	"status" "active_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_group_tenant_uq" UNIQUE("id","organization_id","unit_id"),
	CONSTRAINT "class_group_unit_code_uq" UNIQUE("unit_id","code"),
	CONSTRAINT "class_group_capacity_ck" CHECK ("class_group"."capacity" > 0)
);
--> statement-breakpoint
CREATE TABLE "class_membership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"class_group_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"ended_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_membership_dates_ck" CHECK ("class_membership"."ends_on" is null or "class_membership"."ends_on" >= "class_membership"."starts_on")
);
--> statement-breakpoint
CREATE TABLE "lesson_occurrence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"class_group_id" uuid,
	"room_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"timezone" text NOT NULL,
	"type" "lesson_type" DEFAULT 'regular' NOT NULL,
	"status" "lesson_status" DEFAULT 'scheduled' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"cancelled_reason" text,
	"planned_content" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_tenant_uq" UNIQUE("id","organization_id","unit_id"),
	CONSTRAINT "lesson_interval_ck" CHECK ("lesson_occurrence"."ends_at" > "lesson_occurrence"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "lesson_participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"kind" "participant_kind" DEFAULT 'regular' NOT NULL,
	"class_membership_id" uuid,
	"removed_at" timestamp with time zone,
	"removed_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_participant_tenant_uq" UNIQUE("id","organization_id","unit_id"),
	CONSTRAINT "lesson_participant_lesson_student_uq" UNIQUE("lesson_id","student_id"),
	CONSTRAINT "lesson_participant_id_lesson_uq" UNIQUE("id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "room" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"name" text NOT NULL,
	"capacity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_tenant_uq" UNIQUE("id","organization_id","unit_id"),
	CONSTRAINT "room_unit_name_uq" UNIQUE("unit_id","name"),
	CONSTRAINT "room_capacity_ck" CHECK ("room"."capacity" > 0)
);
--> statement-breakpoint
CREATE TABLE "student" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"external_id" text,
	"full_name" text NOT NULL,
	"display_name" text NOT NULL,
	"status" "active_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_tenant_uq" UNIQUE("id","organization_id","unit_id")
);
--> statement-breakpoint
CREATE TABLE "teacher_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"teacher_profile_id" uuid NOT NULL,
	"role" "assignment_role" DEFAULT 'responsible' NOT NULL,
	"status" "assignment_status" DEFAULT 'active' NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "teacher_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"user_id" text,
	"display_name" text NOT NULL,
	"status" "active_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teacher_profile_tenant_uq" UNIQUE("id","organization_id","unit_id"),
	CONSTRAINT "teacher_profile_unit_user_uq" UNIQUE("unit_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "attendance_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"status" "attendance_status" DEFAULT 'not_recorded' NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_record_lesson_participant_uq" UNIQUE("lesson_id","participant_id")
);
--> statement-breakpoint
CREATE TABLE "attendance_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"previous_status" "attendance_status" NOT NULL,
	"new_status" "attendance_status" NOT NULL,
	"reason" text NOT NULL,
	"author_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_revision_reason_ck" CHECK (length(trim("attendance_revision"."reason")) >= 5),
	CONSTRAINT "attendance_revision_change_ck" CHECK ("attendance_revision"."previous_status" <> "attendance_revision"."new_status")
);
--> statement-breakpoint
CREATE TABLE "attendance_sheet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"status" "attendance_sheet_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finalized_by" text,
	"finalized_at" timestamp with time zone,
	CONSTRAINT "attendance_sheet_lesson_uq" UNIQUE("lesson_id"),
	CONSTRAINT "attendance_sheet_finalized_ck" CHECK (("attendance_sheet"."status" = 'finalized') = ("attendance_sheet"."finalized_at" is not null and "attendance_sheet"."finalized_by" is not null))
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_unit_org_fk" FOREIGN KEY ("unit_id","organization_id") REFERENCES "public"."school_unit"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_unit" ADD CONSTRAINT "school_unit_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_group" ADD CONSTRAINT "class_group_unit_fk" FOREIGN KEY ("unit_id","organization_id") REFERENCES "public"."school_unit"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_group" ADD CONSTRAINT "class_group_teacher_fk" FOREIGN KEY ("responsible_teacher_id","organization_id","unit_id") REFERENCES "public"."teacher_profile"("id","organization_id","unit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_group" ADD CONSTRAINT "class_group_room_fk" FOREIGN KEY ("usual_room_id","organization_id","unit_id") REFERENCES "public"."room"("id","organization_id","unit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_membership" ADD CONSTRAINT "class_membership_unit_fk" FOREIGN KEY ("unit_id","organization_id") REFERENCES "public"."school_unit"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_membership" ADD CONSTRAINT "class_membership_class_fk" FOREIGN KEY ("class_group_id","organization_id","unit_id") REFERENCES "public"."class_group"("id","organization_id","unit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_membership" ADD CONSTRAINT "class_membership_student_fk" FOREIGN KEY ("student_id","organization_id","unit_id") REFERENCES "public"."student"("id","organization_id","unit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_occurrence" ADD CONSTRAINT "lesson_unit_fk" FOREIGN KEY ("unit_id","organization_id") REFERENCES "public"."school_unit"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_occurrence" ADD CONSTRAINT "lesson_class_fk" FOREIGN KEY ("class_group_id","organization_id","unit_id") REFERENCES "public"."class_group"("id","organization_id","unit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_occurrence" ADD CONSTRAINT "lesson_room_fk" FOREIGN KEY ("room_id","organization_id","unit_id") REFERENCES "public"."room"("id","organization_id","unit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_participant" ADD CONSTRAINT "lesson_participant_unit_fk" FOREIGN KEY ("unit_id","organization_id") REFERENCES "public"."school_unit"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_participant" ADD CONSTRAINT "lesson_participant_lesson_fk" FOREIGN KEY ("lesson_id","organization_id","unit_id") REFERENCES "public"."lesson_occurrence"("id","organization_id","unit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_participant" ADD CONSTRAINT "lesson_participant_student_fk" FOREIGN KEY ("student_id","organization_id","unit_id") REFERENCES "public"."student"("id","organization_id","unit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_participant" ADD CONSTRAINT "lesson_participant_membership_fk" FOREIGN KEY ("class_membership_id") REFERENCES "public"."class_membership"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room" ADD CONSTRAINT "room_unit_fk" FOREIGN KEY ("unit_id","organization_id") REFERENCES "public"."school_unit"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student" ADD CONSTRAINT "student_unit_fk" FOREIGN KEY ("unit_id","organization_id") REFERENCES "public"."school_unit"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignment" ADD CONSTRAINT "teacher_assignment_unit_fk" FOREIGN KEY ("unit_id","organization_id") REFERENCES "public"."school_unit"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignment" ADD CONSTRAINT "teacher_assignment_lesson_fk" FOREIGN KEY ("lesson_id","organization_id","unit_id") REFERENCES "public"."lesson_occurrence"("id","organization_id","unit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assignment" ADD CONSTRAINT "teacher_assignment_teacher_fk" FOREIGN KEY ("teacher_profile_id","organization_id","unit_id") REFERENCES "public"."teacher_profile"("id","organization_id","unit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_profile" ADD CONSTRAINT "teacher_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_profile" ADD CONSTRAINT "teacher_profile_unit_fk" FOREIGN KEY ("unit_id","organization_id") REFERENCES "public"."school_unit"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_record_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_record_unit_fk" FOREIGN KEY ("unit_id","organization_id") REFERENCES "public"."school_unit"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_record_lesson_fk" FOREIGN KEY ("lesson_id","organization_id","unit_id") REFERENCES "public"."lesson_occurrence"("id","organization_id","unit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_record_participant_fk" FOREIGN KEY ("participant_id","organization_id","unit_id") REFERENCES "public"."lesson_participant"("id","organization_id","unit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_record_participant_lesson_fk" FOREIGN KEY ("participant_id","lesson_id") REFERENCES "public"."lesson_participant"("id","lesson_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_revision" ADD CONSTRAINT "attendance_revision_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_revision" ADD CONSTRAINT "attendance_revision_unit_fk" FOREIGN KEY ("unit_id","organization_id") REFERENCES "public"."school_unit"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_revision" ADD CONSTRAINT "attendance_revision_lesson_fk" FOREIGN KEY ("lesson_id","organization_id","unit_id") REFERENCES "public"."lesson_occurrence"("id","organization_id","unit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_revision" ADD CONSTRAINT "attendance_revision_participant_lesson_fk" FOREIGN KEY ("participant_id","lesson_id") REFERENCES "public"."lesson_participant"("id","lesson_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sheet" ADD CONSTRAINT "attendance_sheet_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sheet" ADD CONSTRAINT "attendance_sheet_finalized_by_user_id_fk" FOREIGN KEY ("finalized_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sheet" ADD CONSTRAINT "attendance_sheet_unit_fk" FOREIGN KEY ("unit_id","organization_id") REFERENCES "public"."school_unit"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sheet" ADD CONSTRAINT "attendance_sheet_lesson_fk" FOREIGN KEY ("lesson_id","organization_id","unit_id") REFERENCES "public"."lesson_occurrence"("id","organization_id","unit_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "membership_user_idx" ON "membership" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "school_unit_org_idx" ON "school_unit" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "class_membership_open_uq" ON "class_membership" USING btree ("class_group_id","student_id") WHERE "class_membership"."ends_on" is null;--> statement-breakpoint
CREATE INDEX "class_membership_student_idx" ON "class_membership" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "class_membership_class_idx" ON "class_membership" USING btree ("class_group_id","starts_on");--> statement-breakpoint
CREATE INDEX "lesson_unit_starts_idx" ON "lesson_occurrence" USING btree ("unit_id","starts_at");--> statement-breakpoint
CREATE INDEX "lesson_class_starts_idx" ON "lesson_occurrence" USING btree ("class_group_id","starts_at");--> statement-breakpoint
CREATE INDEX "student_unit_idx" ON "student" USING btree ("unit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_assignment_active_uq" ON "teacher_assignment" USING btree ("lesson_id") WHERE "teacher_assignment"."status" = 'active';--> statement-breakpoint
CREATE INDEX "teacher_assignment_teacher_idx" ON "teacher_assignment" USING btree ("teacher_profile_id");--> statement-breakpoint
CREATE INDEX "teacher_assignment_lesson_idx" ON "teacher_assignment" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "attendance_revision_lesson_idx" ON "attendance_revision" USING btree ("lesson_id");