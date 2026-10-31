"use client";
import { useRouter } from "next/navigation";
import { LogOut, ChefHat } from "lucide-react";
import { Brand } from "./brand";
import { LanguageSwitch } from "./public-shell";
import { OrderBoard } from "./order-board";
import { useApp } from "./app-provider";
import { api } from "@/lib/types";
export function Kitchen({ truck }: { truck: string }) { const { t, setUser } = useApp(); const router = useRouter(); return <div className="kitchen-shell"><header className="kitchen-header"><Brand/><div className="kitchen-title"><ChefHat size={20}/><div><h1>{truck === "food" ? t("Food kitchen", "مطبخ المأكولات") : t("Beverage kitchen", "مطبخ المشروبات")}</h1><span>{t("THE GOOD TASTE STATION", "محطة النكهة الجميلة")}</span></div></div><div className="header-actions"><LanguageSwitch/><button className="icon-button" title={t("Sign out", "تسجيل الخروج")} aria-label="Sign out" onClick={async () => { await api("/api/auth", { method: "POST", body: JSON.stringify({ action: "logout" }) }); setUser(null); router.refresh(); }}><LogOut size={15}/></button></div></header><main className="kitchen-main"><OrderBoard truck={truck}/></main></div>; }
