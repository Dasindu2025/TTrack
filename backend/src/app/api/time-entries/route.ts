import { EntryStatus } from "@prisma/client";
import { z } from "zod";
import { NextRequest } from "next/server";
import { requireAuth, resolveTenant } from "@/lib/auth-guard";
import { ApiError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createTimeEntryWithSplits, formatSplitForFrontend } from "@/lib/time-entry";
import { logAudit } from "@/lib/audit";

const createEntrySchema = z.object({
  tenantId: z.string().optional(),
  userId: z.string().optional(),
  workspaceId: z.string().optional(),
  projectId: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  notes: z.string().max(1000).optional()
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const tenantId = resolveTenant(session, req.nextUrl.searchParams.get("tenantId"));

    const userIdQuery = req.nextUrl.searchParams.get("userId");
    const startDate = req.nextUrl.searchParams.get("startDate");
    const endDate = req.nextUrl.searchParams.get("endDate");
    const status = req.nextUrl.searchParams.get("status") as EntryStatus | null;

    const userId = session.role === "EMPLOYEE" ? session.sub : userIdQuery;

    const splits = await prisma.timeEntrySplit.findMany({
      where: {
        tenantId,
        ...(userId ? { userId } : {}),
        ...(status ? { status } : {}),
        ...(startDate || endDate
          ? {
              localDate: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {})
              }
            }
          : {})
      },
      include: {
        timeEntry: { select: { workspaceId: true } }
      },
      orderBy: [{ localDate: "desc" }, { startTime: "desc" }]
    });

    return jsonOk(
      splits.map((split) =>
        formatSplitForFrontend({
          ...split,
          workspaceId: split.timeEntry.workspaceId
        })
      )
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const body = createEntrySchema.parse(await req.json());

    const tenantId = resolveTenant(session, body.tenantId);
    const userId = session.role === "EMPLOYEE" ? session.sub : body.userId ?? session.sub;

    const created = await createTimeEntryWithSplits({
      prisma,
      tenantId,
      actorId: session.sub,
      actorRole: session.role,
      userId,
      projectId: body.projectId,
      workspaceId: body.workspaceId,
      startTime: body.startTime,
      endTime: body.endTime,
      notes: body.notes
    });

    await logAudit(prisma, {
      tenantId,
      userId: session.sub,
      action: "TIME_ENTRY_CREATE",
      entity: "TimeEntry",
      entityId: created.entry.id,
      details: {
        userId,
        splitCount: created.splits.length,
        startTime: body.startTime,
        endTime: body.endTime
      }
    });

    return jsonOk(
      created.splits.map((split) =>
        formatSplitForFrontend({
          ...split,
          workspaceId: created.entry.workspaceId
        })
      ),
      201
    );
  } catch (error) {
    return jsonError(error);
  }
}
