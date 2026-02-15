import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "piskoqo",
  description: "Pendamping curhat AI"
};

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-neutral-950 text-neutral-100">
        {children}
      </body>
    </html>
  );
}
