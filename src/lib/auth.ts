import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

// ── Session type augmentation ──────────────────────────────────────────────

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      tenantId: string | null;
      locale: string;
      theme: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    tenantId: string | null;
    locale: string;
    theme: string;
  }
}

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Required when deployed behind a reverse proxy (Coolify, Vercel, etc.)
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error:  "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email, isActive: true },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data:  { lastLoginAt: new Date() },
        });

        return {
          id:       user.id,
          email:    user.email,
          name:     user.name,
          role:     user.role,
          tenantId: user.tenantId,
          locale:   user.locale,
          theme:    user.theme,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id       = user.id;
        token.role     = user.role;
        token.tenantId = user.tenantId;
        token.locale   = user.locale;
        token.theme    = user.theme;
      }
      // Backfill from DB if stale token is missing id (older session cookie)
      if (!token.id && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          select: { id: true, role: true, tenantId: true, locale: true, theme: true },
        });
        if (dbUser) {
          token.id       = dbUser.id;
          token.role     = dbUser.role;
          token.tenantId = dbUser.tenantId;
          token.locale   = dbUser.locale;
          token.theme    = dbUser.theme;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id       = token.id       as string;
        session.user.role     = token.role     as string;
        session.user.tenantId = token.tenantId as string | null;
        session.user.locale   = token.locale   as string;
        session.user.theme    = token.theme    as string;
      }
      return session;
    },
  },
});

// ── Role guards ────────────────────────────────────────────────────────────

export function isSuperAdmin(role: string): boolean {
  return role === "SUPER_ADMIN";
}

export function isAdmin(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function canManage(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "CUSTOMER";
}
