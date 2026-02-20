import { EntryStatus } from "@prisma/client";
import { z } from "zod";
import { NextRequest } from "next/server";
import { DateTime } from "luxon";
import { requireAuth, resolveTenant } from "@/lib/auth-guard";
import { ApiError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createTimeEntryWithSplits, formatSplitForFrontend } from "@/lib/time-entry";
import { logAudit } from "@/lib/audit";

const baseCreateEntrySchema = z.object({
  tenantId: z.string().optional(),
  userId: z.string().optional(),
  workspaceId: z.string().optional(),
  projectId: z.string().min(1),
  notes: z.string().max(1000).optional()
});

const createEntrySchema = z.union([
  baseCreateEntrySchema.extend({
    startTime: z.string().datetime(),
    endTime: z.string().datetime()
  }),
  baseCreateEntrySchema.extend({
    localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startClock: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    endClock: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
  })
]);

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
    let startTimeIso: string;
    let endTimeIso: string;

    if ("localDate" in body) {
      const startLocal = DateTime.fromISO(`${body.localDate}T${body.startClock}`, { zone: "Europe/Helsinki" });
      if (!startLocal.isValid) {
        throw new ApiError(400, "Invalid local start time");
      }

      let endLocal = DateTime.fromISO(`${body.localDate}T${body.endClock}`, { zone: "Europe/Helsinki" });
      if (!endLocal.isValid) {
        throw new ApiError(400, "Invalid local end time");
      }

      if (endLocal <= startLocal) {
        endLocal = endLocal.plus({ days: 1 });
      }

      if (startLocal > DateTime.now().setZone("Europe/Helsinki")) {
        throw new ApiError(400, "Cannot add time entries for future dates/times.");
      }

      startTimeIso = startLocal.toUTC().toISO() as string;
      endTimeIso = endLocal.toUTC().toISO() as string;
    } else {
      startTimeIso = body.startTime;
      endTimeIso = body.endTime;
    }

    const created = await createTimeEntryWithSplits({
      prisma,
      tenantId,
      actorId: session.sub,
      actorRole: session.role,
      userId,
      projectId: body.projectId,
      workspaceId: body.workspaceId,
      startTime: startTimeIso,
      endTime: endTimeIso,
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
        startTime: startTimeIso,
        endTime: endTimeIso
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
