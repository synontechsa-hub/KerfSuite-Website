import type { Metadata } from "next";
import { Orbitron, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KerfSuite — The Workshop Operating System",
  description: "A precision utility suite for serious workshops. Manage licenses, machines, and users across the KerfSuite ecosystem.",
  keywords: ["KerfSuite", "KerfCut", "KerfStock", "workshop software", "cut optimization", "CNC"],
  icons: {
    icon: [
      { url: '/svg/favicon.svg', type: 'image/svg+xml' },
    ],
  },
  openGraph: {
    title: "KerfSuite — The Workshop Operating System",
    description: "Precision at every stage of production.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${orbitron.variable} ${jetbrainsMono.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

