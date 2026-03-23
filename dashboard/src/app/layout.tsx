import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MSC Newsletter — Dashboard",
  description: "Suivi des inscriptions newsletter MSC Croisières",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        <header className="border-b border-gray-800 px-6 py-4">
          <h1 className="text-xl font-semibold">MSC Newsletter — Dashboard</h1>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
