import { ZodError } from "zod";
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export function assertOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new HttpError(403, "This request is not allowed.");
  if (!origin) return;
  let source: URL; try { source = new URL(origin); } catch { throw new HttpError(403, "This request is not allowed."); }
  const configuredOrigins = [process.env.APP_URL, process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined, process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined];
  const allowed = [new URL(request.url).origin, ...configuredOrigins.flatMap(value => { if (!value) return []; try { return [new URL(value).origin]; } catch { return []; } })];
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim();
  const host = request.headers.get("host")?.split(",")[0].trim();
  const trustedHost = source.host === (forwardedHost || host);
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  if (!allowed.includes(source.origin) && !(trustedHost && ["https:", "http:"].includes(source.protocol) && (!forwardedProtocol || source.protocol === `${forwardedProtocol}:`))) throw new HttpError(403, "This request is not allowed.");
}
export function errorResponse(error: unknown) {
  if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) return Response.json({ error: error.issues.map(i => `${i.path.join(" ")}: ${i.message}`).join(". ") }, { status: 400 });
  if (error instanceof SyntaxError) return Response.json({ error: "Send a valid JSON request." }, { status: 400 });
  const databaseError = error as { code?: string; cause?: { code?: string } } | null;
  const code = databaseError?.code ?? databaseError?.cause?.code;
  if (code === "23505") return Response.json({ error: "That record already exists." }, { status: 409 });
  if (code === "23503") return Response.json({ error: "This record is still in use and cannot be removed." }, { status: 409 });
  console.error("Request failed", error instanceof Error ? error.message : "Unknown error");
  return Response.json({ error: "We couldn't complete this request. Please try again." }, { status: 500 });
}
export const validTruck = (truck: string): truck is "beverage" | "food" => truck === "beverage" || truck === "food";
