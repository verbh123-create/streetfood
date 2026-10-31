"use client";
import Link from "next/link";
import { useEffect, useState, useMemo, useCallback } from "react";
import { ArrowRight, ChevronRight, Coffee, Utensils, Clock3, CalendarDays, Search, Plus, Minus, ShoppingBag, Flame, Leaf, Sparkles, SlidersHorizontal, Package } from "lucide-react";
import { useApp } from "./app-provider";
import { PublicHeader, PublicFooter } from "./public-shell";
import { Dialog, EmptyState } from "./ui";
import { CartCheckout, OrderTrackingDialog, Tracking } from "./checkout";
import { SubscriptionDialog } from "./subscription-dialog";
import { api, money, Catalog, CartItem, Product, Banner } from "@/lib/types";

const ingredientAr: Record<string, string> = { "Espresso": "إسبريسو", "Milk": "حليب", "Ice": "ثلج", "Vanilla syrup": "شراب الفانيليا", "Condensed milk": "حليب مكثف", "Filtered water": "ماء مفلتر", "Passionfruit": "باشن فروت", "Orange": "برتقال", "Sparkling water": "ماء فوار", "Mint": "نعناع", "Lemon": "ليمون", "Sugar": "سكر", "Matcha": "ماتشا", "Black tea": "شاي أسود", "Cardamom": "هيل", "Strawberry": "فراولة", "Blueberry": "توت أزرق", "Banana": "موز", "Oat milk": "حليب الشوفان", "Beef patties": "لحم بقري", "Brioche bun": "خبز بريوش", "Cheddar": "شيدر", "Pickles": "مخلل", "Street sauce": "صوص ستريت", "Lettuce": "خس", "Jalapeños": "هالبينو", "Hot sauce": "صوص حار", "Swiss cheese": "جبن سويسري", "Mushrooms": "فطر", "Truffle mayo": "مايونيز الكمأة", "Chicken": "دجاج", "Slaw": "سلطة ملفوف", "Honey mustard": "خردل بالعسل", "Tortilla": "تورتيلا", "Tomato": "طماطم", "Garlic sauce": "صوص الثوم", "Potato": "بطاطس", "Cheese sauce": "صوص الجبن", "Crispy onions": "بصل مقرمش", "Sea salt": "ملح البحر", "Dark chocolate": "شوكولاتة داكنة", "Butter": "زبدة", "Flour": "طحين", "Egg": "بيض" };

export function Storefront({ initialCatalog }: { initialCatalog: Catalog }) {
  const { t, lang, toast } = useApp(); 
  const [catalog, setCatalog] = useState(initialCatalog); 
  const [category, setCategory] = useState("all"); 
  const [search, setSearch] = useState(""); 
  const [selected, setSelected] = useState<Product | null>(null); 
  const [quantity, setQuantity] = useState(1); 
  const [removed, setRemoved] = useState<string[]>([]); 
  const [cart, setCart] = useState<CartItem[]>([]); 
  const [loaded, setLoaded] = useState(false); 
  const [cartOpen, setCartOpen] = useState(false); 
  const [subscriptionOpen, setSubscriptionOpen] = useState(false); 
  const [banner, setBanner] = useState<Banner | null>(null); 
  const [lastOrder, setLastOrder] = useState<Tracking | null>(null); 
  const [trackingOpen, setTrackingOpen] = useState(false);

  const truck = catalog.truck;

  useEffect(() => {
    try { 
      const saved = JSON.parse(localStorage.getItem(`stt-cart-${truck.id}`) ?? "[]") as CartItem[]; 
      setCart(saved.flatMap(item => { 
        const product = initialCatalog.products.find(p => p.id === item.product?.id); 
        return product && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 20 ? [{ ...item, product }] : []; 
      })); 
      const tracking = JSON.parse(localStorage.getItem(`stt-tracking-${truck.id}`) ?? "null"); 
      if (tracking?.id && tracking?.token) setLastOrder(tracking); 
    } catch { 
      setCart([]); 
    }
    setLoaded(true); 
    const first = initialCatalog.banners.find(item => !sessionStorage.getItem(`stt-banner-${item.id}`)); 
    setBanner(first ?? null);
  }, [truck.id, initialCatalog]);

  useEffect(() => { 
    if (loaded) localStorage.setItem(`stt-cart-${truck.id}`, JSON.stringify(cart)); 
  }, [cart, loaded, truck.id]);

  useEffect(() => { 
    const timer = setInterval(() => { 
      api<Catalog>(`/api/catalog/${truck.id}`).then(setCatalog).catch(() => {}); 
    }, 60000); 
    return () => clearInterval(timer); 
  }, [truck.id]);

  const visible = useMemo(() => catalog.products.filter(product => (category === "all" || product.categoryId === category) && `${product.name} ${product.nameAr} ${product.description} ${product.descriptionAr} ${product.ingredients.join(" ")}`.toLowerCase().includes(search.toLowerCase())), [catalog.products, category, search]);
  
  const cartCount = cart.reduce((n, item) => n + item.quantity, 0); 
  const cartTotal = cart.reduce((n, item) => n + item.product.price * item.quantity, 0);
  
  const closeCart = useCallback(() => setCartOpen(false), []); 
  const closeSubscription = useCallback(() => setSubscriptionOpen(false), []); 
  const closeTracking = useCallback(() => setTrackingOpen(false), []); 
  const closeProduct = useCallback(() => setSelected(null), []);

  function add(product: Product, qty = 1, removedIngredients: string[] = []) { 
    const key = `${product.id}:${[...removedIngredients].sort().join("|")}`; 
    setCart(previous => { 
      const existing = previous.find(item => item.key === key); 
      if (existing) return previous.map(item => item.key === key ? { ...item, quantity: Math.min(20, item.quantity + qty) } : item); 
      return [...previous, { key, product, quantity: qty, removedIngredients }]; 
    }); 
    toast(t(`${product.name} added to your bag.`, `تمت إضافة ${product.nameAr} إلى سلتك.`)); 
    setSelected(null); 
  }

  function openProduct(product: Product) { 
    setSelected(product); 
    setQuantity(1); 
    setRemoved([]); 
  }

  const onOrder = (tracking: Tracking) => { 
    setLastOrder(tracking); 
    localStorage.setItem(`stt-tracking-${truck.id}`, JSON.stringify(tracking)); 
  };

  return (
    <div>
      <PublicHeader catalog={catalog} cartCount={cartCount} onCart={() => setCartOpen(true)}/>
      <main className="site-container">
        <div className="store-topline">
          <div className="breadcrumb">
            <Link href="/">{t("Home", "الرئيسية")}</Link>
            <ChevronRight size={11}/>
            <span>{t(truck.name, truck.nameAr)}</span>
          </div>
          <div className="truck-switch">
            <Link href="/beverage" className={truck.id === "beverage" ? "active" : ""}><Coffee size={12}/>{t("Beverages", "المشروبات")}</Link>
            <Link href="/food" className={truck.id === "food" ? "active" : ""}><Utensils size={12}/>{t("Food", "المأكولات")}</Link>
          </div>
        </div>

        {/* تم إزالة المستطيل أو البنر العلوي (store-hero) من هنا بناءً على رغبتك */}

        <section className="subscription-strip">
          <div>
            <CalendarDays size={26}/>
            <div>
              <h3>{t("Good routines taste better.", "الروتين الجميل، ألذ.")}<span className="discount-chip">{t(`SAVE ${truck.discount}%`, `وفر ${truck.discount}٪`)}</span></h3>
              <p>{t("Plan your week. Pick your favorites. We'll take it from here.", "خطط لأسبوعك واختر مفضلاتك. واترك الباقي علينا.")}</p>
            </div>
          </div>
          <button className="btn-primary btn-small" onClick={() => setSubscriptionOpen(true)}>{t("Build your plan", "أنشئ خطتك")}<ArrowRight size={13}/></button>
        </section>

        <div className="catalog-tools">
          <div className="category-tabs" aria-label={t("Menu categories", "فئات القائمة")}>
            <button className={category === "all" ? "active" : ""} onClick={() => setCategory("all")}>{t("All favorites", "جميع المفضلات")}</button>
            {catalog.categories.map(cat => <button key={cat.id} className={category === cat.id ? "active" : ""} onClick={() => setCategory(cat.id)}>{t(cat.name, cat.nameAr)}</button>)}
          </div>
          <div className="search-box">
            <Search size={14}/>
            <input aria-label={t("Search the menu", "ابحث في القائمة")} placeholder={t("Find your next favorite...", "ابحث عن مفضلتك القادمة...")} value={search} onChange={e => setSearch(e.target.value)}/>
            {search && <button className="remove-button" onClick={() => setSearch("")} aria-label="Clear search">×</button>}
          </div>
        </div>

        <div className="section-caption">
          <h2>{category === "all" ? t("Made for your cravings", "على قدر شهيتك") : t(catalog.categories.find(c => c.id === category)?.name ?? "Menu", catalog.categories.find(c => c.id === category)?.nameAr ?? "القائمة")}</h2>
          <span>{visible.length} {t("good choices", "خيارات لذيذة")}</span>
        </div>

        {visible.length ? (
          <section className="product-grid">
            {visible.map(product => (
              <article className="product-card" key={product.id}>
                <button className="product-photo-button" onClick={() => openProduct(product)} aria-label={t(`Customize ${product.name}`, `تخصيص ${product.nameAr}`)}>
                  <img src={product.image} alt={t(product.name, product.nameAr)} loading="lazy" onError={e => { e.currentTarget.src = `/images/${truck.id}-hero.jpg`; }}/>
                  {product.badge && <span className={`product-badge ${product.badge}`}>{product.badge === "fresh" ? <Leaf size={11}/> : product.badge === "spicy" ? <Flame size={11}/> : <Sparkles size={11}/>} {product.badge === "fresh" ? t("Fresh", "طازج") : product.badge === "spicy" ? t("A little heat", "لمسة حارة") : t("Street favorite", "المفضل")}</span>}
                </button>
                <div className="product-body">
                  <button className="product-title" onClick={() => openProduct(product)}>
                    <h3>{t(product.name, product.nameAr)}</h3>
                  </button>
                  <p>{t(product.description, product.descriptionAr)}</p>
                  <div className="product-bottom">
                    <span className="product-price"><small>BHD</small>{money(product.price)}</span>
                    <button className="add-button" onClick={() => add(product)} aria-label={t(`Add ${product.name} to bag`, `أضف ${product.nameAr} للسلة`)}><Plus size={18}/></button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <>
            <EmptyState icon={<Search size={30}/>} title={t("No bites found.", "لم نجد نتائج.")} text={t("Try a different search or explore another category.", "جرب بحثاً آخر أو استكشف فئة مختلفة.")}/>
            <div style={{ textAlign: "center", marginBottom: 45 }}>
              <button className="btn-secondary btn-small" onClick={() => { setCategory("all"); setSearch(""); }}>{t("Show all favorites", "عرض جميع المفضلات")}</button>
            </div>
          </>
        )}

        {lastOrder && (
          <div style={{ textAlign: "center", paddingBottom: 35 }}>
            <button className="text-link" onClick={() => setTrackingOpen(true)}><Package size={13}/> {t(`Track order #${String(lastOrder.number).padStart(4, "0")}`, `تتبع الطلب #${String(lastOrder.number).padStart(4, "0")}`)}</button>
          </div>
        )}
      </main>
      <PublicFooter/>
      
      {cartCount > 0 && (
        <button className="cart-fab" onClick={() => setCartOpen(true)}>
          <span><ShoppingBag size={17}/>{t("Your good stuff", "سلتك اللذيذة")}<b>{cartCount}</b></span>
          <span>BHD {money(cartTotal)}<ArrowRight size={16}/></span>
        </button>
      )}

      <Dialog open={!!selected} onClose={closeProduct} title={selected ? t(selected.name, selected.nameAr) : ""} eyebrow={t("MAKE IT YOURS", "على ذوقك")}>
        {selected && (
          <>
            <img className="product-detail-photo" src={selected.image} alt={t(selected.name, selected.nameAr)} onError={e => { e.currentTarget.src = `/images/${truck.id}-hero.jpg`; }}/>
            <p className="product-detail-description">{t(selected.description, selected.descriptionAr)}</p>
            <div className="ingredient-section">
              <h3><SlidersHorizontal size={13}/> {t("A little personal touch", "لمستك الشخصية")}</h3>
              <p>{t("All ingredients are included. Uncheck anything you'd like us to leave out.", "جميع المكونات مشمولة. ألغ تحديد أي مكون لا ترغب به.")}</p>
              <div className="ingredient-list">
                {selected.ingredients.map(ingredient => (
                  <label key={ingredient} className={removed.includes(ingredient) ? "removed" : ""}>
                    <input type="checkbox" checked={!removed.includes(ingredient)} onChange={() => setRemoved(previous => previous.includes(ingredient) ? previous.filter(i => i !== ingredient) : [...previous, ingredient])}/>
                    {lang === "ar" ? ingredientAr[ingredient] ?? ingredient : ingredient}
                  </label>
                ))}
              </div>
              <p>{t("Please tell us about allergies in your checkout notes.", "يرجى إخبارنا بالحساسية في ملاحظات الطلب.")}</p>
            </div>
            <div className="detail-actions">
              <div className="quantity-control">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity"><Minus size={14}/></button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity(Math.min(20, quantity + 1))} aria-label="Increase quantity"><Plus size={14}/></button>
              </div>
              <button className="btn-primary" onClick={() => add(selected, quantity, removed)}>
                <ShoppingBag size={15}/>{t("Add to bag", "أضف للسلة")} · BHD {money(selected.price * quantity)}
              </button>
            </div>
          </>
        )}
      </Dialog>

      <CartCheckout open={cartOpen} onClose={closeCart} catalog={catalog} cart={cart} setCart={setCart} onOrder={onOrder}/>
      <SubscriptionDialog open={subscriptionOpen} onClose={closeSubscription} catalog={catalog} onOrder={onOrder}/>
      <OrderTrackingDialog open={trackingOpen} onClose={closeTracking} tracking={lastOrder}/>
      
      <Dialog open={!!banner} onClose={() => { if (banner) sessionStorage.setItem(`stt-banner-${banner.id}`, "1"); setBanner(null); }} title={banner ? t(banner.title, banner.titleAr || banner.title) : ""} eyebrow={t("A LITTLE SOMETHING FOR YOU", "شيء صغير لك")}>
        {banner && (
          <>
            {banner.image && <img className="announcement-image" src={banner.image} alt={t(banner.title, banner.titleAr)}/>}
            <p className="announcement-copy">{t(banner.text, banner.textAr || banner.text)}</p>
            <button className="btn-primary full-width" style={{ marginTop: 23 }} onClick={() => { sessionStorage.setItem(`stt-banner-${banner.id}`, "1"); setBanner(null); }}>
              {t("Sounds delicious. Let's go.", "يبدو لذيذاً. لنبدأ.")}<ArrowRight size={14}/>
            </button>
          </>
        )}
      </Dialog>
    </div>
  );
}