import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useFonts } from 'expo-font';
import { MaterialCommunityIcons, Ionicons, FontAwesome } from '@expo/vector-icons';

export default function App() {
  const [fontsLoaded] = useFonts({
    ...MaterialCommunityIcons.font,
    ...Ionicons.font,
    ...FontAwesome.font,
  });

  if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
    </>
  );
}
