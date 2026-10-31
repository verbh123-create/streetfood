import "server-only";
import { z } from "zod";
import { and, eq, gte, lte, inArray, desc } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { trucks, regions, products, coupons, orders, orderItems, subscriptions } from "@/db/schema";
import { currentUser, digest } from "./auth";
import { HttpError } from "./server";
import { timeSlots, localDate } from "./types";
const lineSchema = z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(20), removedIngredients: z.array(z.string().max(100)).max(30).default([]) });
export const checkoutSchema = z.object({ truck: z.enum(["beverage", "food"]), name: z.string().trim().min(2).max(100), phone: z.string().trim().min(5).max(30).regex(/^\+?[\d ()-]+$/, "Enter a valid phone number").refine(value => value.replace(/\D/g, "").length >= 5, "Enter a valid phone number"), email: z.union([z.string().trim().email().max(254), z.literal("")]).optional(), fulfillment: z.enum(["delivery", "pickup"]), regionId: z.string().uuid(), address: z.string().trim().max(500).default(""), notes: z.string().trim().max(1000).default(""), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^\d{2}:\d{2}$/), coupon: z.string().trim().max(40).optional(), items: z.array(lineSchema).min(1).max(30) });
type Checkout = z.infer<typeof checkoutSchema>;
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export function scheduleAt(date: string, time: string) { const result = new Date(`${date}T${time}:00+03:00`); if (!Number.isFinite(result.getTime())) throw new HttpError(400, "Choose a valid date and time."); return result; }
async function context(data: Omit<Checkout, "items">) {
  const [truck] = await db.select().from(trucks).where(eq(trucks.id, data.truck));
  if (!truck) throw new HttpError(404, "Truck not found.");
  const [region] = await db.select().from(regions).where(and(eq(regions.id, data.regionId), eq(regions.truck, data.truck), eq(regions.active, true)));
  if (!region) throw new HttpError(400, "Select a valid delivery area for this truck.");
  if (data.fulfillment === "delivery" && data.address.length < 5) throw new HttpError(400, "Please enter your complete delivery address.");
  if (!timeSlots(truck.hours).includes(data.time)) throw new HttpError(400, "That time is outside this truck's operating hours.");
  return { truck, region, user: await currentUser() };
}
async function pricedLines(truck: string, items: z.infer<typeof lineSchema>[]) {
  const ids = [...new Set(items.map(i => i.productId))];
  const menu = await db.select().from(products).where(and(eq(products.truck, truck), eq(products.available, true), inArray(products.id, ids)));
  if (menu.length !== ids.length) throw new HttpError(400, "A selected item is unavailable. Please refresh the menu.");
  return items.map(item => { const product = menu.find(p => p.id === item.productId)!; if (item.removedIngredients.some(i => !product.ingredients.includes(i))) throw new HttpError(400, "An ingredient selection is invalid."); return { productId: product.id, name: product.name, price: product.price, quantity: item.quantity, removedIngredients: item.removedIngredients }; });
}
async function saveOrder(tx: Transaction, data: Checkout, ctx: Awaited<ReturnType<typeof context>>, lines: Awaited<ReturnType<typeof pricedLines>>, percent: number, subscriptionId?: string) {
  const subtotal = lines.reduce((n, l) => n + l.price * l.quantity, 0); const discount = Math.round(subtotal * percent / 100);
  const deliveryFee = data.fulfillment === "delivery" ? ctx.region.fee : 0; const token = randomBytes(32).toString("hex");
  const [order] = await tx.insert(orders).values({ truck: data.truck, userId: ctx.user?.id, subscriptionId, customerName: data.name, phone: data.phone, email: data.email || ctx.user?.email || null, regionId: data.regionId, address: data.fulfillment === "delivery" ? data.address : "Pickup from truck", fulfillment: data.fulfillment, type: subscriptionId ? "subscription" : "direct", subtotal, discount, deliveryFee, total: subtotal - discount + deliveryFee, coupon: subscriptionId ? null : data.coupon?.toUpperCase(), notes: data.notes, trackingHash: digest(token), scheduledAt: scheduleAt(data.date, data.time) }).returning();
  await tx.insert(orderItems).values(lines.map(line => ({ ...line, orderId: order.id })));
  return { id: order.id, number: order.number, total: order.total, token };
}
export async function createOrder(input: unknown) {
  const data = checkoutSchema.parse(input); const ctx = await context(data); const scheduled = scheduleAt(data.date, data.time);
  if (scheduled.getTime() < Date.now() - 60000 || scheduled.getTime() > Date.now() + 31 * 86400000) throw new HttpError(400, "Choose a future time within the next 30 days.");
  const lines = await pricedLines(data.truck, data.items); let percent = 0;
  if (data.coupon) { const [coupon] = await db.select().from(coupons).where(and(eq(coupons.truck, data.truck), eq(coupons.code, data.coupon.toUpperCase()), eq(coupons.active, true), lte(coupons.startsAt, new Date()), gte(coupons.endsAt, new Date()))); if (!coupon) throw new HttpError(400, "This promotional code is invalid or has expired."); percent = coupon.percent; }
  return db.transaction(tx => saveOrder(tx, data, ctx, lines, percent));
}
const subscriptionSchema = checkoutSchema.omit({ items: true, coupon: true, date: true }).extend({ startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), selections: z.array(z.object({ weekday: z.number().int().min(0).max(6), productId: z.string().uuid(), quantity: z.number().int().min(1).max(20) })).min(1).max(7) });
export async function createSubscription(input: unknown) {
  const plan = subscriptionSchema.parse(input);
  if (new Set(plan.selections.map(s => s.weekday)).size !== plan.selections.length) throw new HttpError(400, "Choose one selection for each active day.");
  const start = new Date(`${plan.startDate}T12:00:00Z`); const end = new Date(`${plan.endDate}T12:00:00Z`);
  if (plan.startDate < localDate() || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start || end.getTime() - start.getTime() > 60 * 86400000 || start.getTime() > Date.now() + 60 * 86400000) throw new HttpError(400, "Select a future date range of up to 60 days.");
  const base = { ...plan, date: plan.startDate, items: [] }; const ctx = await context(base);
  const schedule: { data: Checkout; lines: Awaited<ReturnType<typeof pricedLines>> }[] = [];
  for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const selection = plan.selections.find(s => s.weekday === d.getUTCDay()); if (!selection) continue;
    const date = d.toISOString().slice(0, 10); if (scheduleAt(date, plan.time).getTime() < Date.now()) throw new HttpError(400, "A selected delivery time has already passed. Choose a later starting date.");
    const items = [{ productId: selection.productId, quantity: selection.quantity, removedIngredients: [] }]; const lines = await pricedLines(plan.truck, items); schedule.push({ data: { ...base, date, items }, lines });
  }
  if (!schedule.length) throw new HttpError(400, "There are no active days within this date range.");
  const total = schedule.reduce((sum, day) => { const subtotal = day.lines.reduce((n, i) => n + i.price * i.quantity, 0); return sum + subtotal - Math.round(subtotal * ctx.truck.discount / 100) + (plan.fulfillment === "delivery" ? ctx.region.fee : 0); }, 0);
  return db.transaction(async tx => {
    const [subscription] = await tx.insert(subscriptions).values({ truck: plan.truck, userId: ctx.user?.id, customerName: plan.name, startDate: plan.startDate, endDate: plan.endDate, time: plan.time, selections: plan.selections, total, discount: ctx.truck.discount }).returning();
    const generated = []; for (const day of schedule) generated.push(await saveOrder(tx, day.data, ctx, day.lines, ctx.truck.discount, subscription.id));
    return { id: subscription.id, total, count: generated.length, orders: generated };
  });
}
export async function attachItems(records: (typeof orders.$inferSelect)[]) {
  const lines = records.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, records.map(o => o.id))) : [];
  return records.map(record => { const { trackingHash: _, ...order } = record; return { ...order, items: lines.filter(i => i.orderId === record.id) }; });
}
export async function getTruckOrders(truck: string) {
  const scope = truck === "global" ? undefined : eq(orders.truck, truck);
  const [pending, completed] = await Promise.all([
    db.select().from(orders).where(and(scope, eq(orders.status, "NOT_READY"))).orderBy(desc(orders.scheduledAt)),
    db.select().from(orders).where(and(scope, eq(orders.status, "COMPLETED"))).orderBy(desc(orders.createdAt)).limit(200),
  ]);
  return attachItems([...pending, ...completed]);
}
