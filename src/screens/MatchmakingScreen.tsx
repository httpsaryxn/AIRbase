import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  Animated, 
  TouchableOpacity, 
  Image,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useFonts, Exo_700Bold, Exo_900Black, Exo_400Regular } from '@expo-google-fonts/exo';
import { useUserStore } from '../store/userStore';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  limit, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  getDoc 
} from 'firebase/firestore';

const { width, height } = Dimensions.get('window');
const db = getFirestore();

// Avatar Assets Mapping
const AVATARS: { [key: string]: any } = {
  'yellow': require('../assets/yellow.png'),
  'mint': require('../assets/mint.png'),
  'lavender': require('../assets/lavender.png'),
  'orange': require('../assets/orange.png'),
  'default': require('../assets/mint.png')
};

export const MatchmakingScreen = ({ navigation }: { navigation: any }) => {
  const user = useUserStore((state) => state.user);
  
  // UI States
  const [matchFound, setMatchFound] = useState(false);
  const [opponent, setOpponent] = useState<{name: string, avatar: string} | null>(null);
  const [countdown, setCountdown] = useState<number | string | null>(null);
  const [statusText, setStatusText] = useState('SCANNING FOR OPPONENTS...');
  
  // Data State for Navigation
  const [pendingGameData, setPendingGameData] = useState<{roomId: string, roomData: any} | null>(null);

  // Animation Values
  const pulseAnim = useRef(new Animated.Value(1)).current;     // Searching Pulse
  const leftSlide = useRef(new Animated.Value(-width)).current; // User Slide
  const rightSlide = useRef(new Animated.Value(width)).current; // Opponent Slide
  const vsScale = useRef(new Animated.Value(0)).current;        // VS Badge
  const countScale = useRef(new Animated.Value(0.5)).current;   // Countdown Pulse
  const countOpacity = useRef(new Animated.Value(0)).current;

  let [fontsLoaded] = useFonts({
    Exo_700Bold,
    Exo_900Black,
    Exo_400Regular,
  });

  // 1. Searching Pulse Animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // 2. Matchmaking Logic
  useEffect(() => {
    if (!user) return;
    
    let matchmakingDocId: string | null = null;
    let unsubMatch: (() => void) | null = null;

    const startMatchmaking = async () => {
      try {
        // A. Check for waiting players
        const q = query(
          collection(db, 'matchmakingQueue'), 
          where('status', '==', 'waiting'),
          where('subject', '==', 'physics'), // Default subject
          limit(1)
        );
        
        const snapshot = await getDocs(q);
        const validOpponent = snapshot.docs.find(d => d.data().userId !== user.uid);

        if (validOpponent) {
          // --- FOUND SOMEONE (WE ARE THE HOST) ---
          setStatusText('OPPONENT DETECTED. INITIATING LINK...');
          
          const opponentData = validOpponent.data();
          
          // Verify they are still waiting (simple check)
          if (opponentData.status !== 'waiting') {
             // Race condition: Retry or create own (fallthrough to create)
          } else {
             // 1. Create Room
             const { roomId, roomData } = await createQuickMatchRoom(user, opponentData);
             
             // 2. Notify Opponent
             await updateDoc(doc(db, 'matchmakingQueue', validOpponent.id), {
                 status: 'matched',
                 matchedWith: user.uid,
                 roomId: roomId
             });

             // 3. Setup Local State for VS Screen
             setOpponent({
                 name: opponentData.displayName || 'Opponent',
                 avatar: opponentData.selectedCharacter || 'default'
             });
             setPendingGameData({ roomId, roomData });
             
             // 4. Trigger Animation
             triggerMatchFound();
             return;
          }
        } 
        
        // --- NO ONE FOUND, WAITING IN QUEUE ---
        const myEntry = await addDoc(collection(db, 'matchmakingQueue'), {
            userId: user.uid,
            displayName: user.displayName,
            selectedCharacter: (user as any).selectedCharacter || 'mint',
            status: 'waiting',
            subject: 'physics',
            createdAt: serverTimestamp()
        });
        matchmakingDocId = myEntry.id;

        // Listen for updates
        unsubMatch = onSnapshot(doc(db, 'matchmakingQueue', myEntry.id), async (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.status === 'matched' && data.roomId) {
                    setStatusText('MATCH CONFIRMED. DOWNLOADING DATA...');
                    
                    // Fetch Room to get Opponent Details
                    const roomSnap = await getDoc(doc(db, 'battleRooms', data.roomId));
                    if (roomSnap.exists()) {
                        const rData = roomSnap.data();
                        const opp = rData.players.find((p: any) => p.userId !== user.uid);
                        
                        setOpponent({
                            name: opp.displayName || 'Opponent',
                            avatar: opp.selectedCharacter || 'default'
                        });
                        setPendingGameData({ roomId: data.roomId, roomData: rData });
                        triggerMatchFound();
                    }
                }
            }
        });

      } catch (error) {
          console.error("Matchmaking error", error);
          Alert.alert("Error", "Connection lost.");
          navigation.goBack();
      }
    };

    startMatchmaking();

    return () => {
        if (unsubMatch) unsubMatch();
        // Only delete if we are strictly canceling, not if we found a match
        if (matchmakingDocId && !matchFound) {
            deleteDoc(doc(db, 'matchmakingQueue', matchmakingDocId)).catch(err => console.log("Cleanup err", err));
        }
    };
  }, []);

  // 3. Helper: Create Room
  const createQuickMatchRoom = async (currentUser: any, opponentData: any) => {
       const questions = await fetchRandomQuestions(); 
       
       const newRoomData = {
          roomCode: 'QUICK',
          createdBy: currentUser.uid,
          createdAt: serverTimestamp(),
          status: 'active',
          settings: { subject: 'physics', section: 'mcq', questionCount: 5 },
          players: [
              { 
                userId: opponentData.userId, 
                displayName: opponentData.displayName || 'Opponent', 
                selectedCharacter: opponentData.selectedCharacter || 'default',
                score: 0, 
                isReady: true 
              },
              { 
                userId: currentUser.uid, 
                displayName: currentUser.displayName || 'Player',
                selectedCharacter: (currentUser as any).selectedCharacter || 'mint',
                score: 0, 
                isReady: true 
              }
          ],
          currentQuestionIndex: 0,
          questions: questions
       };
       
       const roomRef = await addDoc(collection(db, 'battleRooms'), newRoomData);
       return { roomId: roomRef.id, roomData: newRoomData };
  };

  // 4. Helper: Fetch REAL Questions from Firestore
  const fetchRandomQuestions = async () => {
    try {
      const allQuestions: any[] = [];
      const shifts = [
        '2-april-2025-evening', '2-april-2025-morning', '22-jan-2025-morning',
        '3-april-2025-evening', '3-april-2025-morning', '4-april-2025-evening',
        '4-april-2025-morning', '7-april-2025-evening', '7-april-2025-morning',
        '8-april-2025-evening'
      ];
      
      // Shuffle shifts to randomize source
      const shuffledShifts = [...shifts].sort(() => 0.5 - Math.random());
      
      for (const shift of shuffledShifts) {
        if (allQuestions.length >= 10) break; // Get a pool, then slice
        
        const qRef = collection(db, 'exams', '2025', 'shifts', shift, 'subjects', 'physics', 'questions');
        // Fetch a few from this shift
        const qSnap = await getDocs(query(qRef, limit(5)));
        
        qSnap.forEach(doc => {
            const data = doc.data();
            if (data.imageUrl || data.question) {
                allQuestions.push({
                    id: doc.id,
                    question: data.question || "Question Image",
                    imageUrl: data.imageUrl,
                    options: data.options || [],
                    correct: data.correctOption || data.answer || '1',
                    type: data.type || 'mcq'
                });
            }
        });
      }
      
      if (allQuestions.length === 0) {
          // Fallback if DB is empty
          return [
              { id: 'q1', question: 'Unit of Force?', options: ['Newton', 'Joule', 'Watt', 'Pascal'], correct: '1', type: 'mcq' },
              { id: 'q2', question: 'Vector Quantity?', options: ['Speed', 'Velocity', 'Mass', 'Time'], correct: '2', type: 'mcq' }
          ];
      }

      // Shuffle and take 5
      return allQuestions.sort(() => 0.5 - Math.random()).slice(0, 5);

    } catch (e) {
      console.log("Error fetching questions", e);
      return []; 
    }
  };

  // 5. Trigger VS Animation
  const triggerMatchFound = () => {
    setMatchFound(true);

    Animated.parallel([
      Animated.spring(leftSlide, {
        toValue: 0,
        useNativeDriver: true,
        damping: 15,
        stiffness: 100,
      }),
      Animated.spring(rightSlide, {
        toValue: 0,
        useNativeDriver: true,
        damping: 15,
        stiffness: 100,
      }),
      Animated.sequence([
          Animated.delay(400),
          Animated.spring(vsScale, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
          })
      ])
    ]).start(() => startCountdown());
  };

  // 6. Countdown Logic
  const startCountdown = () => {
    let count = 3;
    setCountdown(count);
    
    const pulse = () => {
      countScale.setValue(0.5);
      countOpacity.setValue(1);
      
      Animated.parallel([
        Animated.spring(countScale, { toValue: 1.2, friction: 3, useNativeDriver: true }),
        Animated.timing(countOpacity, { toValue: 0, duration: 900, useNativeDriver: true })
      ]).start();
    };

    pulse();

    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        pulse();
      } else {
        clearInterval(interval);
        setCountdown("BATTLE!");
        pulse();
        
        // NAVIGATE TO GAME SCREEN (Using existing GameScreen logic)
        setTimeout(() => {
           if (pendingGameData) {
               // We replace, so they can't go back to matchmaking easily
               navigation.replace('Game', { roomId: pendingGameData.roomId, roomData: pendingGameData.roomData });
           }
        }, 1000);
      }
    }, 1000);
  };

  if (!fontsLoaded) return <View style={{flex: 1, backgroundColor: '#000'}} />;

  // --- RENDER: SEARCHING STATE ---
  if (!matchFound) {
      return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <BlurView intensity={20} tint="dark" style={styles.card}>
                    <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]} />
                    <View style={styles.avatarContainer}>
                        <Image 
                            source={AVATARS[(user as any)?.selectedCharacter || 'mint']} 
                            style={styles.searchingAvatar} 
                        />
                    </View>
                    <Text style={styles.statusText}>{statusText}</Text>
                    
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
                        <Text style={styles.cancelText}>CANCEL SEARCH</Text>
                    </TouchableOpacity>
                </BlurView>
            </SafeAreaView>
        </View>
      );
  }

  // --- RENDER: VS STATE ---
  return (
    <View style={styles.vsContainer}>
      
      {/* Top Half: Opponent */}
      <Animated.View style={[styles.playerSection, styles.opponentSection, { transform: [{ translateX: rightSlide }] }]}>
        <Image source={AVATARS[opponent?.avatar || 'default']} style={styles.vsAvatar} resizeMode="contain" />
        <Text style={styles.vsName}>{opponent?.name?.toUpperCase()}</Text>
        <Text style={styles.vsLabel}>OPPONENT</Text>
      </Animated.View>

      {/* VS Badge */}
      <View style={styles.badgeContainer}>
        <Animated.View style={{ transform: [{ scale: vsScale }] }}>
          <BlurView intensity={50} tint="light" style={styles.vsBadge}>
            <Text style={styles.vsText}>VS</Text>
          </BlurView>
        </Animated.View>
      </View>

      {/* Bottom Half: You */}
      <Animated.View style={[styles.playerSection, styles.userSection, { transform: [{ translateX: leftSlide }] }]}>
        <Text style={styles.vsLabel}>YOU</Text>
        <Text style={styles.vsName}>{user?.displayName?.toUpperCase()}</Text>
        <Image source={AVATARS[(user as any)?.selectedCharacter || 'mint']} style={styles.vsAvatar} resizeMode="contain" />
      </Animated.View>

      {/* Countdown Overlay */}
      {countdown !== null && (
        <View style={styles.countdownOverlay}>
          <Animated.Text style={[
            styles.countdownText, 
            { transform: [{ scale: countScale }], opacity: countOpacity }
          ]}>
            {typeof countdown === 'number' ? countdown : ''}
          </Animated.Text>
          {/* Static text for "BATTLE!" to avoid opacity fade issues on final frame */}
          {typeof countdown === 'string' && (
              <Text style={styles.battleText}>{countdown}</Text>
          )}
        </View>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  card: { padding: 40, borderRadius: 24, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', minWidth: 320 },
  
  // Searching Styles
  pulseCircle: { 
      position: 'absolute',
      width: 200, height: 200, 
      borderRadius: 100, 
      backgroundColor: 'rgba(20, 241, 149, 0.2)', 
  },
  avatarContainer: {
      width: 120, height: 120, borderRadius: 60,
      backgroundColor: '#000',
      justifyContent: 'center', alignItems: 'center',
      marginBottom: 30, borderWidth: 2, borderColor: '#14F195',
      overflow: 'hidden'
  },
  searchingAvatar: { width: 100, height: 100, resizeMode: 'contain' },
  statusText: { color: '#FFF', fontFamily: 'Exo_700Bold', fontSize: 16, marginBottom: 30, textAlign: 'center', letterSpacing: 1 },
  cancelBtn: { padding: 10 },
  cancelText: { color: '#FF5252', fontFamily: 'Exo_700Bold' },

  // VS Screen Styles
  vsContainer: { flex: 1, backgroundColor: '#000' },
  playerSection: {
    position: 'absolute',
    left: 0, right: 0, height: height / 2,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 1,
  },
  opponentSection: {
    top: 0,
    backgroundColor: '#1a1a2e', // Deep purple/blue for opponent
    borderBottomWidth: 2, borderColor: '#333',
  },
  userSection: {
    bottom: 0,
    backgroundColor: '#121212', // Dark grey for user
  },
  vsAvatar: { width: 180, height: 180, marginVertical: 10 },
  vsName: {
    fontSize: 32, fontFamily: 'Exo_900Black', color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width:0, height:2}, textShadowRadius: 4
  },
  vsLabel: {
    fontSize: 12, fontFamily: 'Exo_700Bold', color: 'rgba(255,255,255,0.5)', letterSpacing: 3, marginVertical: 5
  },

  // VS Badge
  badgeContainer: {
    position: 'absolute', top: height / 2 - 50, left: width / 2 - 50, zIndex: 10
  },
  vsBadge: {
    width: 100, height: 100, borderRadius: 50,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.9)', // Red
    borderWidth: 4, borderColor: '#FFF',
    overflow: 'hidden'
  },
  vsText: {
    fontSize: 40, fontFamily: 'Exo_900Black', color: '#FFF', fontStyle: 'italic', marginLeft: -5
  },

  // Countdown
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center', zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.2)'
  },
  countdownText: {
    fontSize: 150, fontFamily: 'Exo_900Black', color: '#14F195',
    textShadowColor: 'rgba(20, 241, 149, 0.8)', textShadowRadius: 20
  },
  battleText: {
    position: 'absolute',
    fontSize: 80, fontFamily: 'Exo_900Black', color: '#FFD700',
    textShadowColor: '#000', textShadowOffset: {width:2, height:2}, textShadowRadius: 10,
    transform: [{rotate: '-5deg'}]
  }
});