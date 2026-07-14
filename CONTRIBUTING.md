# 贡献指南

首先，感谢你有兴趣为灵犀学院贡献代码！🎉 无论是修复 Bug、完善文档，还是开发新功能，每一份贡献都让这个项目变得更好。

## 贡献流程

1. **Fork 仓库** —— 点击 GitHub 页面右上角的 Fork 按钮，将项目 fork 到你的账号下
2. **克隆仓库** —— `git clone https://github.com/<你的用户名>/lingxi-academy.git`
3. **创建分支** —— `git checkout -b feat/your-feature-name`（分支命名见下方命名约定）
4. **编写代码** —— 遵循下方的代码规范
5. **提交更改** —— 遵循 Conventional Commits 规范编写提交信息
6. **推送分支** —— `git push origin feat/your-feature-name`
7. **发起 Pull Request** —— 在 GitHub 页面创建 PR，填写 PR 模板

## 代码规范

### Dart Lint

项目已启用 `flutter_lints` 严格规则，配置见 `analysis_options.yaml`。提交前请确保：

```bash
flutter analyze
```

无 error 和 warning（已有 warning 需在 PR 中说明原因）。

### 命名约定

| 类型 | 约定 | 示例 |
|------|------|------|
| 文件名 | snake_case | `course_detail_page.dart` |
| 类名 | PascalCase | `CourseDetailPage` |
| 变量/函数 | camelCase | `loadCourses()` |
| 常量 | camelCase | `defaultLocale` |
| 分支名 | `type/brief-description` | `feat/course-player`、`fix/splash-crash` |

### 文件组织

```
lib/
├── main.dart                 # 应用入口
├── app.dart                  # MaterialApp 配置
├── core/                     # 核心工具与配置
│   ├── constants/
│   ├── theme/
│   └── utils/
├── data/                     # 数据层
│   ├── database/             # Drift 数据库
│   ├── models/               # 数据模型
│   └── repositories/         # 仓库
├── features/                 # 功能模块
│   ├── course/
│   ├── chat/
│   └── settings/
├── providers/                # Riverpod Providers
├── router/                   # GoRouter 路由配置
└── widgets/                  # 共享组件
```

## 提交规范

本项目遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Type 说明

| Type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档变更 |
| `style` | 代码格式调整（不影响功能） |
| `refactor` | 代码重构（非新功能、非修复 Bug） |
| `test` | 测试相关 |
| `chore` | 构建、依赖、配置等杂项 |

### 示例

```
feat(chat): 添加苏格拉底式对话引导模式
fix(database): 修复课程进度同步问题
docs(readme): 更新构建指南
```

## PR 模板

```markdown
## 变更说明

<!-- 简要描述本次 PR 做了什么，以及为什么 -->

## 变更类型

- [ ] 新功能（feat）
- [ ] Bug 修复（fix）
- [ ] 文档（docs）
- [ ] 重构（refactor）
- [ ] 其他

## 自检清单

- [ ] 代码通过 `flutter analyze` 检查
- [ ] 代码通过 `flutter test` 测试
- [ ] 已为新增功能编写测试
- [ ] 已更新相关文档

## 相关 Issue

<!-- 如有关联的 Issue，填写 closes #123 -->
```

## 行为准则

- **保持尊重** —— 尊重每一位贡献者，不论其经验水平
- **友善沟通** —— 以建设性的方式表达意见，避免人身攻击
- **开放包容** —— 欢迎不同背景的贡献者参与
- **专注目标** —— 讨论围绕问题本身，聚焦于让项目更好

## 联系方式

<!-- 联系方式占位（后续补充） -->
- GitHub Issues：[提交 Issue](https://github.com/lingxiacademy/lingxi-academy/issues)
- Email：待补充

再次感谢你的贡献！💪
