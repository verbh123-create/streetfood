"use client";
import { RefreshCw } from "lucide-react";
import { useApp } from "@/components/app-provider";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { const { t } = useApp(); return <main className="error-page"><span className="eyebrow">A LITTLE PAUSE IN THE GOOD STUFF</span><h1>{t("Let's give that another go.", "لنحاول مرة أخرى.")}</h1><p>{t("We couldn't load this page right now. Your appetite is safe with us.", "تعذر تحميل الصفحة الآن. شهيتك في أمان معنا.")}</p><button className="btn-primary" onClick={reset}><RefreshCw size={15}/>{t("Try again", "حاول مجدداً")}</button></main>; }
