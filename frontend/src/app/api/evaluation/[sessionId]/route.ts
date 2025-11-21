import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  context: { params: { sessionId: string } }
) {
  try {
    const sessionId = context.params.sessionId;
    
    // 在三个类别目录中查找对应的evaluation文件
    const categories = ['art', 'general', 'philosophy'];
    const evaluationFileName = `evaluation_conversation_${sessionId}.json.json`;
    
    for (const category of categories) {
      const categoryDir = join(process.cwd(), '..', 'data', 'evaluation', category);
      
      try {
        const files = await readdir(categoryDir);
        
        if (files.includes(evaluationFileName)) {
          const filePath = join(categoryDir, evaluationFileName);
          const fileContent = await readFile(filePath, 'utf-8');
          const evaluationData = JSON.parse(fileContent);
          
          return NextResponse.json({
            message: '获取评估数据成功',
            session_id: sessionId,
            category: category,
            evaluation: evaluationData
          });
        }
      } catch (dirError: any) {
        // 如果目录不存在，继续查找下一个
        if (dirError.code !== 'ENOENT') {
          throw dirError;
        }
      }
    }
    
    // 如果所有目录都没找到
    return NextResponse.json({
      message: '评估数据不存在',
      session_id: sessionId,
      evaluation: null
    }, { status: 404 });
    
  } catch (error: any) {
    console.error('获取评估数据失败:', error);
    return NextResponse.json(
      { error: `获取评估数据失败: ${error.message}` },
      { status: 500 }
    );
  }
}

