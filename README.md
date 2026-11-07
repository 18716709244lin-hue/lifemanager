# AI 生活管家

一个智能的 Android 生活管理 APP，帮助你记录琐事、规划行程、自动分类、周期复盘。

## 功能特性

- **智能对话**: 告诉 AI 你的安排，自动理解和记录
- **自动收纳**: AI 自动分类任务（工作/生活/健康/学习等）
- **时间线**: 清晰查看每日、每周任务安排
- **周期复盘**: 一键生成周报/月报，AI 分析你的时间分配
- **待整理箱**: 无法分类的琐事自动收集，定期整理
- **BYOK 模式**: 支持 OpenAI、Claude、DeepSeek、通义千问，API Key 本地存储

## 快速开始

### 方式一：自动安装（推荐）

1. **以管理员身份运行 PowerShell**
2. 执行以下命令：
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force
   .\setup.ps1
   ```
3. 等待安装完成，重启电脑

### 方式二：手动安装

#### 1. 安装 Node.js
- 访问 https://nodejs.org 下载 LTS 版本
- 安装时勾选 "Automatically install the necessary tools"

#### 2. 安装 JDK 17
- 下载 Microsoft OpenJDK 17: https://learn.microsoft.com/java/openjdk/download
- 或使用 Adoptium: https://adoptium.net

#### 3. 安装 Android Studio
- 下载: https://developer.android.com/studio
- 安装时确保勾选 Android SDK

#### 4. 配置 Android SDK
打开 Android Studio → SDK Manager，安装：
- Android SDK Platform 34
- Android SDK Build-Tools 34.0.0
- Android Emulator（可选，用于模拟器测试）

#### 5. 配置环境变量
```powershell
# 系统环境变量
ANDROID_HOME = C:\Users\你的用户名\AppData\Local\Android\Sdk

# Path 添加
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
```

#### 6. 安装依赖
```bash
cd LifeManagerApp
npm install
```

## 运行 APP

### 在真实设备上运行（推荐）

1. 手机开启 **开发者模式** 和 **USB 调试**
2. USB 连接电脑
3. 运行：
   ```bash
   npx react-native run-android
   ```

### 在模拟器上运行

1. Android Studio 中创建虚拟设备
2. 启动模拟器
3. 运行：
   ```bash
   npx react-native run-android
   ```

## 打包 APK

运行打包脚本：
```powershell
.\build-apk.ps1
```

生成的 APK 位于项目根目录：`LifeManagerApp-v1.0.apk`

### 安装到手机

1. 将 APK 发送到手机（微信/QQ/邮件/网盘）
2. 手机上点击 APK 文件
3. 允许"未知来源"安装
4. 完成安装

## 配置 AI API

首次打开 APP 会进入引导页面，需要配置：

1. **选择 AI 服务商**（推荐 DeepSeek，国内直连且便宜）
2. **输入 API Key**（在对应平台申请）
3. **选择模型**

### 获取 API Key

| 服务商 | 申请地址 | 特点 |
|--------|---------|------|
| DeepSeek | https://platform.deepseek.com | 国内直连，便宜，能力强 |
| OpenAI | https://platform.openai.com | 能力最强，需国际网络 |
| Claude | https://console.anthropic.com | 长文本好，需国际网络 |
| 通义千问 | https://dashscope.aliyun.com | 国内直连，阿里生态 |

## 项目结构

```
LifeManagerApp/
├── src/
│   ├── screens/           # 页面
│   │   ├── ChatScreen.js      # 对话界面
│   │   ├── TimelineScreen.js  # 时间线
│   │   ├── ReviewScreen.js    # 复盘报告
│   │   ├── SettingsScreen.js  # 设置
│   │   └── OnboardingScreen.js # 引导页
│   ├── services/          # 服务
│   │   ├── AIService.js       # AI API 调用
│   │   └── StorageService.js  # 本地存储
│   ├── database/          # 数据库
│   │   └── Database.js        # SQLite 操作
│   └── components/        # 组件（预留）
├── android/               # Android 原生代码
├── App.js                 # 主入口
├── index.js               # 注册入口
├── package.json           # 依赖配置
├── setup.ps1              # 自动安装脚本
├── build-apk.ps1          # APK 打包脚本
└── README.md              # 本文件
```

## 数据库设计

### conversations（对话记录）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 唯一标识 |
| role | TEXT | user / assistant |
| content | TEXT | 对话内容 |
| timestamp | INTEGER | 时间戳 |
| category | TEXT | 分类 |
| sentiment | TEXT | 情感倾向 |

### tasks（任务）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 唯一标识 |
| title | TEXT | 任务标题 |
| description | TEXT | 任务描述 |
| category | TEXT | 分类ID |
| priority | TEXT | high/medium/low |
| status | TEXT | pending/completed |
| due_date | INTEGER | 截止日期 |
| source_conversation_id | TEXT | 来源对话 |

### memories（AI记忆）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 唯一标识 |
| type | TEXT | 记忆类型 |
| key | TEXT | 键 |
| value | TEXT | 值 |
| confidence | REAL | 置信度 |

### reviews（复盘报告）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 唯一标识 |
| type | TEXT | weekly/monthly |
| period_start | INTEGER | 周期开始 |
| period_end | INTEGER | 周期结束 |
| content | TEXT | 报告内容 |

## 使用技巧

1. **记录琐事**: "今天开了三个会，晚上要健身，周末要去看爸妈"
   - AI 自动提取任务并分类

2. **查询安排**: "今天有什么安排？"
   - AI 基于数据库回答

3. **主动规划**: "帮我规划一下下周"
   - AI 结合历史习惯给出建议

4. **周期复盘**: 在复盘页面点击生成按钮
   - AI 分析一周/一月的数据，生成报告

## 隐私说明

- 所有数据存储在本地设备（SQLite）
- API Key 仅存储在本地（AsyncStorage）
- 不会上传任何数据到服务器
- 只有 AI 对话内容会发送到配置的 AI 服务商

## 常见问题

### Q: 构建失败，提示 SDK 找不到？
A: 检查 `ANDROID_HOME` 环境变量是否正确配置

### Q: 连接 AI 失败？
A: 检查网络连接，确认 API Key 有效，或尝试切换服务商

### Q: 如何备份数据？
A: 数据存储在 `/data/data/com.lifemanagerapp/databases/LifeManager.db`，可使用 ADB 导出

### Q: 支持 iOS 吗？
A: 当前版本仅支持 Android。iOS 需要 macOS 和 Xcode，可使用相同代码构建

## 技术栈

- **框架**: React Native 0.72
- **导航**: React Navigation 6
- **数据库**: SQLite (react-native-sqlite-storage)
- **状态管理**: React Hooks
- **网络请求**: Axios
- **日期处理**: date-fns
- **UI 图标**: react-native-vector-icons

## License

MIT License - 个人使用，自由修改

---

**开发完成！** 如有问题，请查看日志或提交 Issue。
