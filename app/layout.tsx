import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Veya", template: "%s | Veya" },
  description: "Plan content, media, and feed previews in one calm workspace."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
