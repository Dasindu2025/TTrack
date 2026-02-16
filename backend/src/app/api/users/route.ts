import { UserRole } from "@prisma/client";
import { z } from "zod";
import { requireAuth, requireRoles, resolveTenant } from "@/lib/auth-guard";
import { ApiError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";
import { NextRequest } from "next/server";

const createUserSchema = z.object({
  tenantId: z.string().min(1).optional(),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole),
  backdateLimitDays: z.number().int().min(1).max(60).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional()
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRoles(session, ["SUPER_ADMIN", "COMPANY_ADMIN"]);

    const role = req.nextUrl.searchParams.get("role") as UserRole | null;
    const requestedTenantId = req.nextUrl.searchParams.get("tenantId");
    const tenantId = resolveTenant(session, requestedTenantId);

    if (session.role === "COMPANY_ADMIN" && role === "SUPER_ADMIN") {
      throw new ApiError(403, "Company admins cannot query super admins");
    }

    const roleFilter =
      role ??
      (session.role === "COMPANY_ADMIN"
        ? ({ not: "SUPER_ADMIN" as const } as const)
        : undefined);

    const users = await prisma.user.findMany({
      where: {
        tenantId,
        ...(roleFilter ? { role: roleFilter } : {})
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        role: true,
        status: true,
        backdateLimitDays: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: "desc" }
    });

    return jsonOk(users);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRoles(session, ["SUPER_ADMIN", "COMPANY_ADMIN"]);

    const body = createUserSchema.parse(await req.json());

    if (session.role === "COMPANY_ADMIN" && body.role !== "EMPLOYEE") {
      throw new ApiError(403, "Company admin can only create employees");
    }

    const tenantId = resolveTenant(session, body.tenantId);

    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase().trim() } });
    if (existing) {
      throw new ApiError(409, "User with this email already exists");
    }

    const user = await prisma.user.create({
      data: {
        tenantId,
        name: body.name,
        email: body.email.toLowerCase().trim(),
        passwordHash: await hashPassword(body.password),
        role: body.role,
        status: body.status ?? "ACTIVE",
        backdateLimitDays: body.backdateLimitDays ?? 7
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        role: true,
        status: true,
        backdateLimitDays: true
      }
    });

    await logAudit(prisma, {
      tenantId,
      userId: session.sub,
      action: "USER_CREATE",
      entity: "User",
      entityId: user.id,
      details: { email: user.email, role: user.role }
    });

    return jsonOk(user, 201);
  } catch (error) {
    return jsonError(error);
  }
}
