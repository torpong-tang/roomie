import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { assetPath } from "@/lib/paths";
import { AccessGate } from "@/components/access-gate";
import { AppNavigation } from "@/components/app-navigation";
import { FeedbackProvider } from "@/components/feedback-provider";

const prompt = Prompt({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Meeting Room Booking",
  description: "Modern Meeting Room Booking Application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={prompt.className} suppressHydrationWarning>
        <FeedbackProvider>
          <AccessGate>
            <div className="min-h-screen flex flex-col">
              <header className="glass sticky top-0 z-50 px-6 py-4 flex items-center justify-between mx-4 mt-4 rounded-2xl">
                <Link href="/" data-tour="brand" className="text-2xl font-bold text-white flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/20 group-hover:border-blue-400/50 transition-colors shadow-lg">
                    <img src={assetPath("/logo.png")} alt="Roomie Logo" className="w-full h-full object-cover shrink-0" />
                  </div>
                  <span className="tracking-tight">Roomie</span>
                </Link>
                <AppNavigation />
              </header>
              <main className="flex-1 p-6">
                {children}
              </main>
              <footer className="px-6 pb-6 text-center text-sm font-medium text-slate-400">
                &copy; 2026 TPT Team &bull; Version 1.0
              </footer>
            </div>
          </AccessGate>
        </FeedbackProvider>
      </body>
    </html>
  );
}
