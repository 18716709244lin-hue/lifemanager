import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  saveApiKey,
  getApiKey,
  saveAiProvider,
  getAiProvider,
  saveAiModel,
  getAiModel,
  getNotificationsEnabled,
  clearAllData,
} from '../services/StorageService';
import {getProviders, getAvailableModels} from '../services/AIService';
import {setNotificationsEnabled} from '../services/NotificationService';
import {THEMES} from '../theme/themes';
import {useTheme} from '../theme/ThemeContext';

const SettingsScreen = () => {
  const {theme, themeKey, setThemeKey} = useTheme();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);

  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState('deepseek');
  const [model, setModel] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(true);
  const [providers, setProviders] = useState([]);
  const [notificationsOn, setNotificationsOn] = useState(false);

  useEffect(() => {
    loadSettings();
    setProviders(getProviders());
  }, []);

  useEffect(() => {
    if (provider) {
      const models = getAvailableModels(provider);
      setAvailableModels(models);
      setModel((prev) => (models.includes(prev) ? prev : models[0]));
    }
  }, [provider]);

  const loadSettings = async () => {
    const savedApiKey = await getApiKey();
    const savedProvider = await getAiProvider();
    const savedModel = await getAiModel();
    const savedNotifications = await getNotificationsEnabled();

    if (savedApiKey) setApiKey(savedApiKey);
    if (savedProvider) setProvider(savedProvider);
    if (savedModel) setModel(savedModel);
    setNotificationsOn(savedNotifications);
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      Alert.alert('提示', '请输入 API Key');
      return;
    }

    setIsLoading(true);
    try {
      await saveApiKey(apiKey.trim());
      await saveAiProvider(provider);
      await saveAiModel(model);
      Alert.alert('成功', '设置已保存');
    } catch (error) {
      Alert.alert('错误', '保存失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationsToggle = async (value) => {
    if (value) {
      const ok = await setNotificationsEnabled(true);
      if (!ok) {
        Alert.alert(
          '无法开启通知',
          '请在系统设置中允许本应用发送通知，然后重新打开此开关。',
        );
        return;
      }
    } else {
      await setNotificationsEnabled(false);
    }
    setNotificationsOn(value);
  };

  const handleClearData = () => {
    Alert.alert(
      '确认清除',
      '这将删除所有本地数据，包括对话记录、任务和设置。此操作不可恢复！',
      [
        {text: '取消', style: 'cancel'},
        {
          text: '确认清除',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            Alert.alert('完成', '所有数据已清除');
          },
        },
      ],
    );
  };

  const testConnection = async () => {
    if (!apiKey.trim()) {
      Alert.alert('提示', '请先输入 API Key');
      return;
    }

    setIsLoading(true);
    try {
      // 先保存当前输入的配置，再测试，确保用的是刚填的 Key
      await saveApiKey(apiKey.trim());
      await saveAiProvider(provider);
      await saveAiModel(model);
      const {sendMessageToAI} = require('../services/AIService');
      await sendMessageToAI('你好，这是一条测试消息');
      Alert.alert('成功', 'API 连接正常，设置已保存！');
    } catch (error) {
      Alert.alert('连接失败', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI 服务商</Text>
        <View style={styles.providerContainer}>
          {providers.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.providerButton,
                provider === p.id && styles.providerButtonActive,
              ]}
              onPress={() => setProvider(p.id)}>
              <Text
                style={[
                  styles.providerButtonText,
                  provider === p.id && styles.providerButtonTextActive,
                ]}>
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Key</Text>
        <View style={styles.apiKeyContainer}>
          <TextInput
            style={styles.apiKeyInput}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="输入你的 API Key"
            placeholderTextColor={c.muted}
            secureTextEntry={!showApiKey}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowApiKey(!showApiKey)}>
            <Icon
              name={showApiKey ? 'visibility' : 'visibility-off'}
              size={24}
              color={c.subtext}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.hintText}>
          你的 API Key 仅存储在本地设备，不会上传到任何服务器
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>模型选择</Text>
        <View style={styles.modelContainer}>
          {availableModels.map((m) => (
            <TouchableOpacity
              key={m}
              style={[
                styles.modelButton,
                model === m && styles.modelButtonActive,
              ]}
              onPress={() => setModel(m)}>
              <Text
                style={[
                  styles.modelButtonText,
                  model === m && styles.modelButtonTextActive,
                ]}>
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>外观主题</Text>
        <View style={styles.themeRow}>
          {Object.values(THEMES).map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.themeCard,
                {backgroundColor: t.colors.background},
                themeKey === t.key && {borderColor: t.colors.primary},
              ]}
              onPress={() => setThemeKey(t.key)}>
              <View
                style={[
                  styles.themeSwatch,
                  {backgroundColor: t.colors.primary},
                ]}>
                <Icon name={t.icon} size={18} color={t.colors.onPrimary} />
              </View>
              <Text style={[styles.themeName, {color: t.colors.text}]}>
                {t.name}
              </Text>
              {themeKey === t.key && (
                <Icon name="check-circle" size={16} color={t.colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.hintText}>切换后立即生效，无需重启</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={styles.sectionTitle}>通知提醒</Text>
            <Text style={styles.hintText}>
              生日提前提醒、任务到期当天 9:00 提醒
            </Text>
          </View>
          <Switch
            value={notificationsOn}
            onValueChange={handleNotificationsToggle}
            trackColor={{false: c.border, true: c.primary}}
            thumbColor={notificationsOn ? c.primary : c.card}
          />
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.testButton]}
          onPress={testConnection}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color={c.onPrimary} />
          ) : (
            <>
              <Icon name="wifi-tethering" size={20} color={c.onPrimary} />
              <Text style={styles.buttonText}>测试连接</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleSave}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color={c.onPrimary} />
          ) : (
            <>
              <Icon name="save" size={20} color={c.onPrimary} />
              <Text style={styles.buttonText}>保存设置</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.dangerSection}>
        <Text style={styles.dangerTitle}>危险区域</Text>
        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={handleClearData}>
          <Icon name="delete-forever" size={20} color={c.onPrimary} />
          <Text style={styles.buttonText}>清除所有数据</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>如何获取 API Key？</Text>
        <Text style={styles.infoText}>
          • DeepSeek: 访问 platform.deepseek.com 注册并创建 API Key{'\n'}
          • 智谱 GLM: 访问 bigmodel.cn 注册并创建 API Key（glm-4-flash 免费）{'\n'}
          • OpenAI: 访问 platform.openai.com 创建 API Key{'\n'}
          • Claude: 访问 console.anthropic.com 获取 API Key{'\n'}
          • 通义千问: 访问 dashscope.aliyun.com 开通服务
        </Text>
      </View>
    </ScrollView>
  );
};

const createStyles = (c) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
      padding: 16,
    },
    section: {
      marginBottom: 24,
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: c.shadow,
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: c.text,
      marginBottom: 12,
    },
    providerContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    providerButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    providerButtonActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    providerButtonText: {
      fontSize: 14,
      color: c.subtext,
    },
    providerButtonTextActive: {
      color: c.onPrimary,
      fontWeight: '500',
    },
    apiKeyContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    apiKeyInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: c.text,
      backgroundColor: c.inputBg,
    },
    eyeButton: {
      marginLeft: 8,
      padding: 8,
    },
    hintText: {
      fontSize: 12,
      color: c.subtext,
      marginTop: 8,
    },
    modelContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    modelButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    modelButtonActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    modelButtonText: {
      fontSize: 13,
      color: c.subtext,
    },
    modelButtonTextActive: {
      color: c.onPrimary,
    },
    themeRow: {
      flexDirection: 'row',
      gap: 10,
    },
    themeCard: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: c.border,
      paddingVertical: 14,
      alignItems: 'center',
      gap: 8,
    },
    themeSwatch: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeName: {
      fontSize: 13,
      fontWeight: '600',
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    switchInfo: {
      flex: 1,
      paddingRight: 12,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
    },
    button: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      gap: 8,
    },
    testButton: {
      backgroundColor: c.primaryDark,
    },
    saveButton: {
      backgroundColor: c.primary,
    },
    buttonText: {
      color: c.onPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    dangerSection: {
      marginBottom: 24,
      backgroundColor: c.dangerSoft,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: c.dangerBorder,
    },
    dangerTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: c.danger,
      marginBottom: 12,
    },
    dangerButton: {
      backgroundColor: c.danger,
    },
    infoSection: {
      backgroundColor: c.soft,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: c.softBorder,
    },
    infoTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: c.softText,
      marginBottom: 8,
    },
    infoText: {
      fontSize: 13,
      color: c.softText2,
      lineHeight: 20,
    },
  });

export default SettingsScreen;
