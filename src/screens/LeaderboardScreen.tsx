import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform, FlatList, DeviceEventEmitter } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { getCurrentUser, getGroups, createGroup, joinGroup, syncPointsToGroups, getAllUsers, evaluateWeeklyReset, addFriend, leaveGroup, approveGroupRequest, rejectGroupRequest, getGamificationRank } from '../lib/storage';
import { useTheme } from '../context/ThemeContext';

export const LeaderboardScreen = () => {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'Friends' | 'Groups' | 'Weekly'>('Weekly');
  
  const [user, setUser] = useState<any>(null);
  
  // Roster arrays
  const [globalList, setGlobalList] = useState<any[]>([]);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [friendInput, setFriendInput] = useState('');

  // Group specific arrays
  const [userGroups, setUserGroups] = useState<any[]>([]);
  const [groupInput, setGroupInput] = useState('');
  const [groupMembersInput, setGroupMembersInput] = useState('');

  const fetchData = async () => {
    const cUser = await getCurrentUser();
    
    // Attempt offline delta math evaluating >7 day overlaps
    await evaluateWeeklyReset();
    setUser(cUser);
    
    // Trigger Social points synchronization across storage arrays securely
    await syncPointsToGroups();

    // Compile Top levels
    const gUsers = await getAllUsers();
    
    // 1. Weekly Sort
    const topWeekly = [...gUsers].sort((a,b) => (b.weeklyPoints || 0) - (a.weeklyPoints || 0));
    setGlobalList(topWeekly);

    // 2. Friends Sort (Mapping current local string associations into Objects)
    if (cUser) {
        const _f = gUsers.filter(u => (cUser.friends || []).includes(u.username) || u.username === cUser.username);
        _f.sort((a,b) => (b.points || 0) - (a.points || 0));
        setFriendsList(_f);
    }

    // 3. Group Bindings (Global Groups Rank)
    const allGroups = await getGroups();
    
    // Sort all groups by total combined points across members
    const sortedGroups = allGroups.map((g: any) => {
        const totalXP = Object.values(g.points).reduce((acc: any, val: any) => acc + (val as number), 0);
        
        g.leaderboard = Object.entries(g.points)
           .map(([usr, pts]) => ({ username: usr, points: pts as number }))
           .sort((a: any, b: any) => b.points - a.points);
           
        g.totalTeamPoints = totalXP;
        return g;
    }).sort((a,b) => (b.totalTeamPoints || 0) - (a.totalTeamPoints || 0));

    setUserGroups(sortedGroups);
  };

  useEffect(() => { 
      fetchData(); 
      const sub = DeviceEventEmitter.addListener('POINTS_UPDATED', fetchData);
      return () => sub.remove();
  }, [activeTab]);

  const handleCreate = async () => {
     if (!groupInput.trim()) return;
     const extraMembers = groupMembersInput.split(',').map(s => s.trim()).filter(Boolean);
     
     const res = await createGroup(groupInput.trim(), extraMembers);
     if (res.error) Alert.alert('Error', res.error);
     else { Alert.alert('Success', `Group ${groupInput} Created!`); setGroupInput(''); setGroupMembersInput(''); fetchData(); }
  };

  const handleJoin = async () => {
     if (!groupInput.trim()) return;
     const res = await joinGroup(groupInput.trim());
     if (res.error) Alert.alert('Error', res.error);
     else { Alert.alert('Success', `Joined ${groupInput}!`); setGroupInput(''); fetchData(); }
  };

  const handleAddFriend = async () => {
     if (!friendInput.trim()) return;
     const res = await addFriend(friendInput.trim());
     if (res.error) Alert.alert('Notice', res.error);
     else { Alert.alert('Success', `Added ${friendInput} to your roster!`); setFriendInput(''); fetchData(); }
  };

  const handleLeaveGroup = async (groupName: string) => {
     Alert.alert('Leave Group?', `Are you sure you want to abandon team ${groupName}?`, [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Leave', style: 'destructive', onPress: async () => {
            await leaveGroup(groupName);
            fetchData();
        }}
     ]);
  };

  const renderRankIcon = (index: number) => {
    if (index === 0) return <Text style={{fontSize: 24}}>🥇</Text>;
    if (index === 1) return <Text style={{fontSize: 24}}>🥈</Text>;
    if (index === 2) return <Text style={{fontSize: 24}}>🥉</Text>;
    return <Text style={styles.rankNum}>#{index + 1}</Text>;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex:1}}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Leaderboards</Text>
      </View>

      <View style={[styles.tabContainer, { backgroundColor: colors.card }]}>
        <TabButton title="Weekly" icon="calendar-week" active={activeTab === 'Weekly'} onPress={() => setActiveTab('Weekly')} colors={colors} />
        <TabButton title="Friends" icon="account-multiple" active={activeTab === 'Friends'} onPress={() => setActiveTab('Friends')} colors={colors} />
        <TabButton title="Groups" icon="account-group" active={activeTab === 'Groups'} onPress={() => setActiveTab('Groups')} colors={colors} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        
        {/* --- WEEKLY GLOBAL --- */}
        {activeTab === 'Weekly' && (
           <View>
              <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>Weekly XP automatically resets every 7 days. Climb locally and globally! 🌍</Text>
              <View style={[styles.leaderboardBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
                 {globalList.map((usr: any, i: number) => {
                    const isMe = usr.username === user?.username;
                    return (
                       <View key={`gw_${i}`} style={[styles.lbRow, { borderBottomColor: colors.border, backgroundColor: isMe ? '#f3f4f6' : 'transparent' }]}>
                          <View style={styles.lbLeft}>
                             <View style={{width: 34, alignItems: 'center'}}>{renderRankIcon(i)}</View>
                             <View style={[styles.avatar, { backgroundColor: isMe ? colors.primary : '#E5E7EB' }]}>
                                <Text style={{color: isMe ? '#fff' : '#6B7280', fontWeight: '900', fontSize: 16}}>{usr.username[0].toUpperCase()}</Text>
                             </View>
                             <View>
                                <Text style={[{fontSize: 16, fontWeight: isMe ? '900' : '700', color: isMe ? colors.primary : colors.text}]}>{usr.username}</Text>
                                <View style={{flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2}}>
                                    <MaterialCommunityIcons name={getGamificationRank(usr.points || 0).icon as any} size={14} color={getGamificationRank(usr.points || 0).color} />
                                    <Text style={{fontSize: 12, color: getGamificationRank(usr.points || 0).color, fontWeight: '700'}}>{getGamificationRank(usr.points || 0).title}</Text>
                                </View>
                             </View>
                          </View>
                          <View style={{alignItems: 'flex-end'}}>
                             <Text style={{fontSize: 18, fontWeight: '900', color: colors.text}}>{usr.weeklyPoints || 0}</Text>
                             <Text style={{fontSize: 12, color: colors.textMuted, fontWeight: '700'}}>WK XP</Text>
                          </View>
                       </View>
                    );
                 })}
              </View>
           </View>
        )}

        {/* --- FRIENDS MATCHING --- */}
        {activeTab === 'Friends' && (
           <View>
              <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>Compete against your immediate social circle mapping Total Global points! 🔥</Text>
              {friendsList.length <= 1 ? (
                 <View style={styles.emptyWrap}>
                    <MaterialCommunityIcons name="account-search" size={48} color={colors.textMuted} />
                    <Text style={{color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 12}}>No Friends Added</Text>
                    <Text style={{color: colors.textMuted, textAlign: 'center', marginTop: 4}}>You appear to be the only person in your friends array right now!</Text>
                 </View>
              ) : (
                <View style={[styles.leaderboardBlock, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 20 }]}>
                   {friendsList.map((usr: any, i: number) => {
                      const isMe = usr.username === user?.username;
                      return (
                         <View key={`fr_${i}`} style={[styles.lbRow, { borderBottomColor: colors.border }]}>
                            <View style={styles.lbLeft}>
                               <View style={{width: 34, alignItems: 'center'}}>{renderRankIcon(i)}</View>
                               <View style={[styles.avatar, { backgroundColor: isMe ? colors.primary : '#F3F4F6' }]}>
                                  <Text style={{color: isMe ? '#fff' : '#6B7280', fontWeight: '900', fontSize: 16}}>{usr.username[0].toUpperCase()}</Text>
                               </View>
                               <View>
                                  <Text style={[{fontSize: 16, fontWeight: isMe ? '900' : '700', color: isMe ? colors.primary : colors.text}]}>{usr.username}</Text>
                                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                                     <MaterialCommunityIcons name={getGamificationRank(usr.points || 0).icon as any} size={14} color={getGamificationRank(usr.points || 0).color} />
                                     <Text style={{fontSize: 12, color: getGamificationRank(usr.points || 0).color, fontWeight: '700'}}>{getGamificationRank(usr.points || 0).title}</Text>
                                  </View>
                               </View>
                            </View>
                            <View style={{alignItems: 'flex-end'}}>
                               <Text style={{fontSize: 18, fontWeight: '900', color: colors.text}}>{usr.points || 0}</Text>
                               <Text style={{fontSize: 12, color: colors.textMuted, fontWeight: '700'}}>TOT XP</Text>
                            </View>
                         </View>
                      );
                   })}
                </View>
              )}

              {/* Add Friend Input Block */}
              <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 20 }]}>
                 <Text style={[{color: colors.text, fontWeight: '800', marginBottom: 12}]}>Add a Friend</Text>
                 <Text style={[{color: colors.textMuted, marginBottom: 16, fontSize: 13}]}>Tip: Try typing "AlexFit" or "IronMike" (mock players)</Text>
                 <View style={{flexDirection: 'row', gap: 10}}>
                    <TextInput 
                        style={[styles.textInput, { flex: 1, backgroundColor: '#F3F4F6', color: colors.text }]} 
                        placeholder="Enter Friend Username" 
                        placeholderTextColor={colors.textMuted} 
                        value={friendInput} 
                        onChangeText={setFriendInput} 
                    />
                    <TouchableOpacity activeOpacity={0.8} style={[styles.btnAction, { backgroundColor: colors.primary, paddingHorizontal: 24 }]} onPress={handleAddFriend}>
                        <Text style={styles.btnText}>Add</Text>
                    </TouchableOpacity>
                 </View>
              </View>

           </View>
        )}

        {/* --- SOCIAL GROUPS --- */}
        {activeTab === 'Groups' && (
           <View>
              {/* Group Creation Interface */}
              <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 24 }]}>
                 <Text style={[{color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 12}]}>Enter Group Key</Text>
                 <TextInput style={[styles.textInput, { backgroundColor: '#F3F4F6', color: colors.text }]} placeholder="e.g FitFam2025" placeholderTextColor={colors.textMuted} value={groupInput} onChangeText={setGroupInput} />
                 
                 <Text style={[{color: colors.text, fontWeight: '800', marginTop: 16, marginBottom: 8}]}>Invite Members (Optional)</Text>
                 <TextInput style={[styles.textInput, { backgroundColor: '#F3F4F6', color: colors.text }]} placeholder="Comma separated (e.g AlexFit, IronMike)" placeholderTextColor={colors.textMuted} value={groupMembersInput} onChangeText={setGroupMembersInput} />
                 
                 <View style={{flexDirection: 'row', gap: 10, marginTop: 24}}>
                    <TouchableOpacity activeOpacity={0.8} style={[styles.btnAction, { backgroundColor: colors.primary, flex: 1 }]} onPress={handleJoin}><Text style={styles.btnText}>Request Join</Text></TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.8} style={[styles.btnAction, { backgroundColor: '#10b981', flex: 1 }]} onPress={handleCreate}><Text style={styles.btnText}>Create & Invite</Text></TouchableOpacity>
                 </View>
              </View>

              <Text style={[{color: colors.text, fontSize: 20, fontWeight: '900', marginBottom: 16}]}>Global Communities & Teams</Text>
              
              {userGroups.length === 0 ? (
                 <View style={styles.noGroupBlock}>
                    <MaterialCommunityIcons name="account-group" size={64} color={colors.textMuted} style={{marginBottom: 16, alignSelf: 'center'}} />
                    <Text style={[styles.promptTitle, { color: colors.text }]}>No Teams Found!</Text>
                 </View>
              ) : (
                 userGroups.map((g: any, groupIndex: number) => {
                    const isMyGroup = g.members.includes(user?.username);
                    return (
                    <View key={`g_${groupIndex}`} style={{ marginBottom: 30 }}>
                       {/* Dynamic Group Overview */}
                       <View style={[styles.groupBanner, { backgroundColor: isMyGroup ? colors.primary : '#4B5563' }]}>
                          <Ionicons name="people-circle" size={48} color="#fff" />
                          <View style={{marginLeft: 16, flexShrink: 1, flex: 1}}>
                             <Text style={{color: '#fff', fontSize: 24, fontWeight: '900'}}>{g.groupName}</Text>
                             <Text style={{color: '#ddd', fontSize: 13, fontWeight: '700'}}>Admin: {g.createdBy} • {g.members.length}/6</Text>
                          </View>
                          <View style={{alignItems: 'flex-end', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12}}>
                              <Text style={{color: '#fff', fontSize: 12, fontWeight: '800'}}>TOTAL SCORE</Text>
                              <Text style={{color: '#fff', fontSize: 20, fontWeight: '900'}}>{g.totalTeamPoints} pt</Text>
                          </View>
                          {isMyGroup && (
                          <TouchableOpacity activeOpacity={0.8} onPress={() => handleLeaveGroup(g.groupName)} style={{padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, marginLeft: 10}}>
                              <MaterialCommunityIcons name="exit-run" size={24} color="#fff" />
                          </TouchableOpacity>
                          )}
                       </View>

                       <View style={styles.leaderboardTitle}>
                          <MaterialCommunityIcons name="podium-gold" size={24} color="#f59e0b" />
                          <Text style={{fontSize: 18, fontWeight: '800', color: colors.text}}>Team Matrix</Text>
                       </View>

                       <View style={[styles.leaderboardBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
                          {g.leaderboard.map((mem: any, i: number) => {
                             const isMe = mem.username === user?.username;
                             return (
                                <View key={`m_${mem.username}`} style={[styles.lbRow, { borderBottomColor: colors.border }]}>
                                   <View style={styles.lbLeft}>
                                      <View style={{width: 34, alignItems: 'center'}}>{renderRankIcon(i)}</View>
                                      <View style={[styles.avatar, { backgroundColor: isMe ? colors.primary : '#F3F4F6' }]}>
                                         <Text style={{color: isMe ? '#fff' : colors.textMuted, fontWeight: '900', fontSize: 16}}>{mem.username[0].toUpperCase()}</Text>
                                      </View>
                                      <Text style={[{fontSize: 16, fontWeight: isMe ? '900' : '600', color: isMe ? colors.primary : colors.text}]}>{mem.username}</Text>
                                   </View>
                                   <Text style={{fontSize: 16, fontWeight: '800', color: colors.text}}>{mem.points} pts</Text>
                                </View>
                             );
                          })}
                       </View>

                       {/* ADMIN PANEL FOR PENDING REQUESTS */}
                       {(user?.username === g.createdBy && g.joinRequests && g.joinRequests.length > 0) && (
                          <View style={{marginTop: 16}}>
                             <Text style={{fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 8}}>Pending Join Requests</Text>
                             <View style={[styles.leaderboardBlock, { backgroundColor: '#f3f4f6', borderColor: colors.border }]}>
                                {g.joinRequests.map((reqUser: string, idx: number) => (
                                   <View key={`req_${idx}`} style={[styles.lbRow, { borderBottomColor: colors.border }]}>
                                      <View style={styles.lbLeft}>
                                         <View style={[styles.avatar, { backgroundColor: colors.card }]}>
                                            <Text style={{color: colors.text, fontWeight: '900', fontSize: 16}}>{reqUser[0].toUpperCase()}</Text>
                                         </View>
                                         <Text style={[{fontSize: 16, fontWeight: '700', color: colors.text}]}>{reqUser}</Text>
                                      </View>
                                      <View style={{flexDirection: 'row', gap: 8}}>
                                         <TouchableOpacity onPress={async () => { await approveGroupRequest(g.groupName, reqUser); fetchData(); }} style={{backgroundColor: '#10b981', padding: 8, borderRadius: 8}}>
                                             <MaterialCommunityIcons name="check" size={20} color="#fff" />
                                         </TouchableOpacity>
                                         <TouchableOpacity onPress={async () => { await rejectGroupRequest(g.groupName, reqUser); fetchData(); }} style={{backgroundColor: '#ef4444', padding: 8, borderRadius: 8}}>
                                             <MaterialCommunityIcons name="close" size={20} color="#fff" />
                                         </TouchableOpacity>
                                      </View>
                                   </View>
                                ))}
                             </View>
                          </View>
                       )}
                    </View>
                 );
                 })
              )}
           </View>
        )}

      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const TabButton = ({ title, icon, active, onPress, colors }: any) => (
  <TouchableOpacity activeOpacity={0.7} style={[styles.tab, active && {borderBottomWidth: 3, borderBottomColor: colors.primary}]} onPress={onPress}>
    <MaterialCommunityIcons name={icon} size={22} color={active ? colors.primary : colors.textMuted} />
    <Text style={[styles.tabText, { color: active ? colors.primary : colors.textMuted }]}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 10, borderBottomWidth: 1, elevation: 3, zIndex: 10 },
  title: { fontSize: 24, fontWeight: '900' },
  
  tabContainer: { flexDirection: 'row', elevation: 2 },
  tab: { flex: 1, paddingVertical: 16, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontWeight: '800', fontSize: 14 },

  content: { padding: 20, paddingBottom: 40 },
  sectionDesc: { fontSize: 14, fontWeight: '600', marginBottom: 20, lineHeight: 20 },
  
  groupBanner: { flexDirection: 'row', alignItems: 'center', padding: 24, borderRadius: 24, marginBottom: 24 },
  leaderboardTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, marginLeft: 4 },
  leaderboardBlock: { borderRadius: 24, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8, overflow: 'hidden' },
  lbRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, marginHorizontal: -16, paddingHorizontal: 16 },
  lbLeft: { flexDirection: 'row', alignItems: 'center' },
  rankNum: { fontSize: 16, fontWeight: '900', color: '#9CA3AF' },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12, marginLeft: 6 },
  
  emptyWrap: { alignItems: 'center', marginTop: 40 },

  noGroupBlock: { marginTop: 20 },
  promptTitle: { fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  promptSub: { fontSize: 16, textAlign: 'center', marginBottom: 30, paddingHorizontal: 20 },
  inputBox: { padding: 24, borderRadius: 24, borderWidth: 1 },
  textInput: { padding: 16, borderRadius: 12, fontSize: 16 },
  btnAction: { paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 }
});
