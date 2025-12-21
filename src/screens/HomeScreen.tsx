import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useFonts, PixelifySans_400Regular, PixelifySans_700Bold } from '@expo-google-fonts/pixelify-sans';
import { useUserStore } from '../store/userStore';

const { width, height } = Dimensions.get('window');

// Video sources mapping - assuming files will be in assets
const CHARACTER_VIDEOS = {
  mint: require('../assets/mint.mp4'),   // Placeholder
  yellow: require('../assets/yellow.mp4'), // Placeholder
};

const THEME_COLORS = {
  mint: '#A8DBCD',
  yellow: '#F9E392',
};

// Placeholder images for ranks and coaching institutes
const RANK_BADGES = {
  Bronze: require('../assets/bronze.png'), // Placeholder
  Silver: require('../assets/silver.png'), // Placeholder
  Gold: require('../assets/gold.png'),   // Placeholder
  Grandmaster: require('../assets/grandmaster.png'), // Placeholder
};

const COACHING_BADGES = {
  PhysicsWallah: require('../assets/pw.png'), // Placeholder
  Allen: require('../assets/allen.png'),         // Placeholder
  None: null,
};

// Define a local interface for the user data used in this screen
interface DisplayUser {
  displayName: string;
  rank: string;
  xp: number;
  coaching?: string;
  stats?: {
    wins: number;
    losses: number;
    totalMatches: number;
  };
}

export const HomeScreen = () => {
  const user = useUserStore((state) => state.user);
  const [selectedSubject, setSelectedSubject] = useState('ALL(random)');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'mint' | 'yellow'>('mint'); 
  
  const subjects = ['ALL(random)', 'Physics', 'Chemistry', 'Math'];

  let [fontsLoaded] = useFonts({
    PixelifySans_400Regular,
    PixelifySans_700Bold,
  });

  const player = useVideoPlayer(CHARACTER_VIDEOS[currentTheme], player => {
    player.loop = true;
    player.play();
    player.muted = true;
  });

  useEffect(() => {
    if (player) {
      player.replace(CHARACTER_VIDEOS[currentTheme]);
      player.loop = true;
      player.play();
    }
  }, [currentTheme, player]);

  if (!fontsLoaded) {
    return <View style={{flex: 1, backgroundColor: '#000'}} />;
  }

  // Construct a display user object.
  // We use the user from store if available, and merge/fallback with default data.
  // We explicitly cast to DisplayUser to satisfy TypeScript regarding the 'coaching' property.
  const displayUser: DisplayUser = user ? {
    ...user,
    // If your UserProfile in store doesn't have 'coaching', we add a default here or check if it exists in 'user' (if user is any)
    coaching: (user as any).coaching || "PhysicsWallah" 
  } : {
    displayName: "PlayerOne",
    rank: "Grandmaster",
    xp: 2450,
    coaching: "PhysicsWallah",
    stats: { wins: 42, losses: 12, totalMatches: 54 }
  };

  return (
    <View style={[styles.container, { backgroundColor: THEME_COLORS[currentTheme] }]}>
      {/* 1. HERO SECTION (Background + Character) */}
      <View style={styles.heroContainer}>
        {/* Character Video */}
        <View style={styles.characterVideoContainer}>
           <VideoView
            style={styles.characterVideo}
            player={player}
            contentFit="cover"
            nativeControls={false}
          />
        </View>

        {/* Gamertag Panel - Enhanced with Rank & Coaching Badges */}
        <View style={styles.gamertagPanelWrapper}>
            <BlurView intensity={20} tint="light" style={styles.gamertagPanel}>
                {/* Rank Badge */}
                <View style={[styles.rankBadge, { backgroundColor: currentTheme === 'yellow' ? '#FFD700' : '#4ADE80' }]}>
                    <Image 
                      source={RANK_BADGES[displayUser.rank as keyof typeof RANK_BADGES]} 
                      style={styles.badgeImage} 
                      resizeMode="contain"
                    />
                    <Text style={styles.rankText}>#{displayUser.rank === "Grandmaster" ? "1" : "99"}</Text>
                </View>

                <Text style={styles.gamertagText}>{displayUser.displayName}</Text>
                
                {/* Coaching Badge */}
                {displayUser.coaching && COACHING_BADGES[displayUser.coaching as keyof typeof COACHING_BADGES] && (
                  <View style={styles.coachingBadgeContainer}>
                    <Image 
                      source={COACHING_BADGES[displayUser.coaching as keyof typeof COACHING_BADGES]} 
                      style={styles.coachingBadgeImage} 
                      resizeMode="contain"
                    />
                  </View>
                )}

                <View style={styles.onlineDot} />
            </BlurView>
        </View>
      </View>

      {/* 2. HEADER (Profile & Friends) */}
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        <View style={styles.header}>
            {/* Profile Avatar Button */}
            <TouchableOpacity style={styles.profileButton}>
                <View style={styles.avatarCircle}>
                    <Text style={{fontSize: 24}}>👤</Text>
                </View>
            </TouchableOpacity>

            {/* Friends/Menu Indicator */}
            <TouchableOpacity style={styles.friendsPanelWrapper}>
                <BlurView intensity={30} tint="light" style={styles.friendsPanel}>
                    <View style={styles.friendsDot} />
                    <Text style={{fontSize: 20}}>☰</Text>
                </BlurView>
            </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* 3. ACTION ZONE (Subject Select & Battle) */}
      <View style={styles.actionZone}>
        {/* Subject Dropdown - Enhanced Glassmorphism */}
        <View style={styles.dropdownContainer}>
            <TouchableOpacity 
                style={styles.dropdownButton}
                onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                activeOpacity={0.8}
            >
                <BlurView intensity={60} tint="light" style={styles.dropdownBlur}>
                    <Text style={styles.dropdownLabel}>SUBJECT</Text>
                    <View style={styles.dropdownValueRow}>
                        <Text style={styles.dropdownValue}>{selectedSubject}</Text>
                        <Text style={{color: 'rgba(0,0,0,0.5)', fontSize: 12}}>▼</Text>
                    </View>
                </BlurView>
            </TouchableOpacity>
            
            {/* Dropdown Options (Conditional) */}
            {isDropdownOpen && (
                <View style={styles.dropdownOptions}>
                    <BlurView intensity={70} tint="light" style={styles.dropdownOptionsBlur}>
                        {subjects.map((subj) => (
                            <TouchableOpacity 
                                key={subj} 
                                style={styles.optionItem}
                                onPress={() => {
                                    setSelectedSubject(subj);
                                    setIsDropdownOpen(false);
                                }}
                            >
                                <Text style={[
                                    styles.optionText, 
                                    selectedSubject === subj && styles.optionTextSelected
                                ]}>
                                    {subj}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </BlurView>
                </View>
            )}
        </View>

        {/* Battle Button */}
        <TouchableOpacity style={styles.battleButton} activeOpacity={0.8}>
            <BlurView intensity={40} tint="dark" style={[styles.battleButtonBlur, { backgroundColor: currentTheme === 'yellow' ? '#FFD700' : '#4ADE80' }]}>
                <Text style={styles.battleButtonText}>BATTLE</Text>
                <Text style={styles.battleButtonSub}>FIND MATCH</Text>
            </BlurView>
        </TouchableOpacity>
      </View>

      {/* 4. BOTTOM NAV */}
      <View style={styles.bottomNavContainer}>
        <BlurView intensity={30} tint="light" style={styles.bottomNav}>
            {/* Home Tab (Active) */}
            <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTheme(currentTheme === 'mint' ? 'yellow' : 'mint')}>
                <Text style={{fontSize: 24, color: '#000'}}>🏠</Text>
                <View style={styles.activeDot} />
            </TouchableOpacity>

            {/* Trophy Tab */}
            <TouchableOpacity style={styles.navItem}>
                <Text style={{fontSize: 24, color: 'rgba(0,0,0,0.5)'}}>🏆</Text>
            </TouchableOpacity>

            {/* User Tab */}
            <TouchableOpacity style={styles.navItem}>
                <Text style={{fontSize: 24, color: 'rgba(0,0,0,0.5)'}}>👤</Text>
            </TouchableOpacity>
        </BlurView>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Background color is now dynamic via inline style
  },
  // --- HERO SECTION ---
  heroContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  characterVideoContainer: {
    position: 'absolute',
    top: 100, 
    left: 0,
    width: width,
    height: 450, 
  },
  characterVideo: {
    width: '100%',
    height: '100%',
  },
  gamertagPanelWrapper: {
    position: 'absolute',
    top: 600, 
    left: width * 0.1, 
    right: width * 0.1,
    alignItems: 'center',
  },
  gamertagPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
  },
  badgeImage: {
    width: 16,
    height: 16,
    marginRight: 4,
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  gamertagText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'PixelifySans_700Bold',
    marginRight: 10,
  },
  coachingBadgeContainer: {
    marginRight: 10,
    padding: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
  },
  coachingBadgeImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80', // Green
  },

  // --- HEADER ---
  headerSafeArea: {
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  profileButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendsPanelWrapper: {
    borderRadius: 25,
    overflow: 'hidden',
    height: 50,
    justifyContent: 'center',
  },
  friendsPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    gap: 10,
  },
  friendsDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ADE80',
  },

  // --- ACTION ZONE ---
  actionZone: {
    position: 'absolute',
    bottom: 140, // Above bottom nav
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 15,
    zIndex: 5,
  },
  dropdownContainer: {
    flex: 1,
    height: 65,
  },
  dropdownButton: {
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)', // Slightly more visible border
  },
  dropdownBlur: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)', // Lighter background for visible glass effect
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  dropdownLabel: {
    color: 'rgba(0,0,0,0.5)', // Darker text for light glass
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dropdownValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownValue: {
    color: '#000', // Dark text for light glass
    fontSize: 16,
    fontFamily: 'PixelifySans_700Bold',
  },
  dropdownOptions: {
    position: 'absolute',
    bottom: 70, // Appears above the button
    left: 0,
    right: 0,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  dropdownOptionsBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)', // Very distinct glass background
    paddingVertical: 5,
  },
  optionItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  optionText: {
    color: 'rgba(0,0,0,0.6)',
    fontSize: 16,
    fontFamily: 'PixelifySans_700Bold',
  },
  optionTextSelected: {
    color: '#000',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  battleButton: {
    width: 140,
    height: 65,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  battleButtonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  battleButtonText: {
    color: '#000',
    fontSize: 20,
    fontFamily: 'PixelifySans_700Bold',
    letterSpacing: 1,
  },
  battleButtonSub: {
    color: 'rgba(0,0,0,0.6)',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // --- BOTTOM NAV ---
  bottomNavContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    overflow: 'hidden',
    gap: 40,
    // Shadows
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#000',
    marginTop: 4,
  },
});