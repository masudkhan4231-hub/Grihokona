/* =========================================================
   GRIHOKONA — Admin panel logic
   Requires firebase-config.js to be loaded first (defines
   `db`, `auth`, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET).
   ========================================================= */

let allProducts = [];
let editingId = null;          // null = adding a new product
let existingImages = [];       // image URLs already saved (edit mode)
let pendingFiles = [];         // new File objects picked, not yet uploaded

/* ---------- Auth ---------- */
auth.onAuthStateChanged((user) => {
  document.getElementById("loginScreen").hidden = !!user;
  document.getElementById("dashboard").hidden = !user;
  if (user) {
    subscribeToProducts();
    loadBranding();
  }
});

document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(e.target);
  const errorEl = document.getElementById("loginError");
  errorEl.hidden = true;

  auth.signInWithEmailAndPassword(data.get("email"), data.get("password"))
    .catch((err) => {
      errorEl.textContent = friendlyAuthError(err);
      errorEl.hidden = false;
    });
});

document.getElementById("logoutBtn").addEventListener("click", () => auth.signOut());

function friendlyAuthError(err) {
