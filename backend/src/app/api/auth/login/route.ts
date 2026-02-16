import { encode } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { ApiError, jsonError, jsonOk } from "@/lib/http";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());

    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase().trim() }
    });

    if (!user || user.status !== "ACTIVE") {
      throw new ApiError(401, "Invalid credentials");
    }

    const isValid = await verifyPassword(body.password, user.passwordHash);
    if (!isValid) {
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
      maxAge: 60 * 60 * 24 * 30
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
      maxAge: 60 * 60 * 24 * 30
    };

    response.cookies.set(isSecure ? "__Secure-authjs.session-token" : "authjs.session-token", token, baseCookie);

    return response;
  } catch (error) {
    return jsonError(error);
  }
}
