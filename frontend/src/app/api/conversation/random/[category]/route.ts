import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { supplementConversation, getErrorMessage } from '@/lib/conversation-utils';
import { ConversationData, VALID_CATEGORIES, Category } from '@/lib/types';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ category: string }> }
) {
  try {
    const { category } = await context.params;
    
    // 验证类别是否有效
    if (!VALID_CATEGORIES.includes(category as Category)) {
      return NextResponse.json(
        { error: `无效的类别: ${category}. 有效类别: ${VALID_CATEGORIES.join(', ')}` },
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
      const conversationData: ConversationData = JSON.parse(fileContent);
      
      // 检查并补充conversation到5轮
      const supplementedData = await supplementConversation(conversationData, conversationDir, categoryDir, category as Category);
      
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
    } catch (dirError: unknown) {
      if (dirError && typeof dirError === 'object' && 'code' in dirError && dirError.code === 'ENOENT') {
        return NextResponse.json(
          { error: `类别文件夹 ${category} 不存在` },
          { status: 404 }
        );
      }
      throw dirError;
    }
  } catch (error: unknown) {
    console.error('随机获取对话失败:', error);
    return NextResponse.json(
      { error: `随机获取对话失败: ${getErrorMessage(error)}` },
      { status: 500 }
    );
  }
}

