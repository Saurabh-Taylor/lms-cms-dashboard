import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { getCurrentUser } from "@/lib/me";
import { adminShellVars } from "@/lib/ui-preferences";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LearnHub CMS",
  description: "Learning management system administration",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // personal typography overrides resolved before first paint — no size flash
  const admin = await getCurrentUser();
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={adminShellVars(admin?.uiPreferences) as React.CSSProperties}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
