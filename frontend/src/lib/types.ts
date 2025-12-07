// 类型定义文件

export interface ConversationRound {
  roundNumber: number;
  [key: string]: unknown;
}

export interface SessionInfo {
  topic?: string;
  [key: string]: unknown;
}

export interface ConversationData {
  session_id: string;
  sessionInfo?: SessionInfo;
  rounds?: ConversationRound[];
  [key: string]: unknown;
}

export type Category = 'art' | 'general' | 'philosophy';

export const VALID_CATEGORIES: Category[] = ['art', 'general', 'philosophy'];

