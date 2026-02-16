import { z } from "zod";
import { NextRequest } from "next/server";
import { requireAuth, requireRoles, resolveTenant } from "@/lib/auth-guard";
import { ApiError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const updateWorkspaceSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional()
});

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await requireAuth(req);
    requireRoles(session, ["SUPER_ADMIN", "COMPANY_ADMIN", "EMPLOYEE"]);

    const workspace = await prisma.workspace.findUnique({ where: { id } });
    if (!workspace) {
      throw new ApiError(404, "Workspace not found");
    }

    resolveTenant(session, workspace.tenantId);
    return jsonOk(workspace);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await requireAuth(req);
    requireRoles(session, ["SUPER_ADMIN", "COMPANY_ADMIN"]);

    const body = updateWorkspaceSchema.parse(await req.json());

    const workspace = await prisma.workspace.findUnique({ where: { id } });
    if (!workspace) {
      throw new ApiError(404, "Workspace not found");
    }

    const tenantId = resolveTenant(session, workspace.tenantId);

    if (body.status === "ARCHIVED" && workspace.status !== "ARCHIVED") {
      const [activeWorkspaceCount, activeProjectCount] = await Promise.all([
        prisma.workspace.count({
          where: {
            tenantId,
            status: "ACTIVE"
          }
        }),
        prisma.project.count({
          where: {
            tenantId,
            workspaceId: workspace.id,
            status: "ACTIVE"
          }
        })
      ]);

      if (activeWorkspaceCount <= 1) {
        throw new ApiError(409, "At least one active workspace is required");
      }

      if (activeProjectCount > 0) {
        throw new ApiError(409, "Move or archive active projects before archiving this workspace");
      }
    }

    const updated = await prisma.workspace.update({
      where: { id },
      data: {
        ...(body.name ? { name: body.name.trim() } : {}),
        ...(body.status ? { status: body.status } : {})
      }
    });

    await logAudit(prisma, {
      tenantId,
      userId: session.sub,
      action: "WORKSPACE_UPDATE",
      entity: "Workspace",
      entityId: updated.id,
      details: { fields: Object.keys(body) }
    });

    return jsonOk(updated);
  } catch (error) {
    return jsonError(error);
  }
}
