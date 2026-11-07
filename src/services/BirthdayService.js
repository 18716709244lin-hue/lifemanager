import {executeQuery, executeQueryAll, executeQueryFirst} from '../database/Database';
import {v4 as uuidv4} from 'uuid';

/**
 * 计算距离下一次生日的天数（0 表示今天）
 */
export const daysUntilBirthday = (month, day) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let target = new Date(today.getFullYear(), month - 1, day);
  if (target < today) {
    target = new Date(today.getFullYear() + 1, month - 1, day);
  }

  return Math.round((target - today) / (1000 * 60 * 60 * 24));
};

/**
 * 保存或更新生日记录
 */
export const saveBirthday = async (info) => {
  const existing = await executeQueryFirst(
    'SELECT * FROM birthdays WHERE name = ? AND month = ? AND day = ?',
    [info.name, info.month, info.day],
  );

  const now = Date.now();

  if (existing) {
    await executeQuery(
      `UPDATE birthdays SET relation = COALESCE(?, relation), year = COALESCE(?, year),
       notes = COALESCE(?, notes), updated_at = ? WHERE id = ?`,
      [info.relation || null, info.year || null, info.notes || null, now, existing.id],
    );
    return {...existing, ...info, id: existing.id};
  }

  const id = uuidv4();
  await executeQuery(
    `INSERT INTO birthdays (id, name, month, day, year, relation, notes, reminder_days)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      info.name,
      info.month,
      info.day,
      info.year || null,
      info.relation || null,
      info.notes || null,
      info.reminder_days || 7,
    ],
  );

  return {id, ...info};
};

/**
 * 获取所有生日，并附带距离天数与排序
 */
export const getAllBirthdays = async () => {
  const rows = await executeQueryAll('SELECT * FROM birthdays ORDER BY month, day');
  return rows
    .map((row) => ({
      ...row,
      daysLeft: daysUntilBirthday(row.month, row.day),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);
};

/**
 * 获取进入提醒窗口的生日
 */
export const getUpcomingBirthdays = async () => {
  const rows = await getAllBirthdays();
  return rows.filter((b) => b.daysLeft <= (b.reminder_days || 7));
};

/**
 * 更新关系
 */
export const updateBirthdayRelation = async (id, relation) => {
  await executeQuery(
    'UPDATE birthdays SET relation = ?, updated_at = ? WHERE id = ?',
    [relation, Date.now(), id],
  );
};

/**
 * 标记今年已提醒，避免重复提醒
 */
export const markReminded = async (id) => {
  await executeQuery(
    'UPDATE birthdays SET last_reminded_year = ? WHERE id = ?',
    [new Date().getFullYear(), id],
  );
};

/**
 * 删除生日记录
 */
export const deleteBirthday = async (id) => {
  await executeQuery('DELETE FROM birthdays WHERE id = ?', [id]);
};

/**
 * 获取需要询问关系的生日（关系未知）
 */
export const getBirthdayWithoutRelation = async () => {
  return executeQueryFirst(
    "SELECT * FROM birthdays WHERE relation IS NULL OR relation = '' ORDER BY created_at DESC LIMIT 1",
  );
};
