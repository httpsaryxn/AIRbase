import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator, 
  Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useFonts, Exo_700Bold, Exo_400Regular, Exo_900Black } from '@expo-google-fonts/exo';
import { getFirestore, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useUserStore } from '../store/userStore';
import { db } from '../services/firebaseConfig';

const { width } = Dimensions.get('window');

// Avatar Assets Mapping
const AVATARS: { [key: string]: any } = {
  'yellow': require('../assets/yellow.png'),
  'mint': require('../assets/mint.png'),
  'lavender': require('../assets/lavender.png'),
  'orange': require('../assets/orange.png'),
  'default': require('../assets/mint.png')
};

// Rank Badges
const RANK_BADGES = {
  Gold: require('../assets/gold.png'),
  Silver: require('../assets/silver.png'),
  Bronze: require('../assets/bronze.png'),
};

export const RankingScreen = ({ navigation }: { navigation: any }) => {
  const currentUser = useUserStore((state) => state.user);
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  let [fontsLoaded] = useFonts({
    Exo_700Bold,
    Exo_400Regular,
    Exo_900Black,
  });

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'),
        orderBy('stats.wins', 'desc'),
        limit(50)
      );
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
      }));

      setRankings(data);
    } catch (error) {
      console.error("Error fetching rankings:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderRankItem = ({ item, index }: { item: any, index: number }) => {
    const isCurrentUser = item.id === currentUser?.uid;
    const rank = index + 1;
    let badge = null;
    let rankColor = '#FFF';

    if (rank === 1) {
        badge = RANK_BADGES.Gold;
        rankColor = '#FFD700';
    } else if (rank === 2) {
        badge = RANK_BADGES.Silver;
        rankColor = '#C0C0C0';
    } else if (rank === 3) {
        badge = RANK_BADGES.Bronze;
        rankColor = '#CD7F32';
    }

    return (
      <View style={[styles.rankCard, isCurrentUser && styles.currentUserCard]}>
        <BlurView intensity={isCurrentUser ? 40 : 20} tint="dark" style={styles.blurContainer}>
            
            <View style={styles.rankBadgeContainer}>
                {badge ? (
                    <Image source={badge} style={styles.rankIcon} resizeMode="contain" />
                ) : (
                    <Text style={styles.rankNumber}>#{rank}</Text>
                )}
            </View>

            <Image 
                source={AVATARS[item.selectedCharacter || 'default']} 
                style={styles.avatar} 
                resizeMode="contain" 
            />

            <View style={styles.infoContainer}>
                {/* UPDATED: Show Username prominently */}
                <Text style={[styles.username, { color: rank <= 3 ? rankColor : '#FFF' }]}>
                    {item.username ? (item.username.startsWith('@') ? item.username : `@${item.username}`) : (item.displayName || 'Agent')}
                </Text>
                {/* Removed display name or pushed it to subtext if needed, but request said ONLY username */}
            </View>

            <View style={styles.winsContainer}>
                <Text style={styles.winsCount}>{item.stats?.wins || 0}</Text>
                <Text style={styles.winsLabel}>WINS</Text>
            </View>

        </BlurView>
      </View>
    );
  };

  if (!fontsLoaded) return <View style={styles.loadingContainer} />;

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backBtn}>
                <Text style={styles.backText}>← HOME</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>LEADERBOARD</Text>
            <View style={{width: 60}} /> 
        </View>

        {loading ? (
            <View style={styles.loadingContent}>
                <ActivityIndicator size="large" color="#FFD700" />
                <Text style={styles.loadingText}>Calibrating Ranks...</Text>
            </View>
        ) : (
            <FlatList 
                data={rankings}
                keyExtractor={(item) => item.id}
                renderItem={renderRankItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <View style={styles.listHeader}>
                        <Text style={styles.headerSubtitle}>TOP AGENTS (RANDOM BATTLES)</Text>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No data available yet.</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  backBtn: { padding: 10 },
  backText: { color: '#888', fontFamily: 'Exo_700Bold', fontSize: 14 },
  headerTitle: { color: '#FFD700', fontSize: 24, fontFamily: 'Exo_900Black', letterSpacing: 2 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  listHeader: { marginBottom: 20, alignItems: 'center' },
  headerSubtitle: { color: '#666', fontFamily: 'Exo_700Bold', fontSize: 12, letterSpacing: 1 },
  rankCard: { marginBottom: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  currentUserCard: { borderColor: '#14F195', borderWidth: 2 },
  blurContainer: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  rankBadgeContainer: { width: 40, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  rankIcon: { width: 32, height: 32 },
  rankNumber: { color: '#888', fontFamily: 'Exo_900Black', fontSize: 18 },
  avatar: { width: 50, height: 50, marginRight: 15, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.3)' },
  infoContainer: { flex: 1 },
  username: { fontSize: 18, fontFamily: 'Exo_700Bold' },
  subText: { color: '#888', fontSize: 12, fontFamily: 'Exo_400Regular' },
  winsContainer: { alignItems: 'flex-end', minWidth: 50 },
  winsCount: { color: '#FFD700', fontSize: 22, fontFamily: 'Exo_900Black' },
  winsLabel: { color: '#666', fontSize: 10, fontFamily: 'Exo_700Bold' },
  loadingContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#888', marginTop: 15, fontFamily: 'Exo_700Bold' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#666', fontSize: 16, fontFamily: 'Exo_400Regular' }
});