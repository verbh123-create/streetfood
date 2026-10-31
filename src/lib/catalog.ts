import "server-only";
import { and, eq, lte, gte, asc } from "drizzle-orm";
import { db } from "@/db";
import { trucks, categories, products, regions, banners } from "@/db/schema";
import { HttpError, validTruck } from "./server";
export async function getCatalog(truck: string) {
  if (!validTruck(truck)) throw new HttpError(404, "Truck not found.");
  const [config] = await db.select().from(trucks).where(eq(trucks.id, truck));
  if (!config) throw new HttpError(503, "This truck is getting ready. Please try again shortly.");
  const [menu, cats, areas, announcements] = await Promise.all([
    db.select().from(products).where(and(eq(products.truck, truck), eq(products.available, true))).orderBy(asc(products.name)),
    db.select().from(categories).where(eq(categories.truck, truck)).orderBy(asc(categories.sort)),
    db.select().from(regions).where(and(eq(regions.truck, truck), eq(regions.active, true))).orderBy(asc(regions.fee)),
    db.select().from(banners).where(and(eq(banners.truck, truck), eq(banners.active, true), lte(banners.startsAt, new Date()), gte(banners.endsAt, new Date()))),
  ]);
  return { truck: config, products: menu, categories: cats, regions: areas, banners: announcements };
}
