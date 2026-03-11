import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { FeatureFlagProvider } from "@/context/FeatureFlagContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { getEnabledPlugins } from "@/actions/plugin";

export const metadata: Metadata = {
  title: "MyApp - Plugin Store",
  description: "SQLite × Server Actions × Dynamic Menu × Dynamic Import",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const enabledPlugins = await getEnabledPlugins();

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <FeatureFlagProvider plugins={enabledPlugins}>
            <Header />
            {children}
          </FeatureFlagProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
