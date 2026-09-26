/* =========================================================
   FIREBASE CONFIG
   Replace every value below with your own project's config,
   copied from Firebase Console → Project settings → General
   → "Your apps" → SDK setup and configuration.
   This same file is used by both index.html and admin.html.
   ========================================================= */
const firebaseConfig = {
  apiKey: "AIzaSyAXIvwqNbARpxeQMv_Yh2WLovsbK-0CehU",
  authDomain: "grihokona.firebaseapp.com",
  projectId: "grihokona",
  storageBucket: "grihokona.firebasestorage.app",
  messagingSenderId: "402885589447",
  appId: "1:402885589447:web:b49e83a2c6be145f5c41e2"
};

// Cloudinary — used only for image uploads from the admin panel.
// From cloudinary.com dashboard + Settings → Upload → Upload presets.
const CLOUDINARY_CLOUD_NAME = "cbqaeley";
const CLOUDINARY_UPLOAD_PRESET = "grihokona_products";

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
