import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, Modal, FlatList, DeviceEventEmitter } from 'react-native';
import { saveUser, loginUser } from '../lib/storage';
import { Ionicons } from '@expo/vector-icons';

const CustomPicker = ({ label, value, options, onSelect }: any) => {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <TouchableOpacity activeOpacity={0.7} style={styles.pickerBtn} onPress={() => setVisible(true)}>
        <Text style={value ? styles.pickerText : styles.pickerTextPlaceholder}>{value || label}</Text>
        <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalOption} onPress={() => { onSelect(item); setVisible(false); }}>
                  <Text style={[styles.modalOptionText, value === item && { color: '#8B5CF6', fontWeight: '800' }]}>{item}</Text>
                  {value === item && <Ionicons name="checkmark" size={20} color="#8B5CF6" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const TagInput = ({ label, tags, setTags, color = '#8B5CF6', bg = '#F5F3FF' }: any) => {
  const [input, setInput] = useState('');

  const addTag = () => {
    if (input.trim() && !tags.includes(input.trim())) {
      setTags([...tags, input.trim()]);
      setInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t: string) => t !== tag));
  };

  return (
    <View style={styles.tagInputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.tagRow}>
        <TextInput 
          style={[styles.input, { flex: 1, marginBottom: 0 }]} 
          placeholder={`E.g., Peanuts...`}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={addTag}
          placeholderTextColor="#9CA3AF"
        />
        <TouchableOpacity activeOpacity={0.8} style={[styles.addBtn, { backgroundColor: color }]} onPress={addTag}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={styles.chipsContainer}>
        {tags.map((tag: string) => (
          <TouchableOpacity activeOpacity={0.7} key={tag} style={[styles.chip, { backgroundColor: bg }]} onPress={() => removeTag(tag)}>
            <Text style={[styles.chipText, { color }]}>{tag}</Text>
            <Ionicons name="close-circle" size={16} color={color} style={styles.chipIcon} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export const RegisterScreen = ({ navigation }: any) => {
  const [form, setForm] = useState({
    username: '', fullName: '', email: '', password: '', 
    bloodGroup: '', height: '', weight: '', goal: ''
  });
  const [allergies, setAllergies] = useState<string[]>([]);
  const [favoriteFoods, setFavoriteFoods] = useState<string[]>([]);

  const handleRegister = async () => {
    if (!form.username || !form.fullName) {
      Alert.alert('Error', 'Please fill required fields (Username, Full Name)');
      return;
    }
    
    const newUser = {
      ...form,
      allergies,
      favoriteFoods,
      points: 0,
      streak: 0,
      level: 1,
      history: { food: [], water: [], exercise: [], reflections: [], focusSessions: [], habits: [], tasks: [], challenges: [] }
    };
    
    await saveUser(newUser);
    await loginUser(newUser.username, newUser.password);
    
    DeviceEventEmitter.emit('SHOW_TOAST', { message: 'Successfully Registered! 🎉' });
    navigation.replace('Main');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join FitSphere V2</Text>
          </View>

          <View style={styles.formGroup}>
            <TextInput style={styles.input} placeholder="Full Name" value={form.fullName} onChangeText={(t) => setForm({...form, fullName: t})} placeholderTextColor="#9CA3AF" />
            <TextInput style={styles.input} placeholder="Username" value={form.username} onChangeText={(t) => setForm({...form, username: t})} autoCapitalize="none" placeholderTextColor="#9CA3AF" />
            <TextInput style={styles.input} placeholder="Email" value={form.email} onChangeText={(t) => setForm({...form, email: t})} keyboardType="email-address" placeholderTextColor="#9CA3AF" />
            <TextInput style={styles.input} placeholder="Password" value={form.password} onChangeText={(t) => setForm({...form, password: t})} secureTextEntry placeholderTextColor="#9CA3AF" />
            
            <View style={styles.row}>
              <View style={{flex: 1}}>
                 <Text style={styles.fieldLabel}>Height (cm)</Text>
                 <TextInput style={styles.inputRow} placeholder="175" value={form.height} onChangeText={(t) => setForm({...form, height: t})} keyboardType="numeric" placeholderTextColor="#9CA3AF" />
              </View>
              <View style={{ width: 12 }} />
              <View style={{flex: 1}}>
                 <Text style={styles.fieldLabel}>Weight (kg)</Text>
                 <TextInput style={styles.inputRow} placeholder="70" value={form.weight} onChangeText={(t) => setForm({...form, weight: t})} keyboardType="numeric" placeholderTextColor="#9CA3AF" />
              </View>
            </View>
            
            <CustomPicker label="Select Blood Group" value={form.bloodGroup} options={['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'A1+ve']} onSelect={(val: string) => setForm({...form, bloodGroup: val})} />
            <CustomPicker label="Select Goal" value={form.goal} options={['Weight Loss', 'Muscle Gain', 'Maintain', 'Fitness']} onSelect={(val: string) => setForm({...form, goal: val})} />
            
            <TagInput label="Allergic Foods" tags={allergies} setTags={setAllergies} color="#ef4444" bg="#fef2f2" />
            <TagInput label="Favorite Foods" tags={favoriteFoods} setTags={setFavoriteFoods} color="#f59e0b" bg="#fffbeb" />
          </View>
          
          <TouchableOpacity activeOpacity={0.8} style={styles.btnPrimary} onPress={handleRegister}>
            <Text style={styles.btnText}>Register</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.linkText}>Already have an account? <Text style={styles.linkBold}>Login</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { padding: 24, paddingBottom: 40 },
  header: { marginBottom: 32, marginTop: 16 },
  title: { fontSize: 32, fontWeight: '900', color: '#111827' },
  subtitle: { fontSize: 16, color: '#6B7280', marginTop: 4, fontWeight: '500' },
  formGroup: { gap: 16, marginBottom: 24 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#4B5563', marginBottom: 6, marginLeft: 4 },
  row: { flexDirection: 'row' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, padding: 16, fontSize: 16, color: '#111827', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  inputRow: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, padding: 16, fontSize: 16, color: '#111827' },
  pickerBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerText: { fontSize: 16, color: '#111827', fontWeight: '600' },
  pickerTextPlaceholder: { fontSize: 16, color: '#9CA3AF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: 400 },
  modalHeader: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 16, marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', color: '#111827' },
  modalOption: { paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  modalOptionText: { fontSize: 16, fontWeight: '600', color: '#4B5563' },
  tagInputContainer: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, padding: 20, gap: 12, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 6, elevation: 1 },
  label: { fontSize: 15, fontWeight: '700', color: '#374151' },
  tagRow: { flexDirection: 'row', gap: 10 },
  addBtn: { borderRadius: 14, width: 52, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: {width:0, height:2}, shadowRadius: 4, elevation: 2 },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { fontSize: 14, fontWeight: '700' },
  chipIcon: { marginLeft: 6 },
  btnPrimary: { backgroundColor: '#8B5CF6', borderRadius: 16, padding: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#8B5CF6', shadowOpacity: 0.3, shadowOffset: {width:0, height:4}, shadowRadius: 10, elevation: 5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800', marginRight: 8 },
  linkBtn: { alignItems: 'center', padding: 20 },
  linkText: { color: '#6B7280', fontSize: 15, fontWeight: '500' },
  linkBold: { color: '#8B5CF6', fontWeight: '800' }
});
