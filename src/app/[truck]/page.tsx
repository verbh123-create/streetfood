import { notFound } from "next/navigation";
import { getCatalog } from "@/lib/catalog";
import { Storefront } from "@/components/storefront";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ truck: string }> }) { const { truck } = await params; return { title: truck === "food" ? "Fresh street food" : "Specialty coffee & fresh beverages" }; }
export default async function TruckPage({ params }: { params: Promise<{ truck: string }> }) { const { truck } = await params; if (truck !== "food" && truck !== "beverage") notFound(); return <Storefront initialCatalog={await getCatalog(truck)}/>; }
