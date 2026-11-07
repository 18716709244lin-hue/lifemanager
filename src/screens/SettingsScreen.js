import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  saveApiKey,
  getApiKey,
  saveAiProvider,
  getAiProvider,
  saveAiModel,
  getAiModel,
  clearAllData,
} from '../services/StorageService';
import {getProviders, getAvailableModels} from '../services/AIService';

const SettingsScreen = () => {
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState('deepseek');
  const [model, setModel] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [providers, setProviders] = useState([]);

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

    if (savedApiKey) setApiKey(savedApiKey);
    if (savedProvider) setProvider(savedProvider);
    if (savedModel) setModel(savedModel);
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
      const {sendMessageToAI} = require('../services/AIService');
      await sendMessageToAI('你好，这是一条测试消息');
      Alert.alert('成功', 'API 连接正常！');
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
            placeholderTextColor="#9ca3af"
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
              color="#6b7280"
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

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.testButton]}
          onPress={testConnection}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="wifi-tethering" size={20} color="#fff" />
              <Text style={styles.buttonText}>测试连接</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleSave}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="save" size={20} color="#fff" />
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
          <Icon name="delete-forever" size={20} color="#fff" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
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
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  providerButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  providerButtonText: {
    fontSize: 14,
    color: '#4b5563',
  },
  providerButtonTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  apiKeyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  apiKeyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#fff',
  },
  eyeButton: {
    marginLeft: 8,
    padding: 8,
  },
  hintText: {
    fontSize: 12,
    color: '#6b7280',
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
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modelButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  modelButtonText: {
    fontSize: 13,
    color: '#4b5563',
  },
  modelButtonTextActive: {
    color: '#fff',
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
    borderRadius: 8,
    gap: 8,
  },
  testButton: {
    backgroundColor: '#3b82f6',
  },
  saveButton: {
    backgroundColor: '#6366f1',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerSection: {
    marginBottom: 24,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  dangerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 12,
  },
  dangerButton: {
    backgroundColor: '#dc2626',
  },
  infoSection: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1d4ed8',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#3b82f6',
    lineHeight: 20,
  },
});

export default SettingsScreen;
