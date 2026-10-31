import "dotenv/config";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { chromium } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";
import { db, pool } from "../src/db";
import { orders, categories, sessions } from "../src/db/schema";
const base = process.env.BASE_URL || "http://localhost:3000";
const marker = `Browser Test ${Date.now()}`; const hashes: string[] = [];
async function main() {
  await mkdir("artifacts", { recursive: true }); const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await page.goto(base, { waitUntil: "networkidle" }); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(700);
    assert.equal(await page.locator(".destination-card").count(), 2); assert.equal(await page.locator('a[href^="/admin"], a[href^="/kitchen"]').count(), 0);
    await page.screenshot({ path: "artifacts/landing-desktop.png", fullPage: true });
    await page.locator('.language-switch button[lang="ar"]').click(); assert.equal(await page.locator("html").getAttribute("dir"), "rtl"); assert((await page.locator("h1").innerText()).includes("عربتان"));
    await page.locator(".language-switch button").filter({ hasText: /^EN$/ }).click();
    await page.locator('a.destination-card[href="/beverage"]').click(); await page.waitForURL("**/beverage"); await page.waitForSelector(".product-card");
    await page.getByLabel("Search the menu", { exact: true }).fill("matcha"); assert.equal(await page.locator(".product-card").count(), 1);
    await page.locator(".product-title").click(); await page.getByRole("dialog").waitFor(); const ingredient = page.locator(".ingredient-list input").first(); await ingredient.uncheck(); await page.getByRole("button", { name: /Add to bag/ }).click();
    await page.locator(".cart-fab").click(); await page.getByRole("button", { name: "Let's check out", exact: true }).click();
    await page.getByLabel("Full name", { exact: true }).fill("Browser Smoke Customer"); await page.getByLabel("Phone number", { exact: true }).fill("+973 38888888");
    const area = page.getByLabel("Your area", { exact: false }); const value = await area.locator("option").nth(1).getAttribute("value"); await area.selectOption(value!);
    await page.getByLabel("A note for us? (optional)", { exact: true }).fill(marker); await page.locator(".accept-terms input").check();
    const orderResponse = page.waitForResponse(response => response.url().endsWith("/api/orders") && response.request().method() === "POST"); await page.getByRole("button", { name: /Place my order/ }).click(); const response = await orderResponse; assert.equal(response.status(), 201, await response.text()); await page.locator(".confirmation").waitFor(); await page.screenshot({ path: "artifacts/order-receipt.png", fullPage: true }); await page.getByRole("button", { name: "Close dialog", exact: true }).click();
    await page.getByLabel("Search the menu", { exact: true }).fill(""); await page.screenshot({ path: "artifacts/beverage-storefront.png", fullPage: true });
    await page.getByRole("button", { name: "Build your plan", exact: true }).click(); await page.locator(".subscription-days").waitFor(); assert.equal(await page.locator(".daily-choice").count(), 5); await page.getByRole("button", { name: "Love it. Let's continue.", exact: true }).click(); await page.getByLabel("Full name", { exact: true }).waitFor(); await page.getByRole("button", { name: "Close dialog", exact: true }).click();
    await page.goto(`${base}/kitchen/food`); await page.getByLabel("Username or email", { exact: true }).fill("kitchen"); await page.getByLabel("Password", { exact: true }).fill("12345678"); await page.getByRole("button", { name: "Enter workspace", exact: true }).click(); await page.locator(".order-board").waitFor(); const kitchenCookie = (await page.context().cookies()).find(cookie => cookie.name === "stt_session"); if (kitchenCookie) hashes.push(createHash("sha256").update(kitchenCookie.value).digest("hex")); await page.getByRole("button", { name: "Split view", exact: true }).click(); assert.equal(await page.locator(".split-board>section").count(), 2);
    await page.goto(`${base}/admin/global`); await page.getByLabel("Username or email", { exact: true }).fill("ahmad"); await page.getByLabel("Password", { exact: true }).fill("Verde@123"); await page.getByRole("button", { name: "Enter workspace", exact: true }).click(); await page.locator(".metric-grid").waitFor(); const adminCookie = (await page.context().cookies()).find(cookie => cookie.name === "stt_session"); if (adminCookie) hashes.push(createHash("sha256").update(adminCookie.value).digest("hex")); await page.screenshot({ path: "artifacts/global-dashboard.png", fullPage: true });
    await page.locator(".sidebar-nav").getByRole("button", { name: "Menu & categories", exact: true }).click(); await page.locator(".inner-tabs").getByRole("button", { name: "Categories", exact: true }).click(); await page.getByRole("button", { name: "Add category", exact: true }).click(); await page.getByLabel("Category · English", { exact: true }).fill(marker); await page.getByLabel("Category · Arabic", { exact: true }).fill("فئة اختبار"); await page.getByRole("button", { name: "Save the good stuff", exact: true }).click(); await page.getByRole("dialog").waitFor({ state: "hidden" }); assert((await page.locator(".data-table").innerText()).includes(marker));
    await page.locator(".sidebar-nav").getByRole("button", { name: "Hours & settings", exact: true }).click(); await page.locator(".site-settings").waitFor();
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1 }); await mobile.goto(base, { waitUntil: "networkidle" }); await mobile.evaluate(() => document.fonts.ready); await mobile.waitForTimeout(500); assert(await mobile.locator("body").evaluate(element => element.scrollWidth <= window.innerWidth)); await mobile.screenshot({ path: "artifacts/landing-mobile.png", fullPage: true }); await mobile.locator('.language-switch button[lang="ar"]').click(); await mobile.screenshot({ path: "artifacts/landing-mobile-arabic.png", fullPage: true }); assert(await mobile.locator("body").evaluate(element => element.scrollWidth <= window.innerWidth));
    assert.deepEqual(errors, []); console.log("PASS: desktop/mobile layout, Arabic RTL, public route separation, search, ingredients, bag, guest checkout, receipt, subscription wizard, scoped kitchen login, split board, admin overview, category creation, global settings. Screenshots saved in artifacts/.");
  } finally { await browser.close(); }
}
async function cleanup() { await db.delete(orders).where(eq(orders.notes, marker)); await db.delete(categories).where(eq(categories.name, marker)); if (hashes.length) await db.delete(sessions).where(inArray(sessions.tokenHash, hashes)); await pool.end(); }
main().then(cleanup).catch(async error => { console.error(error); await cleanup(); process.exitCode = 1; });
