import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId;
    
    // 从项目根目录读取文件
    // process.cwd() 在Next.js中通常是frontend目录
    // 需要回到上一级目录找到data文件夹
    const filePath = join(process.cwd(), '..', 'data', 'conversation', `conversation_${sessionId}.json`);
    
    console.log('尝试读取文件:', filePath);
    console.log('当前工作目录:', process.cwd());
    
    try {
      const fileContent = await readFile(filePath, 'utf-8');
      const conversationData = JSON.parse(fileContent);
      
      return NextResponse.json({
        message: '获取对话历史成功',
        session_id: sessionId,
        conversation: conversationData
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

