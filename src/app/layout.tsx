import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppProvider } from "@/components/app-provider";
import "./globals.css";
import "./workspace.css";
export const metadata: Metadata = { title: { default: "Street Taste Truck — Two trucks. Endless cravings.", template: "%s | Street Taste Truck" }, description: "Your daily coffee ritual or your next favorite bite. Discover specialty beverages and fresh street food, made with love in Bahrain.", applicationName: "Street Taste Truck", robots: { index: true, follow: true } };
export const viewport: Viewport = { themeColor: "#121212", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: ReactNode }) { return <html lang="en" suppressHydrationWarning><body><AppProvider>{children}</AppProvider></body></html>; }
