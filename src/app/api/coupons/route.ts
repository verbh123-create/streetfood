import { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq, lte, gte } from "drizzle-orm";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { rateLimit } from "@/lib/auth";
import { assertOrigin, errorResponse, HttpError } from "@/lib/server";
export async function POST(request: NextRequest) { try { assertOrigin(request); await rateLimit(`coupon:${request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local"}`, 20); const data = z.object({ truck: z.enum(["food", "beverage"]), code: z.string().trim().toUpperCase().min(1).max(40) }).parse(await request.json()); const [coupon] = await db.select({ code: coupons.code, percent: coupons.percent }).from(coupons).where(and(eq(coupons.truck, data.truck), eq(coupons.code, data.code), eq(coupons.active, true), lte(coupons.startsAt, new Date()), gte(coupons.endsAt, new Date()))); if (!coupon) throw new HttpError(400, "This code is invalid or has expired."); return Response.json(coupon); } catch (error) { return errorResponse(error); } }
