import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

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
    const categoryDir = join(process.cwd(), '..', 'data', 'evaluation', category);
    
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
          { error: `类别 ${category} 中没有找到评估文件` },
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
      const evaluationData = JSON.parse(fileContent);
      
      // 从文件名中提取sessionId (格式: evaluation_conversation_covert-session-uuid-xxx-yyy.json.json)
      const sessionIdMatch = selectedFile.match(/evaluation_conversation_(.+)\.json\.json/);
      const sessionId = sessionIdMatch ? sessionIdMatch[1] : null;
      
      return NextResponse.json({
        message: '随机获取评估成功',
        category: category,
        selected_file: selectedFile,
        session_id: sessionId,
        total_files: jsonFiles.length,
        evaluation: evaluationData
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
    console.error('随机获取评估失败:', error);
    return NextResponse.json(
      { error: `随机获取评估失败: ${error.message}` },
      { status: 500 }
    );
  }
}

