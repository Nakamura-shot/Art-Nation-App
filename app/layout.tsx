import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Art Nation Cebu",
  description: "Book Art Nation Cebu workshops and access painting guides."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
