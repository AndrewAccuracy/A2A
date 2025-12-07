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
  conversationDir: string,
  categoryDir: string,
  category: string
): Promise<any> {
  const currentRounds = conversationData.rounds || [];
  const currentRoundCount = currentRounds.length;
  
  // 如果已经达到或超过5轮，直接返回
  if (currentRoundCount >= 5) {
    return conversationData;
  }
  
  console.log(`当前conversation有${currentRoundCount}轮，需要补充到5轮，类别: ${category}`);
  
  try {
    // 读取同类型的所有conversation文件（从类别目录和主目录）
    const categoryFiles = await readdir(categoryDir);
    const categoryJsonFiles = categoryFiles.filter(file => 
      file.endsWith('.json') && 
      file.startsWith('conversation_') &&
      !file.includes('checkpoint') &&
      file !== `conversation_${conversationData.session_id}.json`
    );
    
    // 也尝试从主conversation目录读取
    let mainJsonFiles: string[] = [];
    try {
      const mainFiles = await readdir(conversationDir);
      mainJsonFiles = mainFiles.filter(file => 
        file.endsWith('.json') && 
        file.startsWith('conversation_') &&
        !file.includes('checkpoint') &&
        file !== `conversation_${conversationData.session_id}.json`
      );
    } catch (err) {
      // 如果主目录不存在或无法读取，忽略
    }
    
    // 合并文件列表
    const allJsonFiles = [...categoryJsonFiles, ...mainJsonFiles];
    
    // 随机打乱文件列表
    const shuffledFiles = allJsonFiles.sort(() => Math.random() - 0.5);
    
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
        // 先尝试从类别目录读取
        let otherFilePath = join(categoryDir, file);
        let otherFileContent: string;
        
        try {
          otherFileContent = await readFile(otherFilePath, 'utf-8');
        } catch {
          // 如果类别目录没有，尝试主目录
          otherFilePath = join(conversationDir, file);
          otherFileContent = await readFile(otherFilePath, 'utf-8');
        }
        
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
  context: { params: Promise<{ category: string }> }
) {
  try {
    const { category } = await context.params;
    
    // 验证类别是否有效
    const validCategories = ['art', 'general', 'philosophy'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `无效的类别: ${category}. 有效类别: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }
    
    // 构建文件夹路径
    const categoryDir = join(process.cwd(), '..', 'data', 'conversation', category);
    const conversationDir = join(process.cwd(), '..', 'data', 'conversation');
    
    console.log('尝试读取类别文件夹:', categoryDir);
    console.log('当前工作目录:', process.cwd());
    
    try {
      // 读取文件夹中的所有文件
      const files = await readdir(categoryDir);
      
      // 过滤出JSON文件(排除checkpoint文件)
      const jsonFiles = files.filter(file => 
        file.endsWith('.json') && !file.includes('checkpoint')
      );
      
      if (jsonFiles.length === 0) {
        return NextResponse.json(
          { error: `类别 ${category} 中没有找到对话文件` },
          { status: 404 }
        );
      }
      
      // 随机选择一个文件
      const randomIndex = Math.floor(Math.random() * jsonFiles.length);
      const selectedFile = jsonFiles[randomIndex];
      
      console.log(`从 ${jsonFiles.length} 个文件中随机选择了: ${selectedFile}`);
      
      // 读取选中的文件
      const filePath = join(categoryDir, selectedFile);
      const fileContent = await readFile(filePath, 'utf-8');
      const conversationData = JSON.parse(fileContent);
      
      // 检查并补充conversation到5轮
      const supplementedData = await supplementConversation(conversationData, conversationDir, categoryDir, category);
      
      // 从文件名中提取sessionId (格式: conversation_covert-session-uuid-xxx-yyy.json)
      const sessionIdMatch = selectedFile.match(/conversation_(.+)\.json/);
      const sessionId = sessionIdMatch ? sessionIdMatch[1] : null;
      
      return NextResponse.json({
        message: '随机获取对话成功',
        category: category,
        selected_file: selectedFile,
        session_id: sessionId,
        total_files: jsonFiles.length,
        conversation: supplementedData
      });
    } catch (dirError: any) {
      if (dirError.code === 'ENOENT') {
        return NextResponse.json(
          { error: `类别文件夹 ${category} 不存在` },
          { status: 404 }
        );
      }
      throw dirError;
    }
  } catch (error: any) {
    console.error('随机获取对话失败:', error);
    return NextResponse.json(
      { error: `随机获取对话失败: ${error.message}` },
      { status: 500 }
    );
  }
}

