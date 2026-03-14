import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShiftManager",
  description: "Effortlessly organize your team's shifts in shared rooms.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
