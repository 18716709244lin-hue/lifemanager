import axios from 'axios';
import {getApiKey, getAiProvider, getAiModel} from './StorageService';

// AI 服务商配置
const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
    formatRequest: (messages, model) => ({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
    parseResponse: (data) => data.choices[0].message.content,
  },
  claude: {
    name: 'Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-haiku-20240307',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
    headers: (apiKey) => ({
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    }),
    formatRequest: (messages, model) => ({
      model,
      max_tokens: 2000,
      messages: messages.filter(m => m.role !== 'system'),
      system: messages.find(m => m.role === 'system')?.content || '',
    }),
    parseResponse: (data) => data.content[0].text,
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
    formatRequest: (messages, model) => ({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
    parseResponse: (data) => data.choices[0].message.content,
  },
  zhipu: {
    name: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-flash',
    models: ['glm-4-flash', 'glm-4-air', 'glm-4-plus'],
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
    formatRequest: (messages, model) => ({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
    parseResponse: (data) => data.choices[0].message.content,
  },
  qwen: {
    name: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
    defaultModel: 'qwen-plus',
    models: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
    formatRequest: (messages, model) => ({
      model,
      input: {messages},
      parameters: {
        temperature: 0.7,
        max_tokens: 2000,
      },
    }),
    parseResponse: (data) => data.output.choices[0].message.content,
  },
};

// 系统提示词
const SYSTEM_PROMPT = `你是一个智能生活管家AI助手。你的任务是帮助用户管理日常生活、规划行程、整理琐事。

核心能力：
1. 理解用户输入的琐事、任务、想法
2. 自动分类（工作/生活/健康/学习/社交/财务/其他）
3. 识别任务之间的关系（依赖、冲突、相关）
4. 提供可行的建议和规划
5. 记住用户的习惯和偏好
6. 记住朋友/家人的生日，并在生日前几天主动提醒
7. 用户给出任务时，主动给出可执行方案，并提出能引发思考的问题，同时指出计划风险

回复格式要求：
- 如果是记录类输入，确认已记录并给出分类建议
- 如果是查询类输入，基于已有信息回答
- 如果是规划类输入，给出具体的步骤和建议
- 主动发现任务间的关联，提醒用户

语气：友好、专业、 proactive（主动提供帮助）`;

// 发送消息到 AI
export const sendMessageToAI = async (userMessage, conversationHistory = []) => {
  const apiKey = await getApiKey();
  const provider = await getAiProvider();
  const model = await getAiModel();

  if (!apiKey) {
    throw new Error('请先配置 API Key');
  }

  const config = PROVIDERS[provider];
  if (!config) {
    throw new Error('不支持的 AI 服务商');
  }

  const selectedModel = model || config.defaultModel;

  // 构建消息历史
  const messages = [
    {role: 'system', content: SYSTEM_PROMPT},
    ...conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    })),
    {role: 'user', content: userMessage},
  ];

  try {
    const response = await axios.post(
      `${config.baseUrl}/chat/completions`,
      config.formatRequest(messages, selectedModel),
      {
        headers: config.headers(apiKey),
        timeout: 60000,
      },
    );

    return config.parseResponse(response.data);
  } catch (error) {
    console.error('AI API Error:', error.response?.data || error.message);
    if (error.response) {
      const status = error.response.status;
      let detail = '';
      try {
        detail = (typeof error.response.data === 'string'
          ? error.response.data
          : JSON.stringify(error.response.data || {})
        ).slice(0, 200);
      } catch (e) {}
      if (status === 401) {
        throw new Error(`API Key 无效或服务商选择错误 (HTTP 401)。${detail}`);
      } else if (status === 429) {
        throw new Error(`调用次数超限或余额不足 (HTTP 429)。${detail}`);
      }
      throw new Error(`HTTP ${status}: ${detail}`);
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('请求超时，请检查网络连接');
    }
    throw new Error(`网络错误: ${error.message}`);
  }
};

// 分析文本并提取结构化信息
export const analyzeText = async (text) => {
  const apiKey = await getApiKey();
  const provider = await getAiProvider();
  const model = await getAiModel();

  const config = PROVIDERS[provider];
  const selectedModel = model || config.defaultModel;

  const analysisPrompt = `分析以下文本，提取结构化信息：

文本：${text}

请以 JSON 格式返回：
{
  "category": "分类（工作/生活/健康/学习/社交/财务/其他）",
  "tasks": [
    {
      "title": "任务标题",
      "description": "任务描述",
      "due_date": "截止日期（ISO格式或null）",
      "priority": "优先级（high/medium/low）",
      "plan_steps": ["可执行的具体步骤1", "步骤2"],
      "questions": ["引发用户思考的问题1", "问题2"],
      "risks": ["该计划可能的风险1", "风险2"]
    }
  ],
  "birthdays": [
    {
      "name": "寿星姓名",
      "month": 月份数字,
      "day": 日期数字,
      "year": 出生年份数字或null,
      "relation": "与用户的关系（如：母亲/大学同学/同事）"
    }
  ],
  "keywords": ["关键词1", "关键词2"],
  "sentiment": "情感倾向（positive/neutral/negative）",
  "related_topics": ["相关主题1", "相关主题2"]
}

注意：
- 如果文本没有提到生日，birthdays 返回空数组
- 如果文本没有明确任务，tasks 可返回空数组
- 只返回 JSON，不要其他内容`;

  const messages = [
    {role: 'system', content: '你是一个文本分析专家，擅长提取结构化信息。只返回JSON，不要其他内容。'},
    {role: 'user', content: analysisPrompt},
  ];

  try {
    const response = await axios.post(
      `${config.baseUrl}/chat/completions`,
      config.formatRequest(messages, selectedModel),
      {
        headers: config.headers(apiKey),
        timeout: 30000,
      },
    );

    const content = config.parseResponse(response.data);
    // 提取JSON部分
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error('Analysis Error:', error);
    return null;
  }
};

// 生成复盘报告
export const generateReview = async (type, data) => {
  const apiKey = await getApiKey();
  const provider = await getAiProvider();
  const model = await getAiModel();

  const config = PROVIDERS[provider];
  const selectedModel = model || config.defaultModel;

  const reviewPrompt = type === 'weekly'
    ? `基于以下数据生成本周复盘报告：\n\n${JSON.stringify(data, null, 2)}\n\n请包括：\n1. 本周完成事项总结\n2. 时间分布分析\n3. 未完成任务分析\n4. 下周建议\n5. 习惯洞察`
    : `基于以下数据生成本月复盘报告：\n\n${JSON.stringify(data, null, 2)}\n\n请包括：\n1. 本月成就总结\n2. 各领域投入分析\n3. 目标完成情况\n4. 改进建议\n5. 下月规划建议`;

  const messages = [
    {role: 'system', content: '你是一个专业的复盘分析师，擅长从数据中发现模式和洞察。'},
    {role: 'user', content: reviewPrompt},
  ];

  try {
    const response = await axios.post(
      `${config.baseUrl}/chat/completions`,
      config.formatRequest(messages, selectedModel),
      {
        headers: config.headers(apiKey),
        timeout: 60000,
      },
    );

    return config.parseResponse(response.data);
  } catch (error) {
    console.error('Review Generation Error:', error);
    throw error;
  }
};

// 生成生日礼物与行程建议
export const generateBirthdayAdvice = async (birthday) => {
  const apiKey = await getApiKey();
  const provider = await getAiProvider();
  const model = await getAiModel();

  const config = PROVIDERS[provider];
  const selectedModel = model || config.defaultModel;

  const daysLeft = birthday.daysLeft;

  const prompt = `为下面这位朋友的生日准备建议：

姓名：${birthday.name}
关系：${birthday.relation || '未说明'}
生日：${birthday.month}月${birthday.day}日
距离生日还有：${daysLeft}天
${birthday.notes ? `备注：${birthday.notes}` : ''}

请给出：
1. 3 个适合这段关系的礼物建议（说明理由和大致预算）
2. 2 个生日当天的行程/庆祝安排建议
3. 一句可以直接发送的祝福语

语气亲切、具体、可执行。`;

  const messages = [
    {
      role: 'system',
      content: '你是一个贴心的人情往来顾问，擅长根据关系亲疏给出合适的礼物与庆祝建议。',
    },
    {role: 'user', content: prompt},
  ];

  try {
    const response = await axios.post(
      `${config.baseUrl}/chat/completions`,
      config.formatRequest(messages, selectedModel),
      {
        headers: config.headers(apiKey),
        timeout: 60000,
      },
    );
    return config.parseResponse(response.data);
  } catch (error) {
    console.error('Birthday Advice Error:', error);
    throw new Error(`生成建议失败: ${error.message}`);
  }
};

// 获取可用模型列表（同步函数，UI 直接调用）
export const getAvailableModels = (provider) => {
  const config = PROVIDERS[provider];
  return config ? config.models : [];
};

// 获取服务商列表
export const getProviders = () => {
  return Object.entries(PROVIDERS).map(([key, value]) => ({
    id: key,
    name: value.name,
    defaultModel: value.defaultModel,
  }));
};
