import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { supplementConversation, getErrorMessage, isValidSessionId } from '@/lib/conversation-utils';
import { ConversationData } from '@/lib/types';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params;
    
    // 验证 sessionId 格式，防止路径遍历攻击
    if (!isValidSessionId(sessionId)) {
      return NextResponse.json(
        { error: '无效的 sessionId 格式' },
        { status: 400 }
      );
    }
    
    // 从项目根目录读取文件
    // process.cwd() 在Next.js中通常是frontend目录
    // 需要回到上一级目录找到data文件夹
    const conversationDir = join(process.cwd(), '..', 'data', 'conversation');
    const filePath = join(conversationDir, `conversation_${sessionId}.json`);
    
    console.log('尝试读取文件:', filePath);
    console.log('当前工作目录:', process.cwd());
    
    try {
      const fileContent = await readFile(filePath, 'utf-8');
      const conversationData: ConversationData = JSON.parse(fileContent);
      
      // 检查并补充conversation到5轮
      const supplementedData = await supplementConversation(conversationData, conversationDir);
      
      return NextResponse.json({
        message: '获取对话历史成功',
        session_id: sessionId,
        conversation: supplementedData
      });
    } catch (fileError: unknown) {
      if (fileError && typeof fileError === 'object' && 'code' in fileError && fileError.code === 'ENOENT') {
        return NextResponse.json({
          message: '对话历史不存在',
          session_id: sessionId,
          conversation: null
        }, { status: 404 });
      }
      throw fileError;
    }
  } catch (error: unknown) {
    console.error('获取对话历史失败:', error);
    return NextResponse.json(
      { error: `获取对话历史失败: ${getErrorMessage(error)}` },
      { status: 500 }
    );
  }
}

