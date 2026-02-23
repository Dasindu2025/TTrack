-- Add per-employee auto approval mode for time entries
ALTER TABLE "users"
ADD COLUMN "auto_approve_entries" BOOLEAN NOT NULL DEFAULT false;
