import { z } from "zod";
import { NextRequest } from "next/server";
import { requireAuth, requireRoles, resolveTenant } from "@/lib/auth-guard";
import { ApiError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const updateCompanySchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  timezone: z.string().min(2).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional()
});

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await requireAuth(req);
    requireRoles(session, ["SUPER_ADMIN", "COMPANY_ADMIN"]);

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      throw new ApiError(404, "Company not found");
    }

    const tenantId = resolveTenant(session, company.tenantId);
    if (tenantId !== company.tenantId) {
      throw new ApiError(403, "Forbidden");
    }

    return jsonOk(company);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await requireAuth(req);
    requireRoles(session, ["SUPER_ADMIN", "COMPANY_ADMIN"]);

    const body = updateCompanySchema.parse(await req.json());

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      throw new ApiError(404, "Company not found");
    }

    const tenantId = resolveTenant(session, company.tenantId);
    if (tenantId !== company.tenantId) {
      throw new ApiError(403, "Forbidden");
    }

    const updated = await prisma.company.update({
      where: { id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.email ? { email: body.email.toLowerCase().trim() } : {}),
        ...(body.timezone ? { timezone: body.timezone } : {}),
        ...(body.status ? { status: body.status } : {})
      }
    });

    await logAudit(prisma, {
      tenantId,
      userId: session.sub,
      action: "COMPANY_UPDATE",
      entity: "Company",
      entityId: company.id,
      details: { fields: Object.keys(body) }
    });

    return jsonOk(updated);
  } catch (error) {
    return jsonError(error);
  }
}
