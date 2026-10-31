import { NextRequest } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import { and, eq, or, inArray, desc, ne } from "drizzle-orm";
import { db } from "@/db";
import { trucks, products, categories, regions, coupons, banners, users, orders, subscriptions, auditLogs, sessions, siteSettings } from "@/db/schema";
import { requireStaff, safeUser, rateLimit } from "@/lib/auth";
import { sendOtp } from "@/lib/email";
import { getTruckOrders } from "@/lib/ordering";
import { assertOrigin, errorResponse, HttpError } from "@/lib/server";
export const dynamic = "force-dynamic";
const resourceSchema = z.enum(["orders", "products", "categories", "regions", "coupons", "banners", "customers", "employees", "subscriptions", "settings", "site"]);
const permission = (resource: string) => ["products", "categories"].includes(resource) ? "menu" : ["coupons", "banners"].includes(resource) ? "promotions" : resource === "site" ? "settings" : resource === "employees" ? "employees" : resource;
const truckSchema = z.enum(["beverage", "food", "global"]);
const text = z.string().trim().min(1).max(500);
const imageSchema = z.string().max(3000000).refine(value => value === "" || /^\/images\/[\w./-]+$/.test(value) || /^https?:\/\//.test(value) || /^data:image\/(png|jpeg|webp);base64,/.test(value), "Use an HTTPS image URL or a PNG, JPEG, or WebP upload");
const dates = { startsAt: z.coerce.date(), endsAt: z.coerce.date() };
const productSchema = z.object({ name: text, nameAr: text, description: text, descriptionAr: text, categoryId: z.string().uuid().nullable(), price: z.number().int().min(1).max(1000000), image: imageSchema, ingredients: z.array(z.string().trim().min(1).max(100)).max(30), badge: z.enum(["", "fresh", "spicy", "popular"]), available: z.boolean() });
const regionSchema = z.object({ name: text, nameAr: text, fee: z.number().int().min(0).max(100000), active: z.boolean().default(true) });
const categorySchema = z.object({ name: text, nameAr: text, sort: z.number().int().min(0).max(1000).default(0) });
const couponSchema = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{2,40}$/), percent: z.number().int().min(1).max(100), ...dates, active: z.boolean() }).refine(v => v.endsAt > v.startsAt, "Expiration must be after activation");
const bannerSchema = z.object({ title: text, titleAr: z.string().max(500).default(""), text: z.string().max(2000).default(""), textAr: z.string().max(2000).default(""), image: imageSchema, ...dates, active: z.boolean() }).refine(v => v.endsAt > v.startsAt, "Expiration must be after activation");
const shiftSchema = z.object({ open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) }).refine(v => v.open < v.close, "Shift closing must be after opening");
const settingsSchema = z.object({ name: text, nameAr: text, title: text, titleAr: text, description: text, descriptionAr: text, logoUrl: imageSchema, discount: z.number().int().min(0).max(80), hours: z.array(shiftSchema).min(1).max(4).refine(shifts => { const sorted = [...shifts].sort((a, b) => a.open.localeCompare(b.open)); return sorted.every((s, i) => i === 0 || s.open >= sorted[i - 1].close); }, "Operating shifts must not overlap") });
export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams; const resource = resourceSchema.parse(p.get("resource") ?? "orders"); const truck = truckSchema.parse(p.get("truck") ?? "global");
    const actor = await requireStaff(truck, permission(resource)); if (resource === "employees" && actor.role !== "superadmin") throw new HttpError(403, "Only Ahmad can manage employees.");
    let data: unknown;
    if (resource === "site") { if (actor.role !== "superadmin" || truck !== "global") throw new HttpError(403, "Only Ahmad can manage homepage branding."); data = await db.select().from(siteSettings).where(eq(siteSettings.id, "site")); }
    if (resource === "orders") data = await getTruckOrders(truck);
    if (resource === "products") data = await db.select().from(products).where(truck === "global" ? undefined : eq(products.truck, truck));
    if (resource === "categories") data = await db.select().from(categories).where(truck === "global" ? undefined : eq(categories.truck, truck));
    if (resource === "regions") data = await db.select().from(regions).where(truck === "global" ? undefined : eq(regions.truck, truck));
    if (resource === "coupons") data = await db.select().from(coupons).where(truck === "global" ? undefined : eq(coupons.truck, truck));
    if (resource === "banners") data = await db.select().from(banners).where(truck === "global" ? undefined : eq(banners.truck, truck));
    if (resource === "subscriptions") data = await db.select().from(subscriptions).where(truck === "global" ? undefined : eq(subscriptions.truck, truck)).orderBy(desc(subscriptions.createdAt));
    if (resource === "settings") data = await db.select().from(trucks).where(truck === "global" ? undefined : eq(trucks.id, truck));
    if (resource === "employees") data = (await db.select().from(users).where(ne(users.role, "customer"))).map(u => ({ ...safeUser(u), createdAt: u.createdAt }));
    if (resource === "customers") {
      const records = await db.select().from(users).where(and(eq(users.role, "customer"), truck === "global" ? undefined : or(inArray(users.regionId, db.select({ id: regions.id }).from(regions).where(eq(regions.truck, truck))), inArray(users.id, db.select({ userId: orders.userId }).from(orders).where(eq(orders.truck, truck)))))).orderBy(desc(users.createdAt)).limit(1000);
      const plans = await db.select({ userId: subscriptions.userId, endDate: subscriptions.endDate, status: subscriptions.status }).from(subscriptions).where(truck === "global" ? undefined : eq(subscriptions.truck, truck));
      data = records.map(u => ({ ...safeUser(u), createdAt: u.createdAt, activeSubscriptions: plans.filter(p => p.userId === u.id && p.status === "ACTIVE" && p.endDate >= new Date().toISOString().slice(0, 10)).length }));
    }
    return Response.json({ data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: NextRequest) {
  try {
    assertOrigin(request); const body = await request.json();
    const resource = resourceSchema.parse(body.resource); const truck = truckSchema.parse(body.truck); const action = z.enum(["create", "update", "delete", "reset", "globalDiscount"]).parse(body.action);
    const actor = await requireStaff(truck, permission(resource)); const id = body.id ? z.string().uuid().parse(body.id) : undefined;
    if (action === "globalDiscount") {
      if (actor.role !== "superadmin" || resource !== "settings" || truck !== "global") throw new HttpError(403, "Only Ahmad can change global settings.");
      const discount = z.number().int().min(0).max(80).parse(body.values?.discount); await db.update(trucks).set({ discount });
      await db.insert(auditLogs).values({ actorId: actor.id, action: "settings.globalDiscount", entityId: "global", details: { discount } }); return Response.json({ success: true });
    }
    if (resource === "site") {
      if (actor.role !== "superadmin" || truck !== "global" || action !== "update") throw new HttpError(403, "Only Ahmad can update homepage branding.");
      const values = z.object({ brandName: text, logoUrl: imageSchema, welcome: text, welcomeAr: text, heroFirst: text, heroFirstAr: text, heroSecond: text, heroSecondAr: text, intro: text, introAr: text }).parse(body.values);
      await db.update(siteSettings).set(values).where(eq(siteSettings.id, "site")); await db.insert(auditLogs).values({ actorId: actor.id, action: "site.update", entityId: "site" }); return Response.json({ success: true });
    }
    if (resource !== "employees" && resource !== "customers" && truck === "global") throw new HttpError(400, "Select a specific truck before editing.");
    if (["update", "delete", "reset"].includes(action) && !id && resource !== "settings") throw new HttpError(400, "A record ID is required.");
    let result: unknown;
    if (resource === "employees") {
      if (actor.role !== "superadmin" || actor.username !== "ahmad") throw new HttpError(403, "Only Ahmad can manage employees.");
      if (id) { const [target] = await db.select().from(users).where(eq(users.id, id)); if (!target || target.role === "customer") throw new HttpError(404, "Employee not found."); if (target.username === "ahmad" || target.role === "superadmin") throw new HttpError(403, "Ahmad's protected account can only change its own password in account settings."); }
      if (action === "delete") { await db.delete(users).where(eq(users.id, id!)); result = { success: true }; }
      else {
        const values = z.object({ username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/), name: text, email: z.union([z.string().email(), z.literal("")]).optional(), role: z.enum(["employee", "admin", "kitchen"]), truck: z.enum(["food", "beverage"]), permissions: z.array(z.enum(["*", "orders", "reports", "menu", "regions", "promotions", "customers", "subscriptions", "settings"])), password: z.string().min(8).max(128).refine(value => Buffer.byteLength(value, "utf8") <= 72, "Password must be 72 UTF-8 bytes or fewer").optional() }).parse(body.values);
        if (values.username === "ahmad") throw new HttpError(403, "This username is protected.");
        if (action === "create" && !values.password) throw new HttpError(400, "A password is required for new employees.");
        const { password, email, ...fields } = values; const safeFields = { ...fields, permissions: fields.role === "kitchen" ? ["orders"] : fields.permissions, email: email || null, verified: true, ...(password ? { passwordHash: await hash(password, 12) } : {}) };
        if (id) { await db.update(users).set(safeFields).where(eq(users.id, id)); await db.delete(sessions).where(eq(sessions.userId, id)); }
        else await db.insert(users).values({ ...safeFields, passwordHash: safeFields.passwordHash! });
        result = { success: true };
      }
    } else if (resource === "customers") {
      if (action !== "reset") throw new HttpError(400, "Use password reset to securely assist customers.");
      const [customer] = await db.select().from(users).where(and(eq(users.id, id!), eq(users.role, "customer")));
      if (!customer?.email) throw new HttpError(404, "Customer not found.");
      if (truck !== "global") { const [area] = customer.regionId ? await db.select().from(regions).where(and(eq(regions.id, customer.regionId), eq(regions.truck, truck))) : []; const [order] = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.userId, customer.id), eq(orders.truck, truck))).limit(1); if (!area && !order) throw new HttpError(403, "This customer belongs to a different truck."); }
      await rateLimit(`admin-reset:${customer.id}`, 3, 60); await sendOtp(customer.id, customer.email, "reset"); result = { success: true, message: "A password reset code was emailed to the customer." };
    } else if (resource === "products") {
      const scope = and(eq(products.id, id ?? "00000000-0000-0000-0000-000000000000"), eq(products.truck, truck));
      if (action === "delete") result = await db.delete(products).where(scope).returning({ id: products.id });
      else { const values = productSchema.parse(body.values); if (values.categoryId) { const [cat] = await db.select().from(categories).where(and(eq(categories.id, values.categoryId), eq(categories.truck, truck))); if (!cat) throw new HttpError(400, "Choose a category belonging to this truck."); } result = action === "create" ? await db.insert(products).values({ ...values, truck }).returning() : await db.update(products).set(values).where(scope).returning(); }
    } else if (resource === "categories") {
      const scope = and(eq(categories.id, id ?? "00000000-0000-0000-0000-000000000000"), eq(categories.truck, truck));
      result = action === "delete" ? await db.delete(categories).where(scope).returning() : action === "create" ? await db.insert(categories).values({ ...categorySchema.parse(body.values), truck }).returning() : await db.update(categories).set(categorySchema.parse(body.values)).where(scope).returning();
    } else if (resource === "regions") {
      const scope = and(eq(regions.id, id ?? "00000000-0000-0000-0000-000000000000"), eq(regions.truck, truck));
      result = action === "delete" ? await db.delete(regions).where(scope).returning() : action === "create" ? await db.insert(regions).values({ ...regionSchema.parse(body.values), truck }).returning() : await db.update(regions).set(regionSchema.parse(body.values)).where(scope).returning();
    } else if (resource === "coupons") {
      const scope = and(eq(coupons.id, id ?? "00000000-0000-0000-0000-000000000000"), eq(coupons.truck, truck));
      result = action === "delete" ? await db.delete(coupons).where(scope).returning() : action === "create" ? await db.insert(coupons).values({ ...couponSchema.parse(body.values), truck }).returning() : await db.update(coupons).set(couponSchema.parse(body.values)).where(scope).returning();
    } else if (resource === "banners") {
      const scope = and(eq(banners.id, id ?? "00000000-0000-0000-0000-000000000000"), eq(banners.truck, truck));
      result = action === "delete" ? await db.delete(banners).where(scope).returning() : action === "create" ? await db.insert(banners).values({ ...bannerSchema.parse(body.values), truck }).returning() : await db.update(banners).set(bannerSchema.parse(body.values)).where(scope).returning();
    } else if (resource === "settings") {
      if (action !== "update") throw new HttpError(400, "Settings can only be updated."); result = await db.update(trucks).set(settingsSchema.parse(body.values)).where(eq(trucks.id, truck)).returning();
    } else throw new HttpError(400, "This resource is read-only here.");
    if (Array.isArray(result) && !result.length) throw new HttpError(404, "Record not found in this truck.");
    await db.insert(auditLogs).values({ actorId: actor.id, action: `${resource}.${action}`, entityId: id ?? truck, details: { truck } });
    return Response.json({ success: true, data: result });
  } catch (error) { return errorResponse(error); }
}
