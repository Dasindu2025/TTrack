import { NextRequest } from "next/server";
import { requireAuth, resolveTenant } from "@/lib/auth-guard";
import { ApiError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { aggregateReport } from "@/lib/reporting";
import { formatSplitForFrontend } from "@/lib/time-entry";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    const tenantId = resolveTenant(session, req.nextUrl.searchParams.get("tenantId"));
    const startDate = req.nextUrl.searchParams.get("startDate");
    const endDate = req.nextUrl.searchParams.get("endDate");
    const requestedUserId = req.nextUrl.searchParams.get("userId");

    if (!startDate || !endDate) {
      throw new ApiError(400, "startDate and endDate are required");
    }

    const userId = session.role === "EMPLOYEE" ? session.sub : requestedUserId;

    const splits = await prisma.timeEntrySplit.findMany({
      where: {
        tenantId,
        status: "APPROVED",
        localDate: {
          gte: startDate,
          lte: endDate
        },
        ...(userId ? { userId } : {})
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, color: true } },
        timeEntry: { select: { workspaceId: true } }
      },
      orderBy: [{ localDate: "desc" }, { startTime: "desc" }]
    });

    const totals = aggregateReport(
      splits.map((item) => ({
        totalHours: item.totalHours,
        eveningHours: item.eveningHours,
        nightHours: item.nightHours
      }))
    );

    return jsonOk({
      totals,
      rows: splits.map((item) => ({
        ...formatSplitForFrontend({
          ...item,
          workspaceId: item.timeEntry.workspaceId
        }),
        user: item.user,
        project: item.project
      }))
    });
  } catch (error) {
    return jsonError(error);
  }
}
