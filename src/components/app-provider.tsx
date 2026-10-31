"use client";
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { Check, X, AlertCircle } from "lucide-react";
import { api, type Language, type User, type Site } from "@/lib/types";
type AppContext = { lang: Language; setLang: (lang: Language) => void; t: (en: string, ar: string) => string; user: User | null; setUser: (user: User | null) => void; refreshUser: () => Promise<void>; site: Site | null; refreshSite: () => Promise<void>; toast: (message: string, error?: boolean) => void };
const Context = createContext<AppContext | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, updateLang] = useState<Language>("en"); const [user, setUser] = useState<User | null>(null); const [site, setSite] = useState<Site | null>(null); const [toasts, setToasts] = useState<{ id: number; message: string; error: boolean }[]>([]);
  useEffect(() => { const value = localStorage.getItem("stt-language"); if (value === "ar") updateLang("ar"); }, []);
  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"; localStorage.setItem("stt-language", lang); }, [lang]);
  const refreshUser = useCallback(async () => { try { const data = await api<{ user: User | null }>("/api/auth"); setUser(data.user); } catch { setUser(null); } }, []);
  const refreshSite = useCallback(async () => { try { const data = await api<{ site: Site | null }>("/api/site"); setSite(data.site); } catch { /* Keep the customer experience available during maintenance. */ } }, []);
  useEffect(() => { void refreshUser(); void refreshSite(); }, [refreshUser, refreshSite]);
  const toast = useCallback((message: string, error = false) => { const id = Date.now() + Math.random(); setToasts(previous => [...previous.slice(-2), { id, message, error }]); setTimeout(() => setToasts(previous => previous.filter(item => item.id !== id)), 5000); }, []);
  return <Context.Provider value={{ lang, setLang: updateLang, t: (en, ar) => lang === "ar" ? ar : en, user, setUser, refreshUser, site, refreshSite, toast }}>{children}<div className="toast-stack" aria-live="polite">{toasts.map(item => <div className={`toast ${item.error ? "error" : ""}`} key={item.id}>{item.error ? <AlertCircle size={18} /> : <Check size={18} />}<span>{item.message}</span><button aria-label="Dismiss notification" onClick={() => setToasts(previous => previous.filter(value => value.id !== item.id))}><X size={15} /></button></div>)}</div></Context.Provider>;
}
export function useApp() { const context = useContext(Context); if (!context) throw new Error("AppProvider is required"); return context; }
