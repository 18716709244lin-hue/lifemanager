import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {executeQueryAll, executeQuery} from '../database/Database';
import {generateReview} from '../services/AIService';
import {format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths} from 'date-fns';

const ReviewScreen = () => {
  const [activeTab, setActiveTab] = useState('weekly'); // weekly, monthly
  const [isGenerating, setIsGenerating] = useState(false);
  const [reviewContent, setReviewContent] = useState(null);
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingItems, setPendingItems] = useState([]);

  useEffect(() => {
    loadStats();
    loadPendingItems();
  }, [activeTab]);

  const loadStats = async () => {
    try {
      const now = new Date();
      let startDate, endDate;

      if (activeTab === 'weekly') {
        startDate = startOfWeek(now, {weekStartsOn: 1});
        endDate = endOfWeek(now, {weekStartsOn: 1});
      } else {
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
      }

      // 任务统计
      const taskStats = await executeQueryAll(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
         FROM tasks
         WHERE created_at BETWEEN ? AND ?`,
        [startDate.getTime(), endDate.getTime()],
      );

      // 分类统计
      const categoryStats = await executeQueryAll(
        `SELECT category, COUNT(*) as count
         FROM tasks
         WHERE created_at BETWEEN ? AND ?
         GROUP BY category`,
        [startDate.getTime(), endDate.getTime()],
      );

      // 对话统计
      const chatStats = await executeQueryAll(
        `SELECT COUNT(*) as count
         FROM conversations
         WHERE timestamp BETWEEN ? AND ?`,
        [startDate.getTime(), endDate.getTime()],
      );

      setStats({
        tasks: taskStats[0] || {total: 0, completed: 0, pending: 0},
        categories: categoryStats,
        chats: chatStats[0]?.count || 0,
        period: {
          start: format(startDate, 'M月d日'),
          end: format(endDate, 'M月d日'),
        },
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadPendingItems = async () => {
    try {
      const items = await executeQueryAll(
        `SELECT * FROM pending_items WHERE status = 'pending' ORDER BY created_at DESC LIMIT 10`,
      );
      setPendingItems(items);
    } catch (error) {
      console.error('Error loading pending items:', error);
    }
  };

  const generateAIReview = async () => {
    setIsGenerating(true);
    try {
      const now = new Date();
      let startDate, endDate;

      if (activeTab === 'weekly') {
        startDate = startOfWeek(subWeeks(now, 1), {weekStartsOn: 1});
        endDate = endOfWeek(subWeeks(now, 1), {weekStartsOn: 1});
      } else {
        startDate = startOfMonth(subMonths(now, 1));
        endDate = endOfMonth(subMonths(now, 1));
      }

      // 收集数据
      const tasks = await executeQueryAll(
        `SELECT t.*, c.name as category_name
         FROM tasks t
         LEFT JOIN categories c ON t.category = c.id
         WHERE t.created_at BETWEEN ? AND ?`,
        [startDate.getTime(), endDate.getTime()],
      );

      const conversations = await executeQueryAll(
        `SELECT content, category, sentiment, timestamp
         FROM conversations
         WHERE timestamp BETWEEN ? AND ? AND role = 'user'`,
        [startDate.getTime(), endDate.getTime()],
      );

      const reviewData = {
        period: activeTab === 'weekly' ? '本周' : '本月',
        dateRange: `${format(startDate, 'yyyy-MM-dd')} 至 ${format(endDate, 'yyyy-MM-dd')}`,
        tasks: {
          total: tasks.length,
          completed: tasks.filter((t) => t.status === 'completed').length,
          pending: tasks.filter((t) => t.status === 'pending').length,
          byCategory: tasks.reduce((acc, t) => {
            const cat = t.category_name || '未分类';
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
          }, {}),
          list: tasks.map((t) => ({
            title: t.title,
            status: t.status,
            category: t.category_name,
          })),
        },
        conversations: {
          total: conversations.length,
          topics: conversations.reduce((acc, c) => {
            if (c.category) {
              acc[c.category] = (acc[c.category] || 0) + 1;
            }
            return acc;
          }, {}),
        },
      };

      const content = await generateReview(activeTab, reviewData);
      setReviewContent(content);

      // 保存复盘报告
      await executeQuery(
        `INSERT INTO reviews (id, type, period_start, period_end, content)
         VALUES (?, ?, ?, ?, ?)`,
        [
          `review_${Date.now()}`,
          activeTab,
          startDate.getTime(),
          endDate.getTime(),
          content,
        ],
      );
    } catch (error) {
      console.error('Error generating review:', error);
      setReviewContent(`生成复盘失败: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const resolvePendingItem = async (itemId, category) => {
    try {
      await executeQuery(
        'UPDATE pending_items SET status = ?, suggested_category = ?, resolved_at = ? WHERE id = ?',
        ['resolved', category, Date.now(), itemId],
      );
      loadPendingItems();
    } catch (error) {
      console.error('Error resolving item:', error);
    }
  };

  const renderStatCard = (title, value, subtitle, icon, color) => (
    <View style={[styles.statCard, {borderLeftColor: color}]}>
      <View style={styles.statHeader}>
        <Icon name={icon} size={24} color={color} />
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadStats} />
      }>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'weekly' && styles.tabActive]}
          onPress={() => setActiveTab('weekly')}>
          <Text
            style={[styles.tabText, activeTab === 'weekly' && styles.tabTextActive]}>
            周报
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'monthly' && styles.tabActive]}
          onPress={() => setActiveTab('monthly')}>
          <Text
            style={[styles.tabText, activeTab === 'monthly' && styles.tabTextActive]}>
            月报
          </Text>
        </TouchableOpacity>
      </View>

      {stats && (
        <View style={styles.statsContainer}>
          <Text style={styles.periodText}>
            {stats.period.start} - {stats.period.end}
          </Text>
          <View style={styles.statsGrid}>
            {renderStatCard(
              '总任务',
              stats.tasks.total || 0,
              `完成 ${stats.tasks.completed || 0} / 待办 ${stats.tasks.pending || 0}`,
              'assignment',
              '#6366f1',
            )}
            {renderStatCard(
              '对话记录',
              stats.chats,
              '与AI的交流次数',
              'chat',
              '#22c55e',
            )}
          </View>

          {stats.categories.length > 0 && (
            <View style={styles.categorySection}>
              <Text style={styles.sectionTitle}>分类分布</Text>
              <View style={styles.categoryList}>
                {stats.categories.map((cat) => (
                  <View key={cat.category} style={styles.categoryItem}>
                    <Text style={styles.categoryName}>
                      {cat.category || '未分类'}
                    </Text>
                    <Text style={styles.categoryCount}>{cat.count} 个任务</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {pendingItems.length > 0 && (
        <View style={styles.pendingSection}>
          <Text style={styles.sectionTitle}>待整理琐事 ({pendingItems.length})</Text>
          {pendingItems.map((item) => (
            <View key={item.id} style={styles.pendingItem}>
              <Text style={styles.pendingContent}>{item.content}</Text>
              <View style={styles.pendingActions}>
                {['work', 'life', 'health', 'study'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={styles.pendingAction}
                    onPress={() => resolvePendingItem(item.id, cat)}>
                    <Text style={styles.pendingActionText}>
                      {cat === 'work' ? '工作' : cat === 'life' ? '生活' : cat === 'health' ? '健康' : '学习'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.generateSection}>
        <TouchableOpacity
          style={styles.generateButton}
          onPress={generateAIReview}
          disabled={isGenerating}>
          {isGenerating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="auto-awesome" size={24} color="#fff" />
              <Text style={styles.generateButtonText}>
                生成 {activeTab === 'weekly' ? '上周' : '上月'} AI 复盘
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {reviewContent && (
        <View style={styles.reviewSection}>
          <Text style={styles.sectionTitle}>AI 复盘报告</Text>
          <View style={styles.reviewContent}>
            <Text style={styles.reviewText}>{reviewContent}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tabActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
  },
  tabTextActive: {
    color: '#fff',
  },
  statsContainer: {
    padding: 16,
  },
  periodText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  categorySection: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  categoryList: {
    gap: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  categoryName: {
    fontSize: 14,
    color: '#374151',
  },
  categoryCount: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  pendingSection: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  pendingItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  pendingContent: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  pendingAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  pendingActionText: {
    fontSize: 12,
    color: '#4b5563',
  },
  generateSection: {
    padding: 16,
  },
  generateButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewSection: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  reviewContent: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
  },
  reviewText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 24,
  },
});

export default ReviewScreen;
