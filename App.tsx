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
import { CustomBattleScreen } from './src/screens/CustomBattleScreen';
import { LobbyScreen } from './src/screens/LobbyScreen';
import { GameScreen } from './src/screens/GameScreen'; 
import { ResultsScreen } from './src/screens/ResultsScreen';
import { MatchmakingScreen } from './src/screens/MatchmakingScreen';
import { BattleHistoryScreen } from './src/screens/BattleHistoryScreen'; 
import { RankingScreen } from './src/screens/RankingScreen';
import { AccountScreen } from './src/screens/AccountScreen'; // New Import
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
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const firestoreData = userSnap.data();
            const fullUserProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              rank: firestoreData.rank || 'Bronze',
              xp: firestoreData.xp || 0,
              stats: firestoreData.stats || { wins: 0, losses: 0, totalMatches: 0 },
              ...firestoreData, 
            } as UserProfile;
            
            setUser(fullUserProfile);
          } else {
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
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : !user.isProfileComplete ? (
          <Stack.Screen name="Linking" component={LinkingScreen} />
        ) : (
          <Stack.Group>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="CustomBattle" component={CustomBattleScreen} />
            <Stack.Screen name="Lobby" component={LobbyScreen} />
            <Stack.Screen name="Game" component={GameScreen} />
            <Stack.Screen name="Results" component={ResultsScreen} />
            <Stack.Screen name="Matchmaking" component={MatchmakingScreen} />
            <Stack.Screen name="BattleHistory" component={BattleHistoryScreen} />
            <Stack.Screen name="Ranking" component={RankingScreen} />
            <Stack.Screen name="Account" component={AccountScreen} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}