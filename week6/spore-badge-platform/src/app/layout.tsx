import "./globals.css";
import React from "react";
import Providers from "@/components/Providers";

export const metadata = {
  title: "Spore Badge Platform",
  description: "Mint and Reclaim Spore Badges on Nervos CKB",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
