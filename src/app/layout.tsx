import type { Metadata } from "next";
import { Syne, IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
});
const ibmPlex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Interactive Decision Storytelling",
    template: "%s — Interactive Decision Storytelling",
  },
  description:
    "A system for turning complex data, AI, analytics, and business problems into interactive experiences that help people understand and decide.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${ibmPlex.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-void font-sans text-[oklch(var(--foreground))]">
        <div className="flex min-h-full flex-col">
          <header className="absolute inset-x-0 top-0 z-30">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
              <Link
                href="/"
                className="focus-ring font-display text-base tracking-tight text-white/90"
              >
                Decision Stories
              </Link>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-white/5 py-6 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-white/30">
            Interactive Decision Storytelling · Orbit flagship
          </footer>
        </div>
      </body>
    </html>
  );
}
