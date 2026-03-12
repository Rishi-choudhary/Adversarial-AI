import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ThemeForge - Convert Any Website Into a Shopify Theme',
  description: 'Convert any website into a Shopify theme automatically. Full Liquid sections, schema editor-ready, all images included.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <div className="min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
