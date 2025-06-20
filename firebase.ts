// Corrected Firebase v9 modular imports
import { initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import type { Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";
import type { Analytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCQvRqH-sp-WQ1aYuQcRAqWZ9iPsuS79eY",
  authDomain: "ezlitepay-f07a1.firebaseapp.com",
  projectId: "ezlitepay-f07a1",
  storageBucket: "ezlitepay-f07a1.appspot.com",
  messagingSenderId: "853054099995",
  appId: "1:853054099995:web:1bdbe95e8d1f116eca5ebe",
  measurementId: "G-QCD06CB5FH"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let analytics: Analytics;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  analytics = getAnalytics(app);
  console.log("Firebase (v9 modular) initialized successfully.");
  console.log(`Firebase services initialized for project: ${app.options.projectId}`);
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error("Error initializing Firebase (v9 modular):", errorMessage);
  alert(`Firebase initialization failed: ${errorMessage}. Please check the console and ensure your Firebase project ('${firebaseConfig.projectId}') is correctly set up, active, and billing is enabled if necessary.`);
  throw new Error(`Firebase (v9 modular) initialization failed: ${errorMessage}.`);
}

export { app, auth, db, storage, analytics }; // Exporting analytics in case it's needed elsewhere.