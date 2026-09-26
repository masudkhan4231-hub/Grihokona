# Grihokona — E-commerce Site with Admin Panel (WhatsApp Ordering)

A mobile-first storefront for a small Bangladesh-based business. Customers browse, add to cart, fill a checkout form, and the order is sent to your WhatsApp as a ready-to-read message. Products, photos, and stock are managed live from a private admin panel — no code editing needed for day-to-day updates.

## Files

```
index.html          the storefront customers see
admin.html           your private admin panel (product management)
style.css            storefront styling
admin.css            admin panel styling
script.js             storefront logic (cart, checkout, WhatsApp)
admin.js               admin panel logic (product CRUD, image upload)
firebase-config.js     your Firebase + Cloudinary keys (fill this in — see ADMIN-SETUP.md)
images/                logo, hero photo, and Facebook preview image
ADMIN-SETUP.md          one-time setup guide for the admin panel's backend
```

**First-time setup:** before the site can show any products, follow `ADMIN-SETUP.md` once to connect the free Firebase + Cloudinary backend. It takes about 15–20 minutes.

## What to edit, and where

Business settings you'll touch occasionally are at the **top of `script.js`**, inside `CONFIG`. Products, photos, and stock are managed from `admin.html` — you don't edit code for those anymore.

### 1. Business name
`script.js` → `CONFIG.BUSINESS_NAME`
```js
BUSINESS_NAME: "Grihokona",
```
Also update the visible brand name and page `<title>` in `index.html` if you rename the shop (search for "Grihokona").

### 2. WhatsApp number
`script.js` → `CONFIG.WHATSAPP_NUMBER`
```js
WHATSAPP_NUMBER: "8801XXXXXXXXX",
```
This single value drives every "order via WhatsApp" click. Format: country code + number, digits only, no `+`, no spaces (e.g. `8801712345678`).

There are two more places with a placeholder WhatsApp link for direct chat buttons — search `index.html` for `wa.me/8801XXXXXXXXX` and replace both with the same number.

### 3. Products, photos & stock
These are no longer edited in code. Open `admin.html` on your live site, log in, and use **"+ Add Product"** to add items, edit prices/stock, or upload photos — changes appear on the storefront immediately. See `ADMIN-SETUP.md` for the one-time backend setup.

### 4. Delivery charges
`script.js` → `CONFIG`
```js
DELIVERY_CHARGE_DHAKA: 70,
DELIVERY_CHARGE_OUTSIDE: 130,
FREE_DELIVERY_THRESHOLD_DHAKA: 1500,  // set to 0 to disable free delivery
```

### 5. Logo
Put your logo file at `images/logo.png` (transparent PNG, roughly 120×40px works well). If the file is missing, the site falls back to showing just the text name — it won't break.

### 6. Product images
Uploaded directly from `admin.html` when you add or edit a product (drag & drop, or tap to choose). No file naming or folder management needed — they're hosted on Cloudinary automatically. Square images (1:1) look best in the grid.

Recommended: keep photos under 1-2MB each so they upload quickly on mobile data.

### 7. Hero and social preview images
- `images/hero.jpg` — the photo shown in the homepage hero.
- `images/og-cover.jpg` — the image shown when your link is shared on Facebook (recommended size 1200×630px). Set with the `og:image` tag near the top of `index.html`.

## How ordering works

1. Customer adds products to the cart (quantity is adjustable per product).
2. They tap **Proceed to checkout** and fill in name, mobile number, address, area/thana, delivery zone, and an optional note.
3. They review the full order (items, subtotal, delivery charge, total) before confirming.
4. On **Confirm order**, the site generates a unique Order ID (e.g. `GRIHOKONA-20260926-001`) and opens WhatsApp with a pre-filled message containing everything — the customer just taps send.
5. The cart is cleared automatically after handoff to WhatsApp.

Cart contents are saved in the browser's `localStorage`, so a customer's cart survives a page refresh (but is private to their own device/browser).

## Deploying to GitHub Pages

1. Create a new GitHub repository and upload `index.html`, `style.css`, `script.js`, and your `images/` folder to it (root of the repo).
2. Go to the repo's **Settings → Pages**.
3. Under "Build and deployment", set **Source** to "Deploy from a branch", pick the `main` branch and `/ (root)` folder, then save.
4. GitHub gives you a URL like `https://your-username.github.io/your-repo/` — that's your live store link to share on Facebook.
5. Update the `og:url` meta tag in `index.html` to match that exact link, so Facebook link previews point back correctly.

## Custom domain (optional)

To use your own domain (e.g. `grihokona.com`) instead of the default `github.io` link:
1. Buy the domain from any registrar (Namecheap, GoDaddy, etc.).
2. In your domain's DNS settings, add a `CNAME` record pointing to `your-username.github.io` (for a subdomain like `www`), or four `A` records pointing to GitHub's IPs (`185.199.108.153`, `.109.153`, `.110.153`, `.111.153`) for the root domain.
3. In your repo's **Settings → Pages**, enter your domain under "Custom domain" and save — GitHub creates a `CNAME` file in your repo automatically.
4. DNS changes can take a few hours to a day to fully apply.

## What's included

- Product search and category filters
- Wishlist (heart icon on each product, saved in the browser, with its own drawer)
- Product photo gallery with click-to-zoom viewer (add multiple `images` per product)
- "New" and discount badges, "Notify Me" WhatsApp button for out-of-stock items
- Customer testimonials section and an FAQ section
- Floating WhatsApp button on every page
- Facebook Pixel base code (see below) with PageView, AddToCart, AddToWishlist, InitiateCheckout and Purchase events wired in

### Facebook Pixel
Near the top of `index.html`'s `<head>`, replace both instances of `YOUR_PIXEL_ID` with your real Pixel ID from Facebook Events Manager. Until you do, the code loads harmlessly but doesn't track anything useful.

## Notes

- This is a front-end-only site: there's no order database. Every order arrives to you as a WhatsApp message — treat that as your order log, or copy details into a spreadsheet as they come in.
- Stock numbers are not automatically reduced after an order — update the stock value for that product in `admin.html` yourself as items sell out.
- Everything is plain HTML/CSS/JS, so any text editor (including GitHub's own web editor) is enough to make changes — no build step required.
