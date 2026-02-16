import { z } from "zod";
import { NextRequest } from "next/server";
import { requireAuth, resolveTenant } from "@/lib/auth-guard";
import { ApiError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const updateProjectSchema = z.object({
  name: z.string().min(2).optional(),
  color: z.string().min(4).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
  workspaceId: z.string().nullable().optional()
});

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await requireAuth(req);

    if (session.role !== "SUPER_ADMIN" && session.role !== "COMPANY_ADMIN") {
      throw new ApiError(403, "Forbidden");
    }

    const body = updateProjectSchema.parse(await req.json());

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new ApiError(404, "Project not found");
    }

    const tenantId = resolveTenant(session, project.tenantId);
    let workspaceId = body.workspaceId;

    if (workspaceId !== undefined && workspaceId !== null) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { tenantId: true, status: true }
      });

      if (!workspace || workspace.status !== "ACTIVE") {
        throw new ApiError(404, "Workspace not found or inactive");
      }

      if (workspace.tenantId !== project.tenantId) {
        throw new ApiError(400, "Workspace must belong to the same tenant as the project");
      }

      resolveTenant(session, workspace.tenantId);
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.color ? { color: body.color } : {}),
        ...(body.status ? { status: body.status } : {}),
        ...(workspaceId !== undefined ? { workspaceId } : {})
      }
    });

    await logAudit(prisma, {
      tenantId,
      userId: session.sub,
      action: "PROJECT_UPDATE",
      entity: "Project",
      entityId: project.id,
      details: { fields: Object.keys(body) }
    });

    return jsonOk(updated);
  } catch (error) {
    return jsonError(error);
  }
}
