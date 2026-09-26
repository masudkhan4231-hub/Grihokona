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
  if (user) subscribeToProducts();
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
  if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
    return "Wrong email or password.";
  }
  return "Couldn't sign in. Please try again.";
}

/* ---------- Live product list ---------- */
function subscribeToProducts() {
  db.collection("products").orderBy("createdAt", "desc").onSnapshot(
    (snapshot) => {
      allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderTable();
    },
    (err) => {
      document.getElementById("productTableBody").innerHTML =
        `<tr><td colspan="6" class="admin-empty">Couldn't load products: ${escapeHtml(err.message)}</td></tr>`;
    }
  );
}

function renderTable() {
  const q = (document.getElementById("adminSearch").value || "").trim().toLowerCase();
  const list = q
    ? allProducts.filter(p => (p.name || "").toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q))
    : allProducts;

  const body = document.getElementById("productTableBody");

  if (allProducts.length === 0) {
    body.innerHTML = `<tr><td colspan="6" class="admin-empty">No products yet — click "+ Add Product" to create your first one.</td></tr>`;
    return;
  }
  if (list.length === 0) {
    body.innerHTML = `<tr><td colspan="6" class="admin-empty">No products match your search.</td></tr>`;
    return;
  }

  body.innerHTML = list.map(p => {
    const stock = Number(p.stock) || 0;
    const stockClass = stock <= 0 ? "admin-stock-out" : (stock <= 5 ? "admin-stock-low" : "");
    const thumb = (p.images && p.images[0]) || "";
    return `
      <tr data-id="${p.id}">
        <td><img class="admin-thumb" src="${thumb}" alt="" onerror="this.style.background='var(--primary-tint)'; this.removeAttribute('src');"></td>
        <td>${escapeHtml(p.name || "")}</td>
        <td>${escapeHtml(p.category || "")}</td>
        <td>৳${Number(p.price || 0).toLocaleString("en-US")}</td>
        <td class="${stockClass}">${stock}</td>
        <td class="admin-row-actions">
          <button class="admin-link-btn edit-btn" type="button">Edit</button>
          <button class="admin-link-btn danger delete-btn" type="button">Delete</button>
        </td>
      </tr>
    `;
  }).join("");

  body.querySelectorAll("tr").forEach(row => {
    const id = row.dataset.id;
    row.querySelector(".edit-btn").addEventListener("click", () => openProductModal(id));
    row.querySelector(".delete-btn").addEventListener("click", () => deleteProduct(id));
  });
}

document.getElementById("adminSearch").addEventListener("input", renderTable);

/* ---------- Product modal ---------- */
function openProductModal(id) {
  editingId = id || null;
  pendingFiles = [];
  const form = document.getElementById("productForm");
  form.reset();
  document.getElementById("productFormError").hidden = true;

  if (id) {
    const p = allProducts.find(x => x.id === id);
    document.getElementById("productModalTitle").textContent = "Edit product";
    form.name.value = p.name || "";
    form.price.value = p.price || "";
    form.oldPrice.value = p.oldPrice || "";
    form.category.value = p.category || "";
    form.stock.value = p.stock != null ? p.stock : "";
    form.description.value = p.description || "";
    form.isNew.checked = !!p.isNew;
    existingImages = (p.images || []).slice();
  } else {
    document.getElementById("productModalTitle").textContent = "Add product";
    existingImages = [];
  }

  renderImagePreviews();
  document.getElementById("productModal").classList.add("active");
  document.getElementById("productModal").setAttribute("aria-hidden", "false");
}

function closeProductModal() {
  document.getElementById("productModal").classList.remove("active");
  document.getElementById("productModal").setAttribute("aria-hidden", "true");
}

document.getElementById("addProductBtn").addEventListener("click", () => openProductModal(null));
document.getElementById("closeProductModalBtn").addEventListener("click", closeProductModal);
document.getElementById("cancelProductBtn").addEventListener("click", closeProductModal);
document.getElementById("productModal").addEventListener("click", (e) => {
  if (e.target.id === "productModal") closeProductModal();
});

/* ---------- Image picking (existing + new pending) ---------- */
function renderImagePreviews() {
  const row = document.getElementById("imagePreviewRow");
  const existingHtml = existingImages.map((url, i) => `
    <div class="image-preview" data-kind="existing" data-index="${i}">
      <img src="${url}" alt="">
      <button type="button" aria-label="Remove image">✕</button>
    </div>
  `).join("");
  const pendingHtml = pendingFiles.map((file, i) => `
    <div class="image-preview" data-kind="pending" data-index="${i}">
      <img src="${URL.createObjectURL(file)}" alt="">
      <button type="button" aria-label="Remove image">✕</button>
    </div>
  `).join("");

  row.innerHTML = existingHtml + pendingHtml;

  row.querySelectorAll(".image-preview button").forEach(btn => {
    btn.addEventListener("click", () => {
      const el = btn.closest(".image-preview");
      const kind = el.dataset.kind;
      const index = Number(el.dataset.index);
      if (kind === "existing") {
        existingImages.splice(index, 1);
      } else {
        pendingFiles.splice(index, 1);
      }
      renderImagePreviews();
    });
  });
}

const imageDrop = document.getElementById("imageDrop");
const imageInput = document.getElementById("imageInput");

imageDrop.addEventListener("click", () => imageInput.click());
imageInput.addEventListener("change", (e) => {
  addPendingFiles(Array.from(e.target.files));
  imageInput.value = "";
});

["dragover", "dragenter"].forEach(evt => {
  imageDrop.addEventListener(evt, (e) => { e.preventDefault(); imageDrop.classList.add("dragover"); });
});
["dragleave", "drop"].forEach(evt => {
  imageDrop.addEventListener(evt, (e) => { e.preventDefault(); imageDrop.classList.remove("dragover"); });
});
imageDrop.addEventListener("drop", (e) => {
  const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith("image/"));
  addPendingFiles(files);
});

function addPendingFiles(files) {
  pendingFiles = pendingFiles.concat(files);
  renderImagePreviews();
}

/* ---------- Cloudinary upload ---------- */
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) throw new Error("Image upload failed");
  const data = await res.json();
  return data.secure_url;
}

/* ---------- Save (add / edit) ---------- */
document.getElementById("productForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const errorEl = document.getElementById("productFormError");
  const saveBtn = document.getElementById("saveProductBtn");
  errorEl.hidden = true;

  const data = new FormData(form);
  const totalImages = existingImages.length + pendingFiles.length;
  if (totalImages === 0) {
    errorEl.textContent = "Please add at least one product photo.";
    errorEl.hidden = false;
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = pendingFiles.length ? "Uploading photos…" : "Saving…";

  try {
    const uploadedUrls = [];
    for (const file of pendingFiles) {
      const url = await uploadToCloudinary(file);
      uploadedUrls.push(url);
    }

    const payload = {
      name: data.get("name").trim(),
      price: Number(data.get("price")),
      oldPrice: data.get("oldPrice") ? Number(data.get("oldPrice")) : null,
      category: data.get("category").trim(),
      stock: Number(data.get("stock")),
      description: data.get("description").trim(),
      isNew: form.isNew.checked,
      images: existingImages.concat(uploadedUrls)
    };

    if (editingId) {
      await db.collection("products").doc(editingId).update(payload);
      showAdminToast("Product updated");
    } else {
      payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection("products").add(payload);
      showAdminToast("Product added");
    }

    closeProductModal();
  } catch (err) {
    errorEl.textContent = "Something went wrong: " + err.message;
    errorEl.hidden = false;
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save product";
  }
});

/* ---------- Delete ---------- */
function deleteProduct(id) {
  const p = allProducts.find(x => x.id === id);
  if (!confirm(`Delete "${p ? p.name : "this product"}"? This can't be undone.`)) return;

  db.collection("products").doc(id).delete()
    .then(() => showAdminToast("Product deleted"))
    .catch((err) => alert("Couldn't delete: " + err.message));
}

/* ---------- Helpers ---------- */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}

function showAdminToast(message) {
  const toast = document.getElementById("adminToast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showAdminToast._t);
  showAdminToast._t = setTimeout(() => toast.classList.remove("show"), 2200);
}
