# 灵犀学院 吉祥物设计文档

> 本文档描述灵犀学院吉祥物"小犀"的角色设定、6 状态机、当前实现、Rive 升级方案、交互设计与尺寸配色规范。
>
> **实现位置**：`lib/features/mascot/`
>
> **最后更新**：2026-07-11

---

## 目录

- [一、吉祥物设定](#一吉祥物设定)
- [二、6 状态机](#二6-状态机)
- [三、当前实现](#三当前实现)
- [四、升级方案：Rive 矢量+骨骼动画](#四升级方案rive-矢量骨骼动画)
- [五、交互设计](#五交互设计)
- [六、尺寸规范](#六尺寸规范)
- [七、配色](#七配色)

---

## 一、吉祥物设定

### 基本信息

- **名字**：小犀
- **物种**：星空小犀牛
- **性别**：中性（无明显性别特征）
- **名字由来**：取自"心有灵犀一点通"，寓意学习中的灵光乍现——当引导到位时，学习者能自然领悟。

### 外观

小犀是一只萌系圆润的星空小犀牛，具体外观特征：

| 部位 | 描述 |
|------|------|
| **身体** | 灰紫色渐变（顶部 `#7C4DFF` → 底部 `#B39DDB`），大头小身体萌系比例（头部约占整体 55-60%） |
| **学士帽** | 菱形帽板（黑色 `#1C1B2E`）+ 帽箍 + 帽钮 + 金色流苏（`#FFD54F`），始终佩戴 |
| **星光翅膀** | 左右各一，半透明白色（填充 `#59FFFFFF` + 描边 `#99FFFFFF`），羽毛风格，可独立扇动 |
| **头顶小犀角** | 白→紫渐变三角形，角尖带星光 |
| **星光装饰** | 身体上 3 颗小星星（闪烁）+ 角尖 1 颗星星 + 环绕 7 颗 ambient 星星 |
| **表情** | 圆润大眼 + 各种形态的嘴巴，配腮红（部分状态无） |

### 性格

- **好奇**：对一切新知识充满兴趣，总是歪着头打量
- **温柔**：语气温和，从不说教，像朋友一样陪伴
- **鼓励性**：用户答错时不批评，而是用好奇的姿态引导重新思考

### 设计理念

小犀的设计融合了三个意象：

1. **犀牛** —— 坚韧、踏实的象征，寓意学习需要持之以恒
2. **学士帽** —— 学术与知识的象征，点明"学院"主题
3. **星光翅膀** —— 想象力与可能性的象征，寓意 AI 时代学习让思维起飞

---

## 二、6 状态机

小犀拥有 6 种情绪状态，由 `MascotMood` 枚举定义（`lib/features/mascot/mascot_state.dart`）。每种状态对应独立的表情、动画与附加元素。

### 状态总览

| 状态 | 枚举值 | 含义 | 动画时长 | 恢复到 |
|------|--------|------|----------|--------|
| 待机 | `idle` | 默认状态，轻微呼吸 | 3s 循环 | — |
| 开心 | `happy` | 开心，挥手跳跃 | 1s 循环 | idle（1.5s 后） |
| 思考 | `thinking` | 思考，AI 响应中 | 4s 循环 | celebrate / sad |
| 难过 | `sad` | 难过，出错时 | 3s 循环 | idle（3s 后） |
| 庆祝 | `celebrate` | 庆祝，完成知识点 | 2s 循环 | idle（3s 后） |
| 好奇 | `curious` | 好奇，引导用户 | 3s 循环 | idle（1.5s 后） |

### 各状态详细规格

#### idle（待机）

- **姿势**：轻微上下浮动 `sin(2πt) × 0.015s`
- **表情**：半开眼 + 轻微微笑弧 + 周期性眨眼（0.5-0.58 区间闭眼）
- **附加元素**：腮红 + 常驻星光
- **动画曲线**：`sin(2πt)`
- **触发场景**：默认状态，或其余状态超时恢复后

#### happy（开心）

- **姿势**：抛物线跳跃 `0 → 8%s → 0`，公式 `4t(1-t)`
- **表情**：`^_^` 弯眼 + 张嘴微笑 + 舌头
- **附加元素**：翅膀大幅扇动（幅度 0.28）+ 腮红
- **动画曲线**：抛物线 `4t(1-t)`
- **触发场景**：用户点击吉祥物 / Streak ≥ 3 / 测验答对

#### thinking（思考）

- **姿势**：整体静止 + 头部点头
- **表情**：左眼上看 + 右眼微闭 + `o` 型小嘴
- **附加元素**：头顶问号（跟随头部移动）
- **动画曲线**：`(1-cos(2πt))/2`
- **触发场景**：AI 流式响应中（`setAiThinking(true)`）

#### sad（难过）

- **姿势**：下沉 `1.2%s`
- **表情**：下垂眼 + 皱眉（内外高低）+ 倒弧嘴
- **附加元素**：泪滴下滴（`sin` 周期）+ 无腮红
- **动画曲线**：静态偏移
- **触发场景**：AI 出错（`setMood(MascotMood.sad)`）

#### celebrate（庆祝）

- **姿势**：跳跃 + 缩放（`1 + 5%sin`）+ 旋转（`πt`）
- **表情**：星形眼 + 大张嘴 + 舌头
- **附加元素**：10-16 粒撒花（5 色旋转：`#FFE082` / `#FF8A95` / `#81D4FA` / `#B39DDB` / `#FFAB91`）+ 翅膀最大扇动（幅度 0.32）
- **动画曲线**：`(1-cos(2πt))/2` 跳跃 + `sin` 缩放
- **触发场景**：AI 完成回复 / 完成知识点 / 连点 5 次彩蛋

#### curious（好奇）

- **姿势**：轻微浮动 + 歪头（`0.12 + 0.04sin`）
- **表情**：左小右大眼 + `?` 型小嘴
- **附加元素**：右侧放大镜 + 腮红
- **动画曲线**：`sin(2πt)` 浮动 + `0.12+0.04sin` 歪头
- **触发场景**：进入新页面（预留） / 测验答错

### 状态转换规则

```
                    ┌──────────┐
        ┌───────────│   idle   │◀───────────┐
        │           │ (待机)    │            │
        │           └────┬─────┘            │
        │                │                  │
        │   用户点击      │ AI 思考开始       │ 超时/恢复
        │ (triggerTap)   │ (setAiThinking)  │
        │                ▼                  │
        ▼          ┌──────────┐             │
   ┌────────┐     │ thinking │             │
   │ happy  │     │ (思考)    │             │
   │ (开心)  │     └────┬─────┘             │
   └───┬────┘          │                   │
       │               │ 流式完成 / 出错     │
       │ 1.5s 后恢复    ▼                   │
       │          ┌──────────┐  ┌──────────┐│
       │          │celebrate │  │   sad    ││
       └─────────▶│ (庆祝)    │  │ (难过)    ││
                  └────┬─────┘  └────┬─────┘│
                       │             │      │
                       │ 3s 后恢复    │ 3s 后恢复
                       └─────────────┴──────┘
                                       │
                              ┌────────┘
                              ▼
                    ┌──────────┐
                    │ curious  │
                    │ (好奇)    │
                    └──────────┘
```

---

## 三、当前实现

当前吉祥物使用 **CustomPainter 矢量绘制**作为实现方案，定义在 `lib/features/mascot/mascot_painter.dart`。

### 实现文件清单

| 文件 | 职责 |
|------|------|
| `mascot_state.dart` | `MascotMood` 枚举（6 状态）+ `MascotState` 值对象（mood / isAnimating / tapCount） |
| `mascot_controller.dart` | `StateNotifier<MascotState>` 全局控制器，方法：`setMood` / `setAiThinking` / `triggerTap` / `celebrate` / `reset` |
| `mascot_painter.dart` | `CustomPainter` 纯矢量绘制，使用 `Path` / `drawCircle` / `drawOval` / `drawArc` |
| `mascot_widget.dart` | 吉祥物 Widget，`AnimationController.repeat()` 驱动动画，处理点击交互与彩蛋 |
| `mascot_overlay.dart` | AI 思考态时的悬浮层，在右下角显示 80px thinking 小犀 |
| `rive_mascot_widget.dart` | Rive 吉祥物预留接口，当前返回空 `SizedBox` |

### 动画驱动方式

- `AnimationController.repeat()` 循环播放
- `animationValue`（0.0-1.0）驱动所有动画偏移
- 不同 mood 对应不同 `duration`（idle 3s / happy 1s / thinking 4s / sad 3s / celebrate 2s / curious 3s）
- 切换 mood 时重新设置 `duration` 并 `forward()`

### 当前实现的局限

1. **无骨骼动画** —— 所有动画通过整体 transform（平移/缩放/旋转）实现，身体各部位无法独立运动
2. **表情简单** —— 每种 mood 仅一套固定表情，无过渡形变
3. **无声效** —— 点击/庆祝无声效反馈
4. **矢量绘制性能** —— 每帧重建 Paint 对象（渐变/描边）
5. **彩蛋单一** —— 仅"连点 5 次"一种彩蛋
6. **尺寸适配** —— 小尺寸（40px AppBar）时细节模糊

---

## 四、升级方案：Rive 矢量+骨骼动画

目标方案是使用 **Rive** 实现骨骼动画+形变+状态机过渡，已有 `rive_mascot_widget.dart` 预留接口。

### Rive Editor 设计流程

1. **创建项目**：在 [Rive Editor](https://rive.app) 中创建新项目，画布 400×400
2. **导入矢量路径**：从 `MascotPainter` 的 Path 数据转换为 Rive 矢量形状（可从 SVG 转换或手动重绘）
3. **建立骨骼系统**：
   ```
   root
   └── body
       ├── head
       │   ├── eyes (left / right)
       │   ├── mouth
       │   ├── horn (小犀角)
       │   └── cap (学士帽)
       ├── leftWing
       └── rightWing
   ```
4. **绑定网格**：将矢量形状绑定到对应骨骼
5. **创建 6 个动画状态**：每个状态一个时间轴，定义骨骼关键帧 + 形变 + 混合模式
6. **创建状态机**：定义 6 个状态节点 + 过渡线（blend duration 300ms）+ 输入参数

### 状态机输入参数

| 参数类型 | 名称 | 说明 |
|----------|------|------|
| `SMIInput<String>` | `mood` | 当前情绪：`idle` / `happy` / `thinking` / `sad` / `celebrate` / `curious` |
| `SMIInput<bool>` | `isTap` | 点击触发（true 时切换到 happy） |
| `SMITrigger` | `celebrate` | 庆祝彩蛋触发（一次性触发） |
| `SMIInput<bool>` | `extraSparkle` | 额外星光（彩蛋时开启） |

### 导出 .riv 文件

- **格式**：`.riv`
- **文件名**：`mascot.riv`
- **放置位置**：`assets/rive/mascot.riv`
- **大小目标**：< 500KB
- **pubspec.yaml 声明**：`assets/rive/` 已在 assets 中声明

### Flutter 集成

1. **依赖**：`pubspec.yaml` 已添加 `rive: ^0.13.13`
2. **实现 `RiveMascotWidget`**（替换当前空占位）：
   ```dart
   RiveAnimation.asset(
     'assets/rive/mascot.riv',
     artboard: 'mascot',
     fit: BoxFit.contain,
     controllers: [_controller],
   )
   ```
3. **状态控制**：通过 `StateMachineController` 获取 `SMIInput` 控制 mood 切换
4. **API 一致**：保持与 `MascotWidget` 一致的构造参数（`size`、`mood`、`onTap`、`enableTapInteraction`）
5. **Fallback 逻辑**：`MascotWidget` 内部判断，优先加载 Rive，加载失败/超时回退到 `MascotPainter`

### 升级后的优势

- 骨骼动画：身体各部位独立运动，过渡自然
- 形变动画：表情可平滑形变，而非硬切
- 状态机过渡：blend duration 实现状态间平滑过渡
- 性能优化：Rive 运行时高效渲染，无需每帧重建 Paint

---

## 五、交互设计

### 点击交互

| 交互方式 | 效果 | 实现位置 |
|----------|------|----------|
| **单次点击** | 随机切换 `happy` / `curious`，1.5s 后恢复 `idle` | `MascotWidget._handleTap` |
| **2 秒内连续点击 5 次** | 触发 `celebrate` 彩蛋，持续 3s + `extraSparkle` 额外 12 粒星光 | `MascotWidget._handleTap` |

### 状态联动

| 触发事件 | 吉祥物状态 | 持续时间 | 实现位置 |
|----------|-----------|----------|----------|
| AI 发送消息（流式开始） | `thinking` | 直至流式完成 | `ChatController.sendMessage` → `setAiThinking(true)` |
| 流式完成 | `celebrate` | 3s | `ChatController._commitAssistant` → `celebrate()` |
| 流式出错 | `sad` | 3s | `ChatController._finishStreamingWithError` → `setMood(sad)` |
| 知识点完成 | `celebrate` | 3s | `LessonPage._onKnowledgePointCompleted` → `celebrate()` |
| Streak ≥ 3 | `happy` | 3s | `HomePage._recordStudyActivity` |

### 彩蛋设计

#### 已实现彩蛋

- **连点 5 次**（2 秒内）：`celebrate` 持续 3 秒 + 额外星光粒子

#### 待设计彩蛋（后续补充）

- **连点 10 次**：小犀戴上墨镜 + 撒花 + 显示"你发现了一个秘密！"
- **长按 3 秒**：小犀睡觉 `zzz` 动画（需新增 `sleeping` 状态）
- **节日彩蛋**：
  - 春节（农历新年）：小犀穿红色唐装 + 烟花撒花
  - 圣诞节（12/25）：小犀戴圣诞帽 + 雪花撒花
  - 用户注册日：小犀戴生日帽 + 蛋糕出现

### 新页面集成吉祥物步骤

1. 在页面顶部或合适位置嵌入 `MascotWidget`（或 `RiveMascotWidget` / `MascotOverlay`）
2. 通过 `ref.watch(mascotControllerProvider)` 订阅状态
3. 通过 `ref.read(mascotControllerProvider.notifier).setMood(...)` 切换情绪
4. **不要**在页面内自行管理吉祥物状态，统一走 `mascotControllerProvider`

---

## 六、尺寸规范

吉祥物在不同页面场景下的尺寸规范：

| 场景 | 尺寸 | 位置 | enableTapInteraction | mood |
|------|------|------|----------------------|------|
| 首页欢迎区 | 200px | 居中 | true | idle（或全局） |
| 对话页 | 80px | MascotOverlay 右下角（bottom:100, right:24） | false | thinking |
| 空状态 | 180px | 居中 | true | 指定情绪 |
| 引导页 | 200px | 居中（移动）/ 左列居中（桌面） | true | 步骤指定 |
| 章节完成庆祝 | 160px | 居中 | true | celebrate |
| AppBar 头像 | 32-40px | leading | true | 全局 |
| 学习路径 AppBar | 40px | actions[0] | true | 全局 |
| 课程页 AppBar | 40px | actions[0] | true | 全局 |
| 学习卡片主图区 | 96px | 右下角 | false | 全局 |

> **尺寸说明**：`EmptyStateWidget` 中 `mascotSize` 范围限制为 120-180（clamp）。

---

## 七、配色

吉祥物相关配色定义在 `lib/core/theme/lingxi_colors.dart` 中，通过 `ThemeExtension<LingxiColors>` 注册到主题。

### 主题色

| 颜色名 | 浅色 HEX | 深色 HEX | RGB（浅色） | 用途 |
|--------|----------|----------|-------------|------|
| `mascotPrimary` | `#7C4DFF` | `#9D7CFF` | 124, 77, 255 | 吉祥物主色 - 星空紫 |
| `mascotSecondary` | `#FFB74D` | `#FFCC80` | 255, 183, 77 | 吉祥物辅色 - 温暖橙 |

### 吉祥物绘制专用色

以下颜色当前硬编码在 `MascotPainter` 中（后续应纳入主题系统）：

| 颜色名 | HEX | RGB | 用途 |
|--------|-----|-----|------|
| `bodyGradientTop` | `#7C4DFF` | 124, 77, 255 | 身体渐变顶部 |
| `bodyGradientBottom` | `#B39DDB` | 179, 157, 219 | 身体渐变底部 |
| `capColor` | `#1C1B2E` | 28, 27, 46 | 学士帽 |
| `tasselColor` | `#FFD54F` | 255, 213, 79 | 流苏 |
| `starColor` | `#FFE082` | 255, 224, 130 | 星光 |
| `wingFillColor` | `#59FFFFFF` | — | 翅膀填充（半透明白） |
| `wingStrokeColor` | `#99FFFFFF` | — | 翅膀描边（半透明白） |

### 庆祝撒花配色

`celebrate` 状态的撒花粒子使用 5 色旋转：

| 颜色 | HEX |
|------|-----|
| 金黄 | `#FFE082` |
| 粉红 | `#FF8A95` |
| 天蓝 | `#81D4FA` |
| 淡紫 | `#B39DDB` |
| 桃橙 | `#FFAB91` |

### 浅深色适配

深色模式下，吉祥物主色从 `#7C4DFF` 提亮至 `#9D7CFF`，辅色从 `#FFB74D` 提亮至 `#FFCC80`，以适应深色背景的可读性。各色明度提升（向白色偏移），饱和度略降。

---

## 附录：相关文件索引

| 文件 | 路径 | 说明 |
|------|------|------|
| MascotState | `lib/features/mascot/mascot_state.dart` | 状态枚举与值对象 |
| MascotController | `lib/features/mascot/mascot_controller.dart` | 全局状态控制器 |
| MascotPainter | `lib/features/mascot/mascot_painter.dart` | CustomPainter 矢量绘制 |
| MascotWidget | `lib/features/mascot/mascot_widget.dart` | 吉祥物 Widget（交互入口） |
| MascotOverlay | `lib/features/mascot/mascot_overlay.dart` | AI 思考态悬浮层 |
| RiveMascotWidget | `lib/features/mascot/rive_mascot_widget.dart` | Rive 吉祥物（预留接口） |
| LingxiColors | `lib/core/theme/lingxi_colors.dart` | 主题颜色扩展（含 mascotPrimary/Secondary） |
| AppTheme | `lib/core/theme/app_theme.dart` | 主题定义（注册 LingxiColors） |

---

*本文档随项目演进持续更新。吉祥物 .riv 文件制作完成后，将更新第四章的实现细节。*
