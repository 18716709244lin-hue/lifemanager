import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {generateId} from '../utils/id';
import {executeQuery, executeQueryAll} from '../database/Database';
import {
  sendMessageToAI,
  analyzeText,
  generateBirthdayAdvice,
} from '../services/AIService';
import {getUserName} from '../services/StorageService';
import {
  saveBirthday,
  updateBirthdayRelation,
  getUpcomingBirthdays,
  daysUntilBirthday,
} from '../services/BirthdayService';

const ChatScreen = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState('朋友');
  const [reminders, setReminders] = useState([]);
  const [awaitingRelationFor, setAwaitingRelationFor] = useState(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    loadUserInfo();
    loadConversationHistory();
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      setReminders(await getUpcomingBirthdays());
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  };

  const loadUserInfo = async () => {
    const name = await getUserName();
    if (name) setUserName(name);
  };

  const loadConversationHistory = async () => {
    try {
      const history = await executeQueryAll(
        'SELECT * FROM conversations ORDER BY timestamp DESC LIMIT 50',
      );
      const formattedHistory = history.reverse().map((item) => ({
        id: item.id,
        role: item.role,
        content: item.content,
        timestamp: item.timestamp,
      }));
      setMessages(formattedHistory);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const saveMessage = async (role, content, category = null, sentiment = null) => {
    const id = generateId();
    const timestamp = Date.now();
    try {
      await executeQuery(
        'INSERT INTO conversations (id, role, content, timestamp, category, sentiment) VALUES (?, ?, ?, ?, ?, ?)',
        [id, role, content, timestamp, category, sentiment],
      );
      return {id, role, content, timestamp};
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  };

  // 把 AI 生成的方案、思考问题和风险拼成一条消息
  const buildPlanText = (task, category) => {
    const lines = [`【${task.title}】行动计划`];
    if (category) lines.push(`分类：${category}`);

    if (task.plan_steps && task.plan_steps.length > 0) {
      lines.push('\n📋 建议方案：');
      task.plan_steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    }

    if (task.questions && task.questions.length > 0) {
      lines.push('\n🤔 值得你先想一想：');
      task.questions.forEach((q) => lines.push(`• ${q}`));
    }

    if (task.risks && task.risks.length > 0) {
      lines.push('\n⚠️ 计划风险：');
      task.risks.forEach((r) => lines.push(`• ${r}`));
    }

    return lines.join('\n');
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage = inputText.trim();
    setInputText('');
    setIsLoading(true);

    try {
      // 保存用户消息
      const savedUserMessage = await saveMessage('user', userMessage);
      if (savedUserMessage) {
        setMessages((prev) => [...prev, savedUserMessage]);
      }

      // 正在等待用户说明与寿星的关系（下一条短消息视为回答）
      if (awaitingRelationFor && userMessage.length <= 30) {
        const relation = userMessage;
        await updateBirthdayRelation(awaitingRelationFor.id, relation);

        const target = {
          ...awaitingRelationFor,
          relation,
          daysLeft: daysUntilBirthday(
            awaitingRelationFor.month,
            awaitingRelationFor.day,
          ),
        };
        setAwaitingRelationFor(null);

        let replyText = `已记住：${target.name} 是你的「${relation}」。`;
        try {
          const advice = await generateBirthdayAdvice(target);
          replyText += `\n\n${advice}`;
        } catch (e) {
          replyText += '\n你可以到「生日」页生成礼物和行程建议。';
        }

        const saved = await saveMessage('assistant', replyText);
        if (saved) setMessages((prev) => [...prev, saved]);
        await loadReminders();
        setIsLoading(false);
        return;
      }

      // 构建对话历史（最近10条）
      const recentHistory = messages.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // 分析文本与获取 AI 回复并行，避免两次请求串行拖慢首条回复
      const [analysis, aiResponse] = await Promise.all([
        analyzeText(userMessage),
        sendMessageToAI(userMessage, recentHistory),
      ]);

      // 保存AI回复
      const savedAiMessage = await saveMessage(
        'assistant',
        aiResponse,
        analysis?.category,
        analysis?.sentiment,
      );

      if (savedAiMessage) {
        setMessages((prev) => [...prev, savedAiMessage]);
      }

      // 处理提取到的任务：保存 + 自动生成方案/思考问题/风险
      if (analysis?.tasks && analysis.tasks.length > 0) {
        for (const task of analysis.tasks) {
          const taskId = generateId();
          await executeQuery(
            `INSERT INTO tasks (id, title, description, category, priority, due_date, source_conversation_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              taskId,
              task.title,
              task.description || '',
              analysis.category || 'other',
              task.priority || 'medium',
              task.due_date ? new Date(task.due_date).getTime() : null,
              savedUserMessage?.id,
            ],
          );

          if (
            (task.plan_steps && task.plan_steps.length > 0) ||
            (task.questions && task.questions.length > 0) ||
            (task.risks && task.risks.length > 0)
          ) {
            await executeQuery(
              `INSERT INTO task_plans (id, task_id, task_title, plan_steps, questions, risks)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                generateId(),
                taskId,
                task.title,
                JSON.stringify(task.plan_steps || []),
                JSON.stringify(task.questions || []),
                JSON.stringify(task.risks || []),
              ],
            );

            const planMessage = await saveMessage(
              'assistant',
              buildPlanText(task, analysis.category),
            );
            if (planMessage) {
              setMessages((prev) => [...prev, planMessage]);
            }
          }
        }
      }

      // 处理生日记忆
      if (analysis?.birthdays && analysis.birthdays.length > 0) {
        for (const b of analysis.birthdays) {
          if (!b.name || !b.month || !b.day) continue;

          const saved = await saveBirthday({
            name: b.name,
            month: Number(b.month),
            day: Number(b.day),
            year: b.year ? Number(b.year) : null,
            relation: b.relation || null,
          });

          const daysLeft = daysUntilBirthday(Number(b.month), Number(b.day));

          if (!b.relation) {
            setAwaitingRelationFor({
              ...saved,
              month: Number(b.month),
              day: Number(b.day),
            });
            const ask = await saveMessage(
              'assistant',
              `已记住 ${b.name} 的生日：${Number(b.month)}月${Number(b.day)}日（${
                daysLeft === 0 ? '就是今天' : `还有 ${daysLeft} 天`
              }）。\n\n你和她/他是什么关系呢？告诉我关系，我可以给出更贴合的礼物和行程建议。`,
            );
            if (ask) setMessages((prev) => [...prev, ask]);
          } else {
            const note = await saveMessage(
              'assistant',
              `已记住 ${b.name} 的生日：${Number(b.month)}月${Number(b.day)}日（${
                daysLeft === 0 ? '就是今天' : `还有 ${daysLeft} 天`
              }）。我会在生日前提醒你，并可以为你准备礼物和行程建议。`,
            );
            if (note) setMessages((prev) => [...prev, note]);
          }
        }
        await loadReminders();
      }
    } catch (error) {
      Alert.alert('错误', error.message);
      // 保存错误提示（保存失败不应再抛异常，否则用户看不到任何反馈）
      try {
        const errorMessage = await saveMessage(
          'assistant',
          `抱歉，我遇到了问题：${error.message}\n\n请检查网络连接和 API Key 设置。`,
        );
        if (errorMessage) {
          setMessages((prev) => [...prev, errorMessage]);
        }
      } catch (saveError) {
        console.error('Error saving error message:', saveError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({item}) => {
    const isUser = item.role === 'user';
    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessage : styles.aiMessage,
        ]}>
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.aiBubble,
          ]}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>
            {item.content}
          </Text>
        </View>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
  };

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <TouchableOpacity
        style={styles.quickActionButton}
        onPress={() => setInputText('今天有什么安排？')}>
        <Text style={styles.quickActionText}>今日安排</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.quickActionButton}
        onPress={() => setInputText('帮我规划一下明天')}>
        <Text style={styles.quickActionText}>规划明天</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.quickActionButton}
        onPress={() => setInputText('本周复盘')}>
        <Text style={styles.quickActionText}>本周复盘</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>你好，{userName}</Text>
        <Text style={styles.headerSubtitle}>告诉我你的安排或想法</Text>
      </View>

      {reminders.length > 0 && (
        <View style={styles.reminderBar}>
          <Icon name="cake" size={18} color="#b45309" />
          <Text style={styles.reminderBarText}>
            {reminders
              .map(
                (b) =>
                  `${b.name} 生日${
                    b.daysLeft === 0 ? '就是今天' : `还有 ${b.daysLeft} 天`
                  }`,
              )
              .join('，')}
            ，需要准备礼物吗？
          </Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({animated: true})
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="chat-bubble-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>开始对话吧</Text>
            <Text style={styles.emptySubtext}>
              告诉我你今天做了什么，或者有什么计划
            </Text>
          </View>
        }
      />

      {messages.length === 0 && renderQuickActions()}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="输入你的想法、任务或问题..."
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={isLoading || !inputText.trim()}>
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Icon name="send" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#6366f1',
    padding: 16,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0e7ff',
    marginTop: 4,
  },
  reminderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#fcd34d',
  },
  reminderBarText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  messageList: {
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#6366f1',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  quickActionButton: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  quickActionText: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 48,
    fontSize: 16,
    maxHeight: 120,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
  },
  sendButton: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#c7d2fe',
  },
});

export default ChatScreen;
