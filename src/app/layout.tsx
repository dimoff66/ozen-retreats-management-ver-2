import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { FontSizeSettingsProvider } from "@/components/layout/FontSizeSettings";
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
  title: "Retreats Management",
  description: "Retreat guest, accommodation, arrival, and taxi management.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <FontSizeSettingsProvider>{children}</FontSizeSettingsProvider>
      </body>
    </html>
  );
}
