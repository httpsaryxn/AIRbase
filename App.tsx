import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './src/services/firebaseConfig';

// Import screens
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LinkingScreen } from './src/screens/LinkingScreen';
import { useUserStore, UserProfile } from './src/store/userStore';

const Stack = createNativeStackNavigator();

export default function App() {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const [initializing, setInitializing] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch additional user data from Firestore
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const firestoreData = userSnap.data();
            // Merge auth user with firestore data
            const fullUserProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              // Default values if missing
              rank: firestoreData.rank || 'Bronze',
              xp: firestoreData.xp || 0,
              stats: firestoreData.stats || { wins: 0, losses: 0, totalMatches: 0 },
              // Extended fields
              ...firestoreData, 
            } as UserProfile;
            
            setUser(fullUserProfile);
          } else {
            // New user, minimal profile
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              rank: 'Bronze',
              xp: 0,
              stats: { wins: 0, losses: 0, totalMatches: 0 },
              isProfileComplete: false,
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUser(null);
      }
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: '#05050A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6C5DD3" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // 1. Not logged in -> Login Screen
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : !user.isProfileComplete ? (
          // 2. Logged in but profile incomplete -> Linking Screen
          <Stack.Screen name="Linking" component={LinkingScreen} />
        ) : (
          // 3. Logged in and complete -> Home Screen
          <Stack.Screen name="Home" component={HomeScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}