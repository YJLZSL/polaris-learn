import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "开发者文档 - 智学AI",
  description:
    "智学AI开放平台开发者文档，包含API参考、快速入门指南和SDK使用说明",
  robots: { index: true, follow: true },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {children}
    </div>
  );
}
