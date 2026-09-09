import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyA9GXLE8KskhQhgTb3huYzNMhEY-CywH-k",
  authDomain: "devoranaturals-72e77.firebaseapp.com",
  projectId: "devoranaturals-72e77",
  storageBucket: "devoranaturals-72e77.firebasestorage.app",
  messagingSenderId: "395961442761",
  appId: "1:395961442761:web:c67d6fd3db0f7954b90818"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };