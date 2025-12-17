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
import { useFonts, PixelifySans_400Regular } from '@expo-google-fonts/pixelify-sans';
import { LinearGradient } from 'expo-linear-gradient'; 
import { useUserStore } from '../store/userStore';
import { handleUserLogin } from '../services/authService';
import { signInWithPopup, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { makeRedirectUri } from 'expo-auth-session';

const { width, height } = Dimensions.get('window');

// MODIFIED: Increased to 80% so the video/gradient reaches behind the login card
const VIDEO_HEIGHT = height * 0.8; 

const VIDEO_SOURCE = require('../assets/background.mp4');

WebBrowser.maybeCompleteAuthSession(); 

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  let [fontsLoaded] = useFonts({
    PixelifySans_400Regular,
  });

  const webClientId = '518778819608-hnjgash43mlvn38k0ji7n3cbpgt9ul9b.apps.googleusercontent.com';
  const iosClientId = '518778819608-uji91aamgfbdqe3sdh2u9ks2f18gkbvm.apps.googleusercontent.com';
  const androidClientId = '518778819608-2avcf1nmtl7rpm3e0bm23kbkif3mbou5.apps.googleusercontent.com';
  
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId,
    iosClientId,
    androidClientId,
    redirectUri: makeRedirectUri({
      scheme: 'com.airbase.airbase'
    }),
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
        alert(err.message || "Failed to sign in");
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
        alert(err.message || "Failed to sign up");
    }
    setLoading(false);
  };

  const onGoogleSignIn = async () => {
     try {
      setLoading(true);
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        await handleUserLogin(result.user);
        setLoading(false);
        return;
      }
      if (!request) {
        alert('Google authentication is not ready yet.');
        setLoading(false);
        return;
      }
      await promptAsync();
    } catch (error: any) {
      setLoading(false);
      alert(error.message);
    }
  };

  React.useEffect(() => {
    if (response?.type === 'success') {
      // handleGoogleAuthResponse(response); 
    }
  }, [response]);


  if (!fontsLoaded) {
    return <View style={{flex:1, backgroundColor:'#000'}} />;
  }

  return (
    <View style={styles.container}>
      
      <View style={styles.videoContainer}>
        <VideoView
          style={styles.video}
          player={player}
          contentFit="cover"
          nativeControls={false}
        />
        
        <LinearGradient
            colors={['transparent', '#000000']}
            style={styles.gradientFade}
            locations={[0, 1]} 
        />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardContainer}
        >
          
          <View style={styles.headerContainer}>
            <Text style={styles.pixelTitle}>AIRbase</Text>
            <Text style={styles.subtitle}>The Battle Royale of JEE</Text>
          </View>

          <BlurView intensity={20} tint="dark" style={styles.glassCard}>
            <View style={styles.cardContent}>
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

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                cursorColor="#FFFFFF"
              />

              <View style={styles.buttonRow}>
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

                <TouchableOpacity 
                  style={[styles.button, styles.signInBtn]}
                  onPress={onSignIn}
                  activeOpacity={0.8}
                  disabled={loading}
                >
                  <Text style={styles.signInText}>Sign In</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

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
  videoContainer: {
    position: 'absolute',
    top: -10,
    left: 0,
    right: 0,
    height: VIDEO_HEIGHT, 
    width: width,
    zIndex: 0,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  gradientFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // MODIFIED: Increased to 400 for a much smoother/longer fade
    height: 100, 
    zIndex: 1,
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'space-between', 
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  pixelTitle: {
    fontFamily: 'PixelifySans_400Regular',
    fontSize: 64,
    color: '#FFFFFF',
    marginBottom: -10, 
    letterSpacing: 2,
    // MODIFIED: Removed textShadow properties (glow effect removed)
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
    backgroundColor: '#14F195', 
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