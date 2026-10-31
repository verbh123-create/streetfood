import { getCatalog } from "@/lib/catalog";
import { errorResponse } from "@/lib/server";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ truck: string }> }) { try { return Response.json(await getCatalog((await context.params).truck)); } catch (error) { return errorResponse(error); } }
