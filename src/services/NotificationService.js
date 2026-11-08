import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  TriggerType,
} from '@notifee/react-native';
import {executeQueryAll} from '../database/Database';
import {getAllBirthdays} from './BirthdayService';
import {
  getNotificationsEnabled,
  saveNotificationsEnabled,
} from './StorageService';

const CHANNEL_ID = 'life-reminders';
const SCHEDULED_IDS_KEY = '@scheduled_notification_ids';

// 创建通知渠道（Android 8+ 必需）
const ensureChannel = async () => {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: '生活提醒',
    importance: AndroidImportance.HIGH,
  });
};

// 请求通知权限，返回是否已授权
export const requestNotificationPermission = async () => {
  const settings = await notifee.requestPermission();
  return (
    settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
  );
};

const cancelScheduled = async () => {
  try {
    const raw = await AsyncStorage.getItem(SCHEDULED_IDS_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    for (const id of ids) {
      await notifee.cancelTriggerNotification(id);
    }
  } catch (error) {
    console.error('取消旧提醒失败:', error);
  }
  await AsyncStorage.setItem(SCHEDULED_IDS_KEY, '[]');
};

const buildTrigger = (timestamp) => ({
  type: TriggerType.TIMESTAMP,
  timestamp,
});

const scheduleOne = async (id, title, body, timestamp, ids) => {
  if (timestamp <= Date.now() + 60 * 1000) return;
  await notifee.createTriggerNotification(
    {
      id,
      title,
      body,
      android: {
        channelId: CHANNEL_ID,
        smallIcon: 'ic_launcher',
        pressAction: {id: 'default'},
        importance: AndroidImportance.HIGH,
      },
    },
    buildTrigger(timestamp),
  );
  ids.push(id);
};

const atNine = (date) => {
  const d = new Date(date);
  d.setHours(9, 0, 0, 0);
  return d.getTime();
};

const addDays = (base, days) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
};

/**
 * 重新安排所有提醒：生日（提前 N 天 + 当天）与任务（到期当天）
 */
export const scheduleAllReminders = async () => {
  const enabled = await getNotificationsEnabled();
  if (!enabled) return {scheduled: 0};

  await ensureChannel();
  await cancelScheduled();

  const ids = [];
  const now = new Date();

  // 生日提醒（只排未来 120 天内的，避免过多任务）
  try {
    const birthdays = await getAllBirthdays();
    for (const b of birthdays) {
      if (b.daysLeft > 120) continue;
      const reminderDays = b.reminder_days || 7;
      const birthdayDate = addDays(now, b.daysLeft);
      const aheadDate = addDays(birthdayDate, -reminderDays);
      const aheadTime = atNine(aheadDate);
      const dayTime = atNine(birthdayDate);

      if (aheadTime > Date.now()) {
        await scheduleOne(
          `birthday_ahead_${b.id}_${birthdayDate.getFullYear()}`,
          `${b.name} 的生日快到了`,
          `还有 ${reminderDays} 天（${b.month}月${b.day}日），可以准备礼物了`,
          aheadTime,
          ids,
        );
      }
      await scheduleOne(
        `birthday_day_${b.id}_${birthdayDate.getFullYear()}`,
        `今天是 ${b.name} 的生日`,
        `记得送上祝福${b.relation ? `（${b.relation}）` : ''}`,
        dayTime,
        ids,
      );
    }
  } catch (error) {
    console.error('安排生日提醒失败:', error);
  }

  // 任务到期提醒（只排未来 31 天）
  try {
    const limit = addDays(now, 31).getTime();
    const tasks = await executeQueryAll(
      `SELECT id, title, due_date FROM tasks
       WHERE status = 'pending' AND due_date IS NOT NULL AND due_date > ?
       ORDER BY due_date ASC LIMIT 50`,
      [now.getTime()],
    );
    for (const t of tasks) {
      if (t.due_date > limit) continue;
      await scheduleOne(
        `task_due_${t.id}`,
        '任务今天到期',
        t.title,
        atNine(t.due_date),
        ids,
      );
    }
  } catch (error) {
    console.error('安排任务提醒失败:', error);
  }

  await AsyncStorage.setItem(SCHEDULED_IDS_KEY, JSON.stringify(ids));
  return {scheduled: ids.length};
};

/**
 * 开启/关闭通知提醒（开启时申请权限并立即同步）
 */
export const setNotificationsEnabled = async (enabled) => {
  if (!enabled) {
    await saveNotificationsEnabled(false);
    await cancelScheduled();
    return true;
  }

  const granted = await requestNotificationPermission();
  if (!granted) return false;

  await saveNotificationsEnabled(true);
  await scheduleAllReminders();
  return true;
};

/**
 * 若已开启通知，则在应用启动/数据变更后同步提醒
 */
export const syncRemindersIfEnabled = async () => {
  try {
    const enabled = await getNotificationsEnabled();
    if (!enabled) return;
    await scheduleAllReminders();
  } catch (error) {
    console.error('同步提醒失败:', error);
  }
};
