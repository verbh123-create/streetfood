import { NextRequest } from "next/server";
import { z } from "zod";
import { compare, hash } from "bcryptjs";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { users, regions, emailTokens, sessions } from "@/db/schema";
import { createSession, currentUser, digest, logout, rateLimit, safeUser } from "@/lib/auth";
import { requireEmail, sendOtp } from "@/lib/email";
import { assertOrigin, errorResponse, HttpError } from "@/lib/server";
export const dynamic = "force-dynamic";
const emailSchema = z.string().trim().toLowerCase().email().max(254);
const passwordSchema = z.string().min(8, "Use at least 8 characters").max(128).refine(value => Buffer.byteLength(value, "utf8") <= 72, "Password must be 72 UTF-8 bytes or fewer");
export async function GET() { try { const user = await currentUser(); return Response.json({ user: user ? safeUser(user) : null }); } catch (error) { return errorResponse(error); } }
export async function POST(request: NextRequest) {
  try {
    assertOrigin(request);
    const body = await request.json();
    const action = z.enum(["login", "register", "verify", "resend", "forgot", "reset", "logout", "password", "profile"]).parse(body.action);
    if (action === "logout") { await logout(); return Response.json({ success: true }); }
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
    await rateLimit(`auth-ip:${ip}`, 60);
    if (action === "login") {
      const data = z.object({ identifier: z.string().trim().toLowerCase().min(2).max(254), password: z.string().min(1).max(128) }).parse(body);
      await rateLimit(`login:${data.identifier}`);
      const [user] = await db.select().from(users).where(data.identifier.includes("@") ? eq(users.email, data.identifier) : eq(users.username, data.identifier));
      if (!user || !(await compare(data.password, user.passwordHash))) throw new HttpError(401, "The email, username, or password is incorrect.");
      if (!user.verified) throw new HttpError(403, "Please verify your email first. Use the verification option below.");
      await createSession(user.id); return Response.json({ user: safeUser(user) });
    }
    if (action === "register") {
      requireEmail();
      const data = z.object({ name: z.string().trim().min(2).max(100), email: emailSchema, password: passwordSchema, phone: z.string().trim().min(5).max(30), regionId: z.string().uuid(), address: z.string().trim().min(5).max(500) }).parse(body);
      await rateLimit(`register:${data.email}`, 3, 60);
      const [region] = await db.select().from(regions).where(and(eq(regions.id, data.regionId), eq(regions.active, true)));
      if (!region) throw new HttpError(400, "Choose a valid delivery area.");
      const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email));
      if (exists) throw new HttpError(409, "An account already exists. Sign in or resend your verification code.");
      const { password, ...profile } = data;
      const [user] = await db.insert(users).values({ ...profile, passwordHash: await hash(password, 12) }).returning();
      await sendOtp(user.id, data.email, "verify");
      return Response.json({ success: true, message: "Check your email for a 6-digit verification code." }, { status: 201 });
    }
    if (action === "password") {
      const user = await currentUser(); if (!user) throw new HttpError(401, "Please sign in.");
      const data = z.object({ oldPassword: z.string().min(1), password: passwordSchema }).parse(body);
      if (!(await compare(data.oldPassword, user.passwordHash))) throw new HttpError(400, "Your current password is incorrect.");
      await db.transaction(async tx => { await tx.update(users).set({ passwordHash: await hash(data.password, 12) }).where(eq(users.id, user.id)); await tx.delete(sessions).where(eq(sessions.userId, user.id)); });
      await createSession(user.id); return Response.json({ success: true });
    }
    if (action === "profile") {
      const user = await currentUser(); if (!user) throw new HttpError(401, "Please sign in.");
      const data = z.object({ name: z.string().trim().min(2).max(100), phone: z.string().trim().min(5).max(30), address: z.string().trim().min(5).max(500), regionId: z.string().uuid() }).parse(body);
      const [region] = await db.select().from(regions).where(and(eq(regions.id, data.regionId), eq(regions.active, true))); if (!region) throw new HttpError(400, "Choose a valid delivery area.");
      const [updated] = await db.update(users).set(data).where(eq(users.id, user.id)).returning(); return Response.json({ user: safeUser(updated) });
    }
    const email = emailSchema.parse(body.email);
    await rateLimit(`${action}:${email}`, 6);
    requireEmail();
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (action === "forgot" || action === "resend") {
      if (user && (action === "forgot" || !user.verified)) await sendOtp(user.id, email, action === "forgot" ? "reset" : "verify");
      return Response.json({ success: true, message: "If this account is eligible, a code has been sent to your email." });
    }
    const code = z.string().regex(/^\d{6}$/, "Enter the 6-digit code").parse(body.code);
    const password = action === "reset" ? passwordSchema.parse(body.password) : undefined;
    if (!user) throw new HttpError(400, "This code is invalid or has expired.");
    const purpose = action === "reset" ? "reset" : "verify";
    const result = await db.transaction(async tx => {
      const [token] = await tx.select().from(emailTokens).where(and(eq(emailTokens.userId, user.id), eq(emailTokens.purpose, purpose))).orderBy(desc(emailTokens.createdAt)).limit(1).for("update");
      if (!token || token.expiresAt < new Date() || token.attempts >= 5) return false;
      if (token.tokenHash !== digest(code)) { await tx.update(emailTokens).set({ attempts: token.attempts + 1 }).where(eq(emailTokens.id, token.id)); return false; }
      await tx.delete(emailTokens).where(eq(emailTokens.id, token.id));
      if (password) { await tx.update(users).set({ passwordHash: await hash(password, 12), verified: true }).where(eq(users.id, user.id)); await tx.delete(sessions).where(eq(sessions.userId, user.id)); }
      else await tx.update(users).set({ verified: true }).where(eq(users.id, user.id));
      return true;
    });
    if (!result) throw new HttpError(400, "This code is invalid or has expired. Request a new code.");
    if (action === "verify") { await createSession(user.id); return Response.json({ user: { ...safeUser(user), verified: true } }); }
    return Response.json({ success: true, message: "Password updated. You can now sign in." });
  } catch (error) { return errorResponse(error); }
}
