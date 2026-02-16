import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const superEmail = "super@tyo.com";
  const adminEmail = "alice@acme.com";
  const employeeEmail = "bob@acme.com";

  const acmeTenantId = "acme-corp";

  await prisma.company.upsert({
    where: { tenantId: acmeTenantId },
    update: {},
    create: {
      tenantId: acmeTenantId,
      name: "Acme Corp",
      email: "contact@acme.com",
      timezone: "Europe/Helsinki"
    }
  });

  await prisma.workspace.upsert({
    where: { id: acmeTenantId },
    update: {
      tenantId: acmeTenantId,
      name: "General",
      status: "ACTIVE"
    },
    create: {
      id: acmeTenantId,
      tenantId: acmeTenantId,
      name: "General",
      status: "ACTIVE"
    }
  });

  const policy = await prisma.policy.findFirst({ where: { tenantId: acmeTenantId, isActive: true } });
  if (!policy) {
    await prisma.policy.create({
      data: {
        tenantId: acmeTenantId,
        eveningStart: "18:00",
        eveningEnd: "22:00",
        nightStart: "22:00",
        nightEnd: "06:00",
        isActive: true
      }
    });
  }

  const superHash = await hashPassword("password123");
  const adminHash = await hashPassword("password123");
  const employeeHash = await hashPassword("password123");

  await prisma.user.upsert({
    where: { email: superEmail },
    update: {
      passwordHash: superHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      tenantId: null
    },
    create: {
      name: "Super Admin",
      email: superEmail,
      passwordHash: superHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE"
    }
  });

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminHash,
      role: "COMPANY_ADMIN",
      status: "ACTIVE",
      tenantId: acmeTenantId
    },
    create: {
      tenantId: acmeTenantId,
      name: "Alice Manager",
      email: adminEmail,
      passwordHash: adminHash,
      role: "COMPANY_ADMIN",
      status: "ACTIVE"
    }
  });

  await prisma.user.upsert({
    where: { email: employeeEmail },
    update: {
      passwordHash: employeeHash,
      role: "EMPLOYEE",
      status: "ACTIVE",
      tenantId: acmeTenantId
    },
    create: {
      tenantId: acmeTenantId,
      name: "Bob Worker",
      email: employeeEmail,
      passwordHash: employeeHash,
      role: "EMPLOYEE",
      status: "ACTIVE",
      backdateLimitDays: 7
    }
  });

  const project = await prisma.project.findFirst({ where: { tenantId: acmeTenantId, name: "Core Platform" } });
  if (!project) {
    await prisma.project.create({
      data: {
        tenantId: acmeTenantId,
        name: "Core Platform",
        color: "#3b82f6",
        status: "ACTIVE",
        workspaceId: acmeTenantId
      }
    });
  }

  console.log("Seed complete. Demo credentials:\n- super@tyo.com / password123\n- alice@acme.com / password123\n- bob@acme.com / password123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
