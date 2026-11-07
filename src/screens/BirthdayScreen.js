import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  getAllBirthdays,
  saveBirthday,
  deleteBirthday,
  getUpcomingBirthdays,
} from '../services/BirthdayService';
import {generateBirthdayAdvice} from '../services/AIService';

const BirthdayScreen = () => {
  const [birthdays, setBirthdays] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({name: '', month: '', day: '', relation: ''});
  const [advice, setAdvice] = useState({});
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const list = await getAllBirthdays();
    setBirthdays(list);
    setUpcoming(await getUpcomingBirthdays());
  };

  const handleAdd = async () => {
    const month = parseInt(form.month, 10);
    const day = parseInt(form.day, 10);

    if (!form.name.trim()) {
      Alert.alert('提示', '请填写姓名');
      return;
    }
    if (!month || month < 1 || month > 12 || !day || day < 1 || day > 31) {
      Alert.alert('提示', '请填写正确的月和日');
      return;
    }

    await saveBirthday({
      name: form.name.trim(),
      month,
      day,
      relation: form.relation.trim() || null,
    });

    setForm({name: '', month: '', day: '', relation: ''});
    setShowForm(false);
    loadData();
  };

  const handleDelete = (item) => {
    Alert.alert('删除生日', `确定删除「${item.name}」的生日记录吗？`, [
      {text: '取消', style: 'cancel'},
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteBirthday(item.id);
          loadData();
        },
      },
    ]);
  };

  const handleAdvice = async (item) => {
    setLoadingId(item.id);
    try {
      const text = await generateBirthdayAdvice(item);
      setAdvice((prev) => ({...prev, [item.id]: text}));
    } catch (error) {
      Alert.alert('生成失败', error.message);
    } finally {
      setLoadingId(null);
    }
  };

  const formatDate = (item) =>
    `${item.month}月${item.day}日${item.year ? `（${item.year}年出生）` : ''}`;

  const daysText = (days) => {
    if (days === 0) return '就是今天';
    if (days === 1) return '明天';
    return `还有 ${days} 天`;
  };

  return (
    <ScrollView style={styles.container}>
      {upcoming.length > 0 && (
        <View style={styles.reminderBanner}>
          <Icon name="cake" size={28} color="#A4653A" />
          <View style={styles.reminderInfo}>
            <Text style={styles.reminderTitle}>生日提醒</Text>
            {upcoming.map((item) => (
              <Text key={item.id} style={styles.reminderText}>
                {item.name} 的生日{daysText(item.daysLeft)}（{formatDate(item)}）
              </Text>
            ))}
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowForm(!showForm)}>
        <Icon name={showForm ? 'close' : 'add'} size={20} color="#fff" />
        <Text style={styles.addButtonText}>{showForm ? '取消' : '添加生日'}</Text>
      </TouchableOpacity>

      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>新增生日记忆</Text>
          <TextInput
            style={styles.input}
            placeholder="姓名"
            placeholderTextColor="#B3A397"
            value={form.name}
            onChangeText={(v) => setForm({...form, name: v})}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.flex]}
              placeholder="月（如 5）"
              placeholderTextColor="#B3A397"
              keyboardType="numeric"
              value={form.month}
              onChangeText={(v) => setForm({...form, month: v})}
            />
            <TextInput
              style={[styles.input, styles.flex]}
              placeholder="日（如 20）"
              placeholderTextColor="#B3A397"
              keyboardType="numeric"
              value={form.day}
              onChangeText={(v) => setForm({...form, day: v})}
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="关系（如：母亲 / 大学同学）"
            placeholderTextColor="#B3A397"
            value={form.relation}
            onChangeText={(v) => setForm({...form, relation: v})}
          />
          <TouchableOpacity style={styles.saveButton} onPress={handleAdd}>
            <Text style={styles.saveButtonText}>保存</Text>
          </TouchableOpacity>
        </View>
      )}

      {birthdays.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="cake" size={64} color="#EADACB" />
          <Text style={styles.emptyText}>还没有生日记录</Text>
          <Text style={styles.emptySubtext}>
            在聊天里告诉 AI「我妈生日是5月20日」即可自动记忆
          </Text>
        </View>
      ) : (
        birthdays.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.date}>{formatDate(item)}</Text>
                {item.relation ? (
                  <View style={styles.relationBadge}>
                    <Text style={styles.relationText}>{item.relation}</Text>
                  </View>
                ) : (
                  <Text style={styles.relationHint}>
                    关系未知，可在聊天中告诉 AI
                  </Text>
                )}
              </View>
              <View style={styles.daysBadge}>
                <Text style={styles.daysText}>{daysText(item.daysLeft)}</Text>
              </View>
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.adviceButton}
                onPress={() => handleAdvice(item)}
                disabled={loadingId === item.id}>
                {loadingId === item.id ? (
                  <ActivityIndicator size="small" color="#E8996C" />
                ) : (
                  <>
                    <Icon name="card-giftcard" size={18} color="#E8996C" />
                    <Text style={styles.adviceButtonText}>礼物与行程建议</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item)}>
                <Icon name="delete" size={18} color="#C96A5B" />
              </TouchableOpacity>
            </View>

            {advice[item.id] && (
              <View style={styles.adviceBox}>
                <Text style={styles.adviceText}>{advice[item.id]}</Text>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
    padding: 16,
  },
  reminderBanner: {
    flexDirection: 'row',
    backgroundColor: '#FDEFE2',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3D6BC',
    marginBottom: 16,
  },
  reminderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#A4653A',
    marginBottom: 4,
  },
  reminderText: {
    fontSize: 13,
    color: '#8C5A33',
    lineHeight: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8996C',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
    marginBottom: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A3B33',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#EADACB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#4A3B33',
    backgroundColor: '#FFFBF6',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#8FBF8F',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#C9A488',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A3B33',
  },
  date: {
    fontSize: 14,
    color: '#8C7A6E',
    marginTop: 4,
  },
  relationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FCEFE6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  relationText: {
    fontSize: 12,
    color: '#E8996C',
  },
  relationHint: {
    fontSize: 12,
    color: '#D9A05B',
    marginTop: 8,
  },
  daysBadge: {
    backgroundColor: '#FBEDE9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  daysText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C96A5B',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  adviceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#F3D6BC',
    borderRadius: 12,
    paddingVertical: 10,
    marginRight: 8,
    backgroundColor: '#FCEFE6',
  },
  adviceButtonText: {
    fontSize: 14,
    color: '#E8996C',
    fontWeight: '500',
  },
  deleteButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#FBEDE9',
  },
  adviceBox: {
    marginTop: 12,
    backgroundColor: '#FFF8F0',
    borderRadius: 12,
    padding: 12,
  },
  adviceText: {
    fontSize: 14,
    color: '#4A3B33',
    lineHeight: 22,
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
    paddingHorizontal: 24,
  },
});

export default BirthdayScreen;
