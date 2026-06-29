import { NextResponse } from "next/server";
import packageJson from "../../../../package.json";

const RELEASE_NOTES: Record<string, string> = {
  "2.0.0": "Polaris 品牌重命名 | 全新北极星图标 | Framer Motion 动画增强 | 页面过渡/卡片悬停/列表渐入/数字计数",
  "2.1.0": "5 种学习模式系统（幼儿园/小学/初高中/大学生/上班族）| AI 苏格拉底 prompt 模式分层 | 学科/难度按模式过滤 | 模式切换 UI | 上班族紧凑布局与微学习入口 | 排行榜可隐藏 | 侧边栏死链修复 | 真实密码修改 API",
};

/**
 * GET /api/version
 * 返回当前应用版本与各平台下载地址,供客户端检查更新
 */
export async function GET() {
  return NextResponse.json({
    version: packageJson.version,
    androidUrl: process.env.ANDROID_DOWNLOAD_URL || "",
    electronUrl: process.env.ELECTRON_DOWNLOAD_URL || "",
    notes: RELEASE_NOTES[packageJson.version] || "",
  });
}
