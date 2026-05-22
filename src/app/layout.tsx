import type { Metadata } from "next";
import { Outfit, Geist } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CloudBridge — Telegram Cloud Storage",
  description:
    "Secure cloud storage powered by Telegram. Upload, manage, and access your files anywhere.",
  keywords: ["cloud storage", "telegram", "file storage", "secure storage"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body className={outfit.className}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
