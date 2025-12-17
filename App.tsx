import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

// Import our screens
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { useUserStore } from './src/store/userStore';

const Stack = createNativeStackNavigator();

export default function App() {
  const user = useUserStore((state) => state.user);
  const isLoading = useUserStore((state) => state.isLoading);
  const setLoading = useUserStore((state) => state.setLoading);

  useEffect(() => {
    // Simulate checking for an existing session
    // In a real app, firebase.auth().onAuthStateChanged goes here
    const checkSession = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(checkSession);
  }, []);

  // Show a loading spinner while checking auth state
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#05050A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6C5DD3" />
      </View>
    ); 
  }

  return (
    <NavigationContainer>
      {/* Light status bar for dark background */}
      <StatusBar style="light" />
      
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // If user is logged in, show Home Stack
          <Stack.Screen name="Home" component={HomeScreen} />
        ) : (
          // If no user, show Auth Stack
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}