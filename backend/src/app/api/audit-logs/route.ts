import { NextRequest } from "next/server";
import { requireAuth, resolveTenant } from "@/lib/auth-guard";
import { ApiError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    if (session.role !== "SUPER_ADMIN" && session.role !== "COMPANY_ADMIN") {
      throw new ApiError(403, "Forbidden");
    }

    const tenantId = resolveTenant(session, req.nextUrl.searchParams.get("tenantId"));
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? "100");

    const logs = await prisma.auditLog.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: Number.isNaN(limit) ? 100 : Math.min(limit, 500)
    });

    return jsonOk(logs);
  } catch (error) {
    return jsonError(error);
  }
}
