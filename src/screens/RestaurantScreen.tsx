import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { getCurrentUser, Food } from '../lib/storage';
import { useTheme } from '../context/ThemeContext';

export const RESTAURANTS_DB = [
  { name: "Saravana Bhavan", foods: [{ name: "Idli", calories: 58, protein: 2 }, { name: "Dosa", calories: 168, protein: 3 }, { name: "Mini Meals", calories: 350, protein: 8 }] },
  { name: "A2B (Adyar Ananda Bhavan)", foods: [{ name: "Chapati", calories: 120, protein: 3 }, { name: "Veg Meals", calories: 400, protein: 10 }, { name: "Pongal", calories: 250, protein: 6 }] },
  { name: "KFC", foods: [{ name: "Fried Chicken", calories: 320, protein: 20 }, { name: "Zinger Burger", calories: 450, protein: 18 }, { name: "Popcorn Chicken", calories: 300, protein: 15 }] },
  { name: "McDonald's", foods: [{ name: "Veg Burger", calories: 300, protein: 8 }, { name: "Chicken Burger", calories: 400, protein: 15 }, { name: "Fries", calories: 365, protein: 4 }] },
  { name: "Domino's Pizza", foods: [{ name: "Margherita Pizza", calories: 250, protein: 8 }, { name: "Veggie Pizza", calories: 300, protein: 10 }, { name: "Chicken Pizza", calories: 350, protein: 15 }] },
  { name: "Subway", foods: [{ name: "Veg Sub", calories: 230, protein: 8 }, { name: "Chicken Sub", calories: 280, protein: 18 }, { name: "Salad Bowl", calories: 150, protein: 10 }] },
  { name: "Barbeque Nation", foods: [{ name: "Grilled Chicken", calories: 280, protein: 25 }, { name: "Paneer Tikka", calories: 260, protein: 12 }, { name: "Buffet Meal", calories: 600, protein: 30 }] },
  { name: "Paradise Biryani", foods: [{ name: "Chicken Biryani", calories: 500, protein: 20 }, { name: "Veg Biryani", calories: 400, protein: 10 }, { name: "Mutton Biryani", calories: 600, protein: 25 }] },
  { name: "Anjappar Chettinad", foods: [{ name: "Chicken Curry", calories: 350, protein: 20 }, { name: "Fish Fry", calories: 300, protein: 22 }, { name: "Meals", calories: 450, protein: 12 }] },
  { name: "Haldiram's", foods: [{ name: "Chole Bhature", calories: 450, protein: 12 }, { name: "Rajma Chawal", calories: 400, protein: 10 }, { name: "Snacks", calories: 300, protein: 6 }] },
  { name: "Wow! Momo", foods: [{ name: "Steamed Momos", calories: 200, protein: 10 }, { name: "Fried Momos", calories: 350, protein: 12 }, { name: "Momo Combo", calories: 450, protein: 15 }] },
  { name: "Burger King", foods: [{ name: "Veg Whopper", calories: 350, protein: 10 }, { name: "Chicken Whopper", calories: 500, protein: 20 }, { name: "Fries", calories: 365, protein: 4 }] },
  { name: "Pizza Hut", foods: [{ name: "Veg Pizza", calories: 280, protein: 9 }, { name: "Chicken Pizza", calories: 360, protein: 15 }, { name: "Garlic Bread", calories: 200, protein: 5 }] },
  { name: "Cafe Coffee Day", foods: [{ name: "Cold Coffee", calories: 180, protein: 5 }, { name: "Sandwich", calories: 250, protein: 10 }, { name: "Brownie", calories: 300, protein: 4 }] },
  { name: "Starbucks", foods: [{ name: "Latte", calories: 190, protein: 6 }, { name: "Wrap", calories: 300, protein: 12 }, { name: "Muffin", calories: 350, protein: 5 }] }
];

export const RestaurantScreen = () => {
  const { colors, isDark } = useTheme();
  const [user, setUser] = useState<any>(null);
  
  const [search, setSearch] = useState('');
  const [selectedRest, setSelectedRest] = useState<any>(null);

  // Filtered Arrays
  const [filteredRests, setFilteredRests] = useState(RESTAURANTS_DB);
  const [processedMenu, setProcessedMenu] = useState<{recommended: Food[], favorites: Food[], regular: Food[]}>({recommended:[], favorites:[], regular:[]});

  useEffect(() => {
    const fetchUser = async () => setUser(await getCurrentUser());
    fetchUser();
  }, []);

  useEffect(() => {
    if (!search) setFilteredRests(RESTAURANTS_DB);
    else setFilteredRests(RESTAURANTS_DB.filter(r => r.name.toLowerCase().includes(search.toLowerCase())));
  }, [search]);

  useEffect(() => {
    if (selectedRest && user) {
       // Filter Allergies First
       const safeFoods = selectedRest.foods.filter((food: Food) => {
          let allergic = false;
          (user.allergies || []).forEach((allergy: string) => {
             if (food.name.toLowerCase().includes(allergy.toLowerCase())) allergic = true;
          });
          return !allergic;
       });

       // Extract Favorites
       const favFoods: Food[] = [];
       const remFoods: Food[] = [];

       safeFoods.forEach((food: Food) => {
          let isFav = false;
          (user.favoriteFoods || []).forEach((fav: string) => {
             if (food.name.toLowerCase().includes(fav.toLowerCase())) isFav = true;
          });
          if (isFav) favFoods.push(food);
          else remFoods.push(food);
       });

       // Determine Goal Match
       let recommended: Food[] = [];
       let regular: Food[] = [];

       remFoods.forEach((f) => {
          let rec = false;
          if (user.goal === 'Weight Loss' && f.calories < 250) rec = true;
          else if (user.goal === 'Muscle Gain' && (f.protein || 0) > 15) rec = true;
          
          if (rec) recommended.push(f);
          else regular.push(f);
       });

       // Sort so lower calories are first on weight loss, higher protein first on muscle gain
       if (user.goal === 'Weight Loss') recommended.sort((a,b) => a.calories - b.calories);
       if (user.goal === 'Muscle Gain') recommended.sort((a,b) => (b.protein || 0) - (a.protein || 0));

       setProcessedMenu({ recommended, favorites: favFoods, regular });
    }
  }, [selectedRest, user]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Dining Engine</Text>
          <View style={[styles.searchContainer, { backgroundColor: isDark ? '#374151' : '#F9FAFB', borderColor: colors.border }]}>
             <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
             <TextInput 
               style={[styles.searchBar, { color: colors.text }]} 
               placeholder="Search restaurants..."
               value={search}
               onChangeText={(t) => { setSearch(t); setSelectedRest(null); }}
               placeholderTextColor={colors.textMuted}
             />
             {search.length > 0 && (
                <TouchableOpacity onPress={() => {setSearch(''); setSelectedRest(null);}}>
                   <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </TouchableOpacity>
             )}
          </View>
        </View>

        {!selectedRest ? (
          <FlatList
             data={filteredRests}
             keyExtractor={(_, i) => i.toString()}
             contentContainerStyle={styles.listContent}
             ListEmptyComponent={() => (
                <View style={{padding: 40, alignItems: 'center'}}>
                   <MaterialCommunityIcons name="silverware-fork-knife" size={48} color={colors.textMuted} style={{marginBottom: 16}} />
                   <Text style={{color: colors.text, fontSize: 18, fontWeight: '800'}}>No restaurants found</Text>
                </View>
             )}
             renderItem={({ item }) => (
                <TouchableOpacity 
                   activeOpacity={0.8} 
                   style={[styles.restCard, { backgroundColor: colors.card, borderColor: colors.border }]} 
                   onPress={() => setSelectedRest(item)}>
                   <View style={styles.restIconWrap}>
                      <MaterialCommunityIcons name="storefront" size={24} color={colors.primary} />
                   </View>
                   <Text style={[styles.restName, { color: colors.text }]}>{item.name}</Text>
                   <Ionicons name="chevron-forward" size={20} color={colors.textMuted} style={{marginLeft: 'auto'}} />
                </TouchableOpacity>
             )}
          />
        ) : (
          <FlatList
             data={[]}
             keyExtractor={(_, i) => i.toString()}
             contentContainerStyle={styles.listContent}
             ListHeaderComponent={() => (
               <View>
                 <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', marginBottom: 20}} onPress={() => setSelectedRest(null)}>
                    <Ionicons name="arrow-back" size={24} color={colors.primary} />
                    <Text style={{color: colors.primary, fontWeight: '800', marginLeft: 8, fontSize: 16}}>Back to Restaurants</Text>
                 </TouchableOpacity>

                 <Text style={[{color: colors.text, fontSize: 24, fontWeight: '900', marginBottom: 24}]}>{selectedRest.name} Menu</Text>

                 {/* AI TOP PICK / DECISION HELPER */}
                 {(processedMenu.recommended.length > 0 || processedMenu.favorites.length > 0 || processedMenu.regular.length > 0) && (
                   <View style={[styles.topPickCard, { backgroundColor: colors.primary }]}>
                      {(() => {
                         const bestChoice = processedMenu.recommended[0] || processedMenu.favorites[0] || processedMenu.regular[0];
                         const isRec = processedMenu.recommended.length > 0;
                         return (
                            <>
                               <View style={styles.topPickHeader}>
                                  <MaterialCommunityIcons name="star-shooting" size={28} color="#fff" />
                                  <Text style={styles.topPickTitle}>AI Top Choice</Text>
                               </View>
                               <Text style={styles.topPickBody}>
                                  We recommend the <Text style={{fontWeight: '900'}}>{bestChoice.name}</Text>. 
                                  {isRec ? ` It aligns perfectly with your ${user?.goal} goal.` : ` It's a safe and balanced choice from the menu.`} 
                                  It contains {bestChoice.calories} kcal and {bestChoice.protein}g protein.
                               </Text>
                               <TouchableOpacity style={styles.topPickBtn}>
                                  <Text style={[styles.topPickBtnText, { color: colors.primary }]}>Add to Meal Tracker</Text>
                                </TouchableOpacity>
                            </>
                         );
                      })()}
                   </View>
                 )}

                 {/* Recommended Block */}
                 {processedMenu.recommended.length > 0 && (
                   <View style={styles.section}>
                     <View style={styles.sectionHeader}>
                        <View style={{backgroundColor: '#dcfce7', padding: 8, borderRadius: 10}}>
                           <MaterialCommunityIcons name="check-decagram" color="#22c55e" size={24} />
                        </View>
                        <View>
                           <Text style={[styles.sectionTitle, { color: colors.text }]}>AI Recommendations</Text>
                           <Text style={{color: colors.textMuted, fontSize: 12, fontWeight: '600'}}>Tailored for {user?.goal}</Text>
                        </View>
                     </View>
                     {processedMenu.recommended.map((f, i) => <FoodCard key={`rec_${i}`} food={f} borderColor="#bbf7d0" bgColor="#f0fdf4" iconColor="#22c55e" icon="check-bold" m_colors={colors} />)}
                   </View>
                 )}

                 {/* Favorites Block */}
                 {processedMenu.favorites.length > 0 && (
                   <View style={styles.section}>
                     <View style={styles.sectionHeader}>
                        <View style={{backgroundColor: '#fef3c7', padding: 8, borderRadius: 10}}>
                           <MaterialCommunityIcons name="star-circle" color="#f59e0b" size={24} />
                        </View>
                        <View>
                           <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Favorites</Text>
                           <Text style={{color: colors.textMuted, fontSize: 12, fontWeight: '600'}}>Based on your profile</Text>
                        </View>
                     </View>
                     {processedMenu.favorites.map((f, i) => <FoodCard key={`fav_${i}`} food={f} borderColor="#fde68a" bgColor="#fffbeb" iconColor="#f59e0b" icon="star" m_colors={colors} />)}
                   </View>
                 )}

                 {/* Regular Block */}
                 {processedMenu.regular.length > 0 && (
                   <View style={styles.section}>
                     <View style={styles.sectionHeader}>
                        <View style={{backgroundColor: '#f3f4f6', padding: 8, borderRadius: 10}}>
                           <MaterialCommunityIcons name="silverware" color={colors.textMuted} size={24} />
                        </View>
                        <View>
                           <Text style={[styles.sectionTitle, { color: colors.text }]}>Standard Menu</Text>
                           <Text style={{color: colors.textMuted, fontSize: 12, fontWeight: '600'}}>Everything else</Text>
                        </View>
                     </View>
                     {processedMenu.regular.map((f, i) => <FoodCard key={`reg_${i}`} food={f} borderColor={colors.border} bgColor={colors.card} iconColor={colors.textMuted} icon="food" m_colors={colors} />)}
                   </View>
                 )}

                 {/* Notice if array is fully empty (e.g. they are allergic to everything) */}
                 {processedMenu.favorites.length === 0 && processedMenu.recommended.length === 0 && processedMenu.regular.length === 0 && (
                    <Text style={{color: colors.textMuted, textAlign: 'center', marginTop: 40}}>Everything on this menu conflicts with your allergies!</Text>
                 )}

               </View>
             )}
             renderItem={() => null}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const FoodCard = ({ food, borderColor, bgColor, iconColor, icon, m_colors }: any) => (
  <TouchableOpacity activeOpacity={0.8} style={[styles.card, { borderColor, backgroundColor: bgColor }]}>
    <View style={styles.cardLeft}>
       <View style={[styles.iconWrap2, { backgroundColor: m_colors.bg === '#111827' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.6)' }]}>
           <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
       </View>
       <View>
          <Text style={[styles.foodName, { color: m_colors.text }]}>{food.name}</Text>
          <View style={styles.specsRow}>
             <MaterialCommunityIcons name="fire" size={14} color={m_colors.textMuted} />
             <Text style={[styles.foodSpecs, { color: m_colors.textMuted }]}>{food.calories} kcal</Text>
             <Text style={[styles.dot, {color: m_colors.border}]}>•</Text>
             <MaterialCommunityIcons name="arm-flex" size={14} color={m_colors.textMuted} />
             <Text style={[styles.foodSpecs, { color: m_colors.textMuted }]}>{food.protein}g Protein</Text>
          </View>
       </View>
    </View>
    <Ionicons name="add-circle" size={24} color={m_colors.primary} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 10, borderBottomWidth: 1, zIndex: 10, elevation: 3 },
  title: { fontSize: 24, fontWeight: '900', marginBottom: 16 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  searchBar: { flex: 1, paddingVertical: 14, fontSize: 16 },
  listContent: { padding: 20, paddingBottom: 40 },
  restCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12, elevation: 1 },
  restIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f3e8ff', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  restName: { fontSize: 18, fontWeight: '800' },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, marginLeft: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 12, elevation: 1 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap2: { padding: 8, borderRadius: 12 },
  foodName: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  specsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { fontWeight: 'bold' },
  foodSpecs: { fontSize: 13, fontWeight: '600' },
  
  // Top Pick Styles
  topPickCard: { padding: 24, borderRadius: 28, marginBottom: 32, elevation: 6, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.2, shadowRadius: 8 },
  topPickHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  topPickTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  topPickBody: { color: 'rgba(255,255,255,0.9)', fontSize: 15, lineHeight: 22, marginBottom: 20, fontWeight: '600' },
  topPickBtn: { backgroundColor: '#fff', paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  topPickBtnText: { fontWeight: '900', fontSize: 16 }
});
