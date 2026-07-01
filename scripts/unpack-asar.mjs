// Polaris V2 - Task 1: app.asar 解压调试模式
//
// 将生产构建产物 app.asar 解压为同名 app/ 目录，并备份原 asar 文件，
// 以便 Electron 在启动时优先加载解压后的 app/ 目录，实现生产/测试环境隔离。
//
// 解压策略：
//   1. 优先使用推荐的 `npx @electron/asar extract`（标准方式，适用于完整构建产物）
//   2. 若标准方式失败（例如 app.asar.unpacked 伴随目录缺失），回退到逐文件容忍解压，
//      跳过缺失的 unpacked 文件（通常为 Capacitor 等 Electron 运行时不使用的依赖）。
//
// 用法：npm run electron:unpack

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

// Windows 上杀毒/索引器可能短暂锁定文件，导致 rename/rm 报 EBUSY/EPERM，重试即可。
const RETRY_CODES = new Set(["EBUSY", "EPERM", "ENOTEMPTY", "EACCES"]);
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
async function retryFn(label, fn) {
  let lastErr;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!RETRY_CODES.has(err.code)) throw err;
      console.warn(`[unpack-asar] ${label} 被占用（${err.code}），重试 ${attempt}/6...`);
      await sleep(400 * attempt);
    }
  }
  throw lastErr;
}
const rm = (p) => retryFn(`rm "${p}"`, () => fs.promises.rm(p, { recursive: true, force: true }));
const rename = (from, to) => retryFn(`rename "${from}" -> "${to}"`, () => fs.promises.rename(from, to));

const resourcesDir = path.join(projectRoot, "electron-dist", "win-unpacked", "resources");
const asarPath = path.join(resourcesDir, "app.asar");
const asarUnpackedDir = path.join(resourcesDir, "app.asar.unpacked");
const bakPath = path.join(resourcesDir, "app.asar.bak");
const bakUnpackedDir = path.join(resourcesDir, "app.asar.bak.unpacked");
const unpackDir = path.join(resourcesDir, "app");

console.log("[unpack-asar] Project root :", projectRoot);
console.log("[unpack-asar] Resources dir :", resourcesDir);

// 1. 检查 electron-dist 是否存在（友好提示）
if (!fs.existsSync(resourcesDir)) {
  console.error("[unpack-asar] ERROR: electron-dist/win-unpacked/resources 未找到。");
  console.error("[unpack-asar] 请先运行 `npm run electron:build` 生成生产构建产物。");
  process.exit(1);
}

// 2. 检查 app.asar 是否存在
if (!fs.existsSync(asarPath)) {
  if (fs.existsSync(bakPath)) {
    console.error("[unpack-asar] app.asar 不存在，但 app.asar.bak 已存在。当前已处于解压状态。");
    console.error("[unpack-asar] 请先运行 `npm run electron:repack` 恢复 app.asar。");
  } else {
    console.error("[unpack-asar] ERROR: app.asar 未找到于", asarPath);
  }
  process.exit(1);
}

// 3. 检查是否已存在备份（避免覆盖）
if (fs.existsSync(bakPath)) {
  console.error("[unpack-asar] app.asar.bak 已存在于", bakPath);
  console.error("[unpack-asar] 当前似乎已解压。请先运行 `npm run electron:repack` 恢复后再解压。");
  process.exit(1);
}

// 4. 清理可能残留的 app/ 目录（来自上次失败的解压）
if (fs.existsSync(unpackDir)) {
  console.log("[unpack-asar] 清理残留的 app/ 目录");
  await rm(unpackDir);
}

// 5. 备份 app.asar -> app.asar.bak（同时备份 app.asar.unpacked 伴随目录，若存在）
console.log("[unpack-asar] 备份 app.asar -> app.asar.bak");
await rename(asarPath, bakPath);
if (fs.existsSync(asarUnpackedDir)) {
  console.log("[unpack-asar] 备份 app.asar.unpacked -> app.asar.bak.unpacked");
  await rename(asarUnpackedDir, bakUnpackedDir);
}

// 6. 解压
let extracted = false;
let lastError = null;

// 6a. 优先使用推荐的 npx @electron/asar extract（输出静默，失败时回退）
console.log("[unpack-asar] 解压 app.asar.bak -> app/ (标准方式)");
try {
  execSync(`npx --yes @electron/asar extract "${bakPath}" "${unpackDir}"`, {
    stdio: "pipe",
    cwd: projectRoot,
  });
  extracted = true;
  console.log("[unpack-asar] 标准解压成功。");
} catch (err) {
  lastError = err;
  console.warn("[unpack-asar] 标准解压失败（可能因 app.asar.unpacked 伴随目录缺失）。");
  console.warn("[unpack-asar] 切换到容忍缺失 unpacked 文件的逐文件解压方式...");
}

// 6b. 回退：逐文件解压，跳过缺失的 unpacked 文件
if (!extracted) {
  // 清理标准解压可能留下的半成品
  if (fs.existsSync(unpackDir)) {
    await rm(unpackDir);
  }
  let asarApi;
  try {
    asarApi = require("@electron/asar");
  } catch (_reqErr) {
    console.error("[unpack-asar] 无法加载 @electron/asar 模块。请先安装：npm install -D @electron/asar");
    await restoreBackupAndExit();
  }

  try {
    const { header } = asarApi.getRawHeader(bakPath);
    let total = 0;
    let written = 0;
    let skipped = 0;
    const skippedSamples = [];

    function walk(node, rel) {
      for (const [name, entry] of Object.entries(node.files)) {
        const relPath = rel ? `${rel}/${name}` : name;
        if (entry.files) {
          walk(entry, relPath);
          continue;
        }
        total++;
        const dest = path.join(unpackDir, ...relPath.split("/"));
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        try {
          const buf = asarApi.extractFile(bakPath, relPath);
          fs.writeFileSync(dest, buf);
          written++;
        } catch (e) {
          if (entry.unpacked) {
            skipped++;
            if (skippedSamples.length < 5) skippedSamples.push(relPath);
          } else {
            throw e; // packed 文件解压失败属于真实错误
          }
        }
      }
    }

    walk(header, "");
    console.log(`[unpack-asar] 容忍解压完成: 共 ${total} 个文件, 写入 ${written}, 跳过 ${skipped}`);
    if (skipped > 0) {
      console.warn(`[unpack-asar] 注意: ${skipped} 个 unpacked 文件缺失被跳过（通常为 Capacitor 等 Electron 不使用的依赖）。`);
      console.warn("[unpack-asar] 跳过示例:", skippedSamples.join(", "));
    }
    extracted = true;
  } catch (err2) {
    lastError = err2;
  }
}

// 7. 失败则恢复备份
if (!extracted) {
  console.error("[unpack-asar] 解压失败，正在恢复 app.asar 备份...");
  if (fs.existsSync(unpackDir)) await rm(unpackDir);
  await rename(bakPath, asarPath);
  if (fs.existsSync(bakUnpackedDir)) await rename(bakUnpackedDir, asarUnpackedDir);
  if (lastError) console.error(lastError);
  process.exit(1);
}

console.log("[unpack-asar] 完成。已解压到:", unpackDir);
console.log("[unpack-asar] 恢复请运行: npm run electron:repack");

async function restoreBackupAndExit() {
  try {
    if (fs.existsSync(unpackDir)) await rm(unpackDir);
    if (fs.existsSync(bakPath)) await rename(bakPath, asarPath);
    if (fs.existsSync(bakUnpackedDir)) await rename(bakUnpackedDir, asarUnpackedDir);
  } catch {
    // 忽略
  }
  process.exit(1);
}
