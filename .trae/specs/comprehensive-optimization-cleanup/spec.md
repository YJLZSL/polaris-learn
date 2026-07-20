# 项目全面优化与清理 Spec

## Why

灵犀学院项目经过多轮迭代后，积累了以下问题影响长期可维护性：

1. **文档命名混乱**：`docs/` 目录下文档全部使用英文名（`architecture.md`、`frontend-redesign-guide.md`、`mascot-design.md` 等），与项目中文定位不一致，且新加入的中文协作者难以快速定位。
2. **冗余文档堆积**：`.trae/documents/` 与 `docs/` 存在内容重叠的设计文档；`docs/ci-badge-urls.md`、`docs/page-wireframes/README.md` 等部分文档已过时或价值低。
3. **已知技术债未清理**：`AGENTS.md` 明确列出多项技术债（吉祥物双轨实现、手绘图表、手写 Riverpod Provider、ProviderType 枚举与默认值分离等），需逐步消化。
4. **死代码与冗余抽象**：部分文件存在未使用的导入、未调用的私有方法、`.gitkeep` 占位文件但目录已有内容。

本 spec 旨在系统性梳理并清理上述问题，提升项目可读性与可维护性，**不引入新依赖、不改变现有功能行为**。

## What Changes

### 文档清理与中文化
- 将 `docs/` 目录下所有英文名 `.md` 文档重命名为中文名（保留 `design-tokens.json` 等配置文件）
- 评估并合并/删除冗余文档（如 `docs/ci-badge-urls.md`、`.trae/documents/` 下与 `docs/` 重叠的设计文档）
- 更新文档间的相互引用链接（README、AGENTS.md、CONTRIBUTING.md 中指向 docs 的链接）
- **保留**社区约定文件名：`README.md`、`LICENSE`、`AGENTS.md`、`CONTRIBUTING.md`、`CHANGELOG.md`（如存在）

### 代码清理（不改变功能行为）
- 移除空目录中已不必要的 `.gitkeep`（如目录已有实际内容）
- 移除明显的死代码：未使用的 import、未调用的私有方法/字段
- 合并 `MascotPainter`（CustomPainter fallback）与 `RiveMascotWidget` 双轨实现：保留 `RiveMascotWidget` 作为唯一入口，将 `MascotPainter` 内联为加载失败的 fallback，移除独立的 `mascot_painter.dart` 导出（**BREAKING** 仅内部组织变化，无 API 变更）
- 移除 `lib/features/mascot/.gitkeep`、`lib/data/db/.gitkeep`、`lib/data/models/.gitkeep`、`lib/data/repositories/.gitkeep`、`lib/shared/utils/.gitkeep`、`lib/shared/widgets/.gitkeep`、`assets/courses/.gitkeep`、`assets/rive/.gitkeep`、`assets/prompts/.gitkeep` 等冗余占位文件

### 代码风格统一
- 将 `ProviderType` 枚举的 `_defaultBaseUrl` / `_defaultModel` 静态 Map 重构为枚举自身的属性（增强封装性，新增类型时只需改一处）
- 移除 `pubspec.yaml` 中未实际使用的依赖（需先扫描 import 确认）

### 文档同步更新
- 同步更新 `AGENTS.md` 中"目录结构"与"已知技术债"章节
- 同步更新 `README.md` 中"相关文档"链接
- 同步更新 `docs/代码百科.md`（前 CODE_WIKI.md）中的文件路径引用

## Impact

- **Affected specs**: 无（不改变功能行为）
- **Affected code**:
  - `docs/` 目录所有 `.md` 文件
  - `lib/features/mascot/` 模块（双轨合并）
  - `lib/data/models/provider_config.dart`（ProviderType 枚举增强）
  - `AGENTS.md` / `README.md` / `docs/代码百科.md` 中的引用链接
  - `pubspec.yaml`（移除未使用依赖，如确认存在）
- **Affected docs**: 所有 `docs/` 下文档 + `.trae/documents/` 部分文档
- **Risk**: 文档链接失效（需全量更新引用）；mascot 双轨合并若 Rive 资源缺失会导致 fallback 路径变化（需测试覆盖）

## ADDED Requirements

### Requirement: 文档中文化命名规范

项目 `docs/` 目录下所有 Markdown 文档 SHALL 使用中文文件名，命名规则遵循"主题-细分.md"格式（如 `架构设计.md`、`吉祥物设计.md`）。

#### Scenario: 文档重命名
- **WHEN** 协作者浏览 `docs/` 目录
- **THEN** 所有 `.md` 文件名为中文，可直观从文件名判断内容主题
- **AND** 仅 `design-tokens.json` 等配置文件保留英文名
- **AND** `README.md`、`LICENSE`、`AGENTS.md`、`CONTRIBUTING.md` 等社区约定文件保留原英文名

### Requirement: 冗余文档识别与清理

系统 SHALL 在清理前评估每份文档的活跃度（最后修改时间、被引用次数、内容是否过时），对满足以下任一条件的文档执行合并或删除：
1. 内容与另一份文档重叠 ≥ 50%
2. 最后修改时间超过 6 个月且无外部引用
3. 内容已与当前代码实现严重不符（如描述的功能已不存在）

#### Scenario: 冗余文档处理
- **WHEN** 识别到 `docs/ci-badge-urls.md` 仅含 URL 列表且 README 已嵌入徽章
- **THEN** 删除该文档并更新引用
- **WHEN** 识别到 `.trae/documents/lingxi-academy-ui-redesign-plan.md` 与 `docs/前端重设计指南.md` 内容重叠
- **THEN** 保留较新版本，归档或删除另一份

### Requirement: 死代码移除

代码清理 SHALL 移除满足以下条件的代码，且不改变任何公共 API 行为：
1. 未被任何文件 import 的顶层声明
2. 未被任何调用方引用的私有方法/字段（以 `_` 开头）
3. 空目录中已存在实际内容时的 `.gitkeep` 占位文件

#### Scenario: 死代码移除
- **WHEN** 扫描发现某 `_privateMethod` 在文件外不可见且文件内无调用
- **THEN** 移除该方法及其相关注释
- **AND** 运行 `flutter analyze` 确认无新增 warning/error

## MODIFIED Requirements

### Requirement: 吉祥物渲染统一入口

`MascotWidget` SHALL 作为吉祥物渲染的唯一公共入口，内部封装 Rive 加载与 CustomPainter fallback 逻辑，外部调用方不再需要选择具体实现。

#### Scenario: 外部调用
- **WHEN** 任意页面需要展示吉祥物
- **THEN** 仅 import `mascot_widget.dart` 并使用 `MascotWidget`
- **AND** `MascotPainter` 不再作为公共 API 导出，仅在 `MascotWidget` 内部作为 fallback 使用

### Requirement: ProviderType 枚举属性封装

`ProviderType` 枚举 SHALL 直接持有 `defaultBaseUrl` 与 `defaultModel` 属性，移除 `ProviderConfig` 类中的 `_defaultBaseUrl` / `_defaultModel` 静态 Map。

#### Scenario: 新增 Provider 类型
- **WHEN** 未来需要新增一个 Provider 类型（如 DeepSeek）
- **THEN** 只需在 `ProviderType` 枚举中添加一个值，附带 `value` / `displayName` / `defaultBaseUrl` / `defaultModel` 四个属性
- **AND** 无需修改 `ProviderConfig` 类的任何静态 Map

## REMOVED Requirements

### Requirement: MascotPainter 作为独立公共 Widget

**Reason**: 双轨实现导致职责分散，`MascotPainter` 仅作为 Rive 加载失败的 fallback，无需作为独立公共 API。
**Migration**: 将 `MascotPainter` 类标记为 `@internal` 或移至 `mascot_widget.dart` 内部，外部调用方统一使用 `MascotWidget`。

### Requirement: docs/ 目录英文名文档

**Reason**: 项目定位为中文学习者服务，文档英文名增加协作门槛。
**Migration**: 重命名映射如下：
- `architecture.md` → `架构设计.md`
- `frontend-redesign-guide.md` → `前端重设计指南.md`
- `mascot-design.md` → `吉祥物设计.md`
- `ci-badge-urls.md` → 删除（内容并入 README 或直接移除）
- `page-wireframes/README.md` → 评估后保留或删除
- `CODE_WIKI.md` → `代码百科.md`（已生成，需重命名）
