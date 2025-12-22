import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useFonts, Exo_700Bold, Exo_400Regular } from '@expo-google-fonts/exo';
import { useUserStore } from '../store/userStore';
// Removed TutorialOverlay import as requested

const { width, height } = Dimensions.get('window');

// Video sources mapping
const CHARACTER_VIDEOS = {
  mint: require('../assets/mint.mp4'),   
  yellow: require('../assets/yellow.mp4'), 
};

const THEME_COLORS = {
  mint: '#A8DBCD',
  yellow: '#F9E392',
};

const RANK_BADGES = {
  Bronze: require('../assets/bronze.png'), 
  Silver: require('../assets/silver.png'), 
  Gold: require('../assets/gold.png'),   
  Grandmaster: require('../assets/grandmaster.png'), 
};

const COACHING_BADGES = {
  PhysicsWallah: require('../assets/pw.png'), 
  Allen: require('../assets/allen.png'),        
  None: null,
};

interface DisplayUser {
  displayName: string;
  username: string;
  rank: string;
  xp: number;
  coaching?: string;
  stats?: {
    wins: number;
    losses: number;
    totalMatches: number;
  };
}

// Small Cloud Component for Tutorial
// Added 'arrowDirection' prop to handle up/down/left/right pointing arrows
const TutorialCloud = ({ text, style, delay = 0, arrowDirection = 'down' }: { text: string, style: any, delay?: number, arrowDirection?: 'up' | 'down' | 'left' | 'right' }) => {
  const [visible, setVisible] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Show after delay
    const showTimer = setTimeout(() => {
      setVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      // Hide after showing for a while (e.g., 5 seconds)
      const hideTimer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => setVisible(false));
      }, 5000);

      return () => clearTimeout(hideTimer);
    }, delay);

    return () => clearTimeout(showTimer);
  }, []);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.cloudBubble, style, { opacity: fadeAnim }]}>
      {arrowDirection === 'up' && <View style={[styles.cloudTail, styles.cloudTailUp]} />}
      {arrowDirection === 'left' && <View style={[styles.cloudTail, styles.cloudTailLeft]} />}
      
      <Text style={styles.cloudText}>{text}</Text>
      
      {arrowDirection === 'down' && <View style={styles.cloudTail} />}
      {arrowDirection === 'right' && <View style={[styles.cloudTail, styles.cloudTailRight]} />}
    </Animated.View>
  );
};

export const HomeScreen = () => {
  const user = useUserStore((state) => state.user);
  const [selectedSubject, setSelectedSubject] = useState('ALL(random)');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'mint' | 'yellow'>('mint'); 
  
  const subjects = ['ALL(random)', 'Physics', 'Chemistry', 'Math'];

  let [fontsLoaded] = useFonts({
    Exo_700Bold,
    Exo_400Regular,
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

  const displayUser: DisplayUser = user ? {
    displayName: user.displayName || "Agent",
    username: (user as any).username || user.displayName || "Agent",
    rank: user.rank || "Bronze",
    xp: user.xp || 0,
    coaching: (user as any).coaching || "PhysicsWallah",
    stats: user.stats
  } : {
    displayName: "PlayerOne",
    username: "@PlayerOne",
    rank: "Grandmaster",
    xp: 2450,
    coaching: "PhysicsWallah",
    stats: { wins: 42, losses: 12, totalMatches: 54 }
  };

  return (
    <View style={[styles.container, { backgroundColor: THEME_COLORS[currentTheme] }]}>
      <View style={styles.heroContainer}>
        <View style={styles.characterVideoContainer}>
           <VideoView
            style={styles.characterVideo}
            player={player}
            contentFit="cover"
            nativeControls={false}
          />
        </View>

        <View style={styles.gamertagPanelWrapper}>
            <BlurView intensity={20} tint="light" style={styles.gamertagPanel}>
                <View style={[styles.rankBadge, { backgroundColor: currentTheme === 'yellow' ? '#FFD700' : '#4ADE80' }]}>
                    <Image 
                      source={RANK_BADGES[displayUser.rank as keyof typeof RANK_BADGES]} 
                      style={styles.badgeImage} 
                      resizeMode="contain"
                    />
                    <Text style={styles.rankText}>#{displayUser.rank === "Grandmaster" ? "1" : "99"}</Text>
                </View>

                <Text style={styles.gamertagText}>
                    {displayUser.username.startsWith('@') ? displayUser.username : `@${displayUser.username}`}
                </Text>
                
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
            
            {/* Tutorial Cloud for Gamertag - Centered Above Panel */}
            <TutorialCloud 
              text="Your Identity Card" 
              style={{ position: 'absolute', top: -50, alignSelf: 'center' }} 
              delay={500}
            />
        </View>
      </View>

      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        <View style={styles.header}>
            <View style={{position: 'relative', flexDirection: 'row', alignItems: 'center'}}>
                <TouchableOpacity style={styles.profileButton}>
                    <View style={styles.avatarCircle}>
                        <Text style={{fontSize: 24}}>👤</Text>
                    </View>
                </TouchableOpacity>
                {/* Tutorial Cloud for Profile - Moved to RIGHT, pointing LEFT */}
                <TutorialCloud 
                  text="Your Account" 
                  style={{ position: 'absolute', left: 70, top: 15 }} 
                  delay={200}
                  arrowDirection="left"
                />
            </View>

            <TouchableOpacity style={styles.friendsPanelWrapper}>
                <BlurView intensity={30} tint="light" style={styles.friendsPanel}>
                    <View style={styles.friendsDot} />
                    <Text style={{fontSize: 20}}>☰</Text>
                </BlurView>
            </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.actionZone}>
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
            {/* Tutorial Cloud for Subject */}
            <TutorialCloud 
              text="Pick Subject" 
              style={{ position: 'absolute', top: -45, left: 10 }} 
              delay={800}
            />
        </View>

        <View style={{position: 'relative'}}>
            <TouchableOpacity style={styles.battleButton} activeOpacity={0.8}>
                <BlurView intensity={40} tint="dark" style={[styles.battleButtonBlur, { backgroundColor: currentTheme === 'yellow' ? '#FFD700' : '#4ADE80' }]}>
                    <Text style={styles.battleButtonText}>BATTLE</Text>
                    <Text style={styles.battleButtonSub}>FIND MATCH</Text>
                </BlurView>
            </TouchableOpacity>
            {/* Tutorial Cloud for Battle */}
            <TutorialCloud 
              text="Start Fight!" 
              style={{ position: 'absolute', top: -45, right: 10 }} 
              delay={1000}
            />
        </View>
      </View>

      <View style={styles.bottomNavContainer}>
        <View style={{position: 'relative'}}>
            <BlurView intensity={30} tint="light" style={styles.bottomNav}>
                <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTheme(currentTheme === 'mint' ? 'yellow' : 'mint')}>
                    <Text style={{fontSize: 24, color: '#000'}}>🏠</Text>
                    <View style={styles.activeDot} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem}>
                    <Text style={{fontSize: 24, color: 'rgba(0,0,0,0.5)'}}>🏆</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem}>
                    <Text style={{fontSize: 24, color: 'rgba(0,0,0,0.5)'}}>👤</Text>
                </TouchableOpacity>
            </BlurView>
            {/* Tutorial Cloud for Navigation */}
            <TutorialCloud 
              text="Menu" 
              style={{ position: 'absolute', top: -45, alignSelf: 'center' }} 
              delay={1200}
            />
        </View>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
    left: width * 0.05, // Reduced left margin to effectively center wider panel
    right: width * 0.05, // Reduced right margin
    alignItems: 'center',
  },
  gamertagPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20, // Increased padding
    paddingVertical: 10, // Increased padding
    borderRadius: 24, // Slightly larger radius
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    minWidth: '60%', // Ensure a minimum width to reduce clutter
    justifyContent: 'center', // Center content
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 15, // More spacing
  },
  badgeImage: {
    width: 18,
    height: 18,
    marginRight: 6,
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
    fontFamily: 'Exo_700Bold', 
    marginRight: 15, // More spacing
  },
  coachingBadgeContainer: {
    marginRight: 15, // More spacing
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
  },
  coachingBadgeImage: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80', 
  },
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
  actionZone: {
    position: 'absolute',
    bottom: 140, 
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
    borderColor: 'rgba(255,255,255,0.4)', 
  },
  dropdownBlur: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)', 
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  dropdownLabel: {
    color: 'rgba(0,0,0,0.5)', 
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
    color: '#000', 
    fontSize: 16,
    fontFamily: 'Exo_700Bold', 
  },
  dropdownOptions: {
    position: 'absolute',
    bottom: 70, 
    left: 0,
    right: 0,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  dropdownOptionsBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)', 
    paddingVertical: 5,
  },
  optionItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  optionText: {
    color: 'rgba(0,0,0,0.6)',
    fontSize: 16,
    fontFamily: 'Exo_700Bold', 
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
    fontFamily: 'Exo_700Bold', 
    letterSpacing: 1,
  },
  battleButtonSub: {
    color: 'rgba(0,0,0,0.6)',
    fontSize: 10,
    fontWeight: 'bold',
  },
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
  cloudBubble: {
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
    maxWidth: 150,
  },
  cloudText: {
    fontSize: 12,
    fontFamily: 'Exo_700Bold',
    color: '#000',
    textAlign: 'center',
  },
  cloudTail: {
    position: 'absolute',
    bottom: -6,
    left: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFF',
  },
  // Added style for upward pointing tail
  cloudTailUp: {
    bottom: 'auto',
    top: -6,
    borderTopWidth: 0,
    borderBottomWidth: 6,
    borderBottomColor: '#FFF',
  },
  // Added style for Left pointing tail (placed on right side of cloud)
  cloudTailLeft: {
    bottom: 'auto',
    top: 10, // Adjust vertical pos
    left: -6, // Push outside left edge
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderRightWidth: 6,
    borderLeftWidth: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#FFF',
  },
  // Added style for Right pointing tail
  cloudTailRight: {
    bottom: 'auto',
    top: 10,
    left: 'auto',
    right: -6,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 6,
    borderRightWidth: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFF',
  }
});