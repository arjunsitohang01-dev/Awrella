import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Awrella — A Private Space for Little Memories",
  description: "Awrella adalah website private personal space yang fun, hangat, aesthetic, dan terasa eksklusif. Sebuah ruang digital kecil untuk foto, musik, dan kenangan kecil.",
  keywords: ["Awrella", "private space", "photos", "music", "memories", "aesthetic", "personal"],
  authors: [{ name: "Awrella" }],
  openGraph: {
    title: "Awrella — A Private Space for Little Memories",
    description: "A small private space for photos, music, and quiet feelings.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Awrella — A Private Space for Little Memories",
    description: "A small private space for photos, music, and quiet feelings.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
