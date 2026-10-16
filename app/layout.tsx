import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { ThemeInitializer } from "@/components/ThemeSelector";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat-fallback",
});

export const metadata: Metadata = {
  title: "Community Church — Ministry Dashboard",
  description: "Ministry dashboard, vital signs, and volunteer matrix",
  icons: {
    icon: "/brand/favicon.png",
    apple: "/brand/cc-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="community"
      className={`${montserrat.variable} h-full`}
    >
      <head>
        <link
          href="https://fonts.cdnfonts.com/css/d-din"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full sfdc-app antialiased">
        <ThemeInitializer />
        {children}
      </body>
    </html>
  );
}
