import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput, Alert, Modal, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { addFoodEntry, addWaterEntry, addExerciseEntry, getCurrentUser, SMART_FOOD_DB, searchFood, getSmartFoodSuggestions, rewardUserPoints } from '../lib/storage';
import { useTheme } from '../context/ThemeContext';

const AI_WORKOUTS = [
  { name: 'Core Crusher: Plank', duration: 60, calories: 15, desc: 'Hold a static forearm plank maintaining spinal neutrality to build core rigidity.' },
  { name: 'HIIT: Jumping Jacks', duration: 120, calories: 30, desc: 'High intensity cardiovascular burst to raise your BPM rapidly.' },
  { name: 'Lower Body: Squats', duration: 180, calories: 45, desc: 'Bodyweight squats. Keep your chest up and drive through the heels.' }
];

export const TrackersScreen = () => {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'Food' | 'Water' | 'Exercise'>('Food');
  const [history, setHistory] = useState<any>({ food: [], water: [], exercise: [] });
  const [user, setUser] = useState<any>(null);

  // Trainer Math
  const [activeWorkout, setActiveWorkout] = useState<any>(null);
  const [timer, setTimer] = useState(0);

  // Smart Food Math
  const [mood, setMood] = useState('Tired');
  const [foodQuery, setFoodQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [smartRecs, setSmartRecs] = useState<any>({ recommended: [], favorites: [], healthSwap: null, avoid: [] });
  
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [showPortionModal, setShowPortionModal] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCalories, setCustomCalories] = useState('');

  // Water form
  const [waterAmount, setWaterAmount] = useState('');

  const fetchData = async () => {
    const cUser = await getCurrentUser();
    setUser(cUser);
    if (cUser) {
      setHistory(cUser.history || { food: [], water: [], exercise: [] });
      const recs = await getSmartFoodSuggestions(cUser, mood);
      setSmartRecs(recs);
    }
  };

  useEffect(() => { fetchData(); }, [activeTab, mood]);

  useEffect(() => {
     let t: any;
     if (activeWorkout && timer > 0) t = setInterval(() => setTimer(prev => prev - 1), 1000);
     else if (activeWorkout && timer === 0) finishWorkout();
     return () => clearInterval(t);
  }, [activeWorkout, timer]);

  const handleSearch = (text: string) => {
     setFoodQuery(text);
     if (text.length > 0) setSearchResults(searchFood(text));
     else setSearchResults([]);
  };

  const handleSelectPredefined = (foodObj: any) => {
     if(!foodObj) return;
     setSelectedFood(foodObj);
     setShowPortionModal(true);
  };

  const handleAddPortion = async (food: any, portionLabel: string, cals: number) => {
     await addFoodEntry({ name: food.name, portion: portionLabel, calories: cals, type: 'Snack' });
     setShowPortionModal(false);
     setFoodQuery('');
     setSearchResults([]);
     setSelectedFood(null);
     
     await rewardUserPoints(10, `Tracked ${food.name}`);
     fetchData();
  };

  const startWorkout = (workout: any) => {
     setActiveWorkout(workout);
     setTimer(workout.duration);
  };

  const finishWorkout = async () => {
      if(!activeWorkout) return;
      await addExerciseEntry({ name: activeWorkout.name, duration: Math.floor(activeWorkout.duration / 60), caloriesBurned: activeWorkout.calories });
      
      await rewardUserPoints(15, `Completed ${activeWorkout.name}`);
      setActiveWorkout(null);
      fetchData();
  };

  const handleLogWater = async (amount: number) => {
      if (amount <= 0) return;
      await addWaterEntry(amount);
      const pts = amount === 250 ? 5 : amount === 500 ? 12 : Math.floor(amount / 20);
      
      await rewardUserPoints(pts, `Hydrated ${amount}ml`);
      fetchData();
  };

  const formatTime = (secs: number) => {
     const m = Math.floor(secs / 60);
     const s = secs % 60;
     return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const MOODS = ['Happy', 'Sad', 'Tired', 'Energetic', 'Stressed'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.tabContainer, { backgroundColor: colors.card }]}>
        <TabButton title="Food" icon="food-apple" active={activeTab === 'Food'} onPress={() => setActiveTab('Food')} colors={colors} />
        <TabButton title="Water" icon="water" active={activeTab === 'Water'} onPress={() => setActiveTab('Water')} colors={colors} />
        <TabButton title="Exercise" icon="dumbbell" active={activeTab === 'Exercise'} onPress={() => setActiveTab('Exercise')} colors={colors} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex:1}}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        
        {/* TAB: FOOD */}
        {activeTab === 'Food' && (
          <View>
             {/* Mood Selector */}
             <View style={{marginBottom: 20}}>
                <Text style={[{color: colors.text, fontWeight: '800', marginBottom: 12}]}>How are you feeling?</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                   {MOODS.map(m => (
                      <TouchableOpacity key={m} style={[styles.moodPill, mood === m ? {backgroundColor: colors.primary} : {backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1}]} onPress={()=>setMood(m)}>
                         <Text style={[{fontWeight: '700'}, {color: mood === m ? '#fff' : colors.textMuted}]}>{m}</Text>
                      </TouchableOpacity>
                   ))}
                </ScrollView>
             </View>

             {/* Search View OR Custom Mode */}
             <View style={[styles.foodInputWrapper, { backgroundColor: colors.card }]}>
                {!isCustomMode ? (
                  <>
                     <View style={[styles.searchBar, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
                        <Ionicons name="search" size={20} color={colors.textMuted} />
                        <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="Search food..." placeholderTextColor={colors.textMuted} value={foodQuery} onChangeText={handleSearch} />
                     </View>

                     {searchResults.length > 0 && (
                        <View style={styles.searchResults}>
                           {searchResults.map((r, i) => (
                              <TouchableOpacity key={i} style={[styles.searchResultItem, { borderBottomColor: colors.border }]} onPress={() => handleSelectPredefined(r)}>
                                 <Text style={[{color: colors.text, fontSize: 16, fontWeight: 'bold'}]}>{r.name}</Text>
                                 <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                              </TouchableOpacity>
                           ))}
                        </View>
                     )}
                     <TouchableOpacity style={styles.fallbackBtn} onPress={() => setIsCustomMode(true)}>
                       <Text style={[styles.fallbackText, { color: colors.primary }]}>Can't find it? Add Custom Food</Text>
                     </TouchableOpacity>
                  </>
                ) : (
                  <>
                     <Text style={[styles.sectionTitle, {color: colors.text, marginBottom: 8}]}>Custom Food</Text>
                     <TextInput style={[styles.inputField, {backgroundColor: isDark ? '#374151' :'#F3F4F6', color: colors.text}]} placeholder="Food Name" placeholderTextColor={colors.textMuted} value={customName} onChangeText={setCustomName} />
                     <TextInput style={[styles.inputField, {backgroundColor: isDark ? '#374151' :'#F3F4F6', color: colors.text}]} placeholder="Calories" placeholderTextColor={colors.textMuted} keyboardType="numeric" value={customCalories} onChangeText={setCustomCalories} />
                     <View style={{flexDirection: 'row', gap: 10, marginTop: 10}}>
                         <TouchableOpacity style={[styles.btnAction, { backgroundColor: colors.primary, flex: 1 }]} onPress={async () => {
                             if(!customName) return;
                             await addFoodEntry({ name: customName, portion: 'Custom', calories: Number(customCalories), type: 'Snack' });
                             await rewardUserPoints(10, `Tracked ${customName}`);
                             setCustomName(''); setIsCustomMode(false); fetchData();
                         }}>
                          <Text style={{color: '#fff', fontWeight: '800'}}>Save Entry</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btnAction, { backgroundColor: '#E5E7EB', paddingHorizontal: 20 }]} onPress={() => setIsCustomMode(false)}><Text style={{color: '#374151', fontWeight: '800'}}>Cancel</Text></TouchableOpacity>
                     </View>
                  </>
                )}
             </View>

             {/* Smart Suggestions Matrix */}
             {!foodQuery && !isCustomMode && (
                <View style={{marginTop: 24}}>
                   {/* 1. Smart Suggestions */}
                   {(smartRecs.recommended?.length ?? 0) > 0 && (
                      <View style={styles.groupBlock}>
                         <Text style={[styles.sectionTitle, { color: colors.text }]}>🤖 Smart Suggestions</Text>
                         {smartRecs.recommended.map((s:any, idx:number) => (
                            <TouchableOpacity key={`rec_${idx}`} style={[styles.suggestCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => handleSelectPredefined(s)}>
                               <Text style={[styles.suggestName, { color: colors.text }]}>{s.name} ({s.calories} kcal)</Text>
                               <Ionicons name="add-circle" size={24} color={colors.primary} />
                            </TouchableOpacity>
                         ))}
                      </View>
                   )}

                   {/* 2. Favorites */}
                   {(smartRecs.favorites?.length ?? 0) > 0 && (
                      <View style={styles.groupBlock}>
                         <Text style={[styles.sectionTitle, { color: colors.text }]}>⭐ Your Favorites</Text>
                         {smartRecs.favorites.map((s:any, idx:number) => (
                            <TouchableOpacity key={`fav_${idx}`} style={[styles.suggestCard, { backgroundColor: isDark ? '#422006' : '#fef3c7', borderColor: '#f59e0b', borderWidth: 1 }]} onPress={() => handleSelectPredefined(s)}>
                               <Text style={[styles.suggestName, { color: colors.text }]}>{s.name}</Text>
                               <Ionicons name="add-circle" size={24} color="#f59e0b" />
                            </TouchableOpacity>
                         ))}
                      </View>
                   )}

                   {/* 3. Healthier Swap */}
                   {smartRecs.healthSwap && (
                      <View style={styles.groupBlock}>
                         <Text style={[styles.sectionTitle, { color: colors.text }]}>🥗 Healthier Alternative</Text>
                         <TouchableOpacity style={[styles.suggestCard, { backgroundColor: isDark ? '#14532d' : '#dcfce7', borderColor: '#22c55e', borderWidth: 1 }]} onPress={() => handleSelectPredefined(smartRecs.healthSwap.good)}>
                            <Text style={[styles.suggestName, { color: colors.text }]}>Instead of {smartRecs.healthSwap.bad} → {smartRecs.healthSwap.good.name}</Text>
                            <Ionicons name="add-circle" size={24} color="#22c55e" />
                         </TouchableOpacity>
                      </View>
                   )}

                   {/* 4. Avoid */}
                   {(smartRecs.avoid?.length ?? 0) > 0 && (
                      <View style={styles.groupBlock}>
                         <Text style={[styles.sectionTitle, { color: colors.text }]}>⚠️ Avoid (Allergies)</Text>
                         {smartRecs.avoid.map((s:any, idx:number) => (
                            <View key={`av_${idx}`} style={[styles.suggestCard, { backgroundColor: isDark ? '#7f1d1d' : '#fee2e2', borderColor: '#ef4444', borderWidth: 1 }]}>
                               <Text style={[styles.suggestName, { color: colors.danger, textDecorationLine: 'line-through' }]}>{s.name}</Text>
                            </View>
                         ))}
                      </View>
                   )}
                </View>
             )}

             <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Daily Log</Text>
             {history.food?.map((f: any, i: number) => (
               <View key={`log_${i}`} style={[styles.historyItem, { backgroundColor: colors.card }]}>
                  <MaterialCommunityIcons name="food-apple" size={24} color={colors.primary} />
                  <View style={{marginLeft: 12}}>
                     <Text style={{fontSize: 16, fontWeight: '700', color: colors.text}}>{f.name}</Text>
                     <Text style={{color: colors.textMuted}}>{f.portion ? `${f.portion} • ` : ''}{f.calories} kcal</Text>
                  </View>
               </View>
             ))}
          </View>
        )}

         {/* TAB: WATER */}
         {activeTab === 'Water' && (
           <View>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 8 }]}>Hydration Station 💧</Text>
              <Text style={[{ color: colors.textMuted, marginBottom: 24, fontSize: 14, marginLeft: 4 }]}>Quick log your water intake to stay hydrated.</Text>
              
              <View style={{flexDirection: 'row', gap: 12, marginBottom: 24}}>
                 <TouchableOpacity activeOpacity={0.8} style={[styles.waterBtn, { backgroundColor: isDark ? '#1e3a8a' : '#dbeafe', borderColor: '#3b82f6' }]} onPress={() => handleLogWater(250)}>
                    <Ionicons name="water" size={32} color="#3b82f6" />
                    <Text style={{color: '#3b82f6', fontWeight: '900', fontSize: 18, marginTop: 8}}>+250ml</Text>
                    <Text style={{color: '#60a5fa', fontWeight: '700', fontSize: 12}}>Glass</Text>
                 </TouchableOpacity>

                 <TouchableOpacity activeOpacity={0.8} style={[styles.waterBtn, { backgroundColor: isDark ? '#1e3a8a' : '#bfdbfe', borderColor: '#2563eb' }]} onPress={() => handleLogWater(500)}>
                    <Ionicons name="water" size={32} color="#2563eb" />
                    <Text style={{color: '#2563eb', fontWeight: '900', fontSize: 18, marginTop: 8}}>+500ml</Text>
                    <Text style={{color: '#3b82f6', fontWeight: '700', fontSize: 12}}>Bottle</Text>
                 </TouchableOpacity>
              </View>

              <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 30 }]}>
                 <Text style={[{color: colors.text, fontWeight: '800', marginBottom: 12}]}>Custom Amount</Text>
                 <View style={{flexDirection: 'row', gap: 10}}>
                    <TextInput 
                        style={[styles.textInput, { flex: 1, backgroundColor: isDark ? '#374151' : '#F3F4F6', color: colors.text }]} 
                        placeholder="e.g 150" 
                        placeholderTextColor={colors.textMuted} 
                        keyboardType="numeric"
                        value={waterAmount} 
                        onChangeText={setWaterAmount} 
                    />
                    <TouchableOpacity activeOpacity={0.8} style={[styles.btnAction, { backgroundColor: '#3b82f6', paddingHorizontal: 24 }]} onPress={() => { handleLogWater(Number(waterAmount)); setWaterAmount(''); }}>
                        <Text style={styles.btnText}>Add ml</Text>
                    </TouchableOpacity>
                 </View>
              </View>

              <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Sips</Text>
              {(history.water?.length === 0 || !history.water) ? (
                 <Text style={{color: colors.textMuted, fontStyle: 'italic', marginLeft: 4}}>No water logged today yet...</Text>
              ) : (
                history.water?.map((w: any, i: number) => (
                  <View key={`wat_${i}`} style={[styles.historyItem, { backgroundColor: colors.card }]}>
                     <MaterialCommunityIcons name="water" size={24} color="#3b82f6" />
                     <View style={{marginLeft: 12}}>
                        <Text style={{fontSize: 16, fontWeight: '700', color: colors.text}}>{w.amount} ml</Text>
                     </View>
                  </View>
                ))
              )}
           </View>
         )}

        {/* TAB: EXERCISE */}
        {activeTab === 'Exercise' && (
          <View>
             <Text style={[styles.sectionTitle, { color: colors.text }]}>AI Generated Workouts</Text>
             {AI_WORKOUTS.map((w, i) => (
                <TouchableOpacity key={`work_${i}`} activeOpacity={0.8} style={[styles.workoutCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => startWorkout(w)}>
                   <View style={styles.workoutHeader}>
                      <MaterialCommunityIcons name="lightning-bolt" size={24} color="#f59e0b" />
                      <Text style={[styles.workoutName, { color: colors.text }]}>{w.name}</Text>
                   </View>
                   <Text style={[styles.workoutDesc, { color: colors.textMuted }]}>{w.desc}</Text>
                   <View style={styles.workoutMeta}>
                      <Text style={styles.metaText}>{w.duration} Seconds</Text>
                      <Text style={styles.metaText}>{w.calories} Cals</Text>
                   </View>
                </TouchableOpacity>
             ))}
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Intelligent Portion Selection Modal */}
      <Modal visible={showPortionModal} transparent animationType="slide">
         <View style={styles.modalBg}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
               <Text style={[styles.modalTitle, { color: colors.text }]}>How much {selectedFood?.name}?</Text>
               <View style={{ width: '100%', gap: 12 }}>
                  {selectedFood?.portions?.map((p: any, idx: number) => {
                     const isDefault = p.label === selectedFood.defaultPortion;
                     return (
                        <TouchableOpacity key={`p_${idx}`} style={[styles.portionBtn, isDefault ? {backgroundColor: colors.primary} : {backgroundColor: isDark ? '#374151' :'#F3F4F6'}]} onPress={() => handleAddPortion(selectedFood, p.label, p.calories)}>
                           <Text style={[styles.portionLabel, {color: isDefault ? '#fff' : colors.text}]}>{p.label}</Text>
                           <View>
                              <Text style={[styles.portionCals, {color: isDefault ? '#ddd' : colors.textMuted}]}>{p.calories} kcal</Text>
                              {isDefault && <Text style={{color:'#fff', fontSize: 10, fontWeight: '800'}}>DEFAULT</Text>}
                           </View>
                        </TouchableOpacity>
                     );
                  })}
               </View>
               <TouchableOpacity style={[styles.fallbackBtn, { marginTop: 24, paddingVertical: 16, backgroundColor: '#E5E7EB', width: '100%', borderRadius: 16 }]} onPress={() => setShowPortionModal(false)}><Text style={[{ color: '#374151', fontWeight: '800', textAlign: 'center' }]}>Cancel</Text></TouchableOpacity>
            </View>
         </View>
      </Modal>

      {/* Trainer Modal */}
      <Modal visible={!!activeWorkout} transparent animationType="slide">
         <View style={styles.modalBg}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
               <Text style={[styles.modalTitle, { color: colors.text }]}>{activeWorkout?.name}</Text>
               <View style={styles.timerCircle}><Text style={[styles.timerText, { color: colors.primary }]}>{formatTime(timer)}</Text></View>
               <TouchableOpacity style={[styles.btnAction, { backgroundColor: colors.danger, width: '100%' }]} onPress={() => setActiveWorkout(null)}><Text style={{color: '#fff', fontWeight: '800'}}>Abort Session</Text></TouchableOpacity>
            </View>
         </View>
      </Modal>

    </SafeAreaView>
  );
};

const TabButton = ({ title, icon, active, onPress, colors }: any) => (
  <TouchableOpacity activeOpacity={0.7} style={[styles.tab, active && {backgroundColor: colors.primary}]} onPress={onPress}>
    <MaterialCommunityIcons name={icon} size={22} color={active ? '#fff' : colors.textMuted} />
    <Text style={[styles.tabText, { color: active ? '#fff' : colors.textMuted }]}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabContainer: { flexDirection: 'row', padding: 16, gap: 12, elevation: 3 },
  tab: { flex: 1, paddingVertical: 14, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  tabText: { fontWeight: '700', fontSize: 13 },
  content: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16, marginLeft: 4 },
  
  foodInputWrapper: { padding: 20, borderRadius: 20, elevation: 2 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderRadius: 12, height: 50 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, fontWeight: '600' },
  searchResults: { marginTop: 10, maxHeight: 150 },
  searchResultItem: { paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between' },
  fallbackBtn: { marginTop: 16 },
  fallbackText: { textAlign: 'center', fontWeight: '700' },
  inputField: { padding: 16, borderRadius: 12, marginBottom: 12, fontSize: 16 },
  btnAction: { padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  moodPill: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginRight: 10 },
  groupBlock: { marginBottom: 20 },
  suggestCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  suggestName: { fontSize: 16, fontWeight: '800' },
  historyItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 1 },

  portionBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderRadius: 16 },
  portionLabel: { fontSize: 16, fontWeight: '800' },
  portionCals: { fontSize: 14, fontWeight: '600' },

  workoutCard: { padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 16, elevation: 2 },
  workoutHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  workoutName: { fontSize: 18, fontWeight: '800' },
  workoutDesc: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  workoutMeta: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f3f4f6', padding: 10, borderRadius: 10 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, alignItems: 'center', minHeight: 450 },
  modalTitle: { fontSize: 24, fontWeight: '900', marginBottom: 20, textAlign: 'center' },
  timerCircle: { width: 200, height: 200, borderRadius: 100, borderWidth: 6, borderColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  timerText: { fontSize: 56, fontWeight: '900' },

  waterBtn: { flex: 1, borderWidth: 1, borderRadius: 20, padding: 20, alignItems: 'center', justifyContent: 'center', elevation: 1 },
  textInput: { padding: 16, borderRadius: 12, fontSize: 16 },
  inputBox: { padding: 20, borderRadius: 20, borderWidth: 1 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  metaText: { fontSize: 13, fontWeight: '800', color: '#4B5563' }
});
