"use client";

import Link from "next/link";
import { useState } from "react";
import {
  HiCodeBracket,
  HiSparkles,
  HiBookOpen,
  HiArrowRight,
  HiClipboardDocument,
  HiDocumentText,
  HiRocketLaunch,
  HiCheckCircle,
  HiShieldCheck,
  HiCommandLine,
} from "react-icons/hi2";

/* ---------- 复制到剪贴板 ---------- */
function copyToClipboard(text: string, setCopied: (v: boolean) => void) {
  navigator.clipboard.writeText(text).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  });
}

/* ---------- 快速开始步骤 ---------- */
const steps = [
  {
    step: "01",
    title: "注册账号",
    desc: "前往 Polaris 平台注册一个学习账号，完成邮箱验证。",
    href: "/register",
    icon: HiRocketLaunch,
  },
  {
    step: "02",
    title: "登录平台",
    desc: "使用注册的账号登录，即可在平台内使用 AI 辅导、题库等学习能力。",
    href: "/login",
    icon: HiCommandLine,
  },
];

/* ---------- 功能卡片 ---------- */
const featureCards = [
  {
    title: "AI 辅导",
    desc: "苏格拉底式教学对话，支持多轮会话、学科定制、流式输出。帮助学生通过引导式学习深入理解知识点。",
    icon: HiSparkles,
    color: "from-indigo-500 to-purple-600",
    bgLight: "bg-indigo-50 dark:bg-indigo-950/30",
    iconBg: "bg-indigo-100 dark:bg-indigo-900/50",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    endpoints: ["POST /api/ai/chat", "GET /api/ai/conversations"],
    href: "/docs/api#ai-tutoring",
  },
  {
    title: "题库管理",
    desc: "丰富的题库数据，支持按学科、难度、年级筛选，支持关键词搜索和错题本管理。",
    icon: HiBookOpen,
    color: "from-emerald-500 to-teal-600",
    bgLight: "bg-emerald-50 dark:bg-emerald-950/30",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    endpoints: ["GET /api/questions", "GET /api/error-notes"],
    href: "/docs/api#questions",
  },
];

/* ---------- cURL 示例 ---------- */
const curlExample = `curl -X POST "{baseUrl}/api/ai/chat" \\
  -H "Content-Type: application/json" \\
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \\
  -d '{
    "message": "请帮我理解勾股定理",
    "subject": "数学"
  }'`;

export default function DocsPage() {
  const [curlCopied, setCurlCopied] = useState(false);

  return (
    <div className="min-h-screen">
      {/* ====== 导航栏 ====== */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/docs" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
              <HiCodeBracket className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              Polaris
              <span className="ml-1.5 text-sm font-medium text-slate-400">
                开发者文档
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/docs/api"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              API 参考
            </Link>
            <Link
              href="/openapi.yaml"
              target="_blank"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              OpenAPI 规范
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 transition-colors"
            >
              返回平台
              <HiArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* ====== Hero ====== */}
      <section className="relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/30" />
        <div className="absolute right-0 top-0 -z-0 h-[600px] w-[600px] translate-x-1/3 -translate-y-1/4 rounded-full bg-gradient-to-br from-indigo-400/20 to-purple-400/20 blur-3xl dark:from-indigo-600/10 dark:to-purple-600/10" />

        <div className="relative mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6 lg:px-8 lg:pt-28 lg:pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 px-4 py-1.5">
              <HiDocumentText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                API v1.0.0
              </span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              Polaris
              <span className="mt-2 block bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                开发者文档
              </span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-600 dark:text-slate-400 sm:text-xl">
              开放 AI 教育能力，为您提供智能辅导、知识图谱、
              题库管理等核心能力，助力个性化学习。
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/docs/api"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 transition-all"
              >
                <HiRocketLaunch className="h-5 w-5" />
                查看 API 参考
              </Link>
              <a
                href="/openapi.yaml"
                target="_blank"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-8 py-3.5 text-base font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                <HiClipboardDocument className="h-5 w-5" />
                OpenAPI 规范
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ====== 快速开始 ====== */}
      <section className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              快速开始
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              两步开始使用Polaris学习平台
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {steps.map((item, i) => (
              <div key={i} className="relative group">
                {/* 连接线 */}
                {i < steps.length - 1 && (
                  <div className="absolute right-0 top-10 hidden h-0.5 w-8 translate-x-full bg-gradient-to-r from-slate-300 to-transparent dark:from-slate-700 sm:block" />
                )}
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 shadow-lg shadow-indigo-500/10 group-hover:shadow-indigo-500/20 transition-shadow">
                    <item.icon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className="mt-4 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    步骤 {item.step}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    {item.desc}
                  </p>
                  {item.href && (
                    <Link
                      href={item.href}
                      className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                    >
                      前往操作
                      <HiArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== cURL 示例 ====== */}
      <section className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              试一试
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              复制下面的命令，替换 YOUR_SESSION_TOKEN 即可开始调用
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-2xl">
            <div className="relative rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-900 dark:bg-slate-950 shadow-2xl overflow-hidden">
              {/* 标题栏 */}
              <div className="flex items-center justify-between border-b border-slate-700/50 px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 rounded-full bg-red-500" />
                  <span className="flex h-3 w-3 rounded-full bg-yellow-500" />
                  <span className="flex h-3 w-3 rounded-full bg-green-500" />
                </div>
                <span className="text-xs font-medium text-slate-400">
                  Terminal
                </span>
                <button
                  onClick={() => copyToClipboard(curlExample, setCurlCopied)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
                >
                  {curlCopied ? (
                    <>
                      <HiCheckCircle className="h-3.5 w-3.5 text-green-400" />
                      已复制
                    </>
                  ) : (
                    <>
                      <HiClipboardDocument className="h-3.5 w-3.5" />
                      复制
                    </>
                  )}
                </button>
              </div>

              {/* 代码内容 */}
              <div className="overflow-x-auto p-5">
                <pre className="text-sm leading-relaxed">
                  <code className="language-bash text-slate-100">
                    <span className="text-slate-500"># 调用 AI 辅导接口</span>
                    {"\n"}
                    <span className="text-cyan-400">curl</span>
                    {" "}
                    <span className="text-yellow-300">-X</span>
                    {" "}
                    <span className="text-green-300">POST</span>
                    {" "}
                    <span className="text-orange-300">{'"{baseUrl}/api/ai/chat"'}</span>
                    {" "}
                    <span className="text-slate-500">\</span>
                    {"\n"}
                    {"  "}
                    <span className="text-yellow-300">-H</span>
                    {" "}
                    <span className="text-green-300">{'"Content-Type: application/json"'}</span>
                    {" "}
                    <span className="text-slate-500">\</span>
                    {"\n"}
                    {"  "}
                    <span className="text-yellow-300">-H</span>
                    {" "}
                    <span className="text-green-300">{'"Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"'}</span>
                    {" "}
                    <span className="text-slate-500">\</span>
                    {"\n"}
                    {"  "}
                    <span className="text-yellow-300">-d</span>
                    {" "}
                    <span className="text-green-300">{'\'{'}</span>
                    {"\n"}
                    <span className="text-green-300">
                      {'    "message": "请帮我理解勾股定理",'}
                    </span>
                    {"\n"}
                    <span className="text-green-300">
                      {'    "subject": "数学"'}
                    </span>
                    {"\n"}
                    <span className="text-green-300">{"  }'"}</span>
                  </code>
                </pre>
              </div>
            </div>

            <p className="mt-4 text-center text-sm text-slate-400 dark:text-slate-500">
              更多用法请参阅{" "}
              <Link
                href="/docs/api"
                className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                API 参考文档
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ====== 特色功能卡片 ====== */}
      <section className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              核心能力
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              两大核心能力，助力个性化学习
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {featureCards.map((card, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300"
              >
                {/* 顶部渐变装饰 */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.color}`}
                />

                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.iconBg} mb-6`}
                >
                  <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {card.desc}
                </p>

                <div className="mt-6 space-y-2">
                  {card.endpoints.map((ep) => (
                    <code
                      key={ep}
                      className="block rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-mono text-slate-600 dark:text-slate-400"
                    >
                      {ep}
                    </code>
                  ))}
                </div>

                <Link
                  href={card.href}
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors"
                >
                  查看文档
                  <HiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== 特性亮点 ====== */}
      <section className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: HiShieldCheck,
                title: "安全可靠",
                desc: "内容安全检测、会话认证、速率限制，全方位保障学习安全",
              },
              {
                icon: HiSparkles,
                title: "个性化学习",
                desc: "苏格拉底式教学对话，根据学生学情定制辅导路径，深入理解知识点",
              },
              {
                icon: HiCommandLine,
                title: "游戏化激励",
                desc: "经验值、徽章、排行榜系统，让学习过程充满乐趣与动力",
              },
              {
                icon: HiBookOpen,
                title: "知识图谱",
                desc: "可视化学科知识结构，精准定位薄弱环节，循序渐进提升掌握度",
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/50">
                  <item.icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== 底部 ====== */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                <HiCodeBracket className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Polaris 开放平台
              </span>
            </div>
            <div className="flex items-center gap-8 text-sm text-slate-400 dark:text-slate-500">
              <Link href="/docs/api" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                API 参考
              </Link>
              <a href="/openapi.yaml" target="_blank" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                OpenAPI 规范
              </a>
              <Link href="/docs" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                文档首页
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
