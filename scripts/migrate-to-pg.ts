/**
 * migrate-to-pg.ts
 *
 * 将 SQLite 数据库中的所有数据迁移到 PostgreSQL。
 *
 * 使用前提：
 * 1. 确保 DATABASE_PROVIDER=postgresql 和 DATABASE_URL 已在 .env.local 中配置
 * 2. 确保 PostgreSQL 中已通过 `npx prisma db push` 创建了表结构
 * 3. 运行: npm run db:migrate-pg
 *
 * 注意：此脚本假设目标 PostgreSQL 数据库为空，
 *       如果存在 ID 冲突，将跳过该条记录并打印警告。
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";

// ─── 数据库连接配置 ───────────────────────────────────────
const SQLITE_URL = process.env.SQLITE_URL || "file:./prisma/dev.db";
const PG_URL = process.env.DATABASE_URL;

if (!PG_URL) {
  console.error("错误: 请在 .env.local 中设置 DATABASE_URL (PostgreSQL 连接字符串)");
  process.exit(1);
}

// ─── 创建双数据库客户端 ────────────────────────────────────
const sourceAdapter = new PrismaLibSql({ url: SQLITE_URL });
const targetAdapter = new PrismaPg({ connectionString: PG_URL });

const source = new PrismaClient({ adapter: sourceAdapter } as never);
const target = new PrismaClient({ adapter: targetAdapter } as never);

// ─── 模型列表（按外键依赖顺序排列，父表在前） ─────────────────
interface MigrationStats {
  model: string;
  sourceCount: number;
  migrated: number;
  skipped: number;
  errors: number;
}

const stats: MigrationStats[] = [];

// 辅助：将任意值转为 PostgreSQL 兼容的 JSON 字符串
function _safeStringify(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "[]";
  return JSON.stringify(value);
}

// 辅助：迁移单个模型的全部记录
async function migrateModel(
  modelName: string,
  sourceDelegate: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  targetDelegate: any  // eslint-disable-line @typescript-eslint/no-explicit-any
) {
  const modelStats: MigrationStats = {
    model: modelName,
    sourceCount: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    const records = await sourceDelegate.findMany();
    modelStats.sourceCount = records.length;

    if (records.length === 0) {
      console.log(`  [${modelName}] 源表为空，跳过`);
      stats.push(modelStats);
      return;
    }

    console.log(`  [${modelName}] 迁移 ${records.length} 条记录...`);

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        // 移除 Prisma 可能附加的元数据字段，仅保留数据字段
        const { ...data } = record;

        await targetDelegate.create({ data });
        modelStats.migrated++;
      } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        // P2002 = 唯一约束冲突 (ID 已存在)
        if (error?.code === "P2002" || error?.message?.includes("Unique constraint")) {
          modelStats.skipped++;
          if (i < 5) {
            console.warn(
              `    ⚠ ID 冲突跳过: ${modelName}#${record.id || "unknown"}`
            );
          }
        } else {
          modelStats.errors++;
          console.error(
            `    ✗ 错误 [${modelName}#${record.id}]: ${error?.message || error}`
          );
        }
      }
    }

    console.log(
      `  [${modelName}] 完成: ${modelStats.migrated} 成功, ${modelStats.skipped} 跳过, ${modelStats.errors} 错误`
    );
  } catch (error) {
    console.error(`  [${modelName}] 读取失败: ${error}`);
    modelStats.errors = -1; // 标记为读取失败
  }

  stats.push(modelStats);
}

// ─── 主迁移流程 ────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  SQLite → PostgreSQL 数据迁移工具");
  console.log("═══════════════════════════════════════════");
  console.log(`  源数据库: ${SQLITE_URL}`);
  console.log(`  目标数据库: ${PG_URL!.replace(/\/\/.*@/, "//***@")}`); // 隐藏密码
  console.log("");

  try {
    // 依赖顺序：无外键依赖的表 → 有外键依赖的表
    // 第 0 层：完全独立的表
    await migrateModel("KnowledgePoint", source.knowledgePoint, target.knowledgePoint);
    await migrateModel("Badge", source.badge, target.badge);

    // 第 1 层：仅依赖 User
    await migrateModel("User", source.user, target.user);
    await migrateModel("StudentProfile", source.studentProfile, target.studentProfile);
    await migrateModel("NotificationSettings", source.notificationSettings, target.notificationSettings);

    // 第 2 层：依赖 User + 其他
    await migrateModel("Question", source.question, target.question);
    await migrateModel("Course", source.course, target.course);
    await migrateModel("AIConversation", source.aIConversation, target.aIConversation);
    await migrateModel("StudyGroup", source.studyGroup, target.studyGroup);

    // 第 3 层：依赖上层
    await migrateModel("UserKnowledgeMastery", source.userKnowledgeMastery, target.userKnowledgeMastery);
    await migrateModel("QuestionKnowledge", source.questionKnowledge, target.questionKnowledge);
    await migrateModel("ExamPaper", source.examPaper, target.examPaper);
    await migrateModel("CourseSection", source.courseSection, target.courseSection);
    await migrateModel("UserCourse", source.userCourse, target.userCourse);
    await migrateModel("LearningRecord", source.learningRecord, target.learningRecord);
    await migrateModel("ErrorNote", source.errorNote, target.errorNote);
    await migrateModel("Note", source.note, target.note);
    await migrateModel("LearningPlan", source.learningPlan, target.learningPlan);
    await migrateModel("StudySession", source.studySession, target.studySession);
    await migrateModel("XPRecord", source.xPRecord, target.xPRecord);
    await migrateModel("UserBadge", source.userBadge, target.userBadge);
    await migrateModel("DailyChallenge", source.dailyChallenge, target.dailyChallenge);
    await migrateModel("GroupMember", source.groupMember, target.groupMember);
    await migrateModel("Message", source.message, target.message);
    await migrateModel("PKMatch", source.pKMatch, target.pKMatch);
    await migrateModel("ParentChild", source.parentChild, target.parentChild);
    await migrateModel("SafetyIncident", source.safetyIncident, target.safetyIncident);
    await migrateModel("PhotoSearchRecord", source.photoSearchRecord, target.photoSearchRecord);
    await migrateModel("APIUsageLog", source.aPIUsageLog, target.aPIUsageLog);

    // 第 4 层：最后一批
    await migrateModel("ExamQuestion", source.examQuestion, target.examQuestion);
    await migrateModel("AIDialogueMessage", source.aIDialogueMessage, target.aIDialogueMessage);

    // ─── 汇总报告 ───────────────────────────────────────
    console.log("\n═══════════════════════════════════════════");
    console.log("  迁移完成 - 汇总报告");
    console.log("═══════════════════════════════════════════");

    let _totalSource = 0;
    let totalMigrated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const s of stats) {
      _totalSource += s.sourceCount;
      totalMigrated += Math.max(0, s.migrated);
      totalSkipped += s.skipped;
      totalErrors += Math.max(0, s.errors);
      const status =
        s.errors < 0
          ? "读取失败"
          : s.errors > 0
            ? "有错误"
            : s.skipped > 0
              ? "有跳过"
              : "✓";
      console.log(
        `  ${status.padEnd(10)} ${s.model.padEnd(28)} ${String(s.migrated).padStart(6)} / ${String(s.sourceCount).padStart(6)}`
      );
    }

    console.log("───────────────────────────────────────────");
    console.log(
      `  合计: ${totalMigrated} 迁移, ${totalSkipped} 跳过, ${totalErrors} 错误`
    );
    console.log("═══════════════════════════════════════════");
  } catch (error) {
    console.error("\n迁移过程发生致命错误:", error);
    process.exit(1);
  } finally {
    await source.$disconnect();
    await target.$disconnect();
  }
}

main();
