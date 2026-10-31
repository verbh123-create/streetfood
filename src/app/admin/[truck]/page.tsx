import { notFound } from "next/navigation";
import { currentUser, safeUser } from "@/lib/auth";
import { StaffLogin } from "@/components/staff-login";
import { Dashboard } from "@/components/dashboard";
export const dynamic = "force-dynamic";
export const metadata = { title: "Management workspace", robots: { index: false, follow: false } };
export default async function AdminPage({ params }: { params: Promise<{ truck: string }> }) { const { truck } = await params; if (!["food", "beverage", "global"].includes(truck)) notFound(); const user = await currentUser(); if (!user || !["superadmin", "admin", "employee"].includes(user.role) || (user.role !== "superadmin" && (user.truck !== truck || truck === "global"))) return <StaffLogin truck={truck} kind="admin"/>; return <Dashboard truck={truck} profile={safeUser(user)}/>; }
