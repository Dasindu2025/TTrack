import { UserRole } from "@prisma/client";
import { z } from "zod";
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { ApiError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  backdateLimitDays: z.number().int().min(1).max(60).optional(),
  role: z.nativeEnum(UserRole).optional()
});

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await requireAuth(req);

    const user = await prisma.user.findUnique({
      where: { id },
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

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const isOwner = session.sub === id;
    const isAdmin = session.role === "SUPER_ADMIN" || session.role === "COMPANY_ADMIN";

    if (!isOwner && !isAdmin) {
      throw new ApiError(403, "Forbidden");
    }

    if (session.role === "COMPANY_ADMIN" && user.tenantId !== session.tenantId) {
      throw new ApiError(403, "Cross-tenant access is not allowed");
    }

    return jsonOk(user);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await requireAuth(req);
    const body = updateSchema.parse(await req.json());

    const current = await prisma.user.findUnique({ where: { id } });
    if (!current) {
      throw new ApiError(404, "User not found");
    }

    const isOwner = session.sub === id;
    const isAdmin = session.role === "SUPER_ADMIN" || session.role === "COMPANY_ADMIN";

    if (!isOwner && !isAdmin) {
      throw new ApiError(403, "Forbidden");
    }

    if (session.role === "COMPANY_ADMIN" && current.tenantId !== session.tenantId) {
      throw new ApiError(403, "Cross-tenant access is not allowed");
    }

    if (!isAdmin && (body.status || body.role || body.backdateLimitDays !== undefined)) {
      throw new ApiError(403, "Only admins can change role, status, or backdate policy");
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.email ? { email: body.email.toLowerCase().trim() } : {}),
        ...(body.status ? { status: body.status } : {}),
        ...(body.role ? { role: body.role } : {}),
        ...(body.backdateLimitDays !== undefined ? { backdateLimitDays: body.backdateLimitDays } : {})
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

    if (current.tenantId) {
      await logAudit(prisma, {
        tenantId: current.tenantId,
        userId: session.sub,
        action: "USER_UPDATE",
        entity: "User",
        entityId: updated.id,
        details: { fields: Object.keys(body) }
      });
    }

    return jsonOk(updated);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await requireAuth(req);

    if (session.role !== "SUPER_ADMIN" && session.role !== "COMPANY_ADMIN") {
      throw new ApiError(403, "Forbidden");
    }

    const current = await prisma.user.findUnique({ where: { id } });
    if (!current) {
      throw new ApiError(404, "User not found");
    }

    if (session.role === "COMPANY_ADMIN" && current.tenantId !== session.tenantId) {
      throw new ApiError(403, "Cross-tenant access is not allowed");
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status: "SUSPENDED" },
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

    if (current.tenantId) {
      await logAudit(prisma, {
        tenantId: current.tenantId,
        userId: session.sub,
        action: "USER_SUSPEND",
        entity: "User",
        entityId: updated.id,
        details: { email: updated.email }
      });
    }

    return jsonOk(updated);
  } catch (error) {
    return jsonError(error);
  }
}
