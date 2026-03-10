// === firebaseConfig.js ===
// (Не е задължителен за тази версия; оставен както беше при теб)

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCIJxMEV1kR9uj5E8si9Pk2ZEiNb0WdNfI",
  authDomain: "knijarnica-kiril-i-metodii.firebaseapp.com",
  projectId: "knijarnica-kiril-i-metodii",
  storageBucket: "knijarnica-kiril-i-metodii.firebasestorage.app",
  messagingSenderId: "87227867193",
  appId: "1:87227867193:web:65c3588fb1204234aa6de8",
  measurementId: "G-FNT8M69C9F"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
