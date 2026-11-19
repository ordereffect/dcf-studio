import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DCF Studio",
  description: "Value any US-listed stock with a driver-based DCF, scenarios, sensitivities and a reverse DCF.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#edf0f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1421" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
