import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TextInput, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useFonts, Exo_700Bold, Exo_400Regular } from '@expo-google-fonts/exo';
import { useUserStore } from '../store/userStore';
import { db } from '../services/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

// Avatar Assets Mapping
const AVATARS: { [key: string]: any } = {
  'yellow': require('../assets/yellow.png'),
  'mint': require('../assets/mint.png'),
  'lavender': require('../assets/lavender.png'),
  'orange': require('../assets/orange.png'),
  'default': require('../assets/mint.png')
};

const COACHING_OPTIONS = ['PhysicsWallah', 'Allen', 'Aakash', 'Resonance', 'Self Study'];
const STANDARD_OPTIONS = ['11th', '12th', 'Dropper'];

export const AccountScreen = ({ navigation }: { navigation: any }) => {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [username, setUsername] = useState((user as any)?.username || user?.displayName || '');
  const [standard, setStandard] = useState((user as any)?.standard || '12th');
  const [coaching, setCoaching] = useState((user as any)?.coaching || 'PhysicsWallah');
  const [selectedCharacter, setSelectedCharacter] = useState((user as any)?.selectedCharacter || 'mint');

  let [fontsLoaded] = useFonts({
    Exo_700Bold,
    Exo_400Regular,
  });

  if (!fontsLoaded) return <View style={styles.loadingContainer} />;

  const handleSave = async () => {
    if (!user?.uid) return;
    
    if (!username.trim()) {
        Alert.alert("Error", "Username cannot be empty.");
        return;
    }

    setLoading(true);
    try {
        const userRef = doc(db, 'users', user.uid);
        const updates = {
            username: username.trim(),
            standard,
            coaching,
            selectedCharacter
        };

        await updateDoc(userRef, updates);
        
        setUser({ ...user, ...updates } as any);
        setIsEditing(false);
        Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
        console.error("Error updating profile:", error);
        Alert.alert("Error", "Failed to update profile.");
    } finally {
        setLoading(false);
    }
  };

  const renderEditField = (label: string, value: string, setValue: (val: string) => void, options?: string[]) => {
      return (
          <View style={styles.fieldContainer}>
              <Text style={styles.label}>{label}</Text>
              {options ? (
                  <View style={styles.optionsRow}>
                      {options.map(opt => (
                          <TouchableOpacity 
                            key={opt} 
                            style={[styles.optionChip, value === opt && styles.optionSelected]}
                            onPress={() => setValue(opt)}
                          >
                              <Text style={[styles.optionText, value === opt && styles.optionTextSelected]}>{opt}</Text>
                          </TouchableOpacity>
                      ))}
                  </View>
              ) : (
                  <TextInput 
                    style={styles.input} 
                    value={value} 
                    onChangeText={setValue}
                    placeholderTextColor="#666"
                    autoCapitalize="none" 
                  />
              )}
          </View>
      );
  };

  const renderReadOnlyField = (label: string, value: string) => (
      <View style={styles.readOnlyRow}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
      </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        
        {/* Header */}
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backBtn}>
                <Text style={styles.backText}>← HOME</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>AGENT PROFILE</Text>
            <TouchableOpacity 
                style={styles.editBtn} 
                onPress={() => isEditing ? handleSave() : setIsEditing(true)}
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="#14F195" /> : (
                    <Text style={styles.editBtnText}>{isEditing ? "SAVE" : "EDIT"}</Text>
                )}
            </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
            
            {/* Avatar Section */}
            <View style={styles.avatarSection}>
                <View style={[styles.avatarContainer, { borderColor: isEditing ? '#14F195' : 'rgba(255,255,255,0.2)' }]}>
                    {/* UPDATED: Added borderRadius to Image to make it circular within the container */}
                    <Image 
                        source={AVATARS[selectedCharacter] || AVATARS['default']} 
                        style={styles.avatar} 
                        resizeMode="cover" 
                    />
                </View>
                
                {isEditing && (
                    <View style={styles.characterSelector}>
                        {Object.keys(AVATARS).filter(k => k !== 'default').map(charKey => (
                            <TouchableOpacity 
                                key={charKey} 
                                onPress={() => setSelectedCharacter(charKey)}
                                style={[styles.charOption, selectedCharacter === charKey && styles.charOptionSelected]}
                            >
                                <Image source={AVATARS[charKey]} style={styles.smallCharImg} resizeMode="contain" />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {!isEditing && (
                    <View style={styles.rankBadge}>
                        <Text style={styles.rankText}>{user?.rank || 'ROOKIE'}</Text>
                    </View>
                )}
            </View>

            {/* Info Card */}
            <BlurView intensity={20} tint="dark" style={styles.infoCard}>
                {isEditing ? (
                    <>
                        {renderEditField("USERNAME (@)", username, setUsername)}
                        {renderEditField("STANDARD", standard, setStandard, STANDARD_OPTIONS)}
                        <Text style={styles.label}>AFFILIATION</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20}}>
                            {COACHING_OPTIONS.map(opt => (
                                <TouchableOpacity 
                                    key={opt} 
                                    style={[styles.optionChip, coaching === opt && styles.optionSelected]}
                                    onPress={() => setCoaching(opt)}
                                >
                                    <Text style={[styles.optionText, coaching === opt && styles.optionTextSelected]}>{opt}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </>
                ) : (
                    <>
                        {renderReadOnlyField("USERNAME", username.startsWith('@') ? username : `@${username}`)}
                        <View style={styles.divider} />
                        {renderReadOnlyField("STANDARD", standard)}
                        {renderReadOnlyField("AFFILIATION", coaching)}
                        <View style={styles.divider} />
                        
                        <View style={styles.statsContainer}>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{user?.stats?.wins || 0}</Text>
                                <Text style={styles.statLabel}>WINS</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{user?.stats?.totalMatches || 0}</Text>
                                <Text style={styles.statLabel}>BATTLES</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{user?.xp || 0}</Text>
                                <Text style={styles.statLabel}>XP</Text>
                            </View>
                        </View>
                    </>
                )}
            </BlurView>

            {isEditing && (
                <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                    setIsEditing(false);
                    setUsername((user as any)?.username || user?.displayName || '');
                    setStandard((user as any)?.standard || '12th');
                    setCoaching((user as any)?.coaching || 'PhysicsWallah');
                    setSelectedCharacter((user as any)?.selectedCharacter || 'mint');
                }}>
                    <Text style={styles.cancelText}>CANCEL CHANGES</Text>
                </TouchableOpacity>
            )}

        </ScrollView>
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
  headerTitle: { color: '#FFF', fontSize: 20, fontFamily: 'Exo_700Bold', letterSpacing: 2 },
  editBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 },
  editBtnText: { color: '#14F195', fontFamily: 'Exo_700Bold', fontSize: 12 },

  content: { padding: 20 },
  
  avatarSection: { alignItems: 'center', marginBottom: 30 },
  avatarContainer: { 
      width: 120, height: 120, 
      borderRadius: 60, 
      backgroundColor: 'rgba(0,0,0,0.3)', 
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 2,
      marginBottom: 15,
      overflow: 'hidden' // Ensure the image is clipped to the circle
  },
  avatar: { 
      width: '100%', 
      height: '100%',
      // No explicit borderRadius needed here due to overflow: hidden on container, but can add for safety
  },
  
  rankBadge: { 
      backgroundColor: '#FFD700', 
      paddingHorizontal: 12, paddingVertical: 4, 
      borderRadius: 12 
  },
  rankText: { color: '#000', fontFamily: 'Exo_700Bold', fontSize: 12 },

  characterSelector: { flexDirection: 'row', gap: 10, marginTop: 10 },
  charOption: { padding: 5, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  charOptionSelected: { borderColor: '#14F195', backgroundColor: 'rgba(20, 241, 149, 0.1)' },
  smallCharImg: { width: 40, height: 40 },

  infoCard: { borderRadius: 24, padding: 20, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  
  fieldContainer: { marginBottom: 20 },
  label: { color: '#888', fontSize: 10, fontFamily: 'Exo_700Bold', marginBottom: 8, letterSpacing: 1 },
  input: { 
      backgroundColor: 'rgba(255,255,255,0.1)', 
      color: '#FFF', 
      padding: 15, borderRadius: 12, 
      fontFamily: 'Exo_700Bold', fontSize: 16 
  },
  
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', marginRight: 10 },
  optionSelected: { backgroundColor: '#14F195', borderColor: '#14F195' },
  optionText: { color: '#FFF', fontFamily: 'Exo_400Regular', fontSize: 12 },
  optionTextSelected: { color: '#000', fontFamily: 'Exo_700Bold' },

  readOnlyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  value: { color: '#FFF', fontFamily: 'Exo_700Bold', fontSize: 16 },
  
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 15 },

  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  statBox: { alignItems: 'center' },
  statNumber: { color: '#FFF', fontSize: 24, fontFamily: 'Exo_700Bold' },
  statLabel: { color: '#888', fontSize: 10, fontFamily: 'Exo_700Bold', marginTop: 4 },

  cancelBtn: { marginTop: 20, alignItems: 'center', padding: 15 },
  cancelText: { color: '#FF5252', fontFamily: 'Exo_700Bold' }
});