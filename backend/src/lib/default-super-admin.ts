import { Prisma, PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/password";

export const DEFAULT_SUPER_ADMIN_EMAIL = "yasanth2@gmail.com";
const DEFAULT_SUPER_ADMIN_PASSWORD = "Yas@1234";
const DEFAULT_SUPER_ADMIN_NAME = "Yasanth Super Admin";

export async function ensureDefaultSuperAdmin(prisma: PrismaClient): Promise<void> {
  const existing = await prisma.user.findUnique({
    where: { email: DEFAULT_SUPER_ADMIN_EMAIL },
    select: { id: true }
  });

  if (existing) {
    return;
  }

  const passwordHash = await hashPassword(DEFAULT_SUPER_ADMIN_PASSWORD);

  try {
    await prisma.user.create({
      data: {
        name: DEFAULT_SUPER_ADMIN_NAME,
        email: DEFAULT_SUPER_ADMIN_EMAIL,
        passwordHash,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        tenantId: null
      }
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return;
    }

    throw error;
  }
}
