import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { errorResponse } from "@/lib/server";
export const dynamic = "force-dynamic";
export async function GET() { try { const [site] = await db.select().from(siteSettings).where(eq(siteSettings.id, "site")); return Response.json({ site: site ?? null }); } catch (error) { return errorResponse(error); } }
