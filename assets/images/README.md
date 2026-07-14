# 图片资源目录

本目录存放应用所需的图片资源。请将以下文件放置在此目录中：

## 必需文件

| 文件名 | 尺寸 | 用途 |
|--------|------|------|
| `app_icon.png` | 1024 × 1024 px | 应用图标（用于 `flutter_launcher_icons` 生成各平台图标） |
| `splash_logo.png` | 推荐 448 × 448 px | 启动屏 Logo（用于 `flutter_native_splash` 生成启动屏） |

## 说明

- 以上图片资源由设计师提供，暂未包含在仓库中
- `app_icon.png` 需为正方形 PNG，建议透明背景
- `splash_logo.png` 需为正方形 PNG，建议透明背景，内容居中
- 放置好图片后，运行以下命令生成各平台图标与启动屏：
  ```bash
  dart run flutter_launcher_icons
  dart run flutter_native_splash:create
  ```
