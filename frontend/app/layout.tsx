import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import type { RestaurantSettings } from "@repo/shared";
import "./globals.css";
import { ToastProvider } from "./_components/ui/Toast";
import { AuthProvider } from "@/lib/AuthContext";
import { SettingsProvider } from "@/lib/useSettings";
import { api } from "@/lib/api";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display serif for headings + the wordmark — pairs with Geist body for a
// premium, characterful feel. Swappable via this one import.
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Umer Akmal Kitchen — Restaurant Ordering",
  description:
    "Order through a conversational assistant, with a live kitchen queue and owner dashboard.",
};

// Fetch the public restaurant profile on the server so the name/tagline are in
// the initial HTML (no fallback→real flash). Revalidated at most every 60s;
// tolerant of a cold/unreachable backend (returns null, and the client hydrates
// the value instead). The 5s timeout keeps a sleeping backend from stalling SSR.
async function getInitialSettings(): Promise<RestaurantSettings | null> {
  try {
    const res = await fetch(api("/api/v1/settings"), {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return (await res.json()) as RestaurantSettings;
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getInitialSettings();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        <AuthProvider>
          <SettingsProvider initial={settings}>
            <ToastProvider>{children}</ToastProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
