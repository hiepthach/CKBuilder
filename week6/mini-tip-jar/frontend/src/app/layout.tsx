import "./globals.css";
import React from "react";
import Providers from "@/components/Providers";

export const metadata = {
  title: "CKB Mini Tip Jar",
  description: "A simple Tip Jar dApp on Nervos CKB Testnet",
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
