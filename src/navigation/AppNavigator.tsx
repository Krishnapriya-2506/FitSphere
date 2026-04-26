import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { TrackersScreen } from '../screens/TrackersScreen';
import { RestaurantScreen } from '../screens/RestaurantScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { PlannerScreen } from '../screens/PlannerScreen';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';
import { InsightsScreen } from '../screens/InsightsScreen';
import { getCurrentUser } from '../lib/storage';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider } from '../context/ThemeContext';
import { Toast } from '../components/Toast';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({ 
      headerShown: false, 
      tabBarActiveTintColor: '#8B5CF6',
      tabBarIcon: ({ color, size }) => {
         let iconName: any = 'home';
         if (route.name === 'Dashboard') iconName = 'home';
         else if (route.name === 'Trackers') iconName = 'list';
         else if (route.name === 'Planner') iconName = 'calendar';
         else if (route.name === 'Leaderboard') iconName = 'trophy';
         else if (route.name === 'Profile') iconName = 'person';
         else if (route.name === 'Restaurant') iconName = 'restaurant';
         return <Ionicons name={iconName} size={size} color={color} />;
      }
    })}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Planner" component={PlannerScreen} />
      <Tab.Screen name="Trackers" component={TrackersScreen} />
      <Tab.Screen name="Restaurant" component={RestaurantScreen} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      setInitialRoute(user ? 'Main' : 'Welcome');
    };
    checkAuth();
  }, []);

  if (!initialRoute) return null;

  return (
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Insights" component={InsightsScreen} />
        </Stack.Navigator>
        <Toast />
      </NavigationContainer>
    </ThemeProvider>
  );
};
