import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList, 
  Dimensions, 
  ActivityIndicator, 
  Image,
  LayoutAnimation,
  Platform,
  UIManager
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useFonts, Exo_700Bold, Exo_400Regular } from '@expo-google-fonts/exo';
import { useUserStore } from '../store/userStore';
import { db } from '../services/firebaseConfig';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';

const { width } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const AVATARS: { [key: string]: any } = {
  'yellow': require('../assets/yellow.png'),
  'mint': require('../assets/mint.png'),
  'lavender': require('../assets/lavender.png'),
  'orange': require('../assets/orange.png'),
  'default': require('../assets/mint.png')
};

export const BattleHistoryScreen = ({ navigation }: { navigation: any }) => {
  const user = useUserStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<'random' | 'custom'>('random');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  let [fontsLoaded] = useFonts({
    Exo_700Bold,
    Exo_400Regular,
  });

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user, activeTab]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'battleRooms'),
        orderBy('createdAt', 'desc'),
        limit(50) 
      );
      
      const snapshot = await getDocs(q);
      
      const fetchedHistory = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(room => {
            const isParticipant = room.players?.some((p: any) => p.userId === user?.uid);
            if (!isParticipant) return false;

            const isQuick = room.roomCode === 'QUICK';
            return activeTab === 'random' ? isQuick : !isQuick;
        });

      setHistory(fetchedHistory);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const renderHistoryItem = ({ item }: { item: any }) => {
    const myPlayer = item.players.find((p: any) => p.userId === user?.uid);
    const opponent = item.players.find((p: any) => p.userId !== user?.uid) || { displayName: 'Searching...', selectedCharacter: 'default', score: 0 };
    
    const isWin = (myPlayer?.score || 0) > (opponent?.score || 0);
    const isDraw = (myPlayer?.score || 0) === (opponent?.score || 0);
    const resultText = isWin ? 'VICTORY' : isDraw ? 'DRAW' : 'DEFEAT';
    const resultColor = isWin ? '#14F195' : isDraw ? '#FFD700' : '#FF5252';

    const date = item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Recent';
    const time = item.createdAt?.toDate ? item.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';

    const isExpanded = expandedId === item.id;

    return (
      <TouchableOpacity 
        style={styles.historyCard} 
        activeOpacity={0.9}
        onPress={() => toggleExpand(item.id)}
      >
        <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
            <View style={styles.row}>
                <View style={[styles.resultBadge, { backgroundColor: `${resultColor}20`, borderColor: resultColor }]}>
                    <Text style={[styles.resultText, { color: resultColor }]}>{resultText}</Text>
                </View>

                <View style={styles.vsInfo}>
                    <Text style={styles.dateText}>{date} • {time}</Text>
                    {/* UPDATED: Show Opponent Username */}
                    <Text style={styles.opponentName}>vs {opponent.username || opponent.displayName}</Text>
                </View>

                <View style={styles.scoreBox}>
                    <Text style={styles.scoreText}>{myPlayer?.score || 0} - {opponent.score || 0}</Text>
                </View>
            </View>

            {isExpanded && (
                <View style={styles.detailsContainer}>
                    <View style={styles.divider} />
                    <View style={styles.detailRow}>
                        <View style={styles.playerDetail}>
                            <Image source={AVATARS[myPlayer?.selectedCharacter || 'mint']} style={styles.smallAvatar} />
                            <Text style={styles.detailName}>YOU</Text>
                            <Text style={styles.detailScore}>{myPlayer?.score || 0} pts</Text>
                        </View>
                        <Text style={styles.vsDetail}>VS</Text>
                        <View style={styles.playerDetail}>
                            <Image source={AVATARS[opponent?.selectedCharacter || 'default']} style={styles.smallAvatar} />
                            {/* UPDATED: Show Opponent Username */}
                            <Text style={styles.detailName}>{opponent.username || opponent.displayName}</Text>
                            <Text style={styles.detailScore}>{opponent.score || 0} pts</Text>
                        </View>
                    </View>
                    <View style={styles.statsRow}>
                        <Text style={styles.statLabel}>Subject: <Text style={styles.statValue}>{item.settings?.subject?.toUpperCase() || 'N/A'}</Text></Text>
                        <Text style={styles.statLabel}>Section: <Text style={styles.statValue}>{item.settings?.section?.toUpperCase() || 'MCQ'}</Text></Text>
                    </View>
                </View>
            )}
        </BlurView>
      </TouchableOpacity>
    );
  };

  if (!fontsLoaded) return <View style={styles.loadingContainer} />;

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backBtn}>
                <Text style={styles.backText}>← BACK</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>BATTLE LOGS</Text>
            <View style={{width: 60}} /> 
        </View>

        <View style={styles.tabContainer}>
            <TouchableOpacity 
                style={[styles.tab, activeTab === 'random' && styles.activeTab]}
                onPress={() => setActiveTab('random')}
            >
                <Text style={[styles.tabText, activeTab === 'random' && styles.activeTabText]}>RANDOM</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.tab, activeTab === 'custom' && styles.activeTab]}
                onPress={() => setActiveTab('custom')}
            >
                <Text style={[styles.tabText, activeTab === 'custom' && styles.activeTabText]}>CUSTOM</Text>
            </TouchableOpacity>
        </View>

        {loading ? (
            <View style={styles.loadingContent}>
                <ActivityIndicator size="large" color="#14F195" />
                <Text style={styles.loadingText}>Retrieving Archives...</Text>
            </View>
        ) : (
            <FlatList 
                data={history}
                keyExtractor={(item) => item.id}
                renderItem={renderHistoryItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No battles recorded yet.</Text>
                        <Text style={styles.emptySubText}>Join the arena to forge your legacy!</Text>
                    </View>
                }
            />
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  loadingContainer: { flex: 1, backgroundColor: '#1a1a1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 10 },
  backBtn: { padding: 10 },
  backText: { color: '#888', fontFamily: 'Exo_700Bold', fontSize: 14 },
  headerTitle: { color: '#FFF', fontSize: 24, fontFamily: 'Exo_700Bold', letterSpacing: 2 },
  tabContainer: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#14F195' },
  tabText: { color: '#888', fontFamily: 'Exo_700Bold', fontSize: 14 },
  activeTabText: { color: '#000' },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  historyCard: { marginBottom: 15, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  blurContainer: { padding: 15 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  resultText: { fontFamily: 'Exo_700Bold', fontSize: 12, letterSpacing: 1 },
  vsInfo: { flex: 1, paddingHorizontal: 15 },
  dateText: { color: '#888', fontSize: 12, fontFamily: 'Exo_400Regular', marginBottom: 2 },
  opponentName: { color: '#FFF', fontSize: 16, fontFamily: 'Exo_700Bold' },
  scoreBox: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  scoreText: { color: '#FFF', fontFamily: 'Exo_700Bold', fontSize: 16 },
  detailsContainer: { marginTop: 15 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 15 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 20 },
  playerDetail: { alignItems: 'center' },
  smallAvatar: { width: 40, height: 40, marginBottom: 8, resizeMode: 'contain' },
  detailName: { color: '#888', fontSize: 12, fontFamily: 'Exo_700Bold', marginBottom: 2 },
  detailScore: { color: '#FFF', fontSize: 18, fontFamily: 'Exo_700Bold' },
  vsDetail: { color: '#444', fontSize: 14, fontFamily: 'Exo_700Bold' },
  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, backgroundColor: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 8 },
  statLabel: { color: '#888', fontSize: 12, fontFamily: 'Exo_400Regular' },
  statValue: { color: '#FFF', fontFamily: 'Exo_700Bold' },
  loadingContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#888', marginTop: 15, fontFamily: 'Exo_700Bold' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#FFF', fontSize: 18, fontFamily: 'Exo_700Bold', marginBottom: 8 },
  emptySubText: { color: '#666', fontSize: 14, fontFamily: 'Exo_400Regular' }
});