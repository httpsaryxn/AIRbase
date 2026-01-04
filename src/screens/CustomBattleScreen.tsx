import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert, TextInput, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useFonts, Exo_700Bold, Exo_400Regular } from '@expo-google-fonts/exo';
import { useUserStore } from '../store/userStore';
import { getFirestore, collection, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, getDocs, query, where, limit, getDoc } from 'firebase/firestore';

const { width, height } = Dimensions.get('window');
const db = getFirestore();

export const CustomBattleScreen = ({ navigation }: { navigation: any }) => {
  const user = useUserStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  
  // Create Room State
  const [selectedSubject, setSelectedSubject] = useState('physics');
  const [selectedSection, setSelectedSection] = useState('mcq');
  const [questionCount, setQuestionCount] = useState(5);
  const [loading, setLoading] = useState(false);

  // Join Room State
  const [roomCode, setRoomCode] = useState('');

  let [fontsLoaded] = useFonts({
    Exo_700Bold,
    Exo_400Regular,
  });

  if (!fontsLoaded) return <View style={{flex: 1, backgroundColor: '#000'}} />;

  // --- DEBUG TOOL ---
  const debugFirestore = async () => {
    setLoading(true);
    console.log("--- STARTING DB DIAGNOSTIC ---");
    try {
        // Check new structure: /exams/2025/shifts/4-april-2025-evening/subjects/physics/questions
        const path = 'exams/2025/shifts/4-april-2025-evening/subjects/physics/questions';
        console.log(`Checking path: ${path}`);
        
        const qRef = collection(db, 'exams', '2025', 'shifts', '4-april-2025-evening', 'subjects', 'physics', 'questions');
        const qSnap = await getDocs(query(qRef, limit(1)));
        
        if (!qSnap.empty) {
            const data = qSnap.docs[0].data();
            console.log("Found question:", data);
            Alert.alert("Diagnostic Success", `Found question ID: ${qSnap.docs[0].id}\nImage URL: ${data.imageUrl || 'None'}`);
        } else {
            console.log("Path valid but empty results.");
            Alert.alert("Diagnostic Result", "Path valid but no questions found. Check if '2025' or shift name matches exactly.");
        }
    } catch (error: any) {
        console.error("Diagnostic Error:", error);
        Alert.alert("Diagnostic Failed", error.message);
    } finally {
        setLoading(false);
    }
  };

  // --- LOGIC: Fetch Questions ---
  const fetchRandomQuestions = async () => {
    try {
      console.log(`Fetching questions for ${selectedSubject}...`);
      const allQuestions: any[] = [];
      
      // Full list of shifts provided by user
      const shifts = [
        '2-april-2025-evening',
        '2-april-2025-morning',
        '22-jan-2025-morning',
        '3-april-2025-evening',
        '3-april-2025-morning',
        '4-april-2025-evening',
        '4-april-2025-morning',
        '7-april-2025-evening',
        '7-april-2025-morning',
        '8-april-2025-evening'
      ];
      
      const year = '2025';
      const subject = selectedSubject.toLowerCase(); // 'physics', 'chemistry', 'math'

      // We want random questions from ANY of these shifts. 
      // Strategy: Shuffle shifts first, then try to fetch a few from each until we have enough.
      const shuffledShifts = [...shifts].sort(() => 0.5 - Math.random());

      for (const shift of shuffledShifts) {
        // If we have enough candidates (e.g. double what we need to allow for some randomness), stop
        if (allQuestions.length >= questionCount * 3) break;

        try {
            // Path: /exams/{year}/shifts/{shift}/subjects/{subject}/questions
            const questionsRef = collection(
                db, 
                'exams', year, 
                'shifts', shift, 
                'subjects', subject, 
                'questions'
            );

            // Fetch a batch. Limit to 10 per shift to be efficient but get variety.
            const qQuery = query(questionsRef, limit(10)); 
            const qSnap = await getDocs(qQuery);

            if (!qSnap.empty) {
                console.log(`Found ${qSnap.size} questions in ${shift}`);
                qSnap.forEach(doc => {
                    const data = doc.data();
                    // Basic validation: ensure it has content
                    if (data.imageUrl || data.question) {
                        allQuestions.push({
                            id: doc.id,
                            question: data.question || "Question Image",
                            imageUrl: data.imageUrl, // Cloudinary URL
                            // Add other fields you might need
                            options: data.options || [], 
                            correct: data.correctOption || data.answer || '1',
                            type: data.type || 'mcq',
                            sourceShift: shift // Good for debugging
                        });
                    }
                });
            }
        } catch (err) {
            console.log(`Skipping shift ${shift} (Error or empty):`, err);
        }
      }

      if (allQuestions.length === 0) {
        throw new Error("No questions found in Firestore for the selected subject. Please check your database.");
      }

      // Filter by section if your data supports it. 
      // If your data structure flatly puts both MCQs and Numericals in 'questions', 
      // we'll filter here if 'type' field exists.
      // If 'type' doesn't exist, we assume all are valid.
      const filteredQuestions = allQuestions.filter(q => {
          if (!q.type) return true; // Keep if unknown
          // Normalize type check
          const qType = q.type.toLowerCase();
          if (selectedSection === 'mcq') return qType.includes('mcq') || qType === '1';
          if (selectedSection === 'numerical') return qType.includes('num') || qType === '2';
          return true;
      });

      // If filtering removed everything, fall back to mixed
      const finalPool = filteredQuestions.length > 0 ? filteredQuestions : allQuestions;

      // Randomize and slice
      const shuffled = finalPool.sort(() => 0.5 - Math.random());
      return shuffled.slice(0, questionCount);

    } catch (error: any) {
      console.error("Error fetching questions:", error);
      throw error;
    }
  };

  // --- LOGIC: Create Room ---
  const handleCreateRoom = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const questions = await fetchRandomQuestions();
      
      // Double check we got questions
      if (!questions || questions.length === 0) {
          throw new Error("Could not find enough questions to start a game.");
      }

      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const roomData = {
        roomCode: code,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        status: 'waiting',
        settings: {
          subject: selectedSubject,
          section: selectedSection,
          questionCount
        },
        players: [{
          userId: user.uid,
          displayName: user.displayName || 'Player',
          score: 0,
          isReady: true 
        }],
        currentQuestionIndex: 0,
        questions: questions
      };

      const docRef = await addDoc(collection(db, 'battleRooms'), roomData);
      
      setLoading(false);
      navigation.navigate('Lobby', { roomId: docRef.id, roomCode: code, isHost: true });

    } catch (error: any) {
      setLoading(false);
      Alert.alert("Error", error.message);
    }
  };

  // --- LOGIC: Join Room ---
  const handleJoinRoom = async () => {
    if (!roomCode.trim() || !user) return;
    setLoading(true);

    try {
      const q = query(collection(db, 'battleRooms'), where('roomCode', '==', roomCode.toUpperCase()), where('status', '==', 'waiting'));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("Room not found or game already started.");
      }

      const roomDoc = querySnapshot.docs[0];
      const roomData = roomDoc.data();

      const isAlreadyIn = roomData.players.some((p: any) => p.userId === user.uid);

      if (!isAlreadyIn) {
        await updateDoc(doc(db, 'battleRooms', roomDoc.id), {
          players: arrayUnion({
            userId: user.uid,
            displayName: user.displayName || 'Player',
            score: 0,
            isReady: false
          })
        });
      }

      setLoading(false);
      navigation.navigate('Lobby', { roomId: roomDoc.id, roomCode: roomCode.toUpperCase(), isHost: false });

    } catch (error: any) {
      setLoading(false);
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← HOME</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>CUSTOM LOBBY</Text>
          <View style={{width: 60}} />
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'create' && styles.activeTab]} 
            onPress={() => setActiveTab('create')}
          >
            <Text style={[styles.tabText, activeTab === 'create' && styles.activeTabText]}>CREATE</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'join' && styles.activeTab]} 
            onPress={() => setActiveTab('join')}
          >
            <Text style={[styles.tabText, activeTab === 'join' && styles.activeTabText]}>JOIN</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <BlurView intensity={30} tint="dark" style={styles.card}>
            
            {activeTab === 'create' ? (
              <>
                <Text style={styles.label}>SUBJECT</Text>
                <View style={styles.optionsRow}>
                  {['physics', 'chemistry', 'math'].map(s => (
                    <TouchableOpacity 
                      key={s} 
                      style={[styles.optionChip, selectedSubject === s && styles.optionSelected]}
                      onPress={() => setSelectedSubject(s)}
                    >
                      <Text style={[styles.optionText, selectedSubject === s && styles.optionTextSelected]}>{s.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>SECTION</Text>
                <View style={styles.optionsRow}>
                  {['mcq', 'numerical'].map(s => (
                    <TouchableOpacity 
                      key={s} 
                      style={[styles.optionChip, selectedSection === s && styles.optionSelected]}
                      onPress={() => setSelectedSection(s)}
                    >
                      <Text style={[styles.optionText, selectedSection === s && styles.optionTextSelected]}>{s.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity 
                  style={styles.actionBtn} 
                  onPress={handleCreateRoom}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.actionBtnText}>CREATE ROOM</Text>}
                </TouchableOpacity>

                {/* DEBUG BUTTON */}
                <TouchableOpacity 
                  style={[styles.actionBtn, {backgroundColor: '#333', marginTop: 20}]} 
                  onPress={debugFirestore}
                  disabled={loading}
                >
                  <Text style={[styles.actionBtnText, {color: '#FFF', fontSize: 12}]}>DEBUG DB (CHECK LOGS)</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.label}>ENTER ROOM CODE</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="e.g. X7Y2Z1" 
                  placeholderTextColor="#666"
                  value={roomCode}
                  onChangeText={setRoomCode}
                  autoCapitalize="characters"
                  maxLength={6}
                />
                
                <TouchableOpacity 
                  style={styles.actionBtn} 
                  onPress={handleJoinRoom}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.actionBtnText}>JOIN ROOM</Text>}
                </TouchableOpacity>
              </>
            )}

          </BlurView>
        </ScrollView>

      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  backBtn: { padding: 10 },
  backText: { color: '#FFF', fontFamily: 'Exo_700Bold' },
  headerTitle: { color: '#FFF', fontSize: 20, fontFamily: 'Exo_700Bold' },
  tabContainer: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#14F195' },
  tabText: { color: '#FFF', fontFamily: 'Exo_700Bold' },
  activeTabText: { color: '#000' },
  content: { padding: 20 },
  card: { padding: 24, borderRadius: 20, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  label: { color: '#888', fontSize: 12, fontFamily: 'Exo_700Bold', marginBottom: 12, marginTop: 10 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  optionChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  optionSelected: { backgroundColor: '#FFF', borderColor: '#FFF' },
  optionText: { color: '#FFF', fontFamily: 'Exo_400Regular', fontSize: 12 },
  optionTextSelected: { color: '#000', fontFamily: 'Exo_700Bold' },
  input: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, fontSize: 18, fontFamily: 'Exo_700Bold', marginBottom: 30, letterSpacing: 2, textAlign: 'center' },
  actionBtn: { backgroundColor: '#14F195', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 10 },
  actionBtnText: { color: '#000', fontSize: 18, fontFamily: 'Exo_700Bold' },
});