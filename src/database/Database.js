import SQLite from 'react-native-sqlite-storage';

SQLite.DEBUG(true);
SQLite.enablePromise(true);

const database_name = 'LifeManager.db';
const database_version = '1.0';
const database_displayname = 'Life Manager Database';
const database_size = 200000;

let db = null;

export const initDatabase = async () => {
  try {
    db = await SQLite.openDatabase(
      database_name,
      database_version,
      database_displayname,
      database_size,
    );
    await createTables();
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

export const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase first.');
  }
  return db;
};

const createTables = async () => {
  const queries = [
    // 对话记录表
    `CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      category TEXT,
      sentiment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // 任务表
    `CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      due_date INTEGER,
      completed_at INTEGER,
      related_task_id TEXT,
      source_conversation_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // 分类表
    `CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT,
      icon TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // AI记忆/用户习惯表
    `CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      confidence REAL DEFAULT 1.0,
      last_used INTEGER,
      usage_count INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(type, key)
    );`,

    // 生日记忆表
    `CREATE TABLE IF NOT EXISTS birthdays (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      month INTEGER NOT NULL,
      day INTEGER NOT NULL,
      year INTEGER,
      relation TEXT,
      relationship_level TEXT,
      notes TEXT,
      reminder_days INTEGER DEFAULT 7,
      last_reminded_year INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // 任务规划表（AI 生成的方案、提问与风险）
    `CREATE TABLE IF NOT EXISTS task_plans (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      task_title TEXT NOT NULL,
      plan_steps TEXT,
      questions TEXT,
      risks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // 复盘报告表
    `CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      period_start INTEGER NOT NULL,
      period_end INTEGER NOT NULL,
      content TEXT NOT NULL,
      insights TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // 待整理琐事表
    `CREATE TABLE IF NOT EXISTS pending_items (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      suggested_category TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME
    );`,

    // 插入默认分类
    `INSERT OR IGNORE INTO categories (id, name, color, icon) VALUES
      ('work', '工作', '#ef4444', 'work'),
      ('life', '生活', '#22c55e', 'home'),
      ('health', '健康', '#3b82f6', 'favorite'),
      ('study', '学习', '#f59e0b', 'school'),
      ('social', '社交', '#8b5cf6', 'people'),
      ('finance', '财务', '#06b6d4', 'attach-money'),
      ('other', '其他', '#6b7280', 'more-horiz');`,
  ];

  for (const query of queries) {
    await db.executeSql(query);
  }
};

// 通用查询方法
export const executeQuery = async (sql, params = []) => {
  const database = getDatabase();
  const [result] = await database.executeSql(sql, params);
  return result;
};

export const executeQueryAll = async (sql, params = []) => {
  const result = await executeQuery(sql, params);
  const rows = [];
  for (let i = 0; i < result.rows.length; i++) {
    rows.push(result.rows.item(i));
  }
  return rows;
};

export const executeQueryFirst = async (sql, params = []) => {
  const rows = await executeQueryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
};
