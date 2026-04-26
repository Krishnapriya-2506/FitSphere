import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCurrentUser, saveUser, getGamificationRank } from '../lib/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const ProfileScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editData, setEditData] = useState<any>({});

  const fetchUser = async () => {
      const cUser = await getCurrentUser();
      setUser(cUser);
      setEditData(cUser);
  };

  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchUser);
    fetchUser();
    return unsub;
  }, [navigation]);

  const handleSaveProfile = async () => {
      if (!editData) return;
      await saveUser(editData);
      setUser(editData);
      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated locally!');
  };

  const toggleNotifications = async () => {
     if (!pushEnabled) {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
           setPushEnabled(true);
           Alert.alert('Notifications Enabled', 'We have scheduled your offline Smart reminders (Hydration, Lunch time, Exericse, etc).');
           // Smart Schedule Mock
           await Notifications.scheduleNotificationAsync({ content: { title: "Time to drink water 💧", body: "Stay hydrated to hit your goals!" }, trigger: null });
        } else {
           Alert.alert('Permission Denied', 'Please enable Push mapping in device settings.');
        }
     } else {
        setPushEnabled(false);
        await Notifications.cancelAllScheduledNotificationsAsync();
        Alert.alert('Notifications Paused', 'Your local schedules have been cleared.');
     }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('fitsphere_rn_current_user');
    navigation.replace('Welcome');
  };

  if (!user) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
       <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
       </View>

       <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
             <View style={[styles.avatarWrap, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarLetter}>{user.fullName.charAt(0)}</Text>
             </View>
             
             {/* Gamification Badge */}
             <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: '#fef3c7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20}}>
                <MaterialCommunityIcons name={getGamificationRank(user.points).icon as any} size={16} color={getGamificationRank(user.points).color} />
                <Text style={{color: getGamificationRank(user.points).color, fontWeight: '800', fontSize: 14}}>{getGamificationRank(user.points).title} Rank</Text>
             </View>

             <Text style={[styles.nameText, { color: colors.text, marginTop: 8 }]}>{user.fullName}</Text>
             <Text style={[styles.emailText, { color: colors.textMuted }]}>@{user.username}</Text>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Body Metrics & Goals</Text>
          <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 20, marginBottom: 24 }}>
              <View style={styles.metricRow}>
                  <Text style={{color: colors.textMuted, fontWeight: '600'}}>Goal</Text>
                  <Text style={{color: colors.text, fontWeight: '800'}}>{user.goal}</Text>
              </View>
              <View style={styles.metricRow}>
                  <Text style={{color: colors.textMuted, fontWeight: '600'}}>Height</Text>
                  <Text style={{color: colors.text, fontWeight: '800'}}>{user.height} cm</Text>
              </View>
              <View style={styles.metricRow}>
                  <Text style={{color: colors.textMuted, fontWeight: '600'}}>Weight</Text>
                  <Text style={{color: colors.text, fontWeight: '800'}}>{user.weight} kg</Text>
              </View>
              <View style={styles.metricRow}>
                  <Text style={{color: colors.textMuted, fontWeight: '600'}}>Blood Group</Text>
                  <Text style={{color: colors.text, fontWeight: '800'}}>{user.bloodGroup}</Text>
              </View>
              <View style={styles.metricRow}>
                  <Text style={{color: colors.textMuted, fontWeight: '600'}}>Allergies</Text>
                  <Text style={{color: colors.text, fontWeight: '800'}}>{user.allergies?.join(', ') || 'None'}</Text>
              </View>
              <View style={styles.metricRow}>
                  <Text style={{color: colors.textMuted, fontWeight: '600'}}>Favorites</Text>
                  <Text style={{color: colors.text, fontWeight: '800'}}>{user.favoriteFoods?.join(', ') || 'None'}</Text>
              </View>

              <TouchableOpacity onPress={() => setEditModalVisible(true)} style={{backgroundColor: '#e0e7ff', padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 16}}>
                 <Text style={{color: '#4f46e5', fontWeight: '800'}}>Edit Details</Text>
              </TouchableOpacity>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Preferences</Text>

          {/* Expo Notification Toggle */}
          <View style={[styles.prefItem, { backgroundColor: colors.card }]}>
             <View style={styles.prefLeft}>
                <MaterialCommunityIcons name="bell-ring" size={24} color="#f43f5e" />
                <Text style={[styles.prefText, { color: colors.text }]}>Smart Reminders</Text>
             </View>
             <TouchableOpacity style={[styles.switch, pushEnabled && { backgroundColor: '#f43f5e' }]} onPress={toggleNotifications}>
                <View style={[styles.switchKnob, pushEnabled && styles.switchKnobOn]} />
             </TouchableOpacity>
          </View>

          <View style={[styles.prefItem, { backgroundColor: colors.card }]}>
             <View style={styles.prefLeft}>
                <MaterialCommunityIcons name="water" size={24} color="#3b82f6" />
                <Text style={[styles.prefText, { color: colors.text }]}>Blood Group</Text>
             </View>
             <Text style={[styles.prefValue, { color: colors.text }]}>{user.bloodGroup}</Text>
          </View>

          <TouchableOpacity style={[styles.logoutBtn, { borderColor: colors.danger }]} onPress={handleLogout}>
             <MaterialCommunityIcons name="logout" size={24} color={colors.danger} />
             <Text style={[styles.logoutText, { color: colors.danger }]}>Sign Out</Text>
          </TouchableOpacity>

       </ScrollView>

       {/* Edit Details Modal */}
       {editModalVisible && (
          <View style={StyleSheet.absoluteFill}>
             <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20}}>
                <View style={{backgroundColor: '#fff', padding: 24, borderRadius: 24}}>
                    <Text style={{fontSize: 20, fontWeight: '900', marginBottom: 20, color: '#111827'}}>Edit Details</Text>
                    
                    <Text style={{fontWeight: '700', marginBottom: 6, color: '#4B5563'}}>Full Name</Text>
                    <TextInput style={styles.editInput} value={editData.fullName} onChangeText={t => setEditData({...editData, fullName: t})} />

                    <Text style={{fontWeight: '700', marginBottom: 6, color: '#4B5563'}}>Height (cm)</Text>
                    <TextInput style={styles.editInput} value={editData.height} onChangeText={t => setEditData({...editData, height: t})} keyboardType="numeric" />
                    
                    <Text style={{fontWeight: '700', marginBottom: 6, color: '#4B5563'}}>Weight (kg)</Text>
                    <TextInput style={styles.editInput} value={editData.weight} onChangeText={t => setEditData({...editData, weight: t})} keyboardType="numeric" />
                    
                    <Text style={{fontWeight: '700', marginBottom: 6, color: '#4B5563'}}>Allergies (comma separated)</Text>
                    <TextInput style={styles.editInput} value={editData.allergies?.join(', ')} onChangeText={t => setEditData({...editData, allergies: t.split(',').map(s=>s.trim())})} />
                    
                    <Text style={{fontWeight: '700', marginBottom: 6, color: '#4B5563'}}>Favorite Foods (comma separated)</Text>
                    <TextInput style={styles.editInput} value={editData.favoriteFoods?.join(', ')} onChangeText={t => setEditData({...editData, favoriteFoods: t.split(',').map(s=>s.trim())})} />

                    <View style={{flexDirection: 'row', gap: 12, marginTop: 10}}>
                       <TouchableOpacity style={{flex: 1, padding: 16, backgroundColor: '#E5E7EB', borderRadius: 12, alignItems: 'center'}} onPress={() => setEditModalVisible(false)}>
                          <Text style={{fontWeight: '800', color: '#4B5563'}}>Cancel</Text>
                       </TouchableOpacity>
                       <TouchableOpacity style={{flex: 1, padding: 16, backgroundColor: '#4f46e5', borderRadius: 12, alignItems: 'center'}} onPress={handleSaveProfile}>
                          <Text style={{fontWeight: '800', color: '#fff'}}>Save</Text>
                       </TouchableOpacity>
                    </View>
                </View>
             </View>
          </View>
       )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 60, borderBottomWidth: 1 },
  title: { fontSize: 32, fontWeight: '900' },
  content: { padding: 20, paddingBottom: 100 },
  profileCard: { padding: 30, borderRadius: 24, alignItems: 'center', marginBottom: 30, elevation: 3 },
  avatarWrap: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarLetter: { color: '#fff', fontSize: 36, fontWeight: '900' },
  nameText: { fontSize: 24, fontWeight: '900' },
  emailText: { fontSize: 16, marginTop: 4, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16, marginLeft: 4 },
  
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  editInput: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', padding: 12, borderRadius: 12, marginBottom: 16, fontWeight: '600', marginTop: 8 },
  prefItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 1 },
  prefLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  prefText: { fontSize: 16, fontWeight: '700' },
  prefValue: { fontSize: 15, fontWeight: '800' },
  switch: { width: 44, height: 24, backgroundColor: '#E5E7EB', borderRadius: 12, padding: 2, justifyContent: 'center' },
  switchKnob: { width: 20, height: 20, backgroundColor: '#fff', borderRadius: 10, transform: [{translateX: 0}] },
  switchKnobOn: { transform: [{translateX: 20}] },
  logoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, borderWidth: 1, padding: 18, borderRadius: 16, marginTop: 32 },
  logoutText: { fontSize: 16, fontWeight: '800' }
});
