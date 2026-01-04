import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useFonts, Exo_700Bold, Exo_400Regular } from '@expo-google-fonts/exo';

const { width } = Dimensions.get('window');

interface PlayerResult {
  userId: string;
  displayName: string;
  score: number;
  avgTime: number;
  answers: any[];
}

export const ResultsScreen = ({ navigation, route }: { navigation: any, route: any }) => {
  const { roomData } = route.params;
  
  let [fontsLoaded] = useFonts({
    Exo_700Bold,
    Exo_400Regular,
  });

  if (!fontsLoaded) return <View style={{flex: 1, backgroundColor: '#000'}} />;

  // Calculate results
  const players: PlayerResult[] = roomData.players.map((p: any) => {
    const answers = p.answers || [];
    const correctCount = answers.filter((a: any) => a.correct).length;
    const totalTime = answers.reduce((acc: number, curr: any) => acc + (curr.time || 60), 0);
    const avgTime = answers.length > 0 ? totalTime / answers.length : 0;

    return {
      userId: p.userId,
      displayName: p.displayName,
      score: correctCount,
      avgTime: avgTime,
      answers: answers
    };
  });

  // Sort: Score DESC, then AvgTime ASC
  const sortedPlayers = players.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.avgTime - b.avgTime;
  });

  const renderPlayer = ({ item, index }: { item: PlayerResult, index: number }) => {
    const isWinner = index === 0;
    
    return (
      <BlurView intensity={20} tint="light" style={[styles.playerCard, isWinner && styles.winnerCard]}>
        <View style={styles.rankContainer}>
          <Text style={[styles.rankText, isWinner && styles.winnerText]}>#{index + 1}</Text>
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.playerName}>{item.displayName}</Text>
          <Text style={styles.statsText}>Avg Time: {item.avgTime.toFixed(1)}s</Text>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreText, isWinner && styles.winnerScore]}>
            {item.score} <Text style={styles.scoreTotal}>/ {roomData.questions.length}</Text>
          </Text>
          <Text style={styles.scoreLabel}>CORRECT</Text>
        </View>
      </BlurView>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <Text style={styles.title}>BATTLE RESULTS</Text>
        
        <View style={styles.listContainer}>
            <FlatList
              data={sortedPlayers}
              keyExtractor={(item) => item.userId}
              renderItem={renderPlayer}
              contentContainerStyle={{ padding: 20, gap: 15 }}
              showsVerticalScrollIndicator={false}
            />
        </View>

        <TouchableOpacity 
            style={styles.homeBtn} 
            onPress={() => navigation.navigate('Home')}
        >
            <Text style={styles.homeBtnText}>RETURN TO BASE</Text>
        </TouchableOpacity>

      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  title: {
    fontSize: 32,
    fontFamily: 'Exo_700Bold',
    color: '#FFF',
    textAlign: 'center',
    marginVertical: 30,
    letterSpacing: 2,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  listContainer: { flex: 1 },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  winnerCard: {
    borderColor: '#FFD700', // Gold border
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  rankContainer: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankText: {
    fontSize: 28,
    fontFamily: 'Exo_700Bold',
    color: '#888',
  },
  winnerText: {
    color: '#FFD700',
    fontSize: 32,
  },
  infoContainer: {
    flex: 1,
  },
  playerName: {
    fontSize: 20,
    fontFamily: 'Exo_700Bold',
    color: '#FFF',
    marginBottom: 4,
  },
  statsText: {
    fontSize: 14,
    fontFamily: 'Exo_400Regular',
    color: '#CCC',
  },
  scoreContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 28,
    fontFamily: 'Exo_700Bold',
    color: '#FFF',
  },
  winnerScore: {
    color: '#FFD700',
  },
  scoreTotal: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
  },
  scoreLabel: {
    fontSize: 10,
    fontFamily: 'Exo_700Bold',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  homeBtn: {
    backgroundColor: '#FFF',
    margin: 20,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 5,
    marginBottom: 40,
  },
  homeBtnText: {
    color: '#000',
    fontSize: 18,
    fontFamily: 'Exo_700Bold',
    letterSpacing: 1,
  },
});