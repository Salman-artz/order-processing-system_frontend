import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WarehouseFlow — Distributed Warehouse Management & Fulfillment Platform",
  description: "From Inventory to Delivery, in Real Time. Enterprise WMS powered by Saga Choreography and NATS JetStream.",
  icons: {
    icon: "/brand/warehouseflow-favicon.svg",
    shortcut: "/brand/warehouseflow-favicon.svg",
    apple: "/brand/warehouseflow-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrains.variable} antialiased bg-background text-text-main h-screen flex`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
