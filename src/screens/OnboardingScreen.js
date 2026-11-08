import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {saveApiKey, saveAiProvider, saveUserName, setOnboardingCompleted} from '../services/StorageService';
import {getProviders} from '../services/AIService';
import {useTheme} from '../theme/ThemeContext';

const OnboardingScreen = ({navigation}) => {
  const {theme} = useTheme();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);

  const [step, setStep] = useState(1);
  const [userName, setUserName] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('deepseek');
  const [apiKey, setApiKey] = useState('');
  const providers = getProviders();

  const handleComplete = async () => {
    if (!apiKey.trim()) {
      Alert.alert('提示', '请输入 API Key');
      return;
    }

    await saveUserName(userName || '朋友');
    await saveAiProvider(selectedProvider);
    await saveApiKey(apiKey.trim());
    await setOnboardingCompleted();

    navigation.replace('Main');
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Icon name="waving-hand" size={64} color={c.primary} />
      </View>
      <Text style={styles.title}>欢迎使用 AI 生活管家</Text>
      <Text style={styles.subtitle}>
        我是你的智能助手，可以帮助你：{'\n\n'}
        • 记录日常琐事和任务{'\n'}
        • 自动分类和整理{'\n'}
        • 规划行程和时间{'\n'}
        • 每周/每月复盘总结{'\n'}
        • 记住你的习惯和偏好
      </Text>
      <TouchableOpacity style={styles.button} onPress={() => setStep(2)}>
        <Text style={styles.buttonText}>开始使用</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>怎么称呼你？</Text>
      <TextInput
        style={styles.input}
        value={userName}
        onChangeText={setUserName}
        placeholder="输入你的名字或昵称"
        placeholderTextColor={c.muted}
      />
      <TouchableOpacity style={styles.button} onPress={() => setStep(3)}>
        <Text style={styles.buttonText}>下一步</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <ScrollView style={styles.stepContainer}>
      <Text style={styles.stepTitle}>配置 AI 服务</Text>
      <Text style={styles.stepDescription}>
        选择 AI 服务商并输入 API Key。你的 Key 仅存储在本地，不会上传。
      </Text>

      <Text style={styles.label}>选择服务商</Text>
      <View style={styles.providerGrid}>
        {providers.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[
              styles.providerCard,
              selectedProvider === p.id && styles.providerCardActive,
            ]}
            onPress={() => setSelectedProvider(p.id)}>
            <Text
              style={[
                styles.providerName,
                selectedProvider === p.id && styles.providerNameActive,
              ]}>
              {p.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>API Key</Text>
      <TextInput
        style={styles.input}
        value={apiKey}
        onChangeText={setApiKey}
        placeholder="粘贴你的 API Key"
        placeholderTextColor={c.muted}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.helpBox}>
        <Text style={styles.helpTitle}>如何获取 API Key？</Text>
        <Text style={styles.helpText}>
          • DeepSeek: platform.deepseek.com{'\n'}
          • 智谱 GLM: bigmodel.cn（glm-4-flash 免费）{'\n'}
          • OpenAI: platform.openai.com{'\n'}
          • 通义千问: dashscope.aliyun.com
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleComplete}>
        <Text style={styles.buttonText}>完成设置</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </KeyboardAvoidingView>
  );
};

const createStyles = (c) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  stepContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: c.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: c.subtext,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: c.text,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: c.subtext,
    marginBottom: 24,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: c.text,
    backgroundColor: c.inputBg,
    marginBottom: 24,
  },
  providerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  providerCard: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: c.card,
    borderWidth: 2,
    borderColor: c.border,
    minWidth: '45%',
    alignItems: 'center',
  },
  providerCardActive: {
    borderColor: c.primary,
    backgroundColor: c.soft,
  },
  providerName: {
    fontSize: 15,
    fontWeight: '500',
    color: c.subtext,
  },
  providerNameActive: {
    color: c.primary,
  },
  helpBox: {
    backgroundColor: c.soft,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.softText,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: c.softText2,
    lineHeight: 20,
  },
  button: {
    backgroundColor: c.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: c.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OnboardingScreen;
