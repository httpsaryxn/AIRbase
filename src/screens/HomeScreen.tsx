import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BackgroundLayout } from '../components/ui/BackgroundLayout';
import { GlassCard } from '../components/ui/GlassCard';
import { useUserStore } from '../store/userStore';

export const HomeScreen = () => {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);

  return (
    <BackgroundLayout>
      <View style={styles.container}>
        
        {/* Header Profile Section */}
        <GlassCard style={styles.profileCard}>
           <View style={styles.avatar}>
             <Text style={{ fontSize: 20 }}>👤</Text>
           </View>
           <View>
             <Text style={styles.userName}>{user?.displayName}</Text>
             <Text style={styles.userStats}>{user?.rank} • {user?.xp} XP</Text>
           </View>
        </GlassCard>

        <Text style={styles.sectionTitle}>Game Modes</Text>

        <View style={styles.grid}>
            <GlassCard style={styles.gameCard}>
                <Text style={styles.emoji}>⚔️</Text>
                <Text style={styles.cardTitle}>Random Battle</Text>
            </GlassCard>

            <GlassCard style={styles.gameCard}>
                <Text style={styles.emoji}>🤝</Text>
                <Text style={styles.cardTitle}>Friend Battle</Text>
            </GlassCard>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          onPress={() => setUser(null)}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

      </View>
    </BackgroundLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 48,
    gap: 24, // Adds spacing between children
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    height: 48,
    width: 48,
    borderRadius: 24,
    backgroundColor: '#6B7280', // gray-500
    marginRight: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  userStats: {
    color: '#FF754C', // brand-accent
    fontWeight: 'bold',
    fontSize: 14,
  },
  sectionTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gameCard: {
    width: '48%',
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  logoutButton: {
    marginTop: 'auto', // Pushes to bottom
    backgroundColor: 'rgba(239, 68, 68, 0.2)', // red-500 with opacity
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    alignItems: 'center',
  },
  logoutText: {
    color: '#F87171', // red-400
    fontWeight: 'bold',
  },
});