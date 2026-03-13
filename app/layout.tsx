import type { Metadata } from "next";
import { ThemeProvider } from "./components/ThemeProvider";
import { LanguageProvider } from "./components/LanguageProvider";
import I18nInitializer from "./components/I18nInitializer";
import "./globals.css";
import "./i18n/config";

export const metadata: Metadata = {
  title: "KingKunta-Admin",
  description: "La marque des rois et reines de la Sapologie",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        <I18nInitializer>
          <LanguageProvider>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </LanguageProvider>
        </I18nInitializer>
      </body>
    </html>
  );
}
