import { EntryStatus } from "@prisma/client";
import { z } from "zod";
import { NextRequest } from "next/server";
import { requireAuth, resolveTenant } from "@/lib/auth-guard";
import { ApiError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { formatSplitForFrontend, updateSplitStatus } from "@/lib/time-entry";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  status: z.nativeEnum(EntryStatus),
  reason: z.string().max(500).optional()
});

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await requireAuth(req);

    if (session.role !== "SUPER_ADMIN" && session.role !== "COMPANY_ADMIN") {
      throw new ApiError(403, "Only admins can approve or reject entries");
    }

    const body = schema.parse(await req.json());

    const existing = await prisma.timeEntrySplit.findUnique({
      where: { id },
      include: { timeEntry: { select: { workspaceId: true } } }
    });
    if (!existing) {
      throw new ApiError(404, "Entry not found");
    }

    const tenantId = resolveTenant(session, existing.tenantId);

    const updated = await updateSplitStatus({
      prisma,
      splitId: id,
      status: body.status,
      actorId: session.sub,
      reason: body.reason
    });

    await logAudit(prisma, {
      tenantId,
      userId: session.sub,
      action: body.status === EntryStatus.APPROVED ? "TIME_ENTRY_APPROVE" : "TIME_ENTRY_REJECT",
      entity: "TimeEntrySplit",
      entityId: id,
      details: { reason: body.reason }
    });

    return jsonOk(
      formatSplitForFrontend({
        ...updated,
        workspaceId: existing.timeEntry.workspaceId
      })
    );
  } catch (error) {
    return jsonError(error);
  }
}
