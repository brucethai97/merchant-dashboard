import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { ReactQueryClientProvider } from "./provider";
import { DashboardTopBar } from "@/components/dashboard-top-bar";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Merchant Dashboard",
  description: "Merchant Dashboard",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <body className="flex min-h-full flex-col">
        <ReactQueryClientProvider>
          {user ? (
            <header className="sticky top-0 z-50 shrink-0 border-b border-zinc-200 bg-white px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:px-8 lg:px-16">
              <div className="mx-auto flex w-full max-w-7xl justify-center sm:justify-start">
                <DashboardTopBar email={user.email ?? "—"} />
              </div>
            </header>
          ) : null}
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </ReactQueryClientProvider>
      </body>
    </html>
  );
}
