/**
 * create-admin.ts
 *
 * 交互式创建/升级管理员账号脚本。
 *
 * 使用方式：
 *   npm run create-admin
 *   （等价于 npx tsx scripts/create-admin.ts）
 *
 * 行为：
 * - 交互式输入 姓名 / 邮箱 / 密码
 * - 若邮箱已存在：将 role 升级为 "admin" 并更新密码
 * - 若邮箱不存在：新建 role="admin" 用户，并创建对应 StudentProfile
 *   （与 src/app/api/auth/register/route.ts 的逻辑保持一致）
 *
 * 注意：此脚本运行在 Node.js 环境，需要先确保已生成 Prisma Client
 *       （npx prisma generate）并配置好 .env / .env.local 中的 DATABASE_URL。
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

async function main() {
  // 动态导入 Prisma（CommonJS 模块），复用应用内已配置好适配器的客户端实例
  const { prisma } = await import("../src/lib/prisma");

  const rl = readline.createInterface({ input, output });

  try {
    console.log("═══════════════════════════════════════════");
    console.log("  管理员账号创建工具");
    console.log("═══════════════════════════════════════════\n");

    const name = (await rl.question("请输入管理员姓名: ")).trim();
    const email = (await rl.question("请输入管理员邮箱: ")).trim().toLowerCase();
    const password = (await rl.question("请输入管理员密码 (至少6位): ")).trim();

    if (!name) {
      throw new Error("姓名不能为空");
    }
    if (!email || !email.includes("@")) {
      throw new Error("请输入有效的邮箱地址");
    }
    if (!password || password.length < 6) {
      throw new Error("密码至少需要6位");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      await prisma.user.update({
        where: { email },
        data: {
          role: "admin",
          password: hashedPassword,
          name,
        },
      });
      console.log(`\n✓ 已将现有用户 ${email} 升级为管理员并更新密码`);
    } else {
      await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "admin",
          studentProfile: {
            create: {
              weakPoints: "[]",
              strongPoints: "[]",
            },
          },
        },
      });
      console.log(`\n✓ 管理员账号创建成功: ${email}`);
    }

    console.log("\n═══════════════════════════════════════════");
    console.log("  完成！请使用该账号登录管理后台: /admin/login");
    console.log("═══════════════════════════════════════════");
  } catch (error) {
    console.error(
      "\n✗ 操作失败:",
      error instanceof Error ? error.message : error
    );
    process.exitCode = 1;
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();
