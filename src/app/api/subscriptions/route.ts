import { NextRequest } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { currentUser, rateLimit } from "@/lib/auth";
import { createSubscription } from "@/lib/ordering";
import { assertOrigin, errorResponse, HttpError } from "@/lib/server";
import { sendOrderConfirmation } from "@/lib/email";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) { try { assertOrigin(request); await rateLimit(`subscriptions:${request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local"}`, 10); const body = await request.json(); const result = await createSubscription(body); if (result.orders[0]) await sendOrderConfirmation(body.email || null, result.orders[0].number, result.total); return Response.json(result, { status: 201 }); } catch (error) { return errorResponse(error); } }
export async function GET() { try { const user = await currentUser(); if (!user) throw new HttpError(401, "Please sign in."); return Response.json({ subscriptions: await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).orderBy(desc(subscriptions.createdAt)) }); } catch (error) { return errorResponse(error); } }
