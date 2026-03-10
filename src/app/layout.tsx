import type { Metadata } from "next";
import "./globals.css";
import TabNav from "@/components/TabNav";
import { AssessmentProvider } from "@/context/AssessmentContext";

export const metadata: Metadata = {
  title: "LovingADHD - 评测助手",
  description: "通过滑动卡片快速记录您的ADHD症状",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' rx='24' fill='%230f766e'/%3E%3Cpath d='M28 48h40M48 28v40' stroke='white' stroke-width='8' stroke-linecap='round'/%3E%3C/svg%3E",
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <AssessmentProvider>
          {children}
          <TabNav />
        </AssessmentProvider>
      </body>
    </html>
  );
}
