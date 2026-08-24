import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { ToastProvider } from "@/lib/toast";
import "./globals.css";

const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo" });

export const metadata: Metadata = {
  title: "نظام إدارة الجمعية العمومية",
  description: "منصة إدارة عضوية الجمعيات العمومية والتصويت الإلكتروني",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="font-sans antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
