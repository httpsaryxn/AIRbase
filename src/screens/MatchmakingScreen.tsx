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

// Known Shifts Data Structure for Random Fetching
const KNOWN_SHIFTS = [
  { year: '2025', month: 'april', shiftId: '4-april-evening' },
  { year: '2025', month: 'april', shiftId: '4-april-morning' },
  { year: '2025', month: 'april', shiftId: '5-april-evening' },
  { year: '2025', month: 'april', shiftId: '5-april-morning' },
  { year: '2025', month: 'april', shiftId: '6-april-evening' },
  { year: '2025', month: 'april', shiftId: '6-april-morning' },
  { year: '2025', month: 'april', shiftId: '8-april-evening' },
  { year: '2025', month: 'april', shiftId: '8-april-morning' },
  { year: '2025', month: 'april', shiftId: '9-april-evening' },
  { year: '2025', month: 'april', shiftId: '9-april-morning' },
];

export const MatchmakingScreen = ({ navigation, route }: { navigation: any, route: any }) => {
  const user = useUserStore((state) => state.user);
  
  // Get subject from params, default to Physics if missing
  const { subject = 'physics' } = route.params || {};

  // UI States
  const [matchFound, setMatchFound] = useState(false);
  const [opponent, setOpponent] = useState<{name: string, avatar: string} | null>(null);
  const [countdown, setCountdown] = useState<number | string | null>(null);
  const [statusText, setStatusText] = useState(`SCANNING FOR ${subject.toUpperCase()} OPPONENTS...`);
  
  // Ref to hold game data synchronously for the timeout closure
  const gameDataRef = useRef<{roomId: string, roomData: any} | null>(null);

  // Animation Values
  const pulseAnim = useRef(new Animated.Value(1)).current;     
  const leftSlide = useRef(new Animated.Value(-width)).current; 
  const rightSlide = useRef(new Animated.Value(width)).current; 
  const vsScale = useRef(new Animated.Value(0)).current;        
  const countScale = useRef(new Animated.Value(0.5)).current;   
  const countOpacity = useRef(new Animated.Value(0)).current;

  let [fontsLoaded] = useFonts({
    Exo_700Bold,
    Exo_900Black,
    Exo_400Regular,
  });

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    let matchmakingDocId: string | null = null;
    let unsubMatch: (() => void) | null = null;

    const startMatchmaking = async () => {
      try {
        let subjectLower = subject.toLowerCase();
        // Normalize subject names for DB query
        if (subjectLower === 'math' || subjectLower === 'mathematics') {
            subjectLower = 'maths';
        }

        // A. Check for waiting players
        const q = query(
          collection(db, 'matchmakingQueue'), 
          where('status', '==', 'waiting'),
          where('subject', '==', subjectLower), 
          limit(1)
        );
        
        const snapshot = await getDocs(q);
        const validOpponent = snapshot.docs.find(d => d.data().userId !== user.uid);

        if (validOpponent) {
          setStatusText('OPPONENT DETECTED. INITIATING LINK...');
          const opponentData = validOpponent.data();
          
          if (opponentData.status !== 'waiting') {
             // Race condition
          } else {
             // 1. Create Room with Real Questions using normalized subject
             const { roomId, roomData } = await createQuickMatchRoom(user, opponentData, subjectLower);
             
             // 2. Notify Opponent
             await updateDoc(doc(db, 'matchmakingQueue', validOpponent.id), {
                 status: 'matched',
                 matchedWith: user.uid,
                 roomId: roomId
             });

             // 3. Setup Data
             setOpponent({
                 name: opponentData.username || opponentData.displayName || 'Opponent',
                 avatar: opponentData.selectedCharacter || 'default'
             });
             
             gameDataRef.current = { roomId, roomData };
             
             triggerMatchFound();
             return;
          }
        } 
        
        // --- NO ONE FOUND, WAITING IN QUEUE ---
        const myEntry = await addDoc(collection(db, 'matchmakingQueue'), {
            userId: user.uid,
            username: (user as any).username || user.displayName,
            displayName: user.displayName,
            selectedCharacter: (user as any).selectedCharacter || 'mint',
            status: 'waiting',
            subject: subjectLower,
            createdAt: serverTimestamp()
        });
        matchmakingDocId = myEntry.id;

        unsubMatch = onSnapshot(doc(db, 'matchmakingQueue', myEntry.id), async (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.status === 'matched' && data.roomId) {
                    setStatusText('MATCH CONFIRMED. DOWNLOADING DATA...');
                    
                    const roomSnap = await getDoc(doc(db, 'battleRooms', data.roomId));
                    if (roomSnap.exists()) {
                        const rData = roomSnap.data();
                        const opp = rData.players.find((p: any) => p.userId !== user.uid);
                        
                        setOpponent({
                            name: opp.username || opp.displayName || 'Opponent',
                            avatar: opp.selectedCharacter || 'default'
                        });
                        
                        gameDataRef.current = { roomId: data.roomId, roomData: rData };
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
        if (matchmakingDocId && !matchFound) {
            deleteDoc(doc(db, 'matchmakingQueue', matchmakingDocId)).catch(err => console.log("Cleanup err", err));
        }
    };
  }, []);

  const createQuickMatchRoom = async (currentUser: any, opponentData: any, selectedSubject: string) => {
       const questions = await fetchRandomQuestions(selectedSubject); 
       
       const newRoomData = {
          roomCode: 'QUICK',
          createdBy: currentUser.uid,
          createdAt: serverTimestamp(),
          status: 'active',
          settings: { subject: selectedSubject, section: 'mcq', questionCount: 5 },
          players: [
              { 
                userId: opponentData.userId, 
                username: opponentData.username || opponentData.displayName,
                displayName: opponentData.displayName || 'Opponent', 
                selectedCharacter: opponentData.selectedCharacter || 'default',
                score: 0, 
                isReady: true 
              },
              { 
                userId: currentUser.uid, 
                username: (currentUser as any).username || currentUser.displayName,
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

  const fetchRandomQuestions = async (subjectInput: string) => {
    try {
      let dbSubject = subjectInput.toLowerCase();
      if (dbSubject === 'math' || dbSubject === 'mathematics') dbSubject = 'maths';
      
      if (dbSubject.includes('random') || dbSubject.includes('all')) {
          const subs = ['physics', 'chemistry', 'maths'];
          dbSubject = subs[Math.floor(Math.random() * subs.length)];
      }

      console.log(`Fetching questions for subject: ${dbSubject}`);

      const allQuestions: any[] = [];
      const shuffledShifts = [...KNOWN_SHIFTS].sort(() => 0.5 - Math.random());
      
      for (const shift of shuffledShifts) {
        if (allQuestions.length >= 8) break; 
        
        try {
            const qRef = collection(
                db, 
                'years', shift.year, 
                shift.month, shift.shiftId, 
                'subjects', dbSubject, 
                'sections', 'sec-1-mcq', 
                'questions'
            );
            
            const qSnap = await getDocs(query(qRef, limit(5)));
            
            qSnap.forEach(doc => {
                const data = doc.data();
                
                let qText = data.question;
                let imgUrl = data.imageUrl || data.image || data.url || data.img;

                if (!imgUrl && qText && (qText.startsWith('http') || qText.includes('cloudinary'))) {
                    imgUrl = qText;
                    qText = null;
                }

                if (imgUrl || qText) {
                    const correctVal = data.correct ? String(data.correct) : (data.correctOption ? String(data.correctOption) : (data.answer ? String(data.answer) : '1'));

                    allQuestions.push({
                        id: doc.id,
                        question: qText || "Identify this:",
                        imageUrl: imgUrl || null, 
                        options: data.options || [],
                        correct: correctVal,
                        type: 'mcq' 
                    });
                }
            });
        } catch (err) {
            console.log(`Failed to fetch from ${shift.shiftId}:`, err);
        }
      }
      
      if (allQuestions.length === 0) {
          console.log("No questions found, using fallbacks.");
          return [
              { id: 'f1', question: `Fallback: Unit of Force (${dbSubject})?`, options: ['N', 'J', 'W', 'P'], correct: '1', type: 'mcq', imageUrl: null },
              { id: 'f2', question: 'Fallback: Vector Quantity?', options: ['Speed', 'Velocity', 'Mass', 'Time'], correct: '2', type: 'mcq', imageUrl: null }
          ];
      }

      return allQuestions.sort(() => 0.5 - Math.random()).slice(0, 5);

    } catch (e) {
      console.log("Critical Error fetching questions", e);
      return []; 
    }
  };

  const triggerMatchFound = () => {
    setMatchFound(true);

    Animated.parallel([
      Animated.spring(leftSlide, { toValue: 0, useNativeDriver: true, damping: 15, stiffness: 100 }),
      Animated.spring(rightSlide, { toValue: 0, useNativeDriver: true, damping: 15, stiffness: 100 }),
      Animated.sequence([
          Animated.delay(400),
          Animated.spring(vsScale, { toValue: 1, friction: 4, useNativeDriver: true })
      ])
    ]).start(() => startCountdown());
  };

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
        
        setTimeout(() => {
           if (gameDataRef.current) {
               navigation.replace('Game', { 
                   roomId: gameDataRef.current.roomId, 
                   roomData: gameDataRef.current.roomData 
               });
           } else {
               Alert.alert("Error", "Failed to load match data.");
               navigation.goBack();
           }
        }, 1000);
      }
    }, 1000);
  };

  if (!fontsLoaded) return <View style={{flex: 1, backgroundColor: '#000'}} />;

  if (!matchFound) {
      return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <BlurView intensity={20} tint="dark" style={styles.card}>
                    <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]} />
                    {/* UPDATED: Circular Frame for Searching Avatar */}
                    <View style={styles.avatarContainer}>
                        <Image source={AVATARS[(user as any)?.selectedCharacter || 'mint']} style={styles.searchingAvatar} resizeMode="cover" />
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

  return (
    <View style={styles.vsContainer}>
      <Animated.View style={[styles.playerSection, styles.opponentSection, { transform: [{ translateX: rightSlide }] }]}>
        {/* UPDATED: Circular Frame for VS Avatar */}
        <View style={styles.vsAvatarContainer}>
            <Image source={AVATARS[opponent?.avatar || 'default']} style={styles.vsAvatar} resizeMode="cover" />
        </View>
        <Text style={styles.vsName}>{opponent?.name?.toUpperCase()}</Text>
        <Text style={styles.vsLabel}>OPPONENT</Text>
      </Animated.View>

      <View style={styles.badgeContainer}>
        <Animated.View style={{ transform: [{ scale: vsScale }] }}>
          <BlurView intensity={50} tint="light" style={styles.vsBadge}>
            <Text style={styles.vsText}>VS</Text>
          </BlurView>
        </Animated.View>
      </View>

      <Animated.View style={[styles.playerSection, styles.userSection, { transform: [{ translateX: leftSlide }] }]}>
        <Text style={styles.vsLabel}>YOU</Text>
        <Text style={styles.vsName}>{(user as any)?.username?.toUpperCase() || user?.displayName?.toUpperCase()}</Text>
        {/* UPDATED: Circular Frame for VS Avatar */}
        <View style={styles.vsAvatarContainer}>
            <Image source={AVATARS[(user as any)?.selectedCharacter || 'mint']} style={styles.vsAvatar} resizeMode="cover" />
        </View>
      </Animated.View>

      {countdown !== null && (
        <View style={styles.countdownOverlay}>
          <Animated.Text style={[styles.countdownText, { transform: [{ scale: countScale }], opacity: countOpacity }]}>
            {typeof countdown === 'number' ? countdown : ''}
          </Animated.Text>
          {typeof countdown === 'string' && <Text style={styles.battleText}>{countdown}</Text>}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  card: { padding: 40, borderRadius: 24, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', minWidth: 320 },
  pulseCircle: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(20, 241, 149, 0.2)' },
  
  // Searching Avatar Container
  avatarContainer: { 
      width: 120, height: 120, 
      borderRadius: 60, 
      backgroundColor: '#000', 
      justifyContent: 'center', alignItems: 'center',
      marginBottom: 30, borderWidth: 2, borderColor: '#14F195',
      overflow: 'hidden' 
  },
  searchingAvatar: { width: '100%', height: '100%' },
  
  statusText: { color: '#FFF', fontFamily: 'Exo_700Bold', fontSize: 16, marginBottom: 30, textAlign: 'center', letterSpacing: 1 },
  cancelBtn: { padding: 10 },
  cancelText: { color: '#FF5252', fontFamily: 'Exo_700Bold' },
  vsContainer: { flex: 1, backgroundColor: '#000' },
  playerSection: { position: 'absolute', left: 0, right: 0, height: height / 2, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  opponentSection: { top: 0, backgroundColor: '#1a1a2e', borderBottomWidth: 2, borderColor: '#333' },
  userSection: { bottom: 0, backgroundColor: '#121212' },
  
  // VS Screen Avatar Container
  vsAvatarContainer: {
      width: 180, height: 180, 
      borderRadius: 90, 
      overflow: 'hidden', 
      marginVertical: 10,
      borderWidth: 3,
      borderColor: '#FFF',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#000'
  },
  vsAvatar: { width: '100%', height: '100%' },
  
  vsName: { fontSize: 32, fontFamily: 'Exo_900Black', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width:0, height:2}, textShadowRadius: 4 },
  vsLabel: { fontSize: 12, fontFamily: 'Exo_700Bold', color: 'rgba(255,255,255,0.5)', letterSpacing: 3, marginVertical: 5 },
  badgeContainer: { position: 'absolute', top: height / 2 - 50, left: width / 2 - 50, zIndex: 10 },
  vsBadge: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255, 59, 48, 0.9)', borderWidth: 4, borderColor: '#FFF', overflow: 'hidden' },
  vsText: { fontSize: 40, fontFamily: 'Exo_900Black', color: '#FFF', fontStyle: 'italic', marginLeft: -5 },
  countdownOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 20, backgroundColor: 'rgba(0,0,0,0.2)' },
  countdownText: { fontSize: 150, fontFamily: 'Exo_900Black', color: '#14F195', textShadowColor: 'rgba(20, 241, 149, 0.8)', textShadowRadius: 20 },
  battleText: { position: 'absolute', fontSize: 80, fontFamily: 'Exo_900Black', color: '#FFD700', textShadowColor: '#000', textShadowOffset: {width:2, height:2}, textShadowRadius: 10, transform: [{rotate: '-5deg'}] }
});