# Grihokona — Static E-commerce Site (WhatsApp Ordering)

A static, mobile-first storefront for a small Bangladesh-based business. No backend, no login — customers browse, add to cart, fill a checkout form, and the order is sent to your WhatsApp as a ready-to-read message.

## Files

```
index.html     structure of the site
style.css      all styling (colors, layout, responsiveness)
script.js      products, cart, checkout, WhatsApp message logic
images/        put your logo and product photos here
```

## What to edit, and where

All the settings you'll touch regularly are at the **top of `script.js`**, inside two blocks: `CONFIG` and `PRODUCTS`. You never need to touch `index.html` or `style.css` for routine updates.

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

### 3. Products
`script.js` → the `PRODUCTS` array. Copy an existing block to add a product, or delete one to remove it:
```js
{
  id: 9,                              // must be unique
  name: "Product Name",
  price: 1000,                        // current price
  oldPrice: 1200,                     // set to null if no discount
  image: "images/products/photo.jpg", // path to the image file
  category: "Kitchen",                // filter chips are generated from these
  description: "Short one-line description.",
  stock: 10,                          // 0 shows "Sold out" and hides buy buttons
  featured: true
}
```
Categories (the filter chips at the top of the shop section) are generated automatically from whatever categories your products use — you don't edit them separately.

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
Put photos in `images/products/` and list them in each product's `images` array — the first one is the main card photo, and any extra ones let customers browse a gallery and zoom in. One photo is fine too:
```js
images: ["images/products/my-item-1.jpg", "images/products/my-item-2.jpg"]
```
Square images (1:1) look best in the grid. If an image is missing or fails to load, the card still renders cleanly without a broken-image icon.

Recommended: compress photos before uploading (aim under 150–200 KB each) so the site stays fast on slower mobile connections.

### 7. Hero and social preview images
- `images/hero.jpg` — the photo shown in the homepage hero.
- `images/og-cover.jpg` — the image shown when your link is shared on Facebook (recommended size 1200×630px). Set with the `og:image` tag near the top of `index.html`.

## How ordering works

1. Customer adds products to the cart (quantity is adjustable per product).
2. They tap **Proceed to checkout** and fill in name, mobile number, address, area/thana, delivery zone, and an optional note.
3. They review the full order (items, subtotal, delivery charge, total) before confirming.
4. On **Confirm order**, the site generates a unique Order ID (e.g. `NOORJA-20260926-001`) and opens WhatsApp with a pre-filled message containing everything — the customer just taps send.
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
- Stock numbers are not automatically reduced after an order — update the `stock` value in `PRODUCTS` yourself as items sell out.
- Everything is plain HTML/CSS/JS, so any text editor (including GitHub's own web editor) is enough to make changes — no build step required.
