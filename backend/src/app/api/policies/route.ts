import { z } from "zod";
import { NextRequest } from "next/server";
import { requireAuth, resolveTenant } from "@/lib/auth-guard";
import { ApiError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const strictTime24Regex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const updatePolicySchema = z.object({
  tenantId: z.string().optional(),
  eveningStart: z.string().regex(strictTime24Regex, "Use 24-hour HH:mm format"),
  eveningEnd: z.string().regex(strictTime24Regex, "Use 24-hour HH:mm format"),
  nightStart: z.string().regex(strictTime24Regex, "Use 24-hour HH:mm format"),
  nightEnd: z.string().regex(strictTime24Regex, "Use 24-hour HH:mm format")
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const tenantId = resolveTenant(session, req.nextUrl.searchParams.get("tenantId"));

    const policy = await prisma.policy.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { effectiveFrom: "desc" }
    });

    return jsonOk(policy);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    if (session.role !== "SUPER_ADMIN" && session.role !== "COMPANY_ADMIN") {
      throw new ApiError(403, "Forbidden");
    }

    const body = updatePolicySchema.parse(await req.json());
    const tenantId = resolveTenant(session, body.tenantId);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.policy.updateMany({
        where: { tenantId, isActive: true },
        data: { isActive: false }
      });

      return tx.policy.create({
        data: {
          tenantId,
          eveningStart: body.eveningStart,
          eveningEnd: body.eveningEnd,
          nightStart: body.nightStart,
          nightEnd: body.nightEnd,
          isActive: true,
          effectiveFrom: new Date()
        }
      });
    });

    await logAudit(prisma, {
      tenantId,
      userId: session.sub,
      action: "POLICY_UPDATE",
      entity: "Policy",
      entityId: updated.id,
      details: {
        eveningStart: updated.eveningStart,
        eveningEnd: updated.eveningEnd,
        nightStart: updated.nightStart,
        nightEnd: updated.nightEnd
      }
    });

    return jsonOk(updated);
  } catch (error) {
    return jsonError(error);
  }
}
