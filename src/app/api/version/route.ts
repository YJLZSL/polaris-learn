import { NextResponse } from "next/server";
import packageJson from "../../../../package.json";

/**
 * GET /api/version
 * 返回当前应用版本与各平台下载地址,供客户端检查更新
 */
export async function GET() {
  return NextResponse.json({
    version: packageJson.version,
    androidUrl: process.env.ANDROID_DOWNLOAD_URL || "",
    electronUrl: process.env.ELECTRON_DOWNLOAD_URL || "",
    notes: "",
  });
}
