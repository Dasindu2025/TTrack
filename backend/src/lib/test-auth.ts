import { Prisma, PrismaClient, UserRole, type User } from "@prisma/client";
import { hashPassword } from "@/lib/password";

const DEMO_TENANT_ID = "demo-tenant";
const DEMO_COMPANY_NAME = "Demo Company";
const DEMO_COMPANY_EMAIL = "demo@tyotrack.local";
const DEMO_WORKSPACE_ID = "demo-workspace";
const DEMO_PROJECT_ID = "demo-project";

const TEST_ACCOUNTS: Record<string, { name: string; role: UserRole; tenantId: string | null }> = {
  "super@tyo.com": {
    name: "Super Admin",
    role: "SUPER_ADMIN",
    tenantId: null
  },
  "alice@acme.com": {
    name: "Alice Manager",
    role: "COMPANY_ADMIN",
    tenantId: DEMO_TENANT_ID
  },
  "bob@acme.com": {
    name: "Bob Worker",
    role: "EMPLOYEE",
    tenantId: DEMO_TENANT_ID
  }
};

function isTestLoginEnabled(): boolean {
  return process.env.ENABLE_TEST_LOGIN !== "false";
}

function testPassword(): string {
  return process.env.TEST_LOGIN_PASSWORD ?? "password123";
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

async function ensureDemoTenant(tx: Prisma.TransactionClient): Promise<void> {
  await tx.company.upsert({
    where: { tenantId: DEMO_TENANT_ID },
    update: {
      name: DEMO_COMPANY_NAME,
      timezone: "Europe/Helsinki",
      status: "ACTIVE"
    },
    create: {
      tenantId: DEMO_TENANT_ID,
      name: DEMO_COMPANY_NAME,
      email: DEMO_COMPANY_EMAIL,
      timezone: "Europe/Helsinki",
      status: "ACTIVE"
    }
  });

  const activePolicy = await tx.policy.findFirst({
    where: { tenantId: DEMO_TENANT_ID, isActive: true },
    select: { id: true }
  });

  if (!activePolicy) {
    await tx.policy.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        eveningStart: "18:00",
        eveningEnd: "22:00",
        nightStart: "22:00",
        nightEnd: "06:00",
        isActive: true
      }
    });
  }

  await tx.workspace.upsert({
    where: { id: DEMO_WORKSPACE_ID },
    update: {
      tenantId: DEMO_TENANT_ID,
      name: "General",
      status: "ACTIVE"
    },
    create: {
      id: DEMO_WORKSPACE_ID,
      tenantId: DEMO_TENANT_ID,
      name: "General",
      status: "ACTIVE"
    }
  });

  await tx.project.upsert({
    where: { id: DEMO_PROJECT_ID },
    update: {
      tenantId: DEMO_TENANT_ID,
      name: "Demo Project",
      color: "blue",
      workspaceId: DEMO_WORKSPACE_ID,
      status: "ACTIVE"
    },
    create: {
      id: DEMO_PROJECT_ID,
      tenantId: DEMO_TENANT_ID,
      name: "Demo Project",
      color: "blue",
      workspaceId: DEMO_WORKSPACE_ID,
      status: "ACTIVE"
    }
  });
}

async function upsertTestUsers(tx: Prisma.TransactionClient, passwordHash: string): Promise<void> {
  for (const [email, account] of Object.entries(TEST_ACCOUNTS)) {
    await tx.user.upsert({
      where: { email },
      update: {
        name: account.name,
        role: account.role,
        tenantId: account.tenantId,
        status: "ACTIVE",
        passwordHash,
        backdateLimitDays: account.role === "EMPLOYEE" ? 14 : 7
      },
      create: {
        name: account.name,
        email,
        role: account.role,
        tenantId: account.tenantId,
        status: "ACTIVE",
        passwordHash,
        backdateLimitDays: account.role === "EMPLOYEE" ? 14 : 7
      }
    });
  }
}

export async function authenticateTestUser(
  prisma: PrismaClient,
  email: string,
  password: string
): Promise<User | null> {
  if (!isTestLoginEnabled()) {
    return null;
  }

  const normalizedEmail = normalizeEmail(email);
  if (!TEST_ACCOUNTS[normalizedEmail]) {
    return null;
  }

  if (password !== testPassword()) {
    return null;
  }

  const passwordHash = await hashPassword(testPassword());

  await prisma.$transaction(async (tx) => {
    await ensureDemoTenant(tx);
    await upsertTestUsers(tx, passwordHash);
  });

  return prisma.user.findUnique({
    where: { email: normalizedEmail }
  });
}

