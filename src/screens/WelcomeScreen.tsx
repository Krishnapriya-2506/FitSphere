import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export const WelcomeScreen = ({ navigation }: any) => {
  const { colors, isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.content}>
        
        <View style={styles.heroSection}>
          <View style={[styles.iconWrap, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
             <MaterialCommunityIcons name="earth" size={80} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Welcome to FitSphere</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
             The world's smartest AI-powered Life Optimization Engine. Build habits, conquer challenges, and level up your life.
          </Text>
        </View>

        <View style={styles.btnSection}>
          <TouchableOpacity activeOpacity={0.8} style={[styles.btnPrimary, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('Register')}>
             <Text style={styles.btnPrimaryText}>Create Account</Text>
             <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} style={[styles.btnOutline, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={() => navigation.navigate('Login')}>
             <Text style={[styles.btnOutlineText, { color: colors.text }]}>Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 32, justifyContent: 'space-between' },
  heroSection: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  iconWrap: { width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 40, fontWeight: '900', textAlign: 'center', marginBottom: 16, letterSpacing: -1 },
  subtitle: { fontSize: 16, fontWeight: '500', textAlign: 'center', lineHeight: 24, paddingHorizontal: 10 },
  btnSection: { gap: 16, paddingBottom: 20 },
  btnPrimary: { padding: 20, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  btnPrimaryText: { color: '#fff', fontSize: 18, fontWeight: '900', marginRight: 10 },
  btnOutline: { padding: 20, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  btnOutlineText: { fontSize: 18, fontWeight: '800' }
});
