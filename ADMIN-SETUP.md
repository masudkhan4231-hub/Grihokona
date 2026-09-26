# Setting up the Admin Panel (Firebase + Cloudinary)

The admin panel (`admin.html`) lets you add/edit/delete products, upload photos, and update stock — all from your phone, with changes appearing on the live site instantly. It runs on two free services:

- **Firebase** (Google) — stores your product data and handles admin login. Free, no card required.
- **Cloudinary** — stores and serves your product photos. Free up to 25GB, no card required.

You only need to do this setup once. It takes about 15–20 minutes.

---

## Part 1 — Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and sign in with any Google account.
2. Click **"Add project"**, name it `Grihokona` (or anything), and create it. You can skip/disable Google Analytics — not needed.
3. Once the project opens, click the **`</>`** (web) icon to register a web app. Give it any nickname and click **"Register app"**.
4. Firebase shows a code block with a `firebaseConfig` object like:
   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "grihokona-xxxx.firebaseapp.com",
     projectId: "grihokona-xxxx",
     storageBucket: "grihokona-xxxx.appspot.com",
     messagingSenderId: "...",
     appId: "..."
   };
   ```
   Copy these values into `firebase-config.js` in this project, replacing the placeholder `firebaseConfig` object.

## Part 2 — Turn on login (Authentication)

1. In the left sidebar, go to **Build → Authentication → Get started**.
2. Under "Sign-in method", enable **Email/Password** and save.
3. Go to the **Users** tab → **Add user**. Enter the email and password *you* want to log into the admin panel with (this is your own login, not a customer's).
4. That's it — this is the only account that can access `admin.html`.

## Part 3 — Turn on the database (Firestore)

1. In the sidebar, go to **Build → Firestore Database → Create database**.
2. Pick a location close to Bangladesh (e.g. `asia-south1` or `asia-southeast1`) and click Next.
3. Choose **"Start in production mode"**, then Create.
4. Go to the **Rules** tab and replace the contents with:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /products/{productId} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```
5. Click **Publish**.

This means: anyone can *view* products (needed for your storefront to work), but only a signed-in admin (you) can *add, edit, or delete* them.

## Part 4 — Cloudinary (for photos)

1. Go to [cloudinary.com](https://cloudinary.com) and sign up for a free account (no card needed).
2. On your Dashboard, copy the **Cloud name** shown near the top. Paste it into `firebase-config.js` as `CLOUDINARY_CLOUD_NAME`.
3. Go to **Settings** (gear icon) → **Upload** tab → scroll to **"Upload presets"** → click **"Add upload preset"**.
4. Set **Signing Mode** to **Unsigned**, then Save.
5. Copy the preset's name and paste it into `firebase-config.js` as `CLOUDINARY_UPLOAD_PRESET`.

## Part 5 — Upload everything to GitHub

Upload all of these files to your repo (same "Add file → Upload files" method as before):
```
index.html
style.css
script.js
admin.html
admin.css
admin.js
firebase-config.js   ← now filled in with your real values
images/
```

## Part 6 — Start adding products

1. Visit `your-live-site-link/admin.html` (e.g. `https://masudkhan4231-hub.github.io/Grihokona/admin.html`).
2. Log in with the email/password you created in Part 2.
3. Click **"+ Add Product"**, fill in the details, drag in photos, and save.
4. Refresh your main site — the product appears immediately.

---

## Notes

- **Keep the admin link private.** It isn't linked from the storefront's menu, so customers won't stumble onto it — but treat the link and password like any other login.
- Deleting a product removes it from the catalog but doesn't delete its photos from Cloudinary (a Cloudinary account cleanup isn't necessary for normal use — the free tier has plenty of room).
- Orders still arrive via WhatsApp exactly as before — the admin panel manages your **catalog** (products, photos, stock), not order history.
- If products don't show up after adding, double-check `firebase-config.js` has your real values (not the placeholders) on the version uploaded to GitHub.
