-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- Backfill default workspace rows for existing companies
INSERT INTO "workspaces" ("id", "tenant_id", "name", "status", "created_at", "updated_at")
SELECT c."tenant_id", c."tenant_id", 'General', 'ACTIVE'::"RecordStatus", NOW(), NOW()
FROM "companies" c
ON CONFLICT ("id") DO NOTHING;

-- Backfill workspace IDs already used by projects
INSERT INTO "workspaces" ("id", "tenant_id", "name", "status", "created_at", "updated_at")
SELECT DISTINCT p."workspace_id", p."tenant_id", 'Workspace', 'ACTIVE'::"RecordStatus", NOW(), NOW()
FROM "projects" p
WHERE p."workspace_id" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

-- Backfill workspace IDs already used by time_entries
INSERT INTO "workspaces" ("id", "tenant_id", "name", "status", "created_at", "updated_at")
SELECT DISTINCT t."workspace_id", t."tenant_id", 'Workspace', 'ACTIVE'::"RecordStatus", NOW(), NOW()
FROM "time_entries" t
WHERE t."workspace_id" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

-- CreateIndex
CREATE INDEX "workspaces_tenant_id_status_idx" ON "workspaces"("tenant_id", "status");

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "companies"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "projects_tenant_id_workspace_id_status_idx" ON "projects"("tenant_id", "workspace_id", "status");

-- CreateIndex
CREATE INDEX "time_entries_tenant_id_workspace_id_submitted_at_idx" ON "time_entries"("tenant_id", "workspace_id", "submitted_at");
