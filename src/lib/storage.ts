import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

export interface Food {
  name: string;
  calories: number;
  protein?: number;
}

export interface User {
  username: string;
  fullName: string;
  email: string;
  password?: string;
  bloodGroup: string;
  height: string;
  weight: string;
  goal: string;
  allergies: string[];
  favoriteFoods: string[];
  points: number;
  streak: number;
  level: number;
  history: {
    food: any[];
    water: any[];
    exercise: any[];
    reflections: any[];
    focusSessions: any[];
    habits: any[];
    tasks: any[];
    challenges: any[];
  };
  lastLoginDate?: string;
  plannerHistory?: Record<string, string[]>;
  weeklyPoints?: number;
  lastWeeklyReset?: string;
  friends?: string[];
  badges?: string[];
  lastActiveDate?: string;
  bmiHistory?: { bmi: number, date: string }[];
}

const USERS_KEY = 'fitsphere_rn_users';
const CURRENT_USER_KEY = 'fitsphere_rn_current_user';

export const getUsers = async (): Promise<User[]> => {
  try {
    const data = await AsyncStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveUser = async (user: User): Promise<void> => {
  try {
    const users = await getUsers();
    const existingIdx = users.findIndex(u => u.username === user.username);
    if (existingIdx >= 0) {
      users[existingIdx] = user;
    } else {
      users.push(user);
    }
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    // Safety sync active session
    const currentUserStr = await AsyncStorage.getItem(CURRENT_USER_KEY);
    if (currentUserStr) {
       const cUser = JSON.parse(currentUserStr);
       if (cUser.username === user.username) {
           await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
       }
    }
  } catch (error) {
    console.error('Failed to save user', error);
  }
};

export const loginUser = async (username: string, password?: string): Promise<boolean> => {
  const users = await getUsers();
  const user = users.find(u => u.username === username);
  if (user && (user.password === password || (!user.password && !password))) {
    // Migrate old user struct if needed
    if (!user.history.reflections) user.history.reflections = [];
    if (!user.history.focusSessions) user.history.focusSessions = [];
    if (!user.history.habits) user.history.habits = [];
    if (!user.history.challenges) user.history.challenges = [];
    if (!user.level) user.level = 1;
    
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return true;
  }
  return false;
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const data = await AsyncStorage.getItem(CURRENT_USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const updateUserData = async (updates: Partial<User>): Promise<void> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    // Automatically recalculate Level based on XP
    updated.level = Math.floor(updated.points / 100) + 1;
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updated));
    await saveUser(updated);
  } catch (error) {
    console.error('Failed to update user', error);
  }
};

// BMI System
export const calculateBMI = (heightCm: number, weightKg: number): number => {
  if (!heightCm || !weightKg) return 0;
  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
};

export const getBMICategory = (bmi: number): { category: string, color: string, suggestion: string } => {
  if (bmi < 18.5) return { category: 'Underweight', color: '#3b82f6', suggestion: 'Focus on calorie-dense healthy foods and strength training.' };
  if (bmi < 25) return { category: 'Normal', color: '#10b981', suggestion: 'Great job! Maintain your balanced diet and regular activity.' };
  if (bmi < 30) return { category: 'Overweight', color: '#f59e0b', suggestion: 'Try to increase cardio sessions and watch portion sizes.' };
  return { category: 'Obese', color: '#ef4444', suggestion: 'Prioritize low-calorie meals and low-impact consistent exercise.' };
};

export const logBMICheck = async () => {
  const user = await getCurrentUser();
  if (!user) return;
  const bmi = calculateBMI(Number(user.height), Number(user.weight));
  const bmiHistory = [...(user.bmiHistory || []), { bmi, date: new Date().toISOString() }];
  
  // Reward if improved (simplified logic: if it moves towards normal)
  let reward = 0;
  if (user.bmiHistory && user.bmiHistory.length > 0) {
      const lastBmi = user.bmiHistory[user.bmiHistory.length - 1].bmi;
      const wasHealthy = lastBmi >= 18.5 && lastBmi < 25;
      const isHealthy = bmi >= 18.5 && bmi < 25;
      if (!wasHealthy && isHealthy) reward = 100; // Big bonus for reaching healthy range
      else if (Math.abs(bmi - 22) < Math.abs(lastBmi - 22)) reward = 20; // Small bonus for moving towards center
  }

  await updateUserData({ bmiHistory });
  if (reward > 0) await rewardUserPoints(reward, "BMI Progress Improvement");
};

// Gamification System
export const addXP = async (amount: number) => {
  const user = await getCurrentUser();
  if (!user) return;
  await updateUserData({ points: (user.points || 0) + amount });
};

// 1. AI Life Coach: Reflections
export const submitReflection = async (mood: string, energy: number, sleepHours: number) => {
  const user = await getCurrentUser();
  if (!user) return null;
  
  const history = { ...user.history };
  const reflection = { mood, energy, sleepHours, date: new Date().toISOString() };
  history.reflections = [...(history.reflections || []), reflection];
  
  await updateUserData({ history });
  await addXP(20); // Reward reflection

  // Generate AI Suggestions
  let suggestion = "Keep up the great work!";
  let burnoutRisk = detectBurnoutRisk(history);

  if (burnoutRisk) {
    suggestion = "High burnout risk detected! Adaptive Plan: Reduce workouts today, focus on meditation and sleeping early.";
  } else if (sleepHours < 6) {
    suggestion = "Low sleep detected. Try to take a 20-minute power nap or sleep earlier tonight to optimize recovery.";
  } else if (energy > 8) {
    suggestion = "High energy! Today is a great day to tackle that challenging workout or complex task on your planner.";
  }

  return { suggestion, burnoutRisk };
};

// 8. Predictive Insights / Burnout Risk
export const detectBurnoutRisk = (history: any): boolean => {
  const recentSleep = (history.reflections || []).slice(-3);
  let totalSleep = 0;
  recentSleep.forEach((r: any) => totalSleep += r.sleepHours);
  
  const recentWorkouts = (history.exercise || []).slice(-3);
  let intenseWorkouts = recentWorkouts.filter((e: any) => e.duration >= 45).length;

  // If sleep < 15 hours in 3 days AND 2+ intense workouts = Burnout Risk
  if (recentSleep.length === 3 && totalSleep < 15 && intenseWorkouts >= 2) {
    return true;
  }
  return false;
};

// 2. Dynamic Life Balance Score
export const getLifeBalanceScore = async () => {
    const user = await getCurrentUser();
    if (!user) return { score: 0, reason: "No data", radar: [] };

    const hist = user.history;
    
    // Sub-scores (Base 50 to avoid discouraging empty starts)
    let health = 50;
    let productivity = 50;
    let mind = 50;
    let social = 50;
    let reason = "Balanced baseline.";

    // Health Calc
    const recentExercise = (hist.exercise || []).slice(-7).reduce((acc: any, e: any) => acc + e.duration, 0);
    if (recentExercise > 120) health += 30; else if (recentExercise > 30) health += 15;
    
    // Mind Calc
    const lastSleep = (hist.reflections || []).pop()?.sleepHours || 7;
    if (lastSleep >= 7) mind += 30; else { mind -= 20; reason = "Low sleep detected dropping Mind score."; }

    // Productivity 
    const recentTasks = (hist.tasks || []).filter((t: any) => t.completed).length;
    if (recentTasks > 5) productivity += 30; else if (recentTasks > 0) productivity += 10;
    
    // Social (Challenges joined)
    if ((hist.challenges || []).length > 0) social += 40;

    // Caps
    health = Math.min(100, Math.max(0, health));
    productivity = Math.min(100, Math.max(0, productivity));
    mind = Math.min(100, Math.max(0, mind));
    social = Math.min(100, Math.max(0, social));

    const totalScore = Math.round((health + productivity + mind + social) / 4);

    return { 
      score: totalScore, 
      reason, 
      radar: [
        { subject: 'Health', A: health, fullMark: 100 },
        { subject: 'Productivity', A: productivity, fullMark: 100 },
        { subject: 'Mind', A: mind, fullMark: 100 },
        { subject: 'Social', A: social, fullMark: 100 }
      ]
    };
};

// 3. Smart Habits & 10. Reset System
export const logHabit = async (habitName: string, skipWithoutGuilt: boolean = false) => {
    const user = await getCurrentUser();
    if (!user) return;

    const history = { ...user.history };
    history.habits = [...(history.habits || []), { name: habitName, skip: skipWithoutGuilt, date: new Date().toISOString() }];

    let newStreak = user.streak;
    if (!skipWithoutGuilt) {
        newStreak += 1;
        await addXP(10);
    } else {
        // Soft reset: Streak doesn't break entirely, it just maintains or halves instead of 0
        newStreak = Math.floor(newStreak / 2);
    }

    await updateUserData({ history, streak: newStreak });
};

// Core Tracking Wrappers
// Common Units System
export const SMART_FOOD_DB: any[] = [
  { name: "Rice", portions: [{ label: "🥣 Half Bowl", calories: 150 }, { label: "🥣 Full Bowl", calories: 250 }, { label: "🍽️ Full Plate", calories: 400 }], defaultPortion: "🥣 Full Bowl", calories: 250, protein: 4, type: "lunch", moodTags: ["happy", "tired"], healthTag: "balanced" },
  { name: "Idli", portions: [{ label: "1 Piece", calories: 58 }, { label: "2 Pieces", calories: 116 }, { label: "3 Pieces", calories: 174 }], defaultPortion: "2 Pieces", calories: 116, protein: 4, type: "breakfast", moodTags: ["energetic", "tired"], healthTag: "low-cal" },
  { name: "Dosa", portions: [{ label: "Small", calories: 120 }, { label: "Medium", calories: 180 }, { label: "Large", calories: 250 }], defaultPortion: "Medium", calories: 180, protein: 4, type: "breakfast", moodTags: ["happy", "energetic"], healthTag: "balanced" },
  { name: "Chapati", portions: [{ label: "1 Piece", calories: 104 }, { label: "2 Pieces", calories: 208 }], defaultPortion: "2 Pieces", calories: 208, protein: 6, type: "dinner", moodTags: ["happy", "stressed"], healthTag: "balanced" },
  { name: "Egg", portions: [{ label: "1 Boiled", calories: 78 }, { label: "2 Boiled", calories: 156 }], defaultPortion: "2 Boiled", calories: 156, protein: 12, type: "breakfast", moodTags: ["tired", "energetic"], healthTag: "high-protein" },
  { name: "Chicken", portions: [{ label: "🍗 100g", calories: 165 }, { label: "🍗 200g", calories: 330 }], defaultPortion: "🍗 100g", calories: 165, protein: 30, type: "lunch", moodTags: ["happy", "sad"], healthTag: "high-protein" },
  { name: "Apple", portions: [{ label: "🍎 Small", calories: 52 }, { label: "🍎 Medium", calories: 95 }], defaultPortion: "🍎 Medium", calories: 95, protein: 0, type: "snack", moodTags: ["stressed", "energetic"], healthTag: "low-cal" },
  { name: "Banana", portions: [{ label: "🍌 Small", calories: 90 }, { label: "🍌 Medium", calories: 105 }], defaultPortion: "🍌 Medium", calories: 105, protein: 1, type: "snack", moodTags: ["tired", "sad"], healthTag: "low-cal" },
  { name: "Fried Chicken", portions: [{label:"🍗 Combo", calories: 500}], defaultPortion: "🍗 Combo", calories: 500, protein: 20, type: "dinner", moodTags: ["stressed", "sad"], healthTag: "unhealthy", healthierAlternative: "Chicken" },
  { name: "Pizza", portions: [{label:"🍕 Regular", calories: 600}], defaultPortion: "🍕 Regular", calories: 600, protein: 15, type: "dinner", moodTags: ["happy", "sad", "stressed"], healthTag: "unhealthy", healthierAlternative: "Salad Bowl" },
  { name: "Salad Bowl", portions: [{label:"🥗 Bowl", calories: 150}], defaultPortion: "🥗 Bowl", calories: 150, protein: 10, type: "lunch", moodTags: ["energetic"], healthTag: "low-cal" }
];

export const searchFood = (query: string) => {
   if (!query) return [];
   return SMART_FOOD_DB.filter(f => f.name.toLowerCase().includes(query.toLowerCase()));
};

export const getSmartFoodSuggestions = async (user: any, mood: string) => {
   const hour = new Date().getHours();
   let timeType = "breakfast";
   if (hour >= 11 && hour < 16) timeType = "lunch";
   else if (hour >= 16 && hour < 19) timeType = "snack";
   else if (hour >= 19) timeType = "dinner";

   // 1. Filter by time
   let candidates = SMART_FOOD_DB.filter(f => f.type === timeType || f.type === 'snack');

   // 2. Remove Allergies
   candidates = candidates.filter(f => {
      let isAllergic = false;
      user.allergies?.forEach((a: string) => {
         if (f.name.toLowerCase().includes(a.toLowerCase())) isAllergic = true;
      });
      return !isAllergic;
   });

   // Generate Score
   const scored = candidates.map(f => {
      let score = 0;
      let isFav = false;
      user.favoriteFoods?.forEach((fav: string) => {
         if (f.name.toLowerCase().includes(fav.toLowerCase())) { score += 5; isFav = true; }
      });
      if (f.moodTags.includes(mood.toLowerCase())) score += 3;
      
      const bmi = calculateBMI(Number(user.height), Number(user.weight));
      if ((bmi >= 25) && f.healthTag === 'low-cal') score += 4;
      if ((bmi < 18.5) && f.healthTag === 'high-protein') score += 4;

      if (user.goal === 'Weight Loss' && f.healthTag === 'low-cal') score += 2;
      if (user.goal === 'Muscle Gain' && f.healthTag === 'high-protein') score += 2;
      if (user.goal === 'Maintain' && f.healthTag === 'balanced') score += 2;

      return { ...f, score, isFav };
   });

   scored.sort((a,b) => b.score - a.score);

   // Return explicitly separated groups
   const recommended = scored.slice(0, 2);
   const favorites = scored.filter(s => s.isFav).slice(0, 2);
   
   // Healthier swap
   let healthSwap = null;
   const unhealthyCandidate = scored.find(s => s.healthTag === 'unhealthy');
   if (unhealthyCandidate && unhealthyCandidate.healthierAlternative) {
      healthSwap = { bad: unhealthyCandidate.name, good: SMART_FOOD_DB.find(f => f.name === unhealthyCandidate.healthierAlternative) };
   }

   const avoid = SMART_FOOD_DB.filter(f => {
      let isAllergic = false;
      user.allergies?.forEach((a: string) => {
         if (f.name.toLowerCase().includes(a.toLowerCase())) isAllergic = true;
      });
      return isAllergic;
   });

   return { recommended, favorites, healthSwap, avoid };
};

export const getFrequentFoods = async () => {
    return [SMART_FOOD_DB[0]]; 
};

export const addFoodEntry = async (meal: { name: string, portion?: string, calories: number, type: string }) => {
  const user = await getCurrentUser();
  if (!user) return;
  const history = { ...user.history };
  history.food = [...(history.food || []), { ...meal, date: new Date().toISOString() }];
  await updateUserData({ history });
  await addXP(5);
};

export const addWaterEntry = async (amountMl: number) => {
  const user = await getCurrentUser();
  if (!user) return;
  const history = { ...user.history };
  history.water = [...(history.water || []), { amount: amountMl, date: new Date().toISOString() }];
  await updateUserData({ history });
  await addXP(2);
};

export const addExerciseEntry = async (exercise: { name: string, duration: number, caloriesBurned: number }) => {
  const user = await getCurrentUser();
  if (!user) return;
  const history = { ...user.history };
  history.exercise = [...(history.exercise || []), { ...exercise, date: new Date().toISOString() }];
  await updateUserData({ history });
  await addXP(15);
};

export const filterSafeFoods = async (foods: Food[], userAllergies: string[]): Promise<{ safe: Food[], avoid: Food[] }> => {
  const safe: Food[] = [];
  const avoid: Food[] = [];
  const allergyRegex = new RegExp(userAllergies.join('|'), 'i');
  
  for (const food of foods) {
    if (userAllergies.length > 0 && allergyRegex.test(food.name)) {
      avoid.push(food);
    } else {
      safe.push(food);
    }
  }
  return { safe, avoid };
};

export const recommendFoods = async (restaurantMenu: Food[]): Promise<{ recommended: Food[], favorites: Food[], avoid: Food[] }> => {
  const user = await getCurrentUser();
  if (!user) return { recommended: restaurantMenu, favorites: [], avoid: [] };
  
  const { safe, avoid } = await filterSafeFoods(restaurantMenu, user.allergies);
  
  const favorites: Food[] = [];
  const recommended: Food[] = [];
  
  const favRegex = user.favoriteFoods.length > 0 ? new RegExp(user.favoriteFoods.join('|'), 'i') : null;
  
  for (const food of safe) {
    if (favRegex && favRegex.test(food.name)) {
      favorites.push(food);
    } else {
      if (user.goal === 'Weight Loss' && food.calories > 500) {
      } else if (user.goal === 'Muscle Gain' && (!food.protein || food.protein < 15)) {
      } else {
        recommended.push(food);
      }
    }
  }
  
  if (user.goal === 'Weight Loss') {
    recommended.sort((a, b) => a.calories - b.calories);
  } else if (user.goal === 'Muscle Gain') {
    recommended.sort((a, b) => (b.protein || 0) - (a.protein || 0));
  }
  
  return { recommended, favorites, avoid };
};

// Insights and Weekly Report System
export const generateWeeklyReport = async () => {
    const user = await getCurrentUser();
    if (!user) return null;
    
    // Evaluate Data patterns
    const habitsCount = (user.history?.habits || []).length;
    const bmi = calculateBMI(Number(user.height), Number(user.weight));
    const { category } = getBMICategory(bmi);
    
    return {
        performance: habitsCount > 5 ? "Excellent 🌟" : "Needs Consistency 📉",
        strengths: ["Hydration Tracking", `Healthy BMI Status: ${category}`],
        weaknesses: ["Sleep Schedule", "Diet Variances"],
        suggestions: "Try bringing your sleep boundaries down by 30 minutes each day. Your productivity peaks at 10 AM, use that for hardest tasks!",
        date: new Date().toISOString()
    };
};

export const getPredictiveInsights = async () => {
    const user = await getCurrentUser();
    if (!user) return [];
    
    let insights = [];
    if (user.streak > 5) {
       insights.push({ type: 'warning', msg: "Statistically, Day 6 is a prime drop-off point. Secure your streak today by acting very early!" });
    }
    
    insights.push({ type: 'info', msg: "Smart Reminder: You historically skip water on weekends. Pre-fill your bottles today!" });
    return insights;
};

/* ==================================
 * EXCLUSIVE: PLANNER & BONUS SYSTEM
 * ================================== */

export interface PlannerTask {
   id: string;
   title: string;
   timeSection: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
   type: "health" | "food" | "exercise" | "focus";
   completed: boolean;
   points: number;
}

export const generateDailyPlan = async () => {
   const user = await getCurrentUser();
   if (!user) return [];

   const tasks: PlannerTask[] = [];
   const bmi = calculateBMI(Number(user.height), Number(user.weight));
   const isObese = bmi >= 30;
   const isUnderweight = bmi < 18.5;

   // Morning Block
   tasks.push({ id: 'm1', title: 'Wake up & Hydrate', timeSection: 'Morning', type: 'health', completed: false, points: 10 });
   tasks.push({ id: 'm2', title: isUnderweight ? 'High-Protein Breakfast' : 'Balanced Breakfast', timeSection: 'Morning', type: 'food', completed: false, points: 20 });
   
   if (user.goal === 'Weight Loss') {
      tasks.push({ id: 'm3', title: isObese ? '15m Low-Impact Walk' : '25m Cardio Burst', timeSection: 'Morning', type: 'exercise', completed: false, points: 20 });
   } else {
      tasks.push({ id: 'm3', title: 'Morning Stretching', timeSection: 'Morning', type: 'health', completed: false, points: 10 });
   }
   
   // Afternoon Block
   tasks.push({ id: 'a1', title: 'Focused Work Block', timeSection: 'Afternoon', type: 'focus', completed: false, points: 15 });
   tasks.push({ id: 'a2', title: isObese ? 'Leafy Green Lunch' : 'Balanced Power Lunch', timeSection: 'Afternoon', type: 'food', completed: false, points: 20 });
   tasks.push({ id: 'a3', title: '10 Min Walk', timeSection: 'Afternoon', type: 'health', completed: false, points: 10 });

   // Evening Block
   tasks.push({ id: 'e1', title: 'Healthy Snack', timeSection: 'Evening', type: 'food', completed: false, points: 10 });
   if (user.goal === 'Muscle Gain') {
      tasks.push({ id: 'e2', title: 'Strength Training', timeSection: 'Evening', type: 'exercise', completed: false, points: 30 });
   } else {
      tasks.push({ id: 'e2', title: isObese ? 'Mobility Exercises' : 'Yoga Flow', timeSection: 'Evening', type: 'exercise', completed: false, points: 30 });
   }

   // Night Block
   tasks.push({ id: 'n1', title: 'Light Dinner', timeSection: 'Night', type: 'food', completed: false, points: 20 });
   tasks.push({ id: 'n2', title: 'Digital Detox & Sleep', timeSection: 'Night', type: 'health', completed: false, points: 10 });

   return tasks;
};

// Fire an explicit daily reward evaluation
export const evaluateLoginBonus = async () => {
   const user = await getCurrentUser();
   if (!user) return null;

   const today = new Date().toDateString();
   if (user.lastLoginDate !== today) {
       user.lastLoginDate = today;
       user.points = (user.points || 0) + 5;
       await saveUser(user);
       return { reward: 5, message: "First login of the day" };
   }
   return null;
};

/* ==================================
 * EXCLUSIVE: SOCIAL GROUPS
 * ================================== */
const GROUPS_KEY = 'fitsphere_rn_groups';

export const searchUser = async (username: string) => {
   const users = await getAllUsers();
   return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
};

export interface Group {
   groupName: string;
   createdBy: string;
   members: string[];
   joinRequests?: string[];
   points: Record<string, number>;
}

export const getGroups = async (): Promise<Group[]> => {
   const data = await AsyncStorage.getItem(GROUPS_KEY);
   let groups: Group[] = data ? JSON.parse(data) : [];
   
   // Ensure Community Group exists
   if (!groups.find(g => g.groupName === "Global Fitness")) {
       const publicGroup: Group = {
           groupName: "Global Fitness",
           createdBy: "system",
           members: [],
           joinRequests: [],
           points: {}
       };
       groups.push(publicGroup);
       await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
   }
   return groups;
};

export const getGamificationRank = (points: number): { title: string, color: string, icon: string } => {
    if (points >= 1500) return { title: 'Pro', color: '#f59e0b', icon: 'medal' };
    if (points >= 500) return { title: 'Intermediate', color: '#94a3b8', icon: 'shield-star' };
    return { title: 'Beginner', color: '#b45309', icon: 'star-circle' };
};

export const createGroup = async (groupName: string, extraMembers: string[] = []) => {
   const user = await getCurrentUser();
   if (!user) return { error: "User undefined" };

   const groups = await getGroups();
   if (groups.find(g => g.groupName.toLowerCase() === groupName.toLowerCase())) return { error: "Group already exists!" };

   const validMembers = [user.username];
   const initialPoints: any = { [user.username]: user.points };

   // Validate extra members
   const gUsers = await getAllUsers();
   for (let m of extraMembers) {
       m = m.trim();
       if (!m) continue;
       const uObj = gUsers.find(u => u.username.toLowerCase() === m.toLowerCase());
       if (!uObj) return { error: `User ${m} not found!` };
       if (!validMembers.includes(uObj.username)) {
           validMembers.push(uObj.username);
           initialPoints[uObj.username] = uObj.points || 0;
       }
   }

   if (validMembers.length > 6) return { error: "Cannot create group over 6 limit!" };

   const newGroup: Group = {
      groupName,
      createdBy: user.username,
      members: validMembers,
      joinRequests: [],
      points: initialPoints 
   };
   groups.push(newGroup);
   await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
   return { success: true };
};

export const joinGroup = async (groupName: string) => {
   const user = await getCurrentUser();
   if (!user) return { error: "User undefined" };

   const groups = await getGroups();
   const gIdx = groups.findIndex(g => g.groupName.toLowerCase() === groupName.toLowerCase());
   if (gIdx === -1) return { error: "Group not found." };
   
   const g = groups[gIdx];
   if (g.members.length >= 6) return { error: "Group is full (max 6 members)." };
   if (g.members.includes(user.username)) return { error: "You are already inside!" };
   if (g.joinRequests?.includes(user.username)) return { error: "Request already pending!" };

   if (!g.joinRequests) g.joinRequests = [];
   g.joinRequests.push(user.username);
   
   await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
   DeviceEventEmitter.emit('SHOW_TOAST', { message: `Requested to join ${groupName}!` });
   return { success: true };
};

export const approveGroupRequest = async (groupName: string, targetUser: string) => {
   const groups = await getGroups();
   const gIdx = groups.findIndex(g => g.groupName.toLowerCase() === groupName.toLowerCase());
   if (gIdx === -1) return;
   
   const g = groups[gIdx];
   g.joinRequests = g.joinRequests?.filter((u: string) => u !== targetUser) || [];
   
   if (g.members.length < 6 && !g.members.includes(targetUser)) {
       g.members.push(targetUser);
       // Fetch targeted user XP to initialize properly
       const allUsers = await getAllUsers();
       const uObj = allUsers.find(u => u.username === targetUser);
       g.points[targetUser] = uObj ? (uObj.points || 0) : 0;
   }
   await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
   DeviceEventEmitter.emit('SHOW_TOAST', { message: `Approved ${targetUser}!` });
   DeviceEventEmitter.emit('POINTS_UPDATED');
};

export const rejectGroupRequest = async (groupName: string, targetUser: string) => {
   const groups = await getGroups();
   const gIdx = groups.findIndex(g => g.groupName.toLowerCase() === groupName.toLowerCase());
   if (gIdx === -1) return;
   
   const g = groups[gIdx];
   g.joinRequests = g.joinRequests?.filter((u: string) => u !== targetUser) || [];
   
   await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
   DeviceEventEmitter.emit('SHOW_TOAST', { message: `Rejected ${targetUser}!` });
   DeviceEventEmitter.emit('POINTS_UPDATED');
};

export const leaveGroup = async (groupName: string) => {
   const user = await getCurrentUser();
   if (!user) return { error: "Session invalid" };

   const groups = await getGroups();
   let dirty = false;
   groups.forEach(g => {
       if (g.groupName.toLowerCase() === groupName.toLowerCase() && g.members.includes(user.username)) {
           g.members = g.members.filter((m: string) => m !== user.username);
           delete g.points[user.username];
           dirty = true;
       }
   });

   if (dirty) {
      const activeGroups = groups.filter(g => g.members.length > 0);
      await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(activeGroups));
   }
   return { success: true };
};

// Automatically sync the current user's isolated XP to their joined groups dynamically
export const syncPointsToGroups = async () => {
   const user = await getCurrentUser();
   if (!user) return;
   
   const groups = await getGroups();
   let dirty = false;
   groups.forEach(g => {
       if (g.members.includes(user.username)) {
           g.points[user.username] = user.points;
           dirty = true;
       }
   });
   
   if(dirty) await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
};

/* ==================================
 * EXCLUSIVE: GLOBAL LEADERBOARD & WEEKLY
 * ================================== */
export const getAllUsers = async (): Promise<User[]> => {
   const users = await getUsers();
   
   // Inject multiple mock users natively so the Global leaderboard has competition
   const mockUsers: User[] = [
      { username: 'AlexFit', fullName: 'Alex', email: '', bloodGroup: '', height: '', weight: '', goal: '', allergies: [], favoriteFoods: [], points: 4500, weeklyPoints: 850, streak: 10, level: 3, history: { food:[], water:[], exercise:[], reflections:[], focusSessions:[], habits:[], tasks:[], challenges:[] }, friends: [], badges: ['Beta Tester'] },
      { username: 'GymRat44', fullName: 'Sarah', email: '', bloodGroup: '', height: '', weight: '', goal: '', allergies: [], favoriteFoods: [], points: 3200, weeklyPoints: 600, streak: 5, level: 2, history: { food:[], water:[], exercise:[], reflections:[], focusSessions:[], habits:[], tasks:[], challenges:[] }, friends: [], badges: [] },
      { username: 'IronMike', fullName: 'Mike', email: '', bloodGroup: '', height: '', weight: '', goal: '', allergies: [], favoriteFoods: [], points: 5800, weeklyPoints: 1200, streak: 14, level: 5, history: { food:[], water:[], exercise:[], reflections:[], focusSessions:[], habits:[], tasks:[], challenges:[] }, friends: [], badges: ['Elite Lifter', '7-Day Streak'] },
   ];
   
   return [...users, ...mockUsers]; // Overlap local + globally simulated data
};

export const evaluateWeeklyReset = async () => {
   const user = await getCurrentUser();
   if (!user) return;

   const now = new Date();
   if (!user.lastWeeklyReset) {
       user.lastWeeklyReset = now.toISOString();
       await saveUser(user);
       return;
   }

   const lastReset = new Date(user.lastWeeklyReset);
   const diffTime = Math.abs(now.getTime() - lastReset.getTime());
   const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

   if (diffDays >= 7) {
       user.weeklyPoints = 0;
       user.lastWeeklyReset = now.toISOString();
       await saveUser(user);
   }
};

export const addWeeklyPoints = async (pts: number) => {
   const user = await getCurrentUser();
   if (!user) return;
   user.weeklyPoints = (user.weeklyPoints || 0) + pts;
   await saveUser(user);
};

/* ==================================
 * EXCLUSIVE: GLOBAL POINT DISTRIBUTION
 * ================================== */
export const rewardUserPoints = async (points: number, reason: string) => {
    if (points <= 0) return;
    const user = await getCurrentUser();
    if (!user) return;

    // 1. Evaluate Streaks intelligently (Only counts actively logged tasks)
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayStr = today.toDateString();
    
    let bonusFired = 0;
    if (user.lastActiveDate !== todayStr) {
        if (user.lastActiveDate) {
            const lastActive = new Date(user.lastActiveDate);
            lastActive.setHours(0,0,0,0);
            const diffTime = Math.abs(today.getTime() - lastActive.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                user.streak = (user.streak || 0) + 1;
                bonusFired = 20; // Internal streak bonus!
            } else {
                user.streak = 1; // Broken streak, reset
            }
        } else {
            user.streak = 1;
        }
        user.lastActiveDate = todayStr;
    }

    const totalAward = points + bonusFired;
    user.points = (user.points || 0) + totalAward;
    user.weeklyPoints = (user.weeklyPoints || 0) + totalAward;

    // 2. Safely Sync exactly into Global Users Array + Local
    const allUsers = await getUsers(); // Raw offline array
    const globalIdx = allUsers.findIndex(u => u.username === user.username);
    if (globalIdx >= 0) allUsers[globalIdx] = user;
    else allUsers.push(user);
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(allUsers));
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));

    // 3. Identify Groups & Update Safely
    const groups = await getGroups();
    let groupsUpdated = false;
    groups.forEach(g => {
        if (g.members.includes(user.username)) {
            g.points[user.username] = user.points;
            groupsUpdated = true;
        }
    });
    if (groupsUpdated) {
        await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
    }

    // 4. Emit Toasts & Global Triggers
    DeviceEventEmitter.emit('SHOW_TOAST', { message: `🎉 +${points} XP: ${reason}` });
    if (bonusFired > 0) {
        setTimeout(() => DeviceEventEmitter.emit('SHOW_TOAST', { message: `🔥 Streak Bonus +20!` }), 500);
    }
    DeviceEventEmitter.emit('POINTS_UPDATED');
};

export const addFriend = async (friendUsername: string) => {
   const user = await getCurrentUser();
   if (!user) return { error: "Session invalid." };
   
   const users = await getAllUsers();
   const friendMatch = users.find(u => u.username.toLowerCase() === friendUsername.toLowerCase());
   
   if (!friendMatch) return { error: "User does not exist!" };
   if (friendUsername.toLowerCase() === user.username.toLowerCase()) return { error: "You cannot add yourself." };
   
   if (!user.friends) user.friends = [];
   if (user.friends.some(f => f.toLowerCase() === friendUsername.toLowerCase())) {
       return { error: "You are already friends!" };
   }
   
   user.friends.push(friendMatch.username); // Push exact case
   await saveUser(user);
   return { success: true };
};
