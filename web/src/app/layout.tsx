import type { Metadata } from "next";
import ClientProviders from "@/app/ClientProviders";
import "@/globals.css";

export const metadata: Metadata = {
  title: "Nancy Motorcycle Spares",
  description: "Shop quality motorcycle spares and accessories in Kenya at Nancy Motorcycle Spares."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
