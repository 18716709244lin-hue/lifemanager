import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {executeQueryAll, executeQuery} from '../database/Database';
import {format, isToday, isTomorrow, isYesterday, parseISO} from 'date-fns';
import {zhCN} from 'date-fns/locale';

const TimelineScreen = () => {
  const [sections, setSections] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, completed

  useEffect(() => {
    loadTasks();
  }, [filter]);

  const loadTasks = async () => {
    try {
      let query = `
        SELECT t.*, c.name as category_name, c.color as category_color
        FROM tasks t
        LEFT JOIN categories c ON t.category = c.id
        ORDER BY t.due_date ASC, t.created_at DESC
      `;
      let params = [];

      if (filter === 'pending') {
        query = query.replace('ORDER BY', 'WHERE t.status = "pending" ORDER BY');
      } else if (filter === 'completed') {
        query = query.replace('ORDER BY', 'WHERE t.status = "completed" ORDER BY');
      }

      const tasks = await executeQueryAll(query, params);

      // 按日期分组
      const grouped = {};
      tasks.forEach((task) => {
        const dateKey = task.due_date
          ? format(new Date(task.due_date), 'yyyy-MM-dd')
          : '无日期';
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      });

      // 转换为 SectionList 格式
      const sectionData = Object.entries(grouped)
        .map(([date, tasks]) => ({
          title: formatDateTitle(date),
          data: tasks,
        }))
        .sort((a, b) => {
          if (a.title === '无日期') return 1;
          if (b.title === '无日期') return -1;
          return new Date(a.title) - new Date(b.title);
        });

      setSections(sectionData);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const formatDateTitle = (dateStr) => {
    if (dateStr === '无日期') return dateStr;
    try {
      const date = parseISO(dateStr);
      if (isToday(date)) return '今天';
      if (isTomorrow(date)) return '明天';
      if (isYesterday(date)) return '昨天';
      return format(date, 'M月d日 EEEE', {locale: zhCN});
    } catch {
      return dateStr;
    }
  };

  const toggleTaskStatus = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await executeQuery(
        'UPDATE tasks SET status = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newStatus, newStatus === 'completed' ? Date.now() : null, taskId],
      );
      loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const renderTask = ({item}) => (
    <TouchableOpacity
      style={styles.taskCard}
      onPress={() => toggleTaskStatus(item.id, item.status)}>
      <View style={styles.taskContent}>
        <View
          style={[
            styles.checkbox,
            item.status === 'completed' && styles.checkboxCompleted,
          ]}>
          {item.status === 'completed' && (
            <Icon name="check" size={16} color="#fff" />
          )}
        </View>
        <View style={styles.taskInfo}>
          <Text
            style={[
              styles.taskTitle,
              item.status === 'completed' && styles.taskTitleCompleted,
            ]}>
            {item.title}
          </Text>
          {item.description ? (
            <Text style={styles.taskDescription}>{item.description}</Text>
          ) : null}
          <View style={styles.taskMeta}>
            {item.category_name && (
              <View
                style={[
                  styles.categoryBadge,
                  {backgroundColor: `${item.category_color}20`},
                ]}>
                <Text
                  style={[styles.categoryText, {color: item.category_color}]}>
                  {item.category_name}
                </Text>
              </View>
            )}
            {item.priority === 'high' && (
              <View style={[styles.priorityBadge, styles.priorityHigh]}>
                <Text style={styles.priorityText}>紧急</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({section: {title}}) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        {['all', 'pending', 'completed'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}>
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}>
              {f === 'all' ? '全部' : f === 'pending' ? '待办' : '已完成'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionList
        sections={sections}
        renderItem={renderTask}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadTasks} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="event-note" size={64} color="#E5D5C4" />
            <Text style={styles.emptyText}>暂无任务</Text>
            <Text style={styles.emptySubtext}>
              在聊天中告诉 AI 你的计划，自动提取任务
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F0E0D2',
  },
  filterButtonActive: {
    backgroundColor: '#E8996C',
    borderColor: '#E8996C',
  },
  filterText: {
    fontSize: 14,
    color: '#7A6A5F',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionHeader: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A3B33',
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#C9A488',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5D5C4',
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#8FBF8F',
    borderColor: '#8FBF8F',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4A3B33',
    lineHeight: 22,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#B3A397',
  },
  taskDescription: {
    fontSize: 14,
    color: '#8C7A6E',
    marginTop: 4,
    lineHeight: 20,
  },
  taskMeta: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityHigh: {
    backgroundColor: '#FBEDE9',
  },
  priorityText: {
    fontSize: 12,
    color: '#C96A5B',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A3B33',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8C7A6E',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default TimelineScreen;
