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
  title: "CCDash — Community Church",
  description: "Operations dashboard for Community Church multi-campus ministry",
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
      <body className="min-h-full bg-base-200 text-base-content antialiased">
        <ThemeInitializer />
        {children}
      </body>
    </html>
  );
}
