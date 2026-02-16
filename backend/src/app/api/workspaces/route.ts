import { z } from "zod";
import { NextRequest } from "next/server";
import { requireAuth, requireRoles, resolveTenant } from "@/lib/auth-guard";
import { ApiError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const createWorkspaceSchema = z.object({
  tenantId: z.string().min(1).optional(),
  name: z.string().min(2).max(120),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional()
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRoles(session, ["SUPER_ADMIN", "COMPANY_ADMIN", "EMPLOYEE"]);

    const tenantId = resolveTenant(session, req.nextUrl.searchParams.get("tenantId"));
    const status = req.nextUrl.searchParams.get("status") as "ACTIVE" | "ARCHIVED" | null;

    const workspaces = await prisma.workspace.findMany({
      where: {
        tenantId,
        ...(status ? { status } : {})
      },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }]
    });

    return jsonOk(workspaces);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRoles(session, ["SUPER_ADMIN", "COMPANY_ADMIN"]);

    const body = createWorkspaceSchema.parse(await req.json());
    const tenantId = resolveTenant(session, body.tenantId);

    const duplicate = await prisma.workspace.findFirst({
      where: {
        tenantId,
        name: body.name.trim()
      },
      select: { id: true }
    });

    if (duplicate) {
      throw new ApiError(409, "Workspace with this name already exists");
    }

    const workspace = await prisma.workspace.create({
      data: {
        tenantId,
        name: body.name.trim(),
        status: body.status ?? "ACTIVE"
      }
    });

    await logAudit(prisma, {
      tenantId,
      userId: session.sub,
      action: "WORKSPACE_CREATE",
      entity: "Workspace",
      entityId: workspace.id,
      details: { name: workspace.name }
    });

    return jsonOk(workspace, 201);
  } catch (error) {
    return jsonError(error);
  }
}
