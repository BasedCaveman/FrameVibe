import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FrameVibe",
  description: "Visual frame transaction builder for MegaETH and Base."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
