import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {executeQueryAll} from '../database/Database';
import {useTheme} from '../theme/ThemeContext';

const SearchScreen = () => {
  const {theme} = useTheme();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);

  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState({
    tasks: [],
    conversations: [],
    birthdays: [],
  });

  useEffect(() => {
    if (!keyword.trim()) {
      setResults({tasks: [], conversations: [], birthdays: []});
      return;
    }
    const timer = setTimeout(() => search(keyword.trim()), 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const search = async (text) => {
    const like = `%${text}%`;
    try {
      const [tasks, conversations, birthdays] = await Promise.all([
        executeQueryAll(
          `SELECT t.*, c.name as category_name FROM tasks t
           LEFT JOIN categories c ON t.category = c.id
           WHERE t.title LIKE ? OR t.description LIKE ?
           ORDER BY t.created_at DESC LIMIT 20`,
          [like, like],
        ),
        executeQueryAll(
          `SELECT * FROM conversations WHERE content LIKE ?
           ORDER BY timestamp DESC LIMIT 20`,
          [like],
        ),
        executeQueryAll(
          `SELECT * FROM birthdays
           WHERE name LIKE ? OR relation LIKE ? OR notes LIKE ?
           ORDER BY month, day LIMIT 20`,
          [like, like, like],
        ),
      ]);
      setResults({tasks, conversations, birthdays});
    } catch (error) {
      console.error('搜索失败:', error);
    }
  };

  const total =
    results.tasks.length + results.conversations.length + results.birthdays.length;

  const renderSection = (title, icon, items, renderItem) => {
    if (items.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name={icon} size={18} color={c.primary} />
          <Text style={styles.sectionTitle}>
            {title} · {items.length}
          </Text>
        </View>
        {items.map(renderItem)}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Icon name="search" size={20} color={c.muted} />
        <TextInput
          style={styles.searchInput}
          value={keyword}
          onChangeText={setKeyword}
          placeholder="搜索任务、聊天记录、生日..."
          placeholderTextColor={c.muted}
          autoCorrect={false}
        />
        {keyword.length > 0 && (
          <TouchableOpacity onPress={() => setKeyword('')}>
            <Icon name="cancel" size={18} color={c.muted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
        {keyword.trim() === '' ? (
          <View style={styles.emptyContainer}>
            <Icon name="manage-search" size={64} color={c.iconMuted} />
            <Text style={styles.emptyText}>全局搜索</Text>
            <Text style={styles.emptySubtext}>
              可以搜任务标题、聊天内容、生日姓名或关系
            </Text>
          </View>
        ) : total === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="search-off" size={64} color={c.iconMuted} />
            <Text style={styles.emptyText}>没有找到相关内容</Text>
            <Text style={styles.emptySubtext}>换个关键词试试</Text>
          </View>
        ) : (
          <>
            {renderSection('任务', 'check-circle', results.tasks, (item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.resultItem}
                onPress={() =>
                  Alert.alert(
                    item.title,
                    `${item.description || '无描述'}\n\n分类：${
                      item.category_name || '未分类'
                    }\n状态：${item.status === 'completed' ? '已完成' : '待办'}`,
                  )
                }>
                <Text style={styles.resultTitle}>{item.title}</Text>
                {item.description ? (
                  <Text style={styles.resultSnippet} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
                <View style={styles.resultMeta}>
                  <Text style={styles.resultTag}>
                    {item.category_name || '未分类'}
                  </Text>
                  <Text
                    style={[
                      styles.resultTag,
                      item.status === 'completed' && {color: c.success},
                    ]}>
                    {item.status === 'completed' ? '已完成' : '待办'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {renderSection('聊天记录', 'chat', results.conversations, (item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.resultItem}
                onPress={() => Alert.alert(item.role === 'user' ? '我' : 'AI 管家', item.content)}>
                <Text style={styles.resultSnippet} numberOfLines={3}>
                  {item.content}
                </Text>
                <Text style={styles.resultTime}>
                  {item.role === 'user' ? '我' : 'AI'} ·{' '}
                  {new Date(item.timestamp).toLocaleString('zh-CN')}
                </Text>
              </TouchableOpacity>
            ))}

            {renderSection('生日', 'cake', results.birthdays, (item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.resultItem}
                onPress={() =>
                  Alert.alert(
                    item.name,
                    `${item.month}月${item.day}日${item.relation ? ` · ${item.relation}` : ''}`,
                  )
                }>
                <Text style={styles.resultTitle}>{item.name}</Text>
                <Text style={styles.resultSnippet}>
                  {item.month}月{item.day}日
                  {item.relation ? ` · ${item.relation}` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = (c) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      margin: 16,
      marginBottom: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 22,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: c.text,
      padding: 0,
    },
    listContent: {
      padding: 16,
      paddingTop: 8,
      flexGrow: 1,
    },
    section: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: c.text,
    },
    resultItem: {
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    resultTitle: {
      fontSize: 15,
      fontWeight: '500',
      color: c.text,
    },
    resultSnippet: {
      fontSize: 13,
      color: c.subtext,
      marginTop: 4,
      lineHeight: 19,
    },
    resultMeta: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 6,
    },
    resultTag: {
      fontSize: 12,
      color: c.primary,
    },
    resultTime: {
      fontSize: 11,
      color: c.muted,
      marginTop: 6,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: c.text,
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 14,
      color: c.subtext,
      marginTop: 8,
      textAlign: 'center',
      paddingHorizontal: 32,
    },
  });

export default SearchScreen;
