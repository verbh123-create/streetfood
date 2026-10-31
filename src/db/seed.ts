import "dotenv/config";
import { hash } from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db, pool } from "./index";
import { trucks, categories, products, regions, users, siteSettings } from "./schema";

async function seed() {
  await db.insert(siteSettings).values({ id: "site" }).onConflictDoNothing();
  await db.insert(trucks).values([
    { id: "beverage", name: "Beverage Truck", nameAr: "عربة المشروبات", title: "A little sip. A lot of happy.", titleAr: "رشفة صغيرة. سعادة كبيرة.", description: "Specialty coffee, fresh refreshers, and your new daily ritual.", descriptionAr: "قهوة مختصة ومشروبات منعشة وطقوسك اليومية الجديدة." },
    { id: "food", name: "Food Truck", nameAr: "عربة المأكولات", title: "Big flavor. No shortcuts.", titleAr: "نكهة كبيرة. بلا تنازلات.", description: "Smash burgers, loaded fries, and street-side favorites. Made fresh, always.", descriptionAr: "سماش برغر وبطاطس محملة ومفضلات الشارع. طازجة دائماً." },
  ]).onConflictDoNothing();
  const categoryDefs = [
    ["beverage", "Signature Coffee", "قهوة مميزة"], ["beverage", "Refreshers", "مشروبات منعشة"], ["beverage", "Matcha & Tea", "ماتشا وشاي"], ["beverage", "Smoothies", "سموذي"],
    ["food", "Smash Burgers", "سماش برغر"], ["food", "Chicken & Wraps", "دجاج ولفائف"], ["food", "Sides & Fries", "مقبلات وبطاطس"], ["food", "Sweet Bites", "حلويات"],
  ];
  for (let i = 0; i < categoryDefs.length; i++) { const [truck, name, nameAr] = categoryDefs[i]; await db.insert(categories).values({ truck, name, nameAr, sort: i }).onConflictDoNothing(); }
  const cats = await db.select().from(categories);
  const img = (id: string) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800`;
  const menu = [
    { truck: "beverage", category: "Signature Coffee", name: "Signature Iced Latte", nameAr: "آيس لاتيه المميز", description: "Double espresso, silky milk, and a perfectly chilled finish.", descriptionAr: "إسبريسو مزدوج وحليب ناعم بلمسة باردة مثالية.", price: 1800, image: "/images/beverage-hero.jpg", ingredients: ["Espresso", "Milk", "Ice", "Vanilla syrup"], badge: "popular" },
    { truck: "beverage", category: "Signature Coffee", name: "Spanish Latte", nameAr: "سبانيش لاتيه", description: "Our rich espresso meets creamy, sweet condensed milk.", descriptionAr: "إسبريسو غني مع حليب مكثف كريمي وحلو.", price: 2200, image: img("4869332"), ingredients: ["Espresso", "Milk", "Condensed milk", "Ice"], badge: "" },
    { truck: "beverage", category: "Signature Coffee", name: "Classic Americano", nameAr: "أمريكانو كلاسيك", description: "Bold, beautifully balanced, and brewed to order.", descriptionAr: "نكهة جريئة ومتوازنة، تحضر عند الطلب.", price: 1400, image: img("302899"), ingredients: ["Espresso", "Filtered water"], badge: "" },
    { truck: "beverage", category: "Refreshers", name: "Sunset Passion", nameAr: "باشن الغروب", description: "Passionfruit, fresh orange, and a sparkling citrus kick.", descriptionAr: "باشن فروت وبرتقال طازج ولمسة حمضيات فوارة.", price: 2000, image: img("1194030"), ingredients: ["Passionfruit", "Orange", "Sparkling water", "Mint"], badge: "fresh" },
    { truck: "beverage", category: "Refreshers", name: "Mint Lemonade", nameAr: "ليمون بالنعناع", description: "Freshly squeezed lemons with a cool mint twist.", descriptionAr: "ليمون معصور طازج مع لمسة نعناع باردة.", price: 1600, image: img("96974"), ingredients: ["Lemon", "Mint", "Sugar", "Ice"], badge: "fresh" },
    { truck: "beverage", category: "Matcha & Tea", name: "Iced Matcha Latte", nameAr: "آيس ماتشا لاتيه", description: "Ceremonial matcha, whisked smooth over creamy milk.", descriptionAr: "ماتشا فاخرة مخفوقة بسلاسة مع حليب كريمي.", price: 2400, image: img("5946965"), ingredients: ["Matcha", "Milk", "Vanilla syrup", "Ice"], badge: "fresh" },
    { truck: "beverage", category: "Matcha & Tea", name: "Street Karak", nameAr: "كرك ستريت", description: "A Bahrain favorite. Slow-brewed tea, cardamom, and milk.", descriptionAr: "المفضل في البحرين. شاي مطهو على مهل بالهيل والحليب.", price: 700, image: img("230477"), ingredients: ["Black tea", "Milk", "Cardamom", "Sugar"], badge: "popular" },
    { truck: "beverage", category: "Smoothies", name: "Berry Good", nameAr: "بيري جود", description: "Strawberry, blueberry, and banana blended to happiness.", descriptionAr: "فراولة وتوت أزرق وموز ممزوجة بالسعادة.", price: 2300, image: img("775032"), ingredients: ["Strawberry", "Blueberry", "Banana", "Oat milk"], badge: "fresh" },
    { truck: "food", category: "Smash Burgers", name: "The Street Original", nameAr: "ستريت أوريجينال", description: "Double smashed beef, melted cheddar, pickles, and our secret street sauce.", descriptionAr: "لحم بقري مزدوج وجبن شيدر ذائب ومخلل وصوص ستريت السري.", price: 3200, image: "/images/food-hero.jpg", ingredients: ["Beef patties", "Brioche bun", "Cheddar", "Pickles", "Street sauce", "Lettuce"], badge: "popular" },
    { truck: "food", category: "Smash Burgers", name: "The Heatwave", nameAr: "هيت ويف", description: "Our signature smash with jalapeños and a fiery house sauce.", descriptionAr: "سماش المميز مع هالبينو وصوص حار خاص.", price: 3500, image: img("28828555"), ingredients: ["Beef patties", "Brioche bun", "Cheddar", "Jalapeños", "Hot sauce"], badge: "spicy" },
    { truck: "food", category: "Smash Burgers", name: "Mushroom Melt", nameAr: "مشروم ميلت", description: "Sautéed mushrooms, Swiss cheese, and truffle mayo on our double smash.", descriptionAr: "فطر سوتيه وجبن سويسري ومايونيز الكمأة مع سماش مزدوج.", price: 3800, image: img("11256679"), ingredients: ["Beef patties", "Brioche bun", "Swiss cheese", "Mushrooms", "Truffle mayo"], badge: "" },
    { truck: "food", category: "Chicken & Wraps", name: "Crispy Chicken Burger", nameAr: "برغر الدجاج المقرمش", description: "Golden buttermilk chicken, crunchy slaw, and honey mustard.", descriptionAr: "دجاج ذهبي مقرمش وسلطة ملفوف وخردل بالعسل.", price: 2800, image: img("2232"), ingredients: ["Chicken", "Brioche bun", "Slaw", "Honey mustard"], badge: "" },
    { truck: "food", category: "Chicken & Wraps", name: "Street Chicken Wrap", nameAr: "لفافة دجاج ستريت", description: "Flame-grilled chicken, fresh greens, and creamy garlic sauce.", descriptionAr: "دجاج مشوي وخضار طازجة وصوص ثوم كريمي.", price: 2400, image: img("461198"), ingredients: ["Chicken", "Tortilla", "Lettuce", "Tomato", "Garlic sauce"], badge: "fresh" },
    { truck: "food", category: "Sides & Fries", name: "Loaded Street Fries", nameAr: "بطاطس ستريت المحملة", description: "Crispy fries, cheese sauce, jalapeños, and crispy onions.", descriptionAr: "بطاطس مقرمشة وصوص جبن وهالبينو وبصل مقرمش.", price: 2000, image: img("1583884"), ingredients: ["Potato", "Cheese sauce", "Jalapeños", "Crispy onions"], badge: "spicy" },
    { truck: "food", category: "Sides & Fries", name: "Classic Fries", nameAr: "بطاطس كلاسيك", description: "Golden, sea-salted, and impossible to share.", descriptionAr: "ذهبية بملح البحر. يصعب مشاركتها.", price: 1000, image: img("1583884"), ingredients: ["Potato", "Sea salt"], badge: "fresh" },
    { truck: "food", category: "Sweet Bites", name: "Chocolate Brownie", nameAr: "براوني الشوكولاتة", description: "Fudgy dark chocolate with a perfectly crackly top.", descriptionAr: "شوكولاتة داكنة غنية مع طبقة علوية مقرمشة.", price: 1500, image: img("45202"), ingredients: ["Dark chocolate", "Butter", "Flour", "Egg", "Sugar"], badge: "" },
  ];
  const defaultImages: Record<string, string> = { "Berry Good": "/images/berry-smoothie.jpg", "Classic Americano": "/images/americano.jpg", "Mint Lemonade": "/images/mint-lemonade.jpg", "Crispy Chicken Burger": "/images/crispy-chicken.jpg", "Chocolate Brownie": "/images/chocolate-brownie.jpg" };
  for (const p of menu) {
    const { category, ...data } = p; const image = defaultImages[p.name] ?? p.image;
    await db.insert(products).values({ ...data, image, categoryId: cats.find(c => c.truck === p.truck && c.name === category)!.id }).onConflictDoNothing();
    if (defaultImages[p.name]) await db.update(products).set({ image }).where(and(eq(products.truck, p.truck), eq(products.name, p.name), eq(products.image, p.image)));
  }
  for (const truck of ["beverage", "food"]) for (const [name, nameAr, fee] of [["Manama", "المنامة", 500], ["Riffa", "الرفاع", 800], ["Muharraq", "المحرق", 700], ["Isa Town", "مدينة عيسى", 600], ["Hamad Town", "مدينة حمد", 1000]] as const) await db.insert(regions).values({ truck, name, nameAr, fee }).onConflictDoNothing();
  const accounts = [{ username: "ahmad", password: "Verde@123", name: "Ahmad", role: "superadmin", truck: null }, { username: "beverage", password: "12345678", name: "Beverage Kitchen", role: "kitchen", truck: "beverage" }, { username: "kitchen", password: "12345678", name: "Food Kitchen", role: "kitchen", truck: "food" }];
  for (const account of accounts) { const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, account.username)); if (!existing.length) { const { password, ...data } = account; await db.insert(users).values({ ...data, passwordHash: await hash(password, 12), verified: true, permissions: account.role === "superadmin" ? ["*"] : ["orders"] }).onConflictDoNothing(); } }
  console.log("Street Taste Truck: menus, regions, and initial accounts seeded successfully.");
}
seed().then(() => pool.end()).catch(async error => { console.error(error); await pool.end(); process.exitCode = 1; });
