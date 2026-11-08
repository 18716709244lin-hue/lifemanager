import React, {useEffect, useState} from 'react';
import {NavigationContainer, DefaultTheme, DarkTheme} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {View, Text, StyleSheet, ActivityIndicator} from 'react-native';

// Screens
import ChatScreen from './src/screens/ChatScreen';
import TimelineScreen from './src/screens/TimelineScreen';
import SearchScreen from './src/screens/SearchScreen';
import ReviewScreen from './src/screens/ReviewScreen';
import BirthdayScreen from './src/screens/BirthdayScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

// Services
import {initDatabase} from './src/database/Database';
import {isApiKeyConfigured} from './src/services/StorageService';
import {syncRemindersIfEnabled} from './src/services/NotificationService';

// Theme
import {ThemeProvider, useTheme} from './src/theme/ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  const {theme} = useTheme();
  const c = theme.colors;

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName;
          if (route.name === 'Chat') {
            iconName = 'chat';
          } else if (route.name === 'Timeline') {
            iconName = 'timeline';
          } else if (route.name === 'Search') {
            iconName = 'search';
          } else if (route.name === 'Review') {
            iconName = 'assessment';
          } else if (route.name === 'Birthday') {
            iconName = 'cake';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.tabInactive,
        tabBarStyle: {
          backgroundColor: c.tabBg,
          borderTopColor: c.tabBorder,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
        headerStyle: {
          backgroundColor: c.headerBg,
        },
        headerTintColor: c.onPrimary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}>
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{title: 'AI 管家', headerShown: false}}
      />
      <Tab.Screen
        name="Timeline"
        component={TimelineScreen}
        options={{title: '时间线'}}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{title: '搜索'}}
      />
      <Tab.Screen
        name="Birthday"
        component={BirthdayScreen}
        options={{title: '生日'}}
      />
      <Tab.Screen
        name="Review"
        component={ReviewScreen}
        options={{title: '复盘'}}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{title: '设置'}}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const {theme} = useTheme();
  const c = theme.colors;
  const [isLoading, setIsLoading] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      await initDatabase();
      const apiKeyConfigured = await isApiKeyConfigured();
      setHasApiKey(apiKeyConfigured);
    } catch (error) {
      console.error('App initialization error:', error);
    } finally {
      setIsLoading(false);
    }
    // 启动时同步一次提醒（未开启通知时会直接跳过）
    syncRemindersIfEnabled().catch(() => {});
  };

  const navigationTheme = {
    ...(theme.dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.dark ? DarkTheme : DefaultTheme).colors,
      primary: c.primary,
      background: c.background,
      card: c.tabBg,
      text: c.text,
      border: c.tabBorder,
      notification: c.primary,
    },
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, {backgroundColor: c.background}]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={[styles.loadingText, {color: c.subtext}]}>初始化中...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName={hasApiKey ? 'Main' : 'Onboarding'}
        screenOptions={{headerShown: false}}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Main" component={TabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});
