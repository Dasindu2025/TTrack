import { NextRequest } from "next/server";
import { requireAuth, resolveTenant } from "@/lib/auth-guard";
import { ApiError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await requireAuth(req);

    if (session.role !== "SUPER_ADMIN" && session.role !== "COMPANY_ADMIN") {
      throw new ApiError(403, "Only admins can delete company time entries");
    }

    const existing = await prisma.timeEntrySplit.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            tenantId: true,
            name: true,
            email: true
          }
        },
        timeEntry: {
          select: {
            id: true,
            tenantId: true,
            status: true,
            startTime: true,
            endTime: true,
            totalHours: true
          }
        }
      }
    });

    if (!existing) {
      throw new ApiError(404, "Time entry not found");
    }

    const tenantId = resolveTenant(session, existing.tenantId);

    const splitCount = await prisma.timeEntrySplit.count({
      where: { timeEntryId: existing.timeEntryId }
    });

    await prisma.timeEntry.delete({
      where: { id: existing.timeEntryId }
    });

    await logAudit(prisma, {
      tenantId,
      userId: session.sub,
      action: "TIME_ENTRY_DELETE",
      entity: "TimeEntry",
      entityId: existing.timeEntry.id,
      details: {
        deletedSplitId: id,
        deletedSplitCount: splitCount,
        ownerUserId: existing.user.id,
        ownerName: existing.user.name,
        ownerEmail: existing.user.email,
        previousStatus: existing.timeEntry.status,
        startTime: existing.timeEntry.startTime.toISOString(),
        endTime: existing.timeEntry.endTime.toISOString(),
        totalHours: existing.timeEntry.totalHours
      }
    });

    return jsonOk({
      deleted: true,
      timeEntryId: existing.timeEntry.id,
      deletedSplitCount: splitCount
    });
  } catch (error) {
    return jsonError(error);
  }
}
