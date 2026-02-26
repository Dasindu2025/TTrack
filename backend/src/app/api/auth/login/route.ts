import { encode } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { ApiError, jsonError, jsonOk } from "@/lib/http";
import { ensureDefaultSuperAdmin } from "@/lib/default-super-admin";

const SESSION_MAX_AGE_SECONDS = 60 * 60;

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export async function POST(req: Request) {
  try {
    const body = credentialsSchema.parse(await req.json());
    await ensureDefaultSuperAdmin(prisma);

    const dbUser = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase().trim() }
    });

    let user = dbUser;

    if (user && user.status === "ACTIVE") {
      const isValid = await verifyPassword(body.password, user.passwordHash);
      if (!isValid) {
        user = null;
      }
    }

    if (!user || user.status !== "ACTIVE") {
      throw new ApiError(401, "Invalid credentials");
    }

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      throw new ApiError(500, "NEXTAUTH_SECRET is not configured");
    }

    const token = await encode({
      token: {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        status: user.status
      },
      secret,
      salt: "authjs.session-token",
      maxAge: SESSION_MAX_AGE_SECONDS
    });

    const response = jsonOk({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.tenantId,
      status: user.status
    });

    const isSecure = process.env.NODE_ENV === "production";
    const baseCookie = {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax" as const,
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS
    };

    response.cookies.set(isSecure ? "__Secure-authjs.session-token" : "authjs.session-token", token, baseCookie);

    return response;
  } catch (error) {
    return jsonError(error);
  }
}
