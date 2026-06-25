import { NextResponse } from "next/server";
import packageJson from "../../../../package.json";

const RELEASE_NOTES: Record<string, string> = {
  "2.0.0": "Polaris 品牌重命名 | 全新北极星图标 | Framer Motion 动画增强 | 页面过渡/卡片悬停/列表渐入/数字计数",
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
