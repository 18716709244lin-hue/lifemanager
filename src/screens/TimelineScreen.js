import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {executeQueryAll, executeQuery} from '../database/Database';
import {generateId} from '../utils/id';
import {syncRemindersIfEnabled} from '../services/NotificationService';
import {format, isToday, isTomorrow, startOfDay, differenceInCalendarDays} from 'date-fns';
import {zhCN} from 'date-fns/locale';
import {useTheme} from '../theme/ThemeContext';

const TimelineScreen = () => {
  const {theme} = useTheme();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);

  const [sections, setSections] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, completed
  const [categories, setCategories] = useState([]);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'life',
    priority: 'medium',
    dueDate: null,
    dateText: '',
  });

  useEffect(() => {
    loadTasks();
    loadCategories();
  }, [filter]);

  const loadCategories = async () => {
    try {
      setCategories(await executeQueryAll('SELECT * FROM categories ORDER BY name'));
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  };

  const loadTasks = async () => {
    try {
      let query = `
        SELECT t.*, c.name as category_name, c.color as category_color
        FROM tasks t
        LEFT JOIN categories c ON t.category = c.id
        ORDER BY t.due_date ASC, t.created_at DESC
      `;
      if (filter === 'pending') {
        query = query.replace('ORDER BY', 'WHERE t.status = "pending" ORDER BY');
      } else if (filter === 'completed') {
        query = query.replace('ORDER BY', 'WHERE t.status = "completed" ORDER BY');
      }

      const tasks = await executeQueryAll(query, []);
      const todayStart = startOfDay(new Date()).getTime();

      // 按日期分组；未完成的过期任务统一归入「已逾期」
      const grouped = {};
      tasks.forEach((task) => {
        const dueTime = task.due_date ? Number(task.due_date) : null;
        const isOverdue =
          task.status !== 'completed' && dueTime !== null && dueTime < todayStart;

        let key = 'no_date';
        if (isOverdue) {
          key = 'overdue';
        } else if (dueTime) {
          key = format(new Date(dueTime), 'yyyy-MM-dd');
        }

        if (!grouped[key]) {
          grouped[key] = {key, tasks: []};
        }
        grouped[key].tasks.push(task);
      });

      const sectionData = Object.values(grouped).map((group) => ({
        key: group.key,
        title:
          group.key === 'overdue'
            ? '已逾期'
            : group.key === 'no_date'
            ? '无日期'
            : formatSectionTitle(group.key),
        sortValue:
          group.key === 'overdue'
            ? -1
            : group.key === 'no_date'
            ? Number.MAX_SAFE_INTEGER
            : new Date(`${group.key}T00:00:00`).getTime(),
        data: group.tasks,
      }));

      sectionData.sort((a, b) => a.sortValue - b.sortValue);
      setSections(sectionData);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const formatSectionTitle = (dateKey) => {
    const date = new Date(`${dateKey}T00:00:00`);
    if (isToday(date)) return '今天';
    if (isTomorrow(date)) return '明天';
    return format(date, 'M月d日 EEEE', {locale: zhCN});
  };

  const toggleTaskStatus = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await executeQuery(
        'UPDATE tasks SET status = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newStatus, newStatus === 'completed' ? Date.now() : null, taskId],
      );
      loadTasks();
      syncRemindersIfEnabled();
    } catch (error) {
      console.error('更新任务失败:', error);
    }
  };

  const openEditor = (task = null) => {
    if (task) {
      const dateText = task.due_date
        ? format(new Date(Number(task.due_date)), 'yyyy-MM-dd')
        : '';
      setEditingId(task.id);
      setForm({
        title: task.title || '',
        description: task.description || '',
        category: task.category || 'other',
        priority: task.priority || 'medium',
        dueDate: task.due_date ? Number(task.due_date) : null,
        dateText,
      });
    } else {
      setEditingId(null);
      setForm({
        title: '',
        description: '',
        category: categories[0]?.id || 'life',
        priority: 'medium',
        dueDate: atDay(0),
        dateText: format(new Date(), 'yyyy-MM-dd'),
      });
    }
    setEditorVisible(true);
  };

  const atDay = (offset) => {
    const d = startOfDay(new Date());
    d.setDate(d.getDate() + offset);
    return d.getTime();
  };

  const pickDate = (offset) => {
    const date = new Date(atDay(offset));
    setForm((prev) => ({
      ...prev,
      dueDate: date.getTime(),
      dateText: format(date, 'yyyy-MM-dd'),
    }));
  };

  const onDateTextChange = (text) => {
    setForm((prev) => ({...prev, dateText: text}));
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const parsed = new Date(`${text}T00:00:00`);
      if (!isNaN(parsed.getTime())) {
        setForm((prev) => ({...prev, dueDate: parsed.getTime()}));
      }
    } else if (text === '') {
      setForm((prev) => ({...prev, dueDate: null}));
    }
  };

  const saveTask = async () => {
    const title = form.title.trim();
    if (!title) {
      Alert.alert('提示', '请填写任务标题');
      return;
    }

    try {
      if (editingId) {
        await executeQuery(
          `UPDATE tasks SET title = ?, description = ?, category = ?, priority = ?,
           due_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [title, form.description.trim(), form.category, form.priority, form.dueDate, editingId],
        );
      } else {
        await executeQuery(
          `INSERT INTO tasks (id, title, description, category, priority, status, due_date)
           VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
          [
            generateId(),
            title,
            form.description.trim(),
            form.category,
            form.priority,
            form.dueDate,
          ],
        );
      }
      setEditorVisible(false);
      loadTasks();
      syncRemindersIfEnabled();
    } catch (error) {
      console.error('保存任务失败:', error);
      Alert.alert('保存失败', error.message);
    }
  };

  const confirmDelete = (task) => {
    Alert.alert('删除任务', `确定删除「${task.title}」吗？`, [
      {text: '取消', style: 'cancel'},
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await executeQuery('DELETE FROM tasks WHERE id = ?', [task.id]);
            await executeQuery('DELETE FROM task_plans WHERE task_id = ?', [task.id]);
            loadTasks();
            syncRemindersIfEnabled();
          } catch (error) {
            console.error('删除任务失败:', error);
          }
        },
      },
    ]);
  };

  const onTaskLongPress = (task) => {
    Alert.alert(task.title, '选择操作', [
      {text: '取消', style: 'cancel'},
      {text: '编辑', onPress: () => openEditor(task)},
      {text: '删除', style: 'destructive', onPress: () => confirmDelete(task)},
    ]);
  };

  const renderTask = ({item}) => {
    const dueTime = item.due_date ? Number(item.due_date) : null;
    const overdue =
      item.status !== 'completed' &&
      dueTime !== null &&
      dueTime < startOfDay(new Date()).getTime();
    const overdueDays = overdue
      ? differenceInCalendarDays(new Date(), new Date(dueTime))
      : 0;

    return (
      <TouchableOpacity
        style={styles.taskCard}
        onPress={() => toggleTaskStatus(item.id, item.status)}
        onLongPress={() => onTaskLongPress(item)}
        delayLongPress={400}>
        <View style={styles.taskContent}>
          <View
            style={[
              styles.checkbox,
              item.status === 'completed' && styles.checkboxCompleted,
            ]}>
            {item.status === 'completed' && (
              <Icon name="check" size={16} color={c.onPrimary} />
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
                    {backgroundColor: `${item.category_color}22`},
                  ]}>
                  <Text style={[styles.categoryText, {color: item.category_color}]}>
                    {item.category_name}
                  </Text>
                </View>
              )}
              {item.priority === 'high' && (
                <View style={[styles.priorityBadge, styles.priorityHigh]}>
                  <Text style={styles.priorityText}>紧急</Text>
                </View>
              )}
              {overdue && (
                <View style={styles.overdueBadge}>
                  <Text style={styles.overdueText}>逾期 {overdueDays} 天</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({section: {title}}) => (
    <View style={styles.sectionHeader}>
      <Text
        style={[
          styles.sectionTitle,
          title === '已逾期' && {color: c.danger},
        ]}>
        {title}
      </Text>
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadTasks();
            }}
            tintColor={c.primary}
          />
        }
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="event-note" size={64} color={c.iconMuted} />
            <Text style={styles.emptyText}>暂无任务</Text>
            <Text style={styles.emptySubtext}>
              点击右下角 + 新建任务，或在聊天中告诉 AI 你的计划
            </Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => openEditor()}>
        <Icon name="add" size={28} color={c.onPrimary} />
      </TouchableOpacity>

      <Modal
        visible={editorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditorVisible(false)}>
        <View style={[styles.modalBackdrop, {backgroundColor: c.overlay}]}>
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>
                {editingId ? '编辑任务' : '新建任务'}
              </Text>

              <TextInput
                style={styles.modalInput}
                value={form.title}
                onChangeText={(v) => setForm({...form, title: v})}
                placeholder="任务标题（必填）"
                placeholderTextColor={c.muted}
              />
              <TextInput
                style={[styles.modalInput, styles.modalTextarea]}
                value={form.description}
                onChangeText={(v) => setForm({...form, description: v})}
                placeholder="备注（可选）"
                placeholderTextColor={c.muted}
                multiline
              />

              <Text style={styles.fieldLabel}>分类</Text>
              <View style={styles.chipRow}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.chip,
                      form.category === cat.id && {
                        borderColor: cat.color,
                        backgroundColor: `${cat.color}22`,
                      },
                    ]}
                    onPress={() => setForm({...form, category: cat.id})}>
                    <Text
                      style={[
                        styles.chipText,
                        form.category === cat.id && {color: cat.color},
                      ]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>优先级</Text>
              <View style={styles.chipRow}>
                {[
                  {id: 'medium', label: '普通'},
                  {id: 'high', label: '紧急'},
                ].map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.chip,
                      form.priority === p.id && styles.chipActive,
                    ]}
                    onPress={() => setForm({...form, priority: p.id})}>
                    <Text
                      style={[
                        styles.chipText,
                        form.priority === p.id && styles.chipTextActive,
                      ]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>截止日期</Text>
              <View style={styles.chipRow}>
                {[
                  {label: '今天', offset: 0},
                  {label: '明天', offset: 1},
                  {label: '后天', offset: 2},
                ].map((d) => (
                  <TouchableOpacity
                    key={d.label}
                    style={styles.chip}
                    onPress={() => pickDate(d.offset)}>
                    <Text style={styles.chipText}>{d.label}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.chip}
                  onPress={() => setForm({...form, dueDate: null, dateText: ''})}>
                  <Text style={styles.chipText}>不设日期</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.modalInput}
                value={form.dateText}
                onChangeText={onDateTextChange}
                placeholder="或输入日期，如 2026-11-20"
                placeholderTextColor={c.muted}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setEditorVisible(false)}>
                  <Text style={styles.cancelButtonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={saveTask}>
                  <Text style={styles.saveButtonText}>保存</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (c) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
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
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    filterButtonActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    filterText: {
      fontSize: 14,
      color: c.subtext,
      fontWeight: '500',
    },
    filterTextActive: {
      color: c.onPrimary,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 96,
      flexGrow: 1,
    },
    sectionHeader: {
      paddingVertical: 12,
      paddingHorizontal: 4,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: c.text,
    },
    taskCard: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: c.shadow,
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
      borderColor: c.borderStrong,
      marginRight: 12,
      marginTop: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxCompleted: {
      backgroundColor: c.success,
      borderColor: c.success,
    },
    taskInfo: {
      flex: 1,
    },
    taskTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: c.text,
      lineHeight: 22,
    },
    taskTitleCompleted: {
      textDecorationLine: 'line-through',
      color: c.muted,
    },
    taskDescription: {
      fontSize: 14,
      color: c.subtext,
      marginTop: 4,
      lineHeight: 20,
    },
    taskMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
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
      backgroundColor: c.dangerSoft,
    },
    priorityText: {
      fontSize: 12,
      color: c.danger,
      fontWeight: '500',
    },
    overdueBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: c.dangerSoft,
    },
    overdueText: {
      fontSize: 12,
      color: c.danger,
      fontWeight: '500',
    },
    emptyContainer: {
      alignItems: 'center',
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
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: c.shadow,
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 6,
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
    },
    modalCard: {
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 20,
      maxHeight: '85%',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: c.text,
      marginBottom: 16,
    },
    modalInput: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: c.text,
      backgroundColor: c.inputBg,
      marginBottom: 12,
    },
    modalTextarea: {
      minHeight: 70,
      textAlignVertical: 'top',
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: c.subtext,
      marginBottom: 8,
      marginTop: 4,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    chipActive: {
      borderColor: c.primary,
      backgroundColor: c.soft,
    },
    chipText: {
      fontSize: 13,
      color: c.subtext,
    },
    chipTextActive: {
      color: c.primary,
      fontWeight: '600',
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    cancelButtonText: {
      fontSize: 15,
      color: c.subtext,
      fontWeight: '600',
    },
    saveButton: {
      backgroundColor: c.primary,
    },
    saveButtonText: {
      fontSize: 15,
      color: c.onPrimary,
      fontWeight: '600',
    },
  });

export default TimelineScreen;
