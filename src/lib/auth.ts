import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, rateLimits } from "@/db/schema";
import { HttpError } from "./server";
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const safeUser = (user: typeof users.$inferSelect) => { const { passwordHash: _, createdAt: __, ...profile } = user; return profile; };
export async function currentUser() {
  const token = (await cookies()).get("stt_session")?.value;
  if (!token) return null;
  const [result] = await db.select({ user: users }).from(sessions).innerJoin(users, eq(users.id, sessions.userId)).where(and(eq(sessions.tokenHash, digest(token)), gt(sessions.expiresAt, new Date())));
  return result?.user ?? null;
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  await db.insert(sessions).values({ tokenHash: digest(token), userId, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) });
  (await cookies()).set("stt_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}
export async function logout() { const jar = await cookies(); const token = jar.get("stt_session")?.value; if (token) await db.delete(sessions).where(eq(sessions.tokenHash, digest(token))); jar.delete("stt_session"); }
export async function requireStaff(truck: string, permission = "orders") {
  const user = await currentUser();
  if (!user || user.role === "customer") throw new HttpError(401, "Please sign in with an authorized staff account.");
  if (user.role === "superadmin") return user;
  if (truck === "global" || user.truck !== truck) throw new HttpError(403, "Your account cannot access this truck.");
  if (user.role === "kitchen" && permission !== "orders") throw new HttpError(403, "Kitchen accounts can only manage orders.");
  if (!user.permissions.includes("*") && !user.permissions.includes(permission)) throw new HttpError(403, "You don't have permission for this action.");
  return user;
}
export async function rateLimit(key: string, maximum = 10, minutes = 15) {
  const now = new Date(); const reset = new Date(Date.now() + minutes * 60000);
  const [record] = await db.insert(rateLimits).values({ key: digest(key), count: 1, resetAt: reset }).onConflictDoUpdate({ target: rateLimits.key, set: { count: sql`case when ${rateLimits.resetAt} < ${now} then 1 else ${rateLimits.count} + 1 end`, resetAt: sql`case when ${rateLimits.resetAt} < ${now} then ${reset} else ${rateLimits.resetAt} end` } }).returning();
  if (record.count > maximum) throw new HttpError(429, "Too many attempts. Please try again in a few minutes.");
}
