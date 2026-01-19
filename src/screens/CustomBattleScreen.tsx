import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useFonts, Exo_700Bold, Exo_400Regular } from '@expo-google-fonts/exo';
import { useUserStore } from '../store/userStore';
import { getFirestore, collection, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, getDocs, query, where, limit } from 'firebase/firestore';

const { width } = Dimensions.get('window');
const db = getFirestore();

// Same shifts structure as Matchmaking
const KNOWN_SHIFTS = [
  { year: '2025', month: 'april', shiftId: '4-april-evening' },
  { year: '2025', month: 'april', shiftId: '4-april-morning' },
  { year: '2025', month: 'april', shiftId: '5-april-evening' },
  { year: '2025', month: 'april', shiftId: '5-april-morning' },
  { year: '2025', month: 'april', shiftId: '6-april-evening' },
  { year: '2025', month: 'april', shiftId: '6-april-morning' },
];

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

  // --- LOGIC: Fetch Questions with New Path ---
  const fetchRandomQuestions = async () => {
    try {
      console.log(`Fetching questions for ${selectedSubject}...`);
      const allQuestions: any[] = [];
      
      // Map subject name for DB
      let dbSubject = selectedSubject.toLowerCase();
      if (dbSubject === 'math') dbSubject = 'maths';

      const shuffledShifts = [...KNOWN_SHIFTS].sort(() => 0.5 - Math.random());

      for (const shift of shuffledShifts) {
        if (allQuestions.length >= questionCount * 3) break;

        try {
            // PATH: years/2025/april/4-april-evening/subjects/maths/sections/sec-1-mcq/questions
            // Note: Custom battles might allow numericals, so we check selectedSection
            const sectionId = selectedSection === 'numerical' ? 'sec-2-numerical' : 'sec-1-mcq';

            const qRef = collection(
                db, 
                'years', shift.year, 
                shift.month, shift.shiftId, 
                'subjects', dbSubject, 
                'sections', sectionId, 
                'questions'
            );

            const qSnap = await getDocs(query(qRef, limit(10)));

            qSnap.forEach(doc => {
                const data = doc.data();
                
                // DATA NORMALIZATION (Identical to MatchmakingScreen)
                let qText = data.question;
                let imgUrl = data.imageUrl || data.image || data.url || data.img;

                // Check for URL stored in question text field
                if (!imgUrl && qText && (typeof qText === 'string') && (qText.startsWith('http') || qText.includes('cloudinary') || qText.includes('firebasestorage'))) {
                    imgUrl = qText;
                    qText = null; 
                }

                if (imgUrl || qText) {
                    // Extract correct answer
                    const correctVal = data.correct ? String(data.correct) : (data.correctOption ? String(data.correctOption) : (data.answer ? String(data.answer) : '1'));

                    allQuestions.push({
                        id: doc.id,
                        question: qText || "Identify this:", // Default text for image-only Qs
                        imageUrl: imgUrl || null, 
                        options: data.options || [],
                        correct: correctVal,
                        type: selectedSection
                    });
                }
            });
        } catch (err) {
            console.log(`Skipping shift ${shift.shiftId}:`, err);
        }
      }

      if (allQuestions.length === 0) {
        throw new Error(`No questions found in Firestore for ${dbSubject} (${selectedSection}).`);
      }

      // Randomize and slice
      return allQuestions.sort(() => 0.5 - Math.random()).slice(0, questionCount);

    } catch (error: any) {
      console.error("Error fetching questions:", error);
      throw error;
    }
  };

  const handleCreateRoom = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const questions = await fetchRandomQuestions();
      
      if (!questions || questions.length === 0) {
          throw new Error("Could not find enough questions.");
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
          // UPDATED: Store username explicitly
          username: (user as any).username || user.displayName,
          displayName: user.displayName || 'Player',
          // UPDATED: Store selected character
          selectedCharacter: (user as any).selectedCharacter || 'mint',
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
            // UPDATED: Store username explicitly
            username: (user as any).username || user.displayName,
            displayName: user.displayName || 'Player',
            // UPDATED: Store selected character
            selectedCharacter: (user as any).selectedCharacter || 'mint',
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← HOME</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>CUSTOM LOBBY</Text>
          <View style={{width: 60}} />
        </View>

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