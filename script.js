/* =========================================================
   GRIHOKONA — Storefront logic
   Product data now lives in Firebase Firestore and is managed
   from admin.html — this file only reads it and never edits it.
   Store-wide settings (WhatsApp number, delivery charges) are
   still plain JS below, since they rarely change.
   ========================================================= */

/* ---------------------------------------------------------
   STORE CONFIG — edit these to rebrand / retarget
   --------------------------------------------------------- */
const CONFIG = {
  BUSINESS_NAME: "Grihokona",

  // WhatsApp number that receives every order.
  // Format: country code + number, no plus sign, no spaces.
  WHATSAPP_NUMBER: "8801903770516",

  // Delivery charges in Taka. Shown on the page and added at checkout.
  DELIVERY_CHARGE_DHAKA: 70,
  DELIVERY_CHARGE_OUTSIDE: 130,

  // Free delivery inside Dhaka above this subtotal. Set to 0 to disable.
  FREE_DELIVERY_THRESHOLD_DHAKA: 1500,

  // Prefix used when generating order IDs, e.g. GRIHOKONA-20260926-001
  ORDER_PREFIX: "GRIHOKONA",

  CURRENCY_SYMBOL: "৳"
};

/* =========================================================
   Everything below this line is store logic.
   Product data comes live from Firestore (see firebase-config.js
   and admin.html) — you manage products from the admin panel,
   not by editing this file.
   ========================================================= */

const CART_KEY = "grihokona_cart_v1";
const WISHLIST_KEY = "grihokona_wishlist_v1";

let PRODUCTS = [];               // populated live from Firestore
let cart = loadList(CART_KEY);
let wishlist = loadList(WISHLIST_KEY);
let activeCategory = "all";
let searchQuery = "";
let pendingOrder = null;         // holds order details between review and confirm
let lightboxState = { productId: null, index: 0 };

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  document.getElementById("rateDhaka").textContent = money(CONFIG.DELIVERY_CHARGE_DHAKA);
  document.getElementById("rateOutside").textContent = money(CONFIG.DELIVERY_CHARGE_OUTSIDE);

  bindGlobalEvents();
  renderCart();
  renderWishlist();
  subscribeToProducts();
});

/* ---------- Live product feed from Firestore ---------- */
function subscribeToProducts() {
  const grid = document.getElementById("productGrid");
  grid.innerHTML = `<p style="color:var(--text-muted)">Loading products…</p>`;

  db.collection("products").orderBy("createdAt", "desc").onSnapshot(
    (snapshot) => {
      PRODUCTS = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderCategories();
      renderProducts();
    },
    (error) => {
      console.error("Failed to load products:", error);
      grid.innerHTML = `<p style="color:var(--text-muted)">Couldn't load products right now. Please refresh the page.</p>`;
    }
  );
}

/* ---------- Helpers ---------- */
function money(n) {
  return CONFIG.CURRENCY_SYMBOL + Number(n).toLocaleString("en-US");
}

function loadList(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveList(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* localStorage unavailable — state just won't persist across visits */
  }
}

function findProduct(id) {
  return PRODUCTS.find(p => p.id === id);
}

function productImage(p) {
  return (p.images && p.images[0]) || "";
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 2200);
}

function trackEvent(name, params) {
  if (typeof fbq === "function") {
    fbq("track", name, params || {});
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}

/* ---------- Categories ---------- */
function renderCategories() {
  const categories = ["all", ...new Set(PRODUCTS.map(p => p.category).filter(Boolean))];
  const scroll = document.getElementById("categoryScroll");
  scroll.innerHTML = categories.map(cat => `
    <button class="cat-chip ${cat === activeCategory ? "active" : ""}" data-category="${escapeHtml(cat)}">
      ${cat === "all" ? "All Products" : escapeHtml(cat)}
    </button>
  `).join("");

  scroll.querySelectorAll(".cat-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.category;
      scroll.querySelectorAll(".cat-chip").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderProducts();
    });
  });
}

/* ---------- Product grid ---------- */
function getFilteredProducts() {
  let list = activeCategory === "all" ? PRODUCTS : PRODUCTS.filter(p => p.category === activeCategory);
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    list = list.filter(p => (p.name || "").toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q));
  }
  return list;
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  const list = getFilteredProducts();

  if (PRODUCTS.length === 0) {
    grid.innerHTML = `<p style="color:var(--text-muted)">New pieces are being added soon — check back shortly, or message us on WhatsApp for what's available now.</p>`;
    return;
  }
  if (list.length === 0) {
    grid.innerHTML = `<p style="color:var(--text-muted)">No products match your search.</p>`;
    return;
  }

  grid.innerHTML = list.map(p => productCardHtml(p)).join("");

  list.forEach(p => {
    const card = grid.querySelector(`[data-product-id="${p.id}"]`);
    if (!card) return;

    const media = card.querySelector(".product-media");
    if (media) media.addEventListener("click", (e) => {
      if (e.target.closest(".wish-toggle")) return;
      openLightbox(p.id, 0);
    });

    const wishBtn = card.querySelector(".wish-toggle");
    if (wishBtn) wishBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleWishlist(p.id);
    });

    const notifyBtn = card.querySelector(".notify-btn");
    if (notifyBtn) notifyBtn.addEventListener("click", () => notifyMe(p));

    const qtyEl = card.querySelector(".qty-value");
    const minus = card.querySelector(".qty-minus");
    const plus = card.querySelector(".qty-plus");
    const addBtn = card.querySelector(".add-to-cart");
    const buyBtn = card.querySelector(".buy-now");

    let localQty = 1;
    const clampQty = () => {
      localQty = Math.max(1, Math.min(localQty, p.stock || 1));
      if (qtyEl) qtyEl.textContent = localQty;
    };

    if (minus) minus.addEventListener("click", () => { localQty--; clampQty(); });
    if (plus) plus.addEventListener("click", () => { localQty++; clampQty(); });

    if (addBtn) addBtn.addEventListener("click", () => {
      addToCart(p.id, localQty);
      showToast(`${p.name} added to cart`);
    });

    if (buyBtn) buyBtn.addEventListener("click", () => {
      addToCart(p.id, localQty);
      openCart();
    });
  });
}

function productCardHtml(p) {
  const stock = Number(p.stock) || 0;
  const isOut = stock <= 0;
  const isLow = !isOut && stock <= 5;
  const stockLabel = isOut ? "Out of stock" : (isLow ? `Only ${stock} left` : "In stock");
  const stockClass = isOut ? "out" : (isLow ? "low" : "in");
  const discountPct = p.oldPrice ? Math.round(100 - (p.price / p.oldPrice) * 100) : null;
  const isWished = wishlist.includes(p.id);
  const images = p.images && p.images.length ? p.images : [""];
  const dots = images.length > 1
    ? `<div class="gallery-dots">${images.map((_, i) => `<span class="${i === 0 ? "active" : ""}"></span>`).join("")}</div>`
    : "";

  return `
    <div class="product-card" data-product-id="${p.id}">
      <div class="product-media">
        ${discountPct ? `<span class="badge">-${discountPct}%</span>` : ""}
        ${p.isNew && !isOut ? `<span class="badge badge-new" style="${discountPct ? "top:34px;" : ""}">New</span>` : ""}
        ${isOut ? `<span class="badge badge-out">Sold out</span>` : ""}
        <button class="wish-toggle ${isWished ? "active" : ""}" type="button" aria-label="Save to wishlist">
          <svg viewBox="0 0 24 24" fill="${isWished ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7.5-4.6-10-9.2C.4 8.4 2 4.5 5.8 4a5 5 0 0 1 6.2 3 5 5 0 0 1 6.2-3c3.8.5 5.4 4.4 3.8 7.8C19.5 16.4 12 21 12 21Z"/></svg>
        </button>
        <img src="${productImage(p)}" alt="${escapeHtml(p.name || "")}" loading="lazy"
             onerror="this.parentElement.style.background='var(--primary-tint)'; this.remove();">
        ${dots}
      </div>
      <div class="product-body">
        <span class="product-cat">${escapeHtml(p.category || "")}</span>
        <span class="product-name">${escapeHtml(p.name || "")}</span>
        <span class="product-desc">${escapeHtml(p.description || "")}</span>
        <div class="price-row">
          <span class="price">${money(p.price || 0)}</span>
          ${p.oldPrice ? `<span class="old-price">${money(p.oldPrice)}</span>` : ""}
        </div>
        <span class="stock ${stockClass}">${stockLabel}</span>

        ${isOut ? `
        <button class="btn btn-ghost notify-btn" type="button">Notify Me When Available</button>
        ` : `
        <div class="qty-row">
          <div class="qty-control">
            <button class="qty-minus" type="button" aria-label="Decrease quantity">−</button>
            <span class="qty-value">1</span>
            <button class="qty-plus" type="button" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div class="card-actions">
          <button class="btn btn-ghost add-to-cart" type="button">Add to Cart</button>
          <button class="btn btn-primary buy-now" type="button">Buy Now</button>
        </div>
        `}
      </div>
    </div>
  `;
}

/* ---------- Wishlist ---------- */
function toggleWishlist(productId) {
  const idx = wishlist.indexOf(productId);
  if (idx >= 0) {
    wishlist.splice(idx, 1);
  } else {
    wishlist.push(productId);
    const p = findProduct(productId);
    if (p) trackEvent("AddToWishlist", { content_name: p.name, value: p.price, currency: "BDT" });
  }
  saveList(WISHLIST_KEY, wishlist);
  renderProducts();
  renderWishlist();
}

function renderWishlist() {
  const container = document.getElementById("wishlistItems");
  const countEls = [document.getElementById("wishlistCount"), document.getElementById("mobileWishlistCount")];
  countEls.forEach(el => { if (el) el.textContent = wishlist.length; });

  if (!container) return;

  if (wishlist.length === 0) {
    container.innerHTML = `<p class="cart-empty">Nothing saved yet. Tap the heart on a product to save it here.</p>`;
    return;
  }

  container.innerHTML = wishlist.map(id => {
    const p = findProduct(id);
    if (!p) return "";
    return `
      <div class="cart-line" data-wish-id="${p.id}">
        <img src="${productImage(p)}" alt="${escapeHtml(p.name)}" onerror="this.style.background='var(--primary-tint)'">
        <div class="cart-line-info">
          <span class="cart-line-name">${escapeHtml(p.name)}</span>
          <span class="cart-line-price">${money(p.price)}</span>
          <div class="cart-line-bottom">
            <button class="btn btn-primary btn-sm wish-add-cart" type="button">Add to Cart</button>
            <button class="remove-btn" type="button">Remove</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".cart-line").forEach(line => {
    const id = line.dataset.wishId;
    line.querySelector(".wish-add-cart").addEventListener("click", () => {
      addToCart(id, 1);
      showToast("Added to cart");
    });
    line.querySelector(".remove-btn").addEventListener("click", () => toggleWishlist(id));
  });
}

function openWishlist() {
  document.getElementById("wishlistDrawer").classList.add("active");
  document.getElementById("overlay").classList.add("active");
}
function closeWishlist() {
  document.getElementById("wishlistDrawer").classList.remove("active");
  document.getElementById("overlay").classList.remove("active");
}

/* ---------- Notify me (out of stock) ---------- */
function notifyMe(product) {
  const message = `Hi ${CONFIG.BUSINESS_NAME}, please notify me when "${product.name}" is back in stock.`;
  const url = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

/* ---------- Lightbox / gallery zoom ---------- */
function openLightbox(productId, index) {
  const p = findProduct(productId);
  if (!p || !p.images || !p.images.length) return;
  lightboxState = { productId, index: index || 0 };
  renderLightbox();
  document.getElementById("lightboxModal").classList.add("active");
  document.getElementById("lightboxModal").setAttribute("aria-hidden", "false");
}

function closeLightbox() {
  document.getElementById("lightboxModal").classList.remove("active");
  document.getElementById("lightboxModal").setAttribute("aria-hidden", "true");
}

function renderLightbox() {
  const p = findProduct(lightboxState.productId);
  if (!p) return;
  const img = document.getElementById("lightboxImage");
  img.src = p.images[lightboxState.index];
  img.alt = p.name;

  document.getElementById("lightboxThumbs").innerHTML = p.images.map((src, i) => `
    <img src="${src}" alt="" class="${i === lightboxState.index ? "active" : ""}" data-index="${i}">
  `).join("");

  document.querySelectorAll("#lightboxThumbs img").forEach(thumb => {
    thumb.addEventListener("click", () => {
      lightboxState.index = Number(thumb.dataset.index);
      renderLightbox();
    });
  });
}

function lightboxStep(delta) {
  const p = findProduct(lightboxState.productId);
  if (!p) return;
  const len = p.images.length;
  lightboxState.index = (lightboxState.index + delta + len) % len;
  renderLightbox();
}

/* ---------- Cart logic ---------- */
function addToCart(productId, qty) {
  const product = findProduct(productId);
  if (!product || Number(product.stock) <= 0) return;

  const existing = cart.find(item => item.id === productId);
  const maxQty = Number(product.stock);

  if (existing) {
    existing.qty = Math.min(existing.qty + qty, maxQty);
  } else {
    cart.push({ id: productId, qty: Math.min(qty, maxQty) });
  }
  saveList(CART_KEY, cart);
  renderCart();
  trackEvent("AddToCart", { content_name: product.name, value: product.price * qty, currency: "BDT" });
}

function updateQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  const product = findProduct(productId);
  const maxQty = product ? Number(product.stock) : 99;

  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(i => i.id !== productId);
  } else if (item.qty > maxQty) {
    item.qty = maxQty;
  }
  saveList(CART_KEY, cart);
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.id !== productId);
  saveList(CART_KEY, cart);
  renderCart();
}

function cartSubtotal() {
  return cart.reduce((sum, item) => {
    const product = findProduct(item.id);
    return product ? sum + product.price * item.qty : sum;
  }, 0);
}

function cartCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function renderCart() {
  const container = document.getElementById("cartItems");
  const countEls = [document.getElementById("cartCount"), document.getElementById("mobileCartCount")];
  const count = cartCount();
  countEls.forEach(el => { if (el) el.textContent = count; });

  if (cart.length === 0) {
    container.innerHTML = `<p class="cart-empty">Your cart is empty. Browse products and add something you like.</p>`;
  } else {
    container.innerHTML = cart.map(item => {
      const p = findProduct(item.id);
      if (!p) return "";
      return `
        <div class="cart-line" data-line-id="${p.id}">
          <img src="${productImage(p)}" alt="${escapeHtml(p.name)}" onerror="this.style.background='var(--primary-tint)'">
          <div class="cart-line-info">
            <span class="cart-line-name">${escapeHtml(p.name)}</span>
            <span class="cart-line-price">${money(p.price)} each</span>
            <div class="cart-line-bottom">
              <div class="qty-control">
                <button class="qty-minus" type="button" aria-label="Decrease quantity">−</button>
                <span class="qty-value">${item.qty}</span>
                <button class="qty-plus" type="button" aria-label="Increase quantity">+</button>
              </div>
              <button class="remove-btn" type="button">Remove</button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    container.querySelectorAll(".cart-line").forEach(line => {
      const id = line.dataset.lineId;
      line.querySelector(".qty-minus").addEventListener("click", () => updateQty(id, -1));
      line.querySelector(".qty-plus").addEventListener("click", () => updateQty(id, 1));
      line.querySelector(".remove-btn").addEventListener("click", () => removeFromCart(id));
    });
  }

  document.getElementById("cartSubtotal").textContent = money(cartSubtotal());
}

/* ---------- Cart drawer open/close ---------- */
function openCart() {
  document.getElementById("cartDrawer").classList.add("active");
  document.getElementById("overlay").classList.add("active");
}
function closeCart() {
  document.getElementById("cartDrawer").classList.remove("active");
  document.getElementById("overlay").classList.remove("active");
}

/* ---------- Order ID ---------- */
function generateOrderId() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const datePart = `${y}${m}${d}`;

  const seqKey = "grihokona_order_seq_" + datePart;
  let seq = Number(localStorage.getItem(seqKey) || "0") + 1;
  try { localStorage.setItem(seqKey, String(seq)); } catch (e) {}

  return `${CONFIG.ORDER_PREFIX}-${datePart}-${String(seq).padStart(3, "0")}`;
}

/* ---------- Checkout flow ---------- */
function openCheckout() {
  if (cart.length === 0) {
    showToast("Your cart is empty");
    return;
  }
  document.getElementById("checkoutFormStep").hidden = false;
  document.getElementById("checkoutReviewStep").hidden = true;
  document.getElementById("checkoutDoneStep").hidden = true;
  document.getElementById("checkoutTitle").textContent = "Checkout";
  document.getElementById("checkoutModal").classList.add("active");
  document.getElementById("checkoutModal").setAttribute("aria-hidden", "false");
  closeCart();
  trackEvent("InitiateCheckout", { value: cartSubtotal(), currency: "BDT" });
}

function closeCheckout() {
  document.getElementById("checkoutModal").classList.remove("active");
  document.getElementById("checkoutModal").setAttribute("aria-hidden", "true");
}

function deliveryChargeFor(zone, subtotal) {
  if (zone === "dhaka") {
    if (CONFIG.FREE_DELIVERY_THRESHOLD_DHAKA > 0 && subtotal >= CONFIG.FREE_DELIVERY_THRESHOLD_DHAKA) {
      return 0;
    }
    return CONFIG.DELIVERY_CHARGE_DHAKA;
  }
  return CONFIG.DELIVERY_CHARGE_OUTSIDE;
}

function handleCheckoutSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const data = new FormData(form);

  const subtotal = cartSubtotal();
  const zone = data.get("zone");
  const delivery = deliveryChargeFor(zone, subtotal);

  pendingOrder = {
    orderId: null, // assigned at confirm time
    name: data.get("name").trim(),
    phone: data.get("phone").trim(),
    address: data.get("address").trim(),
    thana: data.get("thana").trim(),
    zone: zone,
    note: (data.get("note") || "").trim(),
    items: cart.map(item => {
      const p = findProduct(item.id);
      return { name: p.name, qty: item.qty, price: p.price };
    }),
    subtotal: subtotal,
    delivery: delivery,
    total: subtotal + delivery
  };

  renderReview(pendingOrder);
  document.getElementById("checkoutFormStep").hidden = true;
  document.getElementById("checkoutReviewStep").hidden = false;
  document.getElementById("checkoutTitle").textContent = "Review your order";
}

function renderReview(order) {
  const zoneLabel = order.zone === "dhaka" ? "Inside Dhaka" : "Outside Dhaka";
  const itemsHtml = order.items.map(i => `
    <div class="review-line">
      <span>${escapeHtml(i.name)} × ${i.qty}</span>
      <span>${money(i.price * i.qty)}</span>
    </div>
  `).join("");

  document.getElementById("reviewContent").innerHTML = `
    <div class="review-block">
      <h5>Customer</h5>
      <div class="review-line"><span>${escapeHtml(order.name)}</span><span>${escapeHtml(order.phone)}</span></div>
      <div class="review-line"><span>${escapeHtml(order.address)}, ${escapeHtml(order.thana)}</span><span>${zoneLabel}</span></div>
      ${order.note ? `<div class="review-line"><span>Note</span><span>${escapeHtml(order.note)}</span></div>` : ""}
    </div>
    <div class="review-block">
      <h5>Items</h5>
      ${itemsHtml}
    </div>
    <div class="review-block">
      <div class="review-line"><span>Subtotal</span><span>${money(order.subtotal)}</span></div>
      <div class="review-line"><span>Delivery</span><span>${order.delivery === 0 ? "Free" : money(order.delivery)}</span></div>
      <div class="review-line review-total"><span>Total</span><span>${money(order.total)}</span></div>
    </div>
  `;
}

function confirmOrder() {
  if (!pendingOrder) return;
  pendingOrder.orderId = generateOrderId();

  const message = buildWhatsAppMessage(pendingOrder);
  const url = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");

  trackEvent("Purchase", { value: pendingOrder.total, currency: "BDT", content_ids: pendingOrder.items.map(i => i.name) });

  document.getElementById("checkoutReviewStep").hidden = true;
  document.getElementById("checkoutDoneStep").hidden = false;
  document.getElementById("checkoutTitle").textContent = "Order sent";
  document.getElementById("doneOrderId").textContent = pendingOrder.orderId;

  // clear cart after a successful hand-off to WhatsApp
  cart = [];
  saveList(CART_KEY, cart);
  renderCart();
}

function buildWhatsAppMessage(order) {
  const zoneLabel = order.zone === "dhaka" ? "Inside Dhaka" : "Outside Dhaka";
  const lines = [];

  lines.push(`*New Order — ${CONFIG.BUSINESS_NAME}*`);
  lines.push(`Order ID: ${order.orderId}`);
  lines.push("");
  lines.push(`*Customer:* ${order.name}`);
  lines.push(`*Mobile:* ${order.phone}`);
  lines.push(`*Address:* ${order.address}, ${order.thana} (${zoneLabel})`);
  lines.push("");
  lines.push("*Products:*");
  order.items.forEach(i => {
    lines.push(`- ${i.name} x${i.qty} @ ${money(i.price)} = ${money(i.price * i.qty)}`);
  });
  lines.push("");
  lines.push(`*Subtotal:* ${money(order.subtotal)}`);
  lines.push(`*Delivery Charge:* ${order.delivery === 0 ? "Free" : money(order.delivery)}`);
  lines.push(`*Grand Total:* ${money(order.total)}`);
  if (order.note) {
    lines.push("");
    lines.push(`*Note:* ${order.note}`);
  }

  return lines.join("\n");
}

/* ---------- Global event bindings ---------- */
function bindGlobalEvents() {
  document.getElementById("headerCartBtn").addEventListener("click", openCart);
  document.getElementById("mobileCartBtn").addEventListener("click", openCart);
  document.getElementById("closeCartBtn").addEventListener("click", closeCart);

  document.getElementById("headerWishlistBtn").addEventListener("click", openWishlist);
  document.getElementById("mobileWishlistBtn").addEventListener("click", openWishlist);
  document.getElementById("closeWishlistBtn").addEventListener("click", closeWishlist);

  document.getElementById("overlay").addEventListener("click", () => { closeCart(); closeWishlist(); });

  document.getElementById("checkoutBtn").addEventListener("click", openCheckout);
  document.getElementById("closeCheckoutBtn").addEventListener("click", closeCheckout);

  document.getElementById("checkoutForm").addEventListener("submit", handleCheckoutSubmit);
  document.getElementById("backToFormBtn").addEventListener("click", () => {
    document.getElementById("checkoutReviewStep").hidden = true;
    document.getElementById("checkoutFormStep").hidden = false;
    document.getElementById("checkoutTitle").textContent = "Checkout";
  });
  document.getElementById("confirmOrderBtn").addEventListener("click", confirmOrder);
  document.getElementById("doneCloseBtn").addEventListener("click", () => {
    closeCheckout();
    document.getElementById("checkoutForm").reset();
  });

  document.getElementById("checkoutModal").addEventListener("click", (e) => {
    if (e.target.id === "checkoutModal") closeCheckout();
  });

  document.getElementById("productSearch").addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderProducts();
  });

  document.getElementById("closeLightboxBtn").addEventListener("click", closeLightbox);
  document.getElementById("lightboxPrev").addEventListener("click", () => lightboxStep(-1));
  document.getElementById("lightboxNext").addEventListener("click", () => lightboxStep(1));
  document.getElementById("lightboxModal").addEventListener("click", (e) => {
    if (e.target.id === "lightboxModal") closeLightbox();
  });
}
