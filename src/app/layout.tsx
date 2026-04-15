import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from "@/components/ui/Providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "greek"], display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "DGSmart Hub",
    template: "%s | DGSmart Hub",
  },
  description: "Milesight IoT Device Management Platform by DGSOFT",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var theme = localStorage.getItem('dgsmart-theme') || 'dark';
                document.documentElement.setAttribute('data-theme', theme);
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
