 import type { UserRole, UserStatus } from "@prisma/client";
  import { getToken } from "next-auth/jwt";
  import type { NextRequest } from "next/server";
  import { ApiError } from "@/lib/http";

  export interface SessionToken {
    sub: string;
    email: string;
    name?: string;
    role: UserRole;
    tenantId: string | null;
    status: UserStatus;
  }

  export async function requireAuth(req: Request | NextRequest): Promise<SessionToken> {
    const request = req as NextRequest;
    const secret = process.env.NEXTAUTH_SECRET;

    let token = await getToken({
      req: request,
      secret,
      salt: "authjs.session-token",
      cookieName: "__Secure-authjs.session-token",
      secureCookie: true
    });

    if (!token) {
      token = await getToken({
        req: request,
        secret,
        salt: "authjs.session-token",
        cookieName: "authjs.session-token",
        secureCookie: false
      });
    }

    if (!token) {
      throw new ApiError(401, "Unauthorized");
    }

    return {
      sub: String(token.sub),
      email: String(token.email),
      name: token.name ? String(token.name) : undefined,
      role: token.role as UserRole,
      tenantId: token.tenantId ? String(token.tenantId) : null,
      status: (token.status as UserStatus) ?? "ACTIVE"
    };
  }

  export function requireRoles(session: SessionToken, allowedRoles: UserRole[]): void {
    if (!allowedRoles.includes(session.role)) {
      throw new ApiError(403, "Forbidden");
    }

    if (session.status !== "ACTIVE") {
      throw new ApiError(403, "User account is suspended");
    }
  }

  export function resolveTenant(session: SessionToken, requestedTenantId?: string | null): string {
    if (session.role === "SUPER_ADMIN") {
      if (!requestedTenantId) {
        throw new ApiError(400, "tenantId is required for super admin operations");
      }
      return requestedTenantId;
    }

    if (!session.tenantId) {
      throw new ApiError(403, "Tenant context is missing");
    }

    if (requestedTenantId && requestedTenantId !== session.tenantId) {
      throw new ApiError(403, "Cross-tenant access is not allowed");
    }

    return session.tenantId;
  }