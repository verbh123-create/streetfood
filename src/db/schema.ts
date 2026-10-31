import { pgTable, text, integer, boolean, timestamp, uuid, jsonb, uniqueIndex, index, serial } from "drizzle-orm/pg-core";

export type Shift = { open: string; close: string };
export type DailySelection = { weekday: number; productId: string; quantity: number };
export const trucks = pgTable("trucks", {
  id: text("id").primaryKey(), name: text("name").notNull(), nameAr: text("name_ar").notNull(),
  title: text("title").notNull(), titleAr: text("title_ar").notNull(), description: text("description").notNull(), descriptionAr: text("description_ar").notNull(),
  logoUrl: text("logo_url").notNull().default(""), discount: integer("discount").notNull().default(10),
  hours: jsonb("hours").$type<Shift[]>().notNull().default([{ open: "08:00", close: "14:00" }, { open: "17:00", close: "23:00" }]),
});
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(), truck: text("truck").notNull().references(() => trucks.id),
  name: text("name").notNull(), nameAr: text("name_ar").notNull(), sort: integer("sort").notNull().default(0),
}, t => [uniqueIndex("category_truck_name").on(t.truck, t.name)]);
export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(), truck: text("truck").notNull().references(() => trucks.id),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  name: text("name").notNull(), nameAr: text("name_ar").notNull(), description: text("description").notNull(), descriptionAr: text("description_ar").notNull(),
  price: integer("price").notNull(), image: text("image").notNull(), ingredients: jsonb("ingredients").$type<string[]>().notNull().default([]),
  badge: text("badge").notNull().default(""), available: boolean("available").notNull().default(true),
}, t => [index("product_truck_idx").on(t.truck), uniqueIndex("product_truck_name").on(t.truck, t.name)]);
export const regions = pgTable("regions", {
  id: uuid("id").defaultRandom().primaryKey(), truck: text("truck").notNull().references(() => trucks.id),
  name: text("name").notNull(), nameAr: text("name_ar").notNull(), fee: integer("fee").notNull(), active: boolean("active").notNull().default(true),
}, t => [uniqueIndex("region_truck_name").on(t.truck, t.name)]);
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(), username: text("username").unique(), email: text("email").unique(),
  passwordHash: text("password_hash").notNull(), name: text("name").notNull(), phone: text("phone").notNull().default(""),
  regionId: uuid("region_id").references(() => regions.id, { onDelete: "set null" }), address: text("address").notNull().default(""),
  role: text("role").notNull().default("customer"), truck: text("truck").references(() => trucks.id),
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]), verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, t => [index("sessions_user_idx").on(t.userId)]);
export const emailTokens = pgTable("email_tokens", {
  id: uuid("id").defaultRandom().primaryKey(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(), purpose: text("purpose").notNull(), attempts: integer("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(), truck: text("truck").notNull().references(() => trucks.id),
  userId: uuid("user_id").references(() => users.id), customerName: text("customer_name").notNull(),
  startDate: text("start_date").notNull(), endDate: text("end_date").notNull(), time: text("time").notNull(),
  selections: jsonb("selections").$type<DailySelection[]>().notNull(), total: integer("total").notNull(), discount: integer("discount").notNull(),
  status: text("status").notNull().default("ACTIVE"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(), number: serial("number").notNull().unique(), truck: text("truck").notNull().references(() => trucks.id),
  userId: uuid("user_id").references(() => users.id), subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
  customerName: text("customer_name").notNull(), phone: text("phone").notNull(), email: text("email"),
  regionId: uuid("region_id").references(() => regions.id, { onDelete: "set null" }), address: text("address").notNull().default(""),
  fulfillment: text("fulfillment").notNull(), type: text("type").notNull().default("direct"), status: text("status").notNull().default("NOT_READY"),
  subtotal: integer("subtotal").notNull(), deliveryFee: integer("delivery_fee").notNull().default(0), discount: integer("discount").notNull().default(0),
  total: integer("total").notNull(), coupon: text("coupon"), notes: text("notes").notNull().default(""), trackingHash: text("tracking_hash").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(), completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("order_truck_status_idx").on(t.truck, t.status), index("order_schedule_idx").on(t.scheduledAt), index("order_user_idx").on(t.userId)]);
export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(), orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }), name: text("name").notNull(),
  quantity: integer("quantity").notNull(), price: integer("price").notNull(), removedIngredients: jsonb("removed_ingredients").$type<string[]>().notNull().default([]),
}, t => [index("order_items_order_idx").on(t.orderId)]);
export const coupons = pgTable("coupons", {
  id: uuid("id").defaultRandom().primaryKey(), truck: text("truck").notNull().references(() => trucks.id), code: text("code").notNull(),
  percent: integer("percent").notNull(), startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(), active: boolean("active").notNull().default(true),
}, t => [uniqueIndex("coupon_truck_code").on(t.truck, t.code)]);
export const banners = pgTable("banners", {
  id: uuid("id").defaultRandom().primaryKey(), truck: text("truck").notNull().references(() => trucks.id), title: text("title").notNull(),
  titleAr: text("title_ar").notNull().default(""), text: text("text").notNull().default(""), textAr: text("text_ar").notNull().default(""),
  image: text("image").notNull().default(""), startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(), active: boolean("active").notNull().default(true),
});
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(), actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(), entityId: text("entity_id").notNull(), details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(), count: integer("count").notNull().default(1), resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});
export const siteSettings = pgTable("site_settings", {
  id: text("id").primaryKey().default("site"), brandName: text("brand_name").notNull().default("Street Taste Truck"), logoUrl: text("logo_url").notNull().default(""),
  welcome: text("welcome").notNull().default("WELCOME TO STREET TASTE TRUCK"), welcomeAr: text("welcome_ar").notNull().default("مرحباً بكم في عربة ستريت تيست"),
  heroFirst: text("hero_first").notNull().default("Two trucks."), heroFirstAr: text("hero_first_ar").notNull().default("عربتان."),
  heroSecond: text("hero_second").notNull().default("Endless cravings."), heroSecondAr: text("hero_second_ar").notNull().default("نكهات بلا حدود."),
  intro: text("intro").notNull().default("Your daily pick-me-up or your next favorite bite. Freshly made, full of flavor, and always worth the stop."),
  introAr: text("intro_ar").notNull().default("مشروبك المفضل أو لقمتك القادمة. طازجة وغنية بالنكهة، وتستحق كل وقفة."),
});
