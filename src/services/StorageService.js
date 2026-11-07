import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  API_KEY: '@ai_api_key',
  AI_PROVIDER: '@ai_provider',
  AI_MODEL: '@ai_model',
  USER_NAME: '@user_name',
  ONBOARDING_COMPLETED: '@onboarding_completed',
};

// API Key 管理
export const saveApiKey = async (apiKey) => {
  try {
    await AsyncStorage.setItem(KEYS.API_KEY, apiKey);
    return true;
  } catch (error) {
    console.error('Error saving API key:', error);
    return false;
  }
};

export const getApiKey = async () => {
  try {
    return await AsyncStorage.getItem(KEYS.API_KEY);
  } catch (error) {
    console.error('Error getting API key:', error);
    return null;
  }
};

export const isApiKeyConfigured = async () => {
  const key = await getApiKey();
  return key !== null && key.length > 0;
};

// AI 服务商配置
export const saveAiProvider = async (provider) => {
  try {
    await AsyncStorage.setItem(KEYS.AI_PROVIDER, provider);
    return true;
  } catch (error) {
    return false;
  }
};

export const getAiProvider = async () => {
  try {
    return (await AsyncStorage.getItem(KEYS.AI_PROVIDER)) || 'deepseek';
  } catch (error) {
    return 'deepseek';
  }
};

export const saveAiModel = async (model) => {
  try {
    await AsyncStorage.setItem(KEYS.AI_MODEL, model);
    return true;
  } catch (error) {
    return false;
  }
};

export const getAiModel = async () => {
  try {
    return await AsyncStorage.getItem(KEYS.AI_MODEL);
  } catch (error) {
    return null;
  }
};

// 用户信息
export const saveUserName = async (name) => {
  try {
    await AsyncStorage.setItem(KEYS.USER_NAME, name);
    return true;
  } catch (error) {
    return false;
  }
};

export const getUserName = async () => {
  try {
    return await AsyncStorage.getItem(KEYS.USER_NAME);
  } catch (error) {
    return null;
  }
};

// 引导页状态
export const setOnboardingCompleted = async () => {
  try {
    await AsyncStorage.setItem(KEYS.ONBOARDING_COMPLETED, 'true');
    return true;
  } catch (error) {
    return false;
  }
};

export const isOnboardingCompleted = async () => {
  try {
    return (await AsyncStorage.getItem(KEYS.ONBOARDING_COMPLETED)) === 'true';
  } catch (error) {
    return false;
  }
};

// 清除所有数据
export const clearAllData = async () => {
  try {
    await AsyncStorage.multiRemove(Object.values(KEYS));
    return true;
  } catch (error) {
    return false;
  }
};
