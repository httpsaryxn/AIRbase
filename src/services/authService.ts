import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "./firebaseConfig";
import { useUserStore } from "../store/userStore";

export const handleUserLogin = async (firebaseUser: any) => {
  const userRef = doc(db, "users", firebaseUser.uid);
  const userSnap = await getDoc(userRef);

  let userData;

  if (userSnap.exists()) {
    // User exists, load data
    userData = userSnap.data();
  } else {
    // New User: Create default profile
    userData = {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName || "Unknown Warrior",
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL,
      rank: "Bronze",
      xp: 0,
      stats: { wins: 0, losses: 0, totalMatches: 0 },
      createdAt: new Date().toISOString(),
    };
    await setDoc(userRef, userData);
  }

  // Update Zustand Store
  useUserStore.getState().setUser(userData as any);
};