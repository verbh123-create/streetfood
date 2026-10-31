import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { StaffLogin } from "@/components/staff-login";
import { Kitchen } from "@/components/kitchen";
export const dynamic = "force-dynamic";
export const metadata = { title: "Kitchen workspace", robots: { index: false, follow: false } };
export default async function KitchenPage({ params }: { params: Promise<{ truck: string }> }) { const { truck } = await params; if (truck !== "food" && truck !== "beverage") notFound(); try { await requireStaff(truck); } catch { return <StaffLogin truck={truck} kind="kitchen"/>; } return <Kitchen truck={truck}/>; }
