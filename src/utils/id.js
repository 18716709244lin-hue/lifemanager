// 生成本地唯一 ID。
// 不要使用 uuid 包：它的浏览器构建依赖 crypto.getRandomValues，
// React Native 运行时不提供该 API，会在保存消息/任务时直接抛异常。
export const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
