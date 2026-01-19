import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Share, Alert, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, Exo_700Bold, Exo_400Regular, Exo_900Black } from '@expo-google-fonts/exo';
import { useUserStore } from '../store/userStore';
import { getFirestore, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const db = getFirestore();

// Avatar Assets Mapping
const AVATARS: { [key: string]: any } = {
  'yellow': require('../assets/yellow.png'),
  'mint': require('../assets/mint.png'),
  'lavender': require('../assets/lavender.png'),
  'orange': require('../assets/orange.png'),
  'default': require('../assets/mint.png')
};

export const LobbyScreen = ({ navigation, route }: { navigation: any, route: any }) => {
  const { roomId, roomCode, isHost } = route.params;
  const user = useUserStore((state) => state.user);
  const [roomData, setRoomData] = useState<any>(null);

  let [fontsLoaded] = useFonts({
    Exo_700Bold,
    Exo_400Regular,
    Exo_900Black,
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'battleRooms', roomId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRoomData(data);
        if (data.status === 'active') {
           navigation.replace('Game', { roomId, roomData: data }); 
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
      <SafeAreaView style={{ flex: 1 }}>
        
        {/* Header with Back Button */}
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Text style={styles.backText}>← LEAVE</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>LOBBY</Text>
            <View style={{width: 60}} /> 
        </View>

        <View style={styles.content}>
            {/* Room Code Card */}
            <BlurView intensity={20} tint="dark" style={styles.codeCard}>
                <Text style={styles.codeLabel}>MISSION CODE</Text>
                <View style={styles.codeRow}>
                    <Text style={styles.codeText}>{roomCode}</Text>
                    <TouchableOpacity style={styles.copyBtn} onPress={copyCode}>
                        <Text style={styles.copyBtnText}>COPY</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.codeSub}>Share this code with your rivals</Text>
            </BlurView>

            <Text style={styles.sectionTitle}>AGENTS ({roomData.players.length})</Text>
            
            <FlatList 
              data={roomData.players}
              keyExtractor={item => item.userId}
              renderItem={({ item }) => {
                const isMe = item.userId === user?.uid;
                
                // FIXED: Use userStore selectedCharacter if it's "me" and missing in roomData (for backward compat), otherwise use roomData
                let charKey = item.selectedCharacter;
                if (!charKey && isMe) {
                    charKey = (user as any)?.selectedCharacter;
                }
                const charImage = AVATARS[charKey] || AVATARS['default'];
                
                return (
                    <BlurView intensity={isMe ? 30 : 10} tint="light" style={[styles.playerRow, isMe && styles.myPlayerRow]}>
                        <View style={styles.playerLeft}>
                            <View style={[styles.avatarContainer, isMe && styles.myAvatarContainer]}>
                                <Image source={charImage} style={styles.avatarImage} resizeMode="cover" />
                            </View>
                            <View>
                                <Text style={[styles.playerName, isMe && styles.myPlayerName]}>
                                    {item.username || item.displayName || "Unknown"}
                                </Text>
                                {isMe && <Text style={styles.youLabel}>YOU</Text>}
                            </View>
                        </View>
                        
                        <View style={[styles.statusBadge, item.isReady ? styles.statusReady : styles.statusWaiting]}>
                            <Text style={[styles.statusText, item.isReady ? styles.textReady : styles.textWaiting]}>
                                {item.isReady ? 'READY' : 'WAITING'}
                            </Text>
                        </View>
                    </BlurView>
                );
              }}
              contentContainerStyle={{ paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
            />
        </View>

        <View style={styles.footer}>
          <BlurView intensity={80} tint="dark" style={styles.footerBlur}>
              <TouchableOpacity 
                style={[styles.btn, styles.readyBtn, roomData.players.find((p: any) => p.userId === user?.uid)?.isReady && styles.readyBtnActive]} 
                onPress={handleReady}
              >
                <Text style={[styles.btnText, roomData.players.find((p: any) => p.userId === user?.uid)?.isReady && styles.readyTextActive]}>
                  {roomData.players.find((p: any) => p.userId === user?.uid)?.isReady ? 'CANCEL READY' : 'READY UP'}
                </Text>
              </TouchableOpacity>
              
              {isHost && (
                <TouchableOpacity style={[styles.btn, styles.startBtn]} onPress={handleStart}>
                  <Text style={[styles.btnText, { color: '#000' }]}>START MISSION</Text>
                </TouchableOpacity>
              )}
          </BlurView>
        </View>

      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  backBtn: { padding: 10 },
  backText: { color: '#FF5252', fontFamily: 'Exo_700Bold', fontSize: 14 },
  headerTitle: { color: '#FFF', fontSize: 24, fontFamily: 'Exo_700Bold', letterSpacing: 2 },
  
  content: { flex: 1, paddingHorizontal: 20 },
  
  codeCard: { 
      borderRadius: 20, 
      padding: 25, 
      alignItems: 'center', 
      marginBottom: 30,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      backgroundColor: 'rgba(255,255,255,0.05)'
  },
  codeLabel: { color: '#888', fontFamily: 'Exo_700Bold', fontSize: 12, letterSpacing: 2, marginBottom: 10 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  codeText: { color: '#14F195', fontFamily: 'Exo_900Black', fontSize: 42, letterSpacing: 4 },
  copyBtn: { backgroundColor: 'rgba(20, 241, 149, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#14F195' },
  copyBtnText: { color: '#14F195', fontFamily: 'Exo_700Bold', fontSize: 10 },
  codeSub: { color: 'rgba(255,255,255,0.4)', fontFamily: 'Exo_400Regular', fontSize: 12, marginTop: 10 },

  sectionTitle: { color: '#FFF', fontFamily: 'Exo_700Bold', marginBottom: 15, letterSpacing: 1, fontSize: 16 },
  
  playerRow: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: 15, 
      borderRadius: 16, 
      marginBottom: 12,
      overflow: 'hidden',
      backgroundColor: 'rgba(255,255,255,0.03)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)'
  },
  myPlayerRow: {
      borderColor: 'rgba(20, 241, 149, 0.3)',
      backgroundColor: 'rgba(20, 241, 149, 0.05)'
  },
  playerLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  
  avatarContainer: { 
      width: 50, height: 50, 
      borderRadius: 25, 
      backgroundColor: '#000', 
      borderWidth: 2, 
      borderColor: '#333',
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center'
  },
  myAvatarContainer: { borderColor: '#14F195' },
  avatarImage: { width: '100%', height: '100%' },
  
  playerName: { color: '#FFF', fontFamily: 'Exo_700Bold', fontSize: 16 },
  myPlayerName: { color: '#14F195' },
  youLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: 'Exo_700Bold' },
  
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  statusReady: { backgroundColor: 'rgba(20, 241, 149, 0.2)', borderColor: '#14F195' },
  statusWaiting: { backgroundColor: 'rgba(255, 82, 82, 0.1)', borderColor: '#FF5252' },
  
  statusText: { fontFamily: 'Exo_700Bold', fontSize: 10, letterSpacing: 1 },
  textReady: { color: '#14F195' },
  textWaiting: { color: '#FF5252' },

  footer: { 
      position: 'absolute', 
      bottom: 0, left: 0, right: 0,
  },
  footerBlur: {
      padding: 20,
      paddingBottom: 40,
      gap: 15,
      borderTopWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)'
  },
  btn: { padding: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  readyBtn: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  readyBtnActive: { backgroundColor: '#FF5252', borderColor: '#FF5252' },
  startBtn: { backgroundColor: '#14F195', shadowColor: '#14F195', shadowOpacity: 0.5, shadowRadius: 10, elevation: 5 },
  
  btnText: { fontFamily: 'Exo_700Bold', color: '#FFF', fontSize: 16, letterSpacing: 1 },
  readyTextActive: { color: '#FFF' }
});