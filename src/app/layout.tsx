import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Calendar, LayoutDashboard, PlusCircle, BarChart3 } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          <header className="glass sticky top-0 z-50 px-6 py-4 flex items-center justify-between mx-4 mt-4 rounded-2xl">
            <Link href="/" className="text-2xl font-bold text-white flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/20 group-hover:border-blue-400/50 transition-colors shadow-lg">
                <img src="/logo.png" alt="Roomie Logo" className="w-full h-full object-cover shrink-0" />
              </div>
              <span className="tracking-tight">Roomie</span>
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/" className="text-white hover:text-white/80 flex items-center gap-2 font-medium transition-colors">
                <LayoutDashboard className="w-5 h-5 text-blue-400" />
                <span className="hidden md:inline">Calendar</span>
              </Link>
              <Link href="/bookings" className="text-white hover:text-white/80 flex items-center gap-2 font-medium transition-colors">
                <Calendar className="w-5 h-5 text-indigo-400" />
                <span className="hidden md:inline">History</span>
              </Link>
              <Link href="/analytics" className="text-white hover:text-white/80 flex items-center gap-2 font-medium transition-colors">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                <span className="hidden md:inline">Insights</span>
              </Link>
              <Link href="/rooms" className="text-white hover:text-white/80 flex items-center gap-2 font-medium transition-colors border-l border-white/10 pl-6">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                <span className="hidden md:inline">Rooms</span>
              </Link>
            </nav>
          </header>
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
