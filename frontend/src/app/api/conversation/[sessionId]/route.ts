import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

// 从topic路径提取类别
function extractCategory(topic: string): string | null {
  if (topic.includes('art.txt')) return 'art';
  if (topic.includes('general.txt')) return 'general';
  if (topic.includes('philosophy.txt')) return 'philosophy';
  return null;
}

// 补充conversation到5轮
async function supplementConversation(
  conversationData: any,
  conversationDir: string
): Promise<any> {
  const currentRounds = conversationData.rounds || [];
  const currentRoundCount = currentRounds.length;
  
  // 如果已经达到或超过5轮，直接返回
  if (currentRoundCount >= 5) {
    return conversationData;
  }
  
  // 从sessionInfo中提取类别
  const topic = conversationData.sessionInfo?.topic || '';
  const category = extractCategory(topic);
  
  if (!category) {
    console.log('无法从topic提取类别，跳过补充:', topic);
    return conversationData;
  }
  
  console.log(`当前conversation有${currentRoundCount}轮，需要补充到5轮，类别: ${category}`);
  
  try {
    // 读取同类型的所有conversation文件
    const files = await readdir(conversationDir);
    const jsonFiles = files.filter(file => 
      file.endsWith('.json') && 
      file.startsWith('conversation_') &&
      file !== `conversation_${conversationData.session_id}.json`
    );
    
    // 随机打乱文件列表
    const shuffledFiles = jsonFiles.sort(() => Math.random() - 0.5);
    
    // 从其他conversation中收集rounds
    const additionalRounds: any[] = [];
    const targetRoundCount = 5;
    const neededRounds = targetRoundCount - currentRoundCount;
    
    for (const file of shuffledFiles) {
      // 如果已经达到目标轮数，立即停止
      if (additionalRounds.length >= neededRounds) {
        break;
      }
      
      try {
        const otherFilePath = join(conversationDir, file);
        const otherFileContent = await readFile(otherFilePath, 'utf-8');
        const otherConversation = JSON.parse(otherFileContent);
        
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
          roundsToAdd.forEach((round: any, index: number) => {
            // 再次检查是否已达到目标
            if (additionalRounds.length >= neededRounds) {
              return;
            }
            additionalRounds.push({
              ...round,
              roundNumber: currentRoundCount + additionalRounds.length + 1
            });
          });
          
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params;
    
    // 从项目根目录读取文件
    // process.cwd() 在Next.js中通常是frontend目录
    // 需要回到上一级目录找到data文件夹
    const conversationDir = join(process.cwd(), '..', 'data', 'conversation');
    const filePath = join(conversationDir, `conversation_${sessionId}.json`);
    
    console.log('尝试读取文件:', filePath);
    console.log('当前工作目录:', process.cwd());
    
    try {
      const fileContent = await readFile(filePath, 'utf-8');
      const conversationData = JSON.parse(fileContent);
      
      // 检查并补充conversation到5轮
      const supplementedData = await supplementConversation(conversationData, conversationDir);
      
      return NextResponse.json({
        message: '获取对话历史成功',
        session_id: sessionId,
        conversation: supplementedData
      });
    } catch (fileError: any) {
      if (fileError.code === 'ENOENT') {
        return NextResponse.json({
          message: '对话历史不存在',
          session_id: sessionId,
          conversation: null
        }, { status: 404 });
      }
      throw fileError;
    }
  } catch (error: any) {
    console.error('获取对话历史失败:', error);
    return NextResponse.json(
      { error: `获取对话历史失败: ${error.message}` },
      { status: 500 }
    );
  }
}

