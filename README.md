# FitSphere: The Gamified AI Wellness Platform 🚀

FitSphere is a high-performance, AI-driven health and wellness application built with **React Native** and **Expo**. It transforms personal health tracking into an engaging, gamified social experience with deep AI personalization.

---

## 🌟 Core Features

### 🧠 AI Life Coach & Personalization
- **Adaptive Daily Planner**: Tasks (Exercise, Food, Focus) are dynamically generated based on your **BMI category**, current health goals, and streak status.
- **Mood Reflections**: AI analyzes your daily mood and energy levels to provide real-time coaching suggestions.
- **BMI-Based Intelligence**: Integrated calculation and historical tracking that influences your food suggestions and workout intensities.

### 🎮 Gamification & Social
- **XP & Leveling System**: Earn points for every healthy action (logging water, completing planner tasks, improving BMI).
- **Fitness Streaks**: Maintain daily consistency to grow your streak and earn point multipliers.
- **Social Groups**: Create or join fitness groups. Compete on group leaderboards where every member's XP contributes to the group's standing.

### 🥗 Smart Dining Engine
- **AI Top Choice**: Intelligent restaurant meal recommendations that align perfectly with your goal (Weight Loss, Muscle Gain, or Balanced Diet).
- **Healthy Alternatives**: Suggests better options for common cravings.

### 📊 Advanced Reporting
- **Interactive Dashboards**: Visual analytics for XP distribution, activity focus (Pie charts), and health vitals.
- **Weekly PDF Matrix**: A professional, downloadable 2-page health report containing:
    - Executive Summary
    - BMI Progress History
    - Visual XP Trends
    - AI Predictive Insights & Roadmap

### 🔔 Intelligent Reminders
- **Smart Nudges**: Adaptive notifications for hydration, meal logging, and exercise, throttled to your preferred frequency (e.g., 10-minute intervals).

---

## 🛠️ Technology Stack

- **Frontend**: React Native, Expo, TypeScript
- **Styling**: Vanilla StyleSheet (Premium Dark/Light UI)
- **Charts**: `react-native-chart-kit`
- **PDF Engine**: `expo-print` & `expo-sharing`
- **State Management**: Localized Storage Logic (`storage.ts`) with `AsyncStorage`
- **Icons**: `MaterialCommunityIcons`, `Ionicons`

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- Expo Go app on your mobile device (or an Android/iOS emulator)

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npx expo start
   ```

---

## 📁 Project Structure

```
FitSphere/
├── src/
│   ├── components/      # Reusable UI components (Toast, Cards, etc.)
│   ├── context/         # Theme and User Context
│   ├── lib/             # Core logic (storage.ts, API helpers)
│   ├── navigation/      # App Navigator & Deep Linking
│   └── screens/         # Feature-rich screens (Dashboard, Insights, Restaurant, etc.)
├── assets/              # App branding and icons
└── App.tsx              # Main Entry Point
```

---

## 🛡️ Privacy & Security
FitSphere uses **Local-First Architecture**. Your health data, BMI history, and reflections are stored securely on your device using `AsyncStorage`, ensuring your personal data remains private.

---

## 🤝 Contribution
Contributions are welcome! If you're interested in improving the AI Engine or adding new gamification layers, feel free to fork and submit a PR.

**FitSphere** — *Crush your goals, together.* ⚡
