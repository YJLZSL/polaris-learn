# Polaris 动效规范（V2.0）

> 视觉语言 4.0 动效精简版：两档时长 + 单缓动。移除全部商业平台强调动画（count-up、粒子、scaleIn、sharedAxisTransition、ease-out-expo），保留页面转场与按钮按压反馈。所有预设定义在 `src/lib/motion.ts`，通过 `useSafeMotion` 提供无障碍降级。

## 1. 动效原则

V2.0 动效遵循以下原则：

- **安静 > 喧闹**：动画仅用于引导注意力、反馈状态，不做装饰性强调。
- **两档时长**：仅 150ms（即时）与 300ms（标准），删除"快速 200ms"与"强调 500ms"。
- **单缓动**：仅 `ease-out`，删除 `ease-out-expo`（与浏览器原生 `ease-out` 视觉差异在自学场景不可感知）。
- **统一转场**：页面转场仅"淡入 + 上移 8px"，删除 PC 侧滑 / Android 底滑的平台差异。
- **无障碍**：通过 `useSafeMotion` 监听 `prefers-reduced-motion`，自动降级为淡入或即时切换。

## 2. 时长分级

V2 精简为两档：

| 级别 | 时长 | 常量 | 用途 |
|------|------|------|------|
| 即时 | 150ms | `DURATION_INSTANT` | 按钮按压、开关切换、微状态、hover 抬升 |
| 标准 | 300ms | `DURATION_STANDARD` | 页面转场、列表项入场、Sheet 展开、卡片入场 |

> 删除 v1.0 的"即时 100ms"、"快速 200ms"、"强调 500ms"三档。

## 3. 缓动曲线

| 名称 | 值 | 用途 |
|------|-----|------|
| `EASE_OUT` | `[0, 0, 0.2, 1]` | 唯一缓动，适用于所有过渡 |

> 删除 v1.0 的 `EASE_OUT_EXPO`（`[0.16, 1, 0.3, 1]`）与 `EASE_IN_OUT`。V2 全应用统一使用 `EASE_OUT`，营造"柔和抵达"的安静感。

## 4. 页面转场

### 4.1 统一转场（淡入 + 上移 8px）

V2 删除 PC 侧滑（Shared Axis）与 Android 底滑（Bottom Slide）的平台差异，全平台统一为：

- 新页面从下方淡入：`opacity: 0 → 1` + `y: 8 → 0`
- 时长：标准 300ms
- 缓动：`EASE_OUT`

```tsx
import { motion } from "framer-motion";
import { DURATION_STANDARD, EASE_OUT } from "@/lib/motion";
import { useSafeMotion } from "@/hooks/useSafeMotion";

function MyPage() {
  const safeMotion = useSafeMotion();
  return (
    <motion.div
      {...safeMotion({
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: DURATION_STANDARD, ease: EASE_OUT },
      })}
    >
      {/* page content */}
    </motion.div>
  );
}
```

> 删除 v1.0 的 `sharedAxisTransitionProps`（PC 侧滑 `x: 24 → 0`）与 Android 底滑 `y: 40 → 0`。自学场景不需要 Material 风格的空间转场。

## 5. 微交互

### 5.1 按钮按压

- `scale(0.98)` + 150ms `EASE_OUT`
- 无 ripple、无 glow 脉冲

### 5.2 卡片 hover

- `translateY(-2px)` + 阴影加深
- 时长 150ms `EASE_OUT`
- 无 scale spring、无 stagger 入场

### 5.3 列表项入场

- `opacity: 0 → 1` + `y: 8 → 0`，逐项延迟 50ms（上限 5 项后无延迟）
- 时长 300ms `EASE_OUT`

## 6. useSafeMotion 无障碍降级

`src/hooks/useSafeMotion.ts` 监听 `prefers-reduced-motion` 媒体查询，为前庭功能障碍用户提供降级：

| 用户设置 | 行为 |
|---------|------|
| `prefers-reduced-motion: no-preference`（默认） | 正常执行动画 |
| `prefers-reduced-motion: reduce` | 所有动画降级为 `opacity` 淡入（移除 `y` 位移与 `scale`），时长压缩为 1ms（近似即时） |

`useSafeMotion` 返回一个高阶函数，接收 motion props 并按需降级：

```tsx
const safeMotion = useSafeMotion();
// 传入完整 motion props，返回降级后的 props
<motion.div {...safeMotion({ initial, animate, transition })} />
```

所有动画 props **必须**经 `useSafeMotion` 包裹，违者视为规范违规。

## 7. motion.ts 预设

`src/lib/motion.ts` V2 仅导出以下预设：

| 导出 | 类型 | 值 |
|------|------|-----|
| `DURATION_INSTANT` | number | `0.15`（150ms） |
| `DURATION_STANDARD` | number | `0.3`（300ms） |
| `EASE_OUT` | Easing | `[0, 0, 0.2, 1]` |
| `pageTransition` | Transition | `{ duration: DURATION_STANDARD, ease: EASE_OUT }` |
| `fadeUpVariants` | Variants | `{ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } }` |

## 8. 禁用清单（V2 移除）

以下动效在 V2 中**禁止出现**：

- XP count-up 数字滚动
- 粒子扩散、星光粒子
- 徽章 scaleIn 入场
- 卡片 hover spring 弹性（`cardHover`）
- 连胜 pulse-glow 光晕
- 阶段高亮脉冲（苏格拉底 6 阶段环形进度）
- 错题粒子反馈
- 宝箱开启 Lottie
- `sharedAxisTransition`（PC 侧滑转场）
- Android 底滑转场（`y: 40 → 0`）
- `ease-out-expo` 缓动
- `ease-in-out` 缓动
- 200ms 与 500ms 时长档位

> 视觉令牌与组件层级详见 [UI_DESIGN.md](./UI_DESIGN.md)。
