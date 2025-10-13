import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AppNavBar } from "@/components/app-navbar";

export const metadata: Metadata = {
  title: "A2A Covert - 智能体间隐蔽通信系统",
  description: "Advanced Agent-to-Agent Communication System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <AppNavBar />
        </ThemeProvider>
      </body>
    </html>
  );
}
