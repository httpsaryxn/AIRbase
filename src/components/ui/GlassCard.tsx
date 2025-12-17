import React from 'react';
import { View, ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassCardProps extends ViewProps {
  intensity?: number;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  intensity = 20, 
  className, 
  style,
  ...props 
}) => {
  // Convert Tailwind classes to styles
  const containerStyles = [
    {
      overflow: 'hidden' as const,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    style,
  ];

  return (
    <View 
      style={containerStyles}
      {...props}
    >
      <BlurView intensity={intensity} tint="dark" style={{ flex: 1, padding: 16 }}>
        {children}
      </BlurView>
    </View>
  );
};