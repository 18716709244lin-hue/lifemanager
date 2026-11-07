import React, {useEffect, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {View, Text, StyleSheet, ActivityIndicator} from 'react-native';

// Screens
import ChatScreen from './src/screens/ChatScreen';
import TimelineScreen from './src/screens/TimelineScreen';
import ReviewScreen from './src/screens/ReviewScreen';
import BirthdayScreen from './src/screens/BirthdayScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

// Services
import {initDatabase} from './src/database/Database';
import {isApiKeyConfigured} from './src/services/StorageService';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName;
          if (route.name === 'Chat') {
            iconName = 'chat';
          } else if (route.name === 'Timeline') {
            iconName = 'timeline';
          } else if (route.name === 'Review') {
            iconName = 'assessment';
          } else if (route.name === 'Birthday') {
            iconName = 'cake';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#6366f1',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}>
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{title: 'AI 管家'}}
      />
      <Tab.Screen
        name="Timeline"
        component={TimelineScreen}
        options={{title: '时间线'}}
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

export default function App() {
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
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>初始化中...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={hasApiKey ? 'Main' : 'Onboarding'}
        screenOptions={{headerShown: false}}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Main" component={TabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
});
