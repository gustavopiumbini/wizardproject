ALTER TABLE "class_membership" ADD CONSTRAINT "class_membership_tenant_uq" UNIQUE("id","organization_id","unit_id");--> statement-breakpoint
ALTER TABLE "lesson_participant" DROP CONSTRAINT "lesson_participant_membership_fk";
--> statement-breakpoint
ALTER TABLE "lesson_participant" ADD CONSTRAINT "lesson_participant_membership_fk" FOREIGN KEY ("class_membership_id","organization_id","unit_id") REFERENCES "public"."class_membership"("id","organization_id","unit_id") ON DELETE no action ON UPDATE no action;
