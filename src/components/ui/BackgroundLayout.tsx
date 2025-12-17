import React from 'react';
import { View, SafeAreaView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export const BackgroundLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <View style={styles.container}>
      {/* Decorative Gradients */}
      <LinearGradient
        colors={['#6C5DD3', 'transparent']}
        style={styles.blobTop}
      />
      <LinearGradient
        colors={['#3F8CFF', 'transparent']}
        style={styles.blobBottom}
      />
      
      <SafeAreaView style={styles.safeArea}>
        {children}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05050A', // Brand Dark
  },
  safeArea: {
    flex: 1,
  },
  blobTop: {
    position: 'absolute',
    width: 300,
    height: 300,
    top: -100,
    left: -50,
    borderRadius: 150,
    opacity: 0.4,
  },
  blobBottom: {
    position: 'absolute',
    width: 250,
    height: 250,
    bottom: 50,
    right: -50,
    borderRadius: 150,
    opacity: 0.3,
  },
});