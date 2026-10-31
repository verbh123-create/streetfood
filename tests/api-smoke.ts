import "dotenv/config";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db, pool } from "../src/db";
import { orders, subscriptions, coupons, banners, users, sessions, auditLogs } from "../src/db/schema";
import { localDate, type Catalog } from "../src/lib/types";
const base = process.env.BASE_URL || "http://localhost:3000";
const ids: string[] = [], subscriptionIds: string[] = [], couponIds: string[] = [], bannerIds: string[] = [], employeeIds: string[] = [], sessionHashes: string[] = [];
async function call<T = Record<string, unknown>>(path: string, body?: unknown, cookie?: string, method = body ? "POST" : "GET") { const response = await fetch(`${base}${path}`, { method, headers: { "Content-Type": "application/json", Origin: new URL(base).origin, "x-forwarded-for": "127.0.0.77", ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); const data = await response.json() as T; return { status: response.status, data, response }; }
async function login(identifier: string, password: string) { const result = await call("/api/auth", { action: "login", identifier, password }); assert.equal(result.status, 200, `Login failed: ${identifier}: ${JSON.stringify(result.data)}`); const cookie = result.response.headers.get("set-cookie")!.split(";")[0]; sessionHashes.push(createHash("sha256").update(cookie.split("=")[1]).digest("hex")); return cookie; }
const plusDays = (date: string, days: number) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
async function main() {
  assert.equal((await fetch(`${base}/api/health`)).status, 200);
  const html = await (await fetch(base)).text(); assert(!html.includes('href="/admin')); assert(!html.includes('href="/kitchen'));
  assert.equal((await call("/api/manage?resource=orders&truck=global")).status, 401);
  assert.equal((await fetch(`${base}/api/auth`, { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://untrusted.example" }, body: JSON.stringify({ action: "login", identifier: "ahmad", password: "Verde@123" }) })).status, 403);
  const beverage = (await call<Catalog>("/api/catalog/beverage")).data, food = (await call<Catalog>("/api/catalog/food")).data;
  assert(beverage.products.length >= 8 && food.products.length >= 8); assert(beverage.regions.length && food.regions.length);
  const admin = await login("ahmad", "Verde@123"), kitchen = await login("beverage", "12345678");
  assert.equal((await call("/api/manage?resource=orders&truck=food", undefined, kitchen)).status, 403);
  assert.equal((await call("/api/manage?resource=products&truck=beverage", undefined, kitchen)).status, 403);
  assert.equal((await call("/api/reports?truck=beverage", undefined, kitchen)).status, 403);
  const tomorrow = plusDays(localDate(), 1); const item = beverage.products[0];
  const payload = { truck: "beverage", name: "API Smoke Customer", phone: "+973 39999999", email: "", fulfillment: "pickup", regionId: beverage.regions[0].id, address: "", date: tomorrow, time: beverage.truck.hours[0].open, notes: "__API_SMOKE__", items: [{ productId: item.id, quantity: 2, removedIngredients: [] }], total: 1, subtotal: 1 };
  assert.equal((await call("/api/orders", { ...payload, time: "15:30" })).status, 400);
  assert.equal((await call("/api/orders", { ...payload, regionId: food.regions[0].id })).status, 400);
  const placed = await call<{ id: string; number: number; total: number; token: string }>("/api/orders", payload); assert.equal(placed.status, 201, JSON.stringify(placed.data)); ids.push(placed.data.id); assert.equal(placed.data.total, item.price * 2);
  assert.equal((await call(`/api/orders?id=${placed.data.id}&token=wrong`)).status, 403);
  assert.equal((await call(`/api/orders?id=${placed.data.id}&token=${placed.data.token}`)).status, 200);
  assert.equal((await call("/api/orders", { id: placed.data.id, status: "COMPLETED" }, kitchen, "PATCH")).status, 200);
  assert.equal((await call("/api/orders", { id: placed.data.id, status: "NOT_READY" }, kitchen, "PATCH")).status, 403);
  assert.equal((await call("/api/orders", { id: placed.data.id, status: "NOT_READY" }, admin, "PATCH")).status, 200);
  const code = `TEST${Date.now().toString().slice(-8)}`;
  const coupon = await call<{ data: { id: string }[] }>("/api/manage", { resource: "coupons", truck: "beverage", action: "create", values: { code, percent: 15, startsAt: new Date(Date.now() - 86400000).toISOString(), endsAt: new Date(Date.now() + 86400000).toISOString(), active: true } }, admin); assert.equal(coupon.status, 200, JSON.stringify(coupon.data)); couponIds.push(coupon.data.data[0].id);
  assert.equal((await call<{ percent: number }>("/api/coupons", { truck: "beverage", code })).data.percent, 15);
  const discounted = await call<{ id: string; total: number }>("/api/orders", { ...payload, coupon: code, fulfillment: "delivery", address: "Building 12, Road 3, Block 4" }); assert.equal(discounted.status, 201, JSON.stringify(discounted.data)); ids.push(discounted.data.id); assert.equal(discounted.data.total, item.price * 2 - Math.round(item.price * 2 * .15) + beverage.regions[0].fee);
  const weekday = new Date(`${tomorrow}T12:00:00Z`).getUTCDay();
  const plan = await call<{ id: string; count: number; total: number; orders: { id: string }[] }>("/api/subscriptions", { ...payload, startDate: tomorrow, endDate: plusDays(tomorrow, 6), fulfillment: "delivery", address: "Building 12, Road 3, Block 4", selections: [{ weekday, productId: item.id, quantity: 1 }, { weekday: (weekday + 2) % 7, productId: item.id, quantity: 1 }] }); assert.equal(plan.status, 201, JSON.stringify(plan.data)); subscriptionIds.push(plan.data.id); ids.push(...plan.data.orders.map(o => o.id)); assert.equal(plan.data.count, 2); assert.equal(plan.data.total, 2 * (item.price - Math.round(item.price * beverage.truck.discount / 100) + beverage.regions[0].fee));
  const announcement = await call<{ data: { id: string }[] }>("/api/manage", { resource: "banners", truck: "food", action: "create", values: { title: "API smoke announcement", titleAr: "اختبار", text: "Scheduled banner test", textAr: "اختبار", image: "", startsAt: new Date(Date.now() - 1000).toISOString(), endsAt: new Date(Date.now() + 60000).toISOString(), active: true } }, admin); assert.equal(announcement.status, 200); bannerIds.push(announcement.data.data[0].id); assert((await call<Catalog>("/api/catalog/food")).data.banners.some(b => b.id === bannerIds[0]));
  const username = `test_${Date.now().toString().slice(-10)}`;
  const employee = await call("/api/manage", { resource: "employees", truck: "global", action: "create", values: { username, name: "Smoke Test Employee", email: "", role: "employee", truck: "food", permissions: ["orders"], password: "SmokeTest123!" } }, admin); assert.equal(employee.status, 200, JSON.stringify(employee.data));
  const [employeeRow] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)); employeeIds.push(employeeRow.id); const limited = await login(username, "SmokeTest123!");
  assert.equal((await call("/api/manage?resource=orders&truck=food", undefined, limited)).status, 200);
  assert.equal((await call("/api/manage?resource=products&truck=food", undefined, limited)).status, 403);
  assert.equal((await call("/api/manage?resource=orders&truck=beverage", undefined, limited)).status, 403);
  assert.equal((await call("/api/manage", { resource: "employees", truck: "food", action: "create", values: {} }, limited)).status, 403);
  const [ahmad] = await db.select({ id: users.id }).from(users).where(eq(users.username, "ahmad"));
  assert.equal((await call("/api/manage", { resource: "employees", truck: "global", action: "delete", id: ahmad.id }, admin)).status, 403);
  const customers = await call("/api/manage?resource=customers&truck=global", undefined, admin); assert.equal(customers.status, 200); assert(!JSON.stringify(customers.data).includes("passwordHash"));
  assert.equal((await call("/api/manage?resource=site&truck=global", undefined, admin)).status, 200);
  const reportQuery = `truck=global&from=${localDate()}&to=${localDate()}`;
  const report = await call<{ orderCount: number }>(`/api/reports?${reportQuery}`, undefined, admin); assert.equal(report.status, 200); assert(report.data.orderCount >= 4);
  for (const format of ["xlsx", "pdf"]) { const response = await fetch(`${base}/api/reports?${reportQuery}&format=${format}`, { headers: { Cookie: admin } }); assert.equal(response.status, 200); const bytes = Buffer.from(await response.arrayBuffer()); assert(bytes.length > 100); assert.equal(bytes.subarray(0, format === "pdf" ? 4 : 2).toString(), format === "pdf" ? "%PDF" : "PK"); }
  console.log("PASS: public separation, catalogs, guest checkout, server pricing, area/time validation, private tracking, kitchen lock, admin override, coupons, scheduled plans, banners, RBAC, protected superuser, CRM, global settings, Excel/PDF reports.");
}
async function cleanup() { if (ids.length) { await db.delete(auditLogs).where(inArray(auditLogs.entityId, ids)); await db.delete(orders).where(inArray(orders.id, ids)); } if (subscriptionIds.length) await db.delete(subscriptions).where(inArray(subscriptions.id, subscriptionIds)); if (couponIds.length) await db.delete(coupons).where(inArray(coupons.id, couponIds)); if (bannerIds.length) await db.delete(banners).where(inArray(banners.id, bannerIds)); if (employeeIds.length) { await db.delete(auditLogs).where(inArray(auditLogs.entityId, employeeIds)); await db.delete(users).where(inArray(users.id, employeeIds)); } if (sessionHashes.length) await db.delete(sessions).where(inArray(sessions.tokenHash, sessionHashes)); await pool.end(); }
main().then(cleanup).catch(async error => { console.error(error); await cleanup(); process.exitCode = 1; });
