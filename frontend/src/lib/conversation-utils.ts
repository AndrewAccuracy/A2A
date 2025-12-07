// 对话工具函数

import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { ConversationData, Category } from './types';

// 从topic路径提取类别
export function extractCategory(topic: string): Category | null {
  if (topic.includes('art.txt')) return 'art';
  if (topic.includes('general.txt')) return 'general';
  if (topic.includes('philosophy.txt')) return 'philosophy';
  return null;
}

// 补充conversation到5轮
export async function supplementConversation(
  conversationData: ConversationData,
  conversationDir: string,
  categoryDir?: string,
  category?: Category
): Promise<ConversationData> {
  const currentRounds = conversationData.rounds || [];
  const currentRoundCount = currentRounds.length;
  
  // 如果已经达到或超过5轮，直接返回
  if (currentRoundCount >= 5) {
    return conversationData;
  }
  
  // 如果没有提供类别，尝试从sessionInfo中提取
  if (!category) {
    const topic = conversationData.sessionInfo?.topic || '';
    category = extractCategory(topic);
    
    if (!category) {
      console.log('无法从topic提取类别，跳过补充:', topic);
      return conversationData;
    }
  }
  
  console.log(`当前conversation有${currentRoundCount}轮，需要补充到5轮，类别: ${category}`);
  
  try {
    const allJsonFiles: string[] = [];
    
    // 如果提供了类别目录，从类别目录读取
    if (categoryDir) {
      try {
        const categoryFiles = await readdir(categoryDir);
        const categoryJsonFiles = categoryFiles.filter(file => 
          file.endsWith('.json') && 
          file.startsWith('conversation_') &&
          !file.includes('checkpoint') &&
          file !== `conversation_${conversationData.session_id}.json`
        );
        allJsonFiles.push(...categoryJsonFiles);
      } catch (err) {
        // 如果类别目录不存在或无法读取，忽略
        console.warn(`无法读取类别目录 ${categoryDir}:`, err);
      }
    }
    
    // 从主conversation目录读取
    try {
      const mainFiles = await readdir(conversationDir);
      const mainJsonFiles = mainFiles.filter(file => 
        file.endsWith('.json') && 
        file.startsWith('conversation_') &&
        !file.includes('checkpoint') &&
        file !== `conversation_${conversationData.session_id}.json`
      );
      allJsonFiles.push(...mainJsonFiles);
    } catch (err) {
      console.warn(`无法读取主目录 ${conversationDir}:`, err);
    }
    
    // 去重
    const uniqueFiles = Array.from(new Set(allJsonFiles));
    
    // 随机打乱文件列表
    const shuffledFiles = uniqueFiles.sort(() => Math.random() - 0.5);
    
    // 从其他conversation中收集rounds
    const additionalRounds: ConversationRound[] = [];
    const targetRoundCount = 5;
    const neededRounds = targetRoundCount - currentRoundCount;
    
    for (const file of shuffledFiles) {
      // 如果已经达到目标轮数，立即停止
      if (additionalRounds.length >= neededRounds) {
        break;
      }
      
      try {
        // 先尝试从类别目录读取
        let otherFilePath = categoryDir ? join(categoryDir, file) : null;
        let otherFileContent: string;
        
        try {
          if (otherFilePath) {
            otherFileContent = await readFile(otherFilePath, 'utf-8');
          } else {
            otherFilePath = join(conversationDir, file);
            otherFileContent = await readFile(otherFilePath, 'utf-8');
          }
        } catch {
          // 如果类别目录没有，尝试主目录
          otherFilePath = join(conversationDir, file);
          otherFileContent = await readFile(otherFilePath, 'utf-8');
        }
        
        const otherConversation: ConversationData = JSON.parse(otherFileContent);
        
        // 检查是否是同类型
        const otherTopic = otherConversation.sessionInfo?.topic || '';
        const otherCategory = extractCategory(otherTopic);
        
        if (otherCategory === category && otherConversation.rounds && otherConversation.rounds.length > 0) {
          // 计算还需要多少轮
          const remainingNeeded = neededRounds - additionalRounds.length;
          if (remainingNeeded <= 0) {
            break;
          }
          
          // 从其他conversation中提取rounds，只取需要的数量
          const roundsToAdd = otherConversation.rounds.slice(0, remainingNeeded);
          
          // 添加rounds，更新roundNumber
          for (const round of roundsToAdd) {
            // 再次检查是否已达到目标
            if (additionalRounds.length >= neededRounds) {
              break;
            }
            additionalRounds.push({
              ...round,
              roundNumber: currentRoundCount + additionalRounds.length + 1
            });
          }
          
          // 再次检查，如果已达到目标，立即停止
          if (additionalRounds.length >= neededRounds) {
            break;
          }
        }
      } catch (err) {
        console.error(`读取文件 ${file} 失败:`, err);
        continue;
      }
    }
    
    // 补充rounds，确保总数不超过5轮
    if (additionalRounds.length > 0) {
      // 只取前neededRounds个，确保不超过5轮
      const finalAdditionalRounds = additionalRounds.slice(0, neededRounds);
      conversationData.rounds = [...currentRounds, ...finalAdditionalRounds];
      console.log(`成功补充${finalAdditionalRounds.length}轮，现在共有${conversationData.rounds.length}轮`);
    } else {
      console.log('未找到同类型的其他conversation用于补充');
    }
    
    return conversationData;
  } catch (error) {
    console.error('补充conversation时出错:', error);
    return conversationData;
  }
}

// 安全获取错误消息
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return '未知错误';
}

// 验证路径安全性，防止路径遍历攻击
export function sanitizePathSegment(segment: string): string {
  // 移除路径遍历字符
  return segment.replace(/\.\./g, '').replace(/[\/\\]/g, '');
}

// 验证 sessionId 格式
export function isValidSessionId(sessionId: string): boolean {
  // 只允许字母、数字、连字符和下划线
  return /^[a-zA-Z0-9_-]+$/.test(sessionId);
}

