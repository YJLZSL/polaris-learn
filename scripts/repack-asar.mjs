// Polaris V2 - Task 1: app.asar 重新打包（恢复）
//
// 删除解压后的 app/ 目录，并将 app.asar.bak 恢复为 app.asar，
// 使 Electron 回到加载 app.asar 的生产模式。
// 同时恢复 app.asar.bak.unpacked 伴随目录（若存在）。
//
// 用法：npm run electron:repack

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const resourcesDir = path.join(projectRoot, "electron-dist", "win-unpacked", "resources");
const asarPath = path.join(resourcesDir, "app.asar");
const asarUnpackedDir = path.join(resourcesDir, "app.asar.unpacked");
const bakPath = path.join(resourcesDir, "app.asar.bak");
const bakUnpackedDir = path.join(resourcesDir, "app.asar.bak.unpacked");
const unpackDir = path.join(resourcesDir, "app");

console.log("[repack-asar] Project root :", projectRoot);
console.log("[repack-asar] Resources dir :", resourcesDir);

// 1. 若 app/ 不存在，则无需 repack
if (!fs.existsSync(unpackDir)) {
  console.log("[repack-asar] 未找到解压目录 app/。");
  console.log("[repack-asar] 无需 repack，当前已处于 packaged 状态。");
  process.exit(0);
}

// 2. 检查 app.asar.bak 是否存在
if (!fs.existsSync(bakPath)) {
  console.error("[repack-asar] app.asar.bak 未找到于", bakPath);
  console.error("[repack-asar] 无法恢复 app.asar。请重新运行 `npm run electron:build`。");
  process.exit(1);
}

// 3. 删除解压目录 app/
console.log("[repack-asar] 删除解压目录 app/");
fs.rmSync(unpackDir, { recursive: true, force: true });

// 4. 恢复 app.asar.bak -> app.asar
console.log("[repack-asar] 恢复 app.asar.bak -> app.asar");
fs.renameSync(bakPath, asarPath);

// 5. 恢复 app.asar.bak.unpacked -> app.asar.unpacked（若存在）
if (fs.existsSync(bakUnpackedDir)) {
  console.log("[repack-asar] 恢复 app.asar.bak.unpacked -> app.asar.unpacked");
  fs.renameSync(bakUnpackedDir, asarUnpackedDir);
}

console.log("[repack-asar] 完成。app.asar 已恢复于:", asarPath);
