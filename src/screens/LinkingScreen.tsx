import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  ScrollView, 
  Alert,
  Modal,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useFonts, Exo_700Bold, Exo_400Regular } from '@expo-google-fonts/exo';
import { doc, setDoc, getFirestore } from 'firebase/firestore';
import { useUserStore, UserProfile } from '../store/userStore';

const { width } = Dimensions.get('window');
const db = getFirestore();

// Character Options (images assumed to be in assets)
// Using explicit require for each image to ensure they bundle correctly
const CHARACTERS = [
  { id: 'yellow', name: 'Yellow', color: '#F9E392', image: require('../assets/yellow.png') },
  { id: 'mint', name: 'Mint', color: '#A8DBCD', image: require('../assets/mint.png') },
  // Assuming lavender and orange have corresponding images or fallback
  { id: 'lavender', name: 'Lavender', color: '#E6E6FA', image: require('../assets/lavender.png') }, 
  { id: 'orange', name: 'Orange', color: '#FFD580', image: require('../assets/orange.png') },
];

const COACHING_OPTIONS = [
  { name: 'PhysicsWallah', logo: require('../assets/pw.png') },
  { name: 'Allen', logo: require('../assets/allen.png') },
  { name: 'Aakash', logo: null },
  { name: 'Resonance', logo: null },
  { name: 'Self Study', logo: null }
];

const STANDARD_OPTIONS = ['11th', '12th', 'Dropper'];

export const LinkingScreen = ({ navigation }: { navigation: any }) => {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [standard, setStandard] = useState(STANDARD_OPTIONS[0]);
  const [coaching, setCoaching] = useState(COACHING_OPTIONS[0].name);
  const [selectedCharacter, setSelectedCharacter] = useState(CHARACTERS[0].id);
  const [loading, setLoading] = useState(false);

  // Dropdown visibility
  const [showStandardDropdown, setShowStandardDropdown] = useState(false);
  const [showCoachingDropdown, setShowCoachingDropdown] = useState(false);

  let [fontsLoaded] = useFonts({
    Exo_700Bold,
    Exo_400Regular,
  });

  if (!fontsLoaded) return <View style={{flex: 1, backgroundColor: '#000'}} />;

  const handleSubmit = async () => {
    if (!name.trim() || !username.trim()) {
      Alert.alert("Incomplete Data", "Please enter your name and username.");
      return;
    }

    setLoading(true);
    try {
      if (!user?.uid) throw new Error("No user logged in");

      const profileData = {
        name,
        username,
        standard,
        coaching,
        selectedCharacter,
        isProfileComplete: true, 
        rank: 'Bronze' as const,
        xp: 0,
        stats: { wins: 0, losses: 0, totalMatches: 0 }
      };

      await setDoc(doc(db, "users", user.uid), profileData, { merge: true });

      // Ensure we cast to UserProfile correctly or extend the type if needed locally
      // Assuming UserProfile interface in store matches this structure
      const updatedUser = {
        ...user,
        ...profileData,
        // Ensure explicit rank type match
        rank: 'Bronze' as const, 
      };
      
      setUser(updatedUser as UserProfile);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const activeColor = CHARACTERS.find(c => c.id === selectedCharacter)?.color || '#000';

  return (
    <View style={[styles.container, { backgroundColor: activeColor }]}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.title}>IDENTITY SETUP</Text>
          <Text style={styles.subtitle}>Configure your agent profile</Text>

          <BlurView intensity={40} tint="light" style={styles.formCard}>
            
            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>FULL NAME</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Agent Name" 
                placeholderTextColor="rgba(0,0,0,0.4)"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Username */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>CODENAME (USERNAME)</Text>
              <TextInput 
                style={styles.input} 
                placeholder="@codename" 
                placeholderTextColor="rgba(0,0,0,0.4)"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            {/* Standard Dropdown */}
            <View style={[styles.inputGroup, { zIndex: 20 }]}>
              <Text style={styles.label}>CLASS STANDARD</Text>
              <TouchableOpacity 
                style={styles.dropdownButton} 
                onPress={() => { setShowStandardDropdown(!showStandardDropdown); setShowCoachingDropdown(false); }}
              >
                <Text style={styles.dropdownText}>{standard}</Text>
                <Text style={styles.dropdownIcon}>▼</Text>
              </TouchableOpacity>
              {showStandardDropdown && (
                <View style={styles.dropdownList}>
                  {STANDARD_OPTIONS.map(opt => (
                    <TouchableOpacity key={opt} style={styles.dropdownItem} onPress={() => { setStandard(opt); setShowStandardDropdown(false); }}>
                      <Text style={styles.dropdownItemText}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Coaching Dropdown */}
            <View style={[styles.inputGroup, { zIndex: 10 }]}>
              <Text style={styles.label}>AFFILIATION (COACHING)</Text>
              <TouchableOpacity 
                style={styles.dropdownButton} 
                onPress={() => { setShowCoachingDropdown(!showCoachingDropdown); setShowStandardDropdown(false); }}
              >
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    {COACHING_OPTIONS.find(c => c.name === coaching)?.logo && (
                        <Image 
                            source={COACHING_OPTIONS.find(c => c.name === coaching)?.logo} 
                            style={{width: 24, height: 24, marginRight: 8, resizeMode: 'contain'}} 
                        />
                    )}
                    <Text style={styles.dropdownText}>{coaching}</Text>
                </View>
                <Text style={styles.dropdownIcon}>▼</Text>
              </TouchableOpacity>
              {showCoachingDropdown && (
                <View style={styles.dropdownList}>
                  {COACHING_OPTIONS.map(opt => (
                    <TouchableOpacity key={opt.name} style={styles.dropdownItem} onPress={() => { setCoaching(opt.name); setShowCoachingDropdown(false); }}>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          {opt.logo && (
                              <Image source={opt.logo} style={{width: 24, height: 24, marginRight: 10, resizeMode: 'contain'}} />
                          )}
                          <Text style={styles.dropdownItemText}>{opt.name}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Character Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>SELECT AVATAR</Text>
              <View style={styles.characterGrid}>
                {CHARACTERS.map((char) => (
                  <TouchableOpacity 
                    key={char.id} 
                    style={[
                      styles.characterOption, 
                      selectedCharacter === char.id && styles.characterSelected,
                      { backgroundColor: char.color }
                    ]}
                    onPress={() => setSelectedCharacter(char.id)}
                  >
                    {/* Display Character Image Full Size */}
                    <Image 
                        source={char.image}
                        style={{ width: '90%', height: '90%', resizeMode: 'contain' }}
                    />
                    
                    {selectedCharacter === char.id && (
                      <View style={styles.checkmark}>
                        <Text style={{color:'#FFF', fontSize:10, fontWeight:'bold'}}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.helperText}>Determines your home screen theme.</Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>{loading ? "INITIALIZING..." : "ENTER AIRBASE"}</Text>
            </TouchableOpacity>

          </BlurView>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  title: {
    fontSize: 36,
    fontFamily: 'Exo_700Bold', 
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Exo_400Regular', 
    color: 'rgba(0,0,0,0.6)',
    textAlign: 'center',
    marginBottom: 30,
  },
  formCard: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'visible',
  },
  inputGroup: {
    marginBottom: 20,
    position: 'relative',
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: 'rgba(0,0,0,0.6)',
    letterSpacing: 1,
    fontFamily: 'Exo_700Bold',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Exo_700Bold',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    color: '#000',
  },
  dropdownButton: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  dropdownText: {
    fontSize: 16,
    fontFamily: 'Exo_700Bold',
    color: '#000',
  },
  dropdownIcon: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.5)',
  },
  dropdownList: {
    position: 'absolute',
    top: 75,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    zIndex: 100,
    padding: 5,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#000',
    fontFamily: 'Exo_400Regular',
  },
  characterGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  characterOption: {
    width: 70, // Increased size for better visibility
    height: 70,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'visible', // Ensure checkmark and border can overflow if needed
  },
  characterSelected: {
    borderColor: '#000',
    borderWidth: 3,
    transform: [{ scale: 1.05 }],
  },
  checkmark: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#000',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFF',
    zIndex: 10,
  },
  helperText: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.5)',
    marginTop: 8,
    fontFamily: 'Exo_400Regular',
  },
  submitButton: {
    backgroundColor: '#000',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'Exo_700Bold',
    letterSpacing: 1,
  },
});