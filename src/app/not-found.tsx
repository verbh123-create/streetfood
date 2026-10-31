"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/public-shell";
import { useApp } from "@/components/app-provider";
export default function NotFound() { const { t } = useApp(); return <><PublicHeader/><main className="error-page"><span className="eyebrow">404 · A LITTLE OFF THE MENU</span><h1>{t("Wrong turn. Right appetite.", "طريق خاطئ. شهية صحيحة.")}</h1><p>{t("This page isn't on the menu. Let's get you back to the good stuff.", "هذه الصفحة ليست في القائمة. لنعد إلى الأشياء اللذيذة.")}</p><Link className="btn-primary" href="/">{t("Find your next favorite", "ابحث عن مفضلتك القادمة")}<ArrowRight size={15}/></Link></main><PublicFooter/></>; }
