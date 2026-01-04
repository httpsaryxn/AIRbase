import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, Exo_700Bold, Exo_400Regular } from '@expo-google-fonts/exo';
import { useUserStore } from '../store/userStore';
import { getFirestore, doc, onSnapshot, updateDoc } from 'firebase/firestore';

const db = getFirestore();

export const LobbyScreen = ({ navigation, route }: { navigation: any, route: any }) => {
  const { roomId, roomCode, isHost } = route.params;
  const user = useUserStore((state) => state.user);
  const [roomData, setRoomData] = useState<any>(null);

  let [fontsLoaded] = useFonts({
    Exo_700Bold,
    Exo_400Regular,
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'battleRooms', roomId), (docSnap) => {
      if (docSnap.exists()) {
        setRoomData(docSnap.data());
        // FIXED: Navigate to GameScreen instead of Alert
        if (docSnap.data().status === 'active') {
           navigation.replace('Game', { roomId, roomData: docSnap.data() }); 
        }
      } else {
        Alert.alert("Room Deleted", "The host closed the room.");
        navigation.goBack();
      }
    });
    return () => unsub();
  }, [roomId]);

  const handleReady = async () => {
    if (!roomData || !user) return;
    const updatedPlayers = roomData.players.map((p: any) => 
      p.userId === user.uid ? { ...p, isReady: !p.isReady } : p
    );
    await updateDoc(doc(db, 'battleRooms', roomId), { players: updatedPlayers });
  };

  const handleStart = async () => {
    const allReady = roomData.players.length > 0 && roomData.players.every((p: any) => p.isReady);
    if (!allReady) {
      Alert.alert("Wait!", "All players must be ready.");
      return;
    }
    await updateDoc(doc(db, 'battleRooms', roomId), { status: 'active' });
  };

  const copyCode = () => {
    Share.share({ message: `Join my AIRbase battle! Room Code: ${roomCode}` });
  };

  if (!fontsLoaded || !roomData) return <View style={styles.container}><Text style={{color:'#FFF'}}>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1, padding: 20 }}>
        
        <Text style={styles.title}>LOBBY</Text>
        
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>ROOM CODE</Text>
          <TouchableOpacity onPress={copyCode}>
            <Text style={styles.codeText}>{roomCode}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>PLAYERS ({roomData.players.length})</Text>
        
        <FlatList 
          data={roomData.players}
          keyExtractor={item => item.userId}
          renderItem={({ item }) => (
            <View style={styles.playerRow}>
              <View style={styles.playerInfo}>
                <View style={styles.avatar} />
                <Text style={styles.playerName}>{item.displayName}</Text>
              </View>
              <Text style={[styles.status, item.isReady ? styles.ready : styles.notReady]}>
                {item.isReady ? 'READY' : 'WAITING'}
              </Text>
            </View>
          )}
        />

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.btn, styles.readyBtn]} onPress={handleReady}>
            <Text style={styles.btnText}>
              {roomData.players.find((p: any) => p.userId === user?.uid)?.isReady ? 'NOT READY' : 'READY UP'}
            </Text>
          </TouchableOpacity>
          
          {isHost && (
            <TouchableOpacity style={[styles.btn, styles.startBtn]} onPress={handleStart}>
              <Text style={styles.btnText}>START GAME</Text>
            </TouchableOpacity>
          )}
        </View>

      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  title: { fontSize: 32, fontFamily: 'Exo_700Bold', color: '#FFF', textAlign: 'center', marginBottom: 30 },
  codeBox: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 40 },
  codeLabel: { color: '#888', fontFamily: 'Exo_700Bold', fontSize: 12, marginBottom: 5 },
  codeText: { color: '#14F195', fontFamily: 'Exo_700Bold', fontSize: 36, letterSpacing: 4 },
  sectionTitle: { color: '#FFF', fontFamily: 'Exo_700Bold', marginBottom: 15 },
  playerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 12, marginBottom: 10 },
  playerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#555' },
  playerName: { color: '#FFF', fontFamily: 'Exo_400Regular' },
  status: { fontFamily: 'Exo_700Bold', fontSize: 12 },
  ready: { color: '#14F195' },
  notReady: { color: '#FF5252' },
  footer: { gap: 15, marginTop: 20 },
  btn: { padding: 18, borderRadius: 16, alignItems: 'center' },
  readyBtn: { backgroundColor: '#333', borderWidth: 1, borderColor: '#666' },
  startBtn: { backgroundColor: '#14F195' },
  btnText: { fontFamily: 'Exo_700Bold', color: '#FFF' }
});