import { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { orders, auditLogs } from "@/db/schema";
import { currentUser, digest, rateLimit, requireStaff } from "@/lib/auth";
import { attachItems, createOrder } from "@/lib/ordering";
import { assertOrigin, errorResponse, HttpError } from "@/lib/server";
import { sendOrderConfirmation } from "@/lib/email";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) { try { assertOrigin(request); await rateLimit(`orders:${request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local"}`, 30); const body = await request.json(); const order = await createOrder(body); await sendOrderConfirmation(body.email || null, order.number, order.total); return Response.json(order, { status: 201 }); } catch (error) { return errorResponse(error); } }
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser(); const id = request.nextUrl.searchParams.get("id");
    if (id) {
      z.string().uuid().parse(id); const [order] = await db.select().from(orders).where(eq(orders.id, id)); if (!order) throw new HttpError(404, "Order not found.");
      const token = request.nextUrl.searchParams.get("token");
      const owner = user && order.userId === user.id;
      if (!owner && !(token && digest(token) === order.trackingHash)) { if (!user || user.role === "customer") throw new HttpError(403, "This order link is private."); await requireStaff(order.truck); }
      return Response.json({ order: (await attachItems([order]))[0] }, { headers: { "Cache-Control": "no-store" } });
    }
    if (!user) throw new HttpError(401, "Sign in to view your order history.");
    return Response.json({ orders: await attachItems(await db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt)).limit(100)) });
  } catch (error) { return errorResponse(error); }
}
export async function PATCH(request: NextRequest) {
  try {
    assertOrigin(request); const data = z.object({ id: z.string().uuid(), status: z.enum(["NOT_READY", "COMPLETED"]) }).parse(await request.json());
    const [order] = await db.select().from(orders).where(eq(orders.id, data.id)); if (!order) throw new HttpError(404, "Order not found.");
    const user = await requireStaff(order.truck);
    if (user.role === "kitchen" && (data.status !== "COMPLETED" || order.status === "COMPLETED")) throw new HttpError(403, "Completed orders cannot be changed in the kitchen.");
    const updated = await db.transaction(async tx => {
      const [record] = await tx.update(orders).set({ status: data.status, completedAt: data.status === "COMPLETED" ? new Date() : null }).where(and(eq(orders.id, data.id), user.role === "kitchen" ? eq(orders.status, "NOT_READY") : undefined)).returning();
      if (!record) throw new HttpError(409, "This order was already updated. Refresh the board.");
      await tx.insert(auditLogs).values({ actorId: user.id, action: "order.status", entityId: order.id, details: { from: order.status, to: data.status, role: user.role } }); return record;
    });
    return Response.json({ order: (await attachItems([updated]))[0] });
  } catch (error) { return errorResponse(error); }
}
