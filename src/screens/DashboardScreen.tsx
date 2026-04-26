import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Modal, TextInput, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCurrentUser, getLifeBalanceScore, submitReflection, calculateBMI, getBMICategory, logBMICheck } from '../lib/storage';
import { ProgressChart, LineChart, BarChart } from 'react-native-chart-kit';
import { DeviceEventEmitter } from 'react-native';

const screenWidth = Dimensions.get('window').width;

export const DashboardScreen = ({ navigation }: any) => {
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState<any>({ score: 0, reason: '', radar: [] });
  
  // AI Coach Reflection States
  const [showReflection, setShowReflection] = useState(false);
  const [mood, setMood] = useState('Good');
  const [energy, setEnergy] = useState('');
  const [sleep, setSleep] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');

  const fetchUser = async () => {
    const cUser = await getCurrentUser();
    setUser(cUser);
    const b = await getLifeBalanceScore();
    setBalance(b);
  };

  useEffect(() => {
    const eventSub = DeviceEventEmitter.addListener('POINTS_UPDATED', fetchUser);
    
    const init = async () => {
        await fetchUser();
        await logBMICheck();
    };
    
    const unsubscribe = navigation.addListener('focus', init);
    init();

    // SMART REMINDERS LOOP
    const reminderInterval = setInterval(() => {
        const tips = [
            "💧 Time to drink water! Stay hydrated.",
            "🥗 Don't forget to log your meal!",
            "🏃 Time for a quick stretch or exercise?",
            "📅 Check your planner for remaining tasks!",
            "⚡ You're on a streak! Keep it up."
        ];
        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        DeviceEventEmitter.emit('SHOW_TOAST', { message: randomTip });
    }, 600000); // Every 10 minutes as requested

    return () => {
        unsubscribe();
        eventSub.remove();
        clearInterval(reminderInterval);
    };
  }, [navigation]);

  if (!user) return null;

  const handleReflectionSubmit = async () => {
    const e = Number(energy);
    const s = Number(sleep);
    if (!mood || isNaN(e) || isNaN(s)) return;
    
    // Save to storage
    const response = await submitReflection(mood, e, s);
    if (response) {
       setAiSuggestion(response.suggestion);
    }
    fetchUser(); // Sync XP
    setShowReflection(false);
  };

  // Convert radar to BarChart for clearer understanding
  const balanceChartData = {
    labels: balance.radar.map((r: any) => r.subject.substring(0, 4)), 
    datasets: [{
      data: balance.radar.map((r: any) => r.A),
      colors: [(opacity = 1) => '#ef4444', (opacity = 1) => '#10b981', (opacity = 1) => '#3b82f6', (opacity = 1) => '#f59e0b']
    }]
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
             <Text style={styles.title}>Hello, {user.fullName.split(' ')[0]}</Text>
             <Text style={styles.subtitle}>Ready to crush your goals?</Text>
          </View>
          <View style={styles.avatar}>
             <MaterialCommunityIcons name={user.level > 5 ? "crown" : "star"} size={32} color="#f59e0b" />
          </View>
        </View>

        {/* GAMIFICATION STATS CARD */}
        <View style={styles.statsRow}>
           <View style={[styles.statBox, { backgroundColor: '#fef3c7', borderColor: '#fde68a', borderWidth: 1 }]}>
              <MaterialCommunityIcons name="trophy" size={24} color="#d97706" />
              <Text style={[styles.statVal, { color: '#b45309' }]}>{user.points || 0}</Text>
              <Text style={[styles.statLabel, { color: '#d97706' }]}>Points</Text>
           </View>
           
           <View style={[styles.statBox, { backgroundColor: '#fee2e2', borderColor: '#fecaca', borderWidth: 1 }]}>
              <MaterialCommunityIcons name="fire" size={24} color="#dc2626" />
              <Text style={[styles.statVal, { color: '#b91c1c' }]}>{user.weeklyPoints || 0}</Text>
              <Text style={[styles.statLabel, { color: '#ef4444' }]}>Weekly</Text>
           </View>

           <View style={[styles.statBox, { backgroundColor: '#e0e7ff', borderColor: '#c7d2fe', borderWidth: 1 }]}>
              <MaterialCommunityIcons name="lightning-bolt" size={24} color="#4f46e5" />
              <Text style={[styles.statVal, { color: '#4338ca' }]}>{user.streak || 1}</Text>
              <Text style={[styles.statLabel, { color: '#6366f1' }]}>Day Streak</Text>
           </View>
        </View>
        {/* BMI PERSONALIZATION CARD */}
        {(() => {
           const bmi = calculateBMI(Number(user.height), Number(user.weight));
           const { category, color, suggestion } = getBMICategory(bmi);
           return (
              <View style={[styles.bmiCard, { borderColor: color }]}>
                 <View style={styles.bmiHeader}>
                    <View>
                       <Text style={styles.bmiTitle}>Body Mass Index (BMI)</Text>
                       <Text style={[styles.bmiValue, { color }]}>{bmi} - {category}</Text>
                    </View>
                    <MaterialCommunityIcons name="scale-bathroom" size={40} color={color} />
                 </View>
                 <View style={[styles.bmiSuggestion, { backgroundColor: color + '15' }]}>
                    <MaterialCommunityIcons name="information" size={20} color={color} />
                    <Text style={[styles.bmiText, { color }]}>{suggestion}</Text>
                 </View>
              </View>
           );
        })()}

        {/* AI Life Coach */}
        <View style={styles.coachCard}>
           <View style={styles.coachHeader}>
              <MaterialCommunityIcons name="robot" size={24} color="#8B5CF6" />
              <Text style={styles.coachTitle}>AI Life Coach</Text>
           </View>
           {aiSuggestion ? (
             <View style={styles.suggestionBox}>
               <Text style={styles.suggestionText}>"{aiSuggestion}"</Text>
             </View>
           ) : (
             <TouchableOpacity style={styles.reflectionBtn} onPress={() => setShowReflection(true)}>
               <Text style={styles.reflectionText}>Log Daily Reflection</Text>
               <MaterialCommunityIcons name="arrow-right" size={20} color="#8B5CF6" />
             </TouchableOpacity>
           )}
        </View>

        {/* Life Balance Score Component */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
             <Text style={styles.balanceTitle}>Life Balance Score</Text>
             <Text style={styles.scoreText}>{balance.score}/100</Text>
          </View>
          <Text style={styles.reasonText}>{balance.reason}</Text>
          
          <View style={styles.matrixGrid}>
            {balance.radar.map((item: any, index: number) => {
              const colors = ['#ef4444', '#10b981', '#3b82f6', '#f59e0b'];
              const icons = ['heart-pulse', 'briefcase-check', 'brain', 'account-group'];
              const color = colors[index];
              return (
                <View key={index} style={styles.matrixItem}>
                   <View style={styles.matrixHeader}>
                      <MaterialCommunityIcons name={icons[index] as any} size={20} color={color} />
                      <Text style={[styles.matrixLabel, { color }]}>{item.subject}</Text>
                   </View>
                   <Text style={styles.matrixValue}>{item.A}%</Text>
                   <View style={styles.progressBg}>
                      <View style={[styles.progressFill, { width: `${item.A}%`, backgroundColor: color }]} />
                   </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* WEEKLY ACTIVITY LINE CHART */}
        <View style={[styles.balanceCard, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' }]}>
           <Text style={[styles.balanceTitle, { marginBottom: 16, color: '#111827' }]}>Weekly Activity Intensity</Text>
           <LineChart
             data={{
               labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
               datasets: [{ data: [10, 45, 28, 80, 99, 43, 60] }]
             }}
             width={screenWidth - 40}
             height={200}
             chartConfig={{
               backgroundColor: "#ffffff",
               backgroundGradientFrom: "#ffffff",
               backgroundGradientTo: "#ffffff",
               decimalPlaces: 0,
               color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
               labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
               propsForDots: { r: "5", strokeWidth: "2", stroke: "#8B5CF6" }
             }}
             bezier
             style={{ marginVertical: 8, borderRadius: 24 }}
           />
        </View>

        <Text style={styles.sectionTitle}>Explore</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity activeOpacity={0.7} style={styles.qaBtn} onPress={() => navigation.navigate('Insights')}>
             <View style={[styles.qaIconWrap, { backgroundColor: '#f3e8ff' }]}>
               <MaterialCommunityIcons name="brain" size={24} color="#a855f7" />
             </View>
             <Text style={styles.qaText}>AI Insights</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} style={styles.qaBtn} onPress={() => navigation.navigate('Trackers')}>
             <View style={[styles.qaIconWrap, { backgroundColor: '#dcfce7' }]}>
               <MaterialCommunityIcons name="view-dashboard" size={24} color="#22c55e" />
             </View>
             <Text style={styles.qaText}>Log Data</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} style={[styles.qaBtn, styles.qaBtnAccent]} onPress={() => navigation.navigate('Restaurant')}>
             <View style={[styles.qaIconWrap, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
               <MaterialCommunityIcons name="silverware-fork-knife" size={24} color="#fff" />
             </View>
             <Text style={[styles.qaText, { color: '#fff' }]}>Dining Engine</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Reflection Modal */}
      <Modal visible={showReflection} animationType="slide" transparent>
         <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
               <Text style={styles.modalTitle}>Daily Wrap-up</Text>
               <TextInput style={styles.input} placeholder="Mood (e.g. Good, Stressed)" value={mood} onChangeText={setMood} />
               <TextInput style={styles.input} placeholder="Energy (1-10)" value={energy} onChangeText={setEnergy} keyboardType="numeric" />
               <TextInput style={styles.input} placeholder="Sleep Hours last night" value={sleep} onChangeText={setSleep} keyboardType="numeric" />
               
               <TouchableOpacity style={styles.submitBtn} onPress={handleReflectionSubmit}>
                 <Text style={styles.submitText}>Submit to AI</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowReflection(false)}>
                 <Text style={styles.cancelText}>Cancel</Text>
               </TouchableOpacity>
            </View>
         </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 10 },
  title: { fontSize: 32, fontWeight: '900', color: '#111827' },
  subtitle: { fontSize: 16, color: '#8B5CF6', fontWeight: '800', marginTop: 4 },
  avatar: { backgroundColor: '#fef3c7', padding: 12, borderRadius: 20 },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 10 },
  statBox: { flex: 1, padding: 16, borderRadius: 20, alignItems: 'center', elevation: 2 },
  statVal: { fontSize: 20, fontWeight: '900', marginTop: 8 },
  statLabel: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  coachCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 24, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset:{width:0, height:4}, shadowRadius: 10 },
  coachHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  coachTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  suggestionBox: { backgroundColor: '#f5f3ff', padding: 16, borderRadius: 12 },
  suggestionText: { color: '#6d28d9', fontStyle: 'italic', fontWeight: '600' },
  reflectionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f3f4f6', padding: 16, borderRadius: 12 },
  reflectionText: { fontWeight: '700', color: '#4B5563' },
  balanceCard: { backgroundColor: '#111827', padding: 24, borderRadius: 24, marginBottom: 24 },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  balanceTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  scoreText: { color: '#8B5CF6', fontSize: 24, fontWeight: '900' },
  reasonText: { color: '#9CA3AF', fontSize: 14, marginBottom: 20, fontStyle: 'italic' },
  matrixGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  matrixItem: { width: '48%', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 20, borderWeight: 1, borderColor: 'rgba(255,255,255,0.1)' },
  matrixHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  matrixLabel: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
  matrixValue: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 10 },
  progressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 16, marginLeft: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 400 },
  modalTitle: { fontSize: 22, fontWeight: '800', marginBottom: 20, color: '#111827', textAlign: 'center' },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 16 },
  submitBtn: { backgroundColor: '#8B5CF6', padding: 18, borderRadius: 16, alignItems: 'center', marginBottom: 12 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cancelBtn: { padding: 16, alignItems: 'center' },
  cancelText: { color: '#6B7280', fontWeight: '700' },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20, paddingHorizontal: 4 },
  qaBtn: { width: '48%', backgroundColor: '#fff', padding: 16, borderRadius: 20, alignItems: 'flex-start', shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: {width:0, height:4}, shadowRadius: 10, elevation: 2 },
  qaBtnAccent: { backgroundColor: '#111827' },
  qaIconWrap: { padding: 12, borderRadius: 14, marginBottom: 12 },
  qaText: { fontSize: 16, fontWeight: '800', color: '#374151' },
  
  // BMI Styles
  bmiCard: { backgroundColor: '#fff', padding: 20, borderRadius: 24, marginBottom: 24, borderWidth: 2, elevation: 2 },
  bmiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  bmiTitle: { fontSize: 14, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase' },
  bmiValue: { fontSize: 22, fontWeight: '900', marginTop: 4 },
  bmiSuggestion: { flexDirection: 'row', padding: 14, borderRadius: 16, gap: 10, alignItems: 'center' },
  bmiText: { flex: 1, fontSize: 14, fontWeight: '700', lineHeight: 20 }
});
