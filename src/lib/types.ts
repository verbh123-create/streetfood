export type Site = { id: string; brandName: string; logoUrl: string; welcome: string; welcomeAr: string; heroFirst: string; heroFirstAr: string; heroSecond: string; heroSecondAr: string; intro: string; introAr: string };
export type TruckId = "beverage" | "food";
export type Language = "en" | "ar";
export type Shift = { open: string; close: string };
export type Product = { id: string; truck: string; categoryId: string | null; name: string; nameAr: string; description: string; descriptionAr: string; price: number; image: string; ingredients: string[]; badge: string; available: boolean };
export type Category = { id: string; name: string; nameAr: string; sort: number; truck: string };
export type Region = { id: string; name: string; nameAr: string; fee: number; active: boolean; truck: string };
export type Truck = { id: string; name: string; nameAr: string; title: string; titleAr: string; description: string; descriptionAr: string; logoUrl: string; hours: Shift[]; discount: number };
export type Banner = { id: string; title: string; titleAr: string; text: string; textAr: string; image: string };
export type Catalog = { truck: Truck; products: Product[]; categories: Category[]; regions: Region[]; banners: Banner[] };
export type User = { id: string; name: string; email: string | null; username: string | null; phone: string; address: string; regionId: string | null; role: string; truck: string | null; permissions: string[]; verified: boolean };
export type CartItem = { key: string; product: Product; quantity: number; removedIngredients: string[] };
export type OrderItem = { id: string; name: string; quantity: number; price: number; removedIngredients: string[] };
export type Order = { id: string; number: number; truck: string; customerName: string; phone: string; email: string | null; address: string; fulfillment: string; type: string; status: string; total: number; subtotal: number; deliveryFee: number; discount: number; notes: string; createdAt: string; scheduledAt: string; subscriptionId: string | null; items: OrderItem[] };
export const money = (fils: number) => (fils / 1000).toFixed(3);
export const localDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bahrain", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export function timeSlots(hours: Shift[]) {
  const slots: string[] = [];
  for (const shift of hours) { const [h, m] = shift.open.split(":").map(Number); const [eh, em] = shift.close.split(":").map(Number); for (let n = h * 60 + m; n < eh * 60 + em; n += 30) slots.push(`${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`); }
  return slots;
}
export async function api<T = Record<string, unknown>>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data as T;
}
