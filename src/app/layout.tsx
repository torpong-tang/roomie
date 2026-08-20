import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";
import { AccessGate } from "@/components/access-gate";
import { AppNavigation } from "@/components/app-navigation";
import { FeedbackProvider } from "@/components/feedback-provider";
import { SessionProvider } from "@/components/session-provider";
import { AppBackground } from "@/components/app-background";
import { PreferencesProvider, STORAGE_KEY } from "@/components/preferences-provider";
import { AccessibilityToolbar } from "@/components/accessibility-toolbar";
import { AppFooter } from "@/components/app-footer";

/**
 * Applies the saved accessibility preferences before the first paint, so the page
 * never flashes the default theme or font size while React hydrates.
 */
const preferencesScript = `
(function () {
  try {
    var saved = JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}) || '{}');
    var root = document.documentElement;
    root.lang = saved.language === 'en' ? 'en' : 'th';
    root.dataset.colorMode = ['contrast', 'grayscale'].indexOf(saved.colorMode) >= 0 ? saved.colorMode : 'default';
    var scale = Number(saved.fontScale);
    root.style.setProperty('--font-scale', String(scale >= 0.85 && scale <= 1.5 ? scale : 1));
  } catch (error) {}
})();
`;

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
    <html lang="th" data-color-mode="default" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: preferencesScript }} />
      </head>
      <body className={prompt.className} suppressHydrationWarning>
        <AppBackground />
        <PreferencesProvider>
        <FeedbackProvider>
          <SessionProvider>
            <AccessibilityToolbar />
            <AccessGate>
              <div className="min-h-screen flex flex-col">
                {/* The brand lives in the accessibility bar directly above, so the
                    header carries the navigation alone. */}
                <header className="glass sticky top-[var(--a11y-bar-height,3.5rem)] z-50 px-6 py-4 flex items-center justify-end mx-4 mt-4 rounded-2xl">
                  <AppNavigation />
                </header>
                <main className="flex-1 p-6">
                  {children}
                </main>
                <AppFooter />
              </div>
            </AccessGate>
          </SessionProvider>
        </FeedbackProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
