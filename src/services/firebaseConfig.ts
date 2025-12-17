import { initializeApp } from "firebase/app";
// @ts-expect-error - getReactNativePersistence exists at runtime but TypeScript types don't include it
import { initializeAuth, getAuth, getReactNativePersistence, Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// 1. Setup Config
const firebaseConfig = {
    apiKey: "AIzaSyB8Veswk__mbz2QHsbxXWpHscRvCPHwlDM",
    authDomain: "airbase-5a905.firebaseapp.com",
    projectId: "airbase-5a905",
    storageBucket: "airbase-5a905.firebasestorage.app",
    messagingSenderId: "518778819608",
    appId: "1:518778819608:web:bd2cf72b99ef23934e9f6d"
};

// 2. Initialize App
const app = initializeApp(firebaseConfig);

// 3. Initialize Auth with Persistence (FIXES THE WARNING)
// We check if auth is already initialized to prevent hot-reload errors
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
} catch (e) {
  // If already initialized, just get the instance
  auth = getAuth(app);
}

// 4. Initialize Firestore
const db = getFirestore(app);

export { auth, db };




