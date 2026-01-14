import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, Exo_700Bold, Exo_400Regular } from '@expo-google-fonts/exo';
import { useUserStore } from '../store/userStore';
import { getFirestore, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const db = getFirestore();

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const OPTION_TO_VALUE: { [key: string]: string } = { 'A': '1', 'B': '2', 'C': '3', 'D': '4' };

// --- Custom Popup Component ---
const GamePopup = ({ visible, message, type = 'info' }: { visible: boolean, message: string, type?: 'info' | 'success' }) => {
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.popupContainer, { opacity: fadeAnim }]}>
      <BlurView intensity={80} tint="dark" style={[styles.popupContent, type === 'success' && styles.popupSuccess]}>
        <Text style={styles.popupText}>{message}</Text>
      </BlurView>
    </Animated.View>
  );
};

export const GameScreen = ({ navigation, route }: { navigation: any, route: any }) => {
  const { roomId, roomData: initialRoomData } = route.params;
  const user = useUserStore((state) => state.user);
  const [roomData, setRoomData] = useState<any>(initialRoomData || {});
  
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  
  // Popup States
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [popupType, setPopupType] = useState<'info' | 'success'>('info');

  let [fontsLoaded] = useFonts({
    Exo_700Bold,
    Exo_400Regular,
  });

  // Listen to Room Data & Handle Game Logic
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'battleRooms', roomId), async (docSnap) => {
      if (docSnap.exists()) {
        const newData = docSnap.data();
        setRoomData(newData);
        
        // --- POPUP LOGIC ---
        const myPlayer = newData.players.find((p: any) => p.userId === user?.uid);
        const opponents = newData.players.filter((p: any) => p.userId !== user?.uid);
        const qIdx = newData.currentQuestionIndex;

        if (myPlayer?.answers?.length > qIdx) {
            const allOpponentsAnswered = opponents.every((p: any) => p.answers?.length > qIdx);
            
            if (!allOpponentsAnswered) {
                setPopupMessage("Waiting for opponent...");
                setPopupType('info');
                setShowPopup(true);
            } else {
                setPopupMessage("All players answered!");
                setPopupType('success');
                setShowPopup(true);
                setTimeout(() => setShowPopup(false), 2000); 
            }
        } else {
            setShowPopup(false);
        }

        // --- GAME OVER LOGIC ---
        if (newData.status === 'completed') {
            navigation.replace('Results', { roomData: newData });
            return;
        }

        // --- HOST LOGIC: CHECK FOR NEXT QUESTION ---
        if (newData.createdBy === user?.uid && newData.status === 'active') {
            const totalQ = newData.questions.length;
            const allPlayersAnsweredCurrent = newData.players.every((p: any) => 
                (p.answers || []).length > newData.currentQuestionIndex
            );

            if (allPlayersAnsweredCurrent) {
                setTimeout(async () => {
                    if (newData.currentQuestionIndex < totalQ - 1) {
                        await updateDoc(doc(db, 'battleRooms', roomId), {
                            currentQuestionIndex: newData.currentQuestionIndex + 1
                        });
                    } else {
                        await updateDoc(doc(db, 'battleRooms', roomId), {
                            status: 'completed'
                        });
                    }
                }, 2000); 
            }
        }
      }
    });
    return () => unsub();
  }, [roomId]);

  // Timer Logic
  useEffect(() => {
    if (hasSubmitted) return;
    
    const timer = setInterval(() => {
        setTimeLeft((prev) => {
            if (prev <= 1) {
                clearInterval(timer);
                handleSubmit(true); 
                return 0;
            }
            return prev - 1;
        });
    }, 1000);
    return () => clearInterval(timer);
  }, [roomData.currentQuestionIndex, hasSubmitted]);

  // Reset state on new question
  useEffect(() => {
      setTimeLeft(60);
      setSelectedOption(null);
      setHasSubmitted(false);
      setShowPopup(false);
  }, [roomData.currentQuestionIndex]);

  if (!fontsLoaded || !roomData.questions) return <View style={styles.container}><Text style={{color:'#FFF'}}>Loading Arena...</Text></View>;

  const currentQ = roomData.questions[roomData.currentQuestionIndex];
  const totalQ = roomData.questions.length;

  const handleSubmit = async (auto = false) => {
    if (hasSubmitted && !auto) return;
    setHasSubmitted(true);
    
    setPopupMessage("Answer Submitted");
    setPopupType('info');
    setShowPopup(true);

    const submittedValue = selectedOption ? OPTION_TO_VALUE[selectedOption] : null;
    const isCorrect = submittedValue === currentQ.correct;
    const timeTaken = 60 - timeLeft;

    try {
        const updatedPlayers = roomData.players.map((p: any) => {
            if (p.userId === user?.uid) {
                const answers = p.answers || [];
                // Prevent duplicate submission for same Q index
                if (answers.length > roomData.currentQuestionIndex) return p;
                
                return {
                    ...p,
                    answers: [...answers, { 
                        questionId: currentQ.id, 
                        answer: submittedValue, 
                        correct: isCorrect,
                        time: timeTaken 
                    }]
                };
            }
            return p;
        });

        await updateDoc(doc(db, 'battleRooms', roomId), {
            players: updatedPlayers
        });
    } catch (error) {
        console.error("Error submitting:", error);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        
        <View style={styles.header}>
            <View style={styles.timerBadge}>
                <Text style={styles.timerText}>⏱ {timeLeft}s</Text>
            </View>
            <Text style={styles.progressText}>Q {roomData.currentQuestionIndex + 1} / {totalQ}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
            
            <View style={styles.questionCard}>
                {currentQ.imageUrl ? (
                    <Image source={{ uri: currentQ.imageUrl }} style={styles.questionImage} resizeMode="contain" />
                ) : (
                    <Text style={styles.questionText}>{currentQ.question || "Loading..."}</Text>
                )}
            </View>

            {/* Centered Option Buttons */}
            <View style={styles.optionsGrid}>
                {OPTION_LABELS.map((label) => (
                    <TouchableOpacity 
                        key={label} 
                        style={[
                            styles.optionBtn, 
                            selectedOption === label && styles.selectedOption
                        ]}
                        onPress={() => setSelectedOption(label)}
                        disabled={hasSubmitted}
                        activeOpacity={0.7}
                    >
                        <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
                            <Text style={[
                                styles.optionText, 
                                selectedOption === label && styles.selectedOptionText
                            ]}>{label}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity 
                style={[styles.submitBtn, hasSubmitted && styles.disabledBtn]} 
                onPress={() => handleSubmit(false)}
                disabled={hasSubmitted}
            >
                <Text style={styles.submitBtnText}>{hasSubmitted ? "WAITING..." : "SUBMIT ATTACK"}</Text>
            </TouchableOpacity>

        </ScrollView>

        <GamePopup visible={showPopup} message={popupMessage} type={popupType} />

      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  timerBadge: { backgroundColor: '#FF5252', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  timerText: { color: '#FFF', fontFamily: 'Exo_700Bold', fontSize: 16 },
  progressText: { color: '#FFF', fontFamily: 'Exo_700Bold', fontSize: 18 },
  content: { padding: 20 },
  questionCard: { height: 250, backgroundColor: '#fff', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 30, padding: 5 },
  questionImage: { width: '100%', height: '100%', borderRadius: 15 },
  questionText: { fontFamily: 'Exo_700Bold', fontSize: 20, textAlign: 'center', color: '#000' },
  
  optionsGrid: { 
      flexDirection: 'row', 
      flexWrap: 'wrap', 
      justifyContent: 'space-between',
      gap: 15 
  },
  optionBtn: { 
      backgroundColor: 'rgba(255,255,255,0.1)', 
      width: '47%', 
      aspectRatio: 1.5,
      borderRadius: 16, 
      borderWidth: 1, 
      borderColor: 'rgba(255,255,255,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  selectedOption: { backgroundColor: '#14F195', borderColor: '#14F195' },
  optionText: { 
      color: '#FFF', 
      fontFamily: 'Exo_700Bold', 
      fontSize: 32, 
      textAlign: 'center',
  },
  selectedOptionText: { color: '#000' },
  
  submitBtn: { backgroundColor: '#14F195', padding: 20, borderRadius: 16, alignItems: 'center', marginTop: 40 },
  disabledBtn: { backgroundColor: '#333' },
  submitBtnText: { color: '#000', fontFamily: 'Exo_700Bold', fontSize: 18, letterSpacing: 1 },

  // Popup Styles
  popupContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  popupContent: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  popupSuccess: {
    borderColor: '#14F195',
    backgroundColor: 'rgba(20, 241, 149, 0.2)',
  },
  popupText: {
    color: '#FFF',
    fontFamily: 'Exo_700Bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});