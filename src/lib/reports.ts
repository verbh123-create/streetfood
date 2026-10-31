import "server-only";
import { and, eq, gte, lte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { HttpError } from "./server";
export async function reportData(truck: string, from: string, to: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new HttpError(400, "Choose a valid report date range.");
  const start = new Date(`${from}T00:00:00+03:00`), end = new Date(`${to}T23:59:59.999+03:00`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end || end.getTime() - start.getTime() > 366 * 86400000) throw new HttpError(400, "Report ranges can cover up to one year.");
  const records = await db.select().from(orders).where(and(truck === "global" ? undefined : eq(orders.truck, truck), gte(orders.createdAt, start), lte(orders.createdAt, end)));
  const lines = records.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, records.map(o => o.id))) : [];
  const revenue = records.reduce((n, o) => n + o.total, 0); const subs = records.filter(o => o.type === "subscription");
  const performance = new Map<string, { name: string; quantity: number; revenue: number }>();
  for (const line of lines) { const entry = performance.get(line.name) ?? { name: line.name, quantity: 0, revenue: 0 }; entry.quantity += line.quantity; entry.revenue += line.quantity * line.price; performance.set(line.name, entry); }
  const daily: { date: string; revenue: number; orders: number }[] = [];
  const d = new Date(`${from}T12:00:00Z`); while (d.toISOString().slice(0, 10) <= to) { const date = d.toISOString().slice(0, 10); const matching = records.filter(o => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bahrain", year: "numeric", month: "2-digit", day: "2-digit" }).format(o.createdAt) === date); daily.push({ date, revenue: matching.reduce((n, o) => n + o.total, 0), orders: matching.length }); d.setUTCDate(d.getUTCDate() + 1); }
  return { from, to, revenue, orderCount: records.length, averageOrder: records.length ? Math.round(revenue / records.length) : 0, subscriptionRevenue: subs.reduce((n, o) => n + o.total, 0), subscriptionOrders: subs.length, completed: records.filter(o => o.status === "COMPLETED").length, daily, performance: [...performance.values()].sort((a, b) => b.revenue - a.revenue), orders: records.map(({ trackingHash: _, ...order }) => order) };
}
