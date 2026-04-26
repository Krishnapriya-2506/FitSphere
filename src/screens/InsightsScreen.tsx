import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { generateWeeklyReport, getPredictiveInsights, getCurrentUser, calculateBMI, getBMICategory } from '../lib/storage';
import { BarChart, PieChart } from 'react-native-chart-kit';
import * as Print from 'expo-print';

const screenWidth = Dimensions.get('window').width;

export const InsightsScreen = () => {
  const [report, setReport] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchInsights = async () => {
       const u = await getCurrentUser();
       if(u) {
           setUser(u);
           const r = await generateWeeklyReport();
           const i = await getPredictiveInsights();
           setReport(r);
           setInsights(i);
       }
    };
    fetchInsights();
  }, []);

  const handlePrintPDF = async () => {
    if (!user || !report) return;
    setIsGenerating(true);

    try {
      const history = user.history || {};
      const foodLogs = history.food || [];
      const waterLogs = history.water || [];
      const exerciseLogs = history.exercise || [];
      const tasksLogs = history.tasks || [];
      const bmiHistory = user.bmiHistory || [];

      const totalWater = waterLogs.reduce((acc: number, curr: any) => acc + curr.amount, 0);
      const totalCalories = foodLogs.reduce((acc: number, curr: any) => acc + curr.calories, 0);
      const totalExercise = exerciseLogs.reduce((acc: number, curr: any) => acc + curr.duration, 0);
      const completionRate = tasksLogs.length > 0 
        ? Math.round((tasksLogs.filter((t: any) => t.completed).length / tasksLogs.length) * 100) 
        : 0;

      const bmi = calculateBMI(Number(user.height), Number(user.weight));
      const { category, color: bmiColor } = getBMICategory(bmi);

      const xpData = [20, 45, 28, 80, 99, 43, 50];
      const maxXP = Math.max(...xpData);

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page { size: A4; margin: 0; }
            body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; padding: 0; color: #1e293b; background: #ffffff; }
            .page { width: 210mm; height: 297mm; padding: 20mm; box-sizing: border-box; page-break-after: always; position: relative; overflow: hidden; }
            
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 6px solid #8b5cf6; padding-bottom: 15px; margin-bottom: 25px; }
            .brand { font-size: 36px; font-weight: 900; color: #8b5cf6; letter-spacing: -1px; }
            .date-box { text-align: right; font-size: 14px; color: #64748b; font-weight: bold; }
            
            .section-title { font-size: 20px; font-weight: 900; color: #0f172a; margin: 25px 0 15px; text-transform: uppercase; letter-spacing: 1.5px; border-left: 8px solid #8b5cf6; padding-left: 15px; }
            
            .hero-card { background: ${bmiColor}10; border: 3px solid ${bmiColor}; border-radius: 24px; padding: 25px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 25px; }
            .bmi-num { font-size: 64px; font-weight: 900; color: ${bmiColor}; margin: 0; line-height: 1; }
            .bmi-cat { font-size: 22px; font-weight: 800; color: #334155; margin-top: 5px; }
            
            .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px; }
            .mini-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 18px; text-align: center; }
            .mini-label { font-size: 11px; color: #64748b; font-weight: 800; text-transform: uppercase; margin-bottom: 6px; }
            .mini-val { font-size: 22px; font-weight: 900; color: #8b5cf6; }
            
            .chart-row { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; margin-bottom: 25px; }
            .chart-box { background: #fff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 20px; }
            .bar-container { display: flex; align-items: flex-end; justify-content: space-between; height: 140px; padding-bottom: 25px; }
            .bar { flex: 0.1; background: #8b5cf6; border-radius: 6px 6px 0 0; position: relative; }
            .bar-label { position: absolute; bottom: -25px; left: -10px; right: -10px; text-align: center; font-size: 11px; font-weight: 900; color: #94a3b8; }
            
            /* CSS Pie Chart */
            .pie { width: 120px; height: 120px; border-radius: 50%; background: conic-gradient(#8b5cf6 0% 40%, #10b981 40% 70%, #3b82f6 70% 90%, #f59e0b 90% 100%); margin: auto; }
            .legend { list-style: none; padding: 0; margin-top: 15px; font-size: 12px; font-weight: bold; }
            .legend-item { display: flex; align-items: center; margin-bottom: 5px; }
            .dot { width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; }
            
            .table { width: 100%; border-collapse: collapse; }
            .table th { text-align: left; padding: 12px; background: #f1f5f9; border-bottom: 2px solid #e2e8f0; font-size: 12px; color: #475569; }
            .table td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
            
            .alert { padding: 15px; border-radius: 12px; margin-bottom: 12px; border-left: 6px solid #cbd5e1; font-size: 14px; font-weight: 500; }
            .alert-danger { background: #fef2f2; border-color: #ef4444; color: #991b1b; }
            .alert-warn { background: #fffbeb; border-color: #f59e0b; color: #92400e; }
            .alert-success { background: #f0fdf4; border-color: #10b981; color: #166534; }
            
            .footer { position: absolute; bottom: 15mm; left: 20mm; right: 20mm; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
            .pg { position: absolute; bottom: 15mm; right: 20mm; font-size: 11px; font-weight: 900; color: #8b5cf6; }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="brand">FitSphere AI</div>
              <div class="date-box">${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}<br>CONFIDENTIAL</div>
            </div>

            <div class="section-title">1. Health Vitals & BMI</div>
            <div class="hero-card">
              <div>
                <p style="margin:0; font-size:14px; font-weight:bold; color:#64748b;">Current BMI Index</p>
                <h1 class="bmi-num">${bmi}</h1>
                <p class="bmi-cat">${category}</p>
              </div>
              <div style="text-align:right; font-weight:800; color:#475569; line-height:1.6;">
                Height: ${user.height} cm<br>Weight: ${user.weight} kg<br>Goal: <span style="color:#8b5cf6;">${user.goal}</span>
              </div>
            </div>

            <div class="section-title">2. Activity Performance</div>
            <div class="summary-grid">
              <div class="mini-card"><div class="mini-label">Points</div><div class="mini-val">${user.points}</div></div>
              <div class="mini-card"><div class="mini-label">Streak</div><div class="mini-val">${user.streak} Days</div></div>
              <div class="mini-card"><div class="mini-label">Planner</div><div class="mini-val">${completionRate}%</div></div>
            </div>

            <div class="chart-row">
              <div class="chart-box">
                <p style="margin:0 0 15px; font-size:12px; font-weight:900; color:#64748b;">WEEKLY XP TREND</p>
                <div class="bar-container">
                  ${xpData.map((val, i) => `<div class="bar" style="height: ${(val / maxXP) * 100}%;"><span class="bar-label">${['M','T','W','T','F','S','S'][i]}</span></div>`).join('')}
                </div>
              </div>
              <div class="chart-box" style="text-align:center;">
                <p style="margin:0 0 15px; font-size:12px; font-weight:900; color:#64748b;">FOCUS</p>
                <div class="pie"></div>
                <div class="legend">
                  <div class="legend-item"><div class="dot" style="background:#8b5cf6"></div> Exercise</div>
                  <div class="legend-item"><div class="dot" style="background:#10b981"></div> Diet</div>
                </div>
              </div>
            </div>

            <div class="footer">FitSphere AI Adaptive Reporting Engine</div>
            <div class="pg">PAGE 1 OF 2</div>
          </div>

          <div class="page">
            <div class="header">
              <div class="brand">FitSphere AI</div>
              <div class="date-box">ANALYSIS CONTINUED<br>${user.username}</div>
            </div>

            <div class="section-title">3. Intelligence & Alerts</div>
            ${insights.map(i => `
              <div class="alert ${i.type === 'warning' ? 'alert-danger' : 'alert-warn'}">
                <strong>${i.type === 'warning' ? 'ALERT: ' : 'ADVICE: '}</strong> ${i.msg}
              </div>
            `).join('')}
            <div class="alert alert-success">
              <strong>SUMMARY:</strong> Your status is ${report.performance}. ${report.suggestions}
            </div>

            <div class="section-title">4. BMI Progress History</div>
            <table class="table">
              <thead><tr><th>Date</th><th>BMI</th><th>Category</th><th>Result</th></tr></thead>
              <tbody>
                ${bmiHistory.length > 0 ? bmiHistory.slice(-8).reverse().map(b => `
                  <tr>
                    <td>${new Date(b.date).toLocaleDateString()}</td>
                    <td><strong>${b.bmi}</strong></td>
                    <td>${getBMICategory(b.bmi).category}</td>
                    <td><span style="color:#10b981">● Tracked</span></td>
                  </tr>
                `).join('') : '<tr><td colspan="4">No historical logs.</td></tr>'}
              </tbody>
            </table>

            <div class="section-title">5. Strategic Roadmap</div>
            <div style="background:#f8fafc; padding:20px; border-radius:20px; font-size:14px; border:1px solid #e2e8f0;">
               <p><strong>Strengths:</strong> ${report.strengths.join(' • ')}</p>
               <p style="margin-top:10px;"><strong>Weaknesses:</strong> ${report.weaknesses.join(' • ')}</p>
            </div>

            <div class="footer">Continue logging to refine your AI model.</div>
            <div class="pg">PAGE 2 OF 2</div>
          </div>
        </body>
        </html>
      `;

      await Print.printAsync({ html: htmlContent });
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to generate PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!report) return <SafeAreaView style={styles.container}><Text style={styles.loading}>Loading AI Matrix...</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
       <View style={styles.header}>
         <View>
            <Text style={styles.title}>AI Insights</Text>
            <Text style={styles.subtitle}>Predictive Analytics & Reports</Text>
         </View>
         <TouchableOpacity 
            style={[styles.downloadBtn, isGenerating && { opacity: 0.7 }]} 
            onPress={handlePrintPDF}
            disabled={isGenerating}
          >
            {isGenerating ? (
               <ActivityIndicator color="#fff" size="small" />
            ) : (
               <>
                  <MaterialCommunityIcons name="printer" size={20} color="#fff" />
                  <Text style={styles.downloadBtnText}>Print PDF</Text>
               </>
            )}
         </TouchableOpacity>
       </View>
       
       <ScrollView contentContainerStyle={styles.content}>
         
         {/* BMI PERSONALIZATION CARD */}
         {(() => {
            const bmiValue = calculateBMI(Number(user.height), Number(user.weight));
            const { category, color, suggestion } = getBMICategory(bmiValue);
            return (
               <View style={[styles.bmiCard, { borderColor: color }]}>
                  <View style={styles.bmiHeader}>
                     <View>
                        <Text style={styles.bmiTitle}>Body Mass Index (BMI)</Text>
                        <Text style={[styles.bmiValue, { color }]}>{bmiValue} - {category}</Text>
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

         {/* Predictive Insights */}
         <Text style={styles.sectionTitle}>Live Predictions & Alerts</Text>
         <View style={styles.notificationsGrid}>
           {insights.map((insight, idx) => (
              <View key={idx} style={[styles.alertBox, insight.type === 'warning' ? styles.alertWarn : styles.alertInfo]}>
                 <MaterialCommunityIcons name={insight.type === 'warning' ? "alert" : "lightbulb-on"} size={24} color={insight.type === 'warning' ? "#ef4444" : "#f59e0b"} />
                 <Text style={styles.alertText}>{insight.msg}</Text>
              </View>
           ))}
         </View>

         {/* VISUAL ANALYTICS */}
         <Text style={styles.sectionTitle}>Visual Analytics</Text>
         
         <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Weekly XP Distribution</Text>
            <BarChart
               data={{
                 labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                 datasets: [{ data: [20, 45, 28, 80, 99, 43, 50] }]
               }}
               width={screenWidth - 40}
               height={220}
               yAxisLabel=""
               yAxisSuffix="xp"
               chartConfig={{
                 backgroundColor: "#ffffff",
                 backgroundGradientFrom: "#ffffff",
                 backgroundGradientTo: "#ffffff",
                 decimalPlaces: 0,
                 color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
                 labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                 style: { borderRadius: 16 },
                 propsForDots: { r: "6", strokeWidth: "2", stroke: "#8B5CF6" }
               }}
               verticalLabelRotation={0}
               style={{ marginVertical: 8, borderRadius: 16 }}
            />
         </View>

         <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Activity Focus</Text>
            <View style={{ alignItems: 'center', width: '100%' }}>
                <PieChart
                   data={[
                     { name: 'Exercise', population: 40, color: '#8B5CF6', legendFontColor: '#374151', legendFontSize: 12 },
                     { name: 'Diet', population: 30, color: '#10B981', legendFontColor: '#374151', legendFontSize: 12 },
                     { name: 'Hydration', population: 20, color: '#3B82F6', legendFontColor: '#374151', legendFontSize: 12 },
                     { name: 'Sleep', population: 10, color: '#F59E0B', legendFontColor: '#374151', legendFontSize: 12 },
                   ]}
                   width={screenWidth - 40}
                   height={200}
                   chartConfig={{
                     color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                   }}
                   accessor={"population"}
                   backgroundColor={"transparent"}
                   paddingLeft={"35"}
                   center={[0, 0]}
                   absolute
                />
            </View>
         </View>

         {/* Weekly AI Report */}
         <Text style={styles.sectionTitle}>Weekly Performance Report</Text>
         <View style={styles.reportCard}>
            <View style={styles.reportHeader}>
               <Ionicons name="analytics" size={28} color="#8B5CF6" />
               <Text style={styles.reportTitle}>Week 4 Summary</Text>
            </View>

            <View style={styles.statRow}>
               <Text style={styles.statLabel}>Overall Performance:</Text>
               <Text style={styles.statVal}>{report.performance}</Text>
            </View>

            <View style={styles.splitGrid}>
               <View style={[styles.splitBox, {backgroundColor: '#f0fdf4', borderColor: '#bbf7d0'}]}>
                  <Text style={[styles.splitTitle, {color: '#166534'}]}>Strengths</Text>
                  {report.strengths.map((s: string, i: number) => <Text key={i} style={styles.splitItem}>✅ {s}</Text>)}
               </View>
               <View style={[styles.splitBox, {backgroundColor: '#fef2f2', borderColor: '#fecaca'}]}>
                  <Text style={[styles.splitTitle, {color: '#991b1b'}]}>Weaknesses</Text>
                  {report.weaknesses.map((w: string, i: number) => <Text key={i} style={styles.splitItem}>⚠️ {w}</Text>)}
               </View>
            </View>

            <View style={styles.adviceBox}>
               <Text style={styles.adviceTitle}>AI Adaptive Suggestion</Text>
               <Text style={styles.adviceText}>{report.suggestions}</Text>
            </View>
         </View>

       </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loading: { padding: 40, textAlign: 'center', fontSize: 18, color: '#6B7280' },
  header: { padding: 20, paddingTop: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', elevation: 3, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '900', color: '#111827' },
  subtitle: { fontSize: 14, color: '#8B5CF6', fontWeight: '700', marginTop: 2 },
  content: { padding: 20, paddingBottom: 60 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 16, marginLeft: 4 },
  notificationsGrid: { gap: 12, marginBottom: 32 },
  alertBox: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  alertWarn: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  alertInfo: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  alertText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#374151' },
  reportCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, elevation: 4, shadowColor: '#000', shadowOffset: {width: 0, height:6}, shadowOpacity: 0.05, shadowRadius: 10 },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  reportTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  statLabel: { fontSize: 16, fontWeight: '700', color: '#4B5563' },
  statVal: { fontSize: 16, fontWeight: '800', color: '#111827' },
  splitGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  splitBox: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1 },
  splitTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  splitItem: { fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 4 },
  adviceBox: { backgroundColor: '#F3F4F6', padding: 16, borderRadius: 16 },
  adviceTitle: { fontSize: 14, fontWeight: '800', color: '#8B5CF6', marginBottom: 6 },
  adviceText: { fontSize: 14, color: '#374151', fontStyle: 'italic', lineHeight: 20 },
  chartCard: { backgroundColor: '#fff', borderRadius: 24, padding: 0, paddingVertical: 20, marginBottom: 20, elevation: 4, shadowColor: '#000', shadowOffset: {width: 0, height:6}, shadowOpacity: 0.05, shadowRadius: 10, alignItems: 'center' },
  chartTitle: { fontSize: 16, fontWeight: '800', color: '#1F2937', marginBottom: 16, alignSelf: 'flex-start', marginLeft: 20 },
  downloadBtn: { backgroundColor: '#8B5CF6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  downloadBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  
  // BMI Styles
  bmiCard: { backgroundColor: '#fff', padding: 20, borderRadius: 24, marginBottom: 24, borderWidth: 2, elevation: 2 },
  bmiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  bmiTitle: { fontSize: 14, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase' },
  bmiValue: { fontSize: 22, fontWeight: '900', marginTop: 4 },
  bmiSuggestion: { flexDirection: 'row', padding: 14, borderRadius: 16, gap: 10, alignItems: 'center' },
  bmiText: { flex: 1, fontSize: 14, fontWeight: '700', lineHeight: 20 }
});
