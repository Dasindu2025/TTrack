import { z } from "zod";
import { NextRequest } from "next/server";
import { requireAuth, requireRoles, resolveTenant } from "@/lib/auth-guard";
import { ApiError, jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";

const createCompanySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  timezone: z.string().default("Europe/Helsinki").optional(),
  adminName: z.string().min(2).optional(),
  adminEmail: z.string().email().optional(),
  adminPassword: z.string().min(8).optional()
});

function createTenantId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 32);

  return `${slug || "tenant"}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRoles(session, ["SUPER_ADMIN", "COMPANY_ADMIN"]);

    const requestedTenantId = req.nextUrl.searchParams.get("tenantId");

    const companies = await prisma.company.findMany({
      where:
        session.role === "SUPER_ADMIN"
          ? requestedTenantId
            ? { tenantId: requestedTenantId }
            : {}
          : { tenantId: resolveTenant(session, requestedTenantId) },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        timezone: true,
        status: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: "desc" }
    });

    return jsonOk(companies);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRoles(session, ["SUPER_ADMIN"]);

    const body = createCompanySchema.parse(await req.json());

    const existing = await prisma.company.findUnique({ where: { email: body.email.toLowerCase().trim() } });
    if (existing) {
      throw new ApiError(409, "Company email already exists");
    }

    const tenantId = createTenantId(body.name);

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          tenantId,
          name: body.name,
          email: body.email.toLowerCase().trim(),
          timezone: body.timezone ?? "Europe/Helsinki"
        }
      });

      await tx.policy.create({
        data: {
          tenantId,
          eveningStart: "18:00",
          eveningEnd: "22:00",
          nightStart: "22:00",
          nightEnd: "06:00",
          isActive: true
        }
      });

      await tx.workspace.create({
        data: {
          // Keep default workspace id stable and human-readable per tenant.
          id: tenantId,
          tenantId,
          name: "General",
          status: "ACTIVE"
        }
      });

      let adminUser: { id: string; email: string } | null = null;

      if (body.adminEmail && body.adminPassword && body.adminName) {
        adminUser = await tx.user.create({
          data: {
            tenantId,
            name: body.adminName,
            email: body.adminEmail.toLowerCase().trim(),
            passwordHash: await hashPassword(body.adminPassword),
            role: "COMPANY_ADMIN",
            status: "ACTIVE"
          },
          select: {
            id: true,
            email: true
          }
        });
      }

      return { company, adminUser };
    });

    await logAudit(prisma, {
      tenantId,
      userId: session.sub,
      action: "COMPANY_CREATE",
      entity: "Company",
      entityId: result.company.id,
      details: {
        name: result.company.name,
        email: result.company.email,
        adminEmail: result.adminUser?.email
      }
    });

    return jsonOk(result, 201);
  } catch (error) {
    return jsonError(error);
  }
}
