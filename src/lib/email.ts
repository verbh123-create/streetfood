import "server-only";
import { randomInt } from "node:crypto";
import { Resend } from "resend";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { emailTokens } from "@/db/schema";
import { digest } from "./auth";
import { HttpError } from "./server";
export function requireEmail() { if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) throw new HttpError(503, "Email verification is not configured yet. You can still order as a guest."); }
export async function sendEmail(to: string, subject: string, html: string) {
  requireEmail();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({ from: process.env.RESEND_FROM!, to: [to], subject, html: `<div style="font-family:Arial,sans-serif;background:#121212;color:#f5f5f5;padding:40px;max-width:560px"><h2 style="color:#ffe600">STREET TASTE TRUCK</h2>${html}<hr style="border-color:#333;margin-top:32px"/><p style="color:#a0a0a0;font-size:12px">Fresh from the streets of Bahrain. If you didn't request this email, you can safely ignore it.</p></div>` });
  if (error) throw new HttpError(503, "We couldn't deliver your email. Please try again shortly.");
}
export async function sendOtp(userId: string, email: string, purpose: "verify" | "reset") {
  const code = String(randomInt(100000, 1000000));
  await sendEmail(email, purpose === "verify" ? "Verify your Street Taste account" : "Reset your Street Taste password", `<h3>${purpose === "verify" ? "Welcome to the street!" : "A fresh start."}</h3><p>Your ${purpose === "verify" ? "verification" : "password reset"} code:</p><p style="font-size:38px;letter-spacing:8px;font-weight:700;color:#ffe600">${code}</p><p>This code expires in 10 minutes. Never share it.</p>`);
  await db.transaction(async tx => { await tx.delete(emailTokens).where(and(eq(emailTokens.userId, userId), eq(emailTokens.purpose, purpose))); await tx.insert(emailTokens).values({ userId, tokenHash: digest(code), purpose, expiresAt: new Date(Date.now() + 600000) }); });
}
export async function sendOrderConfirmation(email: string | null, number: number, total: number) {
  if (!email || !process.env.RESEND_API_KEY || !process.env.RESEND_FROM) return;
  try { await sendEmail(email, `Order #${String(number).padStart(4, "0")} received`, `<h3>Good taste is on its way.</h3><p>We received order #${number}.</p><p>Total: <strong>BHD ${(total / 1000).toFixed(3)}</strong></p><p>Payment is due on pickup or delivery. Thank you for choosing Street Taste Truck!</p>`); } catch (error) { console.error("Order email delivery failed", error instanceof Error ? error.message : "Email failure"); }
}
