import { UserRole, UserStatus } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role: UserRole;
    tenantId: string | null;
    status: UserStatus;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      role: UserRole;
      tenantId: string | null;
      status: UserStatus;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    tenantId?: string | null;
    status?: UserStatus;
  }
}
