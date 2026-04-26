import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCurrentUser, getGroups, saveUser, generateDailyPlan, PlannerTask, rewardUserPoints } from '../lib/storage';
import { useTheme } from '../context/ThemeContext';

export const PlannerScreen = () => {
  const { colors, isDark } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const fetchData = async () => {
    const cUser = await getCurrentUser();
    setUser(cUser);
    
    // Attempt Planner mapping natively
    const t = await generateDailyPlan();
    setTasks(t);

    // Sync Completed tasks from offline history
    const historyComp = cUser?.plannerHistory?.[new Date().toDateString()] || [];
    setCompletedIds(historyComp);
    setProgress(t.length > 0 ? (historyComp.length / t.length) * 100 : 0);
  };

  useEffect(() => { fetchData(); }, []);

  const handleTaskToggle = async (task: PlannerTask) => {
     if (!user) return;
     if (completedIds.includes(task.id)) return; // Don't uncheck (or you lose points!)

     const newIds = [...completedIds, task.id];
     setCompletedIds(newIds);
     
     // Evaluate math internally
     const pct = (newIds.length / tasks.length) * 100;
     setProgress(pct);

     // Points distribution
     let wonPts = task.points;
     let msg = `Completed ${task.title}`;

     // Bonus Section Completion math
     const sectionTasks = tasks.filter(t => t.timeSection === task.timeSection);
     const completedSectionTasks = sectionTasks.filter(t => newIds.includes(t.id));
     if (completedSectionTasks.length === sectionTasks.length) {
         wonPts += 30;
         msg = `Section Mastered (${task.timeSection})`;
     }

     // Day Complete
     if (newIds.length === tasks.length) {
         wonPts += 100;
         msg = `PERFECT DAY!`;
         
         const allGroups = await getGroups();
         const isGroup = allGroups.find(g => g.members.includes(user.username));
         if (isGroup) {
             wonPts += 200;
             msg = `GROUP SYNC! Perfect Day`;
         }
     }

     // Sync to Storage
     if (!user.plannerHistory) user.plannerHistory = {};
     user.plannerHistory[new Date().toDateString()] = newIds;
     await saveUser(user);
     
     await rewardUserPoints(wonPts, msg);
  };

  const sections = ['Morning', 'Afternoon', 'Evening', 'Night'] as const;

  const iconMap: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
      health: 'heart-pulse',
      food: 'food-apple',
      exercise: 'dumbbell',
      focus: 'brain'
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Daily Flow</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Auto-generated based on your goal</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
         {/* Progress Block */}
         <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12}}>
               <Text style={[{color: colors.text, fontWeight: '800', fontSize: 16}]}>Today's Completion</Text>
               <Text style={[{color: colors.primary, fontWeight: '900', fontSize: 16}]}>{Math.round(progress)}%</Text>
            </View>
            <View style={styles.barBg}>
               <View style={[styles.barFill, { backgroundColor: colors.primary, width: `${progress}%` }]} />
            </View>
         </View>

         {/* Timelines */}
         {sections.map((sec) => {
            const secTasks = tasks.filter(t => t.timeSection === sec);
            if(secTasks.length === 0) return null;

            return (
               <View key={sec} style={styles.sectionBlock}>
                  <View style={styles.sectionTitleWrap}>
                     <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                     <Text style={[styles.sectionTitle, { color: colors.text }]}>{sec}</Text>
                  </View>
                  <View style={[styles.timelineTrack, { borderLeftColor: colors.border }]}>
                     {secTasks.map(task => {
                        const isDone = completedIds.includes(task.id);
                        return (
                           <TouchableOpacity 
                              key={task.id} 
                              activeOpacity={0.8}
                              style={[styles.taskCard, { backgroundColor: isDone ? (isDark ? '#064e3b' : '#dcfce7') : colors.card, borderColor: isDone ? '#22c55e' : colors.border }]}
                              onPress={() => handleTaskToggle(task)}
                           >
                              <View style={styles.taskLeft}>
                                 <View style={[styles.iconWrap, { backgroundColor: isDone ? '#22c55e' : (isDark ? '#374151' : '#F3F4F6') }]}>
                                    <MaterialCommunityIcons name={iconMap[task.type] || 'check'} size={20} color={isDone ? '#fff' : colors.textMuted} />
                                 </View>
                                 <View>
                                    <Text style={[styles.taskTitle, { color: isDone ? colors.text : colors.text, textDecorationLine: isDone ? 'line-through' : 'none' }]}>{task.title}</Text>
                                    <View style={styles.pointsWrap}>
                                        <MaterialCommunityIcons name="star-shooting" size={14} color="#f59e0b" />
                                        <Text style={{fontSize: 12, color: '#f59e0b', fontWeight: '800'}}>+{task.points} pts</Text>
                                    </View>
                                 </View>
                              </View>
                              {isDone ? (
                                 <MaterialCommunityIcons name="check-circle" size={26} color="#22c55e" />
                              ) : (
                                 <MaterialCommunityIcons name="circle-outline" size={26} color={colors.textMuted} />
                              )}
                           </TouchableOpacity>
                        )
                     })}
                  </View>
               </View>
            )
         })}

         {/* Reset Developer Math */}
         <TouchableOpacity style={[styles.resetBtn, { backgroundColor: colors.danger }]} onPress={async () => {
             if (user) {
                 user.plannerHistory = {};
                 await saveUser(user);
                 fetchData();
             }
         }}>
             <Text style={{color: '#fff', fontWeight: '800', textAlign: 'center'}}>Reset Day (Debug)</Text>
         </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 10, borderBottomWidth: 1, zIndex: 10, elevation: 3 },
  title: { fontSize: 24, fontWeight: '900', marginBottom: 4 },
  subtitle: { fontSize: 14, fontWeight: '600' },
  content: { padding: 20, paddingBottom: 40 },
  
  progressCard: { padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 30, elevation: 2 },
  barBg: { height: 10, borderRadius: 5, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },

  sectionBlock: { marginBottom: 20 },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  timelineTrack: { marginLeft: 5, paddingLeft: 24, borderLeftWidth: 2 },

  taskCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12, elevation: 1 },
  taskLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  taskTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  pointsWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  
  resetBtn: { padding: 16, borderRadius: 16, marginTop: 40 }
});
