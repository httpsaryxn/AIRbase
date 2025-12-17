import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { BlurView } from 'expo-blur';
import { 
  useFonts, 
  VT323_400Regular 
} from '@expo-google-fonts/vt323';
import { useUserStore } from '../store/userStore';
import { handleUserLogin } from '../services/authService';
import { signInWithPopup, signInWithCredential, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

const { width } = Dimensions.get('window');

const VIDEO_SOURCE = require('../assets/background.mp4');

// Complete the auth session for web browser
WebBrowser.maybeCompleteAuthSession(); 

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Load Pixel Font
  let [fontsLoaded] = useFonts({
    VT323_400Regular,
  });

  // Google OAuth configuration
  // IMPORTANT: You need to get these client IDs from Firebase Console
  // Step 1: Go to Firebase Console > Authentication > Sign-in method > Google
  // Step 2: Copy the client IDs for each platform:
  //   - Web client ID (for web)
  //   - iOS client ID (for iOS) - found in the iOS SDK configuration section
  //   - Android client ID (for Android) - found in the Android SDK configuration section
  const webClientId = '518778819608-hnjgash43mlvn38k0ji7n3cbpgt9ul9b.apps.googleusercontent.com';
  const iosClientId = '518778819608-uji91aamgfbdqe3sdh2u9ks2f18gkbvm.apps.googleusercontent.com'; // Replace with your iOS client ID
  const androidClientId = '518778819608-2avcf1nmtl7rpm3e0bm23kbkif3mbou5.apps.googleusercontent.com'; // Replace with your Android client ID
  
  // Use Expo's Google ID token provider hook
  // This returns an ID token which is what Firebase needs
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: webClientId,
    iosClientId: iosClientId,
    androidClientId: androidClientId,
  });

  const player = useVideoPlayer(VIDEO_SOURCE, player => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  const onSignIn = async () => {
    if (!email || !password) return alert("Please enter credentials");
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await handleUserLogin(result.user);
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        alert("No account found. Please sign up first.");
      } else if (err.code === "auth/wrong-password") {
        alert("Incorrect password or user does not exist.");
      } else {
        alert(err.message || "Failed to sign in");
      }
    }
    setLoading(false);
  };
  
  const onSignUp = async () => {
    if (!email || !password) return alert("Please enter credentials");
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await handleUserLogin(result.user);
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        alert("Account already exists. Please sign in.");
      } else {
        alert(err.message || "Failed to sign up");
      }
    }
    setLoading(false);
  };

  // Handle Google OAuth response
  React.useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleAuthResponse(response);
    } else if (response?.type === 'error') {
      console.error('Google Auth Error:', response.error);
      setLoading(false);
      alert('Google sign-in failed: ' + (response.error?.message || 'Unknown error'));
    }
  }, [response]);

  const handleGoogleAuthResponse = async (authResponse: AuthSession.AuthSessionResult) => {
    try {
      setLoading(true);
      
      if (authResponse.type === 'success') {
        // Get the ID token from the response
        // For useIdTokenAuthRequest, the ID token is in response.params.id_token
        const idToken = authResponse.params.id_token;
        
        console.log('Google Auth Response:', authResponse.type);
        console.log('Response params:', authResponse.params);
        
        if (idToken) {
          // Create a credential from the ID token
          const credential = GoogleAuthProvider.credential(idToken);
          
          // Sign in to Firebase with the credential
          const firebaseResult = await signInWithCredential(auth, credential);
          await handleUserLogin(firebaseResult.user);
        } else {
          // If no id_token, check if we got an access_token (fallback)
          const accessToken = authResponse.params.access_token;
          if (accessToken) {
            // For access token, we'd need to exchange it, but Firebase needs ID token
            throw new Error('Received access token instead of ID token. Please use useIdTokenAuthRequest.');
          } else {
            throw new Error('No ID token received from Google. Response params: ' + JSON.stringify(authResponse.params));
          }
        }
      }
      
      setLoading(false);
    } catch (error: any) {
      console.error('Google Auth Response Error:', error);
      setLoading(false);
      alert(error.message || 'Failed to process Google sign-in');
    }
  };

  const onGoogleSignIn = async () => {
    try {
      setLoading(true);
      
      // For web, use signInWithPopup
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        await handleUserLogin(result.user);
        setLoading(false);
        return;
      }
      
      // For React Native, use Expo's Google provider
      if (!request) {
        alert('Google authentication is not ready yet. Please try again.');
        setLoading(false);
        return;
      }
      
      // Prompt for authentication
      await promptAsync();
      // The response will be handled by the useEffect hook above
      
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      setLoading(false);
      alert(error.message || 'Failed to sign in with Google. Please check the setup instructions.');
    }
  };

  if (!fontsLoaded) {
    return <View style={{flex:1, backgroundColor:'#000'}} />;
  }

  return (
    <View style={styles.container}>
      {/* 1. Background Video */}
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        contentFit="cover"
        nativeControls={false}
      />
      

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardContainer}
        >
          
          {/* TOP SECTION: LOGO */}
          <View style={styles.headerContainer}>
            <Text style={styles.pixelTitle}>AIRbase</Text>
            <Text style={styles.subtitle}>The Battle Royale of JEE</Text>
          </View>

          {/* BOTTOM SECTION: FORM CARD - Glassmorphism */}
          <BlurView intensity={20} tint="dark" style={styles.glassCard}>
            <View style={styles.cardContent}>
              {/* Email Input */}
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                cursorColor="#FFFFFF"
              />

              {/* Password Input */}
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                cursorColor="#FFFFFF"
              />

              {/* Buttons Row - Sign In and Sign Up */}
              <View style={styles.buttonRow}>
                
                {/* Sign Up (Primary/Teal) */}
                <TouchableOpacity 
                  style={[styles.button, styles.signUpBtn]}
                  onPress={onSignUp}
                  activeOpacity={0.8}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.signUpText}>Sign Up</Text>
                  )}
                </TouchableOpacity>

                {/* Sign In (Secondary/Outline) */}
                <TouchableOpacity 
                  style={[styles.button, styles.signInBtn]}
                  onPress={onSignIn}
                  activeOpacity={0.8}
                  disabled={loading}
                >
                  <Text style={styles.signInText}>Sign In</Text>
                </TouchableOpacity>

              </View>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Sign In Button */}
              <TouchableOpacity 
                style={styles.googleButton}
                onPress={onGoogleSignIn}
                activeOpacity={0.8}
                disabled={loading || !request}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.googleButtonContent}>
                    <Text style={styles.googleIcon}>G</Text>
                    <Text style={styles.googleButtonText}>Sign in with Google</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'space-between', // Pushes Header up, Card down
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    marginTop: 60,
    alignItems: 'center',
  },
  pixelTitle: {
    fontFamily: 'VT323_400Regular',
    fontSize: 64,
    color: '#FFFFFF',
    marginBottom: -10, // Tighten gap between logo and subtitle
    letterSpacing: 2,
  },
  subtitle: {
    color: '#D1D5DB',
    fontSize: 18,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  glassCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: '100%',
    overflow: 'hidden',
  },
  cardContent: {
    padding: 24,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    color: '#FFF',
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 16,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpBtn: {
    backgroundColor: '#14F195', // The Teal/Green color from screenshot
  },
  signUpText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  signInBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  signInText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
    marginRight: 12,
  },
  googleButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    color: 'rgba(255, 255, 255, 0.5)',
    paddingHorizontal: 12,
    fontSize: 14,
  },
});